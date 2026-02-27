

# Redesign Photoshoot: Category Selection + Professional Poses & Angles

## Current Problem
The photoshoot auto-detects garment category from outfit swap metadata (often wrong — dress detected as BOTTOM). User has no control over what type of photoshoot they get.

## New Flow

```text
Step 1: Setup (existing) — Show front image, optional back image upload
Step 2: Category Selection (NEW) — User picks: Top, Bottom, Shoes, or Full Body
Step 3: Angles & Poses (redesigned) — Options change based on category choice
Step 4: Processing (existing)
```

## Category-Specific Angles & Poses

Each category gets a curated set of fashion-editorial options (angles + poses):

**TOP (6 options):**
- Three-Quarter Turn — 45° editorial turn showing shoulder line and drape
- Back View — Clean back shot showing construction details
- Side Profile — Silhouette shot emphasizing fit and sleeve taper
- Arms Crossed Pose — Confident pose showing how garment sits on torso
- Hand on Hip Pose — Editorial stance showing waist fit and sleeve drape
- Detail Close-Up — Texture crop from shoulders to mid-torso

**BOTTOM (6 options):**
- Front Standing — Full front view waist to feet, natural stance
- Back View — Rear view showing pocket details and seat fit
- Side Profile — Side silhouette showing thigh/knee/taper
- Walking Pose — Mid-stride showing fabric movement
- Seated Pose — Seated on stool showing knee break and drape
- Detail Close-Up — Waist/hip crop showing waistband and fabric

**FOOTWEAR (5 options):**
- Front Standing — Knee to feet, both shoes visible
- Side Profile — Full shoe silhouette, sole and heel
- Back View — Both heels visible, back construction
- Walking Pose — Mid-stride showing shoe in motion
- Cross-Legged Pose — One foot crossed showing top and sole detail

**FULL BODY (7 options):**
- Three-Quarter Turn — Classic 45° editorial turn
- Back View — Full body from behind
- Side Profile — Full silhouette
- Walking Pose — Dynamic mid-stride
- Hand on Hip Pose — Editorial fashion stance
- Over-the-Shoulder Look — Model looking back, editorial feel
- Detail Close-Up — Upper torso texture crop

## Files to Change

### 1. `src/components/PhotoshootModal.tsx`
- Add new `'category-selection'` stage between `'setup'` and `'angle-selection'`
- Replace `garmentCategory` prop with internal `selectedCategory` state
- Add category selection UI: 4 large cards (Top, Bottom, Shoes, Full Body) with icons and descriptions
- Replace `CATEGORY_ANGLES` record with new expanded options per category (angles + poses)
- Update progress flow: setup → category → angles → processing
- Remove dependency on `garmentCategory` prop entirely

### 2. `src/components/BatchSwapPreview.tsx`
- Remove `garmentCategory` from `photoshootModal` state and `PhotoshootModal` props
- The modal now handles category selection internally

### 3. `supabase/functions/outfit-swap/index.ts`
- Update `CATEGORY_ANGLES` record with new expanded angle/pose IDs per category
- Add new `ANGLE_PROMPTS` entries for new poses:
  - `arms_crossed`: Arms crossed on chest, confident editorial pose, full body, seamless grey background
  - `hand_on_hip`: One hand on hip, weight shifted, editorial stance, full body
  - `seated`: Seated on minimal stool, legs crossed or angled, showing garment drape
  - `cross_legged`: Standing with one foot crossed over, showing shoe top and sole
  - `over_shoulder`: Model looking back over shoulder, three-quarter back view
  - `lower_body_detail`: Waist to mid-thigh close-up showing waistband, fabric texture
  - `lower_body_front`: (already exists) update to full standing front
  - `lower_body_seated`: Seated showing knee break and fabric flow
- Update `validAngles` array in `createPhotoshootJob` to include all new angle IDs
- Update `CATEGORY_ANGLES` to include poses per category
- Remove auto-detection from metadata — use `selectedCategory` from params instead
- Pass `selectedCategory` from frontend via `photoshootApi.createPhotoshoot`

### 4. `src/api/photoshoot-api.ts`
- Add `selectedCategory` parameter to `createPhotoshoot` method

### 5. `src/i18n/locales/en.json` (and pt, es, fr, de)
- Add translations for category selection step labels and descriptions
- Add translations for new pose labels/descriptions

