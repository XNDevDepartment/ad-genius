# Add "Continue Working" Message During Video Generation

## Change

In `src/components/AnimateImageModal.tsx`, update the processing state section (the block shown when `isProcessing` is true) to include a friendly message telling the user they can continue working and find the video in their "Videos" tab.

## Details

Add to the current processing UI (spinner + "Generating your video..." text + progress bar)  an enhanced version that includes:

- The existing spinner and progress bar
- A new message: **"Your video is generating. You may now continue your work. You can find it in your Videos tab."**
- A "Close" or "Got it" button so the user can dismiss the modal and keep working

The "Got it" button calls `onClose()` to dismiss the modal while the video continues generating in the background (the Kling subscription in `useKlingVideo` keeps tracking it independently).

## File Modified

- `src/components/AnimateImageModal.tsx` -- update the `isProcessing` block (~lines 139-148)