-- ============================================================
-- Nightly cron schedule (requires pg_cron extension)
-- Runs at 02:00 UTC
-- ============================================================

select cron.schedule(
  'recompute-bonuses-nightly',
  '0 2 * * *',
  $$ select recompute_bonuses(); $$
);
