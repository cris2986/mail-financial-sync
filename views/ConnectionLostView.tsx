import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getGoogleImplicitAuthUrl } from '../services/googleAuth';

const getInAppBrowserMessage = (): string => {
  return 'Google bloquea el login dentro de navegadores embebidos. Abre la app en Chrome o Safari e intenta nuevamente.';
};

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod/i.test(ua);
};

const isEmbeddedBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /(FBAN|FBAV|Instagram|Line|Twitter|TikTok|WebView|wv|FB_IAB|LinkedInApp|MiuiBrowser|GSA)/i.test(ua);
};

const isPopupBlockedError = (message: string): boolean => {
  return /(popup|closed|cancel|blocked)/i.test(message);
};

const isEmbeddedBrowserError = (message: string): boolean => {
  return /(disallowed_useragent)/i.test(message);
};

const isOAuthRequestError = (message: string): boolean => {
  return /(origin_mismatch|redirect_uri_mismatch|invalid_request)/i.test(message);
};

export const ConnectionLostView: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppStore(state => state.user);
  const syncError = useAppStore(state => state.syncError);
  const syncStatus = useAppStore(state => state.syncStatus);
  const syncEvents = useAppStore(state => state.syncEvents);
  const loginWithGIS = useAppStore(state => state.loginWithGIS);
  const isTestEnv = import.meta.env.MODE === 'test';

  const [localError, setLocalError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setLocalError(null);
    setIsRetrying(true);

    try {
      let totalEvents = 0;
      if (user?.isAuthenticated) {
        await syncEvents(true);
        const state = useAppStore.getState();
        if (state.syncStatus === 'error') {
          throw new Error(state.syncError || 'No se pudo completar la sincronización.');
        }
        totalEvents = state.events.length;
      } else {
        if (isEmbeddedBrowser()) {
          setLocalError(getInAppBrowserMessage());
          return;
        }
        if (!isTestEnv || isMobileDevice()) {
          window.location.assign(getGoogleImplicitAuthUrl());
          return;
        }
        totalEvents = await loginWithGIS();
      }

      navigate(totalEvents > 0 ? '/dashboard' : '/empty', { replace: true });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo restablecer la conexión con Gmail.';

      if (isEmbeddedBrowserError(message) || isEmbeddedBrowser()) {
        setLocalError(getInAppBrowserMessage());
        return;
      }

      if (isPopupBlockedError(message) || isOAuthRequestError(message)) {
        window.location.assign(getGoogleImplicitAuthUrl());
        return;
      }

      setLocalError(message);
      console.error('[ConnectionLostView] Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-8 relative w-full max-w-md mx-auto h-full bg-bg-light dark:bg-bg-dark">
      <div className="mb-10 relative">
        <div className="absolute inset-0 bg-primary/20 dark:bg-primary/10 rounded-full blur-2xl transform scale-150 animate-pulse"></div>
        <div className="relative w-32 h-32 rounded-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-xl flex items-center justify-center">
          <div className="relative">
            <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-500">
              cloud_off
            </span>
            <div className="absolute bottom-1 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-3 mb-12">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Conexión Perdida
        </h1>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px] mx-auto text-sm">
          No pudimos completar la sincronización con Gmail. Revisa tu conexión o vuelve a autenticarte.
        </p>
        {(localError || syncError) && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {localError || syncError}
          </p>
        )}
      </div>

      <div className="w-full space-y-4">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying || syncStatus === 'syncing'}
          className="w-full group relative flex items-center justify-center py-4 px-6 border border-transparent text-base font-medium rounded-xl text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          {isRetrying || syncStatus === 'syncing' ? 'Reintentando...' : 'Reintentar Conexión'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center py-4 px-6 border border-gray-200 dark:border-gray-700 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-gray-700 active:bg-gray-100 dark:active:bg-gray-700"
        >
          Volver a Conectar Gmail
        </button>
      </div>
    </main>
  );
};
