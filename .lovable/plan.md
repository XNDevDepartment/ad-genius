

## Disable Shopify Sidebar Item with "Soon" Badge

### Changes in `src/components/AppSidebar.tsx`

1. Add a `disabled` and `comingSoon` flag to the Shopify item in `contentNavItems`:
   ```ts
   { id: "shopify", icon: Store, path: "/shopify/products", disabled: true, comingSoon: true },
   ```

2. Update the type definition for `contentNavItems` to include `disabled?: boolean` and `comingSoon?: boolean`.

3. In the render loop (~line 201-227), when `item.disabled` is true:
   - Replace the `NavLink` with a `div` (or `span`) so it's not clickable/navigable
   - Apply `opacity-50 cursor-not-allowed` styling
   - Render a small "Soon" badge (e.g., `<span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full">Soon</span>`) next to the label when `!isCollapsed && item.comingSoon`

This is a small, self-contained change in one file.

