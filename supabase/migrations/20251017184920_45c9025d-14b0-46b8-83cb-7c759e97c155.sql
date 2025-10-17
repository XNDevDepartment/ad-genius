-- Enable REPLICA IDENTITY FULL for complete row data on updates
ALTER TABLE outfit_swap_jobs REPLICA IDENTITY FULL;
ALTER TABLE outfit_swap_results REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE outfit_swap_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE outfit_swap_results;