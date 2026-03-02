

# Fix: Import `modelBackgroundPresets` in OutfitSwap

The last edit accidentally merged two names into one invalid identifier. The correct fix is:

### `src/pages/OutfitSwap.tsx` — Line 22

Change:
```typescript
import { modelBackgroundPresetsbackgroundPresets } from "@/data/background-presets";
```
To:
```typescript
import { modelBackgroundPresets } from "@/data/background-presets";
```

Then update any references from `backgroundPresets` to `modelBackgroundPresets` elsewhere in the file (if any exist).

