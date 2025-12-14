// Helper to safely call Meta Pixel
export const trackMetaPixelEvent = (eventName: string, data?: object) => {
  try {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', eventName, data);
      console.log('[Meta Pixel] Event tracked:', eventName, data);
    }
  } catch (error) {
    // Silently fail - tracking should never break the app
    console.debug('[Meta Pixel] Tracking failed (non-critical):', error);
  }
};

// Predefined tracking functions for common events
export const trackSignUp = () => {
  trackMetaPixelEvent('CompleteRegistration');
};

export const trackSubscription = (value?: number, currency = 'EUR') => {
  trackMetaPixelEvent('Subscribe', { value, currency });
};

export const trackViewContent = (contentName: string) => {
  trackMetaPixelEvent('ViewContent', { content_name: contentName });
};

export const trackAddToCart = (contentName: string, value?: number) => {
  trackMetaPixelEvent('AddToCart', { content_name: contentName, value });
};

export const trackInitiateCheckout = (planName?: string, value?: number, currency = 'EUR') => {
  trackMetaPixelEvent('InitiateCheckout', { 
    content_name: planName,
    value,
    currency
  });
};

export const trackPurchase = (value: number, currency = 'EUR', planName?: string) => {
  trackMetaPixelEvent('Purchase', { 
    value, 
    currency, 
    content_type: 'product',
    content_name: planName
  });
};

export const trackLead = () => {
  trackMetaPixelEvent('Lead');
};

export const trackCheckoutAbandoned = (planName?: string) => {
  trackMetaPixelEvent('CustomEvent', { 
    event_name: 'CheckoutAbandoned',
    content_name: planName || 'subscription'
  });
};
