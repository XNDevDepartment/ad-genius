

## Improve Video Generator Processing Screen

### Overview

Add a helpful message to the Image Animator (Video Generator) processing screen to inform users they can leave the page and continue working while their video is being generated in the background.

---

### Current Implementation

The processing screen shows:
- Status: Processing
- "Generating your video..."
- Progress bar with "Processing..."
- Duration info
- Source image
- Cancel button

**Missing**: No indication that users can safely leave the page

---

### Proposed Enhancement

Add an informational alert below the progress bar when the job is in "queued" or "processing" status:

```text
+----------------------------------------------------------+
| ℹ️  Your video is being created - you can leave this     |
|    window and continue your work. You'll find your       |
|    completed video in the Video Library.                 |
+----------------------------------------------------------+
```

---

### Technical Changes

#### 1. Update i18n Translations

Add new translation keys for all languages:

**English (`src/i18n/locales/en.json`):**
```json
"status": {
  ...existing keys...
  "backgroundProcessing": "Your video is being created - you can leave this window and continue your work.",
  "findInLibrary": "You'll find your completed video in the Video Library."
}
```

Add same keys for: `pt.json`, `es.json`, `de.json`, `fr.json`

#### 2. Update VideoGenerator.tsx

Add an informational Alert component in the job card (between progress bar and duration info) when status is "queued" or "processing":

```typescript
{/* Background processing message */}
{(job.status === "queued" || job.status === "processing") && (
  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
    <Info className="h-4 w-4 text-blue-600" />
    <AlertDescription>
      {t('videoGenerator.status.backgroundProcessing')}{' '}
      <span className="font-medium">
        {t('videoGenerator.status.findInLibrary')}
      </span>
    </AlertDescription>
  </Alert>
)}
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/VideoGenerator.tsx` | Add background processing info Alert after progress bar |
| `src/i18n/locales/en.json` | Add `backgroundProcessing` and `findInLibrary` translation keys |
| `src/i18n/locales/pt.json` | Add Portuguese translations |
| `src/i18n/locales/es.json` | Add Spanish translations |
| `src/i18n/locales/de.json` | Add German translations |
| `src/i18n/locales/fr.json` | Add French translations |

---

### UI Placement

The message will appear in the job card between the progress bar and the duration info:

```text
+----------------------------------------+
| ⟳ Status: Processing        [Buttons] |
| Generating your video...               |
+----------------------------------------+
| [==============-------] 60%            |
| Processing...                          |
+----------------------------------------+
| ℹ️  Your video is being created...     | ← NEW MESSAGE
|    Find it in Video Library.           |
+----------------------------------------+
| Duration             5s                |
+----------------------------------------+
| Source Image                           |
| [image preview]                        |
+----------------------------------------+
| [      Cancel      ]                   |
+----------------------------------------+
```

---

### Summary

This small but impactful UX improvement reassures users that:
1. Video processing happens in the background
2. They don't need to stay on the page
3. They can find the result in the Video Library

This aligns with the asynchronous background processing pattern already used in the app.

