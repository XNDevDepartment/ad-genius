
CREATE OR REPLACE FUNCTION public.admin_count_active_users(p_since timestamptz DEFAULT NULL)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::integer FROM (
    SELECT user_id FROM public.generated_images 
    WHERE (p_since IS NULL OR created_at >= p_since)
    UNION
    SELECT user_id FROM public.ugc_images 
    WHERE (p_since IS NULL OR created_at >= p_since)
  ) sub;
$$;
