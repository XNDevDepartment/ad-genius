-- Add retry tracking columns to bulk_background_results
ALTER TABLE bulk_background_results 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Create partial index for recovery queries (jobs that need attention)
CREATE INDEX IF NOT EXISTS idx_bulk_bg_jobs_recovery 
ON bulk_background_jobs(status, updated_at) 
WHERE status IN ('queued', 'processing');

-- Create index for finding pending results quickly
CREATE INDEX IF NOT EXISTS idx_bulk_bg_results_status
ON bulk_background_results(job_id, status)
WHERE status IN ('pending', 'processing', 'failed');