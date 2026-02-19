import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { config } from './config/env';

const shouldRedirectToCanonicalOrigin = (): boolean => {
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    return false;
  }

  const currentHost = window.location.host;
  if (!currentHost.endsWith('.vercel.app')) {
    return false;
  }

  try {
    const redirectUrl = new URL(config.google.redirectUri);
    const targetOrigin = redirectUrl.origin;
    const targetHost = redirectUrl.host;

    if (!targetHost.endsWith('.vercel.app') || window.location.origin === targetOrigin) {
      return false;
    }

    const destination = `${targetOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(destination);
    return true;
  } catch {
    return false;
  }
};

if (!shouldRedirectToCanonicalOrigin()) {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[PWA] Service worker registration failed:', error);
      });
    });
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
