

## Fix Photoshoot RLS Policies for Regular Users

### Problem

The `outfit_swap_photoshoots` table currently has RLS enabled but **only allows access for admins and service role**:

| Current Policy | Command | Effect |
|----------------|---------|--------|
| Admins can do everything on photoshoots | ALL | Only admins can access |
| Service role can manage photoshoots | ALL | Only service role can access |

**Result**: Regular authenticated users cannot:
- View their own photoshoot progress/results
- Receive realtime updates for their photoshoots
- The feature appears broken for non-admin users

---

### Solution

Add user-scoped RLS policies allowing authenticated users to manage their own photoshoot records.

---

### Database Migration

```sql
-- Allow authenticated users to SELECT their own photoshoots
CREATE POLICY "Users can view own photoshoots"
ON public.outfit_swap_photoshoots
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow authenticated users to INSERT their own photoshoots
CREATE POLICY "Users can insert own photoshoots"
ON public.outfit_swap_photoshoots
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to UPDATE their own photoshoots
CREATE POLICY "Users can update own photoshoots"
ON public.outfit_swap_photoshoots
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

### Policy Summary After Fix

| Policy | Command | Who Can Access |
|--------|---------|----------------|
| Admins can do everything on photoshoots | ALL | Admins |
| Service role can manage photoshoots | ALL | Service role (edge functions) |
| **Users can view own photoshoots** | SELECT | Authenticated users (own records) |
| **Users can insert own photoshoots** | INSERT | Authenticated users (own records) |
| **Users can update own photoshoots** | UPDATE | Authenticated users (own records) |

---

### Expected Impact

- Users can now see their photoshoot progress in `PhotoshootModal`
- Realtime subscriptions in `photoshoot-api.ts` will receive updates
- The photoshoot feature becomes fully functional for all authenticated users

---

### No Code Changes Required

The frontend code (`PhotoshootModal.tsx`, `photoshoot-api.ts`, `BatchSwapPreview.tsx`) is already correctly implemented. Only the database RLS policies are missing.

