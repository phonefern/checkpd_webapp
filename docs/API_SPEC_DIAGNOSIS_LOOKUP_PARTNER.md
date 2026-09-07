# CheckPD Diagnosis Condition Lookup API — Partner Integration Spec

**Version:** 1.0
**Status:** Draft — pending production URL + final key handoff
**Contact:** checkpd@chulapd.org

## 1. Purpose

Lookup a patient's diagnosis condition by Thai national ID (`thaiid`), per the agreed integration approach: thaiid as the mapping key between the diagnosis data source (this system) and the CheckPD webapp.

## 2. Endpoint

```
POST {BASE_URL}/api/external/diagnosis-lookup
```

`{BASE_URL}` — to be filled in once deployed (e.g. `https://app.chulapd.org` or the assigned production hostname).

## 3. Authentication

Send your assigned API key in the `x-api-key` header on every request:

```
x-api-key: <your assigned key>
```

- Keys are per-partner and issued out-of-band (not in this document). Contact us to receive/rotate your key.
- Missing or invalid key → `401 Unauthorized`. The error message does not distinguish "missing" from "wrong" — check your header name/value if you see this.
- Do not embed the key in client-side/browser code — call this API from your own backend only.

## 4. Rate limit

**15 requests per minute** per API key. Exceeding it returns `429 Too Many Requests`. If you need bulk/batch lookups instead of polling one thaiid at a time, contact us — a batch endpoint can be added.

## 5. Request

```http
POST /api/external/diagnosis-lookup
Content-Type: application/json
x-api-key: <your key>

{
  "thaiid": "1234567890123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `thaiid` | string | yes | Thai national ID. Non-digit characters (dashes, spaces) are stripped server-side; must resolve to exactly 13 digits or the request is rejected. |

## 6. Response

**Always HTTP 200** when the request itself is valid — `found: false` is a normal, expected outcome (unknown thaiid), not an error.

### Match found

```json
{
  "thaiid": "1234567890123",
  "found": true,
  "user_id": "abc123",
  "condition": "pd",
  "test_result": "Complete",
  "other": null,
  "prediction_risk": true,
  "condition_changed_at": "2026-08-01T10:00:00+07:00",
  "matched_records": 1
}
```

### No match

```json
{
  "thaiid": "1234567890123",
  "found": false,
  "user_id": null,
  "condition": null,
  "test_result": null,
  "other": null,
  "prediction_risk": null,
  "condition_changed_at": null,
  "matched_records": 0
}
```

### Field reference

| Field | Type | Meaning |
|---|---|---|
| `thaiid` | string | Echo of the normalized (digits-only) input. |
| `found` | boolean | `true` if the thaiid matched a known patient record. `false` = unknown thaiid, or a matched patient with no screening record yet. |
| `user_id` | string \| null | Internal patient identifier. Opaque — for your own reference/logging only, not meaningful outside this system. |
| `condition` | string \| null | Diagnosis condition code. One of: `"pd"` (Parkinson's disease), `"pdm"` (prodromal / high risk), `"ctrl"` (control / healthy), `"other"`, or `null` (screened but not yet diagnosed, or unknown). Treat any value outside this set as `"other"` for forward compatibility. |
| `test_result` | string \| null | Screening test completion status (raw internal string, e.g. reflects complete/incomplete/not attempted). Treat as informational; do not build strict equality logic against exact casing/spelling — ask us before depending on a specific value. |
| `other` | string \| null | Free-text supplementary diagnosis notes, semicolon-separated when multiple. May be `null`. |
| `prediction_risk` | boolean \| null | Mobile-app screening risk flag, when available. `null` = not computed/not available. |
| `condition_changed_at` | string (ISO 8601) \| null | Timestamp of the last change to `condition` for this record. |
| `matched_records` | integer | Number of internal records considered for this thaiid. `1` = unambiguous. `>1` means the patient has multiple recorded sessions; the most recently changed one is returned. `0` = no match. |

## 7. Error responses

| HTTP status | Meaning | Body |
|---|---|---|
| 400 | `thaiid` missing, not 13 digits after stripping non-digit characters, or malformed JSON body | `{ "error": "..." }` |
| 401 | Missing or invalid `x-api-key` | `{ "error": "Unauthorized." }` |
| 429 | Rate limit exceeded (>15 req/min for your key) | `{ "error": "Rate limit exceeded." }` |
| 500 | Unexpected server error — retry with backoff; contact us if persistent | `{ "error": "Internal server error." }` |

## 8. Example (curl)

```bash
curl -X POST {BASE_URL}/api/external/diagnosis-lookup \
  -H "x-api-key: <your key>" \
  -H "Content-Type: application/json" \
  -d '{"thaiid":"1234567890123"}'
```

## 9. Data handling notes

- This endpoint returns clinical/PHI data. Store and transmit it per your organization's data-protection obligations; do not log full `thaiid` values in plaintext where avoidable.
- `thaiid` is sent in the POST body (not a URL query string) specifically so it does not appear in server/proxy access logs.
- Scope is intentionally minimal: only the fields listed above are returned — no name, address, phone number, or test scores. If your integration needs additional fields, contact us to review before we extend the response — each additional field is a deliberate data-sharing decision, not a default.

## 10. Out of scope (v1)

- Batch lookup (multiple thaiid per request)
- Push notifications when a condition changes (this is pull/on-demand only)
- SLA/uptime guarantee — this endpoint currently has no formal SLA; treat it as best-effort until otherwise agreed

---
*Internal reference: [PLAN-030](PLAN_030_DIAGNOSIS_CONDITION_PARTNER_API.md) (implementation plan, not for external distribution).*
