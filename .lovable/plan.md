

# Replace OpenAI Assistants with OpenRouter Claude Sonnet 4

## Overview

This plan migrates the UGC scenario generation feature from OpenAI Assistants API to OpenRouter with Claude Sonnet 4. This eliminates the thread-based architecture (which required "preparing the system" on page load) in favor of a simpler, stateless API call.

## Current Architecture

```text
+----------------+     createThread     +-------------------+
|   Frontend     | ------------------> |  new-openai-chat  |
|  (React)       |                      |   Edge Function   |
+----------------+                      +-------------------+
       |                                        |
       |  converse(threadId, prompt)            v
       +------------------------------------> OpenAI
                                            Assistants API
```

**Problems with current approach:**
- Requires creating a thread before any request (slow initialization)
- Thread state management adds complexity
- OpenAI is deprecating Assistants API
- Extra round-trip on page load

## New Architecture

```text
+----------------+     generateScenarios    +-------------------+
|   Frontend     | -----------------------> | scenario-generate |
|  (React)       |   (one-shot call)        |   Edge Function   |
+----------------+                          +-------------------+
                                                    |
                                                    v
                                               OpenRouter
                                           (Claude Sonnet 4)
```

**Benefits:**
- Single API call (no thread creation needed)
- Faster response (no initialization delay)
- Simpler code (no thread state management)
- Better model (Claude Sonnet 4)

---

## Files to Create/Modify

### 1. New Edge Function: `supabase/functions/scenario-generate/index.ts`

A new stateless edge function that:
- Accepts: audience, product specs, language, optional image URL
- Calls OpenRouter API with Claude Sonnet 4
- Uses tool calling to extract structured JSON (6 scenarios)
- Returns: JSON with `{ scenarios: [...] }`

**API payload structure:**
```json
{
  "audience": "busy professionals, health-conscious adults",
  "productSpecs": "stainless steel water bottle, 500ml",
  "language": "en",
  "imageUrl": "https://..." // optional, for vision
}
```

**Response:**
```json
{
  "scenarios": [
    {
      "idea": "Morning Commute Hydration",
      "description": "...",
      "small-description": "..."
    },
    // ... 5 more
  ]
}
```

### 2. New Client Function: `src/api/scenario-api.ts`

Simple client to call the new edge function:

```typescript
export async function generateScenarios(params: {
  audience: string;
  productSpecs?: string;
  language: string;
  imageUrl?: string;
}): Promise<AIScenario[]> {
  const { data, error } = await supabase.functions.invoke('scenario-generate', {
    body: params
  });
  if (error) throw error;
  return data.scenarios;
}
```

### 3. Modify: `src/components/onboarding/OnboardingStep3.tsx`

**Remove:**
- `threadId` state
- `startConversationAPI` call in useEffect
- `converse` call with thread management

**Replace with:**
- Single `generateScenarios()` call
- No initialization needed on mount
- Call API only when user clicks "Get Scenario Ideas"

### 4. Modify: `src/pages/CreateUGCGeminiBase.tsx`

**Remove:**
- `initializeThread()` function
- `threadId` state
- useEffect that calls `initializeThread()` on mount
- Thread-based `converse()` calls

**Replace with:**
- Stateless `generateScenarios()` call in `getScenariosFromConversation()`
- No initialization on page load

### 5. Modify: `src/pages/CreateGPT.tsx`

Same changes as CreateUGCGeminiBase - remove thread management, use new API.

### 6. Update: `supabase/config.toml`

Add new function configuration:
```toml
[functions.scenario-generate]
verify_jwt = true
```

### 7. API Key Setup

The new edge function will use **OpenRouter** API. You'll need to add an `OPENROUTER_API_KEY` secret to Supabase.

---

## Technical Details

### Edge Function Implementation

```typescript
// supabase/functions/scenario-generate/index.ts

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Tool definition for structured output
const scenarioTool = {
  type: "function",
  function: {
    name: "generate_scenarios",
    description: "Generate 6 UGC scenario ideas",
    parameters: {
      type: "object",
      properties: {
        scenarios: {
          type: "array",
          items: {
            type: "object",
            properties: {
              idea: { type: "string" },
              description: { type: "string" },
              "small-description": { type: "string" }
            },
            required: ["idea", "description", "small-description"]
          }
        }
      },
      required: ["scenarios"]
    }
  }
};

// System prompt
const systemPrompt = `You are a creative UGC (User Generated Content) strategist. 
Generate 6 unique, creative UGC scenario ideas for product photography and social media content.
Each scenario should be practical, visually interesting, and tailored to the target audience.`;

// Call OpenRouter with Claude Sonnet 4
const response = await fetch(OPENROUTER_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [scenarioTool],
    tool_choice: { type: 'function', function: { name: 'generate_scenarios' } }
  })
});
```

### Frontend Changes Summary

| Component | Current | New |
|-----------|---------|-----|
| OnboardingStep3 | Creates thread on mount, then converses | Calls `generateScenarios()` directly |
| CreateUGCGeminiBase | `initializeThread()` on mount | No initialization needed |
| CreateGPT | Same as above | No initialization needed |

### What Gets Removed

1. **Thread management** - No more `threadId` state or thread creation
2. **Assistant ID** - No longer needed (prompts are inline)
3. **Conversation storage** - Optional, can keep for history if desired
4. **new-openai-chat dependency** - For scenario generation only (may still use for other features)

---

## Migration Checklist

| Step | Action |
|------|--------|
| 1 | Add `OPENROUTER_API_KEY` secret to Supabase |
| 2 | Create `supabase/functions/scenario-generate/index.ts` |
| 3 | Add function config to `supabase/config.toml` |
| 4 | Create `src/api/scenario-api.ts` client |
| 5 | Update `OnboardingStep3.tsx` to use new API |
| 6 | Update `CreateUGCGeminiBase.tsx` to use new API |
| 7 | Update `CreateGPT.tsx` to use new API |
| 8 | Deploy and test |

---

## Notes

- **Vision support**: Claude Sonnet 4 supports vision, so we can optionally pass the product image URL for better scenario suggestions (currently not used in the prompt but could be added)
- **Backward compatibility**: The old `new-openai-chat` function remains for other features that still use OpenAI Assistants
- **Rate limits**: OpenRouter has different rate limits than OpenAI; monitor usage after migration

