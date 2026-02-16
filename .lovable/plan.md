
# Add Edit Request Input to Bulk Background Upload Section

## What This Does
Adds a text input field below the uploaded product images in the Bulk Background panel. This field lets you type editing instructions like "remove the label", "remove the box", "clean up the background", etc. These instructions will be passed along to the AI during generation.

## Changes

### 1. Bulk Background Page (`src/pages/BulkBackground.tsx`)
- Add a new state variable `editRequest` for the text input
- Add a `Textarea` input below the uploaded images count (inside the Upload Products card, visible only when images are uploaded)
- Pass `editRequest` into the `createJob` settings so it reaches the edge function
- Clear `editRequest` on "New Batch"

### 2. Translation Files (all 5 languages)
Add new keys under `bulkBackground.uploadProducts`:

| Key | EN | PT | ES | FR | DE |
|---|---|---|---|---|---|
| `editRequestLabel` | Edit requests | Pedidos de edicao | Solicitudes de edicion | Demandes de modification | Bearbeitungswunsche |
| `editRequestPlaceholder` | e.g. "Remove the label", "Clean up shadows"... | ex: "Remover a etiqueta", "Limpar sombras"... | ej: "Quitar la etiqueta", "Limpiar sombras"... | ex: "Retirer l'etiquette", "Nettoyer les ombres"... | z.B. "Etikett entfernen", "Schatten bereinigen"... |
| `editRequestHint` | These instructions will be applied to all images | Estas instrucoes serao aplicadas a todas as imagens | Estas instrucciones se aplicaran a todas las imagenes | Ces instructions seront appliquees a toutes les images | Diese Anweisungen werden auf alle Bilder angewendet |

### Files Modified
- `src/pages/BulkBackground.tsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`
- `src/i18n/locales/es.json`
- `src/i18n/locales/fr.json`
- `src/i18n/locales/de.json`
