//app/component/papers/types.ts

export interface PatientData {
  id: number;
  thaiid?: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: string;
  province: string;
  collection_date: string;
  hn_number: string;
  prediction_risk?: boolean | null;
  condition?: string;
  other?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  waist?: string;
  chest?: string;
  neck?: string;
  hip?: string;
  bp_supine?: string;
  pr_supine?: string;
  bp_upright?: string;
  pr_upright?: string;
  risk_factors?: {
    rome4_score: number | null;
    epworth_score: number | null;
    hamd_score: number | null;
    sleep_score: number | null;
    smell_score: number | null;
    mds_score: number | null;
    moca_score: number | null;
    tmse_score: number | null;
  };
}

export interface EditScores {
  rome4_score: number | null;
  epworth_score: number | null;
  hamd_score: number | null;
  sleep_score: number | null;
  smell_score: number | null;
  mds_score: number | null;
  moca_score: number | null;
  tmse_score: number | null;
}