# QA Page — UX/UI Polish Plan

**Goal:** Polish existing QA page UX — no flow change.
**Target:** Research staff (power users) + Doctors (clinical summary).
**Devices:** Desktop + Tablet (responsive).

---

## Overview of Changes

| # | Change | Files | Priority |
|---|--------|-------|----------|
| 1 | Extend `QaRow` + fetch `food` / `colorvision` in main query | `types.ts`, `page.tsx` | Foundation |
| 2 | Condition badge color coding in table | `types.ts`, `QaTable.tsx` | High |
| 3 | Test completion mini-badges per table row | `QaTable.tsx` | High |
| 4 | Row click → expandable action panel (replaces ⋯ menu) | `QaTable.tsx`, `QaRowActionPanel.tsx` (new) | High |
| 5 | Doctor-optimized view inside action panel (scores + quick diag) | `QaRowActionPanel.tsx` | High |
| 6 | Score severity color in `QaAssessmentModal` test cards | `QaAssessmentModal.tsx` | Medium |
| 7 | Tablet responsive column hiding + layout | `QaTable.tsx`, `QaAssessmentModal.tsx` | Medium |

---

## Phase 1 — Foundation: Data & Types

### 1A. Extend `QaRow` type — `app/component/qa/types.ts`

Add `food` and `colorvision` to `QaRow` (currently missing — only fetched in AssessmentModal):

```ts
// In QaRow type, add:
food: QaScoreRow | undefined
colorvision: { done: boolean; summary: string | null } | undefined
```

Add condition color helper:

```ts
export type QaConditionColor = 'pd' | 'pdm' | 'ctrl' | 'other' | 'none'

export function getConditionColor(label: string): QaConditionColor {
  const l = label.toUpperCase()
  if (l === 'PD')   return 'pd'
  if (l === 'PDM')  return 'pdm'
  if (l === 'CTRL') return 'ctrl'
  if (l === '-' || l === '') return 'none'
  return 'other'
}

// Tailwind class map (use inline — no dynamic class generation)
export const CONDITION_BADGE_CLASS: Record<QaConditionColor, string> = {
  pd:    'bg-red-100 text-red-700 ring-1 ring-red-300',
  pdm:   'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
  ctrl:  'bg-green-100 text-green-700 ring-1 ring-green-300',
  other: 'bg-slate-100 text-slate-600',
  none:  'text-slate-400',
}
```

Add score severity helper (reuse `SCORE_THRESHOLDS` logic from `QaPatientSummaryModal.tsx` — extract to shared location):

```ts
// Severity levels for test score coloring
export type ScoreSeverity = 'good' | 'warn' | 'bad' | 'none'

export function getScoreSeverity(key: string, score: number | null): ScoreSeverity {
  if (score === null) return 'none'
  // thresholds for quick coloring (MoCA, TMSE, HAM-D, MDS, Epworth, Smell)
  const thresholds: Record<string, { good?: number; warn?: number }> = {
    moca:    { good: 26, warn: 21 },  // ≥26 normal, 21–25 MCI, <21 impaired
    tmse:    { good: 24, warn: 18 },
    hamd:    { good: 7,  warn: 17 },  // inverted: lower is better
    mds:     { good: 20, warn: 60 },  // lower is better
    epworth: { good: 10, warn: 16 },  // lower is better
    smell:   { good: 11, warn: 7  },  // ≥11 normal
  }
  const t = thresholds[key]
  if (!t) return 'none'

  // For "lower is better" tests (hamd, mds, epworth)
  const lowerBetter = ['hamd', 'mds', 'epworth']
  if (lowerBetter.includes(key)) {
    if (score <= t.good!) return 'good'
    if (score <= t.warn!) return 'warn'
    return 'bad'
  }
  // For "higher is better" tests (moca, tmse, smell)
  if (score >= t.good!) return 'good'
  if (score >= t.warn!) return 'warn'
  return 'bad'
}

export const SEVERITY_DOT_CLASS: Record<ScoreSeverity, string> = {
  good: 'bg-green-500',
  warn: 'bg-amber-400',
  bad:  'bg-red-500',
  none: 'bg-slate-200',
}

export const SEVERITY_TEXT_CLASS: Record<ScoreSeverity, string> = {
  good: 'text-green-700',
  warn: 'text-amber-600',
  bad:  'text-red-600',
  none: 'text-slate-400',
}
```

### 1B. Extend main page fetch — `app/pages/qa/page.tsx`

In `fetchData`, add `food_questionnaire_v2` and `vision_tests_v2` to the `Promise.all`:

```ts
// Add to the destructuring in step 3:
const [..., foodRes, visionRes] = await Promise.all([
  // existing 9 fetches...
  supabase.schema('core').from('food_questionnaire_v2').select('patient_id,total_score').in('patient_id', patientIds),
  supabase.schema('core').from('vision_tests_v2')
    .select('patient_id,color_paper_re_test,color_paper_re_retest,color_paper_le_test,color_paper_le_retest,color_paper_re_test_order,color_paper_re_retest_order,color_paper_le_test_order,color_paper_le_retest_order')
    .in('patient_id', patientIds),
])

const foodMap    = Object.fromEntries((foodRes.data   ?? []).map((d) => [d.patient_id, d]))
const visionMap  = Object.fromEntries((visionRes.data ?? []).map((d) => [d.patient_id, d]))
```

In `setRows(...)`, add to each row:
```ts
food: foodMap[p.id] as QaScoreRow | undefined,
colorvision: visionMap[p.id]
  ? {
      done: Boolean(
        visionMap[p.id].color_paper_re_test_order ||
        visionMap[p.id].color_paper_le_test_order
      ),
      summary: visionMap[p.id].color_paper_re_test ?? visionMap[p.id].color_paper_le_test ?? null,
    }
  : undefined,
```

---

## Phase 2 — QaTable.tsx

### 2A. Condition badge color coding

Replace the plain text `{conditionLabel}` cell with a colored badge:

```tsx
// Before:
<td className="px-3 py-2">{conditionLabel}</td>

// After:
<td className="px-3 py-2">
  {conditionLabel === '-' ? (
    <span className="text-slate-400 text-xs">—</span>
  ) : (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONDITION_BADGE_CLASS[getConditionColor(conditionLabel)]}`}>
      {conditionLabel}
    </span>
  )}
</td>
```

### 2B. Test completion mini-badges

Add a new row under the `<tbody>` data, OR insert as a sub-row. Recommended: expand below the patient name cell in the name column to avoid adding a new column.

**Desktop:** show all 10 test dots in a row (each 8px dot with tooltip).
**Tablet (md and below):** show a compact `"7/10"` count badge.

```tsx
// Test badge list data (10 tests, reuse TESTS from AssessmentModal)
const TEST_BADGES = [
  { key: 'moca',        label: 'MoCA',    score: row.moca?.total_score },
  { key: 'tmse',        label: 'TMSE',    score: row.tmse?.total_score },
  { key: 'hamd',        label: 'HAM-D',   score: row.hamd?.total_score },
  { key: 'mds',         label: 'MDS',     score: row.mds?.total_score },
  { key: 'epworth',     label: 'EPW',     score: row.epw?.total_score },
  { key: 'smell',       label: 'Smell',   score: row.smell?.total_score },
  { key: 'rbd',         label: 'RBD',     score: row.rbd?.total_score },
  { key: 'rome4',       label: 'Rome4',   score: row.rome4?.total_score },
  { key: 'food',        label: 'Food',    score: row.food?.total_score },
  { key: 'colorvision', label: 'Vision',  score: row.colorvision?.done ? 1 : null },
]

const doneCount = TEST_BADGES.filter(t => t.score !== null && t.score !== undefined).length

// In the Name cell, add below the patient name:
<div className="mt-1 hidden sm:flex flex-wrap gap-0.5">
  {TEST_BADGES.map(t => {
    const done = t.score !== null && t.score !== undefined
    const sev  = getScoreSeverity(t.key, t.score ?? null)
    return (
      <span
        key={t.key}
        title={`${t.label}: ${done ? t.score : 'ยังไม่ได้ทำ'}`}
        className={`inline-block h-2 w-2 rounded-full ${done ? SEVERITY_DOT_CLASS[sev] : 'bg-slate-200'}`}
      />
    )
  })}
</div>
{/* Tablet compact badge */}
<div className="mt-0.5 sm:hidden">
  <span className={`text-[10px] font-medium ${doneCount === 10 ? 'text-green-600' : 'text-slate-500'}`}>
    {doneCount}/10 tests
  </span>
</div>
```

### 2C. Row click → expandable action panel

**Interaction design:**
- Click anywhere on a `<tr>` → toggle `expandedRowId` state
- If the same row is clicked again → collapse
- `<tr>` cursor changes to `cursor-pointer`
- The existing `⋯` DropdownMenu button stays (power users keep it)

**Expanded row:** insert a `<tr>` immediately after the clicked row with `colspan={all_columns}` containing the action panel.

```tsx
// State at top of QaTable:
const [expandedRowId, setExpandedRowId] = useState<number | null>(null)

// In the <tr> for each row:
<tr
  key={p.id}
  onClick={(e) => {
    // Don't expand if clicking a button/dropdown element
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="menuitem"]')) return
    setExpandedRowId(prev => prev === p.id ? null : p.id)
  }}
  className={`cursor-pointer transition-colors ${
    expandedRowId === p.id ? 'bg-blue-50/60' : focusedDiagRowId === p.id ? 'bg-cyan-50/70 hover:bg-cyan-50/80' : 'hover:bg-muted/30'
  }`}
>
  {/* existing cells ... */}
</tr>

{/* Expanded action panel row */}
{expandedRowId === p.id && (
  <tr key={`${p.id}-panel`} className="bg-blue-50/40 border-b-2 border-blue-200">
    <td colSpan={11} className="px-4 py-3">
      <QaRowActionPanel
        row={row}
        role={role}
        testsLocked={testsLocked}
        onAssess={onAssess}
        onEdit={onEdit}
        onQuickDiag={onQuickDiag}
        onDelete={onDelete}
        onDetail={onDetail}
        onAddVisit={onAddVisit}
        onClose={() => setExpandedRowId(null)}
      />
    </td>
  </tr>
)}
```

### 2D. Tablet responsive column hiding

On `md` and below, hide low-priority columns:
```tsx
// Columns to hide on tablet:
// - "ID"       → <th className="hidden lg:table-cell ...">
// - "Province" → <th className="hidden md:table-cell ...">
// - "GP2"      → <th className="hidden md:table-cell ...">
// - "Diag Status" stays visible (important for both roles)
```

---

## Phase 3 — New Component: `QaRowActionPanel.tsx`

File: `app/component/qa/QaRowActionPanel.tsx`

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Patient header: name / HN / collection date / visit info]     │
├───────────────────────────┬─────────────────────────────────────┤
│  ACTION BUTTONS           │  SCORE SUMMARY (doctor-focused)     │
│  ● Detail (FileSearch)    │  MoCA  24/30 ●green               │
│  ● Tests (ClipboardList)  │  HAM-D  8/52 ●green               │
│  ● Edit (Pencil)          │  MDS   44/260 ●warn               │
│  ● Add Visit (CalendarPlus│  EPW    6/21 ●good               │
│  ● Print (Printer)        │  Smell 12/16 ●green               │
│  ● Delete (Trash2) [red]  │  ... (all 10 tests compact)       │
│                           │  [Diag button — doctor role only]  │
└───────────────────────────┴─────────────────────────────────────┘
```

### Props

```ts
interface QaRowActionPanelProps {
  row: QaRow
  role: AppRole | null
  testsLocked: boolean
  onAssess: (patient: QaPatient) => void
  onEdit: (patient: QaPatient) => void
  onQuickDiag: (patientId: number, condition: 'pd' | 'ctrl' | 'pdm' | 'other' | '-') => Promise<void>
  onDelete: (patientId: number, name: string) => void
  onDetail: (row: QaRow) => void
  onAddVisit: (patient: QaPatient) => void
  onClose: () => void
}
```

### Score summary section (doctor-focused)

Display all 10 tests in a compact 2-column grid. Each entry:
- Test label (short)
- Score / max (or "—" if not done)
- Colored dot from `getScoreSeverity`

```tsx
const TEST_SUMMARY = [
  { key: 'moca',        label: 'MoCA',    score: row.moca?.total_score  ?? null, max: 30 },
  { key: 'tmse',        label: 'TMSE',    score: row.tmse?.total_score  ?? null, max: 30 },
  { key: 'hamd',        label: 'HAM-D',   score: row.hamd?.total_score  ?? null, max: 52 },
  { key: 'mds',         label: 'MDS',     score: row.mds?.total_score   ?? null, max: 260 },
  { key: 'epworth',     label: 'Epworth', score: row.epw?.total_score   ?? null, max: 21 },
  { key: 'smell',       label: 'Smell',   score: row.smell?.total_score ?? null, max: 16 },
  { key: 'rbd',         label: 'RBD',     score: row.rbd?.total_score   ?? null, max: 52 },
  { key: 'rome4',       label: 'Rome IV', score: row.rome4?.total_score ?? null, max: 6 },
  { key: 'food',        label: 'Food',    score: row.food?.total_score  ?? null, max: 10 },
  { key: 'colorvision', label: 'Vision',  score: row.colorvision?.done ? 1 : null, max: null },
]
```

### Quick Diag section (doctor role + not yet diagnosed)

Show condition buttons inline (PD / PDM / CTRL / OTHER / —) with confirmation toast or inline confirm.

**Doctor only:** role `=== 'doctor' || role === 'admin' || role === 'super_admin'` and `!isDiagnosedRow`.

```tsx
{isDocRole && !isDiagnosedRow && (
  <div className="mt-2 border-t pt-2">
    <p className="text-xs font-medium text-slate-500 mb-1.5">วินิจฉัย</p>
    <div className="flex gap-1.5 flex-wrap">
      {(['pd','pdm','ctrl','other','-'] as const).map(v => (
        <Button
          key={v}
          size="sm"
          onClick={() => handleQuickDiagWithConfirm(v)}
          className={`h-7 px-3 text-xs font-semibold rounded-full ${DIAG_BUTTON_CLASS[v]}`}
        >
          {v.toUpperCase()}
        </Button>
      ))}
    </div>
  </div>
)}
```

Diag button color map:
```ts
const DIAG_BUTTON_CLASS = {
  pd:    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  pdm:   'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200',
  ctrl:  'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
  other: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200',
  '-':   'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200',
}
```

---

## Phase 4 — QaAssessmentModal.tsx polish

### 4A. Score severity color on test cards

Currently test cards show: emoji, done badge (green/gray), score in blue text.

**Change:** replace plain blue score with severity-colored score + border:

```tsx
// Card border: severity color when done
<button
  className={`text-left border-2 rounded-lg p-3 hover:border-blue-400 transition-all group ${
    done
      ? severityBorderClass[getScoreSeverity(t.key, score)]
      : 'border-slate-200 hover:border-blue-300'
  }`}
>

// Score text: severity color
{done && t.key !== 'colorvision' && (
  <p className={`text-sm font-bold mt-1 ${SEVERITY_TEXT_CLASS[getScoreSeverity(t.key, score)]}`}>
    {score}
    <span className="font-normal text-xs text-muted-foreground"> / {t.maxScore}</span>
    <span className="ml-1 text-[10px] font-medium">{getSeverityLabel(t.key, score)}</span>
  </p>
)}
```

Severity border map:
```ts
const severityBorderClass: Record<ScoreSeverity, string> = {
  good: 'border-green-300 bg-green-50/30',
  warn: 'border-amber-300 bg-amber-50/30',
  bad:  'border-red-300 bg-red-50/30',
  none: 'border-slate-200',
}
```

### 4B. Tablet grid layout

```tsx
// Current: grid-cols-3 (3 columns always)
// Change to: 2 cols on mobile/tablet, 3 on desktop
<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
```

---

## File Change Summary

| File | Change type | Description |
|------|-------------|-------------|
| `app/component/qa/types.ts` | Edit | Add `food`, `colorvision` to `QaRow`; add `getConditionColor`, `CONDITION_BADGE_CLASS`, `getScoreSeverity`, `SEVERITY_DOT_CLASS`, `SEVERITY_TEXT_CLASS` helpers |
| `app/pages/qa/page.tsx` | Edit | Add `food_questionnaire_v2` + `vision_tests_v2` to `Promise.all` in `fetchData`; map results into `setRows` |
| `app/component/qa/QaTable.tsx` | Edit | Condition badge color; test mini-badges; row click expand; responsive column hiding; import `QaRowActionPanel` |
| `app/component/qa/QaRowActionPanel.tsx` | **New** | Expandable panel: action buttons (left) + score summary (right) + quick diag (doctor role) |
| `app/component/qa/QaAssessmentModal.tsx` | Edit | Severity-colored card borders + score text; 2-col grid on tablet |

---

## Implementation Order

```
1. types.ts          → add types + helpers (no UI change, safe first step)
2. page.tsx          → add food + vision to fetch (data extension)
3. QaRowActionPanel  → new component (can develop in isolation)
4. QaTable.tsx       → integrate panel + badges + condition colors
5. QaAssessmentModal → severity colors + tablet grid
```

---

## Tablet Breakpoint Reference

| Breakpoint | Width | Target device |
|-----------|-------|---------------|
| `sm`  | 640px  | Large phone |
| `md`  | 768px  | Tablet portrait |
| `lg`  | 1024px | Tablet landscape / small laptop |
| `xl`  | 1280px | Desktop |

All responsive classes use Tailwind's mobile-first convention: `hidden md:table-cell` = hidden on mobile, visible on tablet+.

---

## Notes for implementation

- `QaRowActionPanel` should **not** stop event propagation for delete/navigate actions — let them bubble naturally.
- The `⋯` DropdownMenu in the Actions column stays on desktop (power-user shortcut). The expanded panel is additive.
- The `focusedDiagRowId` state (used for cyan highlight on Diag button) should be unified with `expandedRowId` or cleared when the panel closes.
- Score helpers (`getScoreSeverity`) should be tested with null input — must return `'none'` cleanly.
- Do not use dynamic Tailwind class strings (e.g., `` `bg-${color}-100` ``) — use the static class map pattern shown above.
