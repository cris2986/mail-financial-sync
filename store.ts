import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, FinancialEvent, MonthlySummary, SyncStatus, SyncProgress, EmailRule, EventCategory, SyncMetadata } from './types';
import { revokeGoogleAccess } from './services/googleAuth';
import { requestAccessToken, refreshAccessToken, fetchUserInfo, clearTokenClient } from './services/googleIdentity';
import { createGmailService } from './services/gmailApi';
import { getSupabase } from './services/supabase';
import { getCurrentNotificationPermission, notifyNewEvents, requestNotificationPermission } from './services/notifications';
import { config } from './config/env';
import { categoryLabels } from './domain/categories';
import {
  DEFAULT_SCAN_SETTINGS,
  RULE_LIST_BY_TYPE,
  createRuleId,
  normalizeScanSettings,
  removeRuleFromAllLists,
  sanitizeRuleValue,
  toggleRuleInAllLists
} from './domain/scanSettings';

export { categoryLabels };

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) window.console.log(...args);
};

let autoSyncDepth = 0;

const enterAutoSync = () => {
  autoSyncDepth += 1;
};

const exitAutoSync = () => {
  autoSyncDepth = Math.max(0, autoSyncDepth - 1);
};

const isAutoSyncFlow = () => autoSyncDepth > 0;

// Obtener mes actual en formato YYYY-MM
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Metadata de sincronización por defecto
const DEFAULT_SYNC_METADATA: SyncMetadata = {
  lastSyncTimestamp: null,
  processedEmailIds: [],
  lastSyncEventCount: 0,
  lastManualSyncAt: null
};

const getInitialNotificationPermission = (): NotificationPermission | 'unsupported' => {
  return getCurrentNotificationPermission();
};
const MAX_PROCESSED_EMAIL_IDS = 5000;
const MANUAL_SYNC_MIN_INTERVAL_MS = 30_000;

const sanitizeCsvCell = (value: string): string => {
  const normalized = value.replace(/\r?\n/g, ' ').trim();
  const guarded = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return guarded.replace(/"/g, '""');
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  user: null,
  authStatus: 'idle',
  syncStatus: 'idle',
  syncError: null,
  syncProgress: null,
  events: [],
  darkMode: false,
  notificationsEnabled: false,
  notificationPermission: getInitialNotificationPermission(),
  selectedMonth: getCurrentMonth(),
  scanSettings: DEFAULT_SCAN_SETTINGS,
  syncMetadata: DEFAULT_SYNC_METADATA,

  // Alias de compatibilidad para flujo de conexión real con Gmail
  login: async () => {
    const supabase = getSupabase();
    if (supabase) {
      set({ authStatus: 'loading', syncError: null, syncStatus: 'idle', syncProgress: null });
      await supabase.startGoogleOAuth(config.google.redirectUri);
      // En flujo normal habrá redirect fuera de la app.
      return 0;
    }

    return get().loginWithGIS();
  },

  // Login con OAuth de Google
  loginWithGoogle: async (code: string) => {
    set({ authStatus: 'loading', syncError: null, syncStatus: 'idle', syncProgress: null });

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase Auth no está configurado. No se puede completar el callback seguro.');
      }

      if (!code) {
        throw new Error('No se recibió código de autorización OAuth.');
      }

      await supabase.exchangeCodeForSession(code);
      const tokenInfo = await supabase.getProviderToken();
      const userInfo = await fetchUserInfo(tokenInfo.accessToken);

      set({
        user: {
          email: userInfo.email,
          name: userInfo.name,
          isAuthenticated: true,
          googleId: userInfo.id,
          picture: userInfo.picture,
          accessToken: tokenInfo.accessToken,
          tokenExpiresAt: tokenInfo.expiresAt ?? undefined
        },
        authStatus: 'authenticated',
        selectedMonth: getCurrentMonth(),
        events: [],
        syncMetadata: DEFAULT_SYNC_METADATA
      });

      enterAutoSync();
      try {
        await get().syncEvents(true);
      } finally {
        exitAutoSync();
      }
      const stateAfterSync = get();
      if (stateAfterSync.syncStatus === 'error') {
        throw new Error(stateAfterSync.syncError || 'Error al sincronizar correos.');
      }

      return stateAfterSync.events.length;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Error al completar la autenticación segura con Google.';
      console.error('[Auth] Error en callback OAuth PKCE:', error);

      const hasAuthenticatedUser = !!get().user?.isAuthenticated;
      set({
        authStatus: hasAuthenticatedUser ? 'authenticated' : 'unauthenticated',
        syncError: message
      });

      if (!hasAuthenticatedUser) {
        clearTokenClient();
        set({ user: null, events: [] });
      }

      throw new Error(message);
    }
  },

  // Login con Google Identity Services (GIS) - Flujo popup
  loginWithGIS: async () => {
    set({ authStatus: 'loading', syncError: null, syncStatus: 'idle', syncProgress: null });

    try {
      // Solicitar token de acceso mediante popup
      const tokenInfo = await requestAccessToken(true);

      // Obtener información del usuario
      const userInfo = await fetchUserInfo(tokenInfo.accessToken);

      set({
        user: {
          email: userInfo.email,
          name: userInfo.name,
          isAuthenticated: true,
          googleId: userInfo.id,
          picture: userInfo.picture,
          accessToken: tokenInfo.accessToken,
          tokenExpiresAt: tokenInfo.expiresAt
        },
        authStatus: 'authenticated',
        selectedMonth: getCurrentMonth(),
        events: [],
        syncMetadata: DEFAULT_SYNC_METADATA
      });

      debugLog('[Auth] Token obtenido, expira:', tokenInfo.expiresAt);

      // Sincronizar eventos después del login (sin rate-limit manual)
      enterAutoSync();
      try {
        await get().syncEvents(true);
      } finally {
        exitAutoSync();
      }
      const stateAfterSync = get();
      if (stateAfterSync.syncStatus === 'error') {
        throw new Error(stateAfterSync.syncError || 'Error al sincronizar correos.');
      }

      return stateAfterSync.events.length;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Error al conectar con Gmail. Por favor intenta de nuevo.';
      console.error('[Auth] Error en login con GIS:', error);

      const hasAuthenticatedUser = !!get().user?.isAuthenticated;
      set({
        authStatus: hasAuthenticatedUser ? 'authenticated' : 'unauthenticated',
        syncError: message
      });

      if (!hasAuthenticatedUser) {
        clearTokenClient();
        set({ user: null, events: [] });
      }

      throw new Error(message);
    }
  },

  // Login usando token OAuth obtenido por flujo redirect (móvil/in-app browsers)
  loginWithAccessToken: async (accessToken: string, expiresInSeconds = 3600) => {
    set({ authStatus: 'loading', syncError: null, syncStatus: 'idle', syncProgress: null });

    try {
      const userInfo = await fetchUserInfo(accessToken);
      const safeExpires = Math.max(300, expiresInSeconds);
      const tokenExpiresAt = new Date(Date.now() + (safeExpires - 300) * 1000).toISOString();

      set({
        user: {
          email: userInfo.email,
          name: userInfo.name,
          isAuthenticated: true,
          googleId: userInfo.id,
          picture: userInfo.picture,
          accessToken,
          tokenExpiresAt
        },
        authStatus: 'authenticated',
        selectedMonth: getCurrentMonth(),
        events: [],
        syncMetadata: DEFAULT_SYNC_METADATA
      });

      enterAutoSync();
      try {
        await get().syncEvents(true);
      } finally {
        exitAutoSync();
      }
      const stateAfterSync = get();
      if (stateAfterSync.syncStatus === 'error') {
        throw new Error(stateAfterSync.syncError || 'Error al sincronizar correos.');
      }

      return stateAfterSync.events.length;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Error al validar la sesión de Google.';
      console.error('[Auth] Error en login con access token:', error);
      set({
        authStatus: 'unauthenticated',
        syncError: message,
        user: null,
        events: []
      });
      throw new Error(message);
    }
  },

  // Cerrar sesión
  logout: async () => {
    const { user } = get();

    // Si hay token de acceso, revocar acceso en Google
    if (user?.accessToken) {
      await revokeGoogleAccess(user.accessToken);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.signOut();
      } catch (error) {
        console.error('[Auth] Error cerrando sesión en Supabase:', error);
      }
    }

    // Limpiar el cliente de tokens de GIS
    clearTokenClient();

    set({
      user: null,
      events: [],
      authStatus: 'unauthenticated',
      syncStatus: 'idle',
      syncError: null,
      syncProgress: null,
      selectedMonth: getCurrentMonth(),
      syncMetadata: DEFAULT_SYNC_METADATA
    });
  },

  // Verificar si el token está próximo a expirar y refrescarlo
  ensureValidToken: async (): Promise<string | null> => {
    const { user } = get();

    if (!user?.accessToken) {
      return null;
    }

    // Si no hay fecha de expiración, asumir que el token es válido
    if (!user.tokenExpiresAt) {
      debugLog('[Auth] Sin fecha de expiración, usando token actual');
      return user.accessToken;
    }

    const now = new Date();
    const expiresAt = new Date(user.tokenExpiresAt);

    // Si el token aún es válido, devolverlo
    if (now < expiresAt) {
      const minutesLeft = Math.round((expiresAt.getTime() - now.getTime()) / 60000);
      debugLog('[Auth] Token válido por', minutesLeft, 'minutos más');
      return user.accessToken;
    }

    // Token expirado o próximo a expirar, intentar refrescar
    debugLog('[Auth] Token expirado, intentando refrescar...');
    try {
      const supabase = getSupabase();
      if (supabase) {
        const providerToken = await supabase.getProviderToken();
        set({
          user: {
            ...user,
            accessToken: providerToken.accessToken,
            tokenExpiresAt: providerToken.expiresAt ?? undefined
          }
        });
        debugLog('[Auth] Token renovado vía Supabase PKCE');
        return providerToken.accessToken;
      }

      const newTokenInfo = await refreshAccessToken();

      // Actualizar el usuario con el nuevo token
      set({
        user: {
          ...user,
          accessToken: newTokenInfo.accessToken,
          tokenExpiresAt: newTokenInfo.expiresAt
        }
      });

      debugLog('[Auth] Token refrescado exitosamente, expira:', newTokenInfo.expiresAt);
      return newTokenInfo.accessToken;
    } catch (error) {
      console.error('[Auth] Error refrescando token:', error);
      
      // Si el refresh requiere consentimiento o sesión inválida, forzar re-autenticación
      if (
        error instanceof Error &&
        (
          error.message === 'REFRESH_NEEDS_CONSENT' ||
          /reauth|provider_token|session/i.test(error.message)
        )
      ) {
        debugLog('[Auth] Refresh requiere consentimiento, limpiando sesión');
        clearTokenClient();
        set({ 
          user: null, 
          events: [],
          authStatus: 'unauthenticated',
          syncError: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        });
        return null;
      }
      
      // Si falla el refresh por otros motivos, el usuario deberá re-autenticarse
      clearTokenClient();
      set({ 
        user: null, 
        events: [],
        authStatus: 'unauthenticated' 
      });
      return null;
    }
  },

  // Sincronizar eventos desde Gmail (incremental por defecto)
  syncEvents: async (forceFullSync = false) => {
    const {
      user,
      scanSettings,
      syncMetadata,
      events: existingEvents,
      syncStatus,
      ensureValidToken,
      notificationsEnabled
    } = get();

    if (!user?.accessToken) {
      return;
    }

    // Prevenir sincronizaciones concurrentes
    if (syncStatus === 'syncing') {
      debugLog('[Sync] Ya hay una sincronización en progreso, ignorando...');
      return;
    }

    // Verificar conexión a internet
    if (!navigator.onLine) {
      set({
        syncStatus: 'error',
        syncError: 'Sin conexión a internet. Verifica tu conexión e intenta de nuevo.'
      });
      return;
    }

    const isManualSync = !isAutoSyncFlow();
    const nowMs = Date.now();
    const lastManualSyncAt = syncMetadata.lastManualSyncAt
      ? new Date(syncMetadata.lastManualSyncAt).getTime()
      : null;

    if (
      isManualSync &&
      Number.isFinite(lastManualSyncAt) &&
      lastManualSyncAt !== null &&
      nowMs - lastManualSyncAt < MANUAL_SYNC_MIN_INTERVAL_MS
    ) {
      const waitSeconds = Math.max(
        1,
        Math.ceil((MANUAL_SYNC_MIN_INTERVAL_MS - (nowMs - lastManualSyncAt)) / 1000)
      );
      set({
        syncStatus: 'error',
        syncError: `Demasiadas solicitudes. Espera ${waitSeconds}s antes de volver a sincronizar.`
      });
      return;
    }

    set({ syncStatus: 'syncing', syncError: null });

    // Verificar y refrescar token si es necesario
    const validToken = await ensureValidToken();
    if (!validToken) {
      set({
        syncStatus: 'error',
        syncError: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      });
      return;
    }

    try {
      // Callback de progreso para actualizar el UI
      const onProgress = (phase: string, current: number, total: number, message: string) => {
        set({
          syncProgress: {
            phase: phase as 'searching' | 'downloading' | 'processing' | 'saving',
            currentStep: current,
            totalSteps: total,
            message
          }
        });
      };

      // Crear servicio de Gmail con token validado y callback de progreso
      const gmailService = createGmailService(validToken, scanSettings, onProgress);

      // Determinar si es sync incremental o completo
      const processedIds = forceFullSync ? [] : syncMetadata.processedEmailIds;
      const lastSync = forceFullSync ? null : syncMetadata.lastSyncTimestamp;

      debugLog('[Sync] Modo:', forceFullSync ? 'COMPLETO' : 'INCREMENTAL');
      debugLog('[Sync] IDs ya procesados:', processedIds.length);
      debugLog('[Sync] Última sincronización:', lastSync);

      // Obtener eventos financieros (pasando IDs ya procesados para filtrar)
      const newEvents = await gmailService.getFinancialEvents(processedIds);
      const gmailDiagnostics = gmailService.getRunDiagnostics();
      const shouldNotify = !forceFullSync && !!lastSync && notificationsEnabled && newEvents.length > 0;
      let syncWarning = gmailDiagnostics.warning;

      debugLog('[Sync] Nuevos eventos encontrados:', newEvents.length);
      if (syncWarning) {
        console.warn('[Sync] Advertencia de degradación Gmail:', syncWarning);
      }

      // Combinar eventos existentes con nuevos (evitando duplicados)
      let allEvents: FinancialEvent[];
      if (forceFullSync) {
        // En sync completo, reemplazar todos los eventos
        allEvents = newEvents;
      } else {
        // En sync incremental, combinar con existentes
        const existingIds = new Set(existingEvents.map(e => e.id));
        const uniqueNewEvents = newEvents.filter(e => !existingIds.has(e.id));
        allEvents = [...existingEvents, ...uniqueNewEvents];
      }

      // Ordenar por fecha descendente
      allEvents.sort((a, b) => b.date.localeCompare(a.date));

      // Actualizar metadata de sincronización
      const processedInOrder = forceFullSync
        ? allEvents.map((event) => event.id)
        : [...newEvents.map((event) => event.id), ...processedIds];
      const allProcessedIds = [...new Set(processedInOrder)].slice(0, MAX_PROCESSED_EMAIL_IDS);
      let cloudSyncWarning: string | null = null;

      // Guardar en Supabase si está configurado
      const supabase = getSupabase();
      if (supabase && user.googleId) {
        try {
          // Obtener usuario de Supabase (o crearlo si no existe)
          let supabaseUser = await supabase.getUser(user.googleId);

          if (!supabaseUser) {
            supabaseUser = await supabase.createUser({
              email: user.email,
              name: user.name,
              google_id: user.googleId
            });
          }

          if (supabaseUser) {
            // Guardar solo eventos nuevos
            const eventsToSave = newEvents.map(e => ({
              user_id: supabaseUser.id,
              amount: e.amount,
              direction: e.direction,
              category: e.category,
              date: e.date,
              source: e.source,
              description: e.description,
              email_id: e.id
            }));

            if (eventsToSave.length > 0) {
              await supabase.createEvents(eventsToSave);
            }
          }
        } catch (error) {
          cloudSyncWarning = 'Sincronización local completada, pero falló el guardado en la nube.';
          console.error('[Sync] Error de persistencia en Supabase:', error);
        }
      }

      if (cloudSyncWarning) {
        syncWarning = syncWarning
          ? `${syncWarning} ${cloudSyncWarning}`
          : cloudSyncWarning;
      }

      set({
        events: allEvents,
        syncStatus: 'success',
        syncProgress: null, // Limpiar progreso al completar
        syncError: syncWarning ?? null,
        selectedMonth: allEvents.length > 0 ? allEvents[0].date.substring(0, 7) : getCurrentMonth(),
        syncMetadata: {
          lastSyncTimestamp: new Date().toISOString(),
          processedEmailIds: allProcessedIds,
          lastSyncEventCount: newEvents.length,
          lastManualSyncAt: isManualSync
            ? new Date(nowMs).toISOString()
            : syncMetadata.lastManualSyncAt
        }
      });

      if (shouldNotify) {
        notifyNewEvents(newEvents).catch((error) => {
          console.error('[Notifications] No se pudo mostrar la notificación:', error);
        });
      }

      debugLog('[Sync] Completado. Total eventos:', allEvents.length, '| Nuevos:', newEvents.length);
    } catch (error) {
      console.error('Error sincronizando eventos:', error);
      
      // Determinar tipo de error para dar mensaje específico
      let errorMessage = 'Error al sincronizar eventos. Por favor intenta de nuevo.';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          // Limpiar sesión para forzar re-autenticación
          clearTokenClient();
          set({ 
            user: null, 
            events: [],
            authStatus: 'unauthenticated'
          });
        } else if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
          errorMessage = 'Error de conexión. Verifica tu acceso a internet e intenta de nuevo.';
        } else if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
          errorMessage = 'Has alcanzado el límite de solicitudes a Gmail. Por favor, espera unos minutos e intenta de nuevo.';
        } else if (message.includes('permission') || message.includes('access')) {
          errorMessage = 'No tienes permisos para acceder a Gmail. Por favor, inicia sesión nuevamente.';
          clearTokenClient();
          set({ 
            user: null, 
            events: [],
            authStatus: 'unauthenticated'
          });
        }
      }
      
      set({
        syncStatus: 'error',
        syncProgress: null, // Limpiar progreso en error
        syncError: errorMessage
      });
    }
  },

  // Limpiar caché de sincronización para forzar sync completo
  clearSyncCache: () => {
    debugLog('[Sync] Limpiando caché de sincronización');
    set({
      syncMetadata: DEFAULT_SYNC_METADATA,
      events: []
    });
  },

  // Establecer eventos directamente
  setEvents: (events) => set({ events }),

  // Eliminar evento
  deleteEvent: async (id) => {
    const { user } = get();

    // Eliminar del estado local
    set((state) => ({
      events: state.events.filter(e => e.id !== id)
    }));

    // Si hay usuario sincronizado en Supabase, también eliminar allí
    if (user?.googleId) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const supabaseUser = await supabase.getUser(user.googleId);
          if (supabaseUser) {
            await supabase.deleteEventByEmailId(supabaseUser.id, id);
          }
        } catch (error) {
          console.error('[Sync] Error eliminando evento en Supabase:', error);
          set({
            syncError: 'Evento eliminado localmente, pero falló la eliminación en la nube.'
          });
        }
      }
    }
  },

  // Alternar modo oscuro
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // Activar/desactivar notificaciones del navegador
  setNotificationsEnabled: async (enabled: boolean) => {
    if (!enabled) {
      set({ notificationsEnabled: false });
      return;
    }

    const permission = await requestNotificationPermission();
    set({
      notificationsEnabled: permission === 'granted',
      notificationPermission: permission
    });
  },

  // Establecer mes seleccionado
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  // Establecer estado de autenticación
  setAuthStatus: (status) => set({ authStatus: status }),

  // Establecer estado de sincronización
  setSyncStatus: (status: SyncStatus, error?: string) => set({
    syncStatus: status,
    syncError: error || null
  }),

  // Establecer progreso de sincronización
  setSyncProgress: (progress: SyncProgress | null) => set({ syncProgress: progress }),

  // Agregar regla de filtrado
  addRule: (type: EmailRule['type'], value: string) => set((state) => {
    const sanitizedValue = sanitizeRuleValue(type, value);
    if (!sanitizedValue) {
      return state;
    }

    const listKey = RULE_LIST_BY_TYPE[type];
    const normalizedScanSettings = normalizeScanSettings(state.scanSettings);
    const alreadyExists = normalizedScanSettings[listKey].some(
      (rule) => rule.value === sanitizedValue
    );

    if (alreadyExists) {
      return state;
    }

    const newRule: EmailRule = {
      id: createRuleId(),
      type,
      value: sanitizedValue,
      enabled: true,
      createdAt: new Date().toISOString()
    };

    return {
      scanSettings: {
        ...normalizedScanSettings,
        [listKey]: [...normalizedScanSettings[listKey], newRule]
      }
    };
  }),

  // Eliminar regla
  removeRule: (id: string) => set((state) => {
    const normalizedScanSettings = normalizeScanSettings(state.scanSettings);
    return {
      scanSettings: removeRuleFromAllLists(normalizedScanSettings, id)
    };
  }),

  // Alternar estado de regla
  toggleRule: (id: string) => set((state) => {
    const normalizedScanSettings = normalizeScanSettings(state.scanSettings);
    return {
      scanSettings: toggleRuleInAllLists(normalizedScanSettings, id)
    };
  }),

  // Configurar uso de emisores predeterminados
  setUseDefaultSenders: (enabled: boolean) => set((state) => ({
    scanSettings: {
      ...state.scanSettings,
      useDefaultSenders: enabled
    }
  })),

  // Configurar días a escanear
  setDaysToScan: (days: number) => set((state) => ({
    scanSettings: {
      ...state.scanSettings,
      daysToScan: Math.max(1, Math.min(365, days))
    }
  })),

  // Alternar categoría habilitada
  toggleCategory: (category: EventCategory) => set((state) => {
    const categories = state.scanSettings.enabledCategories;
    const isEnabled = categories.includes(category);

    // No permitir deshabilitar todas las categorías
    if (isEnabled && categories.length === 1) {
      return state;
    }

    return {
      scanSettings: {
        ...state.scanSettings,
        enabledCategories: isEnabled
          ? categories.filter(c => c !== category)
          : [...categories, category]
      }
    };
  }),

  // Helper: obtener eventos de un mes específico
  getMonthlyEvents: (month: string) => {
    const state = get();
    return state.events
      .filter(e => e.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  // Helper: obtener resumen mensual
  getMonthlySummary: (month: string): MonthlySummary => {
    const state = get();
    const monthEvents = state.events.filter(e => e.date.startsWith(month));

    const totalIncome = monthEvents
      .filter(e => e.direction === 'income')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalExpense = monthEvents
      .filter(e => e.direction === 'expense')
      .reduce((acc, e) => acc + e.amount, 0);

    return {
      month,
      totalIncome,
      totalExpense,
      netDifference: totalIncome - totalExpense,
      eventCount: monthEvents.length
    };
  },

  // Helper: exportar a CSV
  exportToCSV: () => {
    const state = get();
    const headers = ['Fecha', 'Descripción', 'Fuente', 'Categoría', 'Tipo', 'Monto'];
    const rows = state.events.map(e => [
      e.date,
      e.description,
      e.source,
      categoryLabels[e.category] || e.category,
      e.direction === 'income' ? 'Ingreso' : 'Egreso',
      e.amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${sanitizeCsvCell(String(cell))}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}),
    {
      name: 'mail-financial-sync-storage',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir datos necesarios (no funciones ni estados temporales)
      partialize: (state) => ({
        darkMode: state.darkMode,
        notificationsEnabled: state.notificationsEnabled,
        selectedMonth: state.selectedMonth,
        scanSettings: state.scanSettings
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState>;
        const notificationPermission = getCurrentNotificationPermission();
        return {
          ...currentState,
          ...persisted,
          user: null,
          authStatus: 'unauthenticated',
          notificationsEnabled: notificationPermission === 'granted'
            ? Boolean(persisted.notificationsEnabled)
            : false,
          notificationPermission,
          events: [],
          scanSettings: normalizeScanSettings(persisted.scanSettings),
          syncMetadata: DEFAULT_SYNC_METADATA
        };
      },
      // Al rehidratar, restaurar estado de autenticación
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[Store] Error rehidratando:', error);
          return;
        }
        if (state) {
          debugLog('[Store] Datos rehidratados desde localStorage');
          state.events = [];
          state.user = null;
          state.authStatus = 'unauthenticated';
          state.syncMetadata = DEFAULT_SYNC_METADATA;
          state.scanSettings = normalizeScanSettings(state.scanSettings);

          state.notificationPermission = getCurrentNotificationPermission();
          if (state.notificationPermission !== 'granted') {
            state.notificationsEnabled = false;
          }
        }
      }
    }
  )
);
