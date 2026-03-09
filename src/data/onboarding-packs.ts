export type PackId = 'ecommerce' | 'social' | 'ads';

export interface PackStyle {
  id: string;
  labelKey: string; // i18n key
  prompt: string;
}

export interface Pack {
  id: PackId;
  nameKey: string;
  descriptionKey: string;
  icon: string; // emoji
  ratio: '1:1' | '3:4';
  styles: PackStyle[];
}

// ── Fashion Mandatory Rules ──
const FASHION_RULES = `
MANDATORY RULES FOR FASHION/CLOTHING:
- Product MUST be displayed on a model or invisible mannequin.
- NEVER lay flat on any surface, table, or floor.
- NEVER show the product folded or crumpled.
- Product must appear worn, draped on model, or on ghost mannequin.
- Maintain exact product colors, branding, labels, and details from the reference image.
`;

// ── Product Mandatory Rules ──
const PRODUCT_RULES = `
MANDATORY RULES FOR PRODUCT:
- Display product standing, floating, or on appropriate surface.
- Professional product catalog photography style.
- Clean, well-lit composition.
- Maintain exact product colors, branding, labels, and details from the reference image.
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
        prompt: 'Professional catalog hero shot. Product displayed on a model in a clean studio environment. Neutral solid background, soft even studio lighting. Full product visibility, commercial e-commerce photography.',
      },
      {
        id: 'catalog_clean',
        labelKey: 'onboarding.packs.styles.catalogClean',
        prompt: 'Clean catalog photo. Product on invisible mannequin or ghost mannequin technique. Pure white background. Crisp even lighting. E-commerce ready product photography.',
      },
      {
        id: 'detail_macro',
        labelKey: 'onboarding.packs.styles.detailMacro',
        prompt: 'Extreme close-up macro shot of the product. Focus on texture, stitching, fabric weave, material quality. Shallow depth of field. Studio lighting highlighting surface details.',
      },
      {
        id: 'model_neutral',
        labelKey: 'onboarding.packs.styles.modelNeutral',
        prompt: 'Model wearing the product in a neutral standing pose. Minimal clean background. Natural relaxed expression. Standard catalog photography style, full body or 3/4 view.',
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
        prompt: 'Authentic lifestyle photo. Person wearing the product naturally in an everyday setting. Warm natural lighting, candid feel. iPhone-quality UGC aesthetic, social media ready.',
      },
      {
        id: 'influencer',
        labelKey: 'onboarding.packs.styles.influencer',
        prompt: 'Influencer-style photo. Model posing confidently with the product in a trendy location. Bright, aspirational aesthetic. Clean composition, Instagram-ready.',
      },
      {
        id: 'street_style',
        labelKey: 'onboarding.packs.styles.streetStyle',
        prompt: 'Street style fashion photo. Person walking confidently in an urban city setting wearing the product. Dynamic angle, natural street lighting, editorial street photography feel.',
      },
      {
        id: 'casual_scene',
        labelKey: 'onboarding.packs.styles.casualScene',
        prompt: 'Casual everyday scene. Person relaxing at a café or park wearing the product. Soft natural lighting, authentic relaxed mood. Lifestyle social media content.',
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
        prompt: 'High-end magazine editorial photo. Model in a dramatic pose wearing the product. Professional studio lighting with artistic shadows. Vogue/Harper\'s Bazaar aesthetic.',
      },
      {
        id: 'campaign',
        labelKey: 'onboarding.packs.styles.campaign',
        prompt: 'Fashion campaign photo. Model in a powerful confident pose with the product. Cinematic lighting, bold composition. High-fashion advertising aesthetic.',
      },
      {
        id: 'dramatic_light',
        labelKey: 'onboarding.packs.styles.dramaticLight',
        prompt: 'Dramatic lighting photo. Product on model with strong directional lighting creating bold shadows and highlights. Dark moody background. High contrast commercial photography.',
      },
      {
        id: 'bold_background',
        labelKey: 'onboarding.packs.styles.boldBackground',
        prompt: 'Bold vibrant background. Model wearing the product against a striking colored background. Pop-art inspired, eye-catching composition. Modern advertising style.',
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
        prompt: 'Professional hero packshot. Product standing or floating on pure white background. Even studio lighting, no shadows. Clean commercial product photography for e-commerce.',
      },
      {
        id: 'angle_variation',
        labelKey: 'onboarding.packs.styles.angleVariation',
        prompt: 'Product from a 3/4 angle view. Slight elevation perspective showing depth and dimension. Clean white background, soft studio lighting. Professional product catalog photo.',
      },
      {
        id: 'detail_macro',
        labelKey: 'onboarding.packs.styles.detailMacro',
        prompt: 'Extreme close-up macro shot of the product. Focus on material quality, finish, texture details. Shallow depth of field. Studio lighting highlighting surface characteristics.',
      },
      {
        id: 'scale_context',
        labelKey: 'onboarding.packs.styles.scaleContext',
        prompt: 'Product shown in context to demonstrate scale. Placed next to common reference objects or held in hand. Clean natural setting, even lighting. Helps customer understand actual size.',
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
        prompt: 'Product in a natural lifestyle environment. Placed in a real-world setting where it would typically be used. Warm natural lighting, authentic feel. Social media lifestyle photo.',
      },
      {
        id: 'hand_interaction',
        labelKey: 'onboarding.packs.styles.handInteraction',
        prompt: 'Person interacting with the product naturally. Hands holding, using, or demonstrating the product. Close-up perspective, authentic UGC feel. Natural lighting.',
      },
      {
        id: 'lifestyle_scene',
        labelKey: 'onboarding.packs.styles.lifestyleScene',
        prompt: 'Lifestyle scene with the product as the focal point. Beautiful curated setting, warm tones. Product integrated naturally into an aspirational daily moment. Instagram aesthetic.',
      },
      {
        id: 'flat_lay',
        labelKey: 'onboarding.packs.styles.flatLay',
        prompt: 'Aesthetic flat lay composition. Product arranged artfully with complementary props from above. Clean surface, balanced composition. Social media content style.',
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
        prompt: 'Product floating dramatically in mid-air. Dynamic angle with motion blur or particle effects. Bold colored gradient background. Eye-catching advertising composition.',
      },
      {
        id: 'bold_background',
        labelKey: 'onboarding.packs.styles.boldBackground',
        prompt: 'Product on a bold, vibrant colored background. Strong contrast, clean composition. Pop-art inspired commercial photography. Modern advertising aesthetic.',
      },
      {
        id: 'motion_scene',
        labelKey: 'onboarding.packs.styles.motionScene',
        prompt: 'Dynamic motion scene with the product. Splashes, particles, or movement effects around the product. High energy, cinematic feel. Attention-grabbing advertisement photo.',
      },
      {
        id: 'dramatic_spotlight',
        labelKey: 'onboarding.packs.styles.dramaticSpotlight',
        prompt: 'Product under dramatic spotlight. Dark background with a single strong directional light. Luxury feel, high contrast. Premium advertising photography.',
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
    .map((style, i) => `IMAGE ${i + 1} (${style.id}): ${style.prompt}`)
    .join('\n\n');

  return `TASK: Generate 4 distinct professional product images from the reference product photo.
Each image MUST show the EXACT same product from the reference image.

${stylePrompts}

${rules}

QUALITY RULES:
- No AI artifacts, watermarks, or text overlays.
- Natural human anatomy if people appear.
- Each image must be visually distinct in composition and setting.
- Product integrity is the highest priority — exact colors, branding, shape.`;
}
