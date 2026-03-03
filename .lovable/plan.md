

# Update 3MESES Promotion Code ID

## Change

Single line update in `supabase/functions/create-checkout/index.ts` line 116:

Replace the old promotion code ID with the new unrestricted one:

```typescript
promotionCodeId = 'promo_1T6h1JCdNWwdXCd81janpcy5';
```

Then redeploy the `create-checkout` edge function.

