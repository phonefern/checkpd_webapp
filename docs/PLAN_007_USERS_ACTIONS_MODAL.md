# PLAN-007: Users Page — Actions Dropdown + Enriched Edit/Detail Modals

## Overview

Refactor the Actions column on `/pages/users` from inline buttons into a hover-revealed 3-dot dropdown menu (Edit / Print / Detail). Replace the current inline-row editing with a proper **Edit Modal** (React Hook Form + Zod, tabbed layout), and replace the current `PatientHistoryModal` launch with a richer **Detail Modal** that reads read-only enrichment data from the `checkpd` schema matched by `id` / `(user_id, recorder)`.

This plan is **read-only toward `checkpd`** (Option A). All writes go to `public.users` and `public.user_record_summary` only. The mobile-app sensor data (Hz, scores, counts) is read from `checkpd.record_summary`; the lifestyle fields (smoking, alcohol, etc.) are read from `checkpd.users` as text.

**Related plans**: PLAN-006 established the `checkpd` read-only enrichment pattern for QA page; this plan applies the same pattern to the Users page. Reference [`CheckpdDataSection.tsx:42`](../app/component/qa/CheckpdDataSection.tsx) for the `.schema('checkpd')` client usage, and [`QaTable.tsx:122`](../app/component/qa/QaTable.tsx) for the DropdownMenu usage pattern.

---

## Data model

### Primary (writes + list)
- **View `public.user_record_summary_with_users`** — list rows (unchanged).
- **Table `public.users`** — write target for profile fields (see Tab 1).
- **Table `public.user_record_summary`** — write target for `condition` / `other` (see Tab 3).

### Enrichment (read-only, no writes)
- **Table `checkpd.users`** — matched by `id = public.users.id` (both are TEXT PK, same ID domain via migration). `thaiid` is kept as a sanity check only; primary match is `id`.
- **Table `checkpd.record_summary`** — matched by `(user_id = public.users.id, recorder = <view.recorder>)` to pin the exact row shown in the list. If list row lacks `recorder` (should be rare), fall back to `user_id` only and pick `last_record_at DESC`.
- **Per-test prediction tables** (`checkpd.vibration`, `checkpd.tap`, `checkpd.pinch`, `checkpd.questionnaire`, `checkpd.voice`, `checkpd.prediction`) — matched by `record_pk` via `checkpd.records`. Show each row's `prediction_risk` + `test_type` + `recorded_at` in a compact list inside Detail modal.

### Key schema facts to respect
- `public.users` trigger `set_region_from_province` auto-fills `region` on insert/update → **do not** expose `region` as an edit field.
- `public.users` trigger `trg_set_age` auto-fills `age` from `bod` → **do not** expose `age` as an edit field; edit `bod` instead.
- `public.users` trigger `set_province_trigger` auto-derives `province` from `liveaddress` on insert/update → province edit is allowed but will be **overwritten** if `liveaddress` changes in the same update. Document this in the modal as a helper text: "จังหวัดจะถูกคำนวณใหม่จากที่อยู่เมื่อบันทึก".
- `public.users` trigger `trigger_trim_area` trims `area` on write → client does not need to trim.
- `public.user_record_summary` trigger `tg_compute_test_result_v2` recomputes `test_result` → treat `test_result` as read-only everywhere.
- Lifestyle fields (`smoking`, `alcohol`, `coffee`, `milk`, `exercise`, `insecticide`, `narcotic`, `severe_head_injury`) are `SMALLINT` in `public.users` but their semantic text values live in `checkpd.users` as `TEXT`. Per user decision: **display the text from checkpd (read-only)**, do not edit them in this iteration.

---

## UI changes

### 1. Actions column — 3-dot hover dropdown

File: [`app/component/users/UserTable.tsx`](../app/component/users/UserTable.tsx)

- Replace the inline `<Button>` cluster (Edit / Print / Detail) with a single `DropdownMenu` triggered by a `MoreVertical` icon button.
- Add `group` class to each `<TableRow>`; on the trigger button add `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity`.
  - `focus-visible:opacity-100` for keyboard accessibility.
  - `data-[state=open]:opacity-100` so the trigger stays visible while the menu is open.
- Menu items (in order): **Detail** → **Edit** → **Print**.
  - Detail: `Eye` icon, disabled if `!user.thaiid` AND no checkpd match is possible.
  - Edit: `Pencil` icon.
  - Print: `Printer` icon, opens `/api/pdf/{id}?record_id={record_id}` in a new tab (unchanged behaviour).
- **Mobile (md:hidden card view)**: replace the two ghost buttons in `CardHeader` with the same dropdown. Hover-reveal is desktop-only; on mobile the trigger is always visible.
- Remove the inline-edit code paths from `UserTable.tsx` (the `editingId === user.id ? ... : ...` branches for Province / Condition / Other / Area cells become view-only). Edit is now done in the modal.
- Remove the `editingId`/`setEditingId`/`handleConditionChange`/`handleProvinceChange`/`handleOtherChange`/`handleAreaChange`/`handleSave` props that are no longer needed. `onEdit(user)` and `onViewDetail(user)` are the only behavioural props now.

Reference the existing DropdownMenu structure in [`QaTable.tsx:122-190`](../app/component/qa/QaTable.tsx) for consistent styling (DropdownMenuLabel, DropdownMenuSeparator, item classes).

### 2. Edit Modal — new component

File: `app/component/users/UserEditModal.tsx` (new).

- Built on shadcn `Dialog` + `Tabs` + `Form` (React Hook Form) + Zod.
- Tabs (keys: `profile`, `lifestyle`, `clinical`). Default tab: `profile`.
- On mount: fetch the user's current row from `public.users` (by `id`) and the matching `public.user_record_summary` row (by `(user_id, recorder)`), plus `checkpd.users` (by `id`) for the read-only lifestyle display on Tab 2. All fetches done via one `useEffect`, showing a skeleton inside the dialog until resolved.
- On submit: two sequential updates in a single `handleSubmit`:
  1. `supabase.from('users').update({ ...profileFields, ...clinicalPublicFields }).eq('id', id)`
  2. `supabase.from('user_record_summary').update({ condition, other }).eq('user_id', id).eq('record_id', recordId)` — only if `record_id` exists.
  - Both errors surface as a single toast. On success: call `logActivity({ action: 'UPDATE', page: 'users', description: ... })`, close modal, call `onSaved()` from parent to re-fetch the list.
- Disable the Save button while submitting; show spinner.

#### Tab 1 — Profile (edit, writes to `public.users`)
| Field | public.users column | Input |
|-------|---------------------|-------|
| Prefix | `perfixname` | text input (note: column is literally `perfixname`, misspelt in DB) |
| First name | `firstname` | text input, required |
| Last name | `lastname` | text input, required |
| Thai ID | `thaiid` | text input, 13 digits, numeric-only, allow blank |
| Date of birth | `bod` | date input; submit as ISO string. Helper: "อายุจะคำนวณอัตโนมัติ" |
| Gender | `gender` | select: `male` / `female` / `other` (keep existing values) |
| Phone | `phonenumber` | text input, numeric-only |
| Email | `email` | email input |
| Live address | `liveaddress` | textarea. Helper: "จังหวัดจะถูกคำนวณใหม่จากที่อยู่เมื่อบันทึก" |
| ID-card address | `idcardaddress` | textarea |
| Province | `province` | select from `provinceOptions` (existing constant in [`app/types/user.ts`](../app/types/user.ts)) |
| Area | `area` | text input |
| Education | `educationstatus` | text input (free text for now; field is unbounded in DB) |
| Marital status | `maritalstatus` | text input |
| Ethnicity | `ethnicity` | text input |

#### Tab 2 — Lifestyle (read-only, from `checkpd.users`)
All fields displayed as description-list rows (label → value). If `checkpd.users` row is missing → show "ไม่มีข้อมูล CheckPD" banner in place of the list.

| Label | checkpd.users column |
|-------|----------------------|
| อาชีพ | `occupation` |
| รายได้ | `emolument` |
| สูบบุหรี่ | `smoking` |
| ดื่มสุรา | `alcohol` |
| ดื่มกาแฟ | `coffee` |
| ดื่มนม | `milk` |
| ออกกำลังกาย | `exercise` |
| สารกำจัดศัตรูพืช | `insecticide` |
| สารเสพติด | `narcotic` |
| ได้รับบาดเจ็บที่ศีรษะรุนแรง | `severe_head_injury` |

Note: `public.users` has these as SMALLINT (0/1). This tab shows the **checkpd text values** only and does not edit them. Add a small caption: "แก้ไขจากแอปมือถือ (CheckPD) เท่านั้น".

#### Tab 3 — Clinical
**Edit** (writes to `public.users`):
- `congenital_disease` → textarea

**Edit** (writes to `public.user_record_summary` for the matched `record_id`):
- `condition` → select from existing `conditionOptions` ([`app/types/user.ts`](../app/types/user.ts))
- `other` → text input

**Read-only from `checkpd.users`**:
- `diagnosis`
- `medicine`
- `level_respond_medicine`
- `relative`

**Read-only from `public.user_record_summary`**:
- `test_result` (trigger-computed)

Render the public-user-edit fields in a 2-column grid at the top of the tab; render the checkpd read-only fields in a bordered sub-card below with caption "ข้อมูลจาก CheckPD (อ่านอย่างเดียว)".

#### Zod schema (sketch)
```ts
// app/component/users/userEditSchema.ts
import { z } from 'zod'

export const userEditSchema = z.object({
  // Tab 1
  perfixname: z.string().max(50).nullish(),
  firstname: z.string().min(1, 'required').max(100),
  lastname: z.string().min(1, 'required').max(100),
  thaiid: z.string().regex(/^\d{13}$/).or(z.literal('')).nullish(),
  bod: z.string().nullish(), // ISO date
  gender: z.enum(['male', 'female', 'other']).nullish(),
  phonenumber: z.string().regex(/^\d{0,15}$/).nullish(),
  email: z.string().email().or(z.literal('')).nullish(),
  liveaddress: z.string().max(500).nullish(),
  idcardaddress: z.string().max(500).nullish(),
  province: z.string().nullish(),
  area: z.string().nullish(),
  educationstatus: z.string().nullish(),
  maritalstatus: z.string().nullish(),
  ethnicity: z.string().nullish(),
  // Tab 3 — public
  congenital_disease: z.string().nullish(),
  // Tab 3 — user_record_summary
  condition: z.string().nullish(),
  other: z.string().nullish(),
})

export type UserEditValues = z.infer<typeof userEditSchema>
```

Submission splits `condition` + `other` off into the record-summary update; the rest goes to `public.users`.

### 3. Detail Modal — new component

File: `app/component/users/UserDetailModal.tsx` (new).

Replaces the current `onViewDetail(user) → PatientHistoryModal` flow. `PatientHistoryModal` remains in the codebase and is **launched from inside** the new Detail modal when `pd_screenings` data exists for the `thaiid` (see §3.3 below). Do not delete `PatientHistoryModal.tsx`.

#### 3.1 Layout
- shadcn `Dialog` at `max-w-4xl`, scrollable body.
- Header: patient full name + badges (Risk / Condition — reuse `getRiskBadge` / `getConditionBadge` from current UserTable).
- Body: three sections in this order — **Profile**, **CheckPD Summary**, **Per-test Predictions**.
- Footer: close button + "ดูประวัติการคัดกรอง (pd_screenings)" button — shown only when `hasScreeningThaiId(thaiid)`. Clicking it opens `PatientHistoryModal` in a stacked modal (Detail modal stays mounted; pass a `stacked` prop or z-index bump if needed).

#### 3.2 Sections

**Profile** (grid, 2–3 columns, description-list style, read-only).
Source: `public.users` (fetched fresh on modal open, not from list row, to avoid stale data).
Fields: prefix, firstname, lastname, thaiid, bod (formatted dd/MM/yyyy), age, gender, phonenumber, email, liveaddress, idcardaddress, province, region, area, educationstatus, occupation (from checkpd if present, else public), maritalstatus, ethnicity, source, timestamp, lastupdate.

**CheckPD Summary** (new — replaces the `pd_screenings`-sourced data previously shown).
Source: `checkpd.record_summary` matched by `(user_id, recorder)`. If missing → show "ไม่มีข้อมูล CheckPD" empty state.
Fields (grid cards):
| Label | Column | Format |
|-------|--------|--------|
| Tremor resting | `tremor_resting_hz` | `X.XXX Hz` |
| Tremor postural | `tremor_postural_hz` | `X.XXX Hz` |
| Balance | `balance_hz` | `X.XXX Hz` |
| Gait | `gait_hz` | `X.XXX Hz` |
| Dual-tap left | `dual_tap_left_score` | integer |
| Dual-tap right | `dual_tap_right_score` | integer |
| Questionnaire | `questionnaire_total` | `X / 20` |
| Test result | `test_result` | text + tone badge |
| Condition | `condition` | text |
| Overall prediction | `prediction_risk` | Risk / No-risk / Unknown badge |

Add a sub-caption at the top of this section: "ข้อมูลจาก CheckPD มือถือ (อ่านอย่างเดียว)".

**Per-test Predictions** (new).
Source: join via `checkpd.records` (to get `record_pk` values for this `user_id`), then fetch rows from:
- `checkpd.vibration` (`test_type` ∈ tremorResting/tremorPostural/balance/gaitWalk)
- `checkpd.tap` (`test_type` ∈ dualTap/dualTapRight)
- `checkpd.pinch` (`test_type` ∈ pinchToSize/pinchToSizeRight)
- `checkpd.questionnaire`
- `checkpd.voice` (`test_type` ∈ voiceAhh/voiceYPL)
- `checkpd.prediction` (`prediction_type`, `risk`, `approver`, `note`)

Render as a single flat list ordered by `recorded_at DESC`. Each row:
```
[test_type pill] [risk badge] recorded_at (localised)  — approver/note if from prediction table
```

This is a dense diagnostic view; keep it compact. If total rows > 20, wrap in a `max-h-72 overflow-y-auto` container.

#### 3.3 pd_screenings handoff
- The existing `screeningThaiIds` computation in [`app/pages/users/page.tsx:78`](../app/pages/users/page.tsx) stays. Pass `hasScreeningThaiId` into UserDetailModal.
- Footer button "ดูประวัติการคัดกรอง" conditionally renders `PatientHistoryModal`, passing the same props currently used in `app/pages/users/page.tsx:270`.

---

## Fetch strategy

### 3.4 Detail modal fetch (`useDetailData(user)`)

Create a single hook in `app/component/users/useDetailData.ts` that, given `{ id, recorder }`, returns `{ loading, publicUser, recordSummary, checkpdUser, checkpdSummary, perTest }`.

```ts
// Parallel queries (Promise.all)
const [publicUser, recordSummary, checkpdUser, checkpdSummary, records] = await Promise.all([
  supabase.from('users').select('*').eq('id', id).maybeSingle(),
  recordId
    ? supabase.from('user_record_summary').select('*').eq('user_id', id).eq('record_id', recordId).maybeSingle()
    : Promise.resolve({ data: null, error: null }),
  supabase.schema('checkpd').from('users').select('*').eq('id', id).maybeSingle(),
  supabase.schema('checkpd').from('record_summary').select('*').eq('user_id', id).eq('recorder', recorder).maybeSingle(),
  supabase.schema('checkpd').from('records').select('id, record_id, recorder, recorded_at').eq('user_id', id),
])

// Then fan out per-test queries by record_pk list:
const recordPks = (records.data ?? []).map(r => r.id)
const [vib, tap, pinch, quest, voice, pred] = await Promise.all([
  supabase.schema('checkpd').from('vibration').select('test_type,prediction_risk,recorded_at,record_pk').in('record_pk', recordPks),
  supabase.schema('checkpd').from('tap').select('test_type,prediction_risk,recorded_at,record_pk').in('record_pk', recordPks),
  supabase.schema('checkpd').from('pinch').select('test_type,prediction_risk,recorded_at,record_pk').in('record_pk', recordPks),
  supabase.schema('checkpd').from('questionnaire').select('total,prediction_risk,recorded_at,record_pk').in('record_pk', recordPks),
  supabase.schema('checkpd').from('voice').select('test_type,prediction_risk,recorded_at,record_pk').in('record_pk', recordPks),
  supabase.schema('checkpd').from('prediction').select('risk,prediction_type,approver,note,created_at,record_pk').in('record_pk', recordPks),
])
```

If `recordPks.length === 0`, skip the per-test fan-out and return an empty array.

### 3.5 Edit modal fetch
Same pattern but smaller: just `public.users`, `public.user_record_summary`, `checkpd.users`. Three queries in parallel.

### 3.6 Supabase config prerequisite
`checkpd` must be exposed in Supabase's API settings (Studio → Settings → API → Exposed schemas). PLAN-006 presumably already added this. Verify before starting; if not exposed, the `.schema('checkpd')` calls silently return errors.

---

## File changes summary

| File | Action | Notes |
|------|--------|-------|
| [`app/pages/users/page.tsx`](../app/pages/users/page.tsx) | **Modify** | Remove inline-edit state + handlers; wire `UserEditModal` + `UserDetailModal`. Keep `screeningThaiIds` logic. |
| [`app/component/users/UserTable.tsx`](../app/component/users/UserTable.tsx) | **Modify** | Remove inline-edit branches; add `group` class on `<TableRow>`; add DropdownMenu trigger. Simplify props. |
| `app/component/users/UserActionsMenu.tsx` | **New** | Extracted DropdownMenu (Detail / Edit / Print). Accepts `user`, `hasScreeningThaiId`, `onEdit`, `onViewDetail`. |
| `app/component/users/UserEditModal.tsx` | **New** | Tabbed dialog, RHF + Zod, submit writes to `public.users` + `public.user_record_summary`. |
| `app/component/users/UserDetailModal.tsx` | **New** | Read-only modal, 3 sections, launches `PatientHistoryModal` when applicable. |
| `app/component/users/useDetailData.ts` | **New** | Parallel fetch hook. |
| `app/component/users/userEditSchema.ts` | **New** | Zod schema + inferred type. |
| [`app/component/users/PatientHistoryModal.tsx`](../app/component/users/PatientHistoryModal.tsx) | **Keep unchanged** | Still launched from UserDetailModal footer. |
| [`app/types/user.ts`](../app/types/user.ts) | **Modify (minor)** | Add any missing fields to `User` type that the new modals read (e.g. `lastupdate`, `educationstatus`, `maritalstatus`, `ethnicity`, `liveaddress`, `idcardaddress`, `phonenumber`, `email`, `perfixname`, `bod`, `congenital_disease`). |

---

## Acceptance criteria

1. Actions column shows only a 3-dot icon button. On desktop, it is invisible until the row is hovered or the menu is open. On mobile, it is always visible.
2. Menu items: **Detail**, **Edit**, **Print**. Detail is disabled when the user has no thaiid AND no checkpd record.
3. Clicking **Edit** opens a tabbed modal. Saving persists changes to `public.users` and/or `public.user_record_summary`, then refreshes the list.
4. Clicking **Detail** opens the new modal showing Profile (public.users), CheckPD Summary (`checkpd.record_summary`), and Per-test Predictions (vibration/tap/pinch/questionnaire/voice/prediction). No data is fetched from `pd_screenings` for these sections.
5. Detail modal footer shows "ดูประวัติการคัดกรอง" button only when `hasScreeningThaiId(thaiid)` is true; clicking it opens the existing `PatientHistoryModal`.
6. No inline row-editing remains in `UserTable.tsx`.
7. No writes touch `checkpd.*` tables.
8. `logActivity` is called after successful Edit (same call site as before).

---

## Risks / open questions

- **checkpd exposure**: if the Supabase API has not exposed the `checkpd` schema, every enrichment query fails silently. Add explicit `console.warn` on `.schema('checkpd')` errors during development.
- **`record_id` uniqueness across recorders**: the list view exposes one `(user_id, recorder, record_id)` triple per row. The Edit modal writes back using `(user_id, record_id)` — make sure the SQL `public.user_record_summary` has a unique constraint on `(user_id, record_id)` or use `(user_id, recorder)` instead. Verify before coding. [Based on `users.sql` lines 120-122, PK is `(user_id, recorder)`, so **use `(user_id, recorder)` in the update** — not `(user_id, record_id)`.]
- **Trigger overwrite of `province`**: users edit province + liveaddress simultaneously → trigger may override. Document in UI; no code change.
- **Performance of per-test fan-out**: six parallel queries per detail open. For heavy users (many records) this could be slow. Acceptable for first iteration; consider a server-side RPC later if needed.