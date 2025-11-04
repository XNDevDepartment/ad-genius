-- Create AI Prompts Management Tables
CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key text UNIQUE NOT NULL,
  prompt_name text NOT NULL,
  prompt_template text NOT NULL,
  prompt_type text NOT NULL CHECK (prompt_type IN ('system', 'user', 'instruction')),
  description text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  category text NOT NULL,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX idx_ai_prompts_key ON public.ai_prompts(prompt_key);
CREATE INDEX idx_ai_prompts_category ON public.ai_prompts(category);
CREATE INDEX idx_ai_prompts_active ON public.ai_prompts(is_active);

-- Create AI Prompt History Table
CREATE TABLE public.ai_prompt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  prompt_template text NOT NULL,
  version integer NOT NULL,
  changed_by uuid,
  change_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_prompt_history_prompt_id ON public.ai_prompt_history(prompt_id);

-- Enable RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_prompts
CREATE POLICY "Admins can do everything on ai_prompts"
ON public.ai_prompts
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Service role can read active prompts"
ON public.ai_prompts
FOR SELECT
USING (true);

-- RLS Policies for ai_prompt_history
CREATE POLICY "Admins can view prompt history"
ON public.ai_prompt_history
FOR SELECT
USING (is_admin());

CREATE POLICY "Service role can insert history"
ON public.ai_prompt_history
FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing prompts
INSERT INTO public.ai_prompts (
  prompt_key, prompt_name, prompt_template, prompt_type,
  description, category, variables
) VALUES 
(
  'outfit_swap_garment_analysis',
  'Outfit Swap - Garment Analysis',
  'Analyze this garment image in detail. Describe:
1. Type of clothing (e.g., t-shirt, dress, pants, jacket, full outfit)
2. Style and fit (e.g., casual, formal, athletic, oversized, fitted)
3. Color and patterns
4. Material appearance (e.g., cotton, denim, leather, knit)
5. Key distinctive features (e.g., collar type, sleeve length, buttons, zippers)
6. What body parts it covers (e.g., torso only, full legs, arms, etc.)

Be specific and concise. This description will be used for AI outfit swapping.',
  'instruction',
  'Analyzes garment images to extract detailed descriptions for outfit swapping',
  'outfit_swap',
  '[]'::jsonb
),
(
  'outfit_swap_main',
  'Outfit Swap - Main Instructions',
  'You are an expert e-commerce outfit swap AI. Your task is to replace the person''s current outfit with a NEW garment while maintaining photographic realism.

GARMENT TO SWAP IN:
{garment_description}

CRITICAL REQUIREMENTS:
1. COMPLETE REPLACEMENT: Remove the person''s ENTIRE current outfit and replace it with the new garment described above
2. IDENTITY PRESERVATION: Keep the person''s face, hair, skin tone, hands, and body pose 100% IDENTICAL
3. VISIBLE CHANGE: The final image MUST show CLEARLY DIFFERENT clothing than the original - this is CRITICAL
4. BODY COVERAGE: Replace all clothing that covers the same body parts as the new garment:
  - If the new garment is a top: Replace the current top completely
  - If it''s pants/bottoms: Replace the current bottoms completely  
  - If it''s a dress/full outfit: Replace ALL current clothing
  - If it''s a jacket/outerwear: Layer it appropriately over a compatible base
  — If the new garment is not full body piece, create the rest of the outfit

COMPOSITION & QUALITY:
- Center the model in the frame for professional product photography
- Clean, minimal background - remove/blur distracting elements (plants, furniture, clutter)
- Professional e-commerce lighting and presentation
- Natural shadows and highlights matching the garment
- Seamless blending at all garment edges (neckline, sleeves, hem, waist)

SMART STYLING:
- Match footwear to outfit style (heels for formal, sneakers for casual/athletic, boots for edgy/outdoor)
- Adjust accessories if they clash with the new outfit
- If the new garment requires different proportions, adjust body naturally (e.g., fitted dress vs oversized hoodie)
- Ensure overall look is cohesive and realistic.
- Don''t leave on underwear. Imagine a complement piece of cloth in case of being only a partial garment.

QUALITY STANDARDS:
- High-resolution, professional e-commerce product photo quality
- No visible AI artifacts, seams, or blending errors
- The result should look like a real fashion shoot

VALIDATION: Before generating, confirm that:
✓ The new garment is VISIBLY DIFFERENT from the original outfit
✓ All relevant clothing items are being replaced
✓ The person''s identity remains identical
✓ The composition is professional and centered

Generate a high-quality outfit swap that clearly shows the NEW garment on the person.',
  'instruction',
  'Main prompt for outfit swap AI with garment analysis integration',
  'outfit_swap',
  '["garment_description"]'::jsonb
),
(
  'motion_analysis_system',
  'Video Motion Analysis - System Prompt',
  'Analyze this UGC image and describe natural motion that would make it feel like authentic social media content.

Think like a content creator holding a phone camera. Suggest simple, realistic movements:
- Subtle handheld camera shake or gentle pans
- Natural product handling (picking up, rotating, setting down)
- Organic environmental motion (slight wind, natural lighting shifts)
- Minimal, purposeful movements that feel unscripted

Avoid:
- Overly smooth or cinematic movements
- Complex effects or transitions
- Anything that looks professionally produced
- Fast or exaggerated motions

Keep it raw and relatable - like someone genuinely showing off a product they love.

Return ONLY a simple, conversational motion description (max 500 characters). No technical jargon, just natural language describing what should move and how.',
  'system',
  'System prompt for analyzing images and suggesting realistic video motion for UGC content',
  'video_generation',
  '[]'::jsonb
),
(
  'ugc_gemini_system',
  'UGC Image Generation - System Prompt',
  'You are an expert UGC (User Generated Content) image creator specializing in authentic, relatable product photography that converts viewers into customers.

Your images must look like they were taken by a real person, not a professional studio. Think iPhone photos, natural lighting, real environments.',
  'system',
  'System prompt for UGC image generation with Gemini',
  'ugc_generation',
  '[]'::jsonb
),
(
  'ugc_gemini_user',
  'UGC Image Generation - User Instructions',
  'Create a hyper-realistic UGC-style product photo based on this prompt:

{user_prompt}

{audience_context}
{product_specs}

CRITICAL UGC AUTHENTICITY RULES:
1. NATURAL IMPERFECTIONS: Include subtle real-life details (slight blur, natural shadows, iPhone-quality grain)
2. REAL ENVIRONMENTS: Use actual home/outdoor settings, not studio backdrops
3. AUTHENTIC HANDS: Show natural, unmanicured hands when holding products
4. CASUAL COMPOSITION: Slightly off-center framing, natural angles (not perfectly staged)
5. LIFESTYLE CONTEXT: Product in use or natural setting, not isolated on white
6. EMOTIONAL CONNECTION: Capture genuine moments, not posed perfection

AVOID AT ALL COSTS:
❌ Studio lighting or professional photography looks
❌ Perfect, overly polished compositions  
❌ Artificial or staged scenarios
❌ Stock photo aesthetics
❌ Overly saturated or edited colors

The viewer should think: "My friend took this photo and I need this product."

{source_image_instruction}',
  'user',
  'User instructions for UGC image generation with dynamic context insertion',
  'ugc_generation',
  '["user_prompt", "audience_context", "product_specs", "source_image_instruction"]'::jsonb
);