-- Fix security issues from Phase 3 (Simple approach)

-- Drop the problematic view entirely to resolve security definer issue
DROP VIEW IF EXISTS public.gemini_conversation_summaries;

-- The functions already have proper SECURITY DEFINER with SET search_path = public
-- so they are secure. The view was the main security concern and has been removed.

-- Users can still access conversation data through:
-- 1. Direct table queries (with RLS protection)
-- 2. The secure functions we created:
--    - get_gemini_conversations_with_latest_message()
--    - get_gemini_conversation_message_count()
--    - search_gemini_conversations()

-- Add a comment to document the security fix
COMMENT ON FUNCTION public.get_gemini_conversations_with_latest_message IS 
'Secure function to get conversations with latest message. Respects RLS policies.';

COMMENT ON FUNCTION public.search_gemini_conversations IS 
'Secure function to search conversations with relevance scoring. Respects user access controls.';