-- Function to validate and cleanup orphaned base model records
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_base_models()
RETURNS TABLE (
  model_id UUID,
  model_name TEXT,
  storage_path TEXT,
  action TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function identifies base models that may have storage issues
  -- Admin can use this to identify and clean up problematic records
  
  RETURN QUERY
  SELECT 
    id as model_id,
    name as model_name,
    outfit_swap_base_models.storage_path,
    CASE 
      WHEN is_active THEN 'needs_verification'
      ELSE 'inactive_may_delete'
    END as action
  FROM outfit_swap_base_models
  WHERE is_system = true
  ORDER BY created_at DESC;
  
  -- Note: Actual storage verification needs to be done via storage API
  -- This function helps identify candidates for cleanup
END;
$$;

COMMENT ON FUNCTION public.cleanup_orphaned_base_models() IS 
'Identifies base model records that may have storage issues. Admins should verify storage and clean up as needed.';