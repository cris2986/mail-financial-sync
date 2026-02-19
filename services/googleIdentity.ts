// Google Identity Services (GIS) para autenticación OAuth
import { config } from '../config/env';

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
        };
      };
    };
  }
}

export {}; // Make this a module

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: ErrorResponse) => void;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface ErrorResponse {
  type: string;
  message: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Respuesta de token con información de expiración
export interface TokenInfo {
  accessToken: string;
  expiresAt: string; // ISO timestamp
}

let tokenClient: TokenClient | null = null;

// Inicializar el cliente de tokens
export const initGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    // Timeout después de 10 segundos
    setTimeout(() => reject(new Error('Google Identity Services no cargó')), 10000);
    checkGoogleLoaded();
  });
};

// Solicitar token de acceso con información de expiración
export const requestAccessToken = async (forceConsent = true): Promise<TokenInfo> => {
  await initGoogleAuth();

  return new Promise((resolve, reject) => {
    // Siempre crear nuevo tokenClient para evitar callbacks stale
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: config.google.clientId,
      scope: config.google.scopes.join(' '),
      callback: (response: TokenResponse) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Calcular timestamp de expiración (expires_in es en segundos)
          // Restamos 5 minutos como margen de seguridad
          const expiresAt = new Date(Date.now() + (response.expires_in - 300) * 1000).toISOString();
          resolve({
            accessToken: response.access_token,
            expiresAt
          });
        }
      },
      error_callback: (error: ErrorResponse) => {
        reject(new Error(error.message));
      }
    });

    // Si forceConsent es false, intentamos obtener token sin mostrar popup
    // (funciona si el usuario ya dio consentimiento previamente)
    tokenClient.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
  });
};

// Refrescar token silenciosamente (sin popup de consentimiento)
// Útil cuando el token está próximo a expirar
export const refreshAccessToken = async (): Promise<TokenInfo> => {
  debugLog('[GIS] Refrescando token silenciosamente...');
  try {
    return await requestAccessToken(false);
  } catch (error) {
    debugLog('[GIS] Refresh silencioso falló, requiere consentimiento:', error);
    // Si el refresh silencioso falla, probablemente necesite consentimiento explícito
    throw new Error('REFRESH_NEEDS_CONSENT');
  }
};

// Limpiar el cliente de tokens (llamar en logout)
export const clearTokenClient = (): void => {
  tokenClient = null;
};

// Obtener información del usuario con el token
export const fetchUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Error obteniendo información del usuario: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Validar que tenemos los campos requeridos
    if (!data.email || !data.id) {
      throw new Error('Respuesta de usuario incompleta');
    }

    return data as GoogleUserInfo;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de red al obtener información del usuario');
  }
};

// Verificar si GIS está configurado
export const isGISConfigured = (): boolean => {
  return !!config.google.clientId;
};
