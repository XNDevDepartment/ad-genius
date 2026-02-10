

# Fix Build Errors Blocking the App

## Problem

The outfit-swap module (and the entire app) is broken because of two unrelated build errors, not an issue with model creation logic itself.

## Fixes

### 1. Remove missing `ChristmasBanner` import (`src/components/AppLayout.tsx`)

The file imports `ChristmasBanner` from `./ChristmasBanner`, but that component no longer exists. Remove the import and any usage of `<ChristmasBanner />` in the JSX.

### 2. Add missing `settings` field (`supabase/functions/bulk-background/index.ts`)

At line ~801, a `BulkBackgroundJob` object is constructed without the required `settings` property. Add `settings: jobData.settings || null` to the object literal.

### 3. Re-deploy the bulk-background edge function

Deploy the corrected edge function after the fix.

## Result

Both build errors are resolved and the app compiles again, restoring the outfit-swap module and all other pages.

