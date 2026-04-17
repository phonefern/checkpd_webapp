# PLAN-004: Patient Summary Modal UI Redesign

## Overview

Redesign `QaPatientSummaryModal.tsx` from the current bordered-section layout to a modern, eye-friendly design using soft pastel tones, visual grouping with white space, and a Bento Grid layout for assessments. The goal is to reduce eye strain for doctors reviewing many patients, while making key information scannable at a glance.

**Depends on**: PLAN-003 (assessment thresholds must be in place first — this plan references the `getScoreCategory()` output).

---

## File to modify

`app/component/qa/QaPatientSummaryModal.tsx` — UI-only changes, no data logic changes.

---

## Design System Changes

### Color Palette (Softened)

Replace current hard-coded Tailwind colors with softer tones:

| Purpose | Current | New |
|---------|---------|-----|
| Modal background | `white` | `white` (keep) |
| Section background | `border + p-4` (bordered boxes) | `bg-slate-50/60 rounded-xl` (no border, subtle fill) |
| Status: Diagnosed | `bg-green-100 text-green-700` | `bg-emerald-50 text-emerald-700 border border-emerald-200` |
| Status: Pending | `bg-yellow-100 text-yellow-700` | `bg-amber-50 text-amber-700 border border-amber-200` |
| Score: Good | `bg-green-100 text-green-700` | `bg-emerald-50 text-emerald-700` |
| Score: Warning | `bg-amber-100 text-amber-700` | `bg-orange-50 text-orange-700` |
| Score: Bad | `bg-rose-100 text-rose-700` | `bg-rose-50 text-rose-700` |
| Label text | `text-muted-foreground` | `text-gray-500` |
| Value text | `font-medium` | `text-slate-900 font-medium` |

Update `CATEGORY_STYLES` and `STATUS_STYLES` constants accordingly.

### Typography

- Section headers: `text-xs font-semibold uppercase tracking-wider text-gray-400` (lighter, more spaced)
- Labels: `text-gray-500 text-sm`
- Values: `text-slate-900 font-medium text-sm`

---

## Layout Restructure

### Section A: Hero Header

Replace the current `DialogTitle` + separate General section with a combined hero header.

```tsx
{/* Hero Header */}
<div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
  <div>
    <h2 className="text-xl font-bold text-slate-900">
      {p.first_name} {p.last_name}
    </h2>
    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
      <span>HN: {p.hn_number ?? '-'}</span>
      <span>Age: {p.age ?? '-'}</span>
      <span>Visit {visitNo}</span>
    </div>
  </div>
  <div className="flex items-center gap-2">
    {/* Condition badge */}
    {conditionLabel !== '-' && (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        {conditionLabel}
      </span>
    )}
    {/* Diag status badge */}
    <span className={diagnosed ? STATUS_STYLES.done : STATUS_STYLES.pending}>
      {diagnosed ? 'Diagnosed' : 'Pending'}
    </span>
  </div>
</div>
```

Move the `DialogTitle` to just `"Patient Summary"` (simple, no patient name in the shadcn title bar).

### Section B: Visit History (Horizontal Timeline)

Replace the current 2-column grid of visit buttons with a horizontal scrollable row to save vertical space:

```tsx
{/* Visit Timeline — horizontal scroll */}
<div className="flex gap-2 overflow-x-auto pb-2">
  {visitRows.map((visit) => {
    const active = visit.patient.id === p.id
    return (
      <button
        key={visit.patient.id}
        onClick={() => setSelectedPatientId(visit.patient.id)}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm transition-colors ${
          active
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <div className="font-semibold">V{visit.visitNo}</div>
        <div className="text-xs opacity-70">{visit.patient.collection_date ?? '-'}</div>
      </button>
    )
  })}
</div>
```

### Section C: Vitals & Physical (Compact Grid)

Replace the current bordered section with a borderless grid using subtle background:

```tsx
<div className="rounded-xl bg-slate-50/60 p-4">
  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
    Vitals & Physical
  </h3>
  <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
    <InfoRow label="Province" value={p.province} />
    <InfoRow label="Collection Date" value={p.collection_date} />
    <InfoRow label="BMI" value={...} />
    <InfoRow label="Weight / Height" value={...} />
    {/* ... rest of vitals */}
  </div>
</div>
```

Use 3 columns on larger screens (`lg:grid-cols-3`) instead of the current 2 columns.

### Section D: Diagnosis (Compact, no border box)

Same pattern — `rounded-xl bg-slate-50/60 p-4`, no hard border.

### Section E: Prodromal Features

Keep `FeatureCard` but soften styling:
- Remove `border border-slate-200`
- Use `bg-white rounded-lg shadow-sm p-3` instead

### Section F: Assessments (Bento Grid — the highlight)

This is the most important redesign. Replace the uniform 2-column grid with a **Bento Grid** layout:

```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {/* Large cards for primary assessments */}
  <AssessmentCard className="lg:col-span-2" ... />  {/* MDS-UPDRS — wide */}
  <AssessmentCard ... />  {/* MoCA */}
  <AssessmentCard ... />  {/* TMSE */}
  <AssessmentCard ... />  {/* HAMD */}
  <AssessmentCard ... />  {/* Epworth */}
  <AssessmentCard ... />  {/* Smell */}
  <AssessmentCard ... />  {/* RBD */}
  <AssessmentCard ... />  {/* Rome IV */}
</div>
```

#### New `AssessmentCard` component (replaces `ScoreCard`)

```tsx
function AssessmentCard({
  label,
  score,
  maxScore,
  suffix,
  category,
  className,
}: {
  label: string
  score: number | null | undefined
  maxScore?: number
  suffix?: string | null
  category: ScoreCategory
  className?: string
}) {
  const pct = score != null && maxScore ? Math.min((score / maxScore) * 100, 100) : null

  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <span className={category.tone}>{category.label}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {score != null ? score : '-'}
        </span>
        {maxScore && (
          <span className="text-sm text-gray-400">/ {maxScore}</span>
        )}
      </div>

      {suffix && <div className="mt-1 text-xs text-gray-500">{suffix}</div>}

      {/* Progress bar */}
      {pct != null && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full transition-all ${progressColor(category)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
```

#### Max scores for progress bars

| Test | Max Score | Notes |
|------|-----------|-------|
| MoCA | 30 | |
| HAMD | 52 | 17-item version |
| MDS-UPDRS | 199 | Part III only if that's what's stored; confirm with data |
| Epworth | 24 | |
| Smell Test | 16 | Sniffin' Sticks 16-item |
| TMSE | 30 | |
| RBD | 100 | RBDQ-HK total |
| Rome IV | 6 | Number of criteria met |

**Note to implementer**: These max scores are approximate. If a max score is uncertain, omit the progress bar for that test (just show the score number and category badge). The progress bar is a visual aid, not a clinical tool.

#### `progressColor` helper

```ts
function progressColor(category: ScoreCategory): string {
  if (category.tone.includes('emerald') || category.tone.includes('green')) return 'bg-emerald-400'
  if (category.tone.includes('amber') || category.tone.includes('orange')) return 'bg-orange-400'
  if (category.tone.includes('rose') || category.tone.includes('red')) return 'bg-rose-400'
  return 'bg-slate-300'
}
```

---

## Updated Constants

```ts
const STATUS_STYLES = {
  done: 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200',
  pending: 'rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200',
}

const CATEGORY_STYLES = {
  muted: 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500',
  good: 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700',
  warn: 'rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700',
  bad: 'rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700',
}
```

---

## Summary of visual changes

```
BEFORE                              AFTER
─────────────────────              ─────────────────────
┌─ DialogTitle ──────┐             Patient Summary (simple title)
│ Patient Summary    │             ┌──────────────────────────────┐
└────────────────────┘             │  ชื่อ นามสกุล     [PD] [Done]│
                                   │  HN: xxx  Age: xx  Visit 2  │
┌─ General ─── border─┐            └──────────────────────────────┘
│ HN: xxx             │
│ Age: xx              │            V1 ─── V2 ─── V3  (horizontal)
│ ...                  │
└──────────────────────┘            ┌─ Vitals ── bg-slate-50 ─────┐
                                    │  3-col grid, no border       │
┌─ Visit History ─────┐            └──────────────────────────────┘
│ ┌──V1──┐ ┌──V2──┐   │
│ └──────┘ └──────┘   │            ┌─ Assessments ── Bento ───────┐
└──────────────────────┘            │ ┌──MDS-UPDRS──┐ ┌─MoCA─┐    │
                                    │ │ 45  ▓▓▓░░░  │ │ 27   │    │
┌─ Assessments ───────┐            │ │ Borderline   │ │ Good │    │
│ ┌──MoCA──┐┌─HAMD──┐ │            │ └─────────────┘ └──────┘    │
│ │ 27     ││ 8     │ │            │ ┌─HAMD─┐ ┌─Epworth─┐ ...   │
│ └────────┘└───────┘ │            └──────────────────────────────┘
└──────────────────────┘
```

---

## Checklist

- [ ] Update `STATUS_STYLES` and `CATEGORY_STYLES` constants to soft pastel tones
- [ ] Restructure Hero Header — patient name, HN, age, badges at top
- [ ] Convert Visit History to horizontal scrollable timeline
- [ ] Vitals & Physical section — borderless `bg-slate-50/60 rounded-xl`, 3-col grid
- [ ] Diagnosis section — same borderless treatment
- [ ] Prodromal Features — `bg-white shadow-sm` cards, no hard border
- [ ] Create `AssessmentCard` component with score number, category badge, and progress bar
- [ ] Apply Bento Grid layout (`lg:grid-cols-4`, MDS-UPDRS spans 2 cols)
- [ ] Delete old `ScoreCard` component
- [ ] Remove `"Preliminary categories"` note (should already be gone from PLAN-003)
- [ ] Verify `npm run build` passes