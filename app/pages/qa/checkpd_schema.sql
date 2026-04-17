-- 1. ล้าง Schema เดิมทิ้งทั้งหมด (รวมถึง Tables, Indexes, Views ที่อยู่ในนั้น)
DROP SCHEMA IF EXISTS checkpd CASCADE;

-- 2. สร้าง Schema ใหม่
CREATE SCHEMA checkpd;

-- =============================================================
-- 1. USERS
-- =============================================================
CREATE TABLE checkpd.users (
    id                  TEXT        PRIMARY KEY,
    prefix_name         TEXT,
    first_name          TEXT,
    last_name           TEXT,
    gender              TEXT,
    bod                 TIMESTAMPTZ,
    age                 INTEGER,
    phone_number        TEXT,
    email               TEXT,
    thai_id             TEXT,
    live_address        TEXT,
    id_card_address     TEXT,
    province            TEXT,
    region              TEXT,
    area                TEXT,
    education_status    TEXT,
    occupation          TEXT,
    emolument           TEXT,
    ethnicity           TEXT,
    marital_status      TEXT,
    smoking             TEXT,
    alcohol             TEXT,
    coffee              TEXT,
    milk                TEXT,
    exercise            TEXT,
    insecticide         TEXT,
    narcotic            TEXT,
    severe_head_injury  TEXT,
    congenital_disease  TEXT,
    diagnosis           TEXT,
    level_respond_medicine TEXT,
    medicine            TEXT,
    relative            TEXT,
    irb                 BOOLEAN,
    is_staff            BOOLEAN,
    pdpa                TEXT,
    remind              TIMESTAMPTZ,
    source              TEXT,
    event_id            TEXT,
    user_timestamp     TIMESTAMPTZ,
    user_last_update    TIMESTAMPTZ,
    firebase_created_at TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX idx_checkpd_users_province  ON checkpd.users (province);
CREATE INDEX idx_checkpd_users_area      ON checkpd.users (area);
CREATE INDEX idx_checkpd_users_thai_id   ON checkpd.users (thai_id);
CREATE INDEX idx_checkpd_users_source    ON checkpd.users (source);

-- =============================================================
-- 2. RECORDS
-- =============================================================
CREATE TABLE checkpd.records (
    id                  BIGSERIAL   PRIMARY KEY,
    user_id             TEXT        NOT NULL REFERENCES checkpd.users (id),
    recorder            TEXT        NOT NULL,
    record_id           TEXT        NOT NULL,
    source_collection   TEXT        NOT NULL,
    version             TEXT,
    recorded_at         TIMESTAMPTZ,
    record_last_update  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, recorder, record_id)
);

CREATE INDEX idx_checkpd_records_user         ON checkpd.records (user_id);
CREATE INDEX idx_checkpd_records_recorder     ON checkpd.records (recorder);
CREATE INDEX idx_checkpd_records_recorded_at  ON checkpd.records (recorded_at DESC);
CREATE INDEX idx_checkpd_records_source       ON checkpd.records (source_collection);

-- =============================================================
-- 3. VIBRATION
-- =============================================================
CREATE TABLE checkpd.vibration (
    id                  BIGSERIAL   PRIMARY KEY,
    record_pk           BIGINT      NOT NULL REFERENCES checkpd.records (id) ON DELETE CASCADE,
    test_type           TEXT        NOT NULL CHECK (test_type IN ('tremorResting','tremorPostural','balance','gaitWalk')),
    sensor_raw          JSONB,
    freq_hz             NUMERIC(6,3),
    amplitude_rms       NUMERIC(10,6),
    sample_count        INTEGER,
    duration_sec        NUMERIC(8,3),
    sampling_rate_hz    NUMERIC(8,4),
    prediction_risk     BOOLEAN,
    recorded_at         TIMESTAMPTZ,
    app_version         TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkpd_vibration_record    ON checkpd.vibration (record_pk);
CREATE INDEX idx_checkpd_vibration_type      ON checkpd.vibration (test_type);
CREATE INDEX idx_checkpd_vibration_raw ON checkpd.vibration USING GIN (sensor_raw) WHERE sensor_raw IS NOT NULL;

-- =============================================================
-- 4. TAP
-- =============================================================
CREATE TABLE checkpd.tap (
    id                  BIGSERIAL   PRIMARY KEY,
    record_pk           BIGINT      NOT NULL REFERENCES checkpd.records (id) ON DELETE CASCADE,
    test_type           TEXT        NOT NULL CHECK (test_type IN ('dualTap','dualTapRight')),
    hand                TEXT,
    score               INTEGER,
    state               TEXT,
    app_version         TEXT,
    tap_raw             JSONB,
    tap_box             JSONB,
    display_info        JSONB,
    prediction_risk     BOOLEAN,
    recorded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkpd_tap_record  ON checkpd.tap (record_pk);
CREATE INDEX idx_checkpd_tap_type    ON checkpd.tap (test_type);
CREATE INDEX idx_checkpd_tap_raw ON checkpd.tap USING GIN (tap_raw) WHERE tap_raw IS NOT NULL;

-- =============================================================
-- 5. PINCH
-- =============================================================
CREATE TABLE checkpd.pinch (
    id                  BIGSERIAL   PRIMARY KEY,
    record_pk           BIGINT      NOT NULL REFERENCES checkpd.records (id) ON DELETE CASCADE,
    test_type           TEXT        NOT NULL CHECK (test_type IN ('pinchToSize','pinchToSizeRight')),
    app_version         TEXT,
    pinch_raw           JSONB,
    display             JSONB,
    prediction_risk     BOOLEAN,
    recorded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkpd_pinch_record  ON checkpd.pinch (record_pk);
CREATE INDEX idx_checkpd_pinch_raw ON checkpd.pinch USING GIN (pinch_raw) WHERE pinch_raw IS NOT NULL;

-- =============================================================
-- 6. QUESTIONNAIRE
-- =============================================================
CREATE TABLE checkpd.questionnaire (
    id                  BIGSERIAL   PRIMARY KEY,
    record_pk           BIGINT      NOT NULL REFERENCES checkpd.records (id) ON DELETE CASCADE,
    q01                 SMALLINT    CHECK (q01 IN (0, 1)),
    q02                 SMALLINT    CHECK (q02 IN (0, 1)),
    q03                 SMALLINT    CHECK (q03 IN (0, 1)),
    q04                 SMALLINT    CHECK (q04 IN (0, 1)),
    q05                 SMALLINT    CHECK (q05 IN (0, 1)),
    q06                 SMALLINT    CHECK (q06 IN (0, 1)),
    q07                 SMALLINT    CHECK (q07 IN (0, 1)),
    q08                 SMALLINT    CHECK (q08 IN (0, 1)),
    q09                 SMALLINT    CHECK (q09 IN (0, 1)),
    q10                 SMALLINT    CHECK (q10 IN (0, 1)),
    q11                 SMALLINT    CHECK (q11 IN (0, 1)),
    q12                 SMALLINT    CHECK (q12 IN (0, 1)),
    q13                 SMALLINT    CHECK (q13 IN (0, 1)),
    q14                 SMALLINT    CHECK (q14 IN (0, 1)),
    q15                 SMALLINT    CHECK (q15 IN (0, 1)),
    q16                 SMALLINT    CHECK (q16 IN (0, 1)),
    q17                 SMALLINT    CHECK (q17 IN (0, 1)),
    q18                 SMALLINT    CHECK (q18 IN (0, 1)),
    q19                 SMALLINT    CHECK (q19 IN (0, 1)),
    q20                 SMALLINT    CHECK (q20 IN (0, 1)),
    total               SMALLINT,
    prediction_risk     BOOLEAN,
    recorded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    UNIQUE (record_pk)
);

CREATE INDEX idx_checkpd_questionnaire_record  ON checkpd.questionnaire (record_pk);

-- =============================================================
-- 7. VOICE
-- =============================================================
CREATE TABLE checkpd.voice (
    id                  BIGSERIAL   PRIMARY KEY,
    record_pk           BIGINT      NOT NULL REFERENCES checkpd.records (id) ON DELETE CASCADE,
    test_type           TEXT        NOT NULL CHECK (test_type IN ('voiceAhh','voiceYPL')),
    recorded_at         TIMESTAMPTZ,
    storage_path        TEXT,
    prediction_risk     BOOLEAN,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkpd_voice_record  ON checkpd.voice (record_pk);

-- =============================================================
-- 8. PREDICTION
-- =============================================================
CREATE TABLE checkpd.prediction (
    id                  BIGSERIAL   PRIMARY KEY,
    record_pk           BIGINT      NOT NULL REFERENCES checkpd.records (id) ON DELETE CASCADE,
    risk                BOOLEAN,
    approver            TEXT,
    prediction_type     TEXT,
    note                TEXT,
    comment             TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkpd_prediction_record  ON checkpd.prediction (record_pk);
CREATE INDEX idx_checkpd_prediction_risk    ON checkpd.prediction (risk);

-- =============================================================
-- 9. RECORD SUMMARY
-- =============================================================
CREATE TABLE checkpd.record_summary (
    user_id                 TEXT        NOT NULL REFERENCES checkpd.users (id),
    recorder                TEXT        NOT NULL,
    record_id               TEXT,
    source_collection       TEXT,
    version                 TEXT,
    prediction_risk         BOOLEAN,
    record_count            INTEGER     DEFAULT 0,
    balance_count           SMALLINT    DEFAULT 0,
    dual_tap_count          SMALLINT    DEFAULT 0,
    dual_tap_right_count    SMALLINT    DEFAULT 0,
    gait_walk_count         SMALLINT    DEFAULT 0,
    pinch_count             SMALLINT    DEFAULT 0,
    pinch_right_count       SMALLINT    DEFAULT 0,
    questionnaire_count     SMALLINT    DEFAULT 0,
    tremor_postural_count   SMALLINT    DEFAULT 0,
    tremor_resting_count    SMALLINT    DEFAULT 0,
    voice_ahh_count         SMALLINT    DEFAULT 0,
    voice_ypl_count         SMALLINT    DEFAULT 0,
    tremor_resting_hz       NUMERIC(6,3),
    tremor_postural_hz      NUMERIC(6,3),
    balance_hz              NUMERIC(6,3),
    gait_hz                 NUMERIC(6,3),
    dual_tap_left_score     INTEGER,
    dual_tap_right_score    INTEGER,
    voice_ahh_ts            TIMESTAMPTZ,
    voice_ypl_ts            TIMESTAMPTZ,
    questionnaire_total     SMALLINT,
    condition               TEXT,
    condition_status        TEXT        DEFAULT 'none',
    condition_changed_at    TIMESTAMPTZ,
    test_result             TEXT,
    other                   TEXT,
    thaiid                  TEXT,
    firebase_path           TEXT,
    last_record_at          TIMESTAMPTZ,
    last_migrate            TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, recorder)
);

CREATE INDEX idx_checkpd_summary_risk         ON checkpd.record_summary (prediction_risk);
CREATE INDEX idx_checkpd_summary_last_mig     ON checkpd.record_summary (last_migrate DESC);
CREATE INDEX idx_checkpd_summary_condition    ON checkpd.record_summary (condition);
CREATE INDEX idx_checkpd_summary_test_result  ON checkpd.record_summary (test_result);
CREATE INDEX idx_checkpd_summary_source       ON checkpd.record_summary (source_collection);

-- =============================================================
-- 10. MIGRATION STATE
-- =============================================================
CREATE TABLE checkpd.migration_state (
    job_name                TEXT        PRIMARY KEY,
    last_committed_ts       TIMESTAMPTZ,
    overlap_interval        INTERVAL    DEFAULT '5 minutes',
    status                  TEXT        DEFAULT 'idle',
    last_error              TEXT,
    last_successful_run_id  UUID
);

INSERT INTO checkpd.migration_state (job_name) VALUES ('users'), ('temps'), ('summaries') ON CONFLICT DO NOTHING;

-- =============================================================
-- 11. MIGRATION RUN
-- =============================================================
CREATE TABLE checkpd.migration_run (
    run_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name        TEXT        NOT NULL,
    started_at      TIMESTAMPTZ DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    since_ts        TIMESTAMPTZ,
    success         BOOLEAN,
    processed_count INTEGER     DEFAULT 0,
    error_message   TEXT
);

CREATE INDEX idx_checkpd_run_job       ON checkpd.migration_run (job_name);
CREATE INDEX idx_checkpd_run_started   ON checkpd.migration_run (started_at DESC);

-- =============================================================
-- 12. MIGRATION ERROR LOG
-- =============================================================
CREATE TABLE checkpd.migration_error_log (
    id                  BIGSERIAL   PRIMARY KEY,
    job_name            TEXT        NOT NULL,
    run_id              UUID,
    source_collection   TEXT,
    user_id             TEXT        NOT NULL,
    record_id           TEXT        NOT NULL DEFAULT '',
    test_type           TEXT        NOT NULL DEFAULT '',
    error_message       TEXT        NOT NULL,
    attempt_count       SMALLINT    NOT NULL DEFAULT 1,
    resolved            BOOLEAN     NOT NULL DEFAULT false,
    first_error_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_name, source_collection, user_id, record_id, test_type)
);

CREATE INDEX idx_checkpd_error_retry ON checkpd.migration_error_log (job_name, source_collection, resolved, attempt_count, last_error_at DESC);
