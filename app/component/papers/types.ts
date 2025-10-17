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
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  waist?: number | null;
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