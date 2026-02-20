

# Fix Duplicate Selection Bar in Library

## Problem

When entering select mode on the Source Images tab, two identical selection bars appear stacked on top of each other. This happens because both `LibraryOld.tsx` and `ImageLibraryGrid.tsx` render their own selection mode header.

## Fix

Remove the duplicate selection header from `LibraryOld.tsx` (lines 253-278). The `ImageLibraryGrid` component already handles displaying the selection bar, delete confirmation, and cancel actions -- so the one in `LibraryOld.tsx` is redundant.

## Technical Details

| File | Change |
|---|---|
| `src/components/departments/LibraryOld.tsx` | Remove the "Source Selection Mode Header" block (lines 253-278) and the associated `showSourceBulkDeleteDialog` AlertDialog (lines 332-353), since `ImageLibraryGrid` already provides both. Also remove the now-unused state variables `showSourceBulkDeleteDialog`, `sourceBulkDeleting`, and the `handleSourceBulkDelete` function. |

One file change, no new dependencies.

