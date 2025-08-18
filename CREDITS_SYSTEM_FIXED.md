# Credits System - Fixed Implementation

## Summary of Changes

### 🔧 Database Changes (RLS & Functions)
- **Fixed RLS policies** for `credits_transactions` table to prevent unauthorized inserts
- **Added `reset_user_monthly_credits`** function for proper monthly credit resets
- **Added `refund_user_credits`** function for atomic credit refunds
- **Service role only** can insert credit transactions now

### 🔧 Edge Function Changes

#### `new-openai-chat` 
- **Server-side only credit deduction** using atomic `deduct_user_credits` RPC
- **Admin bypass** - admins no longer consume credits
- **Automatic refunds** on generation failures using `refund_user_credits` RPC
- **Proper error handling** with 402 status for insufficient credits

#### `supabase-upload`
- **JWT-based user authentication** - no longer trusts client-provided user_id
- **Secure user ID extraction** from authentication token
- **Protected against user impersonation**

### 🔧 Frontend Changes

#### `useCredits` Hook
- **Removed client-side `deductCredits`** - now server-side only
- **Compatibility layer** - still exposes deductCredits for existing components
- **Consistent credit calculations** matching server-side logic

#### `CreateUGC` Component  
- **Removed double-charging** - no client pre-deduction
- **Server error handling** - proper 402 credit error responses
- **Credit refresh** after operations to sync UI state
- **Improved UX** for insufficient credit scenarios

## Current Credit Flow

### 1. **Pre-Generation Check (Client)**
```typescript
// Light check for UX - not security boundary
if (!canGenerateImages(numImages)) {
  // Show error, suggest upgrade
  return;
}
```

### 2. **Server-Side Deduction (Edge Function)**
```typescript
// Atomic server-side deduction
const { data: deduction } = await supabase.rpc('deduct_user_credits', {
  p_user_id: user.id,
  p_amount: totalCost,
  p_reason: 'image_generation'
});

if (!deduction?.success) {
  return new Response(JSON.stringify({ 
    error: deduction?.error ?? 'Insufficient credits' 
  }), { status: 402 });
}
```

### 3. **Automatic Refund on Failure**
```typescript
} catch (err) {
  // Refund if generation fails
  if (!isAdmin && totalCost > 0) {
    await supabase.rpc('refund_user_credits', {
      p_user_id: user.id,
      p_amount: totalCost,
      p_reason: 'refund_generation_failed'
    });
  }
  throw err;
}
```

### 4. **Client Error Handling**
```typescript
} catch (error: any) {
  if (error.message?.includes('Insufficient credits')) {
    // Show credit-specific error
  } else {
    // Show general error
  }
} finally {
  await refreshCount(); // Sync credit balance
}
```

## Security Benefits

✅ **No client-side credit manipulation**  
✅ **Atomic credit operations** (no race conditions)  
✅ **Admin bypass** (unlimited generation for admins)  
✅ **JWT-verified user identity** in upload function  
✅ **Automatic refunds** on failures  
✅ **Proper RLS policies** for credit transactions  

## Cost Calculation Consistency

**Frontend (Display Only):**
```typescript
const qualityCosts = {
  'low': 1,
  'medium': 1.5, 
  'high': 2
};
```

**Backend (Authoritative):**
```sql
CASE p_quality
  WHEN 'low' THEN quality_cost := 1;
  WHEN 'medium' THEN quality_cost := 1.5;
  WHEN 'high' THEN quality_cost := 2;
  ELSE quality_cost := 2; -- default to high
END CASE;
```

## Monthly Credit Tiers

```sql
CASE p_tier
  WHEN 'Free' THEN RETURN 60;
  WHEN 'Pro' THEN RETURN 500; 
  WHEN 'Enterprise' THEN RETURN 2000;
  ELSE RETURN 60; -- default to Free
END CASE;
```

## Admin Detection

```sql
-- Server-side admin check
SELECT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = check_user_id AND role = 'admin'
);
```

---

**Result:** A robust, secure, and atomic credits system that prevents double-charging, handles failures gracefully, and provides proper admin privileges.