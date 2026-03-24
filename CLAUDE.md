# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build (runs sitemap generation first)
npm run build:dev    # Dev mode build
npm run lint         # ESLint
npm run preview      # Preview production build
```

There is no test runner — the project uses manual testing (see `TESTING_CHECKLIST.md`).

For Supabase Edge Functions, use the Supabase CLI:
```bash
supabase functions serve <function-name>  # Local dev
supabase functions deploy <function-name> # Deploy single function
```

## Architecture Overview

**ProduktPix** is a UGC (User-Generated Content) image/video generation SaaS — a Vite + React + TypeScript SPA backed entirely by Supabase.

### Frontend

- **Routing:** React Router v6 with lazy-loaded routes via `lazyWithRetry()` (`src/utils/lazyWithRetry.ts`) — all routes defined in `src/App.tsx`
- **Server state:** TanStack React Query for all data fetching/caching
- **Global state:** React Context API only — `AuthContext` (auth + subscription + credits), `ThemeContext`, `LanguageContext`
- **UI:** shadcn-ui components in `src/components/ui/`, Tailwind CSS with HSL CSS variables for theming, Radix UI primitives, Framer Motion for animations
- **Forms:** React Hook Form + Zod validation
- **i18n:** react-i18next, 5 languages (en, pt, es, fr, de) in `src/i18n/`

### Backend

All backend logic lives in **Supabase Edge Functions** (Deno, `supabase/functions/`). There is no separate server. The frontend calls these functions directly via the Supabase client or fetch.

Key Edge Functions:
- `ugc-gemini` / `ugc-gemini-v3` — main UGC image generation (Google Gemini AI)
- `create-checkout`, `check-subscription`, `stripe-webhook` — Stripe billing
- `outfit-swap`, `outfit-creator` — clothing virtual try-on
- `bulk-background` — batch image background processing
- `kling-video` — AI video generation
- `api-gateway` — unified API entry point
- `create-base-model` — custom AI model creation

Most user-facing functions disable JWT verification (public access); admin functions require JWT. See `supabase/config.toml` for the full list and JWT settings.

### Data Layer

- **Supabase PostgreSQL** — primary database with Row-Level Security
- **TypeScript types auto-generated** at `src/integrations/supabase/types.ts` (2900+ lines) — do not edit manually
- **Supabase client** initialized at `src/integrations/supabase/client.ts`
- **Storage:** Supabase Storage + AWS S3 for generated images
- **140+ migration files** in `supabase/migrations/`

### Credit System

Users consume credits per image generation. Tiers: Free (10), Starter (80), Plus (200), Pro (400). Credit costs are tiered by resolution: 1K = 1 credit, 2K = 2 credits, 4K = 3 credits. See `src/types/credits.ts` and `src/hooks/useCredits.tsx`.

Image size/resolution mapping lives in `src/lib/aspectSizes.ts` — supports aspect ratios 1:1, 2:3, 4:5, 5:4, 21:9, and source.

### Key Integrations

- **Google Gemini** — primary image generation AI (via Edge Functions)
- **OpenAI** — assistant/chat features
- **Stripe** — subscriptions and one-time payments
- **Kling AI** — video generation
- **AWS S3** — image storage
- **Mailerlite** — email marketing
- **Shopify** — product import integration
- **Microsoft Clarity** — analytics (via `src/utils/trackingHealth.ts`)

### Path Aliases

`@/*` maps to `src/*` — use this in all imports.

### Code Splitting

Vite is configured with manual chunks: `vendor`, `ui`, `motion`, `backend`, `forms`, `utils`. Keep large dependencies in appropriate chunks.
