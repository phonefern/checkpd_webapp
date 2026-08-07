import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
import os
import time
import psycopg2
import pytz
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import json
from functools import wraps
 

BANGKOK_TZ = pytz.timezone('Asia/Bangkok')
def get_db_connection(connection_purpose=None):
    conn = None
    connection_info = {
        'host': os.getenv("SUPABASE_HOST"),
        'port': os.getenv("SUPABASE_PORT"),
        'dbname': os.getenv("SUPABASE_DB"),
        'user': os.getenv("SUPABASE_USER"),
        'password': os.getenv("SUPABASE_PASSWORD"),
        'connect_timeout': 10  
    }
    start_time = time.time()
    try:
        # Mask password in logs
        logged_info = connection_info.copy()
        logged_info['password'] = '*******' if connection_info['password'] else 'default_pwd'
        
        logger.debug(f"Attempting DB connection with params: {logged_info}")
        if connection_purpose:
            logger.debug(f"Connection purpose: {connection_purpose}")
        
        conn = psycopg2.connect(**connection_info)
        
        # Get some useful stats
        with conn.cursor() as cur:
            cur.execute("SELECT pg_backend_pid() AS pid, current_database()")
            db_info = cur.fetchone()
            cur.execute("SELECT count(*) FROM pg_stat_activity WHERE pid != pg_backend_pid()")
            other_connections = cur.fetchone()[0]
        
        connection_time = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"DB connection established | "
            f"PID: {db_info[0]} | DB: {db_info[1]} | "
            f"Other active connections: {other_connections} | "
            f"Connection time: {connection_time}ms"
        )
        
        return conn
        
    except Exception as e:
        connection_time = round((time.time() - start_time) * 1000, 2)
        logger.error(
            f"DB connection failed after {connection_time}ms | "
            f"Error: {str(e)}"
        )
        raise

# def initialize_firebase():
#     try:
        
#         cred_path = os.environ.get('FIREBASE_CRED_PATH')
        
#         if not cred_path:
#             raise ValueError("FIREBASE_CRED_PATH environment variable not set.")

        
#         if not os.path.exists(cred_path):
#             raise FileNotFoundError(f"No file found at {cred_path}")

        
#         cred = credentials.Certificate(cred_path)
#         firebase_admin.initialize_app(cred)
        
#         logger.info("Firebase initialized successfully using file path.")
#         return firebase_admin.firestore.client()
#     except Exception as e:
#         logger.critical(f"Firebase initialization failed: {e}")
#         raise

def initialize_firebase():
    try:
        cred_value = os.environ.get('FIREBASE_CREDS')
        
        if not cred_value:
            raise ValueError("FIREBASE_CREDS environment variable not set.")

        
        if cred_value.strip().startswith('{'):
           
            cred_dict = json.loads(cred_value)
            cred = credentials.Certificate(cred_dict)
            logger.info("Firebase initialized successfully using JSON string.")
        else:
           
            if not os.path.exists(cred_value):
                raise FileNotFoundError(f"No file found at {cred_value}")
            cred = credentials.Certificate(cred_value)
            logger.info("Firebase initialized successfully using file path.")

        firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        logger.critical(f"Firebase initialization failed: {e}")
        raise

fs_db = initialize_firebase()

def parse_ts(val):
    try:
        if isinstance(val, datetime):

            if val.tzinfo is None:
                return pytz.utc.localize(val).astimezone(BANGKOK_TZ)
            return val.astimezone(BANGKOK_TZ)
        if isinstance(val, int):

            return datetime.fromtimestamp(val / 1000, BANGKOK_TZ)
        if isinstance(val, str):

            return datetime.fromisoformat(val.replace("Z", "+00:00")).astimezone(BANGKOK_TZ)
        return None
    except Exception as e:
        logger.warning(f"Failed to parse timestamp value '{val}' (type: {type(val)}): {str(e)}")
        return None

FIELDS_TO_COUNT = [
    "balance", "dualTap", "dualTapRight", "gaitWalk",
    "pinchToSize", "pinchToSizeRight", "questionnaire",
    "tremorPostural", "tremorResting", "voiceAhh", "voiceYPL"
]

def safe_bool(value):
    return bool(value) if isinstance(value, bool) else None

# Global flag for background task status
is_running = False

def background_task(fn):
    """Decorator to manage task running status and logging."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        global is_running
        if is_running:
            logger.warning(f"Attempted to start {fn.__name__} but another task is already running.")
            return {"status": "error", "message": "Task already running"}
        
        is_running = True
        result = {"status": "error", "message": "Unknown error"} # Default error
        try:
            logger.info(f"Starting background task: {fn.__name__}")
            result = fn(*args, **kwargs)
            logger.info(f"Completed background task: {fn.__name__} (Status: {result.get('status')})")
        except Exception as e:
            logger.error(f"Critical error in background task {fn.__name__}: {str(e)}", exc_info=True)
            result = {"status": "error", "message": f"Critical task error: {str(e)}"}
        finally:
            is_running = False
        return result
    return wrapper


def migrate_users_and_summaries(since=None, limit=None, page_size=100, full_sync=False, dry_run=False):

    user_count = 0
    summary_count = 0
    conn = None
    max_processed_ts = None
    try:
        users_ref = fs_db.collection("users").order_by("timestamp")
        
        if since and not full_sync:
            users_ref = users_ref.where("timestamp", ">=", since.astimezone(pytz.UTC))
            logger.info(f"Incremental migration since {since.astimezone(pytz.UTC)}")
        else:
            logger.info("Full migration (all users and records)")

        last_doc = None
        while True:
            query = users_ref.limit(page_size)
            if last_doc:
                query = query.start_after(last_doc)
            
            user_batch = list(query.stream())
            if not user_batch:
                break

            for user_doc in user_batch:
                user_id = user_doc.id
                user_data = user_doc.to_dict()
                user_conn = None
                user_cur = None
                
                try:
                    user_conn = get_db_connection()
                    user_cur = user_conn.cursor()
                    if not dry_run:
                        user_cur.execute("""
                            
                        INSERT INTO users (
                            id, age, bod, educationStatus, email, emorument, ethnicity,
                            firstName, gender, idCardAddress, irb, isStaff, lastName,
                            lastUpdate, liveAddress, maritalStatus, occupation, pdpa,
                            perfixName, phoneNumber, remind, thaiId, timestamp
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            age = EXCLUDED.age,
                            bod = EXCLUDED.bod,
                            educationStatus = EXCLUDED.educationStatus,
                            email = EXCLUDED.email,
                            emorument = EXCLUDED.emorument,
                            ethnicity = EXCLUDED.ethnicity,
                            firstName = EXCLUDED.firstName,
                            gender = EXCLUDED.gender,
                            idCardAddress = EXCLUDED.idCardAddress,
                            irb = EXCLUDED.irb,
                            isStaff = EXCLUDED.isStaff,
                            lastName = EXCLUDED.lastName,
                            lastUpdate = EXCLUDED.lastUpdate,
                            liveAddress = EXCLUDED.liveAddress,
                            maritalStatus = EXCLUDED.maritalStatus,
                            occupation = EXCLUDED.occupation,
                            pdpa = EXCLUDED.pdpa,
                            perfixName = EXCLUDED.perfixName,
                            phoneNumber = EXCLUDED.phoneNumber,
                            remind = EXCLUDED.remind,
                            thaiId = EXCLUDED.thaiId,
                            timestamp = EXCLUDED.timestamp;
                    """, (
                        user_id,
                        user_data.get("age"),
                        parse_ts(user_data.get("bod")),
                        user_data.get("educationStatus"),
                        user_data.get("email"),
                        user_data.get("emorument"),
                        user_data.get("ethnicity"),
                        user_data.get("firstName"),
                        user_data.get("gender"),
                        user_data.get("idCardAddress"),
                        user_data.get("irb"),
                        user_data.get("isStaff"),
                        user_data.get("lastName"),
                        parse_ts(user_data.get("lastUpdate")),
                        user_data.get("liveAddress"),
                        user_data.get("maritalStatus"),
                        user_data.get("occupation"),
                        user_data.get("pdpa"),
                        user_data.get("perfixName"),
                        user_data.get("phoneNumber"),
                        parse_ts(user_data.get("remind")),
                        user_data.get("thaiId"),
                        parse_ts(user_data.get("timestamp")),
                    ))


                    user_conn.commit()
                    user_count += 1
                    
                    user_ts = parse_ts(user_data.get("timestamp"))
                    if user_ts:
                        if max_processed_ts is None or user_ts > max_processed_ts:
                            max_processed_ts = user_ts
                    

                    if user_count % 100 == 0:
                        logger.info(f"Processed {user_count} users with {summary_count} summaries")

                except Exception as e:
                    logger.error(f"Failed to process user {user_id}: {str(e)}", exc_info=True)
                    if user_conn:
                        user_conn.rollback()
                finally:
                    if user_cur:
                        user_cur.close()
                    if user_conn:
                        user_conn.close()
            if limit is not None and user_count >= limit:
                break
                
            last_doc = user_batch[-1]

        logger.info(f"Migration completed. Users: {user_count}, Summaries: {summary_count}")
        return user_count, max_processed_ts


    except Exception as e:
        logger.error(f"Fatal migration error: {str(e)}", exc_info=True)
        raise

def migrate_temps(since=None, limit=None, page_size=100, full_sync=False, dry_run=False):
    """
    Migrates temp data from Firestore to Supabase using pagination.
    """
    count = 0
    conn = None
    cur = None
    last_doc = None
    max_processed_ts = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        temps_ref = fs_db.collection("temps").order_by("timestamp")
        if since and not full_sync:
            temps_ref = temps_ref.where("timestamp", ">=", since.astimezone(pytz.UTC))
            logger.info(f"Querying Firestore for temps updated since {since.astimezone(pytz.UTC)}")
        else:
            logger.info("Querying all temps from Firestore (full sync).")

        while True:
            query = temps_ref.limit(page_size)
            
            if last_doc:
                query = query.start_after(last_doc)
                
            docs = query.stream()
            docs_list = list(docs)
            
            if not docs_list:
                break
            for doc in docs_list:
                temp_id = doc.id
                data = doc.to_dict()
                
                thaiid = data.get("thaiId")
                try:
                    records_ref = fs_db.collection("temps").document(temp_id).collection("records")
                    all_records = list(records_ref.stream())

                    if not all_records:
                        logger.debug(f"Temp {temp_id} has no records, skipping.")
                        continue
                    grouped = {}
                    for rec in all_records:
                        rec_data = rec.to_dict()
                        recorder = rec_data.get("recorder") or "unknown"
                        last_update = parse_ts(rec_data.get("timestamp")) or datetime.min.replace(tzinfo=BANGKOK_TZ)
                        if recorder not in grouped:
                            grouped[recorder] = []
                        grouped[recorder].append((last_update, rec.id, rec_data))

                    latest_recorder = max(grouped.items(), key=lambda g: max(x[0] for x in g[1]))
                    recorder_name, rec_list = latest_recorder

                    rec_list.sort(key=lambda x: x[0], reverse=True)
                    record_with_risk = next(
                        ((ts, rec_id, data) for ts, rec_id, data in rec_list
                        if data.get("prediction") and isinstance(data["prediction"], dict) and "risk" in data["prediction"]),
                        None
                    )
                    
                    if record_with_risk:
                        latest_ts, latest_rec_id, latest_data = record_with_risk
                    else:
                        record_with_prediction = next(
                            ((ts, rec_id, data) for ts, rec_id, data in rec_list if data.get("prediction")),
                            None
                        )
                        if record_with_prediction:
                            latest_ts, latest_rec_id, latest_data = record_with_prediction
                        else:
                            latest_ts, latest_rec_id, latest_data = rec_list[0]
                    prediction = latest_data.get("prediction") or {}
                    risk_val_raw = prediction.get("risk")
                    if isinstance(risk_val_raw, str):
                        if risk_val_raw.lower() == "true":
                            risk_val = True
                        elif risk_val_raw.lower() == "false":
                            risk_val = False
                        else:
                            logger.warning(f"Unexpected prediction.risk string value '{risk_val_raw}' for temp {temp_id}. Setting to None.")
                            risk_val = None
                    elif isinstance(risk_val_raw, bool):
                        risk_val = risk_val_raw
                    elif risk_val_raw is None:
                        risk_val = None
                    else:
                        logger.warning(f"Unexpected prediction.risk type {type(risk_val_raw)} for temp {temp_id}. Value: {risk_val_raw}. Setting to None.")
                        risk_val = None
                    if not dry_run:
                        cur.execute("""
                        INSERT INTO users (
                            id, age, bod, educationStatus, email, emorument, ethnicity,
                            firstName, gender, idCardAddress, irb, isStaff, lastName,
                            lastUpdate, liveAddress, maritalStatus, occupation, pdpa,
                            perfixName, phoneNumber, remind, thaiId, timestamp
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            age = EXCLUDED.age,
                            bod = EXCLUDED.bod,
                            educationStatus = EXCLUDED.educationStatus,
                            email = EXCLUDED.email,
                            emorument = EXCLUDED.emorument,
                            ethnicity = EXCLUDED.ethnicity,
                            firstName = EXCLUDED.firstName,
                            gender = EXCLUDED.gender,
                            idCardAddress = EXCLUDED.idCardAddress,
                            irb = EXCLUDED.irb,
                            isStaff = EXCLUDED.isStaff,
                            lastName = EXCLUDED.lastName,
                            lastUpdate = EXCLUDED.lastUpdate,
                            liveAddress = EXCLUDED.liveAddress,
                            maritalStatus = EXCLUDED.maritalStatus,
                            occupation = EXCLUDED.occupation,
                            pdpa = EXCLUDED.pdpa,
                            perfixName = EXCLUDED.perfixName,
                            phoneNumber = EXCLUDED.phoneNumber,
                            remind = EXCLUDED.remind,
                            thaiId = EXCLUDED.thaiId,
                            timestamp = EXCLUDED.timestamp;
                    """, (
                        temp_id,
                        data.get("age"),
                        parse_ts(data.get("bod")),
                        data.get("educationStatus"),
                        data.get("email"),
                        data.get("emorument"),
                        data.get("ethnicity"),
                        data.get("firstName"),
                        data.get("gender"),
                        data.get("idCardAddress"),
                        data.get("irb"),
                        safe_bool(data.get("isStaff")),
                        data.get("lastName"),
                        parse_ts(data.get("lastUpdate")),
                        data.get("liveAddress"),
                        data.get("maritalStatus"),
                        data.get("occupation"),
                        data.get("pdpa"),
                        data.get("perfixName"),
                        data.get("phoneNumber"),
                        parse_ts(data.get("remind")),
                        data.get("thaiId"),
                        parse_ts(data.get("timestamp")),
                    ))

                    counts = {field: 0 for field in FIELDS_TO_COUNT}
                    for _, _, r in rec_list:
                        for f in FIELDS_TO_COUNT:
                            if r.get(f) is not None:
                                counts[f] += 1

                    if not dry_run:
                        fields_str = ', '.join(FIELDS_TO_COUNT)
                        placeholders_str = ', '.join(['%s'] * len(FIELDS_TO_COUNT))
                        update_fields_str = ', '.join([f"{f} = EXCLUDED.{f}" for f in FIELDS_TO_COUNT])
                        cur.execute(f"""
                        INSERT INTO user_record_summary (
                            user_id, thaiId, recorder, record_id, version, last_update,
                            prediction_risk, record_count, {fields_str}
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, {placeholders_str}
                        )
                        ON CONFLICT (user_id, recorder) DO UPDATE SET
                            record_id = EXCLUDED.record_id,
                            thaiId = EXCLUDED.thaiId,
                            version = EXCLUDED.version,
                            last_update = EXCLUDED.last_update,
                            prediction_risk = EXCLUDED.prediction_risk,
                            record_count = EXCLUDED.record_count,
                            {update_fields_str},
                            updated_at = NOW();
                    """, [
                        temp_id,
                        thaiid,
                        recorder_name,
                        latest_rec_id,
                        latest_data.get("version"),
                        latest_ts,
                        risk_val,
                        len(rec_list),
                    ] + [counts[f] for f in FIELDS_TO_COUNT])

                    count += 1
                    if latest_ts:
                        if max_processed_ts is None or latest_ts > max_processed_ts:
                            max_processed_ts = latest_ts
                except Exception as e:
                    logger.error(f"Failed to process temp {temp_id}, recorder {recorder_name}: {str(e)}", exc_info=True)
                    if conn:
                        conn.rollback()

            conn.commit()
            logger.info(f"Processed {count} temp records so far...")
            
            if limit is not None and count >= limit:
                break
                
            last_doc = docs_list[-1]
            
        logger.info(f"Temp migration completed. Successfully processed {count} records.")
        return count, max_processed_ts
    except Exception as e:
        logger.error(f"Overall temp migration failed: {str(e)}", exc_info=True)
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def migrate_summaries(since=None, full_sync=False, limit=None, page_size=10, dry_run=False):
    """
    Migrates user record summaries efficiently.
    - เลือก record ล่าสุดที่มี prediction.risk ก่อน
    - Optimize การ query Firestore และเขียน Postgres ให้เร็วขึ้น
    """
    count = 0
    conn = None
    cur = None
    last_doc = None
    max_processed_ts = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        users_ref = fs_db.collection("users").order_by("timestamp")
        if full_sync:
            users_query = users_ref
            logger.info("Running FULL summary migration (all users).")
        elif since:
            users_query = users_ref.where("timestamp", ">=", since.astimezone(pytz.UTC))
            logger.info(f"Running INCREMENTAL summary migration since {since.astimezone(pytz.UTC)}")
        else:
            logger.warning("No 'since' provided, running full sync by fallback.")
            users_query = users_ref

        while True:
            query = users_query.limit(page_size)
            if last_doc:
                query = query.start_after(last_doc)

            docs = query.stream()
            docs_list = list(docs)

            if not docs_list:
                break

            for user_doc in docs_list:
                user_id = user_doc.id
                last_doc = user_doc
                user_data = user_doc.to_dict()
                thaiid = user_data.get("thaiId")

                try:
                    cur.execute("SELECT 1 FROM users WHERE id = %s LIMIT 1", (user_id,))
                    if cur.fetchone() is None:
                        logger.debug(f"Skipping user {user_id}: not found in target DB.")
                        continue
                    records_ref = fs_db.collection("users").document(user_id).collection("records")
                    if full_sync:
                        records_query = records_ref
                    elif since:
                        records_query = records_ref.where("timestamp", ">=", since.astimezone(pytz.UTC))
                    else:
                        records_query = records_ref

                    all_user_records = list(records_query.stream())

                    if not all_user_records:
                        continue
                    grouped = {}
                    for rec in all_user_records:
                        data = rec.to_dict()
                        recorder = data.get("recorder") or "unknown"
                        last_update = parse_ts(data.get("lastUpdate")) or datetime.min.replace(tzinfo=pytz.UTC)
                        grouped.setdefault(recorder, []).append((last_update, rec.id, data))
                    for recorder, rec_list in grouped.items():
                        try:
                            rec_list.sort(key=lambda x: x[0], reverse=True)
                            record_with_risk = next(
                                ((ts, rid, data) for ts, rid, data in rec_list
                                 if isinstance(data.get("prediction"), dict) and data["prediction"].get("risk") is not None),
                                None
                            )
                            if record_with_risk:
                                latest_update_ts, latest_rec_id, latest_data = record_with_risk
                            else:
                                record_with_prediction = next(
                                    ((ts, rid, data) for ts, rid, data in rec_list if isinstance(data.get("prediction"), dict)),
                                    None
                                )
                                if record_with_prediction:
                                    latest_update_ts, latest_rec_id, latest_data = record_with_prediction
                                else:
                                    latest_update_ts, latest_rec_id, latest_data = rec_list[0]

                            prediction = latest_data.get("prediction")
                            risk_val = prediction.get("risk") if isinstance(prediction, dict) else None
                            prediction_risk_for_db = str(risk_val) if risk_val is not None else None
                            counts = {field: 0 for field in FIELDS_TO_COUNT}
                            for _, _, data in rec_list:
                                for field in FIELDS_TO_COUNT:
                                    if data.get(field) is not None:
                                        counts[field] += 1
                            if not dry_run:
                                fields_str = ', '.join(FIELDS_TO_COUNT)
                                placeholders_str = ', '.join(['%s'] * len(FIELDS_TO_COUNT))
                                update_fields_str = ', '.join([f"{f} = EXCLUDED.{f}" for f in FIELDS_TO_COUNT])
                                cur.execute(f"""
                                INSERT INTO user_record_summary (
                                    user_id, thaiid, recorder, record_id, version, last_update,
                                    prediction_risk, record_count, {fields_str}
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s,
                                    %s, %s, {placeholders_str}
                                )
                                ON CONFLICT (user_id, recorder) DO UPDATE SET
                                    thaiid = EXCLUDED.thaiid,
                                    record_id = EXCLUDED.record_id,
                                    version = EXCLUDED.version,
                                    last_update = EXCLUDED.last_update,
                                    prediction_risk = EXCLUDED.prediction_risk,
                                    record_count = EXCLUDED.record_count,
                                    {update_fields_str},
                                    updated_at = NOW();
                            """, [
                                user_id,
                                thaiid,
                                recorder,
                                latest_rec_id,
                                latest_data.get("version"),
                                latest_update_ts,
                                prediction_risk_for_db,
                                len(rec_list)
                            ] + [counts[f] for f in FIELDS_TO_COUNT])

                            count += 1

                            if latest_update_ts:
                                if max_processed_ts is None or latest_update_ts > max_processed_ts:
                                    max_processed_ts = latest_update_ts
                            if count % 10 == 0:
                                conn.commit()
                                logger.info(f"Committed {count} summaries so far...")

                        except Exception as e:
                            logger.error(f"Recorder summary error for {user_id}:{recorder}: {str(e)}", exc_info=True)
                            conn.rollback()

                except Exception as e:
                    logger.error(f"User summary error for {user_id}: {str(e)}", exc_info=True)
                    conn.rollback()

            if limit and count >= limit:
                break
        conn.commit()
        logger.info(f"Summary migration complete. Total: {count} summaries.")
        return count, max_processed_ts
    
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}", exc_info=True)
        conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def migrate_single_user(doc_id, kind="auto", dry_run=False):
    """
    Re-syncs exactly one Firestore doc (+ its records subcollection summary)
    into Supabase immediately, for the per-row "Sync now" button on
    /pages/users (Next.js) — used when the daily cron missed this person or
    Firebase was edited after the last sync.

    Mirrors migrate_temps's per-doc body scoped to a single id (user row
    upsert + one user_record_summary row per recorder). Does NOT modify or
    call the batch migration functions above — purely additive, so it can't
    regress the cron job's behaviour.

    kind: "users" | "temps" | "auto" (auto tries "users" first, then "temps")
    Returns a small JSON-serializable dict; never raises (caller is expected
    to be an HTTP endpoint that reports {"status": "error", ...} as a 4xx/5xx).
    """
    kinds_to_try = [kind] if kind in ("users", "temps") else ["users", "temps"]
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        for collection_name in kinds_to_try:
            doc_ref = fs_db.collection(collection_name).document(doc_id)
            doc = doc_ref.get()
            if not doc.exists:
                continue

            data = doc.to_dict()
            thaiid = data.get("thaiId")

            if not dry_run:
                cur.execute("""
                    INSERT INTO users (
                        id, age, bod, educationStatus, email, emorument, ethnicity,
                        firstName, gender, idCardAddress, irb, isStaff, lastName,
                        lastUpdate, liveAddress, maritalStatus, occupation, pdpa,
                        perfixName, phoneNumber, remind, thaiId, timestamp
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        age = EXCLUDED.age,
                        bod = EXCLUDED.bod,
                        educationStatus = EXCLUDED.educationStatus,
                        email = EXCLUDED.email,
                        emorument = EXCLUDED.emorument,
                        ethnicity = EXCLUDED.ethnicity,
                        firstName = EXCLUDED.firstName,
                        gender = EXCLUDED.gender,
                        idCardAddress = EXCLUDED.idCardAddress,
                        irb = EXCLUDED.irb,
                        isStaff = EXCLUDED.isStaff,
                        lastName = EXCLUDED.lastName,
                        lastUpdate = EXCLUDED.lastUpdate,
                        liveAddress = EXCLUDED.liveAddress,
                        maritalStatus = EXCLUDED.maritalStatus,
                        occupation = EXCLUDED.occupation,
                        pdpa = EXCLUDED.pdpa,
                        perfixName = EXCLUDED.perfixName,
                        phoneNumber = EXCLUDED.phoneNumber,
                        remind = EXCLUDED.remind,
                        thaiId = EXCLUDED.thaiId,
                        timestamp = EXCLUDED.timestamp;
                """, (
                    doc_id,
                    data.get("age"),
                    parse_ts(data.get("bod")),
                    data.get("educationStatus"),
                    data.get("email"),
                    data.get("emorument"),
                    data.get("ethnicity"),
                    data.get("firstName"),
                    data.get("gender"),
                    data.get("idCardAddress"),
                    data.get("irb"),
                    safe_bool(data.get("isStaff")),
                    data.get("lastName"),
                    parse_ts(data.get("lastUpdate")),
                    data.get("liveAddress"),
                    data.get("maritalStatus"),
                    data.get("occupation"),
                    data.get("pdpa"),
                    data.get("perfixName"),
                    data.get("phoneNumber"),
                    parse_ts(data.get("remind")),
                    data.get("thaiId"),
                    parse_ts(data.get("timestamp")),
                ))

            # Recompute record_summary the same way migrate_temps / migrate_summaries
            # do: group this person's records by recorder, pick the "best" record
            # per recorder (has risk > has prediction > most recent), upsert one
            # summary row per recorder.
            all_records = list(doc_ref.collection("records").stream())
            summaries_written = 0

            if all_records:
                grouped = {}
                for rec in all_records:
                    rec_data = rec.to_dict()
                    recorder = rec_data.get("recorder") or "unknown"
                    last_update = (
                        parse_ts(rec_data.get("lastUpdate") or rec_data.get("timestamp"))
                        or datetime.min.replace(tzinfo=BANGKOK_TZ)
                    )
                    grouped.setdefault(recorder, []).append((last_update, rec.id, rec_data))

                for recorder, rec_list in grouped.items():
                    rec_list.sort(key=lambda x: x[0], reverse=True)
                    record_with_risk = next(
                        ((ts, rid, d) for ts, rid, d in rec_list
                         if isinstance(d.get("prediction"), dict) and d["prediction"].get("risk") is not None),
                        None
                    )
                    if record_with_risk:
                        latest_ts, latest_rec_id, latest_data = record_with_risk
                    else:
                        record_with_prediction = next(
                            ((ts, rid, d) for ts, rid, d in rec_list if isinstance(d.get("prediction"), dict)),
                            None
                        )
                        latest_ts, latest_rec_id, latest_data = record_with_prediction or rec_list[0]

                    prediction = latest_data.get("prediction")
                    risk_val_raw = prediction.get("risk") if isinstance(prediction, dict) else None
                    if isinstance(risk_val_raw, str):
                        lowered = risk_val_raw.lower()
                        risk_val = True if lowered == "true" else (False if lowered == "false" else None)
                    elif isinstance(risk_val_raw, bool):
                        risk_val = risk_val_raw
                    else:
                        risk_val = None

                    counts = {field: 0 for field in FIELDS_TO_COUNT}
                    for _, _, d in rec_list:
                        for f in FIELDS_TO_COUNT:
                            if d.get(f) is not None:
                                counts[f] += 1

                    if not dry_run:
                        fields_str = ', '.join(FIELDS_TO_COUNT)
                        placeholders_str = ', '.join(['%s'] * len(FIELDS_TO_COUNT))
                        update_fields_str = ', '.join([f"{f} = EXCLUDED.{f}" for f in FIELDS_TO_COUNT])
                        cur.execute(f"""
                            INSERT INTO user_record_summary (
                                user_id, thaiId, recorder, record_id, version, last_update,
                                prediction_risk, record_count, {fields_str}
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s,
                                %s, %s, {placeholders_str}
                            )
                            ON CONFLICT (user_id, recorder) DO UPDATE SET
                                record_id = EXCLUDED.record_id,
                                thaiId = EXCLUDED.thaiId,
                                version = EXCLUDED.version,
                                last_update = EXCLUDED.last_update,
                                prediction_risk = EXCLUDED.prediction_risk,
                                record_count = EXCLUDED.record_count,
                                {update_fields_str},
                                updated_at = NOW();
                        """, [
                            doc_id, thaiid, recorder, latest_rec_id,
                            latest_data.get("version"), latest_ts, risk_val, len(rec_list),
                        ] + [counts[f] for f in FIELDS_TO_COUNT])
                    summaries_written += 1

            conn.commit()
            logger.info(f"migrate_single_user: synced {collection_name}/{doc_id} ({summaries_written} summaries)")
            return {
                "status": "ok",
                "user_id": doc_id,
                "kind": collection_name,
                "summaries_updated": summaries_written,
            }

        return {"status": "error", "message": f"No Firestore document found for id={doc_id} in users/temps"}

    except Exception as e:
        logger.error(f"migrate_single_user failed for {doc_id}: {str(e)}", exc_info=True)
        if conn:
            conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

