# PLAN-026 — Storage page: migrate listing table to `checkpd` schema

## 1. Overview

The `/pages/storage` "Raw Data Access" screen lists CheckPD patient records so a researcher can multi-select and download the raw test files (voice/tremor/gait/balance/tap/pinch/questionnaire) as a ZIP. The listing table currently reads a **legacy `public`-schema view** `user_record_with_users_and_storage` (built on `public.users` + `public.user_record_summary`, which is fed by the old GCP migration cron in [app/pages/storage/gcp.py](../app/pages/storage/gcp.py)).

This plan moves **only the listing/filter data source** to the new normalized schema `checkpd` (`checkpd.record_summary` + `checkpd.users`, defined in [app/pages/qa/checkpd_schema.sql](../app/pages/qa/checkpd_schema.sql)). The page already reads `checkpd` elsewhere via the established `.schema('checkpd')` PostgREST pattern (dashboard, Users detail, QA enrichment), so this is a consistency + richness upgrade, not a new access pattern.

**Reason for change.** `public.user_record_summary` is driven by the legacy `gcp.py` cron that is being retired, and it carries only a single `test_result` string. `checkpd.record_summary` is the go-forward consolidation target and carries far richer per-test data (per-test counts, computed values `tremor_resting_hz` / `dual_tap_*_score` / `questionnaire_total`, per-test `prediction_risk`, plus `event_id`). Standardizing storage on `checkpd` aligns it with the dashboard, Users, and QA pages and unlocks better columns/filters later.

**Critical fact that bounds scope.** The download path is *independent of the listing schema*. [app/api/storage/download-zip-multi/route.ts](../app/api/storage/download-zip-multi/route.ts) builds the S3 prefix itself as `` `${id}/${record_id}/` `` and lists the S3 bucket directly — it never reads `storage_base_path` from the table. The new CheckPD pipeline **still uploads raw files to S3 at the same `user_id/record_id/` layout** (confirmed). Therefore the download button keeps working with zero change, provided the new view exposes `id` (= user_id), `record_id`, and `condition`.

## 2. Related plans

- [[PLAN-006]] / [[PLAN-007]] — established the `.schema('checkpd')` read-only access pattern (record_summary matched to users by `user_id`). Reuse the same client usage.
- [[PLAN-012]] — dashboard already reads `checkpd.users` + `checkpd.record_summary`; same tables, same grants.
- This plan is **independent** of the download/export refactor [[PLAN-019]] (that one re-homes `/pages/export`; this one only swaps the storage listing source).

## 3. Scope

**In scope**
- Create a flat `checkpd` view that joins `record_summary` + `users` and **aliases columns to the exact names the current code already reads** (so the React/query layer changes minimally).
- Repoint the 3 storage server reads from `public` `user_record_with_users_and_storage` → the new `checkpd` view via `.schema('checkpd')`:
  - [app/api/storage/list-users/route.ts](../app/api/storage/list-users/route.ts) (via `buildPatientQuery`)
  - [app/api/storage/download-zip-multi/route.ts](../app/api/storage/download-zip-multi/route.ts) (the `select_all` / `items` metadata fetch)
  - [app/api/storage/list-records/route.ts](../app/api/storage/list-records/route.ts)
- Grant `select` on the new view to `service_role`, `anon`, `authenticated`.

**Out of scope** (do NOT touch in this PLAN)
- The download/ZIP logic, S3 listing, `download-file` route, or the S3 file layout — unchanged.
- Any new columns/filters in the UI (per-test counts, hz, scores, `event_id`). The view will *expose* them for a future PLAN, but the table UI stays as-is.
- `PatientTable` / `PatientRow` / `SearchFilters` visual changes.
- Retiring `gcp.py` or `public.user_record_summary`.
- The `selectedTest` keyword filter wiring (it is already not passed into `list-users`; leave that bug for a later plan).

## 4. Preflight checks

Run these before writing code; they confirm the assumptions this plan rests on.

```bash
# 1. Confirm the 3 (and only 3) server reads of the legacy view
grep -rn "user_record_with_users_and_storage" app/

# 2. Confirm the download route computes the S3 prefix from id/record_id (NOT storage_base_path)
grep -n "record_id\|storage_base_path\|Prefix" app/api/storage/download-zip-multi/route.ts

# 3. Confirm checkpd access pattern already in use
grep -rn "schema('checkpd')\|schema(\"checkpd\")" app/

# 4. In Supabase SQL editor — confirm checkpd.record_summary columns + row coverage
--   SELECT count(*) FROM checkpd.record_summary;          -- expect storage-eligible rows
--   SELECT count(*) FROM public.user_record_summary;      -- compare magnitude (see Edge case 1)
--   SELECT column_name FROM information_schema.columns
--     WHERE table_schema='checkpd' AND table_name='record_summary' ORDER BY 1;

# 5. Confirm whether record_id can be NULL in checkpd.record_summary (affects download prefix)
--   SELECT count(*) FROM checkpd.record_summary WHERE record_id IS NULL;
```

## 5. Data model

`checkpd.record_summary` PK is `(user_id, recorder)` (one row per recorder per user — same grain as `public.user_record_summary`). It FK-references `checkpd.users(id)`. The view bases on `record_summary` (LEFT JOIN users) so every listed row corresponds to a real record set with downloadable files.

**Column mapping** (legacy flat name the code reads ⟵ checkpd source):

| Code reads (legacy) | checkpd source | Notes |
|---|---|---|
| `id` | `rs.user_id` / `u.id` | download prefix + join key |
| `record_id` | `rs.record_id` | download prefix; may be NULL (Edge case 2) |
| `firstname` | `u.first_name` | search ilike |
| `lastname` | `u.last_name` | search ilike |
| `thaiid` | `u.thai_id` | search ilike |
| `province` | `u.province` | |
| `gender` | `u.gender` | |
| `area` | `u.area` | filter eq |
| `condition` | `rs.condition` | filter eq + download folder |
| `test_result` | `rs.test_result` | testStatus filter |
| `prediction_risk` | `rs.prediction_risk` | risk filter |
| `version` | `rs.version` | |
| `timestamp` | `u.user_timestamp` | |
| `last_update` | `rs.updated_at` | |
| `last_migrate` | `rs.last_migrate` | default ORDER BY desc |
| `effective_date` | `rs.last_record_at` | start/end date range filter |
| `event_id` *(new, exposed)* | `u.event_id` | for a future PLAN, not yet used by UI |

> `storage_base_path` is intentionally **dropped** — no code consumes it (download builds its own prefix; `list-records` selects it but does not use it — remove that column from the select).

### View DDL (final SQL at Codex's discretion; names are the contract)

```sql
CREATE OR REPLACE VIEW checkpd.user_record_storage_list AS
SELECT
  rs.user_id              AS id,
  rs.record_id            AS record_id,
  u.first_name            AS firstname,
  u.last_name             AS lastname,
  u.thai_id               AS thaiid,
  u.province              AS province,
  u.gender                AS gender,
  u.area                  AS area,
  rs.condition            AS condition,
  rs.test_result          AS test_result,
  rs.prediction_risk      AS prediction_risk,
  rs.version              AS version,
  u.user_timestamp        AS "timestamp",
  rs.updated_at           AS last_update,
  rs.last_migrate         AS last_migrate,
  rs.last_record_at       AS effective_date,
  u.event_id              AS event_id
FROM checkpd.record_summary rs
LEFT JOIN checkpd.users u ON u.id = rs.user_id;

-- Grants: checkpd objects do NOT inherit role grants (CLAUDE.md gotcha) → PostgREST 42501 without these
GRANT SELECT ON checkpd.user_record_storage_list TO service_role, anon, authenticated;
```

## 6. Fetch strategy

No shape change to the React layer. `buildPatientQuery` keeps building the same flat `.select(...)` / `.or(...)` / `.eq(...)` chain — only the source moves to the checkpd view via `.schema('checkpd')`:

```ts
// app/component/storage/buildPatientQuery.ts  (before)
let query = supabase
  .from('user_record_with_users_and_storage')
  .select(`id, record_id, firstname, lastname, thaiid, province, gender,
           condition, test_result, prediction_risk, version, timestamp,
           last_update, area, last_migrate, storage_base_path`, { count: 'exact' })

// (after) — same flat column names, new source, storage_base_path removed
let query = supabase
  .schema('checkpd')
  .from('user_record_storage_list')
  .select(`id, record_id, firstname, lastname, thaiid, province, gender,
           condition, test_result, prediction_risk, version, timestamp,
           last_update, area, last_migrate, effective_date`, { count: 'exact' })
```

Because the view aliases everything to the legacy names, the search `.or('firstname.ilike...')`, `effective_date` range filter, `last_migrate` order, and `.range()` pagination all work unchanged. The two other routes change identically: `.schema('checkpd').from('user_record_storage_list')`, and `list-records` drops `storage_base_path` from its `.select()`.

## 7. Files to create / modify

| File | Change |
|---|---|
| `docs/sql/checkpd_user_record_storage_list.sql` *(new)* | View DDL + grants from §5 (or apply directly in Supabase + paste into [app/pages/qa/checkpd_schema.sql](../app/pages/qa/checkpd_schema.sql) as the canonical source) |
| [app/component/storage/buildPatientQuery.ts](../app/component/storage/buildPatientQuery.ts) | `.schema('checkpd').from('user_record_storage_list')`; drop `storage_base_path` from select |
| [app/api/storage/download-zip-multi/route.ts](../app/api/storage/download-zip-multi/route.ts) | Both `supabaseServer.from('user_record_with_users_and_storage')` calls → `.schema('checkpd').from('user_record_storage_list')`. Logic unchanged (still selects `id, record_id, condition`) |
| [app/api/storage/list-records/route.ts](../app/api/storage/list-records/route.ts) | `.schema('checkpd').from('user_record_storage_list')`; drop `storage_base_path` from select |
| [app/component/storage/buildPatientQuery.ts](../app/component/storage/buildPatientQuery.ts) (Tests filter) | The `storage_base_path.ilike.%keyword%` block references a now-removed column — guard/remove it (it is already dead code: `selectedTest` is never passed into `list-users`). Leave the `selectedTest` field in `FilterParams` untouched |

No change to: `storageClient.tsx`, `PatientTable.tsx`, `PatientRow.tsx`, `SearchFilters.tsx`, `download-file/route.ts`, `lib/s3.ts`, `types.ts`.

## 8. Edge cases & rules

1. **Row coverage vs the legacy view.** The legacy public view may LEFT JOIN *from* `users` (surfacing users with no records). The new view bases *on* `record_summary`, so only users with a record-summary row (i.e. downloadable files) appear. This is intentional and more correct for a download screen — verify the count delta in preflight #4 is explained by record-less users, not by missing migration coverage. If `checkpd.record_summary` has materially fewer rows than `public.user_record_summary`, STOP and confirm the CheckPD backfill is complete before cutover.
2. **`record_id IS NULL`.** Download builds prefix `` `${id}/${record_id}/` ``; a NULL `record_id` yields a broken prefix. If preflight #5 finds NULLs, the listing still renders but those rows download nothing — acceptable for this PLAN (matches legacy behavior where empty path → no files), but note it for a follow-up.
3. **`condition` NULL.** Download already falls back to `"unknown"` folder; view passes `condition` through untouched. No change.
4. **Grants.** Without the `GRANT SELECT` the routes 500 with `42501 permission denied` (CLAUDE.md). Apply grants in the same migration as the view.
5. **PostgREST embedding not used.** We deliberately use a flat view (not `record_summary?select=*,users(*)`) so the existing `.or()/.ilike()` search on `firstname/lastname/thaiid` keeps working — PostgREST cannot `.or()` across an embedded resource cleanly.
6. **`db-max-rows` order rule** only affects `.update()/.delete()`; all storage reads are SELECT with explicit `.order('last_migrate')`, so unaffected.

## 9. Verification checklist

- [ ] `checkpd.user_record_storage_list` exists; `SELECT * ... LIMIT 5` returns the aliased columns.
- [ ] `GRANT SELECT` applied to `service_role`, `anon`, `authenticated` (test an anon PostgREST read returns rows, not 42501).
- [ ] `/pages/storage` table loads; counts (filtered + total) populate; pagination works.
- [ ] Search by firstname / lastname / thaiid / user-id returns expected rows.
- [ ] Condition / Area / Risk / Test-status filters + date range (`effective_date`) all filter server-side.
- [ ] Select rows (and "select all pages") → **Download** produces a ZIP with the same files as before for a known patient (proves S3 path still resolves from `id/record_id`).
- [ ] `list-records` (row expand) returns records for a user.
- [ ] No reference to `user_record_with_users_and_storage` remains in `app/` (grep clean).
- [ ] `npm run build` + `npm run lint` clean.

## 10. Out-of-scope follow-ups (seed next PLANs)

- **PLAN-0xx — Storage richer columns/filters:** surface `event_id`→event name, per-test done/risk badges, `tremor_resting_hz` / `dual_tap_*_score` / `questionnaire_total` columns; wire the `selectedTest` keyword filter into `list-users` (currently dropped).
- **PLAN-0xx — Drop legacy:** retire `gcp.py` cron + `public.user_record_summary` storage view once all readers are off it.
- **PLAN-0xx — Download from DB JSONB:** optional path to rebuild raw files from `checkpd.vibration/tap/pinch/questionnaire` JSONB if/when S3 mirroring stops.

## 11. Rollback plan

Confined to: revert the 3 route/query files to `.from('user_record_with_users_and_storage')` (re-add `storage_base_path` to the two selects). The new view is additive — `DROP VIEW checkpd.user_record_storage_list;` if desired. No data migration, no S3 change, so rollback is a pure code revert + optional view drop.
