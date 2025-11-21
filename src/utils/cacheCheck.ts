/**
 * Cache version checking utility
 * Detects stale cached application versions and forces a refresh
 */

const APP_VERSION = '3.0.1'; // Increment this with each deploy that has breaking changes
const VERSION_KEY = 'app_version';

export const checkForCachedVersion = () => {
  try {
    const cachedVersion = localStorage.getItem(VERSION_KEY);
    
    if (cachedVersion && cachedVersion !== APP_VERSION) {
      console.log('[Cache] Detected version mismatch:', {
        cached: cachedVersion,
        current: APP_VERSION
      });
      console.log('[Cache] Clearing cache and reloading...');
      
      // Clear all cached data
      localStorage.clear();
      sessionStorage.clear();
      
      // Store new version before reload
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      
      // Force a hard reload to get fresh assets
      window.location.reload();
      return;
    }
    
    // Store current version if not already stored
    if (!cachedVersion) {
      console.log('[Cache] Setting initial app version:', APP_VERSION);
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  } catch (error) {
    console.error('[Cache] Error checking version:', error);
  }
};
