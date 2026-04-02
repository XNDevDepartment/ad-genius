-- Fix stuck job 211998ea and refund 3 credits to user 4e962775
UPDATE public.image_jobs
SET status = 'failed',
    error = 'Generation timed out — credits refunded',
    finished_at = now(),
    updated_at = now()
WHERE id = '211998ea-97ba-4ca0-b18c-ac33b49fc148'
  AND status = 'processing';

UPDATE public.subscribers
SET credits_balance = credits_balance + 3,
    updated_at = now()
WHERE user_id = '4e962775-cb55-4301-bc33-081eacb96c46';

INSERT INTO public.credits_transactions (user_id, amount, reason, metadata)
VALUES (
  '4e962775-cb55-4301-bc33-081eacb96c46',
  3,
  'manual_refund',
  '{"note": "Stuck job 211998ea refund — generation timed out", "job_id": "211998ea-97ba-4ca0-b18c-ac33b49fc148"}'::jsonb
);