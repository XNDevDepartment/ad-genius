-- Enable realtime updates for outfit_swap_batches table
ALTER TABLE outfit_swap_batches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE outfit_swap_batches;