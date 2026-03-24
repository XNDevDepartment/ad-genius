---
name: ProduktPix Mobile Architecture Overview
description: Core mobile layout patterns, breakpoints, and component split decisions already in place
type: project
---

Mobile layout is split at the `lg` breakpoint (1024px) throughout the app. The pattern is consistent: `div.lg:hidden` for mobile, `div.hidden.lg:block` for desktop.

**AppLayout pattern (src/components/AppLayout.tsx):**
- Mobile: NavigationHeader (index only) + Outlet + BottomTabBar
- Desktop: SidebarProvider + AppSidebar + Outlet + FloatingOnboardingCard
- BottomTabBar is hidden on `/create/ugc` and `/create/ugc` routes (note: both conditions are identical — this is a bug)
- Mobile main content has `pb-20` to clear the bottom tab bar

**Navigation:**
- Mobile: BottomTabBar (fixed bottom, 5 tabs, min 44px tap targets, `safe-area-bottom`)
- Desktop: AppSidebar (shadcn Sidebar, collapsible icon variant)

**Breakpoints used:** `sm:`, `md:`, `lg:` — no custom breakpoints. Standard Tailwind. `lg` = 1024px is the primary mobile/desktop boundary.

**safe-area CSS utilities** are defined in index.css: `.safe-area-top`, `.safe-area-bottom`, `.safe-area-left`, `.safe-area-right` using CSS env() variables.

**container-responsive** class: `max-w-lg lg:max-w-6xl mx-auto` — this constrains mobile to 512px max.

**Why:** Mobile and desktop are rendered as completely separate DOM trees in AppLayout — surgical and safe for targeted mobile fixes.
