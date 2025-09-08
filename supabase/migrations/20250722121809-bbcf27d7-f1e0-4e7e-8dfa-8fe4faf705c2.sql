-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the auto-complete visits function to run daily at 1 AM
SELECT cron.schedule(
  'auto-complete-visits-daily',
  '0 1 * * *', -- Every day at 1 AM
  $$
  SELECT
    net.http_post(
        url:='https://vskkyalcisotyfokkuxn.supabase.co/functions/v1/auto-complete-visits',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZza2t5YWxjaXNvdHlmb2trdXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDc3NjksImV4cCI6MjA2ODY4Mzc2OX0.1qK7ikRiJSs9THCqfIejQlodhJ6mWE3Ys8PSfwHJPKk"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);