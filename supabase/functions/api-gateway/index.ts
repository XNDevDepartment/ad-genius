import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ApiKeyValidation {
  api_key_id: string
  user_id: string
  permissions: string[]
  rate_limit_tier: string
  is_valid: boolean
}

interface RateLimitResult {
  allowed: boolean
  reason?: string
  retry_after?: number
  limit?: number
  remaining_minute?: number
  remaining_hour?: number
  remaining_day?: number
}

// ── Pack Definitions (mirrored from onboarding-packs.ts) ──

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

interface PackStyle { id: string; prompt: string }
interface PackDef { id: string; ratio: string; styles: PackStyle[] }

const FASHION_PACKS: Record<string, PackDef> = {
  ecommerce: {
    id: 'ecommerce', ratio: '1:1',
    styles: [
      { id: 'hero_product', prompt: `TASK: Professional catalog hero shot.\nMANDATORY RULES:\n1. The EXACT product from the reference image MUST be worn by a model in a clean studio environment.\n2. Neutral solid background, soft even studio lighting with no harsh shadows.\n3. Full product visibility — the garment is the VISUAL HERO of the composition.\n4. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture, colors from the reference — do NOT interpret or reimagine.\n5. Model must have natural anatomy, relaxed standing pose, natural expression.\n6. Complete outfit: add neutral complementary pieces (simple jeans/pants, basic shoes) that do NOT distract from the product.\n7. Full body or 3/4 framing, commercial e-commerce photography style.\nFORBIDDEN: Flat-lay, folded product, bare torso, underwear visible, product on surface.` },
      { id: 'catalog_clean', prompt: `TASK: Clean catalog photo — ghost mannequin technique.\nMANDATORY RULES:\n1. Product displayed using invisible/ghost mannequin technique — garment appears worn but no visible model.\n2. Pure white background, crisp even lighting from all sides, no shadows.\n3. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture from the reference — pixel-accurate reproduction.\n4. Product fills 70-80% of the frame, perfectly centered, symmetrical presentation.\n5. All product details visible: stitching, labels, hardware, seams.\n6. E-commerce ready: clean, professional, distraction-free.\nFORBIDDEN: Flat-lay, visible mannequin parts, colored background, product on table.` },
      { id: 'detail_macro', prompt: `TASK: Extreme close-up macro detail shot.\nMANDATORY RULES:\n1. Tight close-up of the product focusing on texture, stitching, fabric weave, material quality.\n2. Product MUST be the EXACT item from the reference image — same colors, pattern, materials.\n3. Shallow depth of field with the detail area in razor-sharp focus.\n4. Professional studio lighting highlighting surface texture and material characteristics.\n5. Show the craftsmanship: thread count, zipper quality, button details, fabric hand-feel.\n6. Clean neutral background, no distracting elements.\nFORBIDDEN: Full product view, flat-lay, multiple products, blurry focus area.` },
      { id: 'model_neutral', prompt: `TASK: Model wearing product — neutral catalog pose.\nMANDATORY RULES:\n1. Model wearing the EXACT product from the reference image in a natural standing pose.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture, scale from the reference — do NOT simplify or reimagine.\n3. Minimal clean background (light grey or off-white), standard catalog photography lighting.\n4. Natural relaxed expression, arms naturally at sides or one hand in pocket.\n5. Full body or 3/4 view — product must be fully visible and the visual focal point.\n6. Complete outfit with neutral complementary pieces that do NOT compete with the product.\n7. Natural human anatomy: correct proportions, realistic hands, natural skin.\nFORBIDDEN: Dramatic poses, busy backgrounds, bare torso, underwear, flat-lay.` },
    ],
  },
  social: {
    id: 'social', ratio: '3:4',
    styles: [
      { id: 'lifestyle', prompt: `TASK: Authentic lifestyle photo — UGC aesthetic.\nMANDATORY RULES:\n1. Person wearing the EXACT product from the reference image naturally in an everyday setting (café, park, apartment).\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture from the reference — no reinterpretation.\n3. Warm natural lighting, candid feel — looks like a friend took the photo with an iPhone.\n4. Natural relaxed pose, genuine smile or candid moment, not overly posed.\n5. Product is clearly visible and the focal point despite the casual setting.\n6. Complete outfit with complementary pieces that enhance but don't distract.\n7. Social media ready composition (3:4 ratio optimized for Instagram).\nFORBIDDEN: Studio lighting, stiff poses, flat-lay, bare torso, product on surface.` },
      { id: 'influencer', prompt: `TASK: Influencer-style aspirational photo.\nMANDATORY RULES:\n1. Model posing confidently wearing the EXACT product from the reference image in a trendy location.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, colors from the reference — pixel-accurate.\n3. Bright, aspirational aesthetic — clean composition, Instagram-ready golden hour or bright daylight.\n4. Confident pose: hand on hip, mid-stride, or casual lean against a wall.\n5. Product is the HERO — styled to stand out, well-lit, in sharp focus.\n6. Trendy setting: minimalist architecture, café terrace, palm-lined street, modern interior.\n7. Complete styled outfit with curated complementary pieces.\nFORBIDDEN: Flat-lay, studio background, bare torso, product on table, dark moody lighting.` },
      { id: 'street_style', prompt: `TASK: Street style fashion photography.\nMANDATORY RULES:\n1. Person walking confidently in an urban city setting wearing the EXACT product from the reference image.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, texture, colors — no creative reinterpretation.\n3. Dynamic angle — slightly low perspective, mid-stride movement, editorial street photography feel.\n4. Natural street lighting with urban bokeh background (city lights, storefronts slightly blurred).\n5. Product MUST be clearly visible and the visual anchor of the composition.\n6. Complete street-style outfit with complementary urban pieces (sneakers, accessories).\n7. Natural human anatomy, confident body language, candid energy.\nFORBIDDEN: Static pose, studio background, flat-lay, bare torso, product on surface.` },
      { id: 'casual_scene', prompt: `TASK: Casual everyday lifestyle scene.\nMANDATORY RULES:\n1. Person relaxing at a café, park bench, or cozy home setting wearing the EXACT product from the reference image.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture from the reference.\n3. Soft natural lighting, authentic relaxed mood — feels like a real candid moment.\n4. Casual relaxed pose: sitting cross-legged, holding a coffee, reading, or laughing.\n5. Product clearly visible despite the relaxed setting — it's the visual anchor.\n6. Complete casual outfit with lifestyle-appropriate complementary pieces.\n7. Warm color palette, inviting atmosphere, social media lifestyle content quality.\nFORBIDDEN: Stiff poses, studio setting, flat-lay, bare torso, product on table.` },
    ],
  },
  ads: {
    id: 'ads', ratio: '3:4',
    styles: [
      { id: 'magazine', prompt: `TASK: High-end magazine editorial photo — Vogue/Harper's Bazaar aesthetic.\nMANDATORY RULES:\n1. Model in a dramatic editorial pose wearing the EXACT product from the reference image.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, texture from the reference — flawless reproduction.\n3. Professional studio lighting with artistic directional shadows creating depth and drama.\n4. Fashion editorial composition: bold framing, strong visual hierarchy, product as the centerpiece.\n5. Model with striking confident expression, editorial body language — NOT casual.\n6. Complete haute-couture styled outfit with editorial-appropriate complementary pieces.\n7. Cinematic color grading, magazine-cover quality, aspirational luxury feel.\nFORBIDDEN: Casual poses, flat-lay, bare torso, product on surface, snapshot aesthetic.` },
      { id: 'campaign', prompt: `TASK: Fashion campaign advertising photo.\nMANDATORY RULES:\n1. Model in a powerful confident pose wearing the EXACT product from the reference image.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, colors, texture — no reinterpretation.\n3. Cinematic lighting with bold composition — the image MUST stop the scroll.\n4. High-fashion advertising aesthetic: dramatic, aspirational, campaign-quality.\n5. Product is the VISUAL HERO — perfectly lit, in sharp focus, prominently displayed.\n6. Complete styled outfit with campaign-appropriate complementary pieces.\n7. Strong color contrast, professional retouching quality, print-ad ready.\nFORBIDDEN: Casual setting, flat-lay, product on surface, bare torso, low-energy pose.` },
      { id: 'dramatic_light', prompt: `TASK: Dramatic lighting product showcase.\nMANDATORY RULES:\n1. Model wearing the EXACT product from the reference image with strong directional lighting.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, texture, colors — even in dramatic light the pattern MUST be accurate.\n3. Single strong directional light creating bold shadows and highlights on the garment.\n4. Dark moody background — the product emerges from shadow into light.\n5. High contrast commercial photography — theatrical, premium, attention-grabbing.\n6. Product texture and details enhanced by the dramatic lighting angle.\n7. Complete outfit, natural anatomy, confident pose facing the light source.\nFORBIDDEN: Flat lighting, flat-lay, product on surface, bare torso, washed-out exposure.` },
      { id: 'bold_background', prompt: `TASK: Bold vibrant background — pop-art advertising style.\nMANDATORY RULES:\n1. Model wearing the EXACT product from the reference image against a striking solid-colored background.\n2. PATTERN FIDELITY: Reproduce the EXACT fabric pattern, print, colors from the reference.\n3. Vibrant contrasting background color that makes the product POP — bold red, electric blue, sunshine yellow, or hot pink.\n4. Clean composition with strong color contrast between product and background.\n5. Modern advertising aesthetic — eye-catching, scroll-stopping, Instagram-ad ready.\n6. Even studio lighting ensuring product colors are accurate despite bold background.\n7. Complete outfit, confident energetic pose, natural anatomy.\nFORBIDDEN: Neutral backgrounds, flat-lay, product on surface, bare torso, muted colors.` },
    ],
  },
};

const PRODUCT_PACKS: Record<string, PackDef> = {
  ecommerce: {
    id: 'ecommerce', ratio: '1:1',
    styles: [
      { id: 'hero_packshot', prompt: `TASK: Premium hero packshot — ultra-realistic studio product photography.\nMANDATORY RULES:\n1. Product from the reference image is the ONLY object — exact proportions preserved, no stretching or warping.\n2. Pure white seamless background with soft professional studio lighting from multiple angles.\n3. Product standing upright or elegantly floating with soft grounded shadow for natural anchoring.\n4. Cinematic shallow depth of field subtly drawing the eye to the product center.\n5. Natural lens perspective — shot looks like a real photo from a Canon/Sony professional camera.\n6. Exact product colors, branding, labels, and surface details preserved from the reference.\n7. Premium commercial feel: clean, luxurious, hero-image quality for a product landing page.\nFORBIDDEN: Multiple products, text overlays, watermarks, AI artifacts, distorted geometry, CGI look.` },
      { id: 'angle_variation', prompt: `TASK: Dynamic 3/4 angle product shot — premium catalog photography.\nMANDATORY RULES:\n1. Product from the reference image shot from a 3/4 elevated angle showing depth and dimension.\n2. Exact geometric proportions preserved — no distortion from the angle change.\n3. Clean white or light grey background, soft even studio lighting revealing form and contours.\n4. Cinematic depth of field with the product in crisp focus, background gently falling off.\n5. Soft grounded shadow adding realism and spatial anchoring.\n6. All branding, labels, textures, and surface details from the reference accurately preserved.\n7. Professional product catalog quality — ready for e-commerce listing.\nFORBIDDEN: Flat top-down view, multiple products, CGI aesthetic, harsh shadows, distorted proportions.` },
      { id: 'detail_macro', prompt: `TASK: Ultra-close macro detail shot — material and craftsmanship showcase.\nMANDATORY RULES:\n1. Extreme close-up of the product from the reference image — focus on material quality, finish, texture.\n2. Razor-sharp focus on the detail area with beautiful bokeh falloff on surrounding areas.\n3. Professional macro lighting revealing surface characteristics: grain, sheen, matte finish, metallic details.\n4. Exact product colors, material finish, and surface texture from the reference.\n5. Studio environment — clean, distraction-free, the detail IS the subject.\n6. Premium feel: this shot should communicate quality and craftsmanship.\nFORBIDDEN: Full product view, multiple products, flat lighting, blurry focus area, CGI look.` },
      { id: 'scale_context', prompt: `TASK: Product in context — scale and usage demonstration.\nMANDATORY RULES:\n1. Product from the reference image shown being held in a hand or placed next to a common reference object for scale.\n2. Exact product proportions, colors, branding, and details preserved from the reference.\n3. Clean natural setting with soft warm lighting — feels authentic and trustworthy.\n4. Shallow depth of field keeping the product in sharp focus, context elements slightly soft.\n5. Natural skin tones if hands are shown — realistic, not plastic or AI-looking.\n6. The composition helps the customer understand the actual physical size of the product.\n7. Ultra-realistic photography — looks like a real lifestyle product photo.\nFORBIDDEN: Multiple products, cluttered scene, CGI hands, distorted proportions, studio white background.` },
    ],
  },
  social: {
    id: 'social', ratio: '3:4',
    styles: [
      { id: 'environment_scene', prompt: `TASK: Aspirational lifestyle environment — product in its natural habitat.\nMANDATORY RULES:\n1. Product from the reference image placed in a beautiful real-world setting where it would naturally be used.\n2. Exact product proportions, colors, branding preserved — the product is the HERO of the scene.\n3. Warm natural lighting creating an inviting, aspirational atmosphere (golden hour or bright natural light).\n4. Cinematic shallow depth of field — product in sharp focus, environment beautifully blurred.\n5. Scene tells a story: the viewer can imagine owning and using this product in this setting.\n6. Premium lifestyle photography quality — Instagram-worthy, aspirational, scroll-stopping.\n7. Ultra-realistic: no CGI look, natural shadows, realistic materials and reflections.\nFORBIDDEN: White studio background, multiple products, flat lighting, cluttered scene, CGI aesthetic.` },
      { id: 'hand_interaction', prompt: `TASK: Natural hand interaction — authentic UGC-style product demo.\nMANDATORY RULES:\n1. Person naturally holding, using, or demonstrating the product from the reference image.\n2. Close-up perspective showing the product being interacted with — authentic UGC feel.\n3. Exact product proportions, colors, branding, surface details preserved from the reference.\n4. Natural lighting (window light or soft daylight), casual authentic setting.\n5. Realistic hands with natural skin texture, correct finger proportions, natural nail appearance.\n6. The interaction should feel genuine — not staged or overly posed.\n7. Social media content quality — feels like a real customer sharing their purchase.\nFORBIDDEN: Studio setup, stiff posed hands, CGI/plastic hands, product floating without context, multiple products.` },
      { id: 'lifestyle_scene', prompt: `TASK: Curated lifestyle scene — aspirational daily moment.\nMANDATORY RULES:\n1. Product from the reference image as the HERO focal point in a beautifully curated setting.\n2. Aspirational daily moment: morning coffee ritual, creative workspace, cozy evening, travel moment.\n3. Exact product proportions, colors, branding preserved — product draws the eye first.\n4. Warm inviting tones, natural lighting, cinematic depth of field.\n5. Complementary props that enhance the story without competing (a cup, a book, a plant — minimal).\n6. Instagram-worthy composition: intentional framing, visual balance, premium lifestyle aesthetic.\n7. Ultra-realistic photography — no CGI, natural shadows and reflections.\nFORBIDDEN: Cluttered scene, multiple hero products, flat lighting, sterile studio look, CGI aesthetic.` },
      { id: 'flat_lay', prompt: `TASK: Aesthetic flat-lay composition — overhead product showcase.\nMANDATORY RULES:\n1. Product from the reference image as the HERO in an artful overhead flat-lay arrangement.\n2. Exact product proportions, colors, branding, surface details preserved from the reference.\n3. Clean surface (marble, light wood, or linen texture) providing subtle texture contrast.\n4. Balanced composition with 2-3 small complementary props arranged with intentional spacing.\n5. Even soft overhead lighting — no harsh shadows, even illumination across the frame.\n6. Social media content quality: Instagram-ready, aspirational, visually satisfying arrangement.\n7. Product occupies the most prominent position and largest area in the composition.\nFORBIDDEN: Cluttered arrangement, competing products, dark surfaces, harsh directional shadows, CGI look.` },
    ],
  },
  ads: {
    id: 'ads', ratio: '3:4',
    styles: [
      { id: 'floating_product', prompt: `TASK: Dynamic floating product — eye-catching advertising hero shot.\nMANDATORY RULES:\n1. Product from the reference image floating dramatically in mid-air with dynamic energy.\n2. Exact product proportions, colors, branding preserved — no distortion from the dynamic angle.\n3. Bold colored gradient background (deep blue to purple, orange to pink, or teal to emerald).\n4. Subtle motion effects: light particles, soft glow, or gentle splash elements around the product.\n5. Dramatic lighting from below or side creating depth and dimension on the product.\n6. Cinematic feel — this is a premium advertisement hero image that stops the scroll.\n7. Soft shadow or reflection below anchoring the product despite the floating effect.\nFORBIDDEN: Multiple products, text overlays, watermarks, static flat composition, CGI-plastic look.` },
      { id: 'bold_background', prompt: `TASK: Bold vibrant background — pop-art commercial photography.\nMANDATORY RULES:\n1. Product from the reference image on a bold, vibrant solid-colored background.\n2. Exact product proportions, colors, branding, surface details preserved from the reference.\n3. Strong color contrast between product and background — choose a complementary color that makes it POP.\n4. Clean minimal composition — product is the ONLY subject, centered with breathing room.\n5. Professional studio lighting ensuring product colors read accurately against the bold background.\n6. Modern advertising aesthetic — eye-catching, confident, social-ad ready.\n7. Soft grounded shadow for realism despite the bold artistic background.\nFORBIDDEN: Multiple products, busy patterns on background, text, muted colors, cluttered composition.` },
      { id: 'motion_scene', prompt: `TASK: High-energy motion scene — dynamic advertising photography.\nMANDATORY RULES:\n1. Product from the reference image in a dynamic scene with motion and energy.\n2. Exact product proportions, colors, branding preserved — product integrity is paramount.\n3. Dynamic elements: water splashes, powder explosions, light streaks, or particle effects surrounding the product.\n4. High-energy cinematic feel — dramatic lighting, bold composition, attention-grabbing.\n5. Product remains in razor-sharp focus while motion elements have natural motion blur.\n6. Dark or gradient background making the product and effects POP.\n7. Premium advertising quality — this image should make someone stop scrolling and look.\nFORBIDDEN: Static composition, multiple products, text overlays, product obscured by effects, CGI-plastic look.` },
      { id: 'dramatic_spotlight', prompt: `TASK: Dramatic spotlight — luxury product photography.\nMANDATORY RULES:\n1. Product from the reference image under a single dramatic spotlight against a dark background.\n2. Exact product proportions, colors, branding, surface details preserved from the reference.\n3. Strong directional light from above creating a pool of light around the product.\n4. Dark moody background (deep black or very dark grey) — the product EMERGES from darkness.\n5. High contrast revealing product texture, material quality, and premium details.\n6. Luxury advertising feel — premium, exclusive, desirable.\n7. Subtle reflection on a dark glossy surface below the product for added depth.\nFORBIDDEN: Flat even lighting, white background, multiple products, text, cluttered scene, CGI aesthetic.` },
    ],
  },
};

function getPackDef(isFashion: boolean, packId: string): PackDef | null {
  const packs = isFashion ? FASHION_PACKS : PRODUCT_PACKS;
  return packs[packId] || null;
}

function buildPackPrompt(pack: PackDef, isFashion: boolean): string {
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

// ── Shopify integration handler (inline to avoid import issues) ──

async function handleShopifyEndpoint(
  supabase: any, userId: string, apiKeyId: string, endpoint: string, body: any, ip: string
): Promise<any> {
  function sanitizeDomain(domain: string): string | null {
    if (!domain || typeof domain !== 'string') return null
    let c = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (c.length < 4 || c.length > 255 || !/^[a-z0-9][a-z0-9\-\.]*[a-z0-9]$/.test(c)) return null
    return c
  }

  async function audit(connId: string|null, action: string, oldS: string|null, newS: string|null, meta: any = {}) {
    await supabase.from('shopify_connection_audit_log').insert({
      connection_id: connId, user_id: userId, action, old_status: oldS, new_status: newS, metadata: meta, ip_address: ip
    })
  }

  if (endpoint === '/v1/shopify/connect') {
    const { shopDomain, shopName, shopifyStoreId, externalConnectionId, webhookUrl, metadata } = body
    if (!shopDomain || !externalConnectionId) return { error: 'shopDomain and externalConnectionId are required', code: 'VALIDATION_ERROR' }
    const clean = sanitizeDomain(shopDomain)
    if (!clean) return { error: 'Invalid shop domain format', code: 'VALIDATION_ERROR' }
    if (webhookUrl && !webhookUrl.startsWith('https://')) return { error: 'Webhook URL must use HTTPS', code: 'VALIDATION_ERROR' }

    // Check cross-account collision
    const { data: byConn } = await supabase.from('shopify_store_connections').select('id, user_id').eq('connection_id', externalConnectionId).single()
    if (byConn && byConn.user_id !== userId) return { error: 'This store is already connected to another ProduktPix account', code: 'CONFLICT' }

    const { data: byDomain } = await supabase.from('shopify_store_connections').select('id, connection_status').eq('user_id', userId).eq('shop_domain', clean).single()
    const secret = crypto.randomUUID() + '-' + crypto.randomUUID()
    const now = new Date().toISOString()

    if (byDomain) {
      const old = byDomain.connection_status
      const { data: u } = await supabase.from('shopify_store_connections').update({
        connection_id: externalConnectionId, shop_name: shopName||null, shopify_store_id: shopifyStoreId||null,
        api_key_id: apiKeyId, connection_source: metadata?.source||'shopify_app', connection_status: 'connected',
        is_connected: true, is_verified: false, webhook_url: webhookUrl||null, webhook_secret: secret,
        metadata: metadata||{}, last_error: null, connected_at: now, disconnected_at: null, verified_at: null,
      }).eq('id', byDomain.id).select('id, shop_domain, shop_name, connected_at').single()
      await audit(u.id, 'reconnected', old, 'connected', { shopDomain: clean })
      return { success: true, connectionId: u.id, shopifyConnected: true, shopifyVerified: false, shopifyConnectionStatus: 'connected', shopifyStoreDomain: u.shop_domain, shopifyStoreName: u.shop_name, connectedAt: u.connected_at, verifiedAt: null, webhookSecret: secret, message: 'Store reconnected. Call /v1/shopify/verify to complete verification.' }
    }

    const { data: n, error: ie } = await supabase.from('shopify_store_connections').insert({
      user_id: userId, api_key_id: apiKeyId, provider: 'shopify', shop_domain: clean, shop_name: shopName||null,
      shopify_store_id: shopifyStoreId||null, connection_id: externalConnectionId, connection_source: metadata?.source||'shopify_app',
      connection_status: 'connected', is_connected: true, is_verified: false, webhook_url: webhookUrl||null,
      webhook_secret: secret, metadata: metadata||{}, connected_at: now,
    }).select('id, shop_domain, shop_name, connected_at').single()
    if (ie) return { error: 'Failed to create connection: ' + ie.message, code: 'INTERNAL_ERROR' }
    await audit(n.id, 'connected', null, 'connected', { shopDomain: clean })
    return { success: true, connectionId: n.id, shopifyConnected: true, shopifyVerified: false, shopifyConnectionStatus: 'connected', shopifyStoreDomain: n.shop_domain, shopifyStoreName: n.shop_name, connectedAt: n.connected_at, verifiedAt: null, webhookSecret: secret, message: 'Store connected. Call /v1/shopify/verify to complete verification.' }
  }

  if (endpoint === '/v1/shopify/verify') {
    const { connectionId, shopDomain } = body
    if (!connectionId && !shopDomain) return { error: 'connectionId or shopDomain is required', code: 'VALIDATION_ERROR' }
    let q = supabase.from('shopify_store_connections').select('*').eq('user_id', userId)
    if (connectionId) q = q.eq('id', connectionId)
    else { const c = sanitizeDomain(shopDomain); if (!c) return { error: 'Invalid domain', code: 'VALIDATION_ERROR' }; q = q.eq('shop_domain', c) }
    const { data: conn } = await q.single()
    if (!conn) return { error: 'Connection not found', code: 'NOT_FOUND' }
    if (conn.connection_status === 'revoked') return { error: 'Connection revoked. Reconnect first.', code: 'CONNECTION_REVOKED' }
    if (conn.is_verified) return { success: true, connectionId: conn.id, shopifyConnected: true, shopifyVerified: true, shopifyConnectionStatus: 'verified', shopifyStoreDomain: conn.shop_domain, verifiedAt: conn.verified_at, message: 'Already verified.' }
    const now = new Date().toISOString()
    await supabase.from('shopify_store_connections').update({ connection_status: 'verified', is_verified: true, verified_at: now, last_error: null }).eq('id', conn.id)
    await audit(conn.id, 'verified', conn.connection_status, 'verified', { shopDomain: conn.shop_domain })
    return { success: true, connectionId: conn.id, shopifyConnected: true, shopifyVerified: true, shopifyConnectionStatus: 'verified', shopifyStoreDomain: conn.shop_domain, shopifyStoreName: conn.shop_name, connectedAt: conn.connected_at, verifiedAt: now, message: 'Store verified successfully.' }
  }

  if (endpoint === '/v1/shopify/status') {
    const { connectionId: cid, shopDomain: sd } = body || {}
    const fmt = (c: any) => ({
      connectionId: c.id, shopifyConnected: c.is_connected, shopifyVerified: c.is_verified, shopifyStoreDomain: c.shop_domain,
      shopifyStoreName: c.shop_name, shopifyStoreId: c.shopify_store_id, shopifyConnectionId: c.connection_id,
      shopifyConnectionSource: c.connection_source, shopifyConnectionStatus: c.connection_status,
      shopifyWebhookUrl: c.webhook_url, shopifyWebhookConfigured: !!c.webhook_url, shopifyMetadata: c.metadata,
      shopifyConnectionError: c.last_error, shopifyConnectedAt: c.connected_at, shopifyVerifiedAt: c.verified_at,
      shopifyDisconnectedAt: c.disconnected_at, shopifyLastSyncAt: c.last_sync_at, createdAt: c.created_at,
    })
    const cols = 'id, shop_domain, shop_name, shopify_store_id, connection_id, connection_source, connection_status, is_connected, is_verified, webhook_url, metadata, last_error, created_at, connected_at, verified_at, disconnected_at, last_sync_at'
    if (cid) { const { data } = await supabase.from('shopify_store_connections').select(cols).eq('id', cid).eq('user_id', userId).single(); if (!data) return { error: 'Not found', code: 'NOT_FOUND' }; return fmt(data) }
    if (sd) { const c = sanitizeDomain(sd); if (!c) return { error: 'Invalid domain', code: 'VALIDATION_ERROR' }; const { data } = await supabase.from('shopify_store_connections').select(cols).eq('shop_domain', c).eq('user_id', userId).single(); if (!data) return { error: 'Not found', code: 'NOT_FOUND' }; return fmt(data) }
    const { data } = await supabase.from('shopify_store_connections').select(cols).eq('user_id', userId).neq('connection_status', 'disconnected').order('created_at', { ascending: false })
    return { connections: (data||[]).map(fmt), total: data?.length||0 }
  }

  if (endpoint === '/v1/shopify/disconnect') {
    const { connectionId: cid, shopDomain: sd } = body
    if (!cid && !sd) return { error: 'connectionId or shopDomain required', code: 'VALIDATION_ERROR' }
    let q = supabase.from('shopify_store_connections').select('id, connection_status, shop_domain').eq('user_id', userId)
    if (cid) q = q.eq('id', cid); else { const c = sanitizeDomain(sd); if (!c) return { error: 'Invalid domain', code: 'VALIDATION_ERROR' }; q = q.eq('shop_domain', c) }
    const { data: conn } = await q.single()
    if (!conn) return { error: 'Not found', code: 'NOT_FOUND' }
    await supabase.from('shopify_store_connections').update({ connection_status: 'revoked', is_connected: false, is_verified: false, webhook_url: null, webhook_secret: null, disconnected_at: new Date().toISOString() }).eq('id', conn.id)
    await audit(conn.id, 'revoked', conn.connection_status, 'revoked', { shopDomain: conn.shop_domain })
    return { success: true, connectionId: conn.id, shopifyConnected: false, shopifyVerified: false, shopifyConnectionStatus: 'revoked', message: 'Store disconnected. Historical jobs remain linked.' }
  }

  if (endpoint === '/v1/shopify/webhook') {
    const { connectionId: cid, webhookUrl: wUrl } = body
    if (!cid) return { error: 'connectionId required', code: 'VALIDATION_ERROR' }
    if (wUrl && !wUrl.startsWith('https://')) return { error: 'Webhook URL must use HTTPS', code: 'VALIDATION_ERROR' }
    const { data: conn } = await supabase.from('shopify_store_connections').select('id, connection_status, webhook_secret').eq('id', cid).eq('user_id', userId).single()
    if (!conn) return { error: 'Not found', code: 'NOT_FOUND' }
    if (['revoked','disconnected'].includes(conn.connection_status)) return { error: 'Cannot update webhook on disconnected store', code: 'CONNECTION_INACTIVE' }
    const sec = conn.webhook_secret || (crypto.randomUUID() + '-' + crypto.randomUUID())
    await supabase.from('shopify_store_connections').update({ webhook_url: wUrl||null, webhook_secret: sec }).eq('id', conn.id)
    await audit(conn.id, 'webhook_updated', conn.connection_status, conn.connection_status, { webhookUrl: wUrl||null })
    return { success: true, connectionId: conn.id, webhookUrl: wUrl||null, webhookSecret: sec, webhookConfigured: !!wUrl, message: wUrl ? 'Webhook configured.' : 'Webhook removed.' }
  }

  if (endpoint === '/v1/shopify/platforms') {
    const { data } = await supabase.from('shopify_store_connections').select('id, provider, shop_domain, shop_name, connection_status, is_connected, is_verified, connected_at, verified_at').eq('user_id', userId).not('connection_status', 'eq', 'disconnected').order('created_at', { ascending: false })
    return { platforms: (data||[]).map((c: any) => ({ platform: c.provider, connectionId: c.id, storeDomain: c.shop_domain, storeName: c.shop_name, status: c.connection_status, isConnected: c.is_connected, isVerified: c.is_verified, connectedAt: c.connected_at, verifiedAt: c.verified_at })), total: data?.length||0 }
  }

  if (endpoint === '/v1/shopify/attach-job') {
    const { jobId, jobType, connectionId: cid, shopDomain: sd } = body
    if (!jobId || !jobType) return { error: 'jobId and jobType required', code: 'VALIDATION_ERROR' }
    if (!cid && !sd) return { error: 'connectionId or shopDomain required', code: 'VALIDATION_ERROR' }
    let cq = supabase.from('shopify_store_connections').select('id').eq('user_id', userId)
    if (cid) cq = cq.eq('id', cid); else { const c = sanitizeDomain(sd); if (!c) return { error: 'Invalid domain', code: 'VALIDATION_ERROR' }; cq = cq.eq('shop_domain', c) }
    const { data: conn } = await cq.single()
    if (!conn) return { error: 'Connection not found', code: 'NOT_FOUND' }
    const tMap: Record<string,string> = { ugc: 'image_jobs', packs: 'image_jobs', video: 'kling_jobs', fashion: 'outfit_swap_jobs', product_background: 'bulk_background_jobs' }
    const tbl = tMap[jobType]; if (!tbl) return { error: 'Invalid jobType', code: 'VALIDATION_ERROR' }
    await supabase.from(tbl).update({ shopify_connection_id: conn.id }).eq('id', jobId).eq('user_id', userId)
    return { success: true, jobId, jobType, connectionId: conn.id, message: 'Job linked to Shopify store.' }
  }

  if (endpoint === '/v1/shopify/job-context') {
    const { jobId, jobType } = body
    if (!jobId || !jobType) return { error: 'jobId and jobType required', code: 'VALIDATION_ERROR' }
    const tMap: Record<string,string> = { ugc: 'image_jobs', packs: 'image_jobs', video: 'kling_jobs', fashion: 'outfit_swap_jobs', product_background: 'bulk_background_jobs' }
    const tbl = tMap[jobType]; if (!tbl) return { error: 'Invalid jobType', code: 'VALIDATION_ERROR' }
    const { data: job } = await supabase.from(tbl).select('id, shopify_connection_id').eq('id', jobId).eq('user_id', userId).single()
    if (!job) return { error: 'Job not found', code: 'NOT_FOUND' }
    if (!job.shopify_connection_id) return { jobId, jobType, shopifyLinked: false, connection: null }
    const { data: conn } = await supabase.from('shopify_store_connections').select('id, shop_domain, shop_name, connection_status, is_verified').eq('id', job.shopify_connection_id).single()
    return { jobId, jobType, shopifyLinked: true, connection: conn ? { connectionId: conn.id, shopDomain: conn.shop_domain, shopName: conn.shop_name, status: conn.connection_status, isVerified: conn.is_verified } : null }
  }

  if (endpoint === '/v1/shopify/sync-timestamp') {
    const { connectionId: cid } = body
    if (!cid) return { error: 'connectionId required', code: 'VALIDATION_ERROR' }
    await supabase.from('shopify_store_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', cid).eq('user_id', userId)
    return { success: true, message: 'Sync timestamp updated.' }
  }

  return { error: 'Shopify endpoint not found', code: 'NOT_FOUND' }
}

// ── Shared helpers ──

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Upload a source image from URL into storage and source_images table.
 * Returns the source_image record (with id, public_url, etc.)
 */
async function uploadSourceImageFromUrl(supabase: any, userId: string, imageUrl: string): Promise<{ id: string; public_url: string }> {
  // Fetch the image
  const imageResponse = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL (${imageResponse.status})`)
  }

  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
  const imageBuffer = await imageResponse.arrayBuffer();

  // Determine extension
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'application/octet-stream': 'jpg',
  };
  const extension = extensionMap[contentType] || 'jpg';

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const fileName = `api-import-${timestamp}-${random}.${extension}`;
  const storagePath = `${userId}/${fileName}`;

  // Upload to storage
  const { error: storageError } = await supabase.storage
    .from('source-images')
    .upload(storagePath, imageBuffer, { contentType, upsert: false });

  if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('source-images')
    .getPublicUrl(storagePath);

  // Insert into source_images table
  const { data: dbData, error: dbError } = await supabase
    .from('source_images')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      file_name: fileName,
      file_size: imageBuffer.byteLength,
      mime_type: contentType,
    })
    .select('id, public_url')
    .single();

  if (dbError) {
    await supabase.storage.from('source-images').remove([storagePath]);
    throw new Error(`Failed to save image metadata: ${dbError.message}`);
  }

  return dbData;
}

// ── Valid settings ──
const VALID_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', 'source'];
const VALID_SIZE_TIERS = ['small', 'large'];

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Extract API key from header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const keyHash = await hashApiKey(apiKey)

    const { data: keyData, error: keyError } = await supabase
      .rpc('validate_api_key', { p_key_hash: keyHash })

    if (keyError || !keyData || keyData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKeyInfo: ApiKeyValidation = keyData[0]

    if (!apiKeyInfo.is_valid) {
      return new Response(
        JSON.stringify({ error: 'API key is inactive or expired', code: 'API_KEY_INACTIVE' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_api_key_id: apiKeyInfo.api_key_id,
        p_rate_limit_tier: apiKeyInfo.rate_limit_tier
      })

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed', code: 'RATE_LIMIT_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rateLimit: RateLimitResult = rateLimitData

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          reason: rateLimit.reason,
          retry_after: rateLimit.retry_after,
          limit: rateLimit.limit
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retry_after || 60)
          }
        }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const endpoint = body.endpoint || ''
    const method = req.method

    // Check permissions
    let requiredPermission = ''
    if (endpoint.startsWith('/v1/ugc')) {
      requiredPermission = 'ugc'
    } else if (endpoint.startsWith('/v1/video')) {
      requiredPermission = 'video'
    } else if (endpoint.startsWith('/v1/fashion')) {
      requiredPermission = 'fashion_catalog'
    } else if (endpoint.startsWith('/v1/product')) {
      requiredPermission = 'product_background'
    } else if (endpoint.startsWith('/v1/packs')) {
      requiredPermission = 'packs'
    } else if (endpoint.startsWith('/v1/catalog')) {
      requiredPermission = 'catalog'
    } else if (endpoint.startsWith('/v1/credits')) {
      requiredPermission = '' // No specific permission needed
    } else if (endpoint.startsWith('/v1/auth')) {
      requiredPermission = '' // No specific permission needed
    } else if (endpoint.startsWith('/v1/shopify')) {
      requiredPermission = '' // No specific permission needed — key auth is sufficient
    }

    if (requiredPermission && !apiKeyInfo.permissions.includes(requiredPermission)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: requiredPermission
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route to appropriate handler
    let response: any
    let statusCode = 200
    let creditsUsed = 0

    try {
      switch (endpoint) {
        case '/v1/ugc/generate':
          response = await handleUgcGenerate(supabase, supabaseUrl, supabaseServiceKey, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = body.settings?.number || 1
          break

        case '/v1/video/create':
          response = await handleVideoCreate(supabase, supabaseUrl, supabaseServiceKey, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = (body.duration === 5) ? 5 : 10
          break

        case '/v1/fashion/swap':
          response = await handleFashionSwap(supabase, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = 1
          break

        case '/v1/product/background':
          response = await handleProductBackground(supabase, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = 1
          break

        case '/v1/packs/generate':
          response = await handlePackGenerate(supabase, supabaseUrl, supabaseServiceKey, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = response?.credits_used || 4
          break

        case '/v1/catalog/generate':
          response = await handleCatalogGenerate(supabase, supabaseUrl, supabaseServiceKey, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = response?.credits_used || 4
          break

        case '/v1/credits/balance':
          response = await handleCreditsBalance(supabase, apiKeyInfo.user_id)
          break

        case '/v1/auth/verify':
          response = await handleAuthVerify(supabase, apiKeyInfo)
          break

        // Shopify integration endpoints
        case '/v1/shopify/connect':
        case '/v1/shopify/verify':
        case '/v1/shopify/status':
        case '/v1/shopify/disconnect':
        case '/v1/shopify/webhook':
        case '/v1/shopify/platforms':
        case '/v1/shopify/attach-job':
        case '/v1/shopify/job-context':
        case '/v1/shopify/sync-timestamp':
          response = await handleShopifyEndpoint(supabase, apiKeyInfo.user_id, apiKeyInfo.api_key_id, endpoint, body, req.headers.get('x-forwarded-for') || 'unknown')
          break

        default:
          // Handle job status endpoints
          if (endpoint.match(/^\/v1\/ugc\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetUgcJob(supabase, apiKeyInfo.user_id, jobId)
          } else if (endpoint.match(/^\/v1\/video\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetVideoJob(supabase, apiKeyInfo.user_id, jobId)
          } else if (endpoint.match(/^\/v1\/fashion\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetFashionJob(supabase, apiKeyInfo.user_id, jobId)
          } else if (endpoint.match(/^\/v1\/product\/background\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetProductBackgroundJob(supabase, apiKeyInfo.user_id, jobId)
          } else if (endpoint.match(/^\/v1\/packs\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetPackJob(supabase, apiKeyInfo.user_id, jobId)
          } else {
            statusCode = 404
            response = { error: 'Endpoint not found', code: 'NOT_FOUND' }
          }
      }
    } catch (handlerError) {
      console.error('Handler error:', handlerError)
      statusCode = 500
      response = { error: handlerError instanceof Error ? handlerError.message : 'Internal server error', code: 'INTERNAL_ERROR' }
    }

    // If handler returned an error code, reflect it
    if (response?.code === 'INSUFFICIENT_CREDITS') statusCode = 402
    if (response?.code === 'NOT_FOUND') statusCode = 404

    const responseTime = Date.now() - startTime

    // Log API usage
    await supabase.rpc('log_api_usage', {
      p_api_key_id: apiKeyInfo.api_key_id,
      p_user_id: apiKeyInfo.user_id,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: statusCode,
      p_credits_used: creditsUsed,
      p_request_metadata: { body_keys: Object.keys(body) },
      p_response_time_ms: responseTime,
      p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return new Response(
      JSON.stringify(response),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining-Minute': String(rateLimit.remaining_minute || 0),
          'X-RateLimit-Remaining-Hour': String(rateLimit.remaining_hour || 0),
          'X-RateLimit-Remaining-Day': String(rateLimit.remaining_day || 0),
          'X-Response-Time': `${responseTime}ms`
        }
      }
    )
  } catch (error) {
    console.error('API Gateway error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ═══════════════════════════════════════════════════════════
// HANDLER: UGC Generate — delegates to ugc-gemini-v3 createImageJob
// ═══════════════════════════════════════════════════════════

async function handleUgcGenerate(supabase: any, supabaseUrl: string, serviceKey: string, userId: string, body: any, apiKeyId: string) {
  const { source_image_url, prompt, settings = {} } = body

  if (!source_image_url) {
    throw new Error('source_image_url is required')
  }

  // Validate settings
  if (settings.aspectRatio && !VALID_ASPECT_RATIOS.includes(settings.aspectRatio)) {
    throw new Error(`Invalid aspectRatio. Must be one of: ${VALID_ASPECT_RATIOS.join(', ')}`)
  }
  if (settings.size && !VALID_SIZE_TIERS.includes(settings.size)) {
    throw new Error(`Invalid size. Must be one of: ${VALID_SIZE_TIERS.join(', ')}`)
  }

  // Step 1: Upload source image from URL into storage + source_images table
  console.log('[API-GW] Uploading source image from URL:', source_image_url)
  const sourceImage = await uploadSourceImageFromUrl(supabase, userId, source_image_url)
  console.log('[API-GW] Source image uploaded:', sourceImage.id)

  // Step 2: Call ugc-gemini-v3 createImageJob via service auth
  const jobPayload = {
    action: 'createImageJob',
    source_image_id: sourceImage.id,
    prompt: prompt || 'Professional product photography with clean background',
    settings: {
      number: settings.number || 1,
      quality: settings.quality || 'high',
      aspectRatio: settings.aspectRatio || '1:1',
      size: settings.size || 'small',
      source: 'api',
      api_key_id: apiKeyId,
    },
  }

  console.log('[API-GW] Calling ugc-gemini-v3 createImageJob')
  const geminiResponse = await fetch(`${supabaseUrl}/functions/v1/ugc-gemini-v3`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobPayload),
  })

  const geminiResult = await geminiResponse.json()
  console.log('[API-GW] ugc-gemini-v3 response:', geminiResult)

  if (geminiResult.error) {
    return { error: geminiResult.error, code: 'GENERATION_FAILED' }
  }

  return {
    job_id: geminiResult.jobId,
    status: geminiResult.status || 'queued',
    message: 'Image generation job created successfully',
    credits_used: settings.number || 1,
    source_image_id: sourceImage.id,
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER: Video Create — delegates to kling-video createVideoJob
// ═══════════════════════════════════════════════════════════

async function handleVideoCreate(supabase: any, supabaseUrl: string, serviceKey: string, userId: string, body: any, apiKeyId: string) {
  const { source_image_url, prompt, duration = 5 } = body

  if (!source_image_url) {
    throw new Error('source_image_url is required')
  }

  // Upload source image
  console.log('[API-GW] Uploading source image for video')
  const sourceImage = await uploadSourceImageFromUrl(supabase, userId, source_image_url)

  // Call kling-video createVideoJob
  // Note: kling-video uses user auth and checks it, so we need to create the job directly
  // since service key auth won't pass getUser(). We'll insert the job directly.
  const creditCost = Number(duration) === 10 ? 10 : 5

  // Deduct credits
  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: 'api_video_generation'
    })

  if (deductError || !deductResult?.success) {
    return {
      error: deductResult?.error || 'Failed to deduct credits',
      code: 'INSUFFICIENT_CREDITS'
    }
  }

  // Create kling job record directly (same as kling-video createVideoJob does)
  const { data: job, error: jobError } = await supabase
    .from('kling_jobs')
    .insert({
      user_id: userId,
      prompt: prompt || 'Gentle camera movement',
      image_url: sourceImage.public_url,
      source_image_id: sourceImage.id,
      duration: duration,
      status: 'queued',
      model: 'kling-v2',
      metadata: { source: 'api', api_key_id: apiKeyId }
    })
    .select()
    .single()

  if (jobError) {
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: 'api_video_job_creation_failed'
    })
    throw jobError
  }

  // Trigger the video processing (fire and forget)
  fetch(`${supabaseUrl}/functions/v1/kling-video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'processVideoJob',
      jobId: job.id
    })
  }).catch(console.error)

  return {
    job_id: job.id,
    status: 'queued',
    message: 'Video generation job created successfully',
    credits_used: creditCost
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER: Fashion Swap
// ═══════════════════════════════════════════════════════════

async function handleFashionSwap(supabase: any, userId: string, body: any, apiKeyId?: string) {
  const { garment_image_url, base_model_id, settings = {} } = body

  if (!garment_image_url) throw new Error('garment_image_url is required')
  if (!base_model_id) throw new Error('base_model_id is required')

  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_credits', { p_user_id: userId, p_amount: 1, p_reason: 'api_fashion_swap' })

  if (deductError || !deductResult?.success) {
    return { error: deductResult?.error || 'Failed to deduct credits', code: 'INSUFFICIENT_CREDITS' }
  }

  const { data: job, error: jobError } = await supabase
    .from('outfit_swap_jobs')
    .insert({
      user_id: userId,
      base_model_id: base_model_id,
      status: 'queued',
      metadata: { source: 'api', api_key_id: apiKeyId, garment_url: garment_image_url },
      settings: settings
    })
    .select()
    .single()

  if (jobError) {
    await supabase.rpc('refund_user_credits', { p_user_id: userId, p_amount: 1, p_reason: 'api_fashion_job_creation_failed' })
    throw jobError
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  fetch(`${supabaseUrl}/functions/v1/outfit-swap`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'processJob', jobId: job.id, garmentUrl: garment_image_url, baseModelId: base_model_id, settings })
  }).catch(console.error)

  return { job_id: job.id, status: 'queued', message: 'Fashion catalog swap job created successfully', credits_used: 1 }
}

// ═══════════════════════════════════════════════════════════
// HANDLER: Product Background
// ═══════════════════════════════════════════════════════════

async function handleProductBackground(supabase: any, userId: string, body: any, apiKeyId?: string) {
  const { source_image_url, background_preset_id, background_image_url, settings = {} } = body

  if (!source_image_url) throw new Error('source_image_url is required')
  if (!background_preset_id && !background_image_url) throw new Error('Either background_preset_id or background_image_url is required')

  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_credits', { p_user_id: userId, p_amount: 1, p_reason: 'api_product_background' })

  if (deductError || !deductResult?.success) {
    return { error: deductResult?.error || 'Failed to deduct credits', code: 'INSUFFICIENT_CREDITS' }
  }

  const backgroundType = background_preset_id ? 'preset' : 'custom'
  const { data: job, error: jobError } = await supabase
    .from('bulk_background_jobs')
    .insert({
      user_id: userId,
      background_type: backgroundType,
      background_preset_id: background_preset_id || null,
      background_image_url: background_image_url || null,
      total_images: 1,
      status: 'queued',
      settings: { ...settings, source: 'api', api_key_id: apiKeyId }
    })
    .select()
    .single()

  if (jobError) {
    await supabase.rpc('refund_user_credits', { p_user_id: userId, p_amount: 1, p_reason: 'api_product_bg_job_creation_failed' })
    throw jobError
  }

  await supabase.from('bulk_background_results').insert({
    job_id: job.id,
    user_id: userId,
    source_image_url: source_image_url,
    image_index: 0,
    status: 'pending'
  })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  fetch(`${supabaseUrl}/functions/v1/bulk-background`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'processJob', jobId: job.id })
  }).catch(console.error)

  return { job_id: job.id, status: 'queued', message: 'Product background swap job created successfully', credits_used: 1 }
}

// ═══════════════════════════════════════════════════════════
// HANDLER: Pack Generate — uses onboarding pack prompts
// ═══════════════════════════════════════════════════════════

async function handlePackGenerate(supabase: any, supabaseUrl: string, serviceKey: string, userId: string, body: any, apiKeyId: string) {
  const { source_image_url, pack_id, product_type } = body

  if (!source_image_url) throw new Error('source_image_url is required')
  if (!pack_id || !['ecommerce', 'social', 'ads'].includes(pack_id)) {
    throw new Error('pack_id is required and must be one of: ecommerce, social, ads')
  }
  if (!product_type || !['fashion', 'product'].includes(product_type)) {
    throw new Error('product_type is required and must be one of: fashion, product')
  }

  const isFashion = product_type === 'fashion'
  const pack = getPackDef(isFashion, pack_id)
  if (!pack) throw new Error(`Pack "${pack_id}" not found for product type "${product_type}"`)

  const numberOfImages = pack.styles.length // 4 images per pack
  const prompt = buildPackPrompt(pack, isFashion)

  // Upload source image
  console.log('[API-GW] Uploading source image for pack generation')
  const sourceImage = await uploadSourceImageFromUrl(supabase, userId, source_image_url)
  console.log('[API-GW] Source image uploaded:', sourceImage.id)

  // Create job via ugc-gemini-v3 with pack settings
  const jobPayload = {
    action: 'createImageJob',
    source_image_id: sourceImage.id,
    prompt,
    settings: {
      number: numberOfImages,
      quality: 'high',
      aspectRatio: pack.ratio,
      size: 'small',
      source: 'api',
      api_key_id: apiKeyId,
      pack_id: pack_id,
      product_type: product_type,
    },
  }

  console.log('[API-GW] Calling ugc-gemini-v3 createImageJob for pack')
  const geminiResponse = await fetch(`${supabaseUrl}/functions/v1/ugc-gemini-v3`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobPayload),
  })

  const geminiResult = await geminiResponse.json()
  console.log('[API-GW] ugc-gemini-v3 pack response:', geminiResult)

  if (geminiResult.error) {
    return { error: geminiResult.error, code: 'GENERATION_FAILED' }
  }

  return {
    job_id: geminiResult.jobId,
    status: geminiResult.status || 'queued',
    pack: pack_id,
    product_type,
    styles: pack.styles.map(s => s.id),
    message: 'Pack generation job created successfully',
    credits_used: numberOfImages,
    source_image_id: sourceImage.id,
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER: Credits Balance
// ═══════════════════════════════════════════════════════════

async function handleCreditsBalance(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('subscribers')
    .select('credits_balance, subscription_tier')
    .eq('user_id', userId)
    .single()

  if (error) throw error

  return {
    credits_balance: data?.credits_balance || 0,
    subscription_tier: data?.subscription_tier || 'Free'
  }
}

// ═══════════════════════════════════════════════════════════
// JOB STATUS HANDLERS
// ═══════════════════════════════════════════════════════════

async function handleGetUgcJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('image_jobs')
    .select('id, status, progress, total, completed, failed, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) return { error: 'Job not found', code: 'NOT_FOUND' }

  let images: any[] = []
  if (job.status === 'completed' || job.completed > 0) {
    const { data: ugcImages } = await supabase
      .from('ugc_images')
      .select('id, public_url, created_at, meta')
      .eq('job_id', jobId)

    images = ugcImages || []
  }

  return {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    images: images.map(img => ({
      id: img.id,
      url: img.public_url,
      created_at: img.created_at,
    }))
  }
}

async function handleGetVideoJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('kling_jobs')
    .select('id, status, video_url, video_duration, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) return { error: 'Job not found', code: 'NOT_FOUND' }

  return {
    job_id: job.id,
    status: job.status,
    video_url: job.video_url,
    video_duration: job.video_duration,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at
  }
}

async function handleGetFashionJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('outfit_swap_jobs')
    .select('id, status, progress, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) return { error: 'Job not found', code: 'NOT_FOUND' }

  let results: any[] = []
  if (job.status === 'completed') {
    const { data: swapResults } = await supabase
      .from('outfit_swap_results')
      .select('id, public_url, created_at')
      .eq('job_id', jobId)
    results = swapResults || []
  }

  return {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    results: results.map(r => ({ id: r.id, url: r.public_url, created_at: r.created_at }))
  }
}

async function handleGetProductBackgroundJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('bulk_background_jobs')
    .select('id, status, progress, completed_images, failed_images, total_images, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) return { error: 'Job not found', code: 'NOT_FOUND' }

  let results: any[] = []
  if (job.status === 'completed' || job.completed_images > 0) {
    const { data: bgResults } = await supabase
      .from('bulk_background_results')
      .select('id, result_url, source_image_url, status, created_at')
      .eq('job_id', jobId)
    results = bgResults || []
  }

  return {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    completed: job.completed_images,
    failed: job.failed_images,
    total: job.total_images,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    results: results.map(r => ({
      id: r.id,
      result_url: r.result_url,
      source_url: r.source_image_url,
      status: r.status,
      created_at: r.created_at
    }))
  }
}

async function handleGetPackJob(supabase: any, userId: string, jobId: string) {
  // Pack jobs are stored as image_jobs — same as UGC but with pack metadata in settings
  const { data: job, error } = await supabase
    .from('image_jobs')
    .select('id, status, progress, total, completed, failed, error, created_at, finished_at, settings')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) return { error: 'Job not found', code: 'NOT_FOUND' }

  let images: any[] = []
  if (job.status === 'completed' || job.completed > 0) {
    const { data: ugcImages } = await supabase
      .from('ugc_images')
      .select('id, public_url, created_at')
      .eq('job_id', jobId)
    images = ugcImages || []
  }

  return {
    job_id: job.id,
    status: job.status,
    pack: job.settings?.pack_id || null,
    product_type: job.settings?.product_type || null,
    progress: job.progress,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    images: images.map(img => ({
      id: img.id,
      url: img.public_url,
      created_at: img.created_at,
    }))
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER: Auth Verify — validate API key and return account info
// ═══════════════════════════════════════════════════════════

async function handleAuthVerify(supabase: any, apiKeyInfo: ApiKeyValidation) {
  const { data } = await supabase
    .from('subscribers')
    .select('credits_balance, subscription_tier')
    .eq('user_id', apiKeyInfo.user_id)
    .single()

  return {
    authenticated: true,
    user_id: apiKeyInfo.user_id,
    permissions: apiKeyInfo.permissions,
    rate_limit_tier: apiKeyInfo.rate_limit_tier,
    credits_balance: data?.credits_balance ?? 0,
    subscription_tier: data?.subscription_tier ?? 'Free',
  }
}
