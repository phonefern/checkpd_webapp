# PLAN-018 — Farnsworth D-15 Color Vision Test (order capture + auto-plot + crossing-count summary)

## Overview

The QA assessment flow records a battery of clinical tests for each Parkinson's patient, but the
**Farnsworth D-15 Dichotomous color-vision test** is currently captured only as a free-text result
string. The existing table [`core.vision_tests_v2`](../app/pages/qa/core_schema.sql#L467) has columns
like `color_paper_re_test TEXT` (a pass/fail/tritan label typed by hand) and a `*_abnormal` 0/1 flag,
but it does **not** store the raw arrangement the patient produced, and there is **no tile for vision
in the QA assessment modal** ([`QaAssessmentModal.tsx`](../app/component/qa/QaAssessmentModal.tsx)).

This plan adds a dedicated **Color Vision (D-15)** form to the QA modal. The examiner administers the
physical D-15 test as usual, then keys the **"order given by patient"** (the sequence of cap numbers
1–15 the patient laid down) into the app. The app then **auto-draws** the standard circular TEST/RETEST
diagram, connects the caps in the patient's order, **counts crossing lines**, classifies the
**confusion axis** (normal / protan / deutan / tritan), derives **pass/fail**, and persists everything
to `core.vision_tests_v2`.

*************** https://rdrr.io/cran/CVD/man/FarnsworthD15.html *******************

Reference for the physical test and its scoring diagram:
<https://www.ophthalmic.com.sg/product/farnsworth-d15-color-test/>

**Reason for change:** Right now the D-15 result is a subjective free-text string; the actual cap order
is lost, so the result cannot be re-scored, audited, or analysed. Doctors also have to read the crossing
diagram on paper and interpret protan/deutan/tritan by eye, which is error-prone. Capturing the raw
order and computing the diagram + crossings automatically makes the result reproducible and removes the
manual plotting step.

## Related plans

- [[PLAN-015]] — Smell form recognition/perception: the closest precedent for "extend an existing
  `core.*_v2` table + refactor its `Qa*Form` to capture richer per-item data and surface a derived
  count." Mirror its column-naming and tri-state conventions where relevant.
- Reuses the QA modal tile pattern established for all `Qa*Form` files.

## Scope

### In scope
- Capture the patient's cap order (1–15) for **4 sessions only**: Paper × {Right eye, Left eye} ×
  {Test, Retest}.
- Live SVG **circular plot** per session (caps at fixed positions, connecting lines in patient order,
  crossing lines highlighted, confusion axes overlaid).
- **Crossing-count scoring**: count major crossing lines, classify axis by the direction of the
  crossing lines, derive pass/fail.
- Extend `core.vision_tests_v2` with order arrays + computed metrics for those 4 sessions (additive
  migration; existing columns retained and back-filled with a human summary string).
- New `QaColorVisionForm.tsx` + a new tile in `QaAssessmentModal.tsx`.

### Out of scope
- The **Application** (in-app) color variants (`color_app_*` columns) — keyed as plain text for now,
  no plot. (Follow-up: PLAN-019.)
- **Contrast discrimination** (`contrast_*`) and **Visual acuity** (`va_*`) columns — untouched.
- The **quantitative Vingrys & King-Smith** TES / confusion-angle method — explicitly rejected in
  favour of the visual crossing-count method that matches the paper sheet (see "Edge cases & rules").
  A `*_tes` column is reserved but left NULL for a possible future plan.
- PDF export of the diagram — deferred.
- Any change to the `total_score` fetch contract of other tests.

## Preflight checks

Run these before writing code to confirm assumptions still hold:

```bash
# 1. Confirm the existing vision table shape and column names
grep -n "vision_tests_v2" -A 45 app/pages/qa/core_schema.sql

# 2. Confirm the QA modal has NO vision tile yet and see the tile/TESTS pattern
grep -n "TESTS\|TestKey\|activeForm" app/component/qa/QaAssessmentModal.tsx

# 3. Confirm form conventions (upsert onConflict: 'patient_id', schema('core'))
grep -n "upsert\|onConflict\|schema('core')" app/component/qa/forms/QaSmellForm.tsx

# 4. Confirm CSV source columns AT–BT (the paper color block) for label wording
#    (informational only — drives the Thai UI labels)
```

## Data model

Extend `core.vision_tests_v2` (do **not** create a new table — keeps the modal's single
`maybeSingle().eq('patient_id')` fetch and matches the existing wide-per-patient shape). The table
already has a `UNIQUE (patient_id)` constraint used by upsert.

Add, **for each of the 4 sessions** `re_test`, `re_retest`, `le_test`, `le_retest`:

```sql
ALTER TABLE core.vision_tests_v2
  -- raw cap order the patient produced; length-15 array of cap numbers 1..15, no pilot.
  -- NULL = session not entered. Stored as SMALLINT[] so it can be re-scored later.
  ADD COLUMN color_paper_re_test_order      SMALLINT[] NULL,
  ADD COLUMN color_paper_re_test_crossings  SMALLINT   NULL,  -- computed major crossings
  ADD COLUMN color_paper_re_test_axis       TEXT       NULL,  -- 'normal'|'protan'|'deutan'|'tritan'
  ADD COLUMN color_paper_re_test_tes        REAL       NULL,  -- reserved, left NULL (out of scope)

  ADD COLUMN color_paper_re_retest_order     SMALLINT[] NULL,
  ADD COLUMN color_paper_re_retest_crossings SMALLINT   NULL,
  ADD COLUMN color_paper_re_retest_axis      TEXT       NULL,
  ADD COLUMN color_paper_re_retest_tes       REAL       NULL,

  ADD COLUMN color_paper_le_test_order       SMALLINT[] NULL,
  ADD COLUMN color_paper_le_test_crossings   SMALLINT   NULL,
  ADD COLUMN color_paper_le_test_axis        TEXT       NULL,
  ADD COLUMN color_paper_le_test_tes         REAL       NULL,

  ADD COLUMN color_paper_le_retest_order      SMALLINT[] NULL,
  ADD COLUMN color_paper_le_retest_crossings  SMALLINT   NULL,
  ADD COLUMN color_paper_le_retest_axis       TEXT       NULL,
  ADD COLUMN color_paper_le_retest_tes        REAL       NULL;
```

**Reuse existing columns** (no rename):
- `color_paper_<eye>_<phase>_abnormal INTEGER` → write the derived **pass/fail** here (0 = pass/normal,
  1 = fail/defective). Keeps backward compatibility with anything already reading it.
- `color_paper_<eye>_<phase> TEXT` → write a human summary string, e.g. `"Fail — Deutan (3 crossings)"`
  or `"Pass — Normal (0 crossings)"`. This is what older read sites already expect.

So per session the form writes **5 fields**: `_order`, `_crossings`, `_axis`, plus the legacy
`_abnormal` and the legacy text column. Codex may keep `_order` as `SMALLINT[]`; if Supabase array
round-tripping proves awkward, fall back to a comma-joined `TEXT` (e.g. `"3,1,2,4,..."`) — final type at
Codex's discretion, but document the choice in a SQL comment.

## Scoring algorithm (crossing-count)

Put all geometry + scoring in a pure, unit-testable module, e.g. `lib/colorVisionD15.ts`, so the form
only renders. Sketch (final code at Codex's discretion):

```ts
// Fixed positions of the 15 caps + pilot on the D-15 scoring circle.
// The pilot (reference) cap is index 0; caps 1..15 follow clockwise, matching the
// official sheet layout (P at left, 1..5 across the top, 6..9 down the right,
// 10..12 along the bottom, 13..15 up the left). Coordinates are on a unit circle;
// CALIBRATE the exact angles so the rendered diagram matches the printed sheet.
export const D15_POSITIONS: Record<number, { x: number; y: number }> = { /* 0=pilot, 1..15 */ }

// Confusion-axis directions drawn on the official diagram. A patient's crossing line
// is classified by which axis it runs most parallel to (smallest angular difference).
// VERIFY these against the printed sheet's PROTAN/DEUTAN/TRITAN lines before shipping.
export const CONFUSION_AXES = {
  protan: { angleDeg: /* ~ */ 0 },
  deutan: { angleDeg: /* ~ */ 0 },
  tritan: { angleDeg: /* ~ */ 0 },
}

export interface D15Result {
  crossings: number          // count of major crossing lines
  axis: 'normal' | 'protan' | 'deutan' | 'tritan'
  pass: boolean              // crossings <= 1  → pass
  segments: { from: number; to: number; isCrossing: boolean }[] // for the plot
  summary: string            // "Fail — Deutan (3 crossings)"
}

// order = the 15 cap numbers the patient laid down, in sequence (no pilot).
export function scoreD15(order: number[]): D15Result { /* ... */ }
```

Algorithm definition (so the result is reproducible):

1. **Build the path**: pilot(0) → order[0] → order[1] → … → order[14]. 15 connecting segments.
2. **Major crossing** = a segment whose two caps are far apart on the circle. Concretely: a segment is
   a major crossing if the **angular gap** between its endpoints on `D15_POSITIONS` exceeds a threshold
   (start at ~ 2 cap-steps, i.e. the chord skips ≥ 2 intervening caps). Tune the threshold so a perfect
   arrangement (1,2,3,…,15) yields **0 crossings** and known defective arrangements reproduce the paper
   scoring. Keep the threshold as a named constant.
3. **pass/fail**: `pass = crossings <= 1` (0–1 minor transpositions tolerated; ≥ 2 = defective). This is
   the conventional D-15 cut. Confirm the exact cut with the doctor; expose it as a constant.
4. **axis classification**: for each major crossing segment compute its line angle; find the nearest
   `CONFUSION_AXES` direction; **majority vote** across crossing segments → `protan` / `deutan` /
   `tritan`. If `pass` (≤ 1 crossing) → `'normal'`.
5. **summary string** as shown above, written into the legacy TEXT column.

> Note: the crossing-count method is a visual heuristic — it approximates, not replaces, the formal
> Vingrys & King-Smith computation. That trade-off is intentional (chosen over the quantitative method)
> because it matches what the examiner reads off the paper sheet today.

## UI structure

New tile in the QA modal grid (👁️), opens `QaColorVisionForm`. Inside the form: a tab/segment per eye,
and within each eye a **Test** and **Retest** block. Each block = an order-entry control on the left and
a live SVG diagram on the right.

```
┌──────────────────────────────────────────────────────────────────────┐
│ การมองเห็นสี (Farnsworth D-15)                                          │
│  [ ตาขวา (RE) ]  [ ตาซ้าย (LE) ]            ← eye tabs                   │
│ ─────────────────────────────────────────────────────────────────────│
│  TEST — ลำดับที่ผู้ป่วยเรียง                  RETEST — ลำดับที่ผู้ป่วยเรียง       │
│  ┌───────────────┐  ┌───────────┐    ┌───────────────┐  ┌───────────┐ │
│  │ [3][1][2][4]… │  │   ◯ plot  │    │ [1][2][3][4]… │  │   ◯ plot  │ │
│  │ 15 ช่องตัวเลข   │  │  TEST     │    │ 15 ช่องตัวเลข   │  │  RETEST   │ │
│  └───────────────┘  └───────────┘    └───────────────┘  └───────────┘ │
│  ผล: Fail — Deutan (3)                 ผล: Pass — Normal (0)            │
└──────────────────────────────────────────────────────────────────────┘
```

Order-entry control: 15 small numeric inputs (or a single "type the sequence" field that parses
`3 1 2 4 …`). As the examiner fills it, the SVG updates live: caps drawn as labelled dots at
`D15_POSITIONS`, connecting polyline in patient order, **crossing segments in red**, the three confusion
axes as faint dashed guide lines, and the computed `summary` shown beneath. Reuse the button/chip visual
language from `QaSmellForm` / `QaMdsForm` (see [[feedback-clinical-form-ux]]).

Validation: each session's order, when complete, must be a permutation of 1..15 (each cap used exactly
once). Show an inline warning if a number is duplicated or missing; allow **partial save** (a session
left blank stays NULL).

## Files to create / modify

| File | Change |
|------|--------|
| `app/pages/qa/core_schema.sql` | Add the 16 new columns to `core.vision_tests_v2` (4 sessions × `_order`/`_crossings`/`_axis`/`_tes`). Keep file as the schema source of truth. |
| `supabase/migrations/<ts>_d15_order_columns.sql` *(new)* | The runnable `ALTER TABLE … ADD COLUMN` migration (additive, all `NULL`). Match the project's migration location/convention if one exists; otherwise place beside other ad-hoc SQL. |
| `lib/colorVisionD15.ts` *(new)* | Pure scoring + geometry module: `D15_POSITIONS`, `CONFUSION_AXES`, `scoreD15(order)`. No React. |
| `app/component/qa/forms/QaColorVisionForm.tsx` *(new)* | The form: 4-session order entry, live SVG plot, computed summary, upsert to `core.vision_tests_v2` on `patient_id`. Follow `QaSmellForm` structure (props `{ open, patientId, onClose, onSaved }`, `schema('core').upsert({...}, { onConflict: 'patient_id' })`). |
| `app/component/qa/QaAssessmentModal.tsx` | Add `'colorvision'` to `TestKey`, a tile entry (👁️ "การมองเห็นสี (D-15)"), and a "done" check. Vision has no single `total_score`, so the modal's fetch + done-badge logic must special-case it (see rule 6). Mount `<QaColorVisionForm open={activeForm === 'colorvision'} {...formProps} />`. |

## Edge cases & rules

1. **Order must be a permutation of 1..15.** Reject save of a session that is partially filled with
   duplicates/gaps; a fully blank session is allowed and stored as NULL.
2. **Partial sessions.** The examiner may fill only RE Test (no retest, no LE). Save must upsert only the
   provided sessions and leave the rest NULL — never overwrite an existing session with NULL unless the
   examiner explicitly clears it.
3. **Crossing threshold & pass cut are constants.** Surface `CROSSING_GAP_THRESHOLD` and `PASS_MAX_CROSSINGS`
   as named constants in `lib/colorVisionD15.ts`; the doctor owns these clinical cutoffs — do not bury
   them in logic.
4. **Axis = 'normal' when pass.** If `crossings <= 1`, force `axis = 'normal'` regardless of the lone
   segment's direction (a single minor transposition is not a confusion axis).
5. **Legacy columns are derived, not primary.** Always recompute `_abnormal` (0/1) and the legacy TEXT
   summary from `_order` on save; never let them drift from `_order`.
6. **Modal "done" indicator.** A vision tile is "done" if **any** of the 4 `_order` columns is non-NULL.
   The current modal keys `done` off `total_score`; add a parallel path for vision (e.g. fetch the 4
   `_order` columns and mark done when any is present). Do not show a `score / maxScore` line for vision —
   show the RE/LE pass-fail summary instead (or just "✓ บันทึกแล้ว").
7. **`logActivity` on save.** Call `logActivity({ action: 'UPDATE', page: 'qa', description: 'D-15 color vision', userEmail })`
   like other QA writes (see [[client-side-patterns-to-follow]]).
8. **Calibrate geometry before shipping.** The exact cap angles and confusion-axis directions must be
   tuned so (a) the diagram visually matches the printed sheet and (b) the perfect order 1..15 scores 0
   crossings. This is a visual calibration step, not guesswork — verify against the reference image.

## Verification checklist

- [ ] Migration applies cleanly; 16 new columns exist on `core.vision_tests_v2`, all NULL by default.
- [ ] `scoreD15([1,2,3,…,15])` → `{ crossings: 0, axis: 'normal', pass: true }`.
- [ ] A known deutan-pattern order reproduces the paper sheet's axis call.
- [ ] New 👁️ tile appears in the QA modal and opens the form.
- [ ] Live SVG updates as digits are typed; crossing segments render red; axes overlaid.
- [ ] Duplicate/missing cap number blocks that session's save with an inline warning.
- [ ] Partial save (RE Test only) persists one `_order` and leaves the other 3 NULL.
- [ ] Re-opening the form reloads saved orders and re-renders identical diagrams.
- [ ] Legacy `color_paper_<eye>_<phase>` TEXT + `_abnormal` reflect the computed result.
- [ ] Modal tile shows "done" once any session is saved; `logActivity` fires.
- [ ] No regression to other tiles' `total_score` fetch.

## Out-of-scope follow-ups (seed for next PLAN numbers)

- **PLAN-019** — Application (in-app) D-15 variants (`color_app_*`): same order-capture + plot for the
  app-administered test; possibly auto-import the order from the mobile app instead of manual keying.
- **PLAN-020** — Contrast discrimination + Visual acuity structured capture (rest of the AT–BT block).
- **PLAN-021** — Render the D-15 diagram into the QA PDF export.
- **Future** — add the quantitative Vingrys & King-Smith TES + confusion angle, writing the reserved
  `_tes` columns.

## Rollback plan

Confined to:
- Drop the 16 added columns from `core.vision_tests_v2` (additive migration → safe `DROP COLUMN`).
- Delete `lib/colorVisionD15.ts` and `app/component/qa/forms/QaColorVisionForm.tsx`.
- Revert the tile + `TestKey` additions in `QaAssessmentModal.tsx`.

No other read sites depend on the new columns (legacy TEXT/`_abnormal` columns are unchanged in shape).
