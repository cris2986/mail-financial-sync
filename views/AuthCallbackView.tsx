import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { consumeOAuthState } from '../services/googleAuth';

export const AuthCallbackView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginWithGoogle = useAppStore(state => state.loginWithGoogle);
  const loginWithAccessToken = useAppStore(state => state.loginWithAccessToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashError = hashParams.get('error');
      const hashErrorDescription = hashParams.get('error_description');
      const accessToken = hashParams.get('access_token');
      const expiresInRaw = hashParams.get('expires_in');
      const returnedState = hashParams.get('state');

      if (hashError) {
        setError(hashErrorDescription || 'Se canceló el proceso de autorización.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (accessToken) {
        const expectedState = consumeOAuthState();
        if (!returnedState || !expectedState || returnedState !== expectedState) {
          setError('Respuesta OAuth inválida. Intenta conectar tu cuenta nuevamente.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        const expiresIn = Number(expiresInRaw || '3600');
        const safeExpiresIn = Number.isFinite(expiresIn) ? expiresIn : 3600;

        // Limpiar hash para no dejar token en la URL
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);

        try {
          const totalEvents = await loginWithAccessToken(accessToken, safeExpiresIn);
          navigate(totalEvents > 0 ? '/dashboard' : '/empty');
          return;
        } catch (err) {
          console.error('Error en callback (token):', err);
          setError(err instanceof Error ? err.message : 'Error inesperado. Por favor intenta de nuevo.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
      }

      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Se canceló el proceso de autorización.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No se recibió código de autorización.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        const totalEvents = await loginWithGoogle(code);
        navigate(totalEvents > 0 ? '/dashboard' : '/empty');
      } catch (err) {
        console.error('Error en callback:', err);
        setError(err instanceof Error ? err.message : 'Error inesperado. Por favor intenta de nuevo.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, loginWithGoogle, loginWithAccessToken, navigate]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-bg-dark p-6">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Error de Autenticación
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
          {error}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Redirigiendo al inicio...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-bg-dark p-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Conectando con Gmail
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-center">
        Por favor espera mientras verificamos tu cuenta...
      </p>
    </div>
  );
};
