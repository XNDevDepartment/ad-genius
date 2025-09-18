-- Fix security issues from Phase 3

-- Drop the problematic view and recreate it without SECURITY DEFINER
DROP VIEW IF EXISTS public.gemini_conversation_summaries;

-- Recreate the view as a regular view (not SECURITY DEFINER)
-- Users will access this through RLS policies instead
CREATE VIEW public.gemini_conversation_summaries AS
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

-- Add RLS policy for the view
ALTER VIEW public.gemini_conversation_summaries SET (security_barrier = true);

-- Add RLS policies for the view
CREATE POLICY "Users can view their own conversation summaries"
  ON public.gemini_conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversation summaries"
  ON public.gemini_conversation_summaries FOR SELECT
  USING (is_admin());

-- Enable RLS on the view
ALTER VIEW public.gemini_conversation_summaries ENABLE ROW LEVEL SECURITY;