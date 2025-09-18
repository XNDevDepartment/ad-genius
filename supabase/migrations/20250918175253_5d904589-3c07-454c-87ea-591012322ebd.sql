-- Phase 3: Database Schema Optimizations and Enhancements (Fixed)

-- Add indexes for better query performance
CREATE INDEX idx_gemini_conversations_user_id ON public.gemini_conversations(user_id);
CREATE INDEX idx_gemini_conversations_created_at ON public.gemini_conversations(created_at DESC);
CREATE INDEX idx_gemini_conversations_niche ON public.gemini_conversations(niche) WHERE niche IS NOT NULL;
CREATE INDEX idx_gemini_messages_conversation_id ON public.gemini_messages(conversation_id);
CREATE INDEX idx_gemini_messages_created_at ON public.gemini_messages(created_at DESC);
CREATE INDEX idx_gemini_messages_role ON public.gemini_messages(role);

-- Add composite index for efficient conversation history queries
CREATE INDEX idx_gemini_messages_conversation_created ON public.gemini_messages(conversation_id, created_at DESC);

-- Create a function to get conversation with latest message
CREATE OR REPLACE FUNCTION public.get_gemini_conversations_with_latest_message(p_user_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  niche text,
  audience text,
  image_url text,
  image_analysis text,
  conversation_created_at timestamptz,
  conversation_updated_at timestamptz,
  latest_message_content text,
  latest_message_role text,
  latest_message_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM gemini_conversations gc
  LEFT JOIN LATERAL (
    SELECT content, role, created_at
    FROM gemini_messages
    WHERE conversation_id = gc.id
    ORDER BY created_at DESC
    LIMIT 1
  ) gm ON true
  WHERE gc.user_id = p_user_id
  ORDER BY gc.updated_at DESC;
$$;

-- Create a function to get conversation message count
CREATE OR REPLACE FUNCTION public.get_gemini_conversation_message_count(p_conversation_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM gemini_messages
  WHERE conversation_id = p_conversation_id;
$$;

-- Create a function to clean up old conversations (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_gemini_conversations(p_days_old integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete conversations older than specified days with no recent activity
  DELETE FROM gemini_conversations
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND updated_at < NOW() - INTERVAL '1 day' * p_days_old
    AND NOT EXISTS (
      SELECT 1 FROM gemini_messages 
      WHERE conversation_id = gemini_conversations.id 
        AND created_at > NOW() - INTERVAL '1 day' * (p_days_old / 2)
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add a function to search conversations by content (Fixed ORDER BY issue)
CREATE OR REPLACE FUNCTION public.search_gemini_conversations(
  p_user_id uuid,
  p_search_term text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  conversation_id uuid,
  niche text,
  audience text,
  image_analysis text,
  created_at timestamptz,
  updated_at timestamptz,
  relevance_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT 1 FROM gemini_messages gm 
        WHERE gm.conversation_id = gc.id 
          AND gm.content ILIKE '%' || p_search_term || '%'
      ) THEN 0.4 ELSE 0.0 END
    ) as relevance_score
  FROM gemini_conversations gc
  WHERE gc.user_id = p_user_id
    AND (
      gc.niche ILIKE '%' || p_search_term || '%'
      OR gc.audience ILIKE '%' || p_search_term || '%'
      OR gc.image_analysis ILIKE '%' || p_search_term || '%'
      OR EXISTS(
        SELECT 1 FROM gemini_messages gm 
        WHERE gm.conversation_id = gc.id 
          AND gm.content ILIKE '%' || p_search_term || '%'
      )
    )
  ORDER BY relevance_score DESC, gc.updated_at DESC
  LIMIT p_limit;
$$;

-- Add check constraints for data quality
ALTER TABLE public.gemini_conversations 
ADD CONSTRAINT check_niche_length CHECK (length(niche) <= 500);

ALTER TABLE public.gemini_conversations 
ADD CONSTRAINT check_audience_length CHECK (length(audience) <= 500);

ALTER TABLE public.gemini_messages 
ADD CONSTRAINT check_content_not_empty CHECK (length(trim(content)) > 0);

ALTER TABLE public.gemini_messages 
ADD CONSTRAINT check_content_length CHECK (length(content) <= 10000);

-- Create a view for easy conversation summaries
CREATE OR REPLACE VIEW public.gemini_conversation_summaries AS
SELECT 
  gc.id,
  gc.user_id,
  gc.niche,
  gc.audience,
  gc.image_url,
  CASE 
    WHEN length(gc.image_analysis) > 200 
    THEN left(gc.image_analysis, 200) || '...'
    ELSE gc.image_analysis
  END as image_analysis_preview,
  gc.created_at,
  gc.updated_at,
  COUNT(gm.id) as message_count,
  MAX(gm.created_at) as last_message_at
FROM public.gemini_conversations gc
LEFT JOIN public.gemini_messages gm ON gc.id = gm.conversation_id
GROUP BY gc.id, gc.user_id, gc.niche, gc.audience, gc.image_url, gc.image_analysis, gc.created_at, gc.updated_at;