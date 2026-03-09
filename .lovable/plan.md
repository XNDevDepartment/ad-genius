

## Update Onboarding Offer to €9.99 One-Time + Update Promo Page

### Changes

**1. `src/components/onboarding/OnboardingResults.tsx`** — Replace the €19.99/month offer card with the €9.99 one-time offer:
- Price: €9.99 (was €29, -66%)
- Messaging: "Experimenta por €9.99 — pagamento único, sem subscrição"
- Subtitle: "35 créditos para testar todas as funcionalidades"
- Trust badges: "Pagamento único", "Sem subscrição", "Sem renovação automática"
- CTA: "Experimentar por €9.99"
- Change promoCode from `ONB1ST` to `1MES`
- "Start free" button stays as fallback

**2. `src/pages/Promo1Mes.tsx`** — Reframe the entire page around one-time payment:
- Hero: emphasize "Pagamento Único — Sem Subscrição"
- Remove all mentions of "primeiro mês", "/mês", monthly subscription language
- Update FAQ: remove "what happens after first month" and subscription cancellation questions, replace with one-time payment FAQs
- Final CTA card: "€9.99 pagamento único" instead of "€9.99/primeiro mês"
- Trust badges: "Pagamento único", "Sem renovação", "Acesso imediato"

**3. `src/i18n/locales/pt.json` + `en.json`** — Update translation keys for the new offer messaging.

No backend changes needed — the `1MES` promo code and checkout flow already work.

