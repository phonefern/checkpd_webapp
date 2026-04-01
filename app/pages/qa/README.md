# QA Page — core schema

Data quality assurance view for the `core` Supabase schema.

## Files

| File | Description |
|------|-------------|
| `app/pages/qa/page.tsx` | Main Client Component — state, fetching, edit handlers |
| `app/component/qa/types.ts` | Shared types, constants, `detectQaCondition` helper |
| `app/component/qa/QaSearchFilters.tsx` | Filter bar (search, condition, H&Y, province, date range) |
| `app/component/qa/QaTable.tsx` | Data table with inline edit support |
| `app/component/users/Pagination.tsx` | Reused pagination component |

## Tables queried (schema: `core`)

| Table | Fields used |
|-------|-------------|
| `patients_v2` | id, first_name, last_name, age, province, collection_date, hn_number, bmi |
| `patient_diagnosis_v2` | patient_id, condition, hy_stage, disease_duration, other_diagnosis_text, constipation, rbd_suspected |
| `moca_v2` | patient_id, total_score |
| `hamd_v2` | patient_id, total_score, severity_level |
| `mds_updrs_v2` | patient_id, total_score |
| `epworth_v2` | patient_id, total_score |
| `smell_test_v2` | patient_id, total_score |

## Fetch strategy

1. **Diagnosis pre-filter** (when Condition or H&Y filter is active): query `patient_diagnosis_v2` first, collect matching `patient_id`s, then filter `patients_v2` with `.in('id', ids)`.
2. **Patient page query**: `patients_v2` with `count: 'exact'`, `.range(from, to)`, plus search/province/date filters.
3. **Parallel detail fetch**: after getting the current page's patient IDs, fetch all 6 test tables simultaneously with `Promise.all`.

## Condition detection (`detectQaCondition`)

Raw `condition` text from the DB is normalised into a `QaConditionCategory` enum at read time. Priority order:
1. `constipation === true` → `Constipation`
2. `rbd_suspected === true` → `Suspected RBD`
3. Keyword match on `condition + other_diagnosis_text` → mapped category
4. Default → `Other diagnosis`

## Filters

| Filter | Source field |
|--------|-------------|
| Search | `first_name`, `last_name`, `hn_number` (ilike) |
| Condition | `detectQaCondition` on `patient_diagnosis_v2` |
| H&Y Stage | `patient_diagnosis_v2.hy_stage` |
| Province | `patients_v2.province` |
| From / To date | `patients_v2.collection_date` |

## Inline edit

Click **Edit** on any row to edit:
- `patients_v2`: province
- `patient_diagnosis_v2`: condition, H&Y stage, disease duration, other diagnosis text

Save writes to both tables in parallel:
- `patients_v2` → `.update()` by `id`
- `patient_diagnosis_v2` → `.upsert()` with `onConflict: 'patient_id'`

## Pagination

Page size: **20 rows**. Handled via `useState` + `.range(from, to)` on the Supabase query. Total count returned by `count: 'exact'`.

## Visit No design (multi-visit per patient)

Current implementation supports multi-visit history in **Detail** without a schema migration:
- Group visits by patient identity priority: `thaiid` -> `hn_number` -> (`first_name` + `last_name`)
- Sort by `collection_date` asc, then `id` asc
- Derive `visit_no` in UI as 1..N from sorted visits
- Allow doctor/staff to switch visits inside the same detail modal

### DB field requirement

Short answer: **not required for phase 1** because `visit_no` can be derived from existing `patients_v2` rows and `collection_date`.

Recommended for phase 2 (data quality hardening):
- Add a stable cross-visit identity key (example: `patient_master_id` or `patient_uid`)
- Add uniqueness guard such as `(patient_uid, collection_date)` when business rules require one visit per day
- Optionally materialize `visit_no` in a SQL view (window function) if needed for list-wide sorting/filtering
