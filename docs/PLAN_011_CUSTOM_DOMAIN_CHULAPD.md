# PLAN-011: Migrate to a `chulapd.org` custom domain to bypass hospital network blocks

## Overview

Users have reported that the application is **blocked by hospital Wi-Fi firewalls**. This is a network-infrastructure issue, not an application bug, but it is fixable by migrating the public hostname from the current Vercel-assigned domain (e.g. `*.vercel.app`) to a subdomain of **`chulapd.org`** — a Chulalongkorn domain that hospital firewalls are far more likely to allow by default (and that hospital IT can whitelist as a single trusted entity if needed).

Hospital firewalls typically block by **domain reputation / category** rather than by site. Unknown `*.vercel.app` subdomains commonly fall into "uncategorized cloud hosting" — which is a default-deny in many medical networks. A `*.chulapd.org` hostname routes the same Vercel deployment but presents itself under an educational/medical-domain reputation that is much more likely to be allowed.

This plan covers the full cutover. The Codex implementer should treat this as primarily a **deployment & configuration** task — the only code-side touchpoint is environment-variable updates. There are **no application-code edits** required, because preflight confirmed:
- No hardcoded `https://*.vercel.app`, `firebaseapp.com`, or absolute origin URLs in `app/`, `components/`, or `lib/`.
- No `redirectTo` / `emailRedirectTo` Supabase calls (we use password-only sign-in).
- Firebase Auth is **not** used in this project — `lib/firebaseClient.ts` only imports `getFirestore`. The `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` env var is set but unused by application code.

**Related plans**: independent of PLAN-010 (auth-request reduction) but complementary — both target user-visible session/connectivity reliability.

---

## Scope

### In scope
1. Decide the subdomain (recommendation: `app.chulapd.org`; alternatives: `pd.chulapd.org`, `checkpd.chulapd.org`).
2. Coordinate with the `chulapd.org` DNS owner (Chulalongkorn IT / domain registrar) to add a CNAME pointing at Vercel.
3. Add the custom domain in the Vercel dashboard for project `checkpd-chula` (org `team_Pxj6KS97X9wOP2sq5p5PVn0Y`) and verify automatic Let's Encrypt SSL.
4. Update Supabase Auth **Site URL** and **Additional Redirect URLs** in the Supabase dashboard so cookies and any future password-reset / magic-link flows resolve correctly.
5. Confirm Supabase **CORS allowed origins** include the new domain (auto-allowed for the project Site URL, but worth verifying).
6. Update **S3 / Supabase Storage CORS** if presigned URL upload/download is initiated cross-origin from the new domain.
7. Update `.env.local` and Vercel production environment variables (only if any `NEXT_PUBLIC_SITE_URL`-style var is added — see Phase 4).
8. Verify on the hospital Wi-Fi that the new domain loads before announcing the cutover.
9. User communications: announce the new URL, set up a redirect from the old Vercel URL to the new one for at least 30 days.

### Out of scope
- Application code changes (none needed — preflight confirmed clean).
- Migrating off Vercel. We keep Vercel as the host; only the public hostname changes.
- Firebase Hosting reactivation. The `.firebaserc` / `firebase.json` artifacts in the repo target a static-export hosting setup that is **not** the current production path (Vercel SSR is). They can be left alone.
- Reverse-proxying Supabase / Firebase API traffic through the new domain. If `*.supabase.co` itself is also blocked by hospital Wi-Fi (separate failure mode from "the app domain is blocked"), that is a **separate plan** (candidate PLAN-012) requiring API-route proxying and loss of realtime subscriptions.
- Firebase Auth domain reconfiguration — unused in this project.
- Changing the Supabase project itself (URL, anon key, region).

---

## Preflight checks (run before opening any dashboard)

These have already been verified by Claude; Codex should re-run to confirm before starting:

```bash
# 1. No hardcoded production URLs in app/components/lib
grep -rn "vercel\.app\|firebaseapp\.com\|web\.app" app/ components/ lib/ middleware.ts

# 2. No Supabase auth redirect calls (password-only flow, no callback URL to update in code)
grep -rn "redirectTo\|emailRedirectTo" app/ components/ lib/

# 3. Firebase Auth is unused — only Firestore should be imported from firebaseClient.ts
grep -rn "from ['\"]firebase/auth['\"]\|getAuth(" app/ components/ lib/

# 4. Confirm Vercel project linkage
cat .vercel/project.json
# Expected: projectName: "checkpd-chula", orgId: team_Pxj6KS97X9wOP2sq5p5PVn0Y
```

All four should return what this plan claims (no matches for 1–3, expected JSON for 4). If anything differs, **stop and re-scope** — there is additional code work this plan did not anticipate.

---

## Phase 0 — Choose the subdomain and authorise DNS access

**This is a coordination step, not an engineering step. It must finish before Phase 1.**

1. Confirm the subdomain with the project owner. Default recommendation: **`app.chulapd.org`**.
   - Short, generic, leaves `pd.chulapd.org` / `checkpd.chulapd.org` free for future use (mobile app landing page, marketing site, etc.).
2. Identify who controls the `chulapd.org` DNS zone (Chulalongkorn IT or a delegated registrar account). Get write access or a contact who can add records on our behalf.
3. Verify nothing already resolves at the chosen hostname:
   ```bash
   nslookup app.chulapd.org
   # Expected: NXDOMAIN, or only the parent zone's wildcard.
   ```

**Exit criteria**: subdomain decided, DNS contact identified, no collision.

---

## Phase 1 — Add the custom domain in Vercel

1. Open the Vercel dashboard → project **checkpd-chula** → **Settings → Domains**.
2. Click **Add Domain** → enter `app.chulapd.org` (or the chosen subdomain).
3. Vercel will display either:
   - A **CNAME** target (e.g. `cname.vercel-dns.com`) — use this for a subdomain.
   - An **A record** IP — only needed for the apex `chulapd.org`, which is **not** what we are doing.
4. Provide the CNAME target to the DNS contact from Phase 0. Request:
   ```
   Type:  CNAME
   Name:  app
   Value: cname.vercel-dns.com.   (or whatever value Vercel displays — use Vercel's value verbatim)
   TTL:   300  (low for the cutover; can be raised later)
   ```
5. Wait for DNS propagation (usually 5–30 minutes for a new record). Vercel auto-detects and shows the domain as **Valid Configuration** with a green check.
6. Vercel automatically provisions a **Let's Encrypt SSL certificate**. Do not proceed until the certificate shows as issued (typically <2 minutes after DNS is valid).

### Acceptance check

```bash
# DNS resolves to Vercel
dig +short app.chulapd.org
# Expected: a CNAME chain ending at Vercel's anycast IPs.

# HTTPS responds with the app, with a valid cert
curl -sI https://app.chulapd.org/pages/login | head -5
# Expected: HTTP/2 200 (or 307/308 redirect from vercel.json's "/" rule), no cert warning.
```

---

## Phase 2 — Update Supabase Auth Site URL and Redirect URLs

The app uses `supabase.auth.signInWithPassword` (no OAuth, no magic links), so the Supabase Site URL is **not** load-bearing for the current login flow. However:

- The Site URL is used as the **default cookie domain** by the Supabase auth helpers.
- It is required for any future magic-link or password-reset email URL.
- It is the canonical origin Supabase reports in audit logs.

Update it now so we don't have to remember later.

1. Supabase dashboard → project → **Authentication → URL Configuration**.
2. Set **Site URL** to: `https://app.chulapd.org`
3. Under **Additional Redirect URLs**, add:
   - `https://app.chulapd.org/**`
   - Keep the existing Vercel URL (e.g. `https://checkpd-chula.vercel.app/**`) for the 30-day overlap period.
4. Save.

### Acceptance check

After Phase 1 and Phase 2 are both live:
- Open `https://app.chulapd.org/pages/login` in a clean browser profile, sign in with a test admin account, navigate around. Expected: login works, session persists across navigation, no involuntary redirect back to `/login`.

---

## Phase 3 — Verify CORS for Supabase REST/Storage and S3

Supabase auto-trusts the project Site URL for its REST and Realtime endpoints, so Phase 2 covers this. But:

1. If the project uses **Supabase Storage** with browser-side uploads (currently used for patient files), verify the storage bucket's **CORS allowed origins** in Supabase dashboard → Storage → bucket settings → CORS. Add `https://app.chulapd.org` if not present.
2. If the project uses **AWS S3 directly** (via `@aws-sdk/client-s3`) with browser-side presigned-URL uploads, update the bucket CORS policy in AWS:
   ```json
   {
     "AllowedOrigins": [
       "https://app.chulapd.org",
       "https://checkpd-chula.vercel.app"
     ],
     "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }
   ```
   Verify whether presigned uploads currently flow **through Next.js API routes** (server-side, no CORS concern) or **direct from the browser** (CORS-relevant). Grep for `getSignedUrl` / `PutObjectCommand` call sites and check whether the URL is returned to the client and `fetch`-ed from there.

### Acceptance check

- Upload a test file from `https://app.chulapd.org/pages/storage`. Expected: succeeds with no `CORS` error in the DevTools console.

---

## Phase 4 — Environment variables

Most env vars in `.env.local` are origin-independent (Supabase URL/anon key, Postgres creds, S3 creds, NHSO key, Firebase server creds). The only ones that *could* reference the deployment origin:

1. **`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`** — currently set, but unused (Firebase Auth is not imported anywhere). No change required. Leave as-is to avoid an unrelated change to the env-var surface.
2. **A `NEXT_PUBLIC_SITE_URL`** equivalent does **not** currently exist in the codebase. Do **not** add one unless a follow-up genuinely needs it.

In **Vercel → project → Settings → Environment Variables**: nothing to change. The build does not bake in the origin.

### Acceptance check

```bash
grep -rn "NEXT_PUBLIC_SITE_URL\|NEXT_PUBLIC_APP_URL\|NEXT_PUBLIC_BASE_URL" app/ components/ lib/
# Expected: zero matches. If matches appear later, they must be added to Vercel env config first.
```

---

## Phase 5 — Verify on the hospital network (the actual goal)

**This is the critical validation step. Do not announce the cutover before it passes.**

1. Connect a device to the **hospital Wi-Fi network** that previously blocked the app.
2. Open `https://app.chulapd.org/pages/login`.
3. Sign in and navigate through `/pages/users`, `/pages/qa`, `/pages/papers`, `/pages/storage`. Upload one file, download one file.
4. In the browser DevTools → Network tab, confirm:
   - The HTML/JS for `app.chulapd.org` loads (Phase 1 success).
   - Requests to `*.supabase.co` succeed (no `ERR_BLOCKED_BY_CLIENT`, no DNS failure, no 403 from a proxy).
   - Requests to the S3 / Supabase Storage endpoint succeed.

**If the page itself loads but Supabase requests fail**: the hospital firewall is *also* blocking `*.supabase.co`. This is a **different problem** from "the app domain is blocked" and requires either:
- A formal IT whitelist request for `*.supabase.co`, *or*
- The reverse-proxy approach deferred to candidate PLAN-012.

Do not improvise a fix in this plan. Record the failure mode and escalate.

### Acceptance check

End-to-end flow on hospital Wi-Fi: sign in → load patient list → open one patient record → upload one file → sign out. Zero errors in the console.

---

## Phase 6 — Cutover and communication

1. **Set the canonical URL to the new domain.** In Vercel → Settings → Domains, mark `app.chulapd.org` as the **primary** domain. This makes Vercel issue 308 redirects from any other domain (including the `*.vercel.app` URL) to the new one — so bookmarks keep working.
2. **Announce to users** (admins, clinical staff). Suggested wording in Thai for the announcement message:
   > เว็บ CheckPD ย้ายมาที่ `https://app.chulapd.org` แล้วครับ — โดเมนเดิม `*.vercel.app` ยังเข้าได้ระยะหนึ่งแต่จะ redirect มาที่โดเมนใหม่ ขอให้ทุกท่านอัปเดต bookmark และทดสอบบนไวไฟโรงพยาบาลครับ
3. **Update any internal docs** that reference the old URL: `README.md`, `ARCHITECTURE.md`, and any operations runbook.
4. **Keep the Vercel URL as a redirect for at least 30 days.** Do not remove it from the Supabase redirect-URL allowlist until after that window.

### Acceptance check

```bash
curl -sI https://checkpd-chula.vercel.app/pages/login | head -3
# Expected: HTTP/2 308 (or 307), Location: https://app.chulapd.org/pages/login
```

---

## Rollback plan

All changes in this plan are reversible without touching code:

| Phase | Rollback |
|------|------|
| Phase 1 (Vercel domain) | Remove the custom domain in Vercel → Settings → Domains. SSL cert is auto-revoked. |
| Phase 1 (DNS) | Ask the DNS contact to remove the CNAME record. |
| Phase 2 (Supabase Auth) | Revert Site URL to the previous value in Supabase dashboard. The Vercel redirect-URL entry was never removed, so this is a one-field edit. |
| Phase 3 (CORS) | Remove `app.chulapd.org` from the bucket CORS allowlist. |
| Phase 6 (primary domain swap) | In Vercel → Domains, set the old `*.vercel.app` URL back to primary. |

There is **no code commit** to revert. The whole plan is dashboard + DNS + comms.

---

## Out-of-scope follow-ups (candidates for future plans)

- **PLAN-012 (suggested)**: If `*.supabase.co` is also blocked by hospital Wi-Fi after Phase 5, reverse-proxy Supabase REST + Auth via Next.js API routes under `/api/db/*` and `/api/auth/*` on the new `chulapd.org` domain. Trade-offs: loses realtime subscriptions (websocket over a proxy is fragile), adds latency, doubles Vercel function invocation count.
- **PLAN-013 (suggested)**: Add a status / health-check page at `https://app.chulapd.org/status` that pings Supabase, S3, and the NHSO API client-side, so users on a constrained network can self-diagnose which dependency is blocked.
- **PLAN-014 (suggested)**: Submit a formal whitelist request to hospital IT for the third-party domains the app depends on (`*.supabase.co`, `*.amazonaws.com` or the Supabase S3 host, `*.firebaseio.com` if/when realtime Firestore is reintroduced).
