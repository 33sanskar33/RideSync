import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Keep browser-side failures visible in DevTools instead of silently losing them.
window.addEventListener('error', (event) => {
  console.error('[RideSync] Uncaught browser error:', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[RideSync] Unhandled promise rejection:', event.reason);
});

// Register the shared service worker in production. It also handles RideSync
// SOS push notifications, so keep a single registration and shared scope.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('[RideSync] Service worker registration failed:', error);
    });
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('[RideSync] Could not find the #root element in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
