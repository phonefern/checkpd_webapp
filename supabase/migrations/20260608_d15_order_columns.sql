ALTER TABLE core.vision_tests_v2
  ADD COLUMN IF NOT EXISTS color_paper_re_test_order SMALLINT[] NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_test_crossings SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_test_axis TEXT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_test_tes REAL NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_retest_order SMALLINT[] NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_retest_crossings SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_retest_axis TEXT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_re_retest_tes REAL NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_test_order SMALLINT[] NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_test_crossings SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_test_axis TEXT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_test_tes REAL NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_retest_order SMALLINT[] NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_retest_crossings SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_retest_axis TEXT NULL,
  ADD COLUMN IF NOT EXISTS color_paper_le_retest_tes REAL NULL;

COMMENT ON COLUMN core.vision_tests_v2.color_paper_re_test_order IS 'Farnsworth D-15 patient cap order for paper right-eye test; SMALLINT[] stores cap numbers 1..15 without the reference cap.';
COMMENT ON COLUMN core.vision_tests_v2.color_paper_re_retest_order IS 'Farnsworth D-15 patient cap order for paper right-eye retest; SMALLINT[] stores cap numbers 1..15 without the reference cap.';
COMMENT ON COLUMN core.vision_tests_v2.color_paper_le_test_order IS 'Farnsworth D-15 patient cap order for paper left-eye test; SMALLINT[] stores cap numbers 1..15 without the reference cap.';
COMMENT ON COLUMN core.vision_tests_v2.color_paper_le_retest_order IS 'Farnsworth D-15 patient cap order for paper left-eye retest; SMALLINT[] stores cap numbers 1..15 without the reference cap.';
