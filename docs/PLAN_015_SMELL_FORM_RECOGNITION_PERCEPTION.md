# PLAN-015: Smell test — add per-item recognition + perception flags

## Overview

Extend the Sniffin-Stick / Thai smell test ([`QaSmellForm.tsx`](../app/component/qa/forms/QaSmellForm.tsx)) so each of the 16 odors records **two extra clinical observations** alongside the existing 4-choice answer:

1. **รู้จักกลิ่น** — does the patient recognise/know this odor at all? (yes / no)
2. **ได้กลิ่น** — can the patient actually smell anything on the stick? (yes / no)

These are independent of correctness. A patient may be able to *smell* something but not *recognise* what it is, or *recognise* the family of the odor but pick the wrong sub-option. The doctor wants both signals so anosmia (no perception) can be distinguished from agnosia (perceives but can't name).

Two summary counts are derived and stored on save:
- `recognize_count` — how many of the 16 the patient recognised
- `perceive_count` — how many of the 16 the patient could smell

The existing `total_score` (correct-answer count out of 16) and `smell_NN_answer` columns stay unchanged for backward compatibility — historical records without the new flags must keep working.

**Related plans**:
- PLAN-003 — assessment threshold redesign. This plan does not change the clinical cutoff for `total_score`; new counts are additive only.
- PLAN-004 — summary modal redesign. The new counts surface inside the smell row of the summary modal.

---

## Approaches considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Wide columns** (32 booleans + 2 counts) | Matches existing `smell_NN_answer` pattern, simple SQL, type-safe, zero refactor of read paths that only need `total_score` | Table grows from 21 → 55 columns | ✅ **Recommended** |
| JSONB blobs (`recognize_flags`, `perceive_flags`) | No further migration if smells change | Filtering "who couldn't smell #5" is awkward, no type check, breaks consistency with `smell_NN_answer` | ❌ Rejected |
| Child table `smell_responses(test_id, smell_no, recognize, perceive)` | Cleanest data model | JOIN everywhere, refactor all 7 read sites, overkill for fixed 16-item test | ❌ Rejected |

The 16-question set is **fixed clinical content** — the Sniffin-Stick test will not grow new items. Wide columns are the right tool for a fixed-arity questionnaire.

---

## Scope

### In scope
1. **DB migration** — add 32 BOOLEAN columns (`smell_NN_recognize`, `smell_NN_perceive` for `NN = 01..16`) and 2 INTEGER columns (`recognize_count`, `perceive_count`) to `core.smell_test_v2`. Defaults `NULL` (no value = doctor hasn't recorded). Update [`app/pages/qa/core_schema.sql`](../app/pages/qa/core_schema.sql) as the canonical reference.
2. **Form refactor** — [`app/component/qa/forms/QaSmellForm.tsx`](../app/component/qa/forms/QaSmellForm.tsx):
   - Extend `QUESTIONS` records with `recognizeKey` and `perceiveKey`.
   - Add two rows of toggles per question cell (รู้จักกลิ่น / ได้กลิ่น).
   - Compute `recognize_count` + `perceive_count` on save.
   - Read all 35 columns when prefilling (existing rows may have NULL for the new columns — handle gracefully).
3. **Summary visibility** — [`app/component/qa/QaPatientSummaryModal.tsx`](../app/component/qa/QaPatientSummaryModal.tsx): include `recognize_count` + `perceive_count` in the smell row alongside `total_score`. Render as "12/16 รู้จัก · 14/16 ได้กลิ่น · คะแนน 10/16".
4. **Type updates** — wherever `QaScoreRow` or smell-row types live, extend with the two new optional count fields.

### Out of scope
1. **PDF templates** ([`app/api/qa-pdf/route.tsx`](../app/api/qa-pdf/route.tsx), [`app/api/qa-pdf-v1/route.ts`](../app/api/qa-pdf-v1/route.ts)) — currently only render `total_score`. Add the new counts in a follow-up PLAN once clinicians review the on-screen version.
2. **QA list table column** — do not add a column to [`QaTable.tsx`](../app/component/qa/QaTable.tsx); detail-only for v1.
3. **Backfilling historical records** — old rows keep NULL on the new columns. Counts derived only when a doctor opens and saves the form again.
4. **Cross-form aggregate filters** — no new filter on `/pages/qa` for "recognized < N" — out of scope.
5. **`smell_NN_answer` semantics change** — existing answer column stays untouched. `total_score` formula unchanged.
6. **Anosmia / agnosia interpretation labels** — keeping the existing `getInterpretation(score)` thresholds. Doctor-facing labels for the new counts are a clinical decision out of scope.

---

## Preflight checks (run before coding)

```bash
# 1. Confirm the current column set on smell_test_v2 in Supabase matches core_schema.sql.
#    Run in Supabase SQL editor:
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'core' AND table_name = 'smell_test_v2'
  ORDER BY ordinal_position;
# Expected: id, patient_id, test_type, smell_01_answer..smell_16_answer, total_score, created_at

# 2. Confirm no row already uses a column named smell_NN_recognize / smell_NN_perceive
#    (sanity guard against partial prior migrations)
SELECT count(*) FROM information_schema.columns
  WHERE table_schema='core' AND table_name='smell_test_v2'
    AND (column_name LIKE 'smell\_%\_recognize' ESCAPE '\' OR column_name LIKE 'smell\_%\_perceive' ESCAPE '\');
# Expected: 0

# 3. Identify every smell_test_v2 read site (already inventoried — verify nothing has been added):
grep -rn "smell_test_v2" app/ lib/
# Expected: 7 read sites (qa page, summary modal, create modal, assessment modal, 2 PDF routes, useDetailData, UserEditModal); only QaSmellForm writes
```

---

## Phase 1 — DB migration

File: [`app/pages/qa/core_schema.sql`](../app/pages/qa/core_schema.sql) — update the canonical schema definition.

Migration SQL to apply directly in Supabase SQL editor (and append to `core_schema.sql` for the record):

```sql
-- PLAN-015: Recognition + perception flags per smell item
ALTER TABLE core.smell_test_v2
  ADD COLUMN smell_01_recognize BOOLEAN NULL,
  ADD COLUMN smell_02_recognize BOOLEAN NULL,
  ADD COLUMN smell_03_recognize BOOLEAN NULL,
  ADD COLUMN smell_04_recognize BOOLEAN NULL,
  ADD COLUMN smell_05_recognize BOOLEAN NULL,
  ADD COLUMN smell_06_recognize BOOLEAN NULL,
  ADD COLUMN smell_07_recognize BOOLEAN NULL,
  ADD COLUMN smell_08_recognize BOOLEAN NULL,
  ADD COLUMN smell_09_recognize BOOLEAN NULL,
  ADD COLUMN smell_10_recognize BOOLEAN NULL,
  ADD COLUMN smell_11_recognize BOOLEAN NULL,
  ADD COLUMN smell_12_recognize BOOLEAN NULL,
  ADD COLUMN smell_13_recognize BOOLEAN NULL,
  ADD COLUMN smell_14_recognize BOOLEAN NULL,
  ADD COLUMN smell_15_recognize BOOLEAN NULL,
  ADD COLUMN smell_16_recognize BOOLEAN NULL,
  ADD COLUMN smell_01_perceive  BOOLEAN NULL,
  ADD COLUMN smell_02_perceive  BOOLEAN NULL,
  ADD COLUMN smell_03_perceive  BOOLEAN NULL,
  ADD COLUMN smell_04_perceive  BOOLEAN NULL,
  ADD COLUMN smell_05_perceive  BOOLEAN NULL,
  ADD COLUMN smell_06_perceive  BOOLEAN NULL,
  ADD COLUMN smell_07_perceive  BOOLEAN NULL,
  ADD COLUMN smell_08_perceive  BOOLEAN NULL,
  ADD COLUMN smell_09_perceive  BOOLEAN NULL,
  ADD COLUMN smell_10_perceive  BOOLEAN NULL,
  ADD COLUMN smell_11_perceive  BOOLEAN NULL,
  ADD COLUMN smell_12_perceive  BOOLEAN NULL,
  ADD COLUMN smell_13_perceive  BOOLEAN NULL,
  ADD COLUMN smell_14_perceive  BOOLEAN NULL,
  ADD COLUMN smell_15_perceive  BOOLEAN NULL,
  ADD COLUMN smell_16_perceive  BOOLEAN NULL,
  ADD COLUMN recognize_count    INTEGER NULL,
  ADD COLUMN perceive_count     INTEGER NULL;

COMMENT ON COLUMN core.smell_test_v2.smell_01_recognize IS 'รู้จักกลิ่น #1: true=ใช่, false=ไม่ใช่, NULL=ยังไม่ระบุ';
COMMENT ON COLUMN core.smell_test_v2.smell_01_perceive  IS 'ได้กลิ่น #1: true=ได้, false=ไม่ได้, NULL=ยังไม่ระบุ';
COMMENT ON COLUMN core.smell_test_v2.recognize_count    IS 'จำนวนกลิ่นที่ผู้ป่วยรู้จัก (0-16). คำนวณ client-side ตอน upsert';
COMMENT ON COLUMN core.smell_test_v2.perceive_count     IS 'จำนวนกลิ่นที่ผู้ป่วยได้กลิ่น (0-16). คำนวณ client-side ตอน upsert';
```

### Rules
- **Defaults stay NULL**, not `false`. NULL means "doctor hasn't recorded this yet" — important for distinguishing "not asked" vs "explicitly No".
- **No CHECK constraint** for `recognize_count` / `perceive_count` (allow NULL for historical rows). If desired, add `CHECK (recognize_count BETWEEN 0 AND 16)` in a follow-up after backfill stories settle.
- **No index needed** — these columns are read with the row, never filtered on alone.
- **No backfill**. Old rows stay NULL forever unless reopened.

---

## Phase 2 — `QaSmellForm.tsx` refactor

File: [`app/component/qa/forms/QaSmellForm.tsx`](../app/component/qa/forms/QaSmellForm.tsx)

### Type & question table extension

```ts
type SmellQuestion = {
  no: number              // 1..16
  answerKey: string       // 'smell_01_answer'
  recognizeKey: string    // 'smell_01_recognize'
  perceiveKey: string     // 'smell_01_perceive'
  label: string
  options: string[]
  correct: string
}

const QUESTIONS: SmellQuestion[] = [
  { no:  1, answerKey: 'smell_01_answer', recognizeKey: 'smell_01_recognize', perceiveKey: 'smell_01_perceive', label: 'กลิ่นที่ 1',  options: ['A. ส้ม','B. สตรอเบอรี','C. แบล็กเบอร์รี','D. สับปะรด'],   correct: 'A' },
  // ... 15 more, one per existing entry
]
```

### Form state shape

Use **three separate state maps** so a NULL boolean stays distinct from `false`:

```ts
type AnswerMap    = Record<string, string>            // 'smell_NN_answer' -> 'A'|'B'|'C'|'D'|''
type FlagMap      = Record<string, boolean | null>    // 'smell_NN_recognize' -> true|false|null

const [answers,    setAnswers]    = useState<AnswerMap>(EMPTY_ANSWERS)
const [recognize,  setRecognize]  = useState<FlagMap>(EMPTY_FLAGS)   // null = not answered
const [perceive,   setPerceive]   = useState<FlagMap>(EMPTY_FLAGS)
```

### Computed counts

```ts
const score             = QUESTIONS.filter((q) => answers[q.answerKey] === q.correct).length
const recognize_count   = QUESTIONS.filter((q) => recognize[q.recognizeKey] === true).length
const perceive_count    = QUESTIONS.filter((q) => perceive[q.perceiveKey]   === true).length
```

Show all three in the summary strip at the bottom of the modal:

```
คะแนน 10 / 16  ·  รู้จัก 12 / 16  ·  ได้กลิ่น 14 / 16  —  ปกติ (≥ 12)
```

### Upsert payload

```ts
const payload = {
  patient_id: patientId,
  test_type: 'sniffin_stick',
  ...answers,                                              // 16 cols
  ...recognize,                                            // 16 cols
  ...perceive,                                             // 16 cols
  total_score: score,
  recognize_count,
  perceive_count,
}
await supabase.schema('core').from('smell_test_v2')
  .upsert(payload, { onConflict: 'patient_id' })
```

### Read path (prefill)

Extend the SELECT column list to include all 32 new columns + 2 counts:

```ts
const allKeys = QUESTIONS.flatMap((q) => [q.answerKey, q.recognizeKey, q.perceiveKey])
const cols = [...allKeys, 'total_score', 'recognize_count', 'perceive_count'].join(',')
```

Map nullable booleans carefully — Supabase returns `null` for unset BOOLEAN, never `false`:

```ts
const nextRecognize: FlagMap = {}
const nextPerceive:  FlagMap = {}
for (const q of QUESTIONS) {
  nextRecognize[q.recognizeKey] = data[q.recognizeKey] ?? null
  nextPerceive[q.perceiveKey]   = data[q.perceiveKey]  ?? null
}
```

### UI layout per question cell

Existing layout: cell width 50% of dialog, contains label + 4 answer chips inline.

New layout (still 2-col grid on desktop, full-width on mobile):

```
┌──────────────────────────────────────────────────────────┐
│ 1. กลิ่นที่ 1                                              │
│ [A. ส้ม] [B. สตรอเบอรี] [C. แบล็กเบอร์รี] [D. สับปะรด]  ✓  │
│ ────────────────────────────────────────────────────────  │
│ รู้จักกลิ่น:  [ ใช่ ]  [ ไม่ใช่ ]                            │
│ ได้กลิ่น:    [ ได้ ]  [ ไม่ได้ ]                            │
└──────────────────────────────────────────────────────────┘
```

- Toggle group style: same chip-button style as the answer options, but smaller and a different tone (slate/teal) to visually separate from correctness chips.
- Active selection: filled chip; unselected: outline only.
- A toggle with `null` state shows both buttons outline-only (no selection). Doctor must click to commit.
- On mobile (`md:` breakpoint), drop to single column for breathing room.

### Tri-state click semantics

Clicking an already-active toggle should **un-set it** (back to `null`). This lets doctors correct mistakes without an explicit reset button:

```ts
const setFlag = (map: 'recognize' | 'perceive', key: string, next: boolean) => {
  const setter = map === 'recognize' ? setRecognize : setPerceive
  setter((prev) => ({ ...prev, [key]: prev[key] === next ? null : next }))
}
```

---

## Phase 3 — Surface counts in the patient summary modal

File: [`app/component/qa/QaPatientSummaryModal.tsx`](../app/component/qa/QaPatientSummaryModal.tsx)

Currently the smell fetch is:

```ts
supabase.schema('core').from('smell_test_v2').select('patient_id,total_score').in('patient_id', patientIds)
```

Extend the projection:

```ts
.select('patient_id,total_score,recognize_count,perceive_count')
```

Add the two counts to whatever row renders the smell score, formatted as:

```
Smell Test     คะแนน 10/16
               · รู้จัก 12/16   · ได้กลิ่น 14/16
```

Render rules:
- If either count is `null` (historical row), omit that line entirely.
- Format `null` → "—" only if at least one count is present (mixed state).
- Counts use `tabular-nums` for alignment.

The QA list table (`/pages/qa`) does **not** display these counts — detail-only.

---

## Phase 4 — Type updates

File: [`app/component/qa/types.ts`](../app/component/qa/types.ts)

The `QaScoreRow` type (or whichever interface represents the smell row) gets two optional fields:

```ts
export type QaSmellRow = QaScoreRow & {
  recognize_count: number | null
  perceive_count:  number | null
}
```

If a single `QaScoreRow` type is reused across all assessments, add the two fields as optional there instead of forking — they default to `undefined` for non-smell rows.

---

## Files to create / modify

| File | Change |
|------|--------|
| [`app/pages/qa/core_schema.sql`](../app/pages/qa/core_schema.sql) | Append the 34 new columns + COMMENT statements to the `smell_test_v2` definition |
| [`app/component/qa/forms/QaSmellForm.tsx`](../app/component/qa/forms/QaSmellForm.tsx) | Extend QUESTIONS, add two FlagMap states, render two-row toggle UI per cell, compute + upsert counts, prefill nullable booleans |
| [`app/component/qa/QaPatientSummaryModal.tsx`](../app/component/qa/QaPatientSummaryModal.tsx) | Extend select projection + render `recognize_count` / `perceive_count` next to total_score |
| [`app/component/qa/types.ts`](../app/component/qa/types.ts) | Add `recognize_count?: number \| null` and `perceive_count?: number \| null` to the smell row type |
| [`app/pages/qa/README.md`](../app/pages/qa/README.md) | Update the `smell_test_v2` row in the "Tables queried" table to note the new fields |

No changes to:
- [`app/pages/qa/page.tsx`](../app/pages/qa/page.tsx) — still only fetches `patient_id,total_score` for the QA list (no new column displayed there).
- [`app/component/qa/QaCreateModal.tsx`](../app/component/qa/QaCreateModal.tsx), [`QaAssessmentModal.tsx`](../app/component/qa/QaAssessmentModal.tsx) — same reason, `total_score` only.
- [`app/api/qa-pdf/route.tsx`](../app/api/qa-pdf/route.tsx), [`app/api/qa-pdf-v1/route.ts`](../app/api/qa-pdf-v1/route.ts) — deferred to follow-up PLAN.
- [`app/component/users/useDetailData.ts`](../app/component/users/useDetailData.ts), [`UserEditModal.tsx`](../app/component/users/UserEditModal.tsx) — same, `total_score` only.

---

## Edge cases & rules

1. **Historical row, doctor opens then saves without touching new toggles** → all `smell_NN_recognize` / `smell_NN_perceive` stay `null`, both counts become **0** (because `=== true` filter yields zero). Acceptable — count "ฉันยังไม่ได้ตอบ" as 0 known/perceived. If clinically wrong, switch counts to nullable when *every* flag is null: `recognize_count = anyAnswered ? n : null`. Decide with the clinician; default to **counts always written** for simplicity.
2. **Partial completion** (doctor answers 5 of 16) → counts reflect what was answered. No validation block — historical UX did not require all 16 answered to save.
3. **Tri-state un-set** — clicking an active "ใช่" toggle clears it back to NULL. The summary count drops accordingly. No confirmation dialog.
4. **Schema drift** — the SELECT in Phase 3 uses a static column list. If we later add a `smell_17_*` to the test (we won't, but if), both the schema and the SELECT list must be updated together. The README.md serves as the contract.
5. **NULL boolean serialisation** — Supabase JS sends `null` correctly for BOOLEAN columns. Do NOT coerce `null` to `false` anywhere in the upsert payload — that would silently overwrite "doctor didn't answer" with "doctor said No".
6. **Old PDF reports** — PDFs generated before this plan still show only `total_score`. After PLAN-XXX follow-up adds the counts to PDF templates, the same row will show all three. Until then, the on-screen modal is the only place that displays the new counts.
7. **Tab order / keyboard input** — toggle group buttons should be reachable via Tab in reading order: answer chips → recognize toggle → perceive toggle → next question. Test with keyboard before considering done.

---

## Verification checklist

- [ ] Migration applied; `\d core.smell_test_v2` shows 55 columns total (21 existing + 34 new).
- [ ] Opening `QaSmellForm` for a patient with no previous smell row renders all toggles in unset (outline-only) state.
- [ ] Opening for a historical row (only `smell_NN_answer` filled) — answer chips populate, recognize/perceive remain unset.
- [ ] Clicking an answer chip + recognize "ใช่" + perceive "ได้" — bottom strip increments correct, recognize, perceive counters.
- [ ] Clicking an active toggle a second time clears it (tri-state behaviour).
- [ ] Saving and reopening — all selections persist; counts match what was shown before save.
- [ ] Open patient summary modal — smell row shows three numbers: score, recognize, perceive.
- [ ] Saving a fresh form (zero rows in DB) writes a row with `recognize_count = 0` and `perceive_count = 0` plus correct `total_score`.
- [ ] Type check passes (`npx tsc --noEmit`).
- [ ] No regression: existing patients still see correct `total_score` in the QA list and PDF.
- [ ] Mobile width (<640px) — each question cell uses full width; toggles wrap cleanly.

---

## Rollback plan

If the migration causes problems, rollback is straightforward:

```sql
ALTER TABLE core.smell_test_v2
  DROP COLUMN smell_01_recognize, DROP COLUMN smell_02_recognize, /* ... 14 more ... */ DROP COLUMN smell_16_recognize,
  DROP COLUMN smell_01_perceive,  DROP COLUMN smell_02_perceive,  /* ... 14 more ... */ DROP COLUMN smell_16_perceive,
  DROP COLUMN recognize_count,
  DROP COLUMN perceive_count;
```

Then revert the code commit. No data loss for existing rows because the new columns are additive; only data entered between migration and rollback would be lost.

---

## Out-of-scope follow-ups (candidates for future plans)

- **PLAN-016 (suggested)**: Add `recognize_count` + `perceive_count` to both PDF report templates ([`/api/qa-pdf`](../app/api/qa-pdf/route.tsx) and [`/api/qa-pdf-v1`](../app/api/qa-pdf-v1/route.ts)).
- **PLAN-017 (suggested)**: Add a per-item view to the patient summary modal — accordion that expands to show each odor's answer + recognize + perceive flags, useful for the doctor's discussion with the patient.
- **PLAN-018 (suggested)**: Cross-cohort analytics — "patients who could perceive smell #5 but not name it" type queries, exposed via a new tab on `/pages/qa` or `/pages/dashboard`.
- **PLAN-019 (suggested)**: Validation rule — disallow `recognize=true` when `perceive=false` for the same odor (you cannot recognise what you cannot smell). Currently we let the doctor enter inconsistent flags; lock it down only if clinically agreed.
