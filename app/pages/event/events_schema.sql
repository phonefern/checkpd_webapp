-- checkpd.events: Supabase mirror of the Firebase `events` collection.
-- Source of truth = Firebase (Event Management page + GCP cron). This table is a
-- small lookup so checkpd.users.event_id can resolve name_en / name_th without
-- touching the cron or denormalizing names onto every user row.
--   join: checkpd.users.event_id = checkpd.events.id
-- Kept in sync by app/pages/event/page.tsx -> POST /api/events/sync.

create table if not exists checkpd.events (
  id          text primary key,        -- Firebase doc id (= checkpd.users.event_id)
  name_en     text,
  name_th     text,
  active      boolean,
  created_at  timestamptz,             -- Firebase createdAt
  synced_at   timestamptz default now()
);

-- New tables in checkpd do NOT inherit role grants. The /api/events/sync route
-- writes via the Supabase service_role (PostgREST), which needs explicit DML.
-- anon/authenticated get SELECT to mirror checkpd.users (read-only for clients).
grant select, insert, update, delete on table checkpd.events to service_role;
grant select on table checkpd.events to anon, authenticated;
