# PLAN-003: Redesign Assessments in Summary Modal (Production Thresholds)

## Overview

Replace the preliminary `getPreliminaryScoreCategory()` function in `QaPatientSummaryModal.tsx` with **production-grade clinical thresholds**. Each test score should show a meaningful clinical interpretation label and color-coded badge, based on the criteria defined in `assessment.txt` and standard clinical cutoffs.

Currently the function uses placeholder thresholds (e.g. `score >= 25` = good for everything). The redesign maps each test to its actual clinical ranges.

---

## File to modify

### `app/component/qa/QaPatientSummaryModal.tsx`

Replace the single `getPreliminaryScoreCategory()` function with per-test category logic.

---

## Clinical Thresholds

### HAMD (Hamilton Depression Rating Scale)

| Score Range | Label | Color |
|-------------|-------|-------|
| 0-7 | No depression | green (good) |
| 8-12 | Mild depression | amber (warn) |
| 13-17 | Moderate depression | rose (bad) |
| 18-29 | Major depression | rose (bad) |
| 30+ | Severe depression | rose (bad) |

**Clinical note**: HAM-D >= 13 is the threshold for prodromal "Depression" flag in `DIAGNOSIS_GUIDES`.

### Epworth Sleepiness Scale (ESS)

| Score Range | Label | Color |
|-------------|-------|-------|
| < 7 | Normal | green (good) |
| 7-9 | Borderline | amber (warn) |
| >= 10 | Excessive daytime sleepiness | rose (bad) |

**Clinical note**: ESS >= 10 is the threshold for prodromal "EDS" flag.

### RBD Questionnaire (RBDQ)

| Score Range | Label | Color |
|-------------|-------|-------|
| < 17 | Normal | green (good) |
| >= 17 | Suspected RBD | rose (bad) |

**Clinical note**: RBDQ >= 17 or PSG confirmed → Suspected RBD in `DIAGNOSIS_GUIDES`.

### Rome IV (Constipation)

| Score Range | Label | Color |
|-------------|-------|-------|
| 0-1 | Normal | green (good) |
| >= 2 | Functional constipation | rose (bad) |

**Clinical note**: ROME IV >= 2 is the threshold for prodromal "Constipation" flag.

### MDS-UPDRS (Motor Assessment)

| Score Range | Label | Color |
|-------------|-------|-------|
| 0-3 | Normal | green (good) |
| 4-6 | Borderline | amber (warn) |
| > 6 | Mild parkinsonian sign | rose (bad) |

**Clinical note**: From `DIAGNOSIS_GUIDES` — total UPDRS > 6 (without meeting PD criteria) suggests mild parkinsonian sign.

### Smell Test (Sniffin' Sticks)

| Score Range | Label | Color |
|-------------|-------|-------|
| > 9 | Normal | green (good) |
| <= 9 | Hyposmia | rose (bad) |

**Clinical note**: Sniffin stick <= 9 is the threshold for prodromal "Hyposmia" flag.

### MoCA (Montreal Cognitive Assessment)

| Score Range | Label | Color |
|-------------|-------|-------|
| >= 26 | Normal | green (good) |
| 18-25 | Mild cognitive impairment | amber (warn) |
| < 18 | Severe cognitive impairment | rose (bad) |

**Standard clinical cutoff** (not in assessment.txt but widely accepted).

### TMSE (Thai Mental State Examination)

| Score Range | Label | Color |
|-------------|-------|-------|
| >= 24 | Normal | green (good) |
| < 24 | Cognitive impairment | rose (bad) |

**Standard Thai clinical cutoff** (TMSE < 24 suggests cognitive impairment).

---

## Implementation Details

### Replace `getPreliminaryScoreCategory()`

Replace the single function with a lookup approach. Example structure:

```ts
type ScoreThreshold = {
  max?: number   // score <= max
  min?: number   // score >= min
  label: string
  tone: string   // key of CATEGORY_STYLES
}

const SCORE_THRESHOLDS: Record<string, ScoreThreshold[]> = {
  hamd: [
    { max: 7, label: 'No depression', tone: 'good' },
    { max: 12, label: 'Mild depression', tone: 'warn' },
    { max: 17, label: 'Moderate depression', tone: 'bad' },
    { max: 29, label: 'Major depression', tone: 'bad' },
    { min: 30, label: 'Severe depression', tone: 'bad' },
  ],
  epworth: [
    { max: 6, label: 'Normal', tone: 'good' },
    { max: 9, label: 'Borderline', tone: 'warn' },
    { min: 10, label: 'EDS', tone: 'bad' },
  ],
  rbd: [
    { max: 16, label: 'Normal', tone: 'good' },
    { min: 17, label: 'Suspected RBD', tone: 'bad' },
  ],
  rome4: [
    { max: 1, label: 'Normal', tone: 'good' },
    { min: 2, label: 'Functional constipation', tone: 'bad' },
  ],
  mds: [
    { max: 3, label: 'Normal', tone: 'good' },
    { max: 6, label: 'Borderline', tone: 'warn' },
    { min: 7, label: 'Mild parkinsonian sign', tone: 'bad' },
  ],
  smell: [
    { max: 9, label: 'Hyposmia', tone: 'bad' },
    { min: 10, label: 'Normal', tone: 'good' },
  ],
  moca: [
    { max: 17, label: 'Severe cognitive impairment', tone: 'bad' },
    { max: 25, label: 'Mild cognitive impairment', tone: 'warn' },
    { min: 26, label: 'Normal', tone: 'good' },
  ],
  tmse: [
    { max: 23, label: 'Cognitive impairment', tone: 'bad' },
    { min: 24, label: 'Normal', tone: 'good' },
  ],
}

function getScoreCategory(kind: string, score: number | null | undefined): ScoreCategory {
  if (score == null) return { label: 'No data', tone: CATEGORY_STYLES.muted }

  const thresholds = SCORE_THRESHOLDS[kind]
  if (!thresholds) return { label: String(score), tone: CATEGORY_STYLES.muted }

  for (const t of thresholds) {
    if (t.max != null && score <= t.max) return { label: t.label, tone: CATEGORY_STYLES[t.tone] }
    if (t.min != null && t.max == null && score >= t.min) return { label: t.label, tone: CATEGORY_STYLES[t.tone] }
  }

  return { label: String(score), tone: CATEGORY_STYLES.muted }
}
```

### Update ScoreCard calls

Change all `getPreliminaryScoreCategory(...)` calls to `getScoreCategory(...)`:

```tsx
<ScoreCard label="MoCA"             score={moca?.total_score}  category={getScoreCategory('moca', moca?.total_score)} />
<ScoreCard label="HAMD"             score={hamd?.total_score}  suffix={hamd?.severity_level} category={getScoreCategory('hamd', hamd?.total_score)} />
<ScoreCard label="MDS-UPDRS"        score={mds?.total_score}   category={getScoreCategory('mds', mds?.total_score)} />
<ScoreCard label="Epworth"          score={epw?.total_score}   category={getScoreCategory('epworth', epw?.total_score)} />
<ScoreCard label="Smell Test"       score={smell?.total_score} category={getScoreCategory('smell', smell?.total_score)} />
<ScoreCard label="TMSE"             score={tmse?.total_score}  category={getScoreCategory('tmse', tmse?.total_score)} />
<ScoreCard label="RBD Questionnaire" score={rbd?.total_score}  category={getScoreCategory('rbd', rbd?.total_score)} />
<ScoreCard label="Rome IV"          score={rome4?.total_score} category={getScoreCategory('rome4', rome4?.total_score)} />
```

### Remove the "Preliminary" note

Remove this line from the Assessments section header:
```tsx
<span className="text-xs text-muted-foreground">Preliminary categories, update thresholds later</span>
```

### Delete old function

Delete `getPreliminaryScoreCategory()` entirely after replacing with `getScoreCategory()`.

---

## No other files need changes

- `types.ts` — no changes
- `QaTable.tsx` — no changes
- `page.tsx` — no changes

This is a self-contained change within `QaPatientSummaryModal.tsx`.

---

## Checklist

- [ ] Define `SCORE_THRESHOLDS` record with all 8 tests
- [ ] Implement `getScoreCategory()` function
- [ ] Replace all 8 `getPreliminaryScoreCategory()` calls with `getScoreCategory()`
- [ ] Remove "Preliminary categories" note from section header
- [ ] Delete old `getPreliminaryScoreCategory()` function
- [ ] Verify `npm run build` passes
