# PLAN-006: QA Page — CheckPD Data Merge via thaiid

## Overview

Enrich the existing QA page (`/pages/qa`) with secondary data from the `checkpd` schema (mobile app test data, ~50k+ users). The `core` schema remains the primary data source — list rows, filters, create/edit flows are unchanged. When a QA patient's `thaiid` matches one or more rows in `checkpd.record_summary`, an additional **CheckPD Data** section is rendered inside the patient detail modal, and a small indicator is shown next to the patient in the main list.

This plan does **not** introduce cross-schema filtering, checkpd-primary mode, or any checkpd write operations. Read-only enrichment only.

**Related plans**: PLAN-003 (assessment thresholds), PLAN-004 (summary modal redesign). This plan adds a new section *below* those existing sections; do not rework the existing layout.

---

## Data model — match logic

### Match key
- `core.patients_v2.thaiid` (no underscore)  ↔  `checkpd.record_summary.thaiid` (no underscore)
- **Do not** match through `checkpd.users.thai_id` — `record_summary` already denormalises `thaiid`, and it's the table we actually render from.

### Row cardinality
- `checkpd.record_summary` PK is `(user_id, recorder)` → one patient (one `thaiid`) may appear in **multiple rows** when different recorders uploaded data.
- **Identity rule**: rows with the same `user_id` are the **same person**. `record_id` is the globally unique row identifier. Use `record_id` as React `key`, not `recorder`.
- **Ordering**: sort rows by `last_record_at DESC NULLS LAST`, then `updated_at DESC` as tiebreaker. Latest on top.

### Fields to render (from `checkpd.record_summary`)
| Field | Display | Notes |
|-------|---------|-------|
| `prediction_risk` | Badge: Risk / No risk / Unknown | colour via existing tone helpers |
| `condition` | Text (main condition) | rename UI label to "Main Condition" |
| `test_result` | Text | |
| `other` | Text (note) | only render if non-empty |
| `tremor_resting_hz` | Number + unit `Hz` | 3 decimals |
| `tremor_postural_hz` | Number + unit `Hz` | 3 decimals |
| `balance_hz` | Number + unit `Hz` | 3 decimals |
| `gait_hz` | Number + unit `Hz` | 3 decimals |
| `dual_tap_left_score` | Integer | |
| `dual_tap_right_score` | Integer | |
| `questionnaire_total` | Integer / 20 | |
| `voice_ahh_ts` | **Badge + tooltip** (see below) | |
| `voice_ypl_ts` | **Badge + tooltip** (see below) | |
| `last_record_at` | Accordion header (localised datetime) | primary sort key |
| `recorder` | Accordion header (subtext) | for visual disambiguation |
| `source_collection` | Accordion header (small pill) | |

### Voice field render rule
- If `voice_*_ts` is non-null → green badge "ทำแล้ว", tooltip shows formatted timestamp.
- If null → grey badge "ยังไม่ทำ", no tooltip.
- Use the same tone system (`good` / `muted`) used elsewhere in the summary modal.

---

## UI changes

### 1. Main table — CheckPD presence indicator

Add a small dot/badge in the patient name cell (or a dedicated narrow column, implementer's choice) when `has_checkpd === true`.

- **Visual**: 6px teal/emerald dot positioned right after the patient name, with `title` tooltip "มีข้อมูล CheckPD".
- **Source**: computed server-side in the page fetch (see Fetch strategy §1.1 below).
- **No click behaviour**: the dot is purely informational. Opening detail is still via the existing row action.

### 2. Detail modal — new "CheckPD Data" section

Location: inside `app/component/qa/QaPatientSummaryModal.tsx`, append a new section **after** the existing score sections (MOCA/HAMD/etc.) and **before** the modal footer.

#### Section structure

```
┌───────────────────────────────────────────────┐
│  ─── CheckPD Data ───────────────────────────  │  ← clear divider (see PLAN-004 section-header style)
│                                                │
│  [Skeleton while fetching]                     │
│  OR                                            │
│  [Empty state: "ไม่มีข้อมูล CheckPD"] (no match) │
│  OR                                            │
│  ▼ 2025-03-15 14:22 · recorder=xxx · mobile   │  ← Accordion item 1 (expanded by default)
│    ┌──────────┬──────────┬──────────┐         │
│    │ Risk     │ Condition│ Test res │         │
│    │ [badge]  │ text     │ text     │         │
│    └──────────┴──────────┴──────────┘         │
│    Tremor/Balance/Gait Hz grid                │
│    Tap L/R · Questionnaire · Voice badges     │
│    Other note (if any)                        │
│                                                │
│  ▶ 2024-11-08 09:10 · recorder=yyy · hospital │  ← Accordion item 2 (collapsed)
│  ▶ 2024-06-20 · …                             │
└───────────────────────────────────────────────┘
```

- Use shadcn `Accordion` (type `"multiple"` so users can expand several at once; first item `defaultValue`).
- Header row shows: `last_record_at` (formatted) · `recorder` · `source_collection` pill.
- Body renders the field grid above.
- Visual separation from core sections: section title uses `text-xs font-semibold uppercase tracking-wider text-gray-400` (consistent with PLAN-004 section style), and wrap entire section in `bg-teal-50/30 rounded-xl p-4 mt-6` so it's visually distinct from core scores.

#### Loading / empty states

- **Loading**: render 2 skeleton accordion items (grey pulsing rectangles, height 64px each). Reuse any existing skeleton util or use `animate-pulse`.
- **No match**: render a single muted line: `ไม่พบข้อมูล CheckPD สำหรับผู้ป่วยรายนี้` inside the section wrapper. Do **not** hide the section header — keeping the header present makes it obvious the check was run.
- **Error**: render a small red inline message `โหลดข้อมูล CheckPD ไม่สำเร็จ: {message}`. Do not block the rest of the modal.

---

## Fetch strategy

### §1.1 Main list query — `has_checkpd` boolean

Add a single lightweight existence check to the existing `fetchData()` in `app/pages/qa/page.tsx`.

**Recommended**: one additional query after patients are loaded, then enrich rows in-memory.

```ts
// After patients array is built and patientIds is computed:
const thaiIds = patients
  .map(p => p.thaiid)
  .filter((v): v is string => !!v && v.trim().length > 0)

let checkpdThaiIdSet = new Set<string>()
if (thaiIds.length > 0) {
  const { data: cpRows, error: cpErr } = await supabase
    .schema('checkpd')
    .from('record_summary')
    .select('thaiid')
    .in('thaiid', thaiIds)
  if (!cpErr && cpRows) {
    checkpdThaiIdSet = new Set(cpRows.map(r => r.thaiid).filter(Boolean))
  }
  // On error: log but do not fail the whole page. has_checkpd stays false.
}
```

Then pass `has_checkpd: p.thaiid ? checkpdThaiIdSet.has(p.thaiid) : false` into the `QaRow` type and render in `QaTable`.

**Why not a SQL view / RPC**: keeps all logic in one file, avoids a migration, works with the existing page-level pagination (we only check thaiids already on the current page, not 50k+). Revisit if page-load perf regresses.

**Type changes** (`app/component/qa/types.ts`):
```ts
export type QaRow = {
  // ...existing fields
  has_checkpd: boolean
}
```

### §1.2 Detail modal query — lazy fetch

Fetch on `QaPatientSummaryModal` mount (or when `row.patient.thaiid` changes).

```ts
const [cpLoading, setCpLoading] = useState(false)
const [cpRows, setCpRows] = useState<CheckpdRecordSummary[] | null>(null)
const [cpError, setCpError] = useState<string | null>(null)

useEffect(() => {
  const thaiid = row?.patient?.thaiid?.trim()
  if (!thaiid) { setCpRows([]); return }

  let cancelled = false
  setCpLoading(true)
  setCpError(null)

  supabase
    .schema('checkpd')
    .from('record_summary')
    .select(
      'user_id,recorder,record_id,source_collection,prediction_risk,condition,test_result,other,' +
      'tremor_resting_hz,tremor_postural_hz,balance_hz,gait_hz,' +
      'dual_tap_left_score,dual_tap_right_score,questionnaire_total,' +
      'voice_ahh_ts,voice_ypl_ts,last_record_at,updated_at,thaiid'
    )
    .eq('thaiid', thaiid)
    .order('last_record_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .then(({ data, error }) => {
      if (cancelled) return
      if (error) setCpError(error.message)
      else setCpRows(data ?? [])
      setCpLoading(false)
    })

  return () => { cancelled = true }
}, [row?.patient?.thaiid])
```

- Reset state when the modal closes (`row === null`) to avoid stale flashes on next open.
- No caching across modal opens for v1 — simple is better. Revisit if users frequently reopen same patient.

---

## Files to create / modify

| File | Change |
|------|--------|
| `app/component/qa/types.ts` | Add `CheckpdRecordSummary` type + `has_checkpd: boolean` on `QaRow` |
| `app/pages/qa/page.tsx` | Add `has_checkpd` enrichment step in `fetchData()` (§1.1) |
| `app/component/qa/QaTable.tsx` | Render dot/badge when `row.has_checkpd` next to patient name |
| `app/component/qa/QaPatientSummaryModal.tsx` | Add new "CheckPD Data" section with lazy fetch, accordion, loading/empty/error states |
| `app/component/qa/CheckpdDataSection.tsx` *(new)* | Encapsulate the accordion + field rendering to keep the modal file manageable |

No schema migration. No backend changes. No changes to `QaCreateModal`, `QaAssessmentModal`, or any write path.

---

## Types (proposed)

```ts
// app/component/qa/types.ts
export type CheckpdRecordSummary = {
  user_id: string
  recorder: string
  record_id: string | null
  source_collection: string | null
  prediction_risk: boolean | null
  condition: string | null
  test_result: string | null
  other: string | null
  tremor_resting_hz: number | null
  tremor_postural_hz: number | null
  balance_hz: number | null
  gait_hz: number | null
  dual_tap_left_score: number | null
  dual_tap_right_score: number | null
  questionnaire_total: number | null
  voice_ahh_ts: string | null
  voice_ypl_ts: string | null
  last_record_at: string | null
  updated_at: string | null
  thaiid: string | null
}
```

---

## Edge cases & rules

1. **No thaiid on core patient** → skip both the indicator check and the modal fetch entirely. Section renders empty state.
2. **thaiid present on core but no match in checkpd** → `has_checkpd=false`, modal section shows empty state text.
3. **Multiple rows same `user_id`** → render all as separate accordion items. Do NOT dedupe — each row is a distinct recorder's submission.
4. **Whitespace / format mismatch in thaiid** → apply `.trim()` on the core side before `.in()` / `.eq()`. No format normalisation beyond trim (do not strip dashes — the data should already be clean).
5. **Checkpd schema access denied / RLS** → treat as error (empty section + small red note in modal, `has_checkpd=false` silently in list). Do not crash the page.
6. **Page size stays 20** — checkpd presence check runs over at most 20 thaiids per page, so perf cost is trivial.

---

## Out of scope

- Editing any checkpd data from the QA page.
- Viewing raw sensor JSONB (`checkpd.vibration.sensor_raw`, `checkpd.tap.tap_raw`, etc.) — only the aggregated summary is shown.
- Drilling into individual test tables (`checkpd.vibration`, `checkpd.tap`, `checkpd.questionnaire`, `checkpd.voice`). A future plan can add a "View raw records" button that links to a separate checkpd detail page.
- Cross-schema filters (e.g. "show only patients with CheckPD questionnaire total > 10"). Filter set unchanged from current QA page.
- CheckPD-primary list mode (previously discussed 3-state segmented control — deferred indefinitely).

---

## Acceptance checklist

- [ ] `has_checkpd` boolean appears on `QaRow` and is populated correctly for a page of 20 patients.
- [ ] Dot/badge renders only for rows with `has_checkpd === true`.
- [ ] Opening the detail modal for a patient with a matching thaiid shows the new section with accordion items sorted `last_record_at DESC`.
- [ ] First accordion item is expanded by default; others collapsed.
- [ ] Voice badges show "ทำแล้ว" (green) + tooltip timestamp when `voice_*_ts` is non-null, "ยังไม่ทำ" (grey) when null.
- [ ] No-thaiid patient → modal section renders empty state, no network call fired.
- [ ] Closing and reopening the modal for a different patient shows fresh data, not stale content from the previous patient.
- [ ] Error from checkpd query does not break the rest of the modal; shows inline red note.
- [ ] Existing create/edit/assessment flows still work unchanged.
