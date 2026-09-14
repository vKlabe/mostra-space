-- Run after the foundation migration. Supabase supports pg_cron; enable it in Database > Extensions if needed.
-- This job only updates Premio tables and expires free prize entitlements; it sends no messages.
create extension if not exists pg_cron;
select cron.schedule('mostraspace-premio-maintenance','*/5 * * * *',$$select public.premio_maintenance();$$);
