-- Fix stuck job b044eb20 and refund 3 credits to user 4e962775
UPDATE public.image_jobs
SET status = 'failed',
    error = 'Generation timed out (4K+aspect ratio) — credits refunded',
    finished_at = now(),
    updated_at = now()
WHERE id = 'b044eb20-44a7-4661-96be-35305f1933bf'
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
  '{"note": "Stuck job b044eb20 refund — 4K generation timed out", "job_id": "b044eb20-44a7-4661-96be-35305f1933bf"}'::jsonb
);