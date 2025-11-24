export const checkTrackingHealth = () => {
  const health = {
    metaPixel: typeof window !== 'undefined' && !!(window as any).fbq,
    apollo: typeof window !== 'undefined' && !!(window as any).trackingFunctions
  };
  
  console.log('[Tracking Health]', health);
  return health;
};
