-- Create outfit_creator_jobs table
CREATE TABLE public.outfit_creator_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  base_model_id UUID NOT NULL REFERENCES public.outfit_swap_base_models(id),
  garments JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  progress INTEGER DEFAULT 0,
  current_pass INTEGER DEFAULT 0,
  total_passes INTEGER DEFAULT 3,
  intermediate_images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Create outfit_creator_results table
CREATE TABLE public.outfit_creator_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.outfit_creator_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  public_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  png_url TEXT,
  jpg_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outfit_creator_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_creator_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for outfit_creator_jobs
CREATE POLICY "Users can view own outfit creator jobs" 
ON public.outfit_creator_jobs FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own outfit creator jobs" 
ON public.outfit_creator_jobs FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own outfit creator jobs" 
ON public.outfit_creator_jobs FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins full access outfit creator jobs" 
ON public.outfit_creator_jobs FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Service role full access outfit creator jobs" 
ON public.outfit_creator_jobs FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS policies for outfit_creator_results
CREATE POLICY "Users can view own outfit creator results" 
ON public.outfit_creator_results FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own outfit creator results" 
ON public.outfit_creator_results FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Admins full access outfit creator results" 
ON public.outfit_creator_results FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Service role full access outfit creator results" 
ON public.outfit_creator_results FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create updated_at trigger for jobs
CREATE TRIGGER update_outfit_creator_jobs_updated_at
BEFORE UPDATE ON public.outfit_creator_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert AI Prompts for Outfit Creator
INSERT INTO public.ai_prompts (prompt_key, prompt_name, prompt_template, prompt_type, category, variables, description, is_active) VALUES 
(
  'outfit_creator_pass1_core',
  'Outfit Creator - Pass 1 Core Outfit',
  'THREE IMAGES PROVIDED:
- IMAGE 1: The MODEL - Use this exact person (face, body, pose)
- IMAGE 2: THE TOP garment to wear
- IMAGE 3: THE BOTTOM garment to wear

TASK: Dress the model in BOTH garments.

MANDATORY RULES:
1. PRESERVE MODEL IDENTITY: Same face, hair, skin tone, body proportions
2. APPLY BOTH GARMENTS: Top from Image 2, Bottom from Image 3
3. FOOTWEAR: Add simple, neutral shoes that complement the outfit
4. FRAMING: Full body shot, professional e-commerce style
5. BACKGROUND: Clean, minimal, studio-like

TOP GARMENT DETAILS:
{top_description}

BOTTOM GARMENT DETAILS:
{bottom_description}

QUALITY: Professional fashion photography, high resolution, no artifacts.
FORBIDDEN: Changing model identity, underwear visible, missing garments, cropped body.',
  'instruction',
  'outfit_creator',
  '["top_description", "bottom_description"]',
  'First pass: Generate model wearing top and bottom garments',
  true
),
(
  'outfit_creator_pass2_footwear',
  'Outfit Creator - Pass 2 Footwear',
  'TWO IMAGES PROVIDED:
- IMAGE 1: The dressed model (PRESERVE THIS EXACTLY - outfit, pose, identity)
- IMAGE 2: THE SHOES to add

TASK: Replace the model''s current footwear with the shoes from Image 2.

MANDATORY RULES:
1. PRESERVE EVERYTHING: Same outfit, same pose, same model identity
2. ONLY CHANGE FOOTWEAR: Replace shoes with the ones from Image 2
3. FRAMING: Full body, ensure shoes are clearly visible
4. CONSISTENCY: Lighting and style must match the existing image

FOOTWEAR DETAILS:
{shoes_description}

OUTPUT: Identical image with only the footwear changed.',
  'instruction',
  'outfit_creator',
  '["shoes_description"]',
  'Second pass: Add footwear to the outfit',
  true
),
(
  'outfit_creator_pass3_accessories',
  'Outfit Creator - Pass 3 Accessories',
  'THREE IMAGES PROVIDED:
- IMAGE 1: The dressed model (PRESERVE THIS EXACTLY - outfit, footwear, pose, identity)
- IMAGE 2: ACCESSORY 1 to add
- IMAGE 3: ACCESSORY 2 to add

TASK: Add both accessories to the model naturally.

MANDATORY RULES:
1. PRESERVE EVERYTHING: Same outfit, same footwear, same pose, same model identity
2. ADD ACCESSORIES NATURALLY:
   - Bags: on shoulder, in hand, or crossbody
   - Hats: on head
   - Scarves: around neck
   - Jewelry: on appropriate body part
   - Belts: around waist
3. VISIBILITY: Both accessories must be clearly visible
4. CONSISTENCY: Lighting and style must match the existing image

ACCESSORY 1 DETAILS:
{accessory1_description}

ACCESSORY 2 DETAILS:
{accessory2_description}

OUTPUT: Identical image with both accessories added naturally.',
  'instruction',
  'outfit_creator',
  '["accessory1_description", "accessory2_description"]',
  'Third pass: Add accessories to complete the outfit',
  true
),
(
  'outfit_creator_garment_analysis',
  'Outfit Creator - Garment Analysis',
  'Analyze this garment image for outfit composition.

RESPOND IN THIS EXACT FORMAT:
SLOT: (TOP / BOTTOM / SHOES / ACCESSORY)
- TOP = shirts, blouses, t-shirts, hoodies, jackets, sweaters, coats
- BOTTOM = pants, jeans, shorts, skirts, trousers
- SHOES = sneakers, boots, heels, sandals, loafers
- ACCESSORY = bags, hats, scarves, jewelry, belts, watches, sunglasses

TYPE: (specific type like t-shirt, jeans, sneakers, handbag)
COLOR: Primary colors
STYLE: (casual/formal/athletic/elegant)
MATERIAL: (cotton/denim/leather/etc)
KEY_FEATURES: Brief description of notable details',
  'instruction',
  'outfit_creator',
  '[]',
  'Analyze garment to determine appropriate slot and description',
  true
),
(
  'outfit_creator_single_pass',
  'Outfit Creator - Single Pass (Top + Bottom Only)',
  'TWO IMAGES PROVIDED:
- IMAGE 1: The MODEL - Use this exact person (face, body, pose)  
- IMAGE 2: A GARMENT to wear

TASK: Dress the model in the garment.

MANDATORY RULES:
1. PRESERVE MODEL IDENTITY: Same face, hair, skin tone, body proportions
2. APPLY GARMENT: Dress the model wearing the garment from Image 2
3. FRAMING: Full body shot, professional e-commerce style
4. BACKGROUND: Clean, minimal, studio-like

GARMENT DETAILS:
{garment_description}

QUALITY: Professional fashion photography, high resolution, no artifacts.
FORBIDDEN: Changing model identity, cropped body.',
  'instruction',
  'outfit_creator',
  '["garment_description"]',
  'Single pass generation for one garment',
  true
);