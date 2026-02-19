// Utilidades OAuth de Google para frontend público (sin client secret)
import { config } from '../config/env';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// URL de autorización para flujo implícito (token en fragment)
// Útil como fallback en navegadores móviles/in-app donde popup GIS falla.
export const getGoogleImplicitAuthUrl = (): string => {
  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'token',
    scope: config.google.scopes.join(' '),
    include_granted_scopes: 'true',
    prompt: 'consent'
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
