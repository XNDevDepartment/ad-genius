

## Pricing Page Review & Enhancement Plan

### Current Status Analysis

#### What's Correct
| Element | Status |
|---------|--------|
| Three plans displayed (Starter €29, Plus €49, Pro €99) | ✅ Correct |
| Monthly/Yearly toggle | ✅ Working |
| Credits per plan (80, 200, 400) | ✅ Correct |
| Yearly prices (€24.17, €40.83, €82.50 per month) | ✅ Correct |
| "Save 2 months" badge on yearly toggle | ✅ Correct |
| Video generation badge on Starter/Plus/Pro | ✅ Correct |
| Comparison table | ✅ Correct |
| FAQ section | ✅ Correct |
| i18n translations (PT, EN, DE, FR, ES) | ✅ Present |

#### What's Missing (User Request)
| Element | Status |
|---------|--------|
| **Price per image indicator** | ❌ Missing - This is the main request |
| Dynamic calculation based on monthly/yearly toggle | ❌ Not implemented |

#### What Could Be Improved (Conversion Optimization)
| Element | Recommendation |
|---------|----------------|
| Christmas promo banner | Should be removed |
| Price per image is a strong value proposition | Should be prominently displayed |
| Social proof elements | Could add customer count or testimonials |

---

### Implementation Plan

#### 1. Add Price Per Image Calculation Function

Create a helper function inside the Pricing component that calculates the cost per image:

```text
Formula for MONTHLY:
  pricePerImage = monthlyPrice / credits

Formula for YEARLY:
  totalPrice = yearlyPrice * 10 (pay for 10 months)
  totalCredits = credits * 12 (get 12 months of credits)
  pricePerImage = totalPrice / totalCredits
```

**Calculations:**

| Plan | Monthly | Yearly |
|------|---------|--------|
| Starter (€29, 80 credits) | €29 ÷ 80 = €0.36/image | (€29 × 10) ÷ (80 × 12) = €0.30/image |
| Plus (€49, 200 credits) | €49 ÷ 200 = €0.25/image | (€49 × 10) ÷ (200 × 12) = €0.20/image |
| Pro (€99, 400 credits) | €99 ÷ 400 = €0.25/image | (€99 × 10) ÷ (400 × 12) = €0.20/image |

#### 2. Update Pricing Card UI

Add a new element below the main price showing the per-image cost:

```text
Current layout:
  €29/mês
  
New layout:
  €29/mês
  (apenas €0.36 por imagem)  ← NEW ELEMENT
```

The per-image indicator will:
- Be styled in a smaller, secondary text color
- Update dynamically when toggling between monthly/yearly
- Show a subtle highlight or "from" text for yearly to emphasize savings

#### 3. Add Translation Keys

Add new i18n keys for all supported languages:

- `pricing.perImage` - "only €{{price}} per image" / "apenas €{{price}} por imagem"
- `pricing.perImageFrom` - "from €{{price}}/image" (alternative wording)

---

### Technical Changes Summary

| File | Change |
|------|--------|
| `src/pages/Pricing.tsx` | Add `calculatePricePerImage()` function and UI element |
| `src/i18n/locales/en.json` | Add `pricing.perImage` translation |
| `src/i18n/locales/pt.json` | Add `pricing.perImage` translation |
| `src/i18n/locales/de.json` | Add `pricing.perImage` translation |
| `src/i18n/locales/fr.json` | Add `pricing.perImage` translation |
| `src/i18n/locales/es.json` | Add `pricing.perImage` translation |

---

### UI Mockup

```text
┌─────────────────────────────────────┐
│             ⭐ Starter               │
│                                     │
│     €29/mês                         │
│   (apenas €0.36 por imagem)  ← NEW  │
│                                     │
│   Perfeito para pequenos negócios   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │         80 Créditos         │   │
│   └─────────────────────────────┘   │
│                                     │
│   ✓ 80 créditos por mês             │
│   ✓ Até 80 imagens                  │
│   ✓ Gere até 3 imagens...           │
│                                     │
│   [    Começar a Criar    ]         │
└─────────────────────────────────────┘
```

When yearly is selected:
```text
     €24.17/mês
     Faturado anualmente (€290/ano)
   (apenas €0.30 por imagem)  ← UPDATED VALUE
```

---

### Additional Considerations

1. **Christmas Promo Banner**: The `promoEndDate` is set to `2025-12-31` which is in the past (current date is 2026-01-29). This banner should be:
   - Removed

2. **Number Formatting**: The per-image price should use consistent decimal formatting (2 decimal places) and respect locale for number display (comma vs period).

3. **Mobile Responsiveness**: Ensure the new per-image text displays correctly on mobile devices.

