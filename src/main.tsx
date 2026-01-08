import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'

// Add CSP violation handler for debugging
if (typeof window !== 'undefined') {
  window.addEventListener('securitypolicyviolation', (e) => {
    console.warn('[CSP Violation]', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
