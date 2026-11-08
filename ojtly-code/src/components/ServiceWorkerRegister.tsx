'use client';

import { useEffect } from 'react';

// ============================================================
// <ServiceWorkerRegister />
// Registers the service worker on the client side.
// This makes the app PWA-installable (Chrome/Edge/Android).
//
// Add this to your root layout.tsx inside the <body> tag:
//   <ServiceWorkerRegister />
// ============================================================

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
