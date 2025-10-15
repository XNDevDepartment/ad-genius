// Helper to safely call Meta Pixel
export const trackMetaPixelEvent = (eventName: string, data?: object) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    try {
      (window as any).fbq('track', eventName, data);
      console.log('Meta Pixel event tracked:', eventName, data);
    } catch (error) {
      console.error('Error tracking Meta Pixel event:', error);
    }
  } else {
    console.warn('Meta Pixel not loaded yet');
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

export const trackInitiateCheckout = () => {
  trackMetaPixelEvent('InitiateCheckout');
};

export const trackPurchase = (value: number, currency = 'EUR') => {
  trackMetaPixelEvent('Purchase', { value, currency, content_type: 'product' });
};

export const trackLead = () => {
  trackMetaPixelEvent('Lead');
};
