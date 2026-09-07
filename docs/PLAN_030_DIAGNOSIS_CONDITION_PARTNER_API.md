# PLAN-030: Partner API — Diagnosis Condition Lookup by ThaiID

## 1. Overview

An external company is building a separate "checkpd webapp" and needs to resolve a patient's diagnosis `condition` (pd / pdm / ctrl / other) by Thai national ID (`thaiid`). Per the integration note the user received:

> แนวทางที่ตกลงคือใช้ api สำหรับเชื่อมโยงผล diagnosis เข้าระบบ checkpd โดยใช้ thaiid เป็น mapping key... ต้องกำหนด api spec, field mapping และข้อมูลที่อนุญาตส่งระหว่างระบบให้ชัดเจนก่อน integration

This plan defines that spec: a single read-only, partner-authenticated endpoint under `app/api/external/` that accepts a `thaiid` and returns the matching `condition` fields from `public.user_record_summary` (joined through `public.users.thaiid`).

**Reason for change:** today every route under `app/api` is implicitly trusted — none of them check an incoming credential (they assume same-origin browser calls, gated only by the frontend's Supabase session). This is the first endpoint meant to be called by a third party outside our infrastructure, so it needs its own auth, its own minimal response shape, and its own rate limit — none of which existing routes provide off the shelf.

**Explicitly confirmed by the user:** `checkpd` schema is **not** used and **not** related to this endpoint, even though `checkpd.record_summary` happens to mirror `condition` today (see [PLAN_022](PLAN_022_CONDITION_OTHER_BIDIRECTIONAL_SYNC.md)). Source of truth for this integration is `public.users` + `public.user_record_summary` only.

## 2. Related plans

- [[PLAN-022]] — `condition`/`other` bidirectional sync (`public.user_record_summary` ↔ `core.patient_diagnosis_v2`, mirrored to `checkpd.record_summary`). Not touched by this plan, but explains why `condition` is reliably normalized to `pd`/`pdm`/`ctrl`/`other`/`null` by the time this endpoint reads it.
- [[PLAN-028]] — prior art for a bearer-token-gated server route (`lib/users-page-access.ts`), though that pattern authenticates *our own* logged-in staff via Supabase session, not a third-party server. This plan needs a different mechanism (see §4).

## 3. Scope

**In scope**
- One new route: `POST /api/external/diagnosis-lookup`
- Static API-key auth (shared secret), independent of Supabase Auth
- Rate limiting (reuse [lib/rateLimit.ts](../lib/rateLimit.ts))
- Response limited to: `condition`, `condition_status`, `condition_changed_at` — nothing else (no name, address, phone, scores, etc.)
- thaiid input normalization (strip non-digits, same convention as [app/api/export/users-csv/route.ts](../app/api/export/users-csv/route.ts)'s `normalizeThaiId`)
- Masked logging (never log a raw thaiid)

**Out of scope (seed for future PLAN-03x)**
- Batch/bulk lookup (array of thaiid in one call) — v1 is single-thaiid only
- Push model (us calling the partner's API when a diagnosis changes) — the user's note describes a *pull* model (they call us); push is a separate future integration if requirements change
- Persistent DB-backed audit log table — v1 logs to server console only (masked); add a table if compliance later requires queryable history
- IP allowlist / mTLS — infra-level hardening, only worth it once the partner can share static egress IPs
- Any `checkpd` schema involvement — explicitly out per user instruction
- Per-partner field scoping — v1 assumes exactly one partner/key, all keys get the same response shape

## 4. Preflight checks

Run before implementing, to catch drift from this plan's assumptions:

```bash
# Confirm no existing route already claims this path
find app/api/external -maxdepth 2 2>/dev/null

# Confirm public.users / public.user_record_summary columns haven't changed
# (columns this plan depends on: users.id, users.thaiid,
#  user_record_summary.user_id, .condition, .condition_status, .condition_changed_at, .updated_at)
grep -n "thaiid\|condition" app/pages/users/users.sql

# Confirm env var name is free
grep -rn "DIAGNOSIS_PARTNER_API_KEYS" . --include=*.ts --include=*.env* 2>/dev/null
```

## 5. Auth design

No existing mechanism fits: Supabase-session bearer tokens (`lib/thai-id-card-access.ts`, `lib/users-page-access.ts`) authenticate *our* logged-in staff, not an external server. This plan introduces a **static API key**, deliberately using a header name that cannot be confused with a Supabase session token:

- Header: `x-api-key: <token>`
- Env var: `DIAGNOSIS_PARTNER_API_KEYS` — comma-separated `name:key` pairs, e.g. `checkpd_webapp:8f2c...` — so keys can be rotated or a second partner added later without a code change.
- Compare with `crypto.timingSafeEqual` (constant-time) against each configured key; reject on no match.
- On success, the matched partner `name` is attached to the request context for logging/rate-limit keying.

New helper, mirroring the existing `XxxAccessError` class pattern:

```ts
// lib/external-diagnosis-access.ts
export class DiagnosisApiAccessError extends Error {
  constructor(message: string, public readonly status: 401 | 429) {
    super(message)
    this.name = "DiagnosisApiAccessError"
  }
}

export function requireDiagnosisApiKey(request: Request): { partner: string } {
  const key = request.headers.get("x-api-key")
  if (!key) throw new DiagnosisApiAccessError("Missing x-api-key.", 401)

  const configured = (process.env.DIAGNOSIS_PARTNER_API_KEYS ?? "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name, secret] = pair.split(":")
      return { name, secret }
    })

  const match = configured.find((c) => c.secret && timingSafeEqualStr(c.secret, key))
  if (!match) throw new DiagnosisApiAccessError("Invalid API key.", 401)

  return { partner: match.name }
}
```

(`timingSafeEqualStr` = small wrapper around `crypto.timingSafeEqual` that first checks equal length to avoid it throwing — final code at implementer's discretion.)

## 6. Data model / fetch strategy

```ts
// 1. Resolve users.id from thaiid (a person could have >1 users row from re-registration)
const { data: users } = await supabaseServer
  .from("users")
  .select("id")
  .eq("thaiid", normalizedThaiId)

// 2. Pull condition rows for those ids, latest first
const { data: rows } = await supabaseServer
  .from("user_record_summary")
  .select("user_id,condition,condition_status,condition_changed_at,updated_at")
  .in("user_id", users.map(u => u.id))
  .order("condition_changed_at", { ascending: false, nullsFirst: false })
  .order("updated_at", { ascending: false, nullsFirst: false })

// 3. Take the single most-recently-changed row as the answer
const latest = rows[0]
```

**Multi-row rule:** a thaiid can have multiple `user_record_summary` rows (one per `recorder`). Take the row with the most recent `condition_changed_at` (falling back to `updated_at`) as the reported condition. `matched_records` in the response communicates when there was more than one candidate, so the partner can flag ambiguous cases without us guessing at business logic on their behalf.

**condition = null is a valid, real answer** — it means the thaiid is a known screened person with no diagnosis recorded yet. Don't conflate it with "not found."

## 7. Request / response shape

**Request**

```
POST /api/external/diagnosis-lookup
x-api-key: <partner key>
Content-Type: application/json

{ "thaiid": "1234567890123" }
```

(POST + JSON body, not `GET ?thaiid=`, so the national ID never lands in a URL / access log / browser history.)

**Response — match found**

```json
{
  "thaiid": "1234567890123",
  "found": true,
  "condition": "pd",
  "condition_status": "confirmed",
  "condition_changed_at": "2026-08-01T10:00:00+07:00",
  "matched_records": 1
}
```

**Response — no match**

```json
{
  "thaiid": "1234567890123",
  "found": false,
  "condition": null,
  "condition_status": null,
  "condition_changed_at": null,
  "matched_records": 0
}
```

Status `200` for both — absence is a normal business outcome, not an error.

**Error responses**

| Status | Cause |
|--------|-------|
| 400 | `thaiid` missing, or not 13 digits after stripping non-digits |
| 401 | missing/invalid `x-api-key` |
| 429 | rate limit exceeded |
| 500 | unexpected server/DB error |

## 8. Files to create / modify

| File | Change |
|------|--------|
| `lib/external-diagnosis-access.ts` | *(new)* API-key validation (§5) |
| `app/api/external/diagnosis-lookup/route.ts` | *(new)* POST handler — validate key → validate/normalize thaiid → rate-limit by partner name → query (§6) → shape response (§7) |
| `.env.local` (+ hosting env, e.g. Vercel project settings) | *(new var)* `DIAGNOSIS_PARTNER_API_KEYS=checkpd_webapp:<random-secret>` |
| `CLAUDE.md` | add `DIAGNOSIS_PARTNER_API_KEYS` to the Environment Variables list |

## 9. Edge cases & rules

1. `thaiid` malformed (not 13 digits post-strip) → 400, do not query the DB.
2. `thaiid` valid but no `public.users` row → `found: false`, 200.
3. `thaiid` valid, user(s) found, but zero `user_record_summary` rows → `found: false` (no `condition` to report), 200. Consider whether "person exists but never screened" should be distinguishable from "person doesn't exist" — flagged as a decision for the partner conversation, not resolved unilaterally by this plan.
4. Multiple `user_record_summary` rows for the same thaiid → return the most recently changed one (§6); `matched_records` > 1 signals ambiguity.
5. `condition` is `NULL` on the latest matched row → return `condition: null` with `found: true` (screened, not yet diagnosed) — distinct from case 2/3.
6. Missing or wrong `x-api-key` → 401, and do **not** distinguish "missing" vs "wrong" in the response body (avoid helping a brute-force attempt narrow down).
7. Rate limit is keyed by **partner name** (from the matched API key), not by IP — server-to-server traffic from one partner will share a small IP range or a single NAT egress IP, so per-IP limiting could falsely throttle unrelated traffic sharing that IP, or under-throttle a single partner spread across many IPs.
8. Never log the raw `thaiid` — log a masked form (e.g. first 3 + last 2 digits) alongside partner name and outcome, for traceability without creating a new place PII leaks from.

## 10. Verification checklist

- [ ] `curl` with correct key + a thaiid known to have `condition = 'pd'` → 200, `found:true`, `condition:"pd"`
- [ ] `curl` with correct key + a thaiid not in `public.users` → 200, `found:false`
- [ ] `curl` with correct key + a thaiid in `public.users` but no `user_record_summary` row → 200, `found:false`
- [ ] `curl` with correct key + a thaiid with `condition IS NULL` → 200, `found:true`, `condition:null`
- [ ] `curl` with missing `x-api-key` → 401
- [ ] `curl` with wrong `x-api-key` → 401
- [ ] `curl` with malformed thaiid (`"12"`, `"abc"`, empty) → 400
- [ ] 16th request in <1 min from the same key → 429
- [ ] Response body never contains firstname/lastname/phonenumber/address/scores — only the 3 condition fields + echo/meta fields
- [ ] Server logs show masked thaiid, not raw

## 11. Out-of-scope follow-ups (seed for PLAN-031+)

- Batch lookup (`{"thaiids": [...]}`) if the partner needs bulk sync instead of per-person polling
- Push/webhook model if the integration direction later flips (us notifying them on `condition_changed_at` change) — would reuse the [PLAN-022](PLAN_022_CONDITION_OTHER_BIDIRECTIONAL_SYNC.md) trigger as the natural hook point
- Persistent, queryable audit-log table if a compliance/legal review of this integration requires more than console logs
- IP allowlist or mTLS once the partner can supply static egress IPs

## 12. Rollback plan

Fully additive — one new lib file, one new route folder, one new env var. Rollback = delete `lib/external-diagnosis-access.ts` and `app/api/external/diagnosis-lookup/`, remove the env var. No schema change, no existing route touched, zero blast radius to the rest of the app.

---

**Note on PLAN numbering:** the registry had two docs both claiming `PLAN-029` (`PLAN_029_D15_AUTO_INTERPRETATION_AND_COLOR_PICKER.md` and an untracked `PLAN_029_PUBLIC_STAT_EMBED.md`). This plan takes the next free number, `030`; the collision itself is unrelated to this feature and worth reconciling separately.
