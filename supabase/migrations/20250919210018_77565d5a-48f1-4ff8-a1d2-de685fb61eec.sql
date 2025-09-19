-- Fix all remaining functions with search_path parameter

-- Fix generate_idempotency_key function
CREATE OR REPLACE FUNCTION public.generate_idempotency_key(p_user_id uuid, p_source_image_id uuid, p_prompt text, p_settings jsonb)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  select encode(
           digest(
             convert_to(
               coalesce(p_user_id::text,'') || '|' ||
               coalesce(p_source_image_id::text,'') || '|' ||
               regexp_replace(coalesce(p_prompt,''), '\s+', ' ', 'g') || '|' ||
               coalesce(p_settings::text,''),
               'UTF8'
             ),
             'sha256'::text
           ),
           'hex'
         );
$function$;

-- Fix get_gemini_conversations_with_latest_message function
CREATE OR REPLACE FUNCTION public.get_gemini_conversations_with_latest_message(p_user_id uuid)
 RETURNS TABLE(conversation_id uuid, niche text, audience text, image_url text, image_analysis text, conversation_created_at timestamp with time zone, conversation_updated_at timestamp with time zone, latest_message_content text, latest_message_role text, latest_message_created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    gc.id as conversation_id,
    gc.niche,
    gc.audience,
    gc.image_url,
    gc.image_analysis,
    gc.created_at as conversation_created_at,
    gc.updated_at as conversation_updated_at,
    gm.content as latest_message_content,
    gm.role as latest_message_role,
    gm.created_at as latest_message_created_at
  FROM public.gemini_conversations gc
  LEFT JOIN LATERAL (
    SELECT content, role, created_at
    FROM public.gemini_messages
    WHERE conversation_id = gc.id
    ORDER BY created_at DESC
    LIMIT 1
  ) gm ON true
  WHERE gc.user_id = p_user_id
  ORDER BY gc.updated_at DESC;
$function$;

-- Fix get_gemini_conversation_message_count function
CREATE OR REPLACE FUNCTION public.get_gemini_conversation_message_count(p_conversation_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.gemini_messages
  WHERE conversation_id = p_conversation_id;
$function$;

-- Fix cleanup_old_gemini_conversations function
CREATE OR REPLACE FUNCTION public.cleanup_old_gemini_conversations(p_days_old integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete conversations older than specified days with no recent activity
  DELETE FROM public.gemini_conversations
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND updated_at < NOW() - INTERVAL '1 day' * p_days_old
    AND NOT EXISTS (
      SELECT 1 FROM public.gemini_messages 
      WHERE conversation_id = gemini_conversations.id 
        AND created_at > NOW() - INTERVAL '1 day' * (p_days_old / 2)
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Fix search_gemini_conversations function
CREATE OR REPLACE FUNCTION public.search_gemini_conversations(p_user_id uuid, p_search_term text, p_limit integer DEFAULT 10)
 RETURNS TABLE(conversation_id uuid, niche text, audience text, image_analysis text, created_at timestamp with time zone, updated_at timestamp with time zone, relevance_score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    gc.id as conversation_id,
    gc.niche,
    gc.audience,
    gc.image_analysis,
    gc.created_at,
    gc.updated_at,
    -- Simple relevance scoring based on text similarity
    GREATEST(
      CASE WHEN gc.niche ILIKE '%' || p_search_term || '%' THEN 1.0 ELSE 0.0 END,
      CASE WHEN gc.audience ILIKE '%' || p_search_term || '%' THEN 0.8 ELSE 0.0 END,
      CASE WHEN gc.image_analysis ILIKE '%' || p_search_term || '%' THEN 0.6 ELSE 0.0 END,
      CASE WHEN EXISTS(
        SELECT 1 FROM public.gemini_messages gm 
        WHERE gm.conversation_id = gc.id 
          AND gm.content ILIKE '%' || p_search_term || '%'
      ) THEN 0.4 ELSE 0.0 END
    ) as relevance_score
  FROM public.gemini_conversations gc
  WHERE gc.user_id = p_user_id
    AND (
      gc.niche ILIKE '%' || p_search_term || '%'
      OR gc.audience ILIKE '%' || p_search_term || '%'
      OR gc.image_analysis ILIKE '%' || p_search_term || '%'
      OR EXISTS(
        SELECT 1 FROM public.gemini_messages gm 
        WHERE gm.conversation_id = gc.id 
          AND gm.content ILIKE '%' || p_search_term || '%'
      )
    )
  ORDER BY relevance_score DESC, gc.updated_at DESC
  LIMIT p_limit;
$function$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
$function$;

-- Fix is_user_admin function
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$function$;

-- Fix get_public_showcase_images function
CREATE OR REPLACE FUNCTION public.get_public_showcase_images()
 RETURNS TABLE(id uuid, prompt text, public_url text, storage_path text, settings jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    gi.id,
    gi.prompt,
    gi.public_url,
    gi.storage_path,
    gi.settings,
    gi.created_at,
    gi.updated_at
  FROM public.generated_images gi
  WHERE gi.public_showcase = true
  ORDER BY gi.created_at DESC;
$function$;