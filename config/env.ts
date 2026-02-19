// Configuración de variables de entorno
const defaultRedirectUri = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : 'http://localhost:5173/auth/callback';

export const config = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || defaultRedirectUri,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    syncEnabled: import.meta.env.VITE_SUPABASE_SYNC_ENABLED === 'true'
  }
};

// Validar configuración requerida
export const validateConfig = (): { isValid: boolean; missing: string[] } => {
  const missing: string[] = [];

  if (!config.google.clientId) missing.push('VITE_GOOGLE_CLIENT_ID');

  return {
    isValid: missing.length === 0,
    missing
  };
};
