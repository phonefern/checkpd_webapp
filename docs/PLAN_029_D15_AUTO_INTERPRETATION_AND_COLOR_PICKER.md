# PLAN-029 — D-15 Auto-Interpretation Banner + Real-Color Cap Picker

## Overview

[[PLAN-018]] shipped crossing-count scoring for the Farnsworth D-15 test (`lib/colorVisionD15.ts` +
`QaColorVisionForm.tsx`): the examiner keys in the cap order, the app counts major crossings and
reports `Pass`/`Fail` + an approximate `protan`/`deutan`/`tritan` axis label. In practice, staff still
have to mentally translate "3 crossings, axis: deutan" into a clinical read ("is this bad? how bad?") —
they compared the app against a reference implementation
(`https://www.colorlitelens.com/images/test/D15/D15.html`, screenshot supplied) that prints a plain-
language diagnosis line (`DIAGNOSIS: COLOR VISION DEFICIENCY - SEVERE DEUTAN`) plus an error count, and
lets the operator build the patient's order by clicking the **actual cap colors** instead of typing
numbers.

This plan adds two independent, additive features to the existing D-15 form:

1. **Auto-interpretation banner** — turn the existing `crossings`/`axis`/`pass` result into a
   plain-language severity + diagnosis line, shown prominently above each session's plot, so staff read
   a conclusion instead of inferring one from a raw crossing count.
2. **Real-color cap picker** — replace the plain numbered buttons in `CapSlotPicker` (and the plot's cap
   dots) with swatches rendered in each cap's real (approximate) color, numbered on top, so the examiner
   can cross-check "cap 7 = this greenish-yellow one" visually instead of only by number.

**Reason for change:** Interpretation errors happen when a busy examiner has to convert a raw number
into a clinical judgement call under time pressure. A generated diagnosis sentence removes that step.
The color picker reduces a different failure mode — mistyping a cap number — by giving a second,
visual channel to confirm the entry, mirroring how the reference site lets you pick swatches directly.

## Related plans

- [[PLAN-018]] — ships the base D-15 feature this plan extends. Read it first; this plan does not
  change `scoreD15()`'s crossing/pass logic, only what's derived from its output and how the operator
  enters data.
- Reuses `[[clinical-form-ux-preferences]]` (pill/button-style inputs, not dropdowns) and the
  `[[d15-color-vision-diagram]]` real-geometry convention already established for the plot.

## Scope

### In scope
- **Severity tiers** derived from the existing `crossings` count (no new DB column — computed at
  render time from data already stored): `normal` / `mild` / `moderate` / `severe`.
- **Diagnosis sentence generator** — a new pure function `describeD15Severity(result)` in
  `lib/colorVisionD15.ts` producing a Thai sentence like `ผิดปกติ - Deutan ระดับปานกลาง (5 เส้นตัด)`,
  shown as a colored banner (severity-tinted, reusing the medical-gradient tones from
  `[[clinical-form-ux-preferences]]`) above each session's result line.
- **Real (approximate) sRGB swatch color per cap**, derived from the already-hardcoded `CAP_XY`
  chromaticities (`lib/colorVisionD15.ts`), for **display only**:
  - `CapSlotPicker` number grid → each button gets its cap's swatch as background, number kept as the
    label on top.
  - The 15 already-filled slot buttons in `SessionBlock` → same swatch-as-background treatment.
  - `D15Plot` cap dots → filled with the swatch color instead of plain white/black (pilot stays visually
    distinct, e.g. a black ring).
- Both features apply to all 4 sessions (RE/LE × Test/Retest) uniformly, matching the existing form.

### Out of scope
- **Quantitative RED/GREEN/BLUE error-percentage breakdown** shown in the reference screenshot
  ("RED 41% GREEN 50% BLUE 9%"). That number comes from a cone-error / Vingrys & King-Smith-style
  computation, which PLAN-018 explicitly rejected in favor of the crossing-count method matching the
  paper sheet. Reintroducing a quantitative channel-error metric is a bigger, separate clinical-methods
  decision — **do not add it in this plan**. If wanted later, seed it as PLAN-030 and revisit the `_tes`
  reserved column from PLAN-018.
- **Replacing the physical D-15 test** with an on-screen patient-facing test (like the reference site's
  drag-and-drop game). The swatch picker here is an **examiner data-entry aid only** — the patient still
  arranges the real physical caps; the examiner reads the physical cap numbers and keys them in. Do not
  build a patient-facing digital test from this plan.
- Calibrating swatch colors against a specific monitor/display profile — the sRGB approximation is for
  "which cap is this roughly" recognition, not a color-accurate reproduction. Call this out in the UI
  (small caption) so nobody mistakes the on-screen swatch for the calibrated physical cap.
- Any change to `scoreD15()`'s crossing/pass/axis logic, `CROSSING_GAP_THRESHOLD`, or
  `PASS_MAX_CROSSINGS` — those are PLAN-018's clinical constants, untouched here.
- Any DB schema change. Severity is derived, not persisted (see Data model).

## Preflight checks

```bash
# 1. Confirm current D-15 scoring/plot code hasn't drifted from what this plan assumes
grep -n "PASS_MAX_CROSSINGS\|CROSSING_GAP_THRESHOLD\|export function scoreD15\|formatD15Summary" lib/colorVisionD15.ts

# 2. Confirm CapSlotPicker + D15Plot are still where this plan expects
grep -n "function CapSlotPicker\|function D15Plot\|capOptions" app/component/qa/forms/QaColorVisionForm.tsx

# 3. Confirm CAP_XY still holds the 16 real chromaticities (needed for the swatch conversion)
grep -n "CAP_XY" -A 18 lib/colorVisionD15.ts
```

## Data model

**No migration needed.** Severity is computed on the fly from the already-stored `_crossings` value
(and, transiently, from the live `D15Result` while the form is open) — it is never written to
`core.vision_tests_v2`. This keeps the feature reversible with a pure code revert and avoids adding yet
another derived column that could drift from `_crossings` (see PLAN-018 rule 5, "legacy columns are
derived, not primary" — same principle applies here, just taken further: don't persist it at all).

## Feature 1 — severity tiers + diagnosis sentence

Add to `lib/colorVisionD15.ts` (pure function, no React, unit-testable like `scoreD15`):

```ts
export type D15Severity = 'normal' | 'mild' | 'moderate' | 'severe'

// Named thresholds — clinical judgement calls, owned by the doctor, tune freely.
// Anchored to PASS_MAX_CROSSINGS so "normal" always matches the existing pass cut.
export const SEVERITY_THRESHOLDS: Record<Exclude<D15Severity, 'normal'>, number> = {
  mild: PASS_MAX_CROSSINGS + 1,      // e.g. 2-3 crossings
  moderate: PASS_MAX_CROSSINGS + 4,  // e.g. 4-6 crossings
  severe: PASS_MAX_CROSSINGS + 7,    // e.g. 7+ crossings
}

export function classifyD15Severity(crossings: number): D15Severity {
  if (crossings <= PASS_MAX_CROSSINGS) return 'normal'
  if (crossings < SEVERITY_THRESHOLDS.moderate) return 'mild'
  if (crossings < SEVERITY_THRESHOLDS.severe) return 'moderate'
  return 'severe'
}

const SEVERITY_TH: Record<D15Severity, string> = {
  normal: 'ปกติ',
  mild: 'ระดับเล็กน้อย',
  moderate: 'ระดับปานกลาง',
  severe: 'ระดับรุนแรง',
}

// e.g. "ผิดปกติ - Deutan ระดับปานกลาง (5 เส้นตัด)" / "ปกติ (0 เส้นตัด)"
export function describeD15Severity(result: Pick<D15Result, 'crossings' | 'axis' | 'pass'>): string {
  const severity = classifyD15Severity(result.crossings)
  const unit = result.crossings === 1 ? 'เส้น' : 'เส้น'
  if (result.pass) return `ปกติ (${result.crossings} เส้นตัด)`
  const axisLabel = CONFUSION_AXES[result.axis as Exclude<D15Axis, 'normal'>]?.label ?? result.axis
  return `ผิดปกติ - ${axisLabel} ${SEVERITY_TH[severity]} (${result.crossings} เส้นตัด)`
}
```

Threshold sketch above is a starting point (2-3 / 4-6 / 7+ crossings) loosely following the reference
site's "medium vs strong ~10 crossings" cutoff scaled to D-15's 15-segment path — **confirm the exact
boundaries with the doctor before shipping**, same as PLAN-018 did for `PASS_MAX_CROSSINGS`. Keep them
as named constants, not buried in a conditional.

### UI: banner placement

Render `describeD15Severity(result)` as a colored banner **above** the existing
`ผล: {summary}` line in `SessionBlock` (`QaColorVisionForm.tsx`), tinted by severity using the same
medical-gradient tones already established for `ScoreButtons`
(`[[clinical-form-ux-preferences]]`: emerald → lime → amber → rose):

```
┌────────────────────────────────────────┐
│ ⚠ ผิดปกติ - Deutan ระดับปานกลาง (5 เส้นตัด) │  ← new banner, amber/rose background
│ ผล: Fail - Deutan (5 crossings)           │  ← existing line, kept as-is (raw data)
└────────────────────────────────────────┘
```

Keep the existing raw `summary` line too — the banner is an aid, not a replacement for the reproducible
underlying number.

## Feature 2 — real-color cap swatches

Add a pure color-conversion helper to `lib/colorVisionD15.ts`, next to `xyToUv`:

```ts
// Approximate sRGB swatch for a cap's real CIE xy chromaticity, at a fixed assumed luminance
// (the physical D-15 caps are deliberately near-uniform lightness/chroma so patients discriminate by
// hue alone — see CAP_XY comments, all caps are Munsell value ~5). This is a DISPLAY CONVENIENCE for
// staff to visually cross-check cap numbers, not a calibrated reproduction of the physical chip —
// label it as such in the UI.
const SWATCH_ASSUMED_Y = 0.19 // ~ Munsell value 5, uncalibrated-display approximation

export function capSwatchHex(cap: number): string {
  const { x, y } = CAP_XY[cap]
  const Y = SWATCH_ASSUMED_Y
  const X = (Y / y) * x
  const Z = (Y / y) * (1 - x - y)
  const toSrgb = (c: number) => {
    const clamped = Math.min(1, Math.max(0, c))
    const gamma = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, gamma)) * 255)
  }
  const r = toSrgb(3.2406 * X - 1.5372 * Y - 0.4986 * Z)
  const g = toSrgb(-0.9689 * X + 1.8758 * Y + 0.0415 * Z)
  const b = toSrgb(0.055 * X - 0.204 * Y + 1.057 * Z)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export const CAP_SWATCH: Record<number, string> = Object.fromEntries(
  Object.keys(CAP_XY).map((k) => [Number(k), capSwatchHex(Number(k))]),
) as Record<number, string>
```

`CAP_SWATCH[0]` (pilot) included too, for the plot's reference dot.

### UI: where swatches replace flat colors

1. **`CapSlotPicker` option grid** (`QaColorVisionForm.tsx`) — each of the 15 cap buttons gets
   `style={{ backgroundColor: CAP_SWATCH[cap] }}`, number label kept on top with a text color that
   contrasts (compute simple luminance-based black/white text like existing badge patterns in the repo,
   or just default to a dark outline + white number for readability).
2. **Filled slot buttons** in `SessionBlock` (the `#1..#15` sequence buttons) — same swatch background
   once a cap is assigned.
3. **`D15Plot` cap dots** — `fill={CAP_SWATCH[cap]}` instead of `#fff`; keep the pilot's black stroke/ring
   so it's still visually distinct as the reference point.
4. Add a one-line caption under the plot (small muted text): `สีที่แสดงเป็นค่าประมาณเพื่อช่วยจำ ไม่ใช่สีมาตรฐานที่ปรับเทียบแล้ว`
   ("colors shown are an approximation to aid memory, not calibrated reference colors") — sets correct
   expectations per the Out-of-scope note above.

No change to `onSelect`/`onChange` handlers, validation, or the saved `_order` payload — this is a
pure rendering change on top of the existing picker.

## Files to create / modify

| File | Change |
|------|--------|
| `lib/colorVisionD15.ts` | Add `D15Severity`, `SEVERITY_THRESHOLDS`, `classifyD15Severity()`, `describeD15Severity()` (Feature 1); add `capSwatchHex()`, `CAP_SWATCH` (Feature 2). No changes to existing exports/behavior. |
| `app/component/qa/forms/QaColorVisionForm.tsx` | `SessionBlock`: render severity banner above the existing `ผล:` line. `CapSlotPicker`: swatch backgrounds on cap-option buttons. Slot buttons: swatch background once filled. `D15Plot`: swatch fill on cap dots + caption line. |

## Edge cases & rules

1. **Severity is display-only, never persisted.** Don't add a `_severity` column or write it into the
   legacy TEXT/`_abnormal` columns — recompute from `_crossings` wherever shown (list view, PDF, etc.),
   same rule as PLAN-018's "legacy columns are derived" but taken to "don't even store the derived
   value" since it's cheap to recompute and storing it risks drifting from `_crossings` if thresholds
   are tuned later.
2. **Severity thresholds are constants the doctor owns.** Same pattern as `PASS_MAX_CROSSINGS` — expose
   `SEVERITY_THRESHOLDS` named and confirm the cut points before shipping; do not hardcode magic numbers
   in the banner component.
3. **Banner never contradicts the raw summary.** `describeD15Severity` must be derived from the same
   `D15Result` object as `formatD15Summary` (never recomputed from a stale/partial order) — keep both
   calls fed by the same `result` variable already in `results[sessionItem.key]`.
4. **Swatch contrast for the number label.** Some cap hues (yellow-green region, e.g. cap 8) will be
   light — pick text color per-swatch by relative luminance, not a fixed dark/white, so numbers stay
   legible on every cap.
5. **Swatch caption is mandatory, not optional polish.** Per the Out-of-scope note, ship the
   "approximate, not calibrated" caption in the same PR as the swatches — the risk of a clinician
   over-trusting an on-screen color is the reason this was scoped as examiner-aid-only.
6. **Don't change `capSwatchHex`'s assumed `Y` per cap.** Using a uniform luminance for all 15 caps
   mirrors the physical test's design (equal lightness, discriminate by hue only) — do not "correct" it
   per-cap even if some swatches look uneven; that would fight the test's own design intent (see
   `[[d15-color-vision-diagram]]` for the same principle applied to geometry).

## Verification checklist

- [ ] `classifyD15Severity(0)` / `(1)` → `'normal'`; a mid-range count → `'mild'`/`'moderate'`; a high
      count → `'severe'` per the agreed thresholds.
- [ ] `describeD15Severity` output matches `formatD15Summary`'s crossings/axis for the same result (no
      divergence).
- [ ] Severity banner renders above the existing `ผล:` line for all 4 sessions once complete; blank/
      incomplete sessions show neither.
- [ ] `CAP_SWATCH[1..15]` are visibly distinct, roughly hue-ordered (1→15 traces a smooth hue loop, no
      jarring jump) when eyeballed against the reference D-15 cap photo.
- [ ] Cap numbers stay legible (contrast check) on every swatch, including light hues.
- [ ] Plot dots show swatch colors; pilot dot still visually distinguishable (ring/border).
- [ ] Caption about approximate/uncalibrated color is visible under the plot.
- [ ] No change to save payload, validation, or `scoreD15`/`formatD15Summary` output — diffing before/
      after for an identical order produces identical `_order`/`_crossings`/`_axis`/`_abnormal` values.

## Out-of-scope follow-ups (seed for next PLAN numbers)

- **PLAN-030** — Quantitative RED/GREEN/BLUE (or L/M/S cone) error-percentage metric, if the doctor
  decides to revisit the Vingrys & King-Smith method rejected in PLAN-018. Would use the reserved `_tes`
  column.
- **Future** — render the swatch-colored plot into the QA PDF export (currently deferred per PLAN-018).

## Rollback plan

Confined to:
- Remove the added exports from `lib/colorVisionD15.ts` (`classifyD15Severity`, `describeD15Severity`,
  `SEVERITY_THRESHOLDS`, `capSwatchHex`, `CAP_SWATCH`) — no other module depends on them per this plan.
- Revert the banner + swatch-background JSX in `QaColorVisionForm.tsx`.

No DB migration to roll back (this plan makes no schema change). No other read sites depend on the new
exports.
