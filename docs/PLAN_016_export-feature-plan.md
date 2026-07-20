# Users Page — Select & Export Feature

## Goal

Add row-selection checkboxes to the Users table and two export buttons ("Export Selected" / "Export All Filtered") that download a CSV containing joined data from three schemas: `public`, `checkpd`, and `core`.

---

## Files Changed

| File | Action |
|---|---|
| `app/pages/users/page.tsx` | Add selection state + export handler |
| `app/component/users/UserTable.tsx` | Add checkbox column |
| `app/component/users/SearchFilters.tsx` | Add export buttons + props |
| `app/api/export/users-csv/route.ts` | **New** — POST endpoint, returns CSV |

---

## Selection Model

- **Selection key** = `"${user_id}||${record_id ?? ''}"` (composite, handles null record_id)
- State: `selectedKeys: Set<string>` in `page.tsx`
- "Select all on page" header checkbox — toggles only the current page's rows
- Clearing filters/navigating pages does **not** reset selection (user can accumulate across pages)

---

## Export Modes

### Export Selected
- Sends the current `selectedKeys` set to the API as `{mode: "selected", pairs: [{userId, recordId}[]]}`
- Disabled when `selectedKeys.size === 0`

### Export All Filtered
- Sends current filter params to the API as `{mode: "filtered", filters: {...}}`
- API re-queries `user_record_summary_with_users` with those filters (no page limit, capped at 5 000 rows)
- Always available

---

## CSV Columns (in order)

### Identity
| Column | Source |
|---|---|
| `user_id` | `public.user_record_summary_with_users.id` |
| `record_id` | `public.user_record_summary_with_users.record_id` |
| `area` | `public.users.area` |

### Demographics (prefer `checkpd.users`, fallback `public.users`)
| Column | checkpd field | public fallback |
|---|---|---|
| `first_name` | `first_name` | `firstname` |
| `last_name` | `last_name` | `lastname` |
| `gender` | `gender` | `gender` |
| `age` | `age` | `age` |
| `phone_number` | `phone_number` | `phonenumber` |
| `thaiid` | `thai_id` | `thaiid` |
| `province` | `province` | `province` |

### Public Record Summary (`public.user_record_summary`)
Matched by (user_id, record_id) — fallback to latest row per user_id.

| Column | Field |
|---|---|
| `condition` | `condition` (e.g. pd / ctrl / pdm) |
| `other` | `other` |

### CheckPD Summary (`checkpd.record_summary` — latest row per user_id)
| Column | Field |
|---|---|
| `prediction_risk` | `prediction_risk` (true/false/null → "true"/"false"/"") |
| `test_result` | `test_result` |
| `questionnaire_total` | `questionnaire_total` |

### CheckPD Questionnaire (`checkpd.questionnaire` via `checkpd.records`)
`q01` … `q20` — 0/1/null values per item

### Clinical Flags (`core.patient_diagnosis_v2`, matched via `thaiid → core.patients_v2.id`)
| Column | Field |
|---|---|
| `diagnosis_condition` | `condition` |
| `hy_stage` | `hy_stage` |
| `disease_duration` | `disease_duration` |
| `rbd_suspected` | boolean → "Yes"/"No"/"" |
| `hyposmia` | boolean |
| `constipation` | boolean |
| `depression` | boolean |
| `eds` | boolean |
| `ans_dysfunction` | boolean |
| `mild_parkinsonian_sign` | boolean |
| `family_history_pd` | boolean |
| `adl_score` | `adl_score` |
| `scopa_aut_score` | `scopa_aut_score` |
| `fdopa_pet_score` | `fdopa_pet_score` |

### Clinical Scores (one score table each, matched by `patient_id`)
| Column | Table | Field |
|---|---|---|
| `moca_total` | `core.moca_v2` | `total_score` |
| `hamd_total` | `core.hamd_v2` | `total_score` |
| `hamd_severity` | `core.hamd_v2` | `severity_level` |
| `mds_updrs_total` | `core.mds_updrs_v2` | `total_score` |
| `epworth_total` | `core.epworth_v2` | `total_score` |
| `smell_total` | `core.smell_test_v2` | `total_score` |
| `tmse_total` | `core.tmse_v2` | `total_score` |
| `rbd_total` | `core.rbd_questionnaire_v2` | `total_score` |
| `rome4_total` | `core.rome4_v2` | `total_score` |

---

## API Route — Data Fetch Strategy

`POST /api/export/users-csv`

### Steps

1. **Resolve pairs** — if `mode=filtered`, query `user_record_summary_with_users` with filter params (limit 5 000) to get `(user_id, record_id)` list. If `mode=selected`, use `pairs` directly.

2. **Batch A — public schema** (parallel)
   - `public.users` → `SELECT * WHERE id IN [userIds]`

3. **Batch B — checkpd schema** (parallel)
   - `checkpd.users` → demographics fallback
   - `checkpd.record_summary` → `WHERE user_id IN [userIds]`, order by `last_record_at DESC` — keep latest per `user_id`
   - `checkpd.records` → `WHERE user_id IN [userIds]` — then filter in-memory to match `(user_id, record_id)`
   - `checkpd.questionnaire` → `WHERE record_pk IN [recordPks]`

4. **Batch C — core schema**
   - Collect all `thaiid` values
   - `core.patients_v2` → `WHERE thaiid IN [thaiids]`, take latest per `thaiid`
   - From those patient_ids, fetch in parallel:
     - `core.patient_diagnosis_v2`
     - `core.moca_v2`, `core.hamd_v2`, `core.mds_updrs_v2`
     - `core.epworth_v2`, `core.smell_test_v2`, `core.tmse_v2`
     - `core.rbd_questionnaire_v2`, `core.rome4_v2`

5. **Join in-memory** — build one object per `(user_id, record_id)` row

6. **Build CSV** — UTF-8 BOM prefix (`﻿`) for Excel Thai text compatibility, comma-delimited, values quoted if they contain commas/newlines

### Response Headers
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="checkpd_export_<YYYYMMDD>.csv"
```

---

## Component Changes

### `UserTable.tsx`
New props:
```ts
selectedKeys: Set<string>
onSelectionChange: (keys: Set<string>) => void
```
- Leftmost column: `<th>` with "select all on page" checkbox, each `<td>` with row checkbox
- Key: `` `${user.id}||${user.record_id ?? ''}` ``

### `SearchFilters.tsx`
**Removed:** "View All Records", "Export Data", "Storage" buttons.

New props:
```ts
selectedCount: number
isExporting: boolean
onExportSelected: () => void
onExportAll: () => void
onClearSelection: () => void
```
Footer bar layout:
- Left: record count + selection badge with ✕ clear button
- Right: `Refresh` | `Export Selected (N)` (emerald, disabled when 0) | `Export All Filtered` (indigo)
- Spinner icon replaces Download icon while exporting

### `page.tsx`
New state:
```ts
const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
const [isExporting, setIsExporting] = useState(false)
```
`handleExport(mode)` function:
- `setIsExporting(true)`
- POST to `/api/export/users-csv`
- Receive blob → create object URL → trigger `<a>` download
- `setIsExporting(false)`

---

## Error Handling

- API returns `400` for bad input, `500` with `{error: string}` for unexpected failures
- Client shows `alert()` on non-OK response (simple, no extra UI needed)
- Max 5 000 rows for "Export All"; returns `400` with message if exceeded

---

## Thai Text / CSV Encoding

- UTF-8 BOM (`0xEF 0xBB 0xBF`) prepended so Excel opens the file correctly
- All string values escaped: double-quote wrapping, internal `"` → `""`
- Null/undefined → empty string `""`
- Boolean → `"Yes"` / `"No"` / `""`
- Numeric → `String(n)` (no locale formatting, preserves precision)
