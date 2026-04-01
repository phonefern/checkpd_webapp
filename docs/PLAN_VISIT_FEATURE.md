# PLAN-002: Add Visit Feature (QA Page)

## Overview

Add an "Add Visit" action to each patient row in the QA table. Clicking it opens the existing `QaCreateModal` in **create mode** (new record) with basic patient info and body measurements pre-filled from the selected row.

The visit numbering system already exists (`visitNo` in `QaRow`, computed by `getVisitIdentityKey` grouping in `page.tsx`). This feature only adds the UI entry point to create a new visit for an existing patient.

All roles can use this feature.

---

## Files to modify

### 1. `app/component/qa/types.ts`

No changes needed. `QaRow` already has `visitNo`. `QaPatient` already contains all fields needed for pre-fill.

### 2. `app/component/qa/QaTable.tsx`

**Add "Add Visit" dropdown item** in the Actions menu.

- Import `CalendarPlus` (or `FilePlus2`) icon from `lucide-react`
- Add a new prop: `onAddVisit: (patient: QaPatient) => void`
- Add a new `<DropdownMenuItem>` between "Detail" and "Print" (or after "Edit"):
  ```tsx
  <DropdownMenuItem onClick={() => onAddVisit(p)}>
    <CalendarPlus className="mr-2 h-4 w-4 text-slate-500" />
    Add Visit
  </DropdownMenuItem>
  ```
- Update `QaTableProps` interface to include `onAddVisit`

### 3. `app/component/qa/QaCreateModal.tsx`

**Add `prefillPatient` prop** to support pre-filling from an existing patient.

- Add to Props interface:
  ```ts
  prefillPatient?: QaPatient | null
  ```
- In the `useEffect` that initializes form state (the one that reacts to `open` / `editPatient`), add a third branch:
  - If `editPatient` exists → edit mode (current behavior, loads existing data)
  - Else if `prefillPatient` exists → create mode with pre-filled fields
  - Else → create mode with blank form (current behavior)

**Fields to pre-fill from `prefillPatient`** (patient identity + body measurements):

| Field | Pre-fill value | Editable? |
|-------|---------------|-----------|
| `first_name` | `prefillPatient.first_name` | Yes |
| `last_name` | `prefillPatient.last_name` | Yes |
| `thaiid` | `prefillPatient.thaiid` | Yes |
| `hn_number` | `prefillPatient.hn_number` | Yes |
| `age` | `prefillPatient.age` | Yes |
| `province` | `prefillPatient.province` | Yes |
| `collection_date` | **today's date** (`new Date().toISOString().slice(0, 10)`) | Yes |
| `weight` | `prefillPatient.weight` | Yes |
| `height` | `prefillPatient.height` | Yes |
| `bmi` | `prefillPatient.bmi` | Yes |
| `chest_cm` | `prefillPatient.chest_cm` | Yes |
| `waist_cm` | `prefillPatient.waist_cm` | Yes |
| `hip_cm` | `prefillPatient.hip_cm` | Yes |
| `neck_cm` | `prefillPatient.neck_cm` | Yes |
| `bp_supine` | `prefillPatient.bp_supine` | Yes |
| `pr_supine` | `prefillPatient.pr_supine` | Yes |
| `bp_upright` | `prefillPatient.bp_upright` | Yes |
| `pr_upright` | `prefillPatient.pr_upright` | Yes |

**Fields NOT pre-filled** (start blank/default):

- All diagnosis fields: `condition`, `hy_stage`, `disease_duration`, `other_diagnosis_text`
- All prodromal flags: `rbd_suspected`, `hyposmia`, `constipation`, `depression`, `eds`, `ans_dysfunction`, `mild_parkinsonian_sign`, `family_history_pd` (and their onset_age/duration fields)
- Clinical scores: `adl_score`, `scopa_aut_score`, `blood_test_note`
- FDOPA: `fdopa_pet_requested`, `fdopa_pet_score`

**Important**: This is create mode — on save it should INSERT a new row in `patients_v2` (not update). The `editPatient` prop should remain `null` when using `prefillPatient`.

**Dialog title hint**: When `prefillPatient` is set, optionally show title like `"เพิ่ม Visit — {first_name} {last_name}"` instead of the default `"เพิ่มผู้ป่วยใหม่"`.

### 4. `app/pages/qa/page.tsx`

**Add state and handler for Add Visit.**

- Add state:
  ```ts
  const [prefillPatient, setPrefillPatient] = useState<QaPatient | null>(null)
  ```

- Add handler:
  ```ts
  const handleAddVisit = (patient: QaPatient) => {
    setEditPatient(null)    // ensure create mode
    setEditDiag(null)
    setPrefillPatient(patient)
    setCreateOpen(true)
  }
  ```

- Update `handleModalClose` to also clear prefill:
  ```ts
  const handleModalClose = () => {
    setCreateOpen(false)
    setEditPatient(null)
    setEditDiag(null)
    setPrefillPatient(null)
  }
  ```

- Pass to QaCreateModal:
  ```tsx
  <QaCreateModal
    open={createOpen}
    onClose={handleModalClose}
    role={role}
    prefillPatient={prefillPatient}
    onCreated={...}
    editPatient={editPatient}
    editDiag={editDiag}
  />
  ```

- Pass to QaTable:
  ```tsx
  <QaTable
    rows={rows}
    role={role}
    onAssess={setAssessingPatient}
    onEdit={handleEdit}
    onDelete={handleDelete}
    onDetail={setSummaryRow}
    onAddVisit={handleAddVisit}
  />
  ```

- Also clear `prefillPatient` when opening blank create:
  ```ts
  <Button onClick={() => {
    setEditPatient(null)
    setEditDiag(null)
    setPrefillPatient(null)
    setCreateOpen(true)
  }}>
  ```

---

## Flow summary

```
User clicks Actions → "Add Visit" on patient row
  ↓
page.tsx: handleAddVisit(patient)
  → setPrefillPatient(patient), setEditPatient(null), setCreateOpen(true)
  ↓
QaCreateModal opens in create mode
  → form pre-filled with name, ID, body measurements from prefillPatient
  → collection_date = today
  → diagnosis fields are blank
  ↓
User fills remaining data → clicks Save
  ↓
INSERT new row in patients_v2 (+ patient_diagnosis_v2 if diagnosis filled)
  ↓
fetchData() refreshes table
  → visitNo recalculates automatically (same patient grouped, sorted by date)
```

---

## Notes

- Visit numbering logic already works — `getVisitIdentityKey()` groups by thaiid → hn → name, then sorts by `collection_date` to assign visit numbers. No changes needed.
- The "เพิ่มผู้ป่วยใหม่" button at the top still creates a fully blank patient (no prefill).
- `medical_staff` role restrictions from previous feature still apply: if the new visit gets diagnosed later, `medical_staff` won't be able to edit tests on it.
