-- Create optimized function to get user library images with pagination
CREATE OR REPLACE FUNCTION public.get_user_library_images(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  public_url TEXT,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  settings JSONB,
  meta JSONB,
  source_image_id UUID,
  image_type TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Union both image types and sort by creation date
  (
    SELECT 
      gi.id,
      gi.public_url,
      gi.prompt,
      gi.created_at,
      gi.settings,
      NULL::JSONB as meta,
      gi.source_image_id,
      'generated'::TEXT as image_type
    FROM public.generated_images gi
    WHERE gi.user_id = p_user_id
  )
  UNION ALL
  (
    SELECT 
      ui.id,
      ui.public_url,
      COALESCE(ui.prompt, (ui.meta->>'prompt')::TEXT, 'UGC Image') as prompt,
      ui.created_at,
      NULL::JSONB as settings,
      ui.meta,
      ui.source_image_id,
      'ugc'::TEXT as image_type
    FROM public.ugc_images ui
    WHERE ui.user_id = p_user_id
  )
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created ON public.generated_images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_images_user_created ON public.ugc_images(user_id, created_at DESC);