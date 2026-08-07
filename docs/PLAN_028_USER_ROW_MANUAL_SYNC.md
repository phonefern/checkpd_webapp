# PLAN-028 — Per-row manual "Sync now" on the Users page

## Overview

The Users page (`/pages/users`) reads `public.users` / `public.user_record_summary`,
mirrored from Firestore (`users` + `temps` collections) by a scheduled batch job
(`app/pages/users/functions.py`, deployed as a Cloud Run **Job**, triggered outside
the webapp by cron/scheduler).

Two situations leave a specific person's Supabase row stale until the next scheduled
run: the cron's incremental window (`since=<last checkpoint>`) missing them, or
someone editing their Firestore doc *after* the last sync. The old global "Sync
Demographic" button re-executed the whole Cloud Run Job via local/server `gcloud`,
which is not suitable for Vercel and gave no per-record feedback, so it has been
removed from the Users page.

**This plan adds a per-row "Sync now" action** that re-pulls exactly one person's
Firestore doc into Supabase synchronously, with immediate pass/fail feedback in
the UI.

**Reason for change:** "ผมอยากทำให้หน้า users pages นี้สามารถมีปุ่มกดเพื่อ migrate
รายบุคคลได้ กรณี cron job ดึงข้อมูลจาก firestore มา supabase ไม่ครบหรือ firebase
เกิดการแก้ไข ครับซึ่งผมอยากทำให้ข้อมูลเป็นปัจจุบันล่าสุด"

## Key design decision: Next.js does the single-row sync directly

Cloud Run Jobs remain the right shape for the scheduled/full batch sync, but they
are the wrong shape for a webapp button because the UI needs a synchronous
request/response result and Vercel should not depend on an interactive `gcloud`
login session.

This repo already has both server-side pieces needed for one-person sync:

1. Firebase Admin in [`lib/firebaseAdmin.ts`](../lib/firebaseAdmin.ts), which can
   read Firestore `users` / `temps` documents and their `records` subcollections.
2. Supabase service-role access in [`lib/supabase-server.ts`](../lib/supabase-server.ts),
   which can upsert `public.users` and `public.user_record_summary`.

So the single-row path is implemented fully inside the Next.js API route:

1. `POST /api/users/demographic-migration/migrate-user` receives `{ userId }`.
2. The route auth-gates with `requireUsersPageAccess`.
3. It tries the likely Firestore collection first (`temps` for numeric ids,
   otherwise `users`), then falls back to the other collection.
4. It upserts the demographic row into `public.users`.
5. It reads that person's `records`, groups by `recorder`, picks the best record
   per recorder (`prediction.risk` present > prediction present > most recent),
   counts test fields, and upserts `public.user_record_summary`.
6. It returns `{ status: "ok", user_id, kind, summaries_updated }` directly to
   the UI.

## What's implemented in this repo (done)

| File | Change |
|------|--------|
| `lib/users-page-access.ts` *(new)* | `requireUsersPageAccess(request)` — same pattern as `lib/thai-id-card-access.ts`: bearer token → `supabase.auth.getUser()` → `canAccessFeature(role, "users")`. Reused instead of copy-pasting a third auth helper. |
| `app/api/users/demographic-migration/migrate-user/route.ts` *(new)* | `POST { userId }` → reads the Firestore doc via Firebase Admin (`users`/`temps` with fallback) → upserts `public.users` and `public.user_record_summary` through Supabase service role → returns the per-row result directly. Auth-gated with `requireUsersPageAccess`. |
| `app/component/users/UserActionsMenu.tsx` | New "Sync now" item (`RefreshCw` icon, spins + disables while in flight) next to Detail/Edit/Print. Purely additive — `onSync` is an optional prop, so the menu still renders fine anywhere it's used without it. |
| `app/component/users/UserTable.tsx` | Threads `onSync` / `syncingUserId` down to `UserActionsMenu` in both the desktop table row and the mobile card. |
| `app/pages/users/page.tsx` | `handleSyncUser(user)`: grabs the bearer token from `useSession()`, POSTs to the new route, shows a result banner, calls `logActivity`, and refetches the table on success. The old global "Sync Demographic" button/dialog was removed. |
| `app/component/users/SearchFilters.tsx` | Removed the global "Sync Demographic" footer action so the webapp no longer triggers Cloud Run via `gcloud`. |
| `app/api/users/demographic-migration/trigger-job/route.ts` | Deleted. The webapp no longer exposes a `gcloud run jobs execute` trigger endpoint. |

## Deployment prerequisites

No new Cloud Run service or single-user GCP job is required.

The Next.js runtime that serves this API route must already have:

- Firebase Admin credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
  `FIREBASE_PRIVATE_KEY`, etc.) so `lib/firebaseAdmin.ts` can read Firestore.
- `SUPABASE_SERVICE_ROLE_KEY`, because the route writes server-side to
  `public.users` and `public.user_record_summary`.

If `SUPABASE_SERVICE_ROLE_KEY` is missing, the route returns a clear 500 error.

## Edge cases & rules

1. **`kind` inference can be wrong** if a future id format changes, so the route
   only uses id shape to decide which Firestore collection to try first. It
   always falls back to the other collection before returning "not found."
2. **Firestore doc has zero records.** The route still upserts the
   `users` row (demographics) and returns `summaries_updated: 0` — no error,
   since a brand-new registrant legitimately has no records yet.
3. **Retry semantics**: every write is `ON CONFLICT ... DO UPDATE`, so clicking
   "Sync now" twice (or the button double-firing) is safe — same idempotency
   the batch job already relies on.
4. **Very large record subcollections** can make the request slower, but this is
   expected to be rare because the action is per person and operator-triggered.

## Verification checklist

- [ ] Next.js deployment has Firebase Admin env vars and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `/pages/users` "Sync now" on a known-stale row updates that row's data
      after clicking.
- [ ] `curl -X POST /api/users/demographic-migration/migrate-user` without a
      bearer token returns 401.
- [ ] Non-admin/non-users-feature role gets 401/403 from `migrate-user` (test
      via `curl` without a valid token, or with a role lacking `"users"`).
- [ ] Missing `SUPABASE_SERVICE_ROLE_KEY` returns the explicit service-role
      error instead of silently writing through anon access.
- [ ] `npm run build` / `tsc --noEmit` clean.

## Rollback plan

Confined to:
- Revert `UserActionsMenu.tsx`, `UserTable.tsx`, `app/pages/users/page.tsx` to
  drop the "Sync now" UI (all changes are additive/optional props).
- Re-add a protected bulk trigger endpoint only if the product decision changes.
- Delete `app/api/users/demographic-migration/migrate-user/route.ts` and
  `lib/users-page-access.ts`.
- No schema changes were made; nothing to reverse in Supabase.

## Out-of-scope follow-ups

- **Bulk "sync selected rows"** — this plan is single-row only; a multi-select
  version would loop the same endpoint client-side or need a small batching
  endpoint to avoid N sequential round-trips.
- **Show "last synced at" per row** so staff can see staleness before deciding
  to sync, instead of syncing speculatively.
