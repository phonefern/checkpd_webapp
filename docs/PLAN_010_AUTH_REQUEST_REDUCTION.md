# PLAN-010: Reduce Supabase Auth requests and stop spurious logout-to-login redirects

## Overview

Supabase Auth shows **19,000+ requests/month** despite having only ~10 active admin users. Users also report being kicked back to `/pages/login` while actively using the app. Both symptoms share the same root cause: every page navigation, prefetch, and RSC fetch currently triggers `supabase.auth.getSession()` plus an `admin_users` table lookup, and any transient failure of that call deletes the auth cookies — which forces a re-login on the next request.

This plan reduces auth traffic to roughly **1 request per real navigation** (plus token refreshes) and removes the destructive cookie-clearing path.

**Reason for change.** Today the system fans out `getSession()` along three independent axes per page view:
1. `middleware.ts` runs on every request matching `/pages/:path*` (including RSC payload fetches and `router.prefetch` calls). Each run calls `getSession()` **and** queries `admin_users`.
2. `app/component/layout/AppSidebar.tsx` calls `router.prefetch(item.path)` for **every** sidebar link on mount (~7 links). Each prefetch re-triggers middleware → +7 `getSession` + 7 admin_users queries per page mount.
3. Many client components (`SidebarLayout`, `AuthRedirect`, `useAccessProfile`, plus per-page components in `qa`, `papers`, `export`, `admin`, `index`, and 8 PD form components) each call `getSession()` independently in their own `useEffect`. There is no shared session context.

A single page open today produces ~15-20 auth API hits. With 10 users opening the app multiple times per day, this trivially reaches the observed 19k/month.

The "kicked to login while using the app" bug comes from `middleware.ts` lines 22-29:
```ts
try {
  const { data } = await supabase.auth.getSession();
  ...
} catch (error) {
  console.warn("middleware getSession failed:", error);
  clearSupabaseAuthCookies(request, response);   // ← destroys session on transient error
  return { session: null, ... };
}
```
With 7 concurrent prefetches racing the same refresh-token rotation, transient `AuthApiError` is common, and every catch wipes the cookies — forcing the next request to redirect to login.

**Related plans**: none. This is an infra/reliability change with no schema or UX surface impact.

---

## Scope

### In scope
1. Make middleware **cheap and safe**:
   - Use cookie-presence check (no `getSession()` API call) for the unauthenticated/redirect-to-login decision.
   - Move `admin_users` role lookup out of middleware entirely.
   - Remove the `clearSupabaseAuthCookies` call from the catch branch.
2. Add a single client-side **`SessionProvider`** that owns `getSession()` + `onAuthStateChange` once for the whole app, plus an `useSession()` hook.
3. Refactor all components that currently call `supabase.auth.getSession()` in `useEffect` to consume `useSession()` instead.
4. Refactor `useAccessProfile` to fetch `admin_users` **once per session** (cached on session change), not per-component-mount.
5. Remove the manual `router.prefetch` loop in `AppSidebar.tsx`. Rely on Next.js's automatic in-viewport prefetch (or use `<Link>` with `prefetch={false}` for sidebar items if we want to opt out entirely).
6. Verify `middleware.ts` `matcher` excludes static asset paths (it already does via the `/pages/:path*` prefix; document this).

### Out of scope
- Migration from `@supabase/auth-helpers-nextjs` to `@supabase/ssr`. The helpers package is deprecated upstream but still functional; migration is a separate, larger plan (PLAN-011 candidate).
- Changing role/feature access rules (`lib/access.ts` `ROLE_ACCESS`).
- Changing the login page UX or `signInWithPassword` flow.
- Server-side API route auth (the per-route `getSession()` inside `app/api/*` routes is correct — those run once per HTTP request, not per render).

---

## Preflight checks (run before coding)

```bash
# 1. Confirm full inventory of getSession callers (should match the list this plan refactors)
grep -rn "supabase.auth.getSession" app/ components/ lib/ middleware.ts

# 2. Confirm onAuthStateChange callers (these become consumers of SessionProvider)
grep -rn "onAuthStateChange" app/ components/

# 3. Confirm admin_users is queried only from access.ts and middleware.ts
grep -rn '"admin_users"\|from.*admin_users' app/ components/ lib/ middleware.ts

# 4. Confirm AppSidebar's prefetch loop still exists at the cited line
grep -n "router.prefetch" app/component/layout/AppSidebar.tsx
```

Expected callers of `getSession()` to refactor (verify against grep output before editing):
- `middleware.ts`
- `components/AuthRedirect.tsx`
- `app/component/layout/SidebarLayout.tsx`
- `app/pages/login/page.tsx` (keep — runs once per login submit, not per render)
- `app/pages/index/page.tsx`
- `app/pages/admin/page.tsx`
- `app/pages/qa/page.tsx`
- `app/pages/papers/page.tsx`
- `app/pages/export/page.tsx`
- `app/component/pdform/*.tsx` (8 files: Epworth, Food, Hamd, Mds, Moca, PDScreening, Rome4, Sleep, Smell, Tmse)

---

## Phase 1 — Slim down `middleware.ts`

File: [`middleware.ts`](../middleware.ts)

### Changes

1. Replace the `supabase.auth.getSession()` call with a **cookie-presence** check. The Supabase auth helper sets cookies named `sb-<project-ref>-auth-token` (and `.0`, `.1` chunks). Their *presence* is enough to decide "user has an active session attempt" without hitting the Auth API. Token validity is enforced anyway by RLS on every Supabase query the user makes, and by API routes that call `getSession()` server-side.

2. **Delete** the `admin_users` lookup and all role/feature gating from middleware. Move that to a server-side check at the page level (or trust client-side `useAccessProfile` for now, since RLS on `admin_users` already prevents privilege escalation).

3. **Delete** `clearSupabaseAuthCookies()` and its call site in the catch branch. Never destroy auth cookies from middleware.

### New shape (sketch — final code at Codex's discretion)

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/pages/login"]);

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = hasSupabaseAuthCookie(request);

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasSession) {
      // Authenticated user landing on /login → bounce to a safe default.
      // We can't know their role here; use /pages/index and let the page-level
      // access guard redirect to a permitted route if needed.
      return NextResponse.redirect(new URL("/pages/index", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/pages/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pages/:path*"],
};
```

### Notes

- This middleware is **synchronous** and makes **zero** Supabase API calls. Auth API traffic from middleware drops to zero.
- Role-based access (the `canAccessFeature` check that used to live here) becomes the responsibility of:
  - **Client-side**: `useAccessProfile` already filters sidebar items, and pages already render `<AuthRedirect />` if no session.
  - **Server-side**: any page that needs hard role gating should be converted to a Server Component with a `getAccessProfile`-equivalent server check (covered in optional Phase 6 below if needed).
- The `getDefaultAuthorizedPath(role)` redirect on the login page (when an authenticated user visits `/login`) is no longer possible from middleware because we don't know the role. A simple `/pages/index` redirect is acceptable — the dashboard page itself will further redirect users without dashboard access.

### Acceptance check

```bash
# Open Network panel in browser, navigate from /pages/login → /pages/users.
# Expected: 0 requests to <project>.supabase.co/auth/v1/* triggered by middleware.
# Only the page-level SessionProvider call should appear (1 request).
```

---

## Phase 2 — Add `SessionProvider` and `useSession` hook

New file: `app/providers/SessionProvider.tsx`

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
```

### Mount the provider at the root

File: [`app/layout.tsx`](../app/layout.tsx)

Wrap `{children}` with `<SessionProvider>`. The provider is a client component, so the root layout can stay a Server Component as long as `<SessionProvider>` is the wrapper element, not the layout itself.

### Acceptance check

```bash
# After mounting, refresh /pages/users.
# Expected: exactly 1 call to /auth/v1/token?grant_type=refresh_token (if token near-expiry)
# OR 0 auth API calls (if access token still valid). No fan-out.
```

---

## Phase 3 — Replace per-component `getSession()` with `useSession()`

Refactor every file in the inventory list (Phase 1 preflight) to:
- Remove the `useState<Session>` + `useEffect` that calls `getSession()` + subscribes to `onAuthStateChange`.
- Replace with `const { session, loading } = useSession()`.

### Files and exact replacements

| File | Lines to remove | Replace with |
|------|------|--------|
| [`components/AuthRedirect.tsx`](../components/AuthRedirect.tsx) | entire `useEffect` (lines 10-21) | Use `useSession()`; if `!loading && !session` → `router.push('/pages/login')` |
| [`app/component/layout/SidebarLayout.tsx`](../app/component/layout/SidebarLayout.tsx) | `useEffect` block lines 46-62 | `const { session, loading: sessionLoading } = useSession();` then derive `userName`/`userEmail` from `session.user` in `useMemo` |
| [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) | `useEffect` lines ~95-125 | `const { session } = useSession();` then `useMemo` for `currentUser` derivation |
| [`app/pages/admin/page.tsx`](../app/pages/admin/page.tsx) | `useEffect` lines ~75-109 | same pattern as above |
| [`app/pages/qa/page.tsx`](../app/pages/qa/page.tsx) | `useEffect` block at lines ~260-280 | same |
| [`app/pages/papers/page.tsx`](../app/pages/papers/page.tsx) | the `getSession` call at line 45 (inline await) | replace inline await with `session` from hook (component must read it from the closure of `useSession()` higher up) |
| [`app/pages/export/page.tsx`](../app/pages/export/page.tsx) | `useEffect` block at lines ~115-130 | same |
| `app/component/pdform/*.tsx` (8 files) | every inline `await supabase.auth.getSession()` inside submit/upload handlers | These are **inside event handlers**, not `useEffect`. Read the session from `useSession()` at component top, then use it in the handler. Cache the access token in a `useMemo` if needed. |

### Important: pdform inline await pattern

Pdform components currently do:
```ts
const onSubmit = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  // ... use token in fetch headers
};
```
After refactor:
```ts
const { session } = useSession();

const onSubmit = async () => {
  const token = session?.access_token;
  // ... use token in fetch headers
};
```
This eliminates ~16 `getSession()` calls per pdform interaction (each form has 2 handlers that both call it).

### Login page exception

[`app/pages/login/page.tsx`](../app/pages/login/page.tsx) line 34 calls `getSession()` immediately after `signInWithPassword`. **Keep this**, but replace it: `signInWithPassword` already returns `{ data: { session } }`, so use that directly instead of a second round-trip:

```ts
const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) { ... }
const session = signInData.session;
```
Saves 1 auth call per login.

### Acceptance check

```bash
grep -rn "supabase.auth.getSession" app/ components/
# Expected output: only login/page.tsx (and only via signInWithPassword's return value, NOT a separate getSession call)
# All other matches should be gone.
```

---

## Phase 4 — Cache `admin_users` lookup in `useAccessProfile`

File: [`app/hooks/useAccessProfile.ts`](../app/hooks/useAccessProfile.ts)

The hook currently re-queries `admin_users` every time `session` reference changes (which happens on every `onAuthStateChange` event, including silent token refreshes). Cache by `session.user.id`:

```ts
const cachedProfileRef = useRef<{ userId: string; profile: AccessProfile } | null>(null);

useEffect(() => {
  if (!session) {
    cachedProfileRef.current = null;
    setAccessProfile(unauthenticatedProfile);
    setAccessLoading(false);
    return;
  }

  if (cachedProfileRef.current?.userId === session.user.id) {
    setAccessProfile(cachedProfileRef.current.profile);
    setAccessLoading(false);
    return;
  }

  let alive = true;
  setAccessLoading(true);
  getAccessProfile(supabase, session).then((profile) => {
    if (!alive) return;
    cachedProfileRef.current = { userId: session.user.id, profile };
    setAccessProfile(profile);
    setAccessLoading(false);
  });

  return () => { alive = false; };
}, [session]);
```

This brings `admin_users` queries down from "every silent token refresh" to "once per real login".

### Acceptance check

- Open DevTools → Network → filter `admin_users`.
- Open `/pages/users`, navigate to `/pages/qa`, navigate back. Expected: **1** query total (the first mount), not 3.

---

## Phase 5 — Remove sidebar prefetch loop

File: [`app/component/layout/AppSidebar.tsx`](../app/component/layout/AppSidebar.tsx) lines 95-99.

Delete:
```ts
useEffect(() => {
  [...visibleMainItems, ...visibleWorkspaceItems].forEach((item) => {
    router.prefetch(item.path);
  });
}, [router, visibleMainItems, visibleWorkspaceItems]);
```

After Phase 1 makes middleware cheap, prefetch is no longer harmful — but it's also unnecessary because:
1. Sidebar items are buttons calling `onNavigate` → `router.push`, not `<Link>`. `router.prefetch` only helps if Next can pre-warm the RSC payload, and the buttons don't even use `<Link>`.
2. The default Next.js prefetch behaviour for `<Link>` components inside the viewport already covers any future `<Link>` migration.

If we want to keep the buttons but still prefetch on hover, use `onMouseEnter={() => router.prefetch(item.path)}` — but that's a follow-up, not part of this plan.

### Acceptance check

- Open `/pages/users`, watch Network tab. Expected: no burst of 7 RSC fetches at sidebar mount.

---

## Phase 6 (optional, recommend deferring) — Server-side role gating

If we want to keep hard server-side role enforcement (parity with the deleted middleware logic), convert protected pages to Server Components and call `getAccessProfile` with the server-side Supabase client, then `redirect()` if denied.

**Recommendation**: defer to a separate plan. RLS on `admin_users` already prevents non-admins from reading admin data, and current pages already gate UI via `useAccessProfile`. Server-side gating is defence-in-depth, not a current bug.

---

## Verification (full plan)

After all phases, perform this end-to-end check:

1. Clear browser storage and cookies.
2. Open Supabase dashboard → Auth → Logs and note the current request count.
3. Sign in with a test admin account.
4. Navigate: `/pages/index` → `/pages/users` → `/pages/qa` → `/pages/admin` → `/pages/index`.
5. Wait 5 minutes (force at least one token refresh).
6. Navigate to one more page.
7. Sign out.

**Expected auth requests for this flow**: ~6-8 total (1 sign-in, 1 initial getSession, 1-2 token refreshes, 1 sign-out, ±1 for race conditions). Today the same flow generates 60-100+.

**Expected `admin_users` queries**: 1 (per login).

**Expected user-visible behaviour**: no involuntary redirect to `/pages/login` during the session.

---

## Rollback plan

All changes are confined to: `middleware.ts`, `app/layout.tsx`, one new file (`app/providers/SessionProvider.tsx`), `app/hooks/useAccessProfile.ts`, `components/AuthRedirect.tsx`, `app/component/layout/SidebarLayout.tsx`, `app/component/layout/AppSidebar.tsx`, and the page/form files listed in Phase 3.

Revert as a single commit if auth behaviour regresses. No DB migration, no env var changes, no dependency changes.

---

## Out-of-scope follow-ups (candidates for future plans)

- **PLAN-011 (suggested)**: Migrate `@supabase/auth-helpers-nextjs` → `@supabase/ssr` (the helpers package is deprecated upstream).
- **PLAN-012 (suggested)**: Server-side role gating with Server Components per Phase 6 above.
- **PLAN-013 (suggested)**: Add a Supabase Auth rate-limit alert (e.g. >100 req/hour from a single IP) to catch future regressions early.
