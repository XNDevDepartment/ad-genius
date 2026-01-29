
## Bulk Background Replacement Module - Implementation Plan

### Overview
Create a new module that allows users to upload multiple product images and apply a single background to all of them in bulk. The background can either be uploaded by the user or selected from preset categories (lifestyle, studio, magazine, etc.).

---

### Module Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                    BULK BACKGROUND MODULE                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  STEP 1: Upload Products                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Multi-image uploader (max 20-50 images)                │  │
│  │  Drag & drop or click to upload                         │  │
│  │  Grid preview of all uploaded products                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  STEP 2: Select Background                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ┌───────────────┐  ┌──────────────────────────────────┐│  │
│  │  │ Upload Custom │  │ Choose from Presets             ││  │
│  │  │    Photo      │  │                                  ││  │
│  │  │               │  │ Categories:                      ││  │
│  │  │  [+] Upload   │  │ • Lifestyle (home, outdoor...)   ││  │
│  │  │               │  │ • Studio (white, black, gradient)││  │
│  │  └───────────────┘  │ • Magazine (editorial, fashion)  ││  │
│  │                     │ • Nature (beach, forest, park)   ││  │
│  │                     │ • Urban (city, street, café)     ││  │
│  │                     └──────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  STEP 3: Review & Process                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Preview: Product + Background composite                │  │
│  │  Cost calculation: X credits × N images                 │  │
│  │  [Start Batch Processing] button                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  STEP 4: Results                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Progress bar: X/N processed                            │  │
│  │  Grid of completed images                               │  │
│  │  [Download All as ZIP] button                           │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/BulkBackground.tsx` | Main page component with multi-step wizard |
| `src/components/bulk-background/BackgroundPicker.tsx` | Component for selecting/uploading backgrounds |
| `src/components/bulk-background/BackgroundPresets.tsx` | Preset backgrounds organized by category |
| `src/data/background-presets.ts` | Static data for preset background categories |

### Files to Modify

| File | Purpose |
|------|---------|
| `src/App.tsx` | Add route for `/create/bulk-background` |
| `src/pages/ModuleSelection.tsx` | Add module card for Bulk Background |
| `src/i18n/locales/*.json` | Add translations for all 5 languages |

---

### Technical Implementation Details

#### 1. Page Structure (`src/pages/BulkBackground.tsx`)

```typescript
// State management
const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
const [productImages, setProductImages] = useState<File[]>([]);
const [backgroundSource, setBackgroundSource] = useState<'custom' | 'preset'>('preset');
const [customBackground, setCustomBackground] = useState<File | null>(null);
const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
const [processedResults, setProcessedResults] = useState<string[]>([]);

// Steps:
// Step 1: Upload products using MultiImageUploader (existing component)
// Step 2: Select background (new BackgroundPicker component)
// Step 3: Review & confirm (cost calculation, preview)
// Step 4: Processing & results (progress, download)
```

#### 2. Background Presets Data Structure (`src/data/background-presets.ts`)

```typescript
export interface BackgroundPreset {
  id: string;
  name: string;
  thumbnail: string;
  category: BackgroundCategory;
  prompt?: string; // For AI generation
}

export type BackgroundCategory = 
  | 'lifestyle' 
  | 'studio' 
  | 'magazine' 
  | 'nature' 
  | 'urban'
  | 'seasonal';

export const backgroundCategories: Record<BackgroundCategory, {
  label: string;
  description: string;
  icon: string;
}> = {
  lifestyle: { 
    label: 'Lifestyle', 
    description: 'Home, everyday scenes',
    icon: 'Home' 
  },
  studio: { 
    label: 'Studio', 
    description: 'Professional backdrops',
    icon: 'Camera' 
  },
  magazine: { 
    label: 'Magazine', 
    description: 'Editorial & fashion',
    icon: 'BookOpen' 
  },
  nature: { 
    label: 'Nature', 
    description: 'Outdoor natural settings',
    icon: 'TreeDeciduous' 
  },
  urban: { 
    label: 'Urban', 
    description: 'City & street scenes',
    icon: 'Building2' 
  },
  seasonal: { 
    label: 'Seasonal', 
    description: 'Holiday & seasonal themes',
    icon: 'Snowflake' 
  }
};

export const backgroundPresets: BackgroundPreset[] = [
  // Studio
  { id: 'white-seamless', name: 'White Seamless', category: 'studio', thumbnail: '...' },
  { id: 'black-studio', name: 'Black Studio', category: 'studio', thumbnail: '...' },
  { id: 'gradient-gray', name: 'Gray Gradient', category: 'studio', thumbnail: '...' },
  
  // Lifestyle
  { id: 'living-room', name: 'Modern Living Room', category: 'lifestyle', thumbnail: '...' },
  { id: 'kitchen', name: 'Bright Kitchen', category: 'lifestyle', thumbnail: '...' },
  { id: 'bedroom', name: 'Cozy Bedroom', category: 'lifestyle', thumbnail: '...' },
  
  // Nature
  { id: 'beach', name: 'Beach Scene', category: 'nature', thumbnail: '...' },
  { id: 'forest', name: 'Forest Path', category: 'nature', thumbnail: '...' },
  { id: 'garden', name: 'Garden Setting', category: 'nature', thumbnail: '...' },
  
  // Urban
  { id: 'cafe', name: 'Coffee Shop', category: 'urban', thumbnail: '...' },
  { id: 'street', name: 'Street Style', category: 'urban', thumbnail: '...' },
  { id: 'rooftop', name: 'Rooftop View', category: 'urban', thumbnail: '...' },
  
  // Magazine
  { id: 'editorial', name: 'Editorial Setup', category: 'magazine', thumbnail: '...' },
  { id: 'fashion', name: 'Fashion Studio', category: 'magazine', thumbnail: '...' },
  { id: 'minimal', name: 'Minimalist', category: 'magazine', thumbnail: '...' }
];
```

#### 3. BackgroundPicker Component (`src/components/bulk-background/BackgroundPicker.tsx`)

```typescript
interface BackgroundPickerProps {
  onCustomUpload: (file: File) => void;
  onPresetSelect: (presetId: string) => void;
  selectedPreset: string | null;
  customBackground: File | null;
}

// Features:
// - Two-tab interface: "Upload Your Own" | "Choose Preset"
// - Upload area with ImageUploader
// - Category filter for presets
// - Grid of preset thumbnails
// - Selected state indicator
```

#### 4. UI/UX Design Specifications

**Step 1 - Product Upload:**
- Reuse existing `MultiImageUploader` component
- Max 20 images (configurable)
- Grid preview with remove buttons
- Image count indicator

**Step 2 - Background Selection:**
- Toggle between "Upload Custom" and "Choose Preset"
- If custom: Single image uploader with preview
- If preset: Category tabs + grid of preset thumbnails
- Clear visual selection indicator

**Step 3 - Review:**
- Side-by-side preview (product + background)
- Cost calculation: `credits_per_image × number_of_products`
- Summary of settings
- "Start Processing" CTA

**Step 4 - Results:**
- Real-time progress bar
- Grid of completed images as they finish
- Individual download buttons
- "Download All as ZIP" button

---

### Translation Keys to Add

```json
{
  "bulkBackground": {
    "title": "Bulk Background Replacement",
    "description": "Apply the same background to multiple product images",
    "steps": {
      "upload": "Upload Products",
      "background": "Select Background",
      "review": "Review & Process",
      "results": "Results"
    },
    "uploadProducts": {
      "title": "Upload Your Product Images",
      "subtitle": "Upload up to {{max}} product images",
      "imagesUploaded": "{{count}} images uploaded"
    },
    "selectBackground": {
      "title": "Choose Your Background",
      "uploadCustom": "Upload Custom",
      "choosePreset": "Choose Preset",
      "uploadHint": "Upload your own background image",
      "presetHint": "Select from our curated backgrounds"
    },
    "categories": {
      "lifestyle": "Lifestyle",
      "studio": "Studio",
      "magazine": "Magazine",
      "nature": "Nature",
      "urban": "Urban",
      "seasonal": "Seasonal"
    },
    "review": {
      "title": "Review Your Batch",
      "products": "Products",
      "background": "Background",
      "totalCost": "Total Cost",
      "creditsPerImage": "{{credits}} credits × {{count}} images"
    },
    "processing": {
      "title": "Processing Your Images",
      "progress": "{{current}} of {{total}} completed",
      "estimatedTime": "Estimated time: {{time}}"
    },
    "results": {
      "title": "Your Images Are Ready!",
      "downloadAll": "Download All as ZIP",
      "downloadSingle": "Download"
    },
    "buttons": {
      "next": "Continue",
      "back": "Back",
      "startProcessing": "Start Processing",
      "newBatch": "New Batch"
    }
  }
}
```

---

### Route Configuration

**Add to `src/App.tsx`:**
```typescript
const BulkBackground = lazyWithRetry(() => import("./pages/BulkBackground"));

// Route (inside AppLayout)
<Route path="create/bulk-background" element={
  <ErrorBoundaryWithReset>
    <Suspense fallback={<LoadingFallback />}>
      <AuthGuard>
        <BulkBackground />
      </AuthGuard>
    </Suspense>
  </ErrorBoundaryWithReset>
} />
```

**Add to `src/pages/ModuleSelection.tsx`:**
```typescript
{
  id: "bulk-background",
  title: t('createSelection.bulkBackground.title'),
  description: t('createSelection.bulkBackground.description'),
  icon: Images,
  path: "/create/bulk-background",
  isAdmin: false,
  isBeta: true,
  locked: false
}
```

---

### Build Error Fix (Separate)

The build error with `send-compensation-email/index.ts` needs fixing:

**Current (broken):**
```typescript
import { Resend } from "npm:resend@2.0.0";
```

**Fix to:**
```typescript
import { Resend } from "https://esm.sh/resend@2.0.0";
```

---

### Implementation Priority

| Phase | Tasks |
|-------|-------|
| **Phase 1** | Fix build error, create page structure, implement Step 1 (upload) |
| **Phase 2** | Create background presets data, implement BackgroundPicker component |
| **Phase 3** | Implement Step 2 (background selection UI) |
| **Phase 4** | Implement Step 3 (review) + Step 4 (placeholder processing) |
| **Phase 5** | Add translations for all 5 languages |
| **Phase 6** | Add route and module card |

---

### Notes for Backend (Future)

The backend edge function will need to:
1. Accept product images + background (URL or preset ID)
2. Use AI to extract product from original image
3. Composite product onto new background, centered
4. Return processed image URLs
5. Support batch processing with progress updates

This plan creates the complete frontend structure. Backend integration can be added later.
