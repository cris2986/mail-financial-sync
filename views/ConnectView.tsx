import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { isGISConfigured } from '../services/googleIdentity';
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

export const ConnectView: React.FC = () => {
  const navigate = useNavigate();
  const loginWithGIS = useAppStore(state => state.loginWithGIS);
  const authStatus = useAppStore(state => state.authStatus);
  const syncError = useAppStore(state => state.syncError);
  const isTestEnv = import.meta.env.MODE === 'test';

  const [error, setError] = useState<string | null>(null);

  const configError = useMemo(() => {
    if (!isGISConfigured()) {
      return 'Falta configurar VITE_GOOGLE_CLIENT_ID para habilitar Gmail real.';
    }
    return null;
  }, []);

  const handleConnect = async () => {
    setError(null);

    if (configError) {
      setError(configError);
      return;
    }

    if (isEmbeddedBrowser()) {
      setError(getInAppBrowserMessage());
      return;
    }

    // En móvil el popup de GIS falla — usar redirect como flujo principal
    if (isMobileDevice()) {
      window.location.assign(getGoogleImplicitAuthUrl());
      return;
    }

    // En desktop usar GIS popup (no requiere redirect_uri, solo JS origins)
    navigate('/loading');
    try {
      const totalEvents = await loginWithGIS();
      navigate(totalEvents > 0 ? '/dashboard' : '/empty', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al conectar. Intenta de nuevo.';
      console.error('[ConnectView] Error en login:', err);

      if (isEmbeddedBrowserError(message) || isEmbeddedBrowser()) {
        setError(getInAppBrowserMessage());
        navigate('/login', { replace: true });
        return;
      }

      // Popup bloqueado u error de origen → fallback redirect
      if (isPopupBlockedError(message) || isOAuthRequestError(message)) {
        navigate('/login', { replace: true });
        window.location.assign(getGoogleImplicitAuthUrl());
        return;
      }

      setError(message);
      navigate('/error', { replace: true });
    }
  };

  const isLoading = authStatus === 'loading';
  const currentError = error || syncError || configError;

  return (
    <main className="flex-1 flex flex-col items-center justify-between px-6 pb-12 pt-6 h-full bg-white dark:bg-bg-dark text-gray-900 dark:text-white safe-top">
      <div className="flex flex-col items-center justify-center w-full mt-14 space-y-8">
        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="material-symbols-outlined text-gray-800 dark:text-gray-200 text-3xl">
            mark_email_read
          </span>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Mail Financial Sync
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Visibilidad financiera automática
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs space-y-6">
        <div className="relative w-full h-32 flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full blur-xl opacity-60"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-4xl">
              mail
            </span>
            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-xl">
              arrow_forward
            </span>
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-4xl">
              pie_chart
            </span>
          </div>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm leading-relaxed px-4">
          Conecta tu correo para generar automáticamente una vista simplificada de tus ingresos y egresos.
        </p>
      </div>

      <div className="w-full flex flex-col space-y-4">
        <button
          type="button"
          onClick={handleConnect}
          disabled={isLoading || !!configError}
          className="w-full bg-primary hover:bg-blue-600 active:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-4 px-6 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center space-x-3 group"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">sync</span>
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.5 12.2C21.5 11.5 21.4 10.7 21.3 10H12V13.8H17.4C17.2 15.2 16.4 16.3 15.3 17V19.7H18.5C20.4 17.9 21.5 15.3 21.5 12.2Z" fill="#4285F4"></path>
                <path d="M12 22C14.7 22 16.9 21.1 18.5 19.7L15.3 17C14.4 17.6 13.3 18 12 18C9.4 18 7.2 16.2 6.4 13.9H3.1V16.5C4.8 19.8 8.2 22 12 22Z" fill="#34A853"></path>
                <path d="M6.4 13.9C6.2 13.3 6.1 12.6 6.1 12C6.1 11.3 6.2 10.6 6.4 10H3.1V7.5C1.5 10.8 1.5 14.7 3.1 18L6.4 13.9Z" fill="#FBBC05"></path>
                <path d="M12 6C13.5 6 14.8 6.5 15.9 7.5L18.6 4.8C16.9 3.2 14.6 2 12 2C8.2 2 4.8 4.2 3.1 7.5L6.4 10C7.2 7.7 9.4 6 12 6Z" fill="#EA4335"></path>
              </svg>
              <span>Conectar con Gmail</span>
            </>
          )}
        </button>

        {currentError && (
          <p className="text-xs text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {currentError}
          </p>
        )}

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-start space-x-2">
            <span className="material-symbols-outlined text-gray-400 text-base mt-0.5 shrink-0">
              verified_user
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-justify">
              Solo detectamos eventos financieros. Tus correos completos nunca se almacenan. Esta es una herramienta de visibilidad parcial, no un estado de cuenta.
            </p>
          </div>
        </div>

        <div className="flex justify-center space-x-6 text-xs text-gray-400 font-medium pt-2">
          <button type="button" onClick={() => navigate('/legal/privacy')} className="hover:text-gray-600 dark:hover:text-gray-300">Política de Privacidad</button>
          <button type="button" onClick={() => navigate('/legal/terms')} className="hover:text-gray-600 dark:hover:text-gray-300">Términos de Servicio</button>
        </div>
      </div>
    </main>
  );
};
