// Utilidades OAuth de Google para frontend público (sin client secret)
import { config } from '../config/env';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

const OAUTH_STATE_STORAGE_KEY = 'mail-financial-sync.oauth.state';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  value: string;
  createdAt: number;
}

let inMemoryOAuthState: OAuthStatePayload | null = null;

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const generateOAuthState = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  }

  // Fallback para navegadores legacy
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const persistOAuthState = (value: string): void => {
  const payload: OAuthStatePayload = {
    value,
    createdAt: Date.now()
  };

  const storage = getSessionStorage();
  if (storage) {
    storage.setItem(OAUTH_STATE_STORAGE_KEY, JSON.stringify(payload));
    return;
  }

  inMemoryOAuthState = payload;
};

export const consumeOAuthState = (): string | null => {
  const storage = getSessionStorage();
  let payload: OAuthStatePayload | null = null;

  if (storage) {
    const raw = storage.getItem(OAUTH_STATE_STORAGE_KEY);
    storage.removeItem(OAUTH_STATE_STORAGE_KEY);
    if (raw) {
      try {
        payload = JSON.parse(raw) as OAuthStatePayload;
      } catch {
        payload = null;
      }
    }
  } else {
    payload = inMemoryOAuthState;
    inMemoryOAuthState = null;
  }

  if (!payload || !payload.value) {
    return null;
  }

  if (Date.now() - payload.createdAt > OAUTH_STATE_MAX_AGE_MS) {
    return null;
  }

  return payload.value;
};

// URL de autorización para flujo implícito (token en fragment)
// Útil como fallback en navegadores móviles/in-app donde popup GIS falla.
export const getGoogleImplicitAuthUrl = (): string => {
  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const state = generateOAuthState();
  persistOAuthState(state);

  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'token',
    scope: config.google.scopes.join(' '),
    include_granted_scopes: 'true',
    prompt: 'consent',
    state
  });

  return `${baseUrl}?${params.toString()}`;
};

// Obtener información del usuario con access token
export const getGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error getting user info:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
};

// Revocar acceso
export const revokeGoogleAccess = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST'
    });
    return response.ok;
  } catch (error) {
    console.error('Error revoking access:', error);
    return false;
  }
};

// Verificar configuración mínima de OAuth en frontend
export const isGoogleAuthConfigured = (): boolean => {
  return !!config.google.clientId;
};
