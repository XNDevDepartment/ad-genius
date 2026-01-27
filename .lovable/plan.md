
## Fix: Mobile Image Settings Form in UGC-Gemini Module

### Problems Identified

1. **Instant open/close behavior** - Sheet closes immediately after opening when an image has been generated
2. **Missing aspect ratio selector** - The `aspectRatio` setting is not passed to the mobile SettingsSheet
3. **Missing output format** - The `outputFormat` setting is not synced between mobile and parent state
4. **Options mismatch** - Mobile settings don't receive all the same settings as desktop

---

### Root Cause Analysis

| Issue | Cause |
|-------|-------|
| Instant close | Job completion handler calls `setSettingsOpen(false)` which conflicts with user opening the sheet; combined with `modal={false}` creating unstable state |
| Missing aspect ratio | Parent component doesn't pass `aspectRatio` to SettingsSheet settings object |
| Missing output format | Parent component doesn't have `outputFormat` state variable or pass it to mobile |
| Non-modal sheet | Using `modal={false}` causes interaction issues on touch devices |

---

### Solution

#### 1. Fix the Sheet Modal Behavior

Change `modal={false}` to `modal={true}` in `SettingsSheet.tsx` to ensure proper modal behavior on mobile:

```typescript
// In src/components/departments/ugc/SettingsSheet.tsx
<Sheet open={open} onOpenChange={setOpen} modal={true}>
```

#### 2. Add Missing State Variables to Parent

Add `outputFormat` state in `CreateUGCGeminiBase.tsx`:

```typescript
const [outputFormat, setOutputFormat] = useState<'png' | 'webp'>('png');
```

#### 3. Pass All Settings to Mobile SettingsSheet

Update the settings object passed to SettingsSheet to include `aspectRatio` and `outputFormat`:

```typescript
<SettingsSheet
  settings={{
    numImages,
    style,
    timeOfDay,
    highlight,
    imageOrientation,
    imageQuality,
    aspectRatio,       // ADD THIS
    outputFormat       // ADD THIS
  }}
  onSettingsChange={(newSettings) => {
    if (newSettings.numImages !== undefined) setNumImages(newSettings.numImages);
    if (newSettings.style !== undefined) setStyle(newSettings.style);
    if (newSettings.timeOfDay !== undefined) setTimeOfDay(newSettings.timeOfDay);
    if (newSettings.highlight !== undefined) setHighlight(newSettings.highlight);
    if (newSettings.imageOrientation !== undefined) setImageOrientation(newSettings.imageOrientation);
    if (newSettings.imageQuality !== undefined) setImageQuality(newSettings.imageQuality);
    if (newSettings.aspectRatio !== undefined) setAspectRatio(newSettings.aspectRatio);  // ADD THIS
    if (newSettings.outputFormat !== undefined) setOutputFormat(newSettings.outputFormat);  // ADD THIS
  }}
  // ... rest of props
/>
```

#### 4. Prevent Race Condition on Job Completion

Modify the job completion handler to not close the sheet if it was just opened by the user:

```typescript
// Instead of always closing
// setSettingsOpen(false);

// Only clean up body styles, don't force close the sheet
document.body.style.overflow = '';
document.body.style.pointerEvents = '';
// Remove: setSettingsOpen(false);
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/departments/ugc/SettingsSheet.tsx` | Change `modal={false}` to `modal={true}` for proper mobile modal behavior |
| `src/pages/CreateUGCGeminiBase.tsx` | 1. Add `outputFormat` state variable<br>2. Pass `aspectRatio` and `outputFormat` to SettingsSheet settings<br>3. Handle `aspectRatio` and `outputFormat` in onSettingsChange callback<br>4. Remove `setSettingsOpen(false)` from job completion handler |

---

### Technical Details

```text
File: src/components/departments/ugc/SettingsSheet.tsx
Line 44: Change modal={false} to modal={true}

File: src/pages/CreateUGCGeminiBase.tsx
Line ~114: Add state: const [outputFormat, setOutputFormat] = useState<'png' | 'webp'>('png');
Lines 315-316: Remove setSettingsOpen(false)
Lines 1503-1531: Update SettingsSheet props to include all settings and handlers
```

---

### Expected Outcome

After these changes:
- Mobile settings sheet will open and stay open reliably
- All settings available on desktop will be available on mobile (including aspect ratio and output format)
- Changing settings on mobile will properly update parent state
- Sheet will behave as a proper modal with overlay preventing background interaction
