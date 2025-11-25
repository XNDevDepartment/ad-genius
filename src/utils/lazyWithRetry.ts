import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy() with automatic retry logic for failed chunk loads.
 * This prevents "Failed to load page" errors when network is temporarily unstable.
 * 
 * @param importFn - The dynamic import function
 * @param retries - Number of retry attempts (default: 3)
 * @param delay - Initial delay in ms between retries (default: 1000)
 * @returns A lazy-loaded component with retry capability
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attemptImport = (attemptsLeft: number, currentDelay: number) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (attemptsLeft === 0) {
              console.error('[lazyWithRetry] All retry attempts failed:', error);
              reject(error);
              return;
            }

            console.warn(
              `[lazyWithRetry] Failed to load chunk. Retrying in ${currentDelay}ms... (${attemptsLeft} attempts left)`,
              error
            );

            setTimeout(() => {
              attemptImport(attemptsLeft - 1, currentDelay * 2); // Exponential backoff
            }, currentDelay);
          });
      };

      attemptImport(retries, delay);
    });
  });
}
