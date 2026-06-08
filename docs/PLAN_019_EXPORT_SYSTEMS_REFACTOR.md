# PLAN-019 — Raw Data Access: unify the two export systems, add a chooser, componentize the export page

## Overview

"Raw Data Access" is served by **two separate pages** that grew independently and look nothing like
the rest of the console:

1. **`/pages/export`** ([app/pages/export/page.tsx](../app/pages/export/page.tsx)) — a 900-line client
   page that lists patient records, lets the operator select rows, and downloads a **ZIP of per-patient
   JSON test data + WAV files** (Firebase/Firestore-backed via `/api/export/*`). It renders its own
   header and "Sign Out" button and is **not** wrapped in `SidebarLayout`.
2. **`/pages/storage`** ([app/pages/storage/page.tsx](../app/pages/storage/page.tsx)) — a thin wrapper
   around `StorageClient` that downloads **raw sensor files from Supabase Storage**. It renders its own
   standalone header/footer and is **not** wrapped in `SidebarLayout` either.

The home menu has a single **"Raw Data Access"** tile ([app/pages/index/page.tsx](../app/pages/index/page.tsx#L76))
that jumps straight to `/pages/storage`, so the Firestore export page is effectively undiscoverable
from the menu.

This plan does four things:

1. Wrap **both** pages in `SidebarLayout` so they match every other module.
2. Turn the **"Raw Data Access"** tile into a **chooser**: clicking it asks the operator which system
   they want (Firestore ZIP export vs Supabase Storage files), then routes accordingly.
3. **Componentize** the export page — its single 900-line file is unmaintainable; split it into focused
   components + a hook + a pure ZIP-builder module.
4. **Stop using the `users_history_with_users` view** in the export page; read the same source the Users
   page uses — `user_record_summary_with_users` — keyed by `(user_id, record_id)`.

**Reason for change:** The two export surfaces are inconsistent with the rest of the app (no sidebar, no
shared auth/logout), one of them is unreachable from the menu, the export page is too large to safely
modify, and it reads from a second, undocumented view (`users_history_with_users`) that diverges from
the canonical Users-page data source. Consolidating onto `user_record_summary_with_users` makes the
export list match what operators already see on the Users page.

## Related plans

- [[PLAN-016]] — original Users-page Select & Export (CSV via `/api/export/users-csv`); established the
  `${user_id}||${record_id}` selection-key convention this plan keeps.
- [[PLAN-017]] — Users-page export scope/demographics; same `user_record_summary_with_users` source.
- [[PLAN-010]] — auth-request reduction: use `useSession()` and `signOutEverywhere`, do **not** add new
  `getSession()` calls. `SidebarLayout` already wires logout via `signOutEverywhere`.
- Client conventions: [[client-side-patterns-to-follow]] (SidebarLayout, TablePagination, logActivity).

## Scope

### In scope
- `SidebarLayout` wrapping for `/pages/export` and `/pages/storage`.
- A "Raw Data Access" chooser dialog on the home menu tile.
- Workspace sidebar "Raw Data Access" parent with sub-buttons for `Patient Records ZIP`
  (`/pages/export`) and `Storage Files` (`/pages/storage`).
- Refactor `/pages/export` into components + a hook + a pure ZIP module (behaviour-preserving).
- Switch the export list + select-all queries from `users_history_with_users` →
  `user_record_summary_with_users`.

### Out of scope
- The **ZIP export algorithm itself** (WAV download, folder naming, `/api/export/*` contract) — moved
  verbatim into a module, **not** rewritten. No behaviour change.
- `StorageClient` internals ([app/pages/storage/storageClient.tsx](../app/pages/storage/storageClient.tsx))
  — only the page chrome around it changes.
- The CSV export route (`/api/export/users-csv`) and the Users page — untouched.
- Dropping the `users_history_with_users` view from the database — this plan only stops the export page
  from *reading* it; deleting the view is a separate DB task.
- Pagination redesign — reuse the existing control (see Files table).

## Preflight checks

```bash
# 1. Confirm the two view column sets line up (export currently reads users_history_with_users;
#    target is user_record_summary_with_users). Both must expose:
#    id, record_id, recorder, thaiid, firstname, lastname, age, source, gender, region,
#    province, timestamp, last_update, prediction_risk, condition
grep -n "CREATE VIEW user_record_summary_with_users" -A 30 app/pages/users/users.sql

# 2. users_history_with_users is NOT defined in the repo (DB-only). Before cutover, compare row
#    coverage in the Supabase SQL editor — confirm every record the ZIP export needs still appears:
#    SELECT count(*) FROM users_history_with_users;
#    SELECT count(*) FROM user_record_summary_with_users;
#    SELECT count(*) AS missing_from_summary
#    FROM (
#      SELECT id, record_id FROM users_history_with_users
#      EXCEPT
#      SELECT id, record_id FROM user_record_summary_with_users
#    ) missing;
#    and spot-check that (id, record_id) pairs used for /api/export/:id?record_id= still resolve.
#    Do not cut over if missing_from_summary is non-zero without clinical/data-owner signoff.

# 3. Confirm SidebarLayout API + AppSidebar nav entries for these routes
grep -n "activePath\|mainClassName" app/component/layout/SidebarLayout.tsx
grep -n "/pages/storage\|/pages/export\|Raw Data" app/component/layout/AppSidebar.tsx

# 4. Confirm the selection-key + manual-export source already used
grep -n "getRecordKey\|user_record_summary_with_users\|users_history_with_users" app/pages/export/page.tsx
```

## Data model / Fetch strategy

The export list and select-all effects currently read `users_history_with_users`
([page.tsx:91](../app/pages/export/page.tsx#L91), [:136](../app/pages/export/page.tsx#L136)). Switch
both to `user_record_summary_with_users` — the same view the Users page paginates
([users/page.tsx:173](../app/pages/users/page.tsx#L173)). The query shape is otherwise identical
(search `.or(...)`, `timestamp` range, `condition` filter, `count: 'exact'`, `.range()`):

```ts
// before
supabase.from('users_history_with_users').select('*', { count: 'exact' })...
// after
supabase.from('user_record_summary_with_users').select('*', { count: 'exact' })...
```

- The selection key stays `getRecordKey(u) = `${u.id}||${u.record_id || ''}`` — i.e. demographics are
  keyed by **`(user_id, record_id)`**, matching the Users page and PLAN-016.
- The manual-export lookup already uses `user_record_summary_with_users`
  ([page.tsx:602](../app/pages/export/page.tsx#L602)) — leave as is (now consistent with the list).
- **Coverage risk:** `user_record_summary_with_users` is `users LEFT JOIN user_record_summary ON
  u.id = rs.user_id` (one row per `(user, record)` summary), whereas `users_history_with_users` may
  carry history rows. If the export list relied on history rows the summary view omits, surface it in
  preflight step 2 before cutover. The ZIP itself is fetched per `(id, record_id)` from `/api/export/*`,
  so as long as those pairs appear in the summary view, downloads are unaffected.

## UI structure

### Home tile → chooser dialog

The "Raw Data Access" tile no longer has a direct `path`; clicking it opens a dialog:

```
┌────────────────────────────────────────────┐
│  เลือกระบบข้อมูลดิบ (Raw Data Access)          │
│ ─────────────────────────────────────────── │
│  ┌────────────────────┐ ┌──────────────────┐ │
│  │ 📦 Patient Records │ │ 🗄️ Storage Files  │ │
│  │ JSON + เสียง (ZIP) │ │ ไฟล์เซ็นเซอร์ดิบ    │ │
│  │ Firestore export   │ │ Supabase Storage  │ │
│  │ → /pages/export    │ │ → /pages/storage  │ │
│  └────────────────────┘ └──────────────────┘ │
└────────────────────────────────────────────┘
```

Implement with the shadcn `Dialog` already used across the app. Keep all other tiles' click behaviour
(direct `router.push`) unchanged — only this tile opens the dialog. Model it as an optional
`onSelect`/`chooser` flag on the tile rather than hard-coding a path.

### Sidebar workspace sub-buttons

The workspace sidebar keeps one parent entry, **Raw Data Access**, and exposes two sub-buttons:

- `Patient Records ZIP` -> `/pages/export`
- `Storage Files` -> `/pages/storage`

Both child routes should keep the Raw Data Access parent visually active. When the sidebar is collapsed,
the parent button may route to the first visible child.

### Both pages wrapped in SidebarLayout

```tsx
// /pages/export and /pages/storage
return (
  <SidebarLayout activePath="/pages/storage" mainClassName="bg-gray-50">
    <div className="mx-auto max-w-9xl p-6">{/* page content */}</div>
  </SidebarLayout>
)
```

- Remove the export page's bespoke header **"Sign Out"** button + `handleLogout` (the sidebar owns
  logout via `signOutEverywhere`), and the manual `if (!session) return <AuthRedirect/>` (SidebarLayout
  already renders `AuthRedirect` when there is no session).
- Move the storage page's standalone header/footer copy **inside** the layout's content area.
- `activePath`: both modules live under the single "Raw Data Access" sidebar entry → point both at the
  entry's route (confirm in preflight step 3; if AppSidebar only knows `/pages/storage`, use that for
  both so the nav item highlights for either page).

### Export page component tree (after refactor)

```
app/pages/export/page.tsx                 ← thin orchestrator: SidebarLayout + hook + components
app/component/export/
  ManualExportBox.tsx                      ← manual user_id/record_id box (page.tsx:668–701)
  ExportFilters.tsx                        ← search / condition / date filters (page.tsx:703–781)
  ExportTable.tsx                          ← table + row checkboxes + select-all (page.tsx:790–889)
  ExportToolbar.tsx                        ← title + "Export Selected (n)" action + status messages
  useExportRecords.ts                      ← list fetch, select-all effect, pagination, selection state
lib/exportZip.ts                           ← pure: exportRecordsToZip + WavFile/ExportRecord/CsvResult
```

- `useExportRecords` owns: `users`, `allSelectedRecords`, `selectedUsers`, `selectAll`, filters,
  `currentPage`, `totalCount`, and the two fetch effects (now reading the summary view).
- `lib/exportZip.ts` exports `exportRecordsToZip(records, { onError, onSuccess, onProgress? })` (or
  returns a result object) so it no longer closes over component `setState`. **Copy the logic as-is** —
  WAV download, folder names, `/api/export/*` calls — only parameterize the side-effects.
- Reuse `TablePagination` from `@/app/component/users/Pagination` instead of the hand-rolled pagination
  block (page.tsx:891+), matching the Users/QA pages.

## Files to create / modify

| File | Change |
|------|--------|
| `app/pages/index/page.tsx` | "Raw Data Access" tile opens a chooser `Dialog` (Patient Records → `/pages/export`, Storage Files → `/pages/storage`) instead of pushing a path. |
| `app/pages/export/page.tsx` | Reduce to a `SidebarLayout` orchestrator wiring `useExportRecords` + the new components; drop bespoke header/Sign Out/`AuthRedirect`. |
| `app/component/export/ManualExportBox.tsx` *(new)* | Manual export input box + `handleManualExport`. |
| `app/component/export/ExportFilters.tsx` *(new)* | Search/condition/from/to filter controls. |
| `app/component/export/ExportTable.tsx` *(new)* | Records table, row checkboxes, select-all header. |
| `app/component/export/ExportToolbar.tsx` *(new)* | Title, "Export Selected (n)" button, error/success banners. |
| `app/component/export/useExportRecords.ts` *(new)* | List/select-all fetch (reads `user_record_summary_with_users`), pagination + selection state. |
| `lib/exportZip.ts` *(new)* | Pure `exportRecordsToZip` + the `WavFile`/`ExportRecord`/`CsvResult` types and `getRecordKey`/`formatToThaiTime` helpers. |
| `app/pages/storage/page.tsx` | Wrap content in `SidebarLayout`; move standalone header/footer inside; keep `<StorageClient/>`. |

## Edge cases & rules

1. **Behaviour-preserving refactor.** The ZIP contents, folder naming (`${userId}_${safeLastUpdate}_${firstName}_${lastName}`),
   WAV/JSON layout, and `/api/export/*` calls must be byte-for-byte unchanged. This plan moves code, it
   does not change the export format.
2. **Selection key unchanged.** Keep `getRecordKey = `${id}||${record_id || ''}``; select-all still
   fetches the full filtered set and stores it in `allSelectedRecords` for cross-page selection.
3. **View cutover is list-only.** Only the export *list* + *select-all* queries change view; the manual
   export already uses the summary view. Do not touch `/api/export/*`.
4. **Logout via the sidebar only.** Remove the page's own logout; never call `supabase.auth.signOut()`
   directly (use `signOutEverywhere`, already inside `SidebarLayout`). See [[client-side-patterns-to-follow]].
5. **`logActivity` on export.** Log a `DOWNLOAD`/`EXPORT` activity when a ZIP is generated
   (`page: 'export'`, `userEmail` from `useSession`) so `/pages/tracking` reflects raw-data pulls.
6. **Chooser only on that tile.** Other tiles keep direct navigation; the dialog is specific to "Raw
   Data Access". Guests never see it (the tile is already access-gated by `feature: "storage"`).
7. **`activePath` highlight.** `/pages/export` should highlight the `Patient Records ZIP` child and
   `/pages/storage` should highlight the `Storage Files` child under the single "Raw Data Access"
   workspace parent.

## Verification checklist

- [ ] Home "Raw Data Access" tile opens a dialog with two choices; each routes correctly.
- [ ] Workspace sidebar shows Raw Data Access sub-buttons for Patient Records ZIP and Storage Files.
- [ ] `/pages/export` and `/pages/storage` render inside `SidebarLayout` with working nav + logout.
- [ ] Export page no longer references `users_history_with_users`; list + select-all read
      `user_record_summary_with_users` and show the same rows the Users page does.
- [ ] Supabase SQL editor coverage check completed before cutover: `users_history_with_users` row count,
      `user_record_summary_with_users` row count, and `(id, record_id)` EXCEPT query show no unexpected
      missing ZIP-export records.
- [ ] Row count / coverage verified against the old view (preflight step 2) — no records silently lost.
- [ ] Select rows → "Export Selected (n)" produces an identical ZIP (JSON + WAV + folder names) to today.
- [ ] Select-all across filters still selects the full filtered set and exports it.
- [ ] Manual user_id/record_id export still works.
- [ ] Pagination (reused `TablePagination`) navigates correctly.
- [ ] `export/page.tsx` is a thin orchestrator; no single new file is unwieldy; no dead code.
- [ ] `logActivity` fires on export; no new `getSession()`/`auth.signOut()` calls introduced.
- [ ] `npm run lint` + `npm run build` clean.

## Out-of-scope follow-ups

- **PLAN-020** — Drop the `users_history_with_users` view from the database once nothing reads it; add
  the surviving view definitions to tracked SQL.
- **Storage page** — give `StorageClient` the same filter/pagination polish as the export table.
- **Unify** the export ZIP path and the CSV route under one "Export Center" once both use `SidebarLayout`.

## Rollback plan

Confined to:
- Revert `app/pages/index/page.tsx` tile to a direct `path: "/pages/storage"`.
- Restore `app/pages/export/page.tsx` from git (single-file version) and delete `app/component/export/*`
  + `lib/exportZip.ts`.
- Revert `app/pages/storage/page.tsx` chrome.

No DB or `/api/export/*` changes are made, so rollback is purely front-end file reverts.
