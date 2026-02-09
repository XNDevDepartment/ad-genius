

# Style Bulk Background to Match UGC Gemini Module

## Overview

Update the Bulk Background page styling so the page background appears slightly grayer and sections look like distinct cards with shadows, matching the UGC Gemini module's visual style.

## Changes

### File: `src/pages/BulkBackground.tsx`

1. **Cards styling**: Replace `bg-transparent` on all Card components with `rounded-apple shadow-lg` to match the UGC module's card appearance.

2. **Card content padding**: Update CardContent sections to use `p-6 lg:p-8` padding for consistency with UGC cards.

3. **Specific changes per section**:
   - Section 1 (Upload): `Card className="bg-transparent scroll-mt-6"` becomes `Card className="rounded-apple shadow-lg scroll-mt-6"`
   - Section 2 (Background): `Card className="bg-transparent"` becomes `Card className="rounded-apple shadow-lg"`
   - Section 3 (Review): `Card className="bg-transparent"` becomes `Card className="rounded-apple shadow-lg"`
   - Section 4 (Processing): `Card className="bg-transparent"` becomes `Card className="rounded-apple shadow-lg"`

No layout or logic changes -- purely visual styling updates to match the established card pattern from the UGC module.

