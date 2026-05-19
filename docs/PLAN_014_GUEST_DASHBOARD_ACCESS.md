# PLAN-014: Guest access to the public dashboard

## Overview

Add a **guest** mode to the login page so a visitor can view the CheckPD dashboard (`/pages/index`) without an admin account. Guests must be confined to that one page: every other `/pages/*` route — even when accessed by typing the URL directly — must redirect them back to the dashboard.

The dashboard already shows only aggregate statistics (no patient-level PII), so it is safe to expose to non-clinical viewers. All other routes (`/pages/users`, `/pages/qa`, `/pages/papers`, `/pages/storage`, `/pages/admin`, `/pages/pdf`, `/pages/tracking`, `/pages/export`, `/pages/event`, `/pages/log`) contain identifiable patient data and **must not** be reachable by guests under any circumstance.

**Recommended mechanism**: Supabase **Anonymous Sign-In** (`supabase.auth.signInAnonymously()`). This gives the guest a real `authenticated` JWT — RLS rules work as-is, the existing `SessionProvider` sees a real session, the existing middleware cookie check works without modification. Combine it with a small marker cookie (`chulapd-guest=1`) so middleware can gate non-dashboard routes without decoding JWTs.

**Reason for change.** Recruiting/demo/research stakeholders want a public-facing landing page for the CheckPD numbers (downloads, screening risk distribution, geography). Right now the only entry point is the admin login; non-admins are turned away even though the dashboard reveals nothing sensitive. Adding a guest path lets us share `chulapd.org` (per PLAN-011) for outreach without provisioning admin accounts.

**Related plans**:
- PLAN-010 — auth request reduction. This plan must preserve its rule: no `supabase.auth.getSession()` from components, no admin_users lookup from middleware.
- PLAN-011 — custom domain. Guest landing is the natural front door once `app.chulapd.org` is live.
- PLAN-012 / PLAN-013 — dashboard the guest can see. Nothing on those pages exposes PII, so no redaction is needed for guest mode.

---

## Approaches considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Supabase Anonymous Sign-In** + marker cookie | Real `authenticated` JWT (RLS unchanged), uses existing middleware cookie check, simple `is_anonymous` discriminator | Each guest consumes one anonymous user slot in Supabase Auth (small cost), must enable feature in project settings | ✅ **Recommended** |
| Cookie-only guest (no Supabase session) | Zero auth API calls per guest | Supabase client has no JWT → queries run as `anon` role; must audit/loosen RLS on every dashboard table; mixes "logged-out" with "guest" semantically | ❌ Rejected — RLS audit is the larger risk |
| Shared "guest" admin_users row | Reuses existing access flow | One real auth user impersonated by everyone; activity logs collide; revoking is awkward | ❌ Rejected — operational mess |

The recommended approach is **invariant-preserving**: the rest of the codebase keeps assuming "if session exists, user is authenticated and RLS applies." We just narrow which features `useAccessProfile` returns for anonymous sessions.

---

## Scope

### In scope
1. Add `"guest"` to `AppRole` union and `ROLE_ACCESS` in [`lib/access.ts`](../lib/access.ts) with `["dashboard"]` as the only allowed feature.
2. Teach `getAccessProfile` to short-circuit when `session.user.is_anonymous === true` — return a guest profile without querying `admin_users`.
3. Add a "เข้าใช้แบบผู้เยี่ยมชม" button on [`app/pages/login/page.tsx`](../app/pages/login/page.tsx) that calls `supabase.auth.signInAnonymously()`, sets the `chulapd-guest=1` marker cookie, and navigates to `/pages/index`.
4. Update [`middleware.ts`](../middleware.ts) to read the marker cookie and **redirect guests** to `/pages/index` on any non-dashboard path under `/pages/*`.
5. [`app/component/layout/AppSidebar.tsx`](../app/component/layout/AppSidebar.tsx) — already filters by `canAccessFeature`, so adding `"guest"` to roles automatically hides everything but Dashboard. Add a "เข้าสู่ระบบ" CTA in place of the user info block when role is `guest`.
6. Show a subtle banner at the top of [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) when `role === "guest"`: "คุณกำลังดูในโหมดผู้เยี่ยมชม · เข้าสู่ระบบเพื่อเข้าถึงข้อมูลผู้ป่วย".
7. Logout flow for guest = `supabase.auth.signOut()` + delete the marker cookie + redirect to `/pages/login`.

### Out of scope
- **Redacting dashboard content for guests.** Current dashboard is aggregate-only (no PII). If a future widget exposes individual patients, that PR must add a guest-redaction step.
- **Rate-limiting guests** (e.g. CAPTCHA, IP throttling). Defer until abuse is observed. Supabase Anonymous Sign-In has its own rate limits.
- **Persisting guest preferences** across sessions. Each guest session is ephemeral; on logout/expiry, all state is gone.
- **Server-side gating for `/pages/index`.** The dashboard is intentionally open to guests; no server check needed beyond middleware's cookie presence.
- **Page-level role enforcement on protected pages.** Middleware handles URL gating; pages already render `<AuthRedirect />` if no session. We accept that a guest visiting `/pages/users` is bounced by middleware before the page mounts; we don't add a second client-side check there.
- **Server Components / SSR.** All current pages are `'use client'`. This plan stays client-side.
- **Visitor analytics / counters** (e.g. "X guests viewed today"). Out of scope.

---

## Preflight checks (run before coding)

```bash
# 1. Verify Supabase Anonymous Sign-In is enabled in the project.
#    Dashboard path: Authentication → Providers → Anonymous Sign-In → "Enable"
#    If disabled, this plan cannot proceed.

# 2. Confirm middleware is the slim cookie-presence version from PLAN-010.
grep -n "hasSupabaseAuthCookie\|getSession" middleware.ts
# Expected: hasSupabaseAuthCookie present, no getSession call.

# 3. Confirm SessionProvider exists and is the single getSession owner.
grep -rn "supabase.auth.getSession" app/ components/
# Expected: only app/providers/SessionProvider.tsx and app/pages/login/page.tsx.

# 4. Confirm AppRole and ROLE_ACCESS shape.
grep -n "AppRole\|ROLE_ACCESS" lib/access.ts

# 5. Confirm `is_anonymous` is exposed by the installed supabase-js version.
#    Supported in @supabase/supabase-js >= 2.43.0
grep -n '"@supabase/supabase-js"' package.json
# Expected: ^2.53.0 (already installed) — supports is_anonymous.

# 6. Identify protected pages that already render <AuthRedirect /> (these stay correct;
#    middleware will redirect guests before they mount, AuthRedirect is the fallback).
grep -rn "AuthRedirect" app/pages/
```

---

## Phase 1 — `lib/access.ts`: add the `guest` role

File: [`lib/access.ts`](../lib/access.ts)

### Changes

```ts
// 1. Extend the AppRole union
export type AppRole = "super_admin" | "admin" | "doctor" | "medical_staff" | "guest";

// 2. Extend APP_ROLES
export const APP_ROLES: AppRole[] = ["super_admin", "admin", "doctor", "medical_staff", "guest"];

// 3. Extend APP_ROLE_LABELS
export const APP_ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  medical_staff: "Medical Staff",
  guest: "ผู้เยี่ยมชม",
};

// 4. Extend ROLE_ACCESS — dashboard ONLY
export const ROLE_ACCESS: Record<AppRole, AppFeature[]> = {
  super_admin: [...existing...],
  admin: [...existing...],
  doctor: [...existing...],
  medical_staff: [...existing...],
  guest: ["dashboard"],
};

// 5. Add a discriminator for source
export type AccessSource = "admin_users" | "metadata" | "guest" | "none";
```

### `getAccessProfile` — short-circuit for anonymous sessions

```ts
export async function getAccessProfile(
  supabase: SupabaseClient,
  session: Session | null
): Promise<AccessProfile> {
  if (!session) {
    return { email: null, role: null, isActive: false, allowedFeatures: [], source: "none", debugError: null };
  }

  // NEW: anonymous (guest) session — skip admin_users lookup entirely.
  if (session.user.is_anonymous === true) {
    return {
      email: null,
      role: "guest",
      isActive: true,
      allowedFeatures: ROLE_ACCESS.guest,
      source: "guest",
      debugError: null,
    };
  }

  // ...existing admin_users + metadata fallback logic unchanged...
}
```

**Why short-circuit**: anonymous users cannot have an `admin_users` row, the query would always return empty, and we'd pay the round-trip on every silent token refresh. Returning synchronously also keeps `useAccessProfile` instant for guests.

---

## Phase 2 — Login page: guest button + Supabase Anonymous Sign-In

File: [`app/pages/login/page.tsx`](../app/pages/login/page.tsx)

### Changes

Add a secondary button below the existing "Sign in" button:

```tsx
const handleGuestEnter = async () => {
  setLoading(true)
  setError('')
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) { setError(error.message); return }

    // Marker cookie so middleware can identify guest sessions without decoding the JWT.
    // 24-hour expiry; not HttpOnly (we need to read/clear from client).
    document.cookie = `chulapd-guest=1; path=/; max-age=${60 * 60 * 24}; samesite=lax`

    logActivity({
      action: 'LOGIN',
      page: 'auth',
      description: `เข้าใช้แบบผู้เยี่ยมชม (anonymous: ${data.user?.id ?? 'unknown'})`,
      userEmail: 'guest@checkpd.local',
    })

    window.location.href = '/pages/index'
  } catch {
    setError('ไม่สามารถเข้าใช้แบบผู้เยี่ยมชมได้')
  } finally {
    setLoading(false)
  }
}
```

```tsx
{/* Below the "Sign in" submit button */}
<div className="relative my-2">
  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
  <div className="relative flex justify-center text-xs"><span className="bg-gray-50 px-2 text-gray-500">หรือ</span></div>
</div>

<button
  type="button"
  onClick={handleGuestEnter}
  disabled={loading}
  className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
>
  เข้าใช้แบบผู้เยี่ยมชม · ดูเฉพาะแดชบอร์ด
</button>
<p className="text-center text-xs text-gray-500 mt-2">
  สำหรับการดูภาพรวมข้อมูล CheckPD เท่านั้น
</p>
```

**Important**: Do NOT redirect anonymous users through `getAccessProfile` and then `getDefaultAuthorizedPath`. Hardcode `/pages/index` for guests — it's the only allowed route and we already know that statically.

---

## Phase 3 — Middleware: URL guard for guests

File: [`middleware.ts`](../middleware.ts)

The middleware currently does cookie-presence only. Add a thin guest-gate that runs ONLY when the guest marker cookie is present.

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/pages/login"]);

// Paths a guest is allowed to view. Keep tight — if anything is added here,
// the page must self-redact for guests.
const GUEST_ALLOWED_PATHS = new Set(["/pages/index"]);

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

function isGuest(request: NextRequest): boolean {
  return request.cookies.get("chulapd-guest")?.value === "1";
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = hasSupabaseAuthCookie(request);
  const guest = isGuest(request);

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL(guest ? "/pages/index" : "/pages/index", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/pages/login", request.url));
  }

  // Guests get URL-level gating: only GUEST_ALLOWED_PATHS are reachable.
  if (guest && !GUEST_ALLOWED_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/pages/index", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/pages/:path*"] };
```

**Why a marker cookie and not the JWT**: middleware must stay synchronous and free of Supabase API calls (PLAN-010 invariant). Decoding the JWT to read `is_anonymous` would require a JWT library and the project's JWT secret. A separate cookie set at sign-in is cheaper and easier to reason about.

**Trust model**: the marker cookie is client-visible and forgeable. That's OK — a non-guest user setting `chulapd-guest=1` only **restricts** themselves to the dashboard. They cannot use it to gain access they don't already have. The cookie is a hint, not a credential.

### Edge case — guest deleting their cookie manually

If a guest manually deletes `chulapd-guest=1` but keeps their `sb-*-auth-token`, they would (per the current middleware) pass the cookie check. They still cannot view restricted pages because **`useAccessProfile` returns `role: "guest"`** based on `session.user.is_anonymous`. The protected pages won't render meaningful UI for them — but they'll see broken/empty admin screens. Acceptable for v1; a future hardening pass can convert page guards to use `useAccessProfile` directly.

---

## Phase 4 — Sidebar: guest CTA

File: [`app/component/layout/AppSidebar.tsx`](../app/component/layout/AppSidebar.tsx)

The sidebar already calls `canAccessFeature(role, feature)` to filter `mainItems` + `workspaceItems`. Adding `"guest"` to roles automatically hides everything except Dashboard.

Add a "Sign in" CTA in place of the user info block when `role === "guest"`:

```tsx
{role === "guest" ? (
  <button
    onClick={() => onNavigate("/pages/login")}
    className="..."
  >
    <LogIn className="h-4 w-4" />
    เข้าสู่ระบบเพื่อเข้าถึงข้อมูลผู้ป่วย
  </button>
) : (
  <ExistingUserBlock ... />
)}
```

`onLogout` for guests should still work — `supabase.auth.signOut()` ends the anonymous session, the existing handler then needs to also clear the marker cookie. Add to the logout handler in [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) and anywhere else that calls signOut:

```ts
const handleLogout = async () => {
  await supabase.auth.signOut()
  document.cookie = "chulapd-guest=; path=/; max-age=0"
  window.location.href = "/pages/login"
}
```

To avoid drift, extract a small helper:

```ts
// lib/auth.ts (new)
export async function signOutEverywhere(supabase: SupabaseClient) {
  await supabase.auth.signOut()
  document.cookie = "chulapd-guest=; path=/; max-age=0"
}
```

Then every existing `supabase.auth.signOut()` call site uses `signOutEverywhere` instead.

---

## Phase 5 — Dashboard banner

File: [`app/pages/index/page.tsx`](../app/pages/index/page.tsx)

After the header, add a guest banner. Use `useAccessProfile` (already used in the codebase) to detect role:

```tsx
const { accessProfile } = useAccessProfile(session)
const isGuest = accessProfile.role === "guest"

{isGuest && (
  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
    <Eye className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" strokeWidth={2} />
    <div className="text-sm">
      <p className="font-medium text-amber-900">คุณกำลังดูในโหมดผู้เยี่ยมชม</p>
      <p className="mt-0.5 text-amber-800/80">
        เห็นเฉพาะภาพรวมแบบรวมยอด · ไม่สามารถเข้าถึงข้อมูลผู้ป่วยรายบุคคลได้
      </p>
    </div>
    <button
      onClick={() => router.push("/pages/login")}
      className="ml-auto rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
    >
      เข้าสู่ระบบ
    </button>
  </div>
)}
```

The dashboard widgets themselves do not need redaction — they are aggregate-only.

---

## Phase 6 — Verify RLS still works for anonymous sessions

Anonymous users have an `authenticated` JWT role in Postgres but `auth.uid()` returns a real (anonymous) UUID. If any RLS policy uses `auth.jwt()->>'sub'` to allow only specific UUIDs (e.g. admin user IDs), guests will be denied.

Audit RLS for the three dashboard tables:

```sql
-- Run in Supabase SQL editor
SELECT polname, polcmd, polqual, polwithcheck
  FROM pg_policy
  JOIN pg_class ON pg_class.oid = pg_policy.polrelid
  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  WHERE pg_namespace.nspname || '.' || pg_class.relname IN (
    'checkpd.users',
    'checkpd.record_summary'
  );

-- And for the public views the dashboard reads:
SELECT viewname, definition
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('user_record_summary_with_users', 'checkpd_user_risk');
```

Expected: the policies allow any `authenticated` role to SELECT. If they instead require `email IS NOT NULL` or specific admin UUIDs, add a policy:

```sql
CREATE POLICY "anon-and-authenticated-can-read"
  ON checkpd.record_summary
  FOR SELECT
  TO authenticated
  USING (true);
-- Repeat for checkpd.users if needed.
```

**Don't grant to `anon` role** — only `authenticated`. Anonymous users still authenticate via JWT, so they qualify.

---

## Files to create / modify

| File | Change |
|------|--------|
| [`lib/access.ts`](../lib/access.ts) | Add `guest` to `AppRole`/`APP_ROLES`/`APP_ROLE_LABELS`/`ROLE_ACCESS`; extend `AccessSource`; short-circuit `getAccessProfile` on `is_anonymous`. |
| [`app/pages/login/page.tsx`](../app/pages/login/page.tsx) | Add `handleGuestEnter`; render guest button + divider; set marker cookie. |
| [`middleware.ts`](../middleware.ts) | Add `GUEST_ALLOWED_PATHS` and guest-gate before `NextResponse.next()`. |
| [`app/component/layout/AppSidebar.tsx`](../app/component/layout/AppSidebar.tsx) | Replace user info block with sign-in CTA when `role === "guest"`. |
| [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) | Render guest banner; use `signOutEverywhere` helper in logout handler. |
| `lib/auth.ts` *(new)* | Export `signOutEverywhere(supabase)` — `auth.signOut()` + clear marker cookie. |
| Every other call site of `supabase.auth.signOut()` (use `grep -rn "supabase.auth.signOut"` to find them) | Replace with `signOutEverywhere(supabase)` to avoid stale guest cookies. |

No schema migration. No new dependency. No env-var changes (but **does** require enabling Anonymous Sign-In in the Supabase dashboard — that's a runtime config flip, not a code change).

---

## Edge cases & rules

1. **Anonymous user gets converted to a real user** — Supabase supports `updateUser({ email })` to upgrade anonymous → real. v1 does not expose this; if a guest wants an account they must log in fresh. Document for future.
2. **Guest opens multiple tabs** — same anonymous session shared via cookies. Logging out in one tab clears the cookie; other tabs will redirect to login on next navigation. Acceptable.
3. **Guest session expires** — Supabase access tokens expire (~1h). The refresh token rotates silently via `onAuthStateChange`. If the refresh fails (network, server-side revocation), `useSession` returns `null` and `<AuthRedirect />` bounces to `/pages/login`. Guests will need to click "เข้าใช้แบบผู้เยี่ยมชม" again.
4. **Anonymous Sign-In disabled in Supabase** — `signInAnonymously()` returns an `AuthError`. Show the error to the user with a hint to contact the admin. Do NOT swallow silently.
5. **Marker cookie collision with logged-in admin** — if an admin had a stale `chulapd-guest=1` cookie (e.g. they used guest first, then logged in without clearing), middleware would wrongly restrict them. The `signOutEverywhere` helper clears it on every logout, and Phase 2's `handleLogin` should also clear it on real sign-in to be safe:
   ```ts
   document.cookie = "chulapd-guest=; path=/; max-age=0"
   ```
   Add this line to `handleLogin` right after a successful `signInWithPassword`.
6. **Activity log noise** — every guest login writes a `LOGIN` row to the activity log via `logActivity`. If this becomes noisy, add a `userType: 'guest'` field to filter them out in the tracking dashboard. Not in scope for v1.
7. **Anonymous user accumulation** — Supabase keeps anonymous users until you purge them. Add a scheduled `DELETE FROM auth.users WHERE is_anonymous = true AND created_at < now() - interval '7 days'` if storage becomes a concern. Out of scope for v1.

---

## Verification checklist

- [ ] Anonymous Sign-In enabled in Supabase project settings.
- [ ] Click "เข้าใช้แบบผู้เยี่ยมชม" on `/pages/login` → land on `/pages/index` with the dashboard rendered.
- [ ] Marker cookie `chulapd-guest=1` is set (DevTools → Application → Cookies).
- [ ] Sidebar shows ONLY the Dashboard item; "เข้าสู่ระบบ" CTA replaces the user block.
- [ ] Typing `/pages/users` in the URL bar redirects to `/pages/index`.
- [ ] Same for `/pages/qa`, `/pages/papers`, `/pages/storage`, `/pages/admin`, `/pages/pdf`, `/pages/tracking`, `/pages/export`, `/pages/event`, `/pages/log`.
- [ ] Browser back/forward across protected pages also bounces to `/pages/index`.
- [ ] Guest banner is visible at the top of the dashboard.
- [ ] Logout clears both `sb-*-auth-token` and `chulapd-guest` cookies; redirect lands on `/pages/login`.
- [ ] Real admin login after a previous guest session works correctly — sidebar shows full menu, no guest restrictions.
- [ ] Real admin login on a session where `chulapd-guest=1` cookie was manually set → `handleLogin` clears the cookie; admin gets full access.
- [ ] Dashboard queries (`checkpd.users`, `user_record_summary_with_users`, `checkpd_user_risk`) return data for the guest session (RLS allows `authenticated`).
- [ ] No `console.error` in the browser during a guest session.

---

## Rollback plan

Two-step rollback:

1. **Code rollback** — revert this PR. Anonymous sessions still in flight will start failing access checks on next page mount; they'll be redirected to `/pages/login`. No data loss.
2. **Supabase setting** — disabling Anonymous Sign-In in the project dashboard prevents new guest sessions immediately. Existing sessions expire within ~1h.

Optional cleanup of accumulated anonymous users:
```sql
DELETE FROM auth.users WHERE is_anonymous = true;
```

No schema migration to undo. No data to restore.

---

## Out-of-scope follow-ups

- **PLAN-015 (suggested)**: Guest-to-real account upgrade flow (`supabase.auth.updateUser({ email, password })`) so a guest can preserve their session if they decide to register.
- **PLAN-016 (suggested)**: Server-side role gating with Server Components (defence-in-depth on top of middleware). Bumped from PLAN-010's Phase 6.
- **PLAN-017 (suggested)**: Public-facing layout for `/pages/index` when accessed by a guest — different header, different CTA, no admin chrome. Currently we reuse the admin chrome with a CTA swap; a dedicated layout would be cleaner.
- **PLAN-018 (suggested)**: Anonymous user purge schedule (cron job to delete `auth.users WHERE is_anonymous AND created_at < now() - interval '7 days'`).
- **PLAN-019 (suggested)**: Page-level role guards in addition to middleware. Centralize behind a `<RequireFeature feature="users">` wrapper that uses `useAccessProfile` and renders `null` + `router.replace('/pages/index')` when denied. Belt-and-suspenders on top of middleware.
