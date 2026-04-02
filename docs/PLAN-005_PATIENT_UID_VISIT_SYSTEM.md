# PLAN-005: Patient UID & Server-Side Visit System

> Depends on: PLAN-002 (Add Visit Feature)
> Priority: High — foundational for reliable cross-visit tracking

---

## Problem

Visit identity is currently computed **client-side** via `getVisitIdentityKey()` in `app/pages/qa/page.tsx`. It cascades through thaiid → hn_number → name to group rows belonging to the same patient, then sorts by `collection_date` to assign `visitNo`.

Issues with this approach:

1. **Fragile grouping** — if a patient's thaiid is entered on visit 2 but not visit 1, they become two separate "patients"
2. **Name-based fallback is unreliable** — typos, nicknames, or transliteration differences break grouping
3. **No uniqueness enforcement** — nothing prevents two visits on the same date for the same patient
4. **Performance** — grouping + sorting N patients in JS on every render; doesn't scale
5. **Inconsistency** — other consumers (API routes, reports, exports) can't reuse the UI-only visit logic

---

## Solution

Add a **`patient_uid`** column (`UUID`) to `patients_v2` as a permanent, database-level patient identifier. Use a SQL view with `ROW_NUMBER()` window function to compute `visit_no` server-side.

---

## 1. SQL Migration

### 1a. Add `patient_uid` column

```sql
-- Add patient_uid column
ALTER TABLE core.patients_v2
  ADD COLUMN patient_uid UUID DEFAULT NULL;

-- Index for fast grouping and lookups
CREATE INDEX idx_patients_v2_patient_uid ON core.patients_v2 (patient_uid);
```

### 1b. Backfill existing rows

Assign the same UUID to rows that share the same identity, using the same priority logic as `getVisitIdentityKey()`:

```sql
-- Step 1: Group by thaiid (highest priority)
WITH grouped AS (
  SELECT DISTINCT ON (LOWER(TRIM(thaiid)))
    LOWER(TRIM(thaiid)) AS key,
    gen_random_uuid() AS uid
  FROM core.patients_v2
  WHERE TRIM(COALESCE(thaiid, '')) <> ''
)
UPDATE core.patients_v2 p
SET patient_uid = g.uid
FROM grouped g
WHERE LOWER(TRIM(p.thaiid)) = g.key
  AND p.patient_uid IS NULL;

-- Step 2: Group by hn_number (for rows still without uid)
WITH grouped AS (
  SELECT DISTINCT ON (LOWER(TRIM(hn_number)))
    LOWER(TRIM(hn_number)) AS key,
    gen_random_uuid() AS uid
  FROM core.patients_v2
  WHERE patient_uid IS NULL
    AND TRIM(COALESCE(hn_number, '')) <> ''
)
UPDATE core.patients_v2 p
SET patient_uid = g.uid
FROM grouped g
WHERE LOWER(TRIM(p.hn_number)) = g.key
  AND p.patient_uid IS NULL;

-- Step 3: Group by name (lowest priority fallback)
WITH grouped AS (
  SELECT DISTINCT ON (LOWER(TRIM(COALESCE(first_name,''))), LOWER(TRIM(COALESCE(last_name,''))))
    LOWER(TRIM(COALESCE(first_name,''))) AS fname,
    LOWER(TRIM(COALESCE(last_name,'')))  AS lname,
    gen_random_uuid() AS uid
  FROM core.patients_v2
  WHERE patient_uid IS NULL
    AND (TRIM(COALESCE(first_name, '')) <> '' OR TRIM(COALESCE(last_name, '')) <> '')
)
UPDATE core.patients_v2 p
SET patient_uid = g.uid
FROM grouped g
WHERE LOWER(TRIM(COALESCE(p.first_name,''))) = g.fname
  AND LOWER(TRIM(COALESCE(p.last_name,'')))  = g.lname
  AND p.patient_uid IS NULL;on_date;

-- Step 4: Remaining rows get their own unique uid
UPDATE core.patients_v2
SET patient_uid = gen_random_uuid()
WHERE patient_uid IS NULL;
```

### 1c. Set NOT NULL + unique constraint

After backfill is complete:

```sql
-- Make patient_uid required going forward
ALTER TABLE core.patients_v2
  ALTER COLUMN patient_uid SET NOT NULL,
  ALTER COLUMN patient_uid SET DEFAULT gen_random_uuid();

-- Enforce: one patient can only have one visit per collection_date
ALTER TABLE core.patients_v2
  ADD CONSTRAINT uq_patient_visit_date UNIQUE (patient_uid, collection_date);
```

> **Note**: The `UNIQUE(patient_uid, collection_date)` constraint means if `collection_date` is NULL, PostgreSQL treats each NULL as distinct — so multiple visits with NULL dates are allowed. This is acceptable since real visits should always have a date.

### 1d. Create visit view

```sql
CREATE OR REPLACE VIEW core.patient_visits_v2 AS
SELECT
  p.*,
  ROW_NUMBER() OVER (
    PARTITION BY p.patient_uid
    ORDER BY p.collection_date ASC NULLS LAST, p.id ASC
  ) AS visit_no,
  COUNT(*) OVER (
    PARTITION BY p.patient_uid
  ) AS total_visits
FROM core.patients_v2 p;
```

This view provides:
- `visit_no` — sequential visit number per patient (1, 2, 3...)
- `total_visits` — how many visits this patient has in total

---

## 2. Type Changes — `app/component/qa/types.ts`

```ts
export type QaPatient = {
  id: number
  patient_uid: string        // <-- NEW: UUID
  first_name: string | null
  last_name: string | null
  // ... existing fields ...
  visit_no: number           // <-- NEW: from view
  total_visits: number       // <-- NEW: from view
}
```

Remove `visitNo` from `QaRow` — it now lives on `QaPatient` directly (from the view).

```ts
export type QaRow = {
  // visitNo: number  <-- REMOVE (now on patient.visit_no)
  patient: QaPatient
  diag: QaDiagnosisRow | undefined
  // ... rest unchanged ...
}
```

---

## 3. Query Changes — `app/pages/qa/page.tsx`

### 3a. Query from view instead of table

Change the Supabase query from:

```ts
// BEFORE
const { data: patients } = await supabase
  .from('patients_v2')
  .select('id, first_name, ...')
```

To:

```ts
// AFTER
const { data: patients } = await supabase
  .from('patient_visits_v2')  // <-- use view
  .select('id, patient_uid, first_name, ..., visit_no, total_visits')
```

### 3b. Remove client-side visit computation

Delete these functions and code blocks:

- `getVisitIdentityKey()` function (lines 33-45)
- `toSortDateValue()` function (lines 47-51) — if only used for visit sorting
- `visitNoByPatientId` computation block (lines 165-186)
- The `visitNo: visitNoByPatientId[p.id] ?? 1` mapping (line 218)

Replace row mapping with:

```ts
setRows(patients.map((p) => ({
  patient: p,  // visit_no and total_visits already on p
  diag: diagMap[p.id] as QaDiagnosisRow | undefined,
  // ... rest unchanged ...
})))
```

### 3c. Update handleAddVisit

When creating a new visit via "Add Visit", pass `patient_uid` to the modal so the new row gets the same UUID:

```ts
const handleAddVisit = (patient: QaPatient) => {
  setEditPatient(null)
  setEditDiag(null)
  setPrefillPatient(patient)  // patient.patient_uid is carried along
  setCreateOpen(true)
}
```

---

## 4. Modal Changes — `app/component/qa/QaCreateModal.tsx`

### 4a. Include `patient_uid` in form state

Add to `FormState`:

```ts
patient_uid: string   // UUID — carried from prefillPatient or auto-generated
```

### 4b. Prefill logic

- **"Add Visit" (prefillPatient exists)**: Copy `patient_uid` from `prefillPatient.patient_uid` — this links the new row to the same patient
- **"New Patient" (blank create)**: Generate new UUID via `crypto.randomUUID()`
- **"Edit"**: Keep existing `patient_uid` unchanged

### 4c. Save logic

Include `patient_uid` in the INSERT payload:

```ts
const { error } = await supabase
  .from('patients_v2')
  .insert({
    patient_uid: form.patient_uid,
    first_name: form.first_name,
    // ... rest of fields ...
  })
```

---

## 5. Table Changes — `app/component/qa/QaTable.tsx`

Update the Visit No column to read from `patient` instead of `row`:

```tsx
// BEFORE
const { patient: p, diag, conditionLabel, visitNo } = row

// AFTER
const { patient: p, diag, conditionLabel } = row

// In the Visit No cell:
<span className="...">
  {p.visit_no}
</span>
```

Optionally show total visits as a tooltip or secondary label:

```tsx
<span title={`${p.total_visits} visits total`}>
  {p.visit_no}/{p.total_visits}
</span>
```

---

## 6. Supabase View Access

Ensure the view `core.patient_visits_v2` is accessible via Supabase client:

1. The view must be in the `public` schema (or aliased) for Supabase auto-API to work
2. If using `core` schema, either:
   - Create the view in `public` schema referencing `core.patients_v2`, or
   - Expose `core` schema in Supabase dashboard (Settings → API → Extra schemas)

Recommended approach — create in public schema:

```sql
CREATE OR REPLACE VIEW public.patient_visits_v2 AS
SELECT
  p.*,
  ROW_NUMBER() OVER (
    PARTITION BY p.patient_uid
    ORDER BY p.collection_date ASC NULLS LAST, p.id ASC
  ) AS visit_no,
  COUNT(*) OVER (
    PARTITION BY p.patient_uid
  ) AS total_visits
FROM core.patients_v2 p;
```

---

## Files to modify

| File | Changes |
|------|---------|
| `app/pages/qa/schema_v2.sql` | Add `patient_uid` column, index, constraint, view definition |
| `app/component/qa/types.ts` | Add `patient_uid`, `visit_no`, `total_visits` to `QaPatient`; remove `visitNo` from `QaRow` |
| `app/pages/qa/page.tsx` | Query `patient_visits_v2` view; remove `getVisitIdentityKey()`, `toSortDateValue()`, and client-side visit computation |
| `app/component/qa/QaCreateModal.tsx` | Add `patient_uid` to FormState + save logic; auto-assign on new patient, carry from prefill |
| `app/component/qa/QaTable.tsx` | Read `visit_no` from `patient` instead of `row.visitNo` |
| `app/component/qa/QaPatientSummaryModal.tsx` | Use `patient_uid` for visit history queries if applicable |

---

## Migration Checklist

1. [ ] Run backfill SQL on staging first — verify grouping is correct
2. [ ] Spot-check: patients with thaiid should share same `patient_uid`
3. [ ] Spot-check: patients with only hn_number should share same `patient_uid`
4. [ ] Verify `UNIQUE(patient_uid, collection_date)` doesn't conflict with existing data
5. [ ] Create the view and test via Supabase client query
6. [ ] Deploy code changes
7. [ ] Remove `getVisitIdentityKey()` and related client-side code

---

## Rollback

If issues arise, the migration is safe to roll back:

```sql
-- Remove constraint and view
DROP VIEW IF EXISTS public.patient_visits_v2;
ALTER TABLE core.patients_v2 DROP CONSTRAINT IF EXISTS uq_patient_visit_date;
ALTER TABLE core.patients_v2 DROP COLUMN IF EXISTS patient_uid;
```

The client-side `getVisitIdentityKey()` code can be restored from git history.

---

## Notes

- `patient_uid` is a UUID (not auto-increment) because it needs to be generated client-side when creating new patients without a round-trip
- The view is read-only for queries; INSERTs/UPDATEs still target `patients_v2` directly
- `crypto.randomUUID()` is available in all modern browsers and Node.js 19+
- Future: `patient_uid` can serve as the key for a dedicated `patients_master` table if patient demographics need to be normalized across visits
