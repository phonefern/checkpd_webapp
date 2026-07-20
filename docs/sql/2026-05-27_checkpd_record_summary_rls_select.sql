-- checkpd.record_summary has RLS ENABLED but NO policies created, so every client
-- (anon / authenticated) SELECT returns zero rows -- the row exists but PostgREST
-- denies it. Its sibling tables (records, vibration, tap, pinch, questionnaire,
-- prediction) have RLS DISABLED, which is why Per-test predictions render but the
-- CheckPD Summary section in UserDetailModal stays empty.
--
-- Fix: add a SELECT policy mirroring the checkpd.users pattern (readable by the
-- staff dashboard's authenticated session). RLS stays ON so writes remain locked.
-- Safe to run in the Supabase SQL Editor.

ALTER TABLE checkpd.record_summary ENABLE ROW LEVEL SECURITY; -- already on; idempotent

DROP POLICY IF EXISTS "record_summary_select_authenticated" ON checkpd.record_summary;
CREATE POLICY "record_summary_select_authenticated"
  ON checkpd.record_summary
  FOR SELECT
  TO authenticated          -- covers both regular and anonymous-sign-in sessions
  USING (true);
