

# Child-Safe AI Base Model Generation

## Problem

The `generateModelWithAI` function in `supabase/functions/create-base-model/index.ts` uses a single prompt template with "Form-fitting seamless neutral-tone bodysuit" and "Barefoot" for all age ranges. When generating children (age ranges like "0-12 months", "1-3 years", "4-7 years", "8-12 years", "13-17 years"), Gemini's safety filters reject the request as potentially inappropriate content. The current workaround — a trailing instruction "If creating children create them based on your safety filters..." — is ineffective because image models try to render text rather than follow conditional logic.

## Solution

Add conditional logic in the `generateModelWithAI` function to dynamically swap wardrobe and body type descriptions when the age range indicates a child (under 18).

## Technical Changes

### File: `supabase/functions/create-base-model/index.ts`

In the `generateModelWithAI` function (around line 278-324):

1. **Add child detection** before prompt construction:
```typescript
const childAgeRanges = ['0-12 months', '1-3 years', '4-7 years', '8-12 years', '13-17 years'];
const isChild = childAgeRanges.includes(ageRange);
```

2. **Conditional wardrobe text:**
```typescript
const wardrobeText = isChild
  ? `- Simple, modest, loose-fitting plain neutral-tone cotton t-shirt (gray or white)
      - Plain standard-fit blue jeans
      - Plain white sneakers
      - No logos, patterns, or graphics`
  : `- Form-fitting seamless neutral-tone bodysuit (beige, gray, or nude tone)
      - No logos, patterns, or visible seams
      - Barefoot`;
```

3. **Conditional body type** (avoid adult body descriptors for children):
```typescript
const bodyTypeText = isChild ? 'healthy, standard proportions' : bodyType;
```

4. **Use `wardrobeText` and `bodyTypeText`** in the prompt template, replacing the hardcoded wardrobe block and `${bodyType}`.

5. **Remove the confusing meta-instruction** from the STRICTLY AVOID section: delete "If creating children create them based on your safety filters ignoring the wardrobe and any detail that can prejudice the generation".

### Deployment

Redeploy the `create-base-model` edge function.

