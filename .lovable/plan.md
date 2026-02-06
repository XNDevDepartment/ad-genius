

# Security Vulnerability: Bot Account Abuse Analysis

## Problem Summary

A bot operator is creating multiple accounts using disposable emails and virtual phone numbers to abuse the free video generation (Image Animator) feature. All accounts are verified and have `account_activated = true`.

---

## Evidence Found

### Suspicious Accounts (Created Today)

| Email | Phone Number | Account Activated | Credits Used |
|-------|--------------|-------------------|--------------|
| ricardo@tmpbox.net | +3584573998018 | ✅ true | 0 (depleted) |
| ricardo@tmpeml.com | +3584573998019 | ✅ true | 0 (depleted) |
| ricardo@teml.net | +447490953883 | ✅ true | 0 (depleted) |
| mischelled1@tweting.com | +447490953415 | ✅ true | 0 (depleted) |
| yoselyn7464@uorak.com | +447490955184 | ✅ true | 0 (depleted) |
| nepode2992@icubik.com | +447490955882 | ✅ true | 0 (depleted) |

### Video Jobs from Bot Accounts

- `mischelled1@tweting.com` → 1 completed video
- `yoselyn7464@uorak.com` → 1 completed video  
- `nepode2992@icubik.com` → 1 completed video

### Attack Pattern

```text
1. Create account with:
   - Disposable email (not in blocked list)
   - UK virtual phone (+44749...) or Finnish (+3584...)
   
2. Pass OTP verification → phone_verified = true

3. Profile auto-created with account_activated = TRUE (DB default)

4. Get 10 free credits → Generate 2 videos (5 credits each)

5. Repeat with new disposable email + different virtual number
```

---

## Root Causes

### Issue 1: Database Column Default

The `account_activated` column defaults to `TRUE`:

```sql
column_default: true
```

When `handle_new_user` trigger creates a profile, it doesn't set `account_activated`, so it gets the default `TRUE` value.

### Issue 2: Phone Signup Doesn't Set Activation

The `signup-with-phone` edge function creates users but doesn't set `account_activated = false`:

```typescript
// Current code (missing activation field):
.update({
  phone_number: phone_number,
  phone_verified: true,
  name: name,
})
```

### Issue 3: No Server-Side Activation Check for Videos

The `kling-video` edge function only checks:
- ✅ Subscription tier (blocks Starter)
- ✅ Credit balance
- ❌ **Does NOT check `account_activated`**

The activation check only exists client-side in `useCredits.tsx`:

```typescript
const canAccessVideos = (): boolean => {
  if (!isActivated) return false;  // Client-side only!
  // ...
}
```

### Issue 4: Missing Disposable Domains

These domains are NOT in the `domain_rules` blocked list:
- tmpbox.net
- tmpeml.com
- teml.net
- tweting.com
- uorak.com
- icubik.com

---

## Recommended Fixes

### Fix 1: Server-Side Activation Check (Critical)

Add `account_activated` check to `kling-video` edge function:

```typescript
// After subscription tier check, add:
const { data: profile } = await supabase
  .from('profiles')
  .select('account_activated')
  .eq('id', userId)
  .single();

if (profile?.account_activated === false) {
  return {
    success: false,
    error: 'Please verify your email to access video features.',
    activation_required: true
  };
}
```

### Fix 2: Phone Signup Should Set Activation False

Update `signup-with-phone` to require email activation:

```typescript
.update({
  phone_number: phone_number,
  phone_verified: true,
  name: name,
  account_activated: false,  // Require email verification
})
```

Then trigger activation email flow.

### Fix 3: Change Database Default

```sql
ALTER TABLE profiles 
ALTER COLUMN account_activated SET DEFAULT false;
```

### Fix 4: Block Disposable Email Domains

```sql
INSERT INTO domain_rules (domain, rule_type, description) VALUES
('tmpbox.net', 'blocked', 'Disposable email - abuse detected'),
('tmpeml.com', 'blocked', 'Disposable email - abuse detected'),
('teml.net', 'blocked', 'Disposable email - abuse detected'),
('tweting.com', 'blocked', 'Disposable email - abuse detected'),
('uorak.com', 'blocked', 'Disposable email - abuse detected'),
('icubik.com', 'blocked', 'Disposable email - abuse detected');
```

### Fix 5: Rate Limit Phone Numbers

Consider blocking +44749... prefix (TextNow/similar virtual numbers) or implementing:
- Delay between phone number reuse (24-48 hours)
- Block multiple accounts from same phone prefix pattern

---

## Implementation Priority

1. **Immediate**: Add server-side activation check to `kling-video` (blocks video abuse)
2. **Immediate**: Block the 6 disposable domains identified
3. **Short-term**: Change DB default to `false` and update signup flow
4. **Medium-term**: Implement virtual phone detection/blocking

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/kling-video/index.ts` | Add `account_activated` server-side check |
| `supabase/functions/signup-with-phone/index.ts` | Set `account_activated = false` |
| Database migration | Change column default to `false` |
| `domain_rules` table | Insert 6 new blocked domains |

