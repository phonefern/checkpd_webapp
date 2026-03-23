-- ============================================================
-- PD Screening System - Database Schema v2
-- Design: 1 patient → 12 test tables (all linked via patient_id)
-- Hash: MD5(submission_timestamp || first_name || last_name)
-- Schema: core
-- ============================================================

CREATE SCHEMA IF NOT EXISTS core;


-- ============================================================
-- TABLE 1: patients_v2
-- Demographics + vitals
-- ============================================================
CREATE TABLE core.patients_v2 (
  id                     SERIAL PRIMARY KEY,
  form_submission_hash   TEXT NOT NULL UNIQUE,  -- MD5(timestamp+firstname+lastname)
  submission_timestamp   TIMESTAMPTZ NULL,
  first_name             TEXT NULL,
  last_name              TEXT NULL,
  age                    INTEGER NULL,
  province               TEXT NULL,
  collection_date        DATE NULL,
  hn_number              TEXT NULL,
  weight                 NUMERIC NULL,
  height                 NUMERIC NULL,
  bmi                    NUMERIC NULL,
  chest_cm               NUMERIC NULL,
  hip_cm                 NUMERIC NULL,
  neck_cm                NUMERIC NULL,
  waist_cm               NUMERIC NULL,
  bp_supine              TEXT NULL,
  pr_supine              TEXT NULL,
  bp_upright             TEXT NULL,
  pr_upright             TEXT NULL,
  created_at             TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at             TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  thaiid                 TEXT NULL,
);

CREATE INDEX idx_patients_v2_hash         ON core.patients_v2 (form_submission_hash);
CREATE INDEX idx_patients_v2_collection   ON core.patients_v2 (collection_date);


-- ============================================================
-- TABLE 2: patient_diagnosis_v2
-- PD/Prodromal classification + prodromal onset info
-- + standalone clinical scores (ADLs, SCOPA-AUT)
-- ============================================================
CREATE TABLE core.patient_diagnosis_v2 (
  id                       SERIAL PRIMARY KEY,
  patient_id               INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,
  condition                TEXT NULL,  -- 'PD', 'Newly diagnosis', 'Prodromal', 'High risk', 'Other'
  disease_duration         TEXT NULL,
  hy_stage                 TEXT NULL,
  other_diagnosis_text     TEXT NULL,

  -- Prodromal / High risk flags + onset
  rbd_suspected            BOOLEAN DEFAULT FALSE,
  rbd_onset_age            TEXT NULL,
  rbd_duration             TEXT NULL,

  hyposmia                 BOOLEAN DEFAULT FALSE,
  hyposmia_onset_age       TEXT NULL,
  hyposmia_duration        TEXT NULL,

  constipation             BOOLEAN DEFAULT FALSE,
  constipation_onset_age   TEXT NULL,
  constipation_duration    TEXT NULL,

  depression               BOOLEAN DEFAULT FALSE,
  depression_onset_age     TEXT NULL,
  depression_duration      TEXT NULL,

  eds                      BOOLEAN DEFAULT FALSE,
  eds_onset_age            TEXT NULL,
  eds_duration             TEXT NULL,

  ans_dysfunction          BOOLEAN DEFAULT FALSE,
  ans_onset_age            TEXT NULL,
  ans_duration             TEXT NULL,

  -- Standalone clinical scores (no detailed sub-questions in form)
  adl_score                NUMERIC NULL,
  scopa_aut_score          NUMERIC NULL,
  blood_test_note          TEXT NULL,
  fdopa_pet_requested      BOOLEAN NULL,
  fdopa_pet_score          TEXT NULL,

  created_at               TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at               TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_diagnosis_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 3: mds_updrs_v2
-- MDS-UPDRS Part I (1.1-1.13), Part II (2.1-2.13),
--           Part III (3.1-3.18 + dyskinesia + H&Y),
--           Part IV (4.1-4.6)
-- ============================================================
CREATE TABLE core.mds_updrs_v2 (
  id                              SERIAL PRIMARY KEY,
  patient_id                      INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  -- Pre-assessment
  source_of_info                  TEXT NULL,       -- 1.A
  medication_status               BOOLEAN NULL,    -- 3a: on medication?
  clinical_state                  TEXT NULL,       -- 3b: ON/OFF
  levodopa                        BOOLEAN NULL,    -- 3c
  levodopa_last_dose_min          TEXT NULL,       -- 3c1

  -- Part I: Non-motor experiences of daily living (1.1 - 1.13)
  p1_q01_cognitive_impairment     INTEGER NULL,
  p1_q02_hallucinations_psychosis INTEGER NULL,
  p1_q03_depressed_mood           INTEGER NULL,
  p1_q04_anxious_mood             INTEGER NULL,
  p1_q05_apathy                   INTEGER NULL,
  p1_q06_dds                      INTEGER NULL,
  p1_q06a_who_filling             TEXT NULL,
  p1_q07_sleep_problems           INTEGER NULL,
  p1_q08_daytime_sleepiness       INTEGER NULL,
  p1_q09_pain_sensations          INTEGER NULL,
  p1_q10_urinary_problems         INTEGER NULL,
  p1_q11_constipation_problems    INTEGER NULL,
  p1_q12_lightheadedness          INTEGER NULL,
  p1_q13_fatigue                  INTEGER NULL,
  p1_total                        INTEGER NULL,

  -- Part II: Motor experiences of daily living (2.1 - 2.13)
  p2_q01_speech                   INTEGER NULL,
  p2_q02_saliva_drooling          INTEGER NULL,
  p2_q03_chewing_swallowing       INTEGER NULL,
  p2_q04_eating_tasks             INTEGER NULL,
  p2_q05_dressing                 INTEGER NULL,
  p2_q06_hygiene                  INTEGER NULL,
  p2_q07_handwriting              INTEGER NULL,
  p2_q08_hobbies_activities       INTEGER NULL,
  p2_q09_turning_in_bed           INTEGER NULL,
  p2_q10_tremor                   INTEGER NULL,
  p2_q11_getting_out_of_bed       INTEGER NULL,
  p2_q12_walking_balance          INTEGER NULL,
  p2_q13_freezing                 INTEGER NULL,
  p2_total                        INTEGER NULL,

  -- Part III: Motor examination (3.1 - 3.18)
  p3_q01_speech                   INTEGER NULL,
  p3_q02_facial_expression        INTEGER NULL,
  p3_q03a_rigidity_neck           INTEGER NULL,
  p3_q03b_rigidity_rue            INTEGER NULL,
  p3_q03c_rigidity_lue            INTEGER NULL,
  p3_q03d_rigidity_rle            INTEGER NULL,
  p3_q03e_rigidity_lle            INTEGER NULL,
  p3_q04a_finger_tapping_right    INTEGER NULL,
  p3_q04b_finger_tapping_left     INTEGER NULL,
  p3_q05a_hand_movements_right    INTEGER NULL,
  p3_q05b_hand_movements_left     INTEGER NULL,
  p3_q06a_pronation_sup_right     INTEGER NULL,
  p3_q06b_pronation_sup_left      INTEGER NULL,
  p3_q07a_toe_tapping_right       INTEGER NULL,
  p3_q07b_toe_tapping_left        INTEGER NULL,
  p3_q08a_leg_agility_right       INTEGER NULL,
  p3_q08b_leg_agility_left        INTEGER NULL,
  p3_q09_arising_from_chair       INTEGER NULL,
  p3_q10_gait                     INTEGER NULL,
  p3_q11_freezing_of_gait         INTEGER NULL,
  p3_q12_postural_stability       INTEGER NULL,
  p3_q13_posture                  INTEGER NULL,
  p3_q14_global_spontaneity       INTEGER NULL,
  p3_q15a_postural_tremor_right   INTEGER NULL,
  p3_q15b_postural_tremor_left    INTEGER NULL,
  p3_q16a_kinetic_tremor_right    INTEGER NULL,
  p3_q16b_kinetic_tremor_left     INTEGER NULL,
  p3_q17a_rest_tremor_rue         INTEGER NULL,
  p3_q17b_rest_tremor_lue         INTEGER NULL,
  p3_q17c_rest_tremor_rle         INTEGER NULL,
  p3_q17d_rest_tremor_lle         INTEGER NULL,
  p3_q17e_rest_tremor_lip_jaw     INTEGER NULL,
  p3_q18_constancy_rest_tremor    INTEGER NULL,
  p3_dyskinesia_present           BOOLEAN NULL,
  p3_dyskinesia_interfere         BOOLEAN NULL,
  p3_hy_stage                     TEXT NULL,
  p3_total                        INTEGER NULL,

  -- Part IV: Motor complications (4.1 - 4.6)
  p4_q01_dyskinesia_time          INTEGER NULL,
  p4_q01_dyskinesia_time_raw      TEXT NULL,   -- raw text from form e.g. "25%"
  p4_q02_dyskinesia_impact        INTEGER NULL,
  p4_q03_off_state_time           INTEGER NULL,
  p4_q04_fluctuation_impact       INTEGER NULL,
  p4_q05_motor_fluctuation_complex INTEGER NULL,
  p4_q06_painful_off_dystonia     INTEGER NULL,
  p4_total                        INTEGER NULL,

  total_score                     INTEGER NULL,
  created_at                      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_mds_updrs_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 4: smell_test_v2
-- Thai smell test OR Sniffin stick (16 items)
-- Correct answer key: 1=A, 2=B, 3=D, 4=C, 5=C, 6=C, 7=A, 8=D, 9=B, 10=B, 11=D, 12=A, 13=D, 14=B, 15=A, 16=C
-- ============================================================
CREATE TABLE core.smell_test_v2 (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,
  test_type       TEXT NULL,  -- 'thai_smell_test' or 'sniffin_stick'

  smell_01_answer TEXT NULL,  -- correct: A (ส้ม)
  smell_02_answer TEXT NULL,  -- correct: B (เครื่องหนัง)
  smell_03_answer TEXT NULL,  -- correct: D (ซินนามอน/อบเชย)
  smell_04_answer TEXT NULL,  -- correct: C (เปปเปอร์มินต์/สะระแหน่)
  smell_05_answer TEXT NULL,  -- correct: C (กล้วย)
  smell_06_answer TEXT NULL,  -- correct: C (มะนาว)
  smell_07_answer TEXT NULL,  -- correct: A (ชะเอม)
  smell_08_answer TEXT NULL,  -- correct: D (น้ำมันสน)
  smell_09_answer TEXT NULL,  -- correct: B (กระเทียม)
  smell_10_answer TEXT NULL,  -- correct: B (กาแฟ)
  smell_11_answer TEXT NULL,  -- correct: D (แอปเปิ้ล)
  smell_12_answer TEXT NULL,  -- correct: A (กานพลู)
  smell_13_answer TEXT NULL,  -- correct: D (สับปะรด)
  smell_14_answer TEXT NULL,  -- correct: B (กุหลาบ)
  smell_15_answer TEXT NULL,  -- correct: A (โป๊ยกั๊ก)
  smell_16_answer TEXT NULL,  -- correct: C (ปลา)

  total_score     INTEGER NULL,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_smell_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 5: tmse_v2
-- Thai Mental State Examination
-- ============================================================
CREATE TABLE core.tmse_v2 (
  id                           SERIAL PRIMARY KEY,
  patient_id                   INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  -- Orientation (6 items, 1 pt each)
  orientation_day              INTEGER NULL,
  orientation_date             INTEGER NULL,
  orientation_month            INTEGER NULL,
  orientation_time             INTEGER NULL,
  orientation_place            INTEGER NULL,
  orientation_picture          INTEGER NULL,

  -- Registration (3 pts)
  registration                 INTEGER NULL,

  -- Attention (1 pt)
  attention                    INTEGER NULL,

  -- Calculation (1 pt)
  calculation                  INTEGER NULL,

  -- Language (9 pts)
  language_watch               INTEGER NULL,
  language_shirt               INTEGER NULL,
  language_repeat              INTEGER NULL,
  language_3step_take_paper    INTEGER NULL,
  language_3step_fold_paper    INTEGER NULL,
  language_3step_hand_paper    INTEGER NULL,
  language_read_close_eyes     INTEGER NULL,
  language_draw                INTEGER NULL,
  language_similarity          INTEGER NULL,

  -- Recall (3 pts)
  recall                       INTEGER NULL,

  total_score                  INTEGER NULL,
  created_at                   TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_tmse_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 6: moca_v2
-- Montreal Cognitive Assessment
-- ============================================================
CREATE TABLE core.moca_v2 (
  id                       SERIAL PRIMARY KEY,
  patient_id               INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  visuospatial_executive   INTEGER NULL,  -- max 5
  naming                   INTEGER NULL,  -- max 3
  -- memory: no score (learning only)
  attention_digits         INTEGER NULL,  -- max 2
  attention_serial7        INTEGER NULL,  -- max 3 
  attention_vigilance      INTEGER NULL,  -- max 1
  language_repeat          INTEGER NULL,  -- max 2
  language_fluency         INTEGER NULL,  -- max 1
  abstraction              INTEGER NULL,  -- max 2
  delayed_recall           INTEGER NULL,  -- max 5
  orientation              INTEGER NULL,  -- max 6

  total_score              INTEGER NULL,
  created_at               TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_moca_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 7: hamd_v2
-- Hamilton Depression Rating Scale (17 items)
-- ============================================================
CREATE TABLE core.hamd_v2 (
  id                           SERIAL PRIMARY KEY,
  patient_id                   INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  q01_depressed_mood           INTEGER NULL,
  q02_guilt                    INTEGER NULL,
  q03_suicide                  INTEGER NULL,
  q04_insomnia_early           INTEGER NULL,
  q05_insomnia_middle          INTEGER NULL,
  q06_insomnia_late            INTEGER NULL,
  q07_work_activities          INTEGER NULL,
  q08_retardation              INTEGER NULL,
  q09_agitation                INTEGER NULL,
  q10_anxiety_psychological    INTEGER NULL,
  q11_anxiety_somatic          INTEGER NULL,
  q12_somatic_gastrointestinal INTEGER NULL,
  q13_somatic_general          INTEGER NULL,
  q14_genital_symptoms         INTEGER NULL,
  q15_hypochondriasis          INTEGER NULL,
  q16a_weight_loss_history     INTEGER NULL,
  q16b_weight_loss_measured    INTEGER NULL,
  q17_insight                  INTEGER NULL,

  total_score                  INTEGER NULL,
  severity_level               TEXT NULL,   -- 'ไม่มีภาวะซึมเศร้า' / 'ระดับน้อย' / etc.
  created_at                   TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_hamd_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 8: rome4_v2
-- Rome IV Constipation Criteria (6 items)
-- ============================================================
CREATE TABLE core.rome4_v2 (
  id                          SERIAL PRIMARY KEY,
  patient_id                  INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  q01_straining               INTEGER NULL,  -- เบ่ง >= 25%
  q02_hard_stool              INTEGER NULL,  -- อุจจาระแข็ง >= 25%
  q03_incomplete_evacuation   INTEGER NULL,  -- รู้สึกไม่หมด >= 25%
  q04_anorectal_obstruction   INTEGER NULL,  -- รู้สึกมีสิ่งกีดขวาง >= 25%
  q05_manual_maneuvers        INTEGER NULL,  -- ใช้มือช่วย >= 25%
  q06_less_3_per_week         INTEGER NULL,  -- < 3 ครั้ง/สัปดาห์

  total_score                 INTEGER NULL,
  created_at                  TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_rome4_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 9: rbd_questionnaire_v2
-- RBD Sleep Behavior Questionnaire (13 questions)
-- Each question: answer (text) + score (int) + frequency (text)
-- ============================================================
CREATE TABLE core.rbd_questionnaire_v2 (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  q01_answer TEXT NULL, q01_score INTEGER NULL, q01_frequency TEXT NULL,  -- ฝันบ่อย
  q02_answer TEXT NULL, q02_score INTEGER NULL, q02_frequency TEXT NULL,  -- ฝันร้าย
  q03_answer TEXT NULL, q03_score INTEGER NULL, q03_frequency TEXT NULL,  -- ฝันสะเทือนใจ
  q04_answer TEXT NULL, q04_score INTEGER NULL, q04_frequency TEXT NULL,  -- ฝันรุนแรง/ก้าวร้าว
  q05_answer TEXT NULL, q05_score INTEGER NULL, q05_frequency TEXT NULL,  -- ฝันน่ากลัว
  q06_answer TEXT NULL, q06_score INTEGER NULL, q06_frequency TEXT NULL,  -- ละเมอพูด
  q07_answer TEXT NULL, q07_score INTEGER NULL, q07_frequency TEXT NULL,  -- ตะโกนโวยวาย
  q08_answer TEXT NULL, q08_score INTEGER NULL, q08_frequency TEXT NULL,  -- ขยับแขนขา
  q09_answer TEXT NULL, q09_score INTEGER NULL, q09_frequency TEXT NULL,  -- พลัดตกเตียง
  q10_answer TEXT NULL, q10_score INTEGER NULL, q10_frequency TEXT NULL,  -- ทำร้ายตัวเอง/คู่นอน
  q11_answer TEXT NULL, q11_score INTEGER NULL, q11_frequency TEXT NULL,  -- พยายามทำร้ายคู่นอน
  q12_answer TEXT NULL, q12_score INTEGER NULL, q12_frequency TEXT NULL,  -- เกี่ยวกับเนื้อหาฝัน
  q13_answer TEXT NULL, q13_score INTEGER NULL, q13_frequency TEXT NULL,  -- รบกวนการนอน

  total_score     INTEGER NULL,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_rbd_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 10: epworth_v2
-- Epworth Sleepiness Scale (7 items)
-- ============================================================
CREATE TABLE core.epworth_v2 (
  id                       SERIAL PRIMARY KEY,
  patient_id               INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  q01_reading              INTEGER NULL,  -- นั่งอ่านหนังสือ
  q02_watching_tv          INTEGER NULL,  -- ดูโทรทัศน์
  q03_sitting_public       INTEGER NULL,  -- นั่งเฉยในที่สาธารณะ
  q04_passenger            INTEGER NULL,  -- โดยสารยานพาหนะ
  q05_after_lunch          INTEGER NULL,  -- นั่งเงียบหลังอาหาร
  q06_sitting_resting      INTEGER NULL,  -- นั่งเอนพักผ่อน
  q07_stopped_traffic      INTEGER NULL,  -- ขับรถติดสัญญาณ

  total_score              INTEGER NULL,
  interpretation           TEXT NULL,    -- '<7 ปกติ' / '7-9 มีแนวโน้ม' / '>9 ผิดปกติ'
  created_at               TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_epworth_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 11: vision_tests_v2
-- Color discrimination (paper + app), Contrast (manual + app),
-- Visual acuity
-- ============================================================
CREATE TABLE core.vision_tests_v2 (
  id                              SERIAL PRIMARY KEY,
  patient_id                      INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  -- Color discrimination — Paper
  color_paper_re_test             TEXT NULL,     -- result text (pass/fail/tritan/etc.)
  color_paper_re_test_abnormal    INTEGER NULL,  -- 0=normal, 1=abnormal
  color_paper_re_retest           TEXT NULL,
  color_paper_re_retest_abnormal  INTEGER NULL,
  color_paper_le_test             TEXT NULL,
  color_paper_le_test_abnormal    INTEGER NULL,
  color_paper_le_retest           TEXT NULL,
  color_paper_le_retest_abnormal  INTEGER NULL,

  -- Color discrimination — Application
  color_app_re_test               TEXT NULL,
  color_app_re_test_abnormal      INTEGER NULL,
  color_app_re_retest             TEXT NULL,
  color_app_re_retest_abnormal    INTEGER NULL,
  color_app_le_test               TEXT NULL,
  color_app_le_test_abnormal      INTEGER NULL,
  color_app_le_retest             TEXT NULL,
  color_app_le_retest_abnormal    INTEGER NULL,

  -- Contrast discrimination — Manual
  contrast_manual_re              TEXT NULL,
  contrast_manual_le              TEXT NULL,

  -- Contrast discrimination — Application
  contrast_app_re                 TEXT NULL,
  contrast_app_le                 TEXT NULL,

  -- Visual acuity
  va_re                           TEXT NULL,
  va_re_pinhole                   TEXT NULL,
  va_le                           TEXT NULL,
  va_le_pinhole                   TEXT NULL,

  created_at                      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_vision_patient UNIQUE (patient_id)
);


-- ============================================================
-- TABLE 12: food_questionnaire_v2
-- Thai "มีดี" Food Questionnaire (10 items, 0/1 each)
-- ============================================================
CREATE TABLE core.food_questionnaire_v2 (
  id                        SERIAL PRIMARY KEY,
  patient_id                INTEGER NOT NULL REFERENCES core.patients_v2(id) ON DELETE CASCADE,

  q01_vegetables            INTEGER NULL,  -- บริโภคผัก
  q02_fruits                INTEGER NULL,  -- ผลไม้/น้ำผลไม้
  q03_nuts                  INTEGER NULL,  -- ถั่วต่างๆ >= 3 ครั้ง/สัปดาห์
  q04_whole_grains          INTEGER NULL,  -- ธัญพืชไม่ขัดสี
  q05_white_meat            INTEGER NULL,  -- เนื้อขาว >= 2 ครั้ง/สัปดาห์
  q06_red_meat_less         INTEGER NULL,  -- เนื้อแดง < 2 ครั้ง/สัปดาห์
  q07_processed_meat_avoid  INTEGER NULL,  -- หลีกเลี่ยงเนื้อแปรรูป
  q08_dairy                 INTEGER NULL,  -- ผลิตภัณฑ์นม 1-2 ครั้ง/สัปดาห์
  q09_olive_oil             INTEGER NULL,  -- น้ำมันมะกอก
  q10_avoid_sweets          INTEGER NULL,  -- หลีกเลี่ยงขนมหวาน

  total_score               INTEGER NULL,
  created_at                TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT uq_food_patient UNIQUE (patient_id)
);


-- ============================================================
-- INDEXES (patient_id lookup สำหรับทุก test table)
-- ============================================================
CREATE INDEX idx_diagnosis_patient_id     ON core.patient_diagnosis_v2     (patient_id);
CREATE INDEX idx_mds_updrs_patient_id     ON core.mds_updrs_v2             (patient_id);
CREATE INDEX idx_smell_patient_id         ON core.smell_test_v2            (patient_id);
CREATE INDEX idx_tmse_patient_id          ON core.tmse_v2                  (patient_id);
CREATE INDEX idx_moca_patient_id          ON core.moca_v2                  (patient_id);
CREATE INDEX idx_hamd_patient_id          ON core.hamd_v2                  (patient_id);
CREATE INDEX idx_rome4_patient_id         ON core.rome4_v2                 (patient_id);
CREATE INDEX idx_rbd_patient_id           ON core.rbd_questionnaire_v2     (patient_id);
CREATE INDEX idx_epworth_patient_id       ON core.epworth_v2               (patient_id);
CREATE INDEX idx_vision_patient_id        ON core.vision_tests_v2          (patient_id);
CREATE INDEX idx_food_patient_id          ON core.food_questionnaire_v2    (patient_id);
