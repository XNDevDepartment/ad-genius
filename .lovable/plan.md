

# Child-Safe Upload Model Processing

## Problem

The `uploadAndProcessModel` function in `supabase/functions/create-base-model/index.ts` (line 113) uses a hardcoded prompt with "seamless neutral-tone fitted bodysuit" and "barefoot" for all uploaded images. When a user uploads a photo of a child, Gemini's safety filters reject it — the same issue that was already fixed for the `generateModelWithAI` function.

## Solution

Apply the same child-safe conditional logic from `generateModelWithAI` to `uploadAndProcessModel`. Since `uploadAndProcessModel` receives `metadata.ageRange` from the upload dialog, we can detect child age ranges and swap the wardrobe instructions.

## Technical Changes

### File: `supabase/functions/create-base-model/index.ts`

In `uploadAndProcessModel` (around line 111-113), before building the prompt:

1. Add child detection using `metadata.ageRange`:
```typescript
const childAgeRanges = ['0-12 months', '1-3 years', '4-7 years', '8-12 years', '13-17 years'];
const isChild = childAgeRanges.includes(metadata?.ageRange);
```

2. Build conditional wardrobe text:
```typescript
const wardrobeText = isChild
  ? 'Simple, modest, loose-fitting plain neutral-tone cotton t-shirt, plain blue jeans, plain white sneakers. No logos or patterns.'
  : 'seamless neutral-tone fitted bodysuit (no logos/patterns), barefoot';
```

3. Replace the hardcoded wardrobe in the prompt string (line 113) with `${wardrobeText}`.

4. Redeploy `create-base-model` edge function.

One file changed, ~10 lines modified. Same pattern already proven in `generateModelWithAI`.

