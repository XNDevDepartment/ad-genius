-- Add payment_failed_at column to track failed payments
ALTER TABLE public.subscribers 
ADD COLUMN payment_failed_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.subscribers.payment_failed_at IS 'Timestamp of the last failed payment. NULL when no payment issues exist.';