export type PackId = 'ecommerce' | 'social' | 'ads';

export interface PackStyle {
  id: string;
  labelKey: string;
  prompt: string;
}

export interface Pack {
  id: PackId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  ratio: '1:1' | '3:4';
  styles: PackStyle[];
}

// ── Fashion Mandatory Rules (adapted from Outfit Swap) ──
const FASHION_RULES = `
MANDATORY RULES FOR FASHION/CLOTHING:
1. The EXACT product from the reference image MUST be displayed on a model or invisible mannequin — NEVER flat on any surface, table, or floor.
2. PATTERN FIDELITY — CRITICAL: Reproduce the EXACT fabric pattern, print, texture, scale, spacing, and colors from the reference image. Do NOT interpret, reimagine, simplify, or replace patterns.
3. Complete outfit required: if the product is a top, add neutral complementary bottoms (simple jeans/trousers) and basic shoes. If the product is bottoms, add a neutral plain top. NEVER show bare legs, underwear, or incomplete outfits.
4. Natural human anatomy: correct proportions, natural skin texture, realistic hands and fingers, relaxed natural expression.
5. Product is the VISUAL HERO — it must be the most prominent, well-lit, and in-focus element in the frame.
6. Maintain exact product colors, branding, labels, stitching details, and hardware from the reference image.
FORBIDDEN: Flat-lay, folded product, crumpled fabric, product on surface/table/floor, bare torso, underwear visible, distorted anatomy, extra limbs.
`;

// ── Product Mandatory Rules (adapted from Bulk Background) ──
const PRODUCT_RULES = `
MANDATORY RULES FOR PRODUCT:
1. Ultra-realistic studio product photography — the result MUST look like a real photograph taken with a professional camera and lens.
2. Exact geometric proportions preserved from the reference image — no stretching, warping, or size distortion.
3. Product is the ONLY subject in the frame — no duplicate products, no extra objects unless specified.
4. Soft grounded shadow for natural anchoring — NO harsh shadows, NO floating without shadow.
5. Natural lens perspective with cinematic shallow depth of field drawing the eye to the product.
6. NO CGI look, NO 3D reconstruction artifacts, NO plastic/synthetic appearance.
7. Maintain exact product colors, branding, labels, surface texture, and material finish from the reference image.
FORBIDDEN: Multiple products, text overlays, watermarks, AI artifacts, distorted geometry, unrealistic reflections, CGI aesthetic.
`;

// ── Fashion Packs ──
const fashionPacks: Pack[] = [
  {
    id: 'ecommerce',
    nameKey: 'onboarding.packs.ecommerce.name',
    descriptionKey: 'onboarding.packs.ecommerce.description',
    icon: '🛒',
    ratio: '1:1',
    styles: [
      {
        id: 'hero_product',
        labelKey: 'onboarding.packs.styles.heroProduct',
        prompt: `TASK: Professional catalog hero shot.
MANDATORY RULES:
1. The EXACT product from the reference image MUST be worn by a model in a clean studio environment.
2. Neutral solid background, soft even studio lighting with no harsh shadows.
3. Full product visibility — the garment is the VISUAL HERO of the composition.
4. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture, colors from the reference — do NOT interpret or reimagine.
5. Model must have natural anatomy, relaxed standing pose, natural expression.
6. Complete outfit: add neutral complementary pieces (simple jeans/pants, basic shoes) that do NOT distract from the product.
7. Full body or 3/4 framing, commercial e-commerce photography style.
FORBIDDEN: Flat-lay, folded product, bare torso, underwear visible, product on surface.`,
      },
      {
        id: 'catalog_clean',
        labelKey: 'onboarding.packs.styles.catalogClean',
        prompt: `TASK: Clean catalog photo — ghost mannequin technique.
MANDATORY RULES:
1. Product displayed using invisible/ghost mannequin technique — garment appears worn but no visible model.
2. Pure white background, crisp even lighting from all sides, no shadows.
3. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture from the reference — pixel-accurate reproduction.
4. Product fills 70-80% of the frame, perfectly centered, symmetrical presentation.
5. All product details visible: stitching, labels, hardware, seams.
6. E-commerce ready: clean, professional, distraction-free.
FORBIDDEN: Flat-lay, visible mannequin parts, colored background, product on table.`,
      },
      {
        id: 'detail_macro',
        labelKey: 'onboarding.packs.styles.detailMacro',
        prompt: `TASK: Extreme close-up macro detail shot.
MANDATORY RULES:
1. Tight close-up of the product focusing on texture, stitching, fabric weave, material quality.
2. Product MUST be the EXACT item from the reference image — same colors, pattern, materials.
3. Shallow depth of field with the detail area in razor-sharp focus.
4. Professional studio lighting highlighting surface texture and material characteristics.
5. Show the craftsmanship: thread count, zipper quality, button details, fabric hand-feel.
6. Clean neutral background, no distracting elements.
FORBIDDEN: Full product view, flat-lay, multiple products, blurry focus area.`,
      },
      {
        id: 'model_neutral',
        labelKey: 'onboarding.packs.styles.modelNeutral',
        prompt: `TASK: Model wearing product — neutral catalog pose.
MANDATORY RULES:
1. Model wearing the EXACT product from the reference image in a natural standing pose.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture, scale from the reference — do NOT simplify or reimagine.
3. Minimal clean background (light grey or off-white), standard catalog photography lighting.
4. Natural relaxed expression, arms naturally at sides or one hand in pocket.
5. Full body or 3/4 view — product must be fully visible and the visual focal point.
6. Complete outfit with neutral complementary pieces that do NOT compete with the product.
7. Natural human anatomy: correct proportions, realistic hands, natural skin.
FORBIDDEN: Dramatic poses, busy backgrounds, bare torso, underwear, flat-lay.`,
      },
    ],
  },
  {
    id: 'social',
    nameKey: 'onboarding.packs.social.name',
    descriptionKey: 'onboarding.packs.social.description',
    icon: '📱',
    ratio: '3:4',
    styles: [
      {
        id: 'lifestyle',
        labelKey: 'onboarding.packs.styles.lifestyle',
        prompt: `TASK: Authentic lifestyle photo — UGC aesthetic.
MANDATORY RULES:
1. Person wearing the EXACT product from the reference image naturally in an everyday setting (café, park, apartment).
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture from the reference — no reinterpretation.
3. Warm natural lighting, candid feel — looks like a friend took the photo with an iPhone.
4. Natural relaxed pose, genuine smile or candid moment, not overly posed.
5. Product is clearly visible and the focal point despite the casual setting.
6. Complete outfit with complementary pieces that enhance but don't distract.
7. Social media ready composition (3:4 ratio optimized for Instagram).
FORBIDDEN: Studio lighting, stiff poses, flat-lay, bare torso, product on surface.`,
      },
      {
        id: 'influencer',
        labelKey: 'onboarding.packs.styles.influencer',
        prompt: `TASK: Influencer-style aspirational photo.
MANDATORY RULES:
1. Model posing confidently wearing the EXACT product from the reference image in a trendy location.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, colors from the reference — pixel-accurate.
3. Bright, aspirational aesthetic — clean composition, Instagram-ready golden hour or bright daylight.
4. Confident pose: hand on hip, mid-stride, or casual lean against a wall.
5. Product is the HERO — styled to stand out, well-lit, in sharp focus.
6. Trendy setting: minimalist architecture, café terrace, palm-lined street, modern interior.
7. Complete styled outfit with curated complementary pieces.
FORBIDDEN: Flat-lay, studio background, bare torso, product on table, dark moody lighting.`,
      },
      {
        id: 'street_style',
        labelKey: 'onboarding.packs.styles.streetStyle',
        prompt: `TASK: Street style fashion photography.
MANDATORY RULES:
1. Person walking confidently in an urban city setting wearing the EXACT product from the reference image.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, texture, colors — no creative reinterpretation.
3. Dynamic angle — slightly low perspective, mid-stride movement, editorial street photography feel.
4. Natural street lighting with urban bokeh background (city lights, storefronts slightly blurred).
5. Product MUST be clearly visible and the visual anchor of the composition.
6. Complete street-style outfit with complementary urban pieces (sneakers, accessories).
7. Natural human anatomy, confident body language, candid energy.
FORBIDDEN: Static pose, studio background, flat-lay, bare torso, product on surface.`,
      },
      {
        id: 'casual_scene',
        labelKey: 'onboarding.packs.styles.casualScene',
        prompt: `TASK: Casual everyday lifestyle scene.
MANDATORY RULES:
1. Person relaxing at a café, park bench, or cozy home setting wearing the EXACT product from the reference image.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture from the reference.
3. Soft natural lighting, authentic relaxed mood — feels like a real candid moment.
4. Casual relaxed pose: sitting cross-legged, holding a coffee, reading, or laughing.
5. Product clearly visible despite the relaxed setting — it's the visual anchor.
6. Complete casual outfit with lifestyle-appropriate complementary pieces.
7. Warm color palette, inviting atmosphere, social media lifestyle content quality.
FORBIDDEN: Stiff poses, studio setting, flat-lay, bare torso, product on table.`,
      },
    ],
  },
  {
    id: 'ads',
    nameKey: 'onboarding.packs.ads.name',
    descriptionKey: 'onboarding.packs.ads.description',
    icon: '📢',
    ratio: '3:4',
    styles: [
      {
        id: 'magazine',
        labelKey: 'onboarding.packs.styles.magazine',
        prompt: `TASK: High-end magazine editorial photo — Vogue/Harper's Bazaar aesthetic.
MANDATORY RULES:
1. Model in a dramatic editorial pose wearing the EXACT product from the reference image.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture from the reference — flawless reproduction.
3. Professional studio lighting with artistic directional shadows creating depth and drama.
4. Fashion editorial composition: bold framing, strong visual hierarchy, product as the centerpiece.
5. Model with striking confident expression, editorial body language — NOT casual.
6. Complete haute-couture styled outfit with editorial-appropriate complementary pieces.
7. Cinematic color grading, magazine-cover quality, aspirational luxury feel.
FORBIDDEN: Casual poses, flat-lay, bare torso, product on surface, snapshot aesthetic.`,
      },
      {
        id: 'campaign',
        labelKey: 'onboarding.packs.styles.campaign',
        prompt: `TASK: Fashion campaign advertising photo.
MANDATORY RULES:
1. Model in a powerful confident pose wearing the EXACT product from the reference image.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture — no reinterpretation.
3. Cinematic lighting with bold composition — the image MUST stop the scroll.
4. High-fashion advertising aesthetic: dramatic, aspirational, campaign-quality.
5. Product is the VISUAL HERO — perfectly lit, in sharp focus, prominently displayed.
6. Complete styled outfit with campaign-appropriate complementary pieces.
7. Strong color contrast, professional retouching quality, print-ad ready.
FORBIDDEN: Casual setting, flat-lay, product on surface, bare torso, low-energy pose.`,
      },
      {
        id: 'dramatic_light',
        labelKey: 'onboarding.packs.styles.dramaticLight',
        prompt: `TASK: Dramatic lighting product showcase.
MANDATORY RULES:
1. Model wearing the EXACT product from the reference image with strong directional lighting.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, texture, colors — even in dramatic light the pattern MUST be accurate.
3. Single strong directional light creating bold shadows and highlights on the garment.
4. Dark moody background — the product emerges from shadow into light.
5. High contrast commercial photography — theatrical, premium, attention-grabbing.
6. Product texture and details enhanced by the dramatic lighting angle.
7. Complete outfit, natural anatomy, confident pose facing the light source.
FORBIDDEN: Flat lighting, flat-lay, product on surface, bare torso, washed-out exposure.`,
      },
      {
        id: 'bold_background',
        labelKey: 'onboarding.packs.styles.boldBackground',
        prompt: `TASK: Bold vibrant background — pop-art advertising style.
MANDATORY RULES:
1. Model wearing the EXACT product from the reference image against a striking solid-colored background.
2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, colors from the reference.
3. Vibrant contrasting background color that makes the product POP — bold red, electric blue, sunshine yellow, or hot pink.
4. Clean composition with strong color contrast between product and background.
5. Modern advertising aesthetic — eye-catching, scroll-stopping, Instagram-ad ready.
6. Even studio lighting ensuring product colors are accurate despite bold background.
7. Complete outfit, confident energetic pose, natural anatomy.
FORBIDDEN: Neutral backgrounds, flat-lay, product on surface, bare torso, muted colors.`,
      },
    ],
  },
];

// ── Product (Non-Fashion) Packs ──
const productPacks: Pack[] = [
  {
    id: 'ecommerce',
    nameKey: 'onboarding.packs.ecommerce.name',
    descriptionKey: 'onboarding.packs.ecommerce.description',
    icon: '🛒',
    ratio: '1:1',
    styles: [
      {
        id: 'hero_packshot',
        labelKey: 'onboarding.packs.styles.heroPackshot',
        prompt: `TASK: Premium hero packshot — ultra-realistic studio product photography.
MANDATORY RULES:
1. Product from the reference image is the ONLY object — exact proportions preserved, no stretching or warping.
2. Pure white seamless background with soft professional studio lighting from multiple angles.
3. Product standing upright or elegantly floating with soft grounded shadow for natural anchoring.
4. Cinematic shallow depth of field subtly drawing the eye to the product center.
5. Natural lens perspective — shot looks like a real photo from a Canon/Sony professional camera.
6. Exact product colors, branding, labels, and surface details preserved from the reference.
7. Premium commercial feel: clean, luxurious, hero-image quality for a product landing page.
FORBIDDEN: Multiple products, text overlays, watermarks, AI artifacts, distorted geometry, CGI look.`,
      },
      {
        id: 'angle_variation',
        labelKey: 'onboarding.packs.styles.angleVariation',
        prompt: `TASK: Dynamic 3/4 angle product shot — premium catalog photography.
MANDATORY RULES:
1. Product from the reference image shot from a 3/4 elevated angle showing depth and dimension.
2. Exact geometric proportions preserved — no distortion from the angle change.
3. Clean white or light grey background, soft even studio lighting revealing form and contours.
4. Cinematic depth of field with the product in crisp focus, background gently falling off.
5. Soft grounded shadow adding realism and spatial anchoring.
6. All branding, labels, textures, and surface details from the reference accurately preserved.
7. Professional product catalog quality — ready for e-commerce listing.
FORBIDDEN: Flat top-down view, multiple products, CGI aesthetic, harsh shadows, distorted proportions.`,
      },
      {
        id: 'detail_macro',
        labelKey: 'onboarding.packs.styles.detailMacro',
        prompt: `TASK: Ultra-close macro detail shot — material and craftsmanship showcase.
MANDATORY RULES:
1. Extreme close-up of the product from the reference image — focus on material quality, finish, texture.
2. Razor-sharp focus on the detail area with beautiful bokeh falloff on surrounding areas.
3. Professional macro lighting revealing surface characteristics: grain, sheen, matte finish, metallic details.
4. Exact product colors, material finish, and surface texture from the reference.
5. Studio environment — clean, distraction-free, the detail IS the subject.
6. Premium feel: this shot should communicate quality and craftsmanship.
FORBIDDEN: Full product view, multiple products, flat lighting, blurry focus area, CGI look.`,
      },
      {
        id: 'scale_context',
        labelKey: 'onboarding.packs.styles.scaleContext',
        prompt: `TASK: Product in context — scale and usage demonstration.
MANDATORY RULES:
1. Product from the reference image shown being held in a hand or placed next to a common reference object for scale.
2. Exact product proportions, colors, branding, and details preserved from the reference.
3. Clean natural setting with soft warm lighting — feels authentic and trustworthy.
4. Shallow depth of field keeping the product in sharp focus, context elements slightly soft.
5. Natural skin tones if hands are shown — realistic, not plastic or AI-looking.
6. The composition helps the customer understand the actual physical size of the product.
7. Ultra-realistic photography — looks like a real lifestyle product photo.
FORBIDDEN: Multiple products, cluttered scene, CGI hands, distorted proportions, studio white background.`,
      },
    ],
  },
  {
    id: 'social',
    nameKey: 'onboarding.packs.social.name',
    descriptionKey: 'onboarding.packs.social.description',
    icon: '📱',
    ratio: '3:4',
    styles: [
      {
        id: 'environment_scene',
        labelKey: 'onboarding.packs.styles.environmentScene',
        prompt: `TASK: Aspirational lifestyle environment — product in its natural habitat.
MANDATORY RULES:
1. Product from the reference image placed in a beautiful real-world setting where it would naturally be used.
2. Exact product proportions, colors, branding preserved — the product is the HERO of the scene.
3. Warm natural lighting creating an inviting, aspirational atmosphere (golden hour or bright natural light).
4. Cinematic shallow depth of field — product in sharp focus, environment beautifully blurred.
5. Scene tells a story: the viewer can imagine owning and using this product in this setting.
6. Premium lifestyle photography quality — Instagram-worthy, aspirational, scroll-stopping.
7. Ultra-realistic: no CGI look, natural shadows, realistic materials and reflections.
FORBIDDEN: White studio background, multiple products, flat lighting, cluttered scene, CGI aesthetic.`,
      },
      {
        id: 'hand_interaction',
        labelKey: 'onboarding.packs.styles.handInteraction',
        prompt: `TASK: Natural hand interaction — authentic UGC-style product demo.
MANDATORY RULES:
1. Person naturally holding, using, or demonstrating the product from the reference image.
2. Close-up perspective showing the product being interacted with — authentic UGC feel.
3. Exact product proportions, colors, branding, surface details preserved from the reference.
4. Natural lighting (window light or soft daylight), casual authentic setting.
5. Realistic hands with natural skin texture, correct finger proportions, natural nail appearance.
6. The interaction should feel genuine — not staged or overly posed.
7. Social media content quality — feels like a real customer sharing their purchase.
FORBIDDEN: Studio setup, stiff posed hands, CGI/plastic hands, product floating without context, multiple products.`,
      },
      {
        id: 'lifestyle_scene',
        labelKey: 'onboarding.packs.styles.lifestyleScene',
        prompt: `TASK: Curated lifestyle scene — aspirational daily moment.
MANDATORY RULES:
1. Product from the reference image as the HERO focal point in a beautifully curated setting.
2. Aspirational daily moment: morning coffee ritual, creative workspace, cozy evening, travel moment.
3. Exact product proportions, colors, branding preserved — product draws the eye first.
4. Warm inviting tones, natural lighting, cinematic depth of field.
5. Complementary props that enhance the story without competing (a cup, a book, a plant — minimal).
6. Instagram-worthy composition: intentional framing, visual balance, premium lifestyle aesthetic.
7. Ultra-realistic photography — no CGI, natural shadows and reflections.
FORBIDDEN: Cluttered scene, multiple hero products, flat lighting, sterile studio look, CGI aesthetic.`,
      },
      {
        id: 'flat_lay',
        labelKey: 'onboarding.packs.styles.flatLay',
        prompt: `TASK: Aesthetic flat-lay composition — overhead product showcase.
MANDATORY RULES:
1. Product from the reference image as the HERO in an artful overhead flat-lay arrangement.
2. Exact product proportions, colors, branding, surface details preserved from the reference.
3. Clean surface (marble, light wood, or linen texture) providing subtle texture contrast.
4. Balanced composition with 2-3 small complementary props arranged with intentional spacing.
5. Even soft overhead lighting — no harsh shadows, even illumination across the frame.
6. Social media content quality: Instagram-ready, aspirational, visually satisfying arrangement.
7. Product occupies the most prominent position and largest area in the composition.
FORBIDDEN: Cluttered arrangement, competing products, dark surfaces, harsh directional shadows, CGI look.`,
      },
    ],
  },
  {
    id: 'ads',
    nameKey: 'onboarding.packs.ads.name',
    descriptionKey: 'onboarding.packs.ads.description',
    icon: '📢',
    ratio: '3:4',
    styles: [
      {
        id: 'floating_product',
        labelKey: 'onboarding.packs.styles.floatingProduct',
        prompt: `TASK: Dynamic floating product — eye-catching advertising hero shot.
MANDATORY RULES:
1. Product from the reference image floating dramatically in mid-air with dynamic energy.
2. Exact product proportions, colors, branding preserved — no distortion from the dynamic angle.
3. Bold colored gradient background (deep blue to purple, orange to pink, or teal to emerald).
4. Subtle motion effects: light particles, soft glow, or gentle splash elements around the product.
5. Dramatic lighting from below or side creating depth and dimension on the product.
6. Cinematic feel — this is a premium advertisement hero image that stops the scroll.
7. Soft shadow or reflection below anchoring the product despite the floating effect.
FORBIDDEN: Multiple products, text overlays, watermarks, static flat composition, CGI-plastic look.`,
      },
      {
        id: 'bold_background',
        labelKey: 'onboarding.packs.styles.boldBackground',
        prompt: `TASK: Bold vibrant background — pop-art commercial photography.
MANDATORY RULES:
1. Product from the reference image on a bold, vibrant solid-colored background.
2. Exact product proportions, colors, branding, surface details preserved from the reference.
3. Strong color contrast between product and background — choose a complementary color that makes it POP.
4. Clean minimal composition — product is the ONLY subject, centered with breathing room.
5. Professional studio lighting ensuring product colors read accurately against the bold background.
6. Modern advertising aesthetic — eye-catching, confident, social-ad ready.
7. Soft grounded shadow for realism despite the bold artistic background.
FORBIDDEN: Multiple products, busy patterns on background, text, muted colors, cluttered composition.`,
      },
      {
        id: 'motion_scene',
        labelKey: 'onboarding.packs.styles.motionScene',
        prompt: `TASK: High-energy motion scene — dynamic advertising photography.
MANDATORY RULES:
1. Product from the reference image in a dynamic scene with motion and energy.
2. Exact product proportions, colors, branding preserved — product integrity is paramount.
3. Dynamic elements: water splashes, powder explosions, light streaks, or particle effects surrounding the product.
4. High-energy cinematic feel — dramatic lighting, bold composition, attention-grabbing.
5. Product remains in razor-sharp focus while motion elements have natural motion blur.
6. Dark or gradient background making the product and effects POP.
7. Premium advertising quality — this image should make someone stop scrolling and look.
FORBIDDEN: Static composition, multiple products, text overlays, product obscured by effects, CGI-plastic look.`,
      },
      {
        id: 'dramatic_spotlight',
        labelKey: 'onboarding.packs.styles.dramaticSpotlight',
        prompt: `TASK: Dramatic spotlight — luxury product photography.
MANDATORY RULES:
1. Product from the reference image under a single dramatic spotlight against a dark background.
2. Exact product proportions, colors, branding, surface details preserved from the reference.
3. Strong directional light from above creating a pool of light around the product.
4. Dark moody background (deep black or very dark grey) — the product EMERGES from darkness.
5. High contrast revealing product texture, material quality, and premium details.
6. Luxury advertising feel — premium, exclusive, desirable.
7. Subtle reflection on a dark glossy surface below the product for added depth.
FORBIDDEN: Flat even lighting, white background, multiple products, text, cluttered scene, CGI aesthetic.`,
      },
    ],
  },
];

/**
 * Get the pack definitions based on whether the product is fashion or not.
 */
export function getPacksForProductType(isFashion: boolean): Pack[] {
  return isFashion ? fashionPacks : productPacks;
}

/**
 * Get a specific pack by ID.
 */
export function getPack(isFashion: boolean, packId: PackId): Pack | undefined {
  return getPacksForProductType(isFashion).find(p => p.id === packId);
}

/**
 * Build the combined prompt for a pack's 4 styles.
 */
export function buildPackPrompt(pack: Pack, isFashion: boolean): string {
  const rules = isFashion ? FASHION_RULES : PRODUCT_RULES;
  
  const stylePrompts = pack.styles
    .map((style, i) => `--- STYLE OPTION ${i + 1} (${style.id}) ---\n${style.prompt}`)
    .join('\n\n');

  return `TASK: Generate a SINGLE professional product image from the reference product photo.
The image MUST show the EXACT same product from the reference image.
IMPORTANT: Output exactly ONE image, NOT a collage, NOT a grid, NOT multiple images combined.

Choose one of the following styles for this image:

${stylePrompts}

${rules}

ABSOLUTE QUALITY RULES:
1. Output MUST be a single standalone photograph — NEVER a grid, montage, collage, or split-screen.
2. No AI artifacts, no watermarks, no text overlays of any kind.
3. Natural human anatomy if people appear — correct proportions, realistic hands, natural skin.
4. Product integrity is the HIGHEST priority — exact colors, branding, shape, proportions from the reference.
5. Ultra-realistic photography quality — the result must look like a real professional photograph.`;
}
