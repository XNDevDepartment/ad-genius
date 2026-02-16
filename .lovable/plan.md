

# Integrate Edit Request into AI Prompt

## What needs to change

The `editRequest` field is saved in job settings but the edge function's prompt builder doesn't use it. We need to:

### 1. Update the `SettingsPayload` interface (line 3-9)

Add `editRequest?: string` to the interface.

### 2. Update `buildPrompt` function (line 72-85)

Append the edit request text to the prompt when present. After the existing prompt is built, add something like:

```
if (editRequest) {
  p += `\n\nAdditional editing instructions: ${editRequest}`;
}
```

### 3. Update `processSingleResult` (line 160)

Pass the `editRequest` from `job.settings` into `buildPrompt`.

The simplest approach: extract `editRequest` from settings alongside `customPrompt` and pass it as a new parameter to `buildPrompt`.

### Files Modified
- `supabase/functions/bulk-background/index.ts` (interface, buildPrompt, processSingleResult call)

### No frontend changes needed
The frontend already sends `editRequest` in the settings payload correctly.

