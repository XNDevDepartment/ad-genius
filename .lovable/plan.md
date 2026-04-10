

## Fix: Collection Creation Fails Silently

### Root Cause

Build error — type mismatch between `useCollections().createCollection` (returns `Promise<Collection>`) and the `onCreate` prop type in `CreateCollectionDialog` / `CollectionsList` (expects `Promise<void>`). The app fails to compile this path correctly, so nothing happens when clicking "Create Collection".

### Fix

Wrap `createCollection` calls in LibraryCatalog.tsx with an async arrow function that discards the return value:

**File: `src/components/departments/LibraryCatalog.tsx`** — 3 locations (lines ~515, ~531, ~553):

```typescript
// Before:
onCreate={createCollection}

// After:
onCreate={async (input) => { await createCollection(input); }}
```

This satisfies the `Promise<void>` type signature while preserving functionality.

### Files Modified
1. `src/components/departments/LibraryCatalog.tsx` — wrap 3 `createCollection` references

