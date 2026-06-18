# PLAN-022 — Bidirectional condition/other sync (public ↔ core) + structured `other` diagnosis

## Overview

Today the diagnosis `condition` and `other` text live in **two places that drift apart**:

- **Public side** — `public.user_record_summary.condition` / `.other`, edited by staff in
  [UserEditModal.tsx](../app/component/users/UserEditModal.tsx#L347). An existing trigger
  [`fn_mirror_condition_safe`](../app/pages/users/users.sql#L143) one-way mirrors this to
  `checkpd.record_summary` (copy verbatim).
- **Core side** — `core.patient_diagnosis_v2.condition` / `.other_diagnosis_text`, edited by doctors in
  [QaCreateModal.tsx](../app/component/qa/QaCreateModal.tsx#L335). Pushing the public value into core today
  is **manual** — a "ยืนยันใช้ CheckPD เป็น Main Condition" button in
  [CheckpdDataSection.tsx](../app/component/qa/CheckpdDataSection.tsx#L84) — and `other` is **never** synced into core.

This plan makes **public ↔ core** automatic and **two-way**, matched by `thaiid`, and at the same time
replaces the messy free-text `other` field with a **multi-select dropdown + custom free-text fallback**
(reusing the dropdown that already exists at
[other_diagnosis_dropdown.json](../app/component/questions/other_diagnosis_dropdown.json)).

### Reason for change

> "condition ฝั่ง public ไม่ว่าจะถูก input ฝั่ง public หรือ core ให้ข้อมูลมีทั้ง 2 ฝั่งเหมือนกัน ส่วน other
> รายละเอียด diag ให้ทำเหมือนกันด้วยทั้ง core และ public … ผมว่าจะทำ other เป็น option ให้เลือกดีกว่าเพราะตอนนี้
> มี free text เยอะมาก"

Staff (public) and doctors (core) edit the same patient from two surfaces; the record must converge.
And `other` free text is currently unusable for analysis — `other_format.md` shows ~100 values that are
the same diagnoses written many ways (`Cervical dystonia` / `(Cervical dystonia)` / `Mild cervical
dystonia`), with typos (`Anxlety`, `Stoke`), wrapping parens, `\r\n`, Thai/Eng mix, and multi-diagnosis
combos (`DM, HT, DLP, OSA`).

## Related plans

- [[PLAN-016]] / [[PLAN-017]] — Users export reads `user_record_summary.other` / core `*_v2` as **TEXT**.
  This plan must keep `other` columns TEXT so those exports keep working.
- [[PLAN-006]] — QA ↔ CheckPD merge keyed by `thaiid`; this plan reuses `thaiid` as the cross-schema key.
- [[PLAN-007]] — `UserEditModal` (the public `other`/`condition` editor refactored here).
- Supersedes the **manual** sync button in `CheckpdDataSection.tsx` (becomes redundant once auto-sync ships;
  keep as a read-only compare panel — see Edge cases).

## Decisions (confirmed with product owner)

| Question | Decision |
|---|---|
| Match key | `thaiid`; update **all rows** with the same `thaiid` on both sides |
| Conflict resolution | **last-write-wins** (current source-of-truth = public/staff; future = core/doctor) |
| `condition` values | canonical set is **`pd`, `ctrl`, `pdm`, `other`** (4 codes); normalize anything else into these; `pksm` removed from the dropdown, legacy `pksm` → `other` |
| Core row missing | if a thaiid has **no** diagnosis row at all, insert one for the **latest** visit only |
| `other` storage | keep **TEXT** in existing columns; multi-select serialized as `"; "`-joined string |
| `other` UI | **multi-select** from shared dropdown **+ a custom free-text** entry for items not in the list |
| Legacy `other` backfill | **lazy** — old free text stays as-is (shown as "custom"); converted only when re-saved |

## Scope

### In scope

1. **DB — bidirectional sync** between `public.user_record_summary` and `core.patient_diagnosis_v2`,
   keyed by `thaiid`, for `condition` and `other` ↔ `other_diagnosis_text`. Keep the existing
   `checkpd.record_summary` mirror in sync too.
2. **DB — `fn_normalize_condition(text) → text`** that collapses any input to one of `pd|ctrl|pdm|other`
   (or NULL). Used on every write so both sides store the same code even if a surface sends a long form.
3. **DB — loop prevention** via a transaction-local guard so the two triggers cannot recurse.
4. **UI — `other` multi-select** on both editors (`UserEditModal` public, `QaCreateModal` core),
   reusing `other_diagnosis_dropdown.json`, serialized to `"; "`-joined TEXT, with a custom free-text row.
5. Shared parse/serialize helper + a shared `OtherDiagnosisSelect` component used by both surfaces.

### Out of scope

- Changing `other`/`other_diagnosis_text` column **type** (stays `TEXT` — do **not** move to array/JSON;
  it would break the existing mirror trigger, CSV export, and checkpd mirror).
- Destructive cleanup/normalization of historical `other` free text (lazy migration only).
- Syncing any field other than `condition` and `other`.
- Editing the dropdown taxonomy itself (use the existing JSON; additions are a separate task).
- `checkpd.record_summary` → core direct sync (checkpd stays a mirror target driven by the public row,
  as today).

## Preflight checks

```bash
# 1. Confirm the existing public trigger + function shape
grep -n "fn_mirror_condition_safe\|tg_mirror_condition_safe" app/pages/users/users.sql

# 2. Confirm core diagnosis columns + that patients_v2 carries thaiid (the join bridge)
grep -n "other_diagnosis_text\|condition\b\|thaiid" app/pages/qa/core_schema.sql

# 3. Confirm both editors and the values they write
grep -n "user_record_summary\|condition\|other" app/component/users/UserEditModal.tsx
grep -n "patient_diagnosis_v2\|other_diagnosis_text\|condition" app/component/qa/QaCreateModal.tsx

# 4. Confirm the shared dropdown exists + how papers already consumes it (category → diagnosis → Custom)
cat app/component/questions/other_diagnosis_dropdown.json | head -5
grep -n "other_diagnosis_dropdown\|otherCategories\|Custom" app/component/papers/EditModal.tsx

# 5. Confirm export reads other as TEXT (must stay TEXT)
grep -n '"other"\|other_diagnosis_text' app/api/export/users-csv/route.ts
```

## Data model

**No column type changes.** All four fields stay `TEXT`:

| Side | Table | condition col | other col |
|---|---|---|---|
| public | `public.user_record_summary` | `condition` | `other` |
| core | `core.patient_diagnosis_v2` | `condition` | `other_diagnosis_text` |
| mirror | `checkpd.record_summary` | `condition` | `other` |

Cross-schema key: `thaiid`.
- `public.user_record_summary.thaiid` — present directly (`varchar(20)`).
- `core.patient_diagnosis_v2` has **no** thaiid — resolve via
  `patient_diagnosis_v2.patient_id → core.patients_v2.id → patients_v2.thaiid`.

### `other` serialization contract

- In DB: a single `TEXT`, multiple selections joined with `"; "`, e.g.
  `"Cervical dystonia; Constipation"`. A trailing custom free-text item is appended as-is.
- In UI: parsed by splitting on `";"` and trimming. Any token **not** found in the dropdown is treated as
  a "custom" chip (so legacy free text round-trips without data loss).
- Empty selection → `NULL`.

## Sync architecture

One central `SECURITY DEFINER` function writes all three tables under a transaction-local guard; both
triggers call it. The guard + `IS DISTINCT FROM` predicates make recursion terminate immediately.

```
 UserEditModal (staff) ──update──► public.user_record_summary ─┐
                                                               ├─ trigger ─► fn_sync_diagnosis(thaiid, cond, other, 'public')
 QaCreateModal (doctor) ─update──► core.patient_diagnosis_v2 ──┘                         │
                                                                                         ▼
                                          ┌──────── normalize condition → pd|ctrl|pdm|other ───────┐
                                          ▼                        ▼                               ▼
                              public.user_record_summary   checkpd.record_summary       core.patient_diagnosis_v2
                              (all rows WHERE thaiid=…)     (all rows WHERE thaiid=…)     (all visits WHERE patients_v2.thaiid=…)
                              guarded by IS DISTINCT FROM   guarded by IS DISTINCT FROM   guarded by IS DISTINCT FROM
```

### `fn_normalize_condition` (mirror of `normalizeQaConditionValue` in TS)

```sql
CREATE OR REPLACE FUNCTION public.fn_normalize_condition(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN lower(btrim(p)) IN ('', '-', 'null', 'ไม่ระบุ') THEN NULL
    WHEN lower(btrim(p)) = 'pd'   OR lower(p) LIKE '%parkinson%' OR lower(p) LIKE '%newly diagnosis%' THEN 'pd'
    WHEN lower(btrim(p)) = 'pdm'  OR lower(p) LIKE '%prodromal%' OR lower(p) LIKE '%high risk%' OR lower(p) LIKE '%high-risk%' THEN 'pdm'
    WHEN lower(btrim(p)) = 'ctrl' OR lower(p) LIKE '%control%'   OR lower(p) LIKE '%healthy%'   OR lower(btrim(p)) = 'normal' THEN 'ctrl'
    WHEN lower(btrim(p)) = 'other' OR lower(p) LIKE '%other diagnosis%' THEN 'other'
    ELSE 'other'   -- legacy 'pksm' + any unknown code → 'other' (see Edge case 1)
  END;
$$;
```

### Central sync function (sketch — final at Codex's discretion)

```sql
CREATE OR REPLACE FUNCTION public.fn_sync_diagnosis(
  p_thaiid text, p_condition text, p_other text, p_source text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, checkpd, core
AS $$
DECLARE v_cond text;
BEGIN
  IF p_thaiid IS NULL OR btrim(p_thaiid) = '' THEN RETURN; END IF;
  -- re-entrancy guard: if a nested trigger already started a sync this txn, bail.
  IF current_setting('app.diag_sync', true) = 'on' THEN RETURN; END IF;
  PERFORM set_config('app.diag_sync', 'on', true);  -- true = transaction-local

  v_cond := public.fn_normalize_condition(p_condition);

  -- 1) public: all rows for this thaiid (IS DISTINCT FROM keeps it a no-op when unchanged)
  UPDATE public.user_record_summary
     SET condition = v_cond, other = p_other, updated_at = now()
   WHERE thaiid = p_thaiid
     AND (condition IS DISTINCT FROM v_cond OR other IS DISTINCT FROM p_other);

  -- 2) checkpd mirror: all rows for this thaiid
  BEGIN
    UPDATE checkpd.record_summary
       SET condition = v_cond, other = p_other, updated_at = now()
     WHERE thaiid = p_thaiid
       AND (condition IS DISTINCT FROM v_cond OR other IS DISTINCT FROM p_other);
  EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
    RAISE WARNING 'checkpd.record_summary missing — skip mirror';
  END;

  -- 3) core: every diagnosis row whose patient (visit) shares this thaiid
  UPDATE core.patient_diagnosis_v2 d
     SET condition = v_cond, other_diagnosis_text = p_other, updated_at = now()
    FROM core.patients_v2 pt
   WHERE d.patient_id = pt.id
     AND pt.thaiid = p_thaiid
     AND (d.condition IS DISTINCT FROM v_cond OR d.other_diagnosis_text IS DISTINCT FROM p_other);

  -- 3b) if NO diagnosis row exists for any visit of this thaiid, insert ONE for the LATEST visit
  --     (latest = patients_v2 max collection_date, tie-break max id). See Edge case 4.
  --     Do not spawn rows on older visits.
END;
$$;
```

### Triggers

```sql
-- PUBLIC: replaces the body of fn_mirror_condition_safe with a call to the central fn.
CREATE OR REPLACE FUNCTION public.fn_mirror_condition_safe() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, checkpd, core AS $$
BEGIN
  PERFORM public.fn_sync_diagnosis(NEW.thaiid, NEW.condition, NEW.other, 'public');
  RETURN NULL;
END $$;
-- existing tg_mirror_condition_safe trigger stays (AFTER UPDATE, WHEN condition/other distinct).

-- CORE: new trigger on patient_diagnosis_v2 (lives in core_schema.sql).
CREATE OR REPLACE FUNCTION core.tg_sync_diagnosis_to_public() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, checkpd, core AS $$
DECLARE v_thaiid text;
BEGIN
  SELECT thaiid INTO v_thaiid FROM core.patients_v2 WHERE id = NEW.patient_id;
  PERFORM public.fn_sync_diagnosis(v_thaiid, NEW.condition, NEW.other_diagnosis_text, 'core');
  RETURN NULL;
END $$;

CREATE TRIGGER tg_sync_diagnosis_to_public
AFTER INSERT OR UPDATE ON core.patient_diagnosis_v2
FOR EACH ROW WHEN (
  pg_trigger_depth() = 1  -- belt-and-suspenders alongside the app.diag_sync guard
)
EXECUTE FUNCTION core.tg_sync_diagnosis_to_public();
```

> **Loop safety:** `app.diag_sync` (transaction-local via `set_config(..., true)`) makes every nested
> trigger invocation return immediately; the `IS DISTINCT FROM` predicates make the writes no-ops once
> values converge. `pg_trigger_depth()=1` is an extra guard on the core trigger. Verify with the
> recursion test in the checklist.

## UI structure — `other` multi-select

Reuse the category→diagnosis shape already in
[other_diagnosis_dropdown.json](../app/component/questions/other_diagnosis_dropdown.json).

Taxonomy source: [other_diagnosis_dropdown.json](../app/component/questions/other_diagnosis_dropdown.json)
— **12 disease groups + a "General / สถานะทั่วไป" group** (reviewed by the clinician). Schema stays
`{ category, diagnosis: string[] }`; the diagnosis string is both the display label and the stored value.

```
Other diagnosis
┌───────────────────────────────────────────────┐
│ [Cervical dystonia ✕] [Constipation ✕]  …chips │   ← selected (joined "; " on save)
│ ── เลือกเพิ่ม (กลุ่ม) ─────────────────────────── │
│  Tremor & Movement ▸  Sleep ▸  Cognitive ▸  …   │   ← grouped picker (Command/Combobox)
│ ┌ when "Spinocerebellar ataxia (SCA)" picked ─┐ │
│ │  Type: [ 1–50 ▼ ]  (dependent; hidden else) │ │   ← SCA type sub-selector (rule below)
│ └─────────────────────────────────────────────┘ │
│ ── อื่นๆ / Others (please specify) ───────────── │
│  [_______________________________] + เพิ่ม       │   ← always-present custom free-text → chip
└───────────────────────────────────────────────┘
```

- New shared component `app/component/diagnosis/OtherDiagnosisSelect.tsx` — props
  `{ value: string | null; onChange: (next: string | null) => void }`. Internally parses the `"; "`
  string into chips, renders the grouped picker + the always-present custom input, serializes back on change.
- New helper `lib/otherDiagnosis.ts`: `parseOther(text): string[]`, `serializeOther(items): string | null`,
  and `isCustom(item, taxonomy): boolean` (a chip not in the dropdown renders in a "custom" tone).
- `UserEditModal.tsx` — replace `<FormInput label="Other" .../>` ([:481](../app/component/users/UserEditModal.tsx#L481))
  with `<OtherDiagnosisSelect value={form.watch('other')} onChange={(v)=>form.setValue('other', v)} />`.
- `QaCreateModal.tsx` — replace the `other_diagnosis_text` text input with the same component.
- Legacy free text loads as one or more custom chips (split on `;`), so nothing is lost and the doctor can
  swap individual chips for canonical options on the next save (lazy migration).

### Clinician-confirmed UI rules (V1)

1. **SCA dependent type selector.** When `"Spinocerebellar ataxia (SCA)"` is selected, reveal a dependent
   `Type` dropdown of integers **1–50**; hide/disable it for every other selection. The chip serializes
   as `"Spinocerebellar ataxia (SCA) type <n>"` (e.g. `"Spinocerebellar ataxia (SCA) type 7"`). On parse,
   a chip matching that prefix re-populates the type selector. **Do not** route the type into the free-text
   box — keep it structured so it is analysable later. Until a type is chosen, store the bare SCA label.
2. **"Others (please specify)" = the custom free-text input.** It is always visible at the bottom; a typed
   value is appended as a custom chip. No separate fake `"Others"` option in the JSON — the input *is* the
   "others" affordance. This is the deliberate fallback for diagnoses not in the 12 groups
   (e.g. clinician-dropped items like Hyposmia / Migraine).
3. **"Normal / No significant findings".** Selectable from the `General / สถานะทั่วไป` group so an empty
   `other` ("not filled") is never ambiguous with an explicit "normal" finding.
4. **Synonym labels (`/`).** Kept as single combined options as the clinician grouped them. The `"; "`
   serializer is safe with `/` and `,` inside a label (split on `;` only). *(Future polish: show the
   synonym tail as an `(i)` tooltip instead of inline — out of scope for V1.)*
5. **Label = value (V1).** English term + Thai gloss live together in the one stored string, per clinician
   sign-off. *(Future: split DB into `code` / `label_en` / `description_th` for analytics — out of scope.)*

## Files to create / modify

| File | Change |
|---|---|
| [app/pages/users/users.sql](../app/pages/users/users.sql) | Add `fn_normalize_condition`; add central `fn_sync_diagnosis`; rewrite `fn_mirror_condition_safe` body to call it (keep `tg_mirror_condition_safe` trigger + its `WHEN` clause). |
| [app/pages/qa/core_schema.sql](../app/pages/qa/core_schema.sql) | Add `core.tg_sync_diagnosis_to_public()` + `tg_sync_diagnosis_to_public` trigger on `core.patient_diagnosis_v2`. Document the cross-schema sync here too. |
| `lib/otherDiagnosis.ts` *(new)* | `parseOther` / `serializeOther` / `isCustom` pure helpers + SCA helpers (`isSca(item)`, `parseScaType(item)`, `serializeSca(n)` for the `"… type <n>"` convention). |
| `app/component/diagnosis/OtherDiagnosisSelect.tsx` *(new)* | Shared multi-select + always-present custom free-text + dependent SCA type (1–50) selector; reads `other_diagnosis_dropdown.json` (12 groups + General). |
| [app/component/questions/other_diagnosis_dropdown.json](../app/component/questions/other_diagnosis_dropdown.json) | *(done)* Clinician-reviewed taxonomy: 12 disease groups + `General / สถานะทั่วไป` (Normal). SCA stored as a single clean label (type handled by the component). |
| [app/component/users/UserEditModal.tsx](../app/component/users/UserEditModal.tsx) | Swap the `other` text input for `OtherDiagnosisSelect`. No change to the `condition` `<select>`. |
| [app/component/qa/QaCreateModal.tsx](../app/component/qa/QaCreateModal.tsx) | Swap the `other_diagnosis_text` input for `OtherDiagnosisSelect`. |
| [app/component/qa/CheckpdDataSection.tsx](../app/component/qa/CheckpdDataSection.tsx) | Demote the manual "ยืนยันใช้ CheckPD เป็น Main Condition" button to a read-only compare panel (auto-sync makes the write redundant), or remove it. Keep `mapCheckpdConditionToCore` only if still referenced. |
| [app/types/user.ts](../app/types/user.ts#L45) | Remove the `pksm` entry from `conditionOptions` (canonical set = `pd/ctrl/pdm/other` + `Not specified`). |

No new npm dependencies (shadcn `Command`/`Popover` already in the project for the combobox).

## Edge cases & rules

1. **`pksm` (and any unknown code) — DECIDED.** Remove `pksm` from the public dropdown
   ([app/types/user.ts:45](../app/types/user.ts#L45)) so staff can no longer select it. Legacy rows that
   already hold `pksm` (and any other unknown code) are normalized to `'other'` by `fn_normalize_condition`
   the next time they sync. Canonical set stays exactly `pd | ctrl | pdm | other`.
2. **`thaiid` missing / blank.** If the edited row has no `thaiid`, `fn_sync_diagnosis` returns early —
   no cross-side write. The local row keeps its value. (Matches today's `record_id IS NULL` early-return.)
3. **One thaiid → many rows.** All public rows and **all core visits** for the thaiid are overwritten with
   the latest edit (per the "all rows" decision). This is intentional last-write-wins; document it for
   staff so they know an edit is patient-wide, not record-wide.
4. **Core visit exists but has no `patient_diagnosis_v2` row — DECIDED.** If at least one diagnosis row
   exists for the thaiid, update those (step 3) only. If **none** exists across all visits, insert exactly
   **one** row for the **latest** visit (max `collection_date`, tie-break max `id`) — step 3b. Never spawn
   diagnosis rows on older visits.
5. **No core patient at all (thaiid not yet in `patients_v2`).** Nothing to write on the core side — fine;
   it will converge when the patient is registered in QA (the public value is already stored).
6. **Recursion.** The `app.diag_sync` guard + `IS DISTINCT FROM` must make a single edit produce exactly
   one write per table and then stop. Verify there is no infinite loop (checklist).
7. **`other` round-trip.** `parseOther(serializeOther(x)) === x` for canonical items; legacy free text with
   embedded `;` or `,` must not be mangled — split on `";"` only, never on `,` (combos like `DM, HT` stay
   one custom chip).
8. **Export compatibility.** `other` / `other_diagnosis_text` remain TEXT; PLAN-016/017 CSV export is
   unaffected (it already emits the raw string).
9. **`updated_at` touch.** Each sync write sets `updated_at = now()`; ensure this does not fight the
   `tg_last_update_gcp` BEFORE-UPDATE trigger on `user_record_summary`.

## Verification checklist

- [ ] `fn_normalize_condition('Prodromal') = 'pdm'`, `('Newly diagnosis')='pd'`, `('Control')='ctrl'`,
      `('-')` / `('')` / `(NULL)` → `NULL`.
- [ ] Edit `condition` in `UserEditModal` (public) → `core.patient_diagnosis_v2.condition` for every visit
      of that thaiid becomes the same code; `checkpd.record_summary` too.
- [ ] Edit `condition` in `QaCreateModal` (core) → `public.user_record_summary.condition` for all rows of
      that thaiid converges; `checkpd` too.
- [ ] Same two directions for `other` ↔ `other_diagnosis_text` (verbatim copy).
- [ ] **Recursion test:** a single `UPDATE` produces one write per table, no infinite loop
      (check `pg_stat_activity` / server log; the txn commits promptly).
- [ ] Editing a patient with **two** `user_record_summary` rows updates **both**.
- [ ] Patient whose thaiid has visits but **zero** diagnosis rows → exactly one row inserted for the
      latest visit; older visits get none.
- [ ] `other` multi-select: pick 2 options + 1 custom → DB stores `"A; B; custom text"`; reopen → 3 chips,
      custom rendered as custom.
- [ ] Legacy free-text `other` (e.g. `"DM, HT, DLP, OSA"`) loads as a single custom chip, unmangled.
- [ ] Selecting "Spinocerebellar ataxia (SCA)" reveals the Type 1–50 selector; choosing 7 stores
      `"Spinocerebellar ataxia (SCA) type 7"`; reopen → SCA chip + Type=7 restored; type selector hidden
      for non-SCA selections.
- [ ] "Normal / No significant findings" is selectable and stored distinctly from an empty `other`.
- [ ] Typing in the "Others (please specify)" box appends a custom chip; no separate `Others` option exists
      in the JSON.
- [ ] `pksm` no longer appears in the `UserEditModal` condition dropdown; a legacy `pksm` row normalizes
      to `other` on its next sync.
- [ ] PLAN-016/017 CSV export still emits the `other` string correctly.
- [ ] `npx tsc --noEmit` + `npm run lint` + `npm run build` clean.

## Rollback plan

- **DB:** `DROP TRIGGER tg_sync_diagnosis_to_public ON core.patient_diagnosis_v2;` and restore
  `fn_mirror_condition_safe` to its previous body (public→checkpd only). `fn_normalize_condition` /
  `fn_sync_diagnosis` can be left in place (unused) or dropped. No column changes to undo.
- **UI:** revert the two editors to their text `other` inputs; delete `OtherDiagnosisSelect.tsx` +
  `lib/otherDiagnosis.ts`. Existing `"; "`-joined values still display fine as plain text.
- Data already written stays valid (all TEXT); no migration to reverse.

## Out-of-scope follow-ups

- **PLAN-023 (candidate):** one-off best-effort backfill that maps high-confidence legacy `other` strings
  (exact/normalized matches) to canonical dropdown items, leaving the rest as custom.
- Expand `other_diagnosis_dropdown.json` from the residual custom values after a few weeks of usage.
- Per-row (not per-thaiid) sync option if staff later need record-level divergence.
