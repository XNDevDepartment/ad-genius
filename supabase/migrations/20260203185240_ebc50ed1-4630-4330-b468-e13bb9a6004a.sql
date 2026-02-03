-- Add bulk background tables to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bulk_background_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE bulk_background_results;