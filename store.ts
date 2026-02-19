import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, FinancialEvent, MonthlySummary, SyncStatus, SyncProgress, ScanSettings, EmailRule, EventCategory, SyncMetadata } from './types';
import { revokeGoogleAccess } from './services/googleAuth';
import { requestAccessToken, refreshAccessToken, fetchUserInfo, clearTokenClient } from './services/googleIdentity';
import { createGmailService } from './services/gmailApi';
import { getSupabase } from './services/supabase';
import { getCurrentNotificationPermission, notifyNewEvents, requestNotificationPermission } from './services/notifications';

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) window.console.log(...args);
};

// Mapeo de categorías a nombres en español
export const categoryLabels: Record<string, string> = {
  card: 'Pago Tarjeta',
  credit: 'Crédito',
  service: 'Servicio',
  transfer: 'Transferencia',
  income: 'Ingreso'
};

// Obtener mes actual en formato YYYY-MM
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Configuración de escaneo por defecto
const DEFAULT_SCAN_SETTINGS: ScanSettings = {
  customSenders: [],
  keywords: [],
  excludedSenders: [],
  excludedKeywords: [],
  excludedSubjects: [],
  useDefaultSenders: true,
  daysToScan: 90,
  enabledCategories: ['card', 'credit', 'service', 'transfer', 'income']
};

// Metadata de sincronización por defecto
const DEFAULT_SYNC_METADATA: SyncMetadata = {
  lastSyncTimestamp: null,
  processedEmailIds: [],
  lastSyncEventCount: 0
};

// Generar ID único para reglas
const generateRuleId = () => `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

type RuleListKey = 'customSenders' | 'keywords' | 'excludedSenders' | 'excludedKeywords' | 'excludedSubjects';

const RULE_LIST_BY_TYPE: Record<EmailRule['type'], RuleListKey> = {
  sender: 'customSenders',
  keyword: 'keywords',
  subject: 'keywords', // Compatibilidad con reglas legadas de tipo subject
  excluded_sender: 'excludedSenders',
  excluded_keyword: 'excludedKeywords',
  excluded_subject: 'excludedSubjects'
};

const normalizeScanSettings = (settings?: Partial<ScanSettings>): ScanSettings => ({
  ...DEFAULT_SCAN_SETTINGS,
  ...settings,
  customSenders: settings?.customSenders ?? [],
  keywords: settings?.keywords ?? [],
  excludedSenders: settings?.excludedSenders ?? [],
  excludedKeywords: settings?.excludedKeywords ?? [],
  excludedSubjects: settings?.excludedSubjects ?? [],
  enabledCategories: settings?.enabledCategories?.length
    ? settings.enabledCategories
    : DEFAULT_SCAN_SETTINGS.enabledCategories
});

const removeRuleFromAllLists = (scanSettings: ScanSettings, id: string): ScanSettings => ({
  ...scanSettings,
  customSenders: scanSettings.customSenders.filter((r) => r.id !== id),
  keywords: scanSettings.keywords.filter((r) => r.id !== id),
  excludedSenders: scanSettings.excludedSenders.filter((r) => r.id !== id),
  excludedKeywords: scanSettings.excludedKeywords.filter((r) => r.id !== id),
  excludedSubjects: scanSettings.excludedSubjects.filter((r) => r.id !== id)
});

const toggleRuleInAllLists = (scanSettings: ScanSettings, id: string): ScanSettings => ({
  ...scanSettings,
  customSenders: scanSettings.customSenders.map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  ),
  keywords: scanSettings.keywords.map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  ),
  excludedSenders: scanSettings.excludedSenders.map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  ),
  excludedKeywords: scanSettings.excludedKeywords.map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  ),
  excludedSubjects: scanSettings.excludedSubjects.map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  )
});

const getInitialNotificationPermission = (): NotificationPermission | 'unsupported' => {
  return getCurrentNotificationPermission();
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
    return get().loginWithGIS();
  },

  // Login con OAuth de Google
  loginWithGoogle: async (_code: string) => {
    const message = 'El flujo OAuth con código fue deshabilitado. Intenta iniciar sesión nuevamente desde la pantalla de conexión.';
    const hasAuthenticatedUser = !!get().user?.isAuthenticated;
    set({
      authStatus: hasAuthenticatedUser ? 'authenticated' : 'unauthenticated',
      syncError: message
    });
    throw new Error(message);
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

      // Sincronizar eventos después del login
      await get().syncEvents(true);
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

      await get().syncEvents(true);
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
      
      // Si el refresh requiere consentimiento, limpiar sesión para forzar re-autenticación
      if (error instanceof Error && error.message === 'REFRESH_NEEDS_CONSENT') {
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
      const shouldNotify = !forceFullSync && !!lastSync && notificationsEnabled && newEvents.length > 0;

      debugLog('[Sync] Nuevos eventos encontrados:', newEvents.length);

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
      const allProcessedIds = forceFullSync
        ? allEvents.map(e => e.id)
        : [...new Set([...processedIds, ...newEvents.map(e => e.id)])];

      // Guardar en Supabase si está configurado
      const supabase = getSupabase();
      if (supabase && user.googleId) {
        // Obtener usuario de Supabase
        const supabaseUser = await supabase.getUser(user.googleId);

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
            try {
              await supabase.createEvents(eventsToSave);
            } catch (error) {
              // Ignorar errores de duplicados - es normal en sincronización incremental
              if (error.message && error.message.includes('duplicate key')) {
                console.warn('[Sync] Algunos eventos ya existen en Supabase (normal en sync incremental)');
              } else {
                console.error('[Sync] Error guardando eventos en Supabase:', error);
                // No fallar toda la sincronización por errores de Supabase
              }
            }
          }
        }
      }

      set({
        events: allEvents,
        syncStatus: 'success',
        syncProgress: null, // Limpiar progreso al completar
        selectedMonth: allEvents.length > 0 ? allEvents[0].date.substring(0, 7) : getCurrentMonth(),
        syncMetadata: {
          lastSyncTimestamp: new Date().toISOString(),
          processedEmailIds: allProcessedIds,
          lastSyncEventCount: newEvents.length
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
        await supabase.deleteEvent(id);
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
    const newRule: EmailRule = {
      id: generateRuleId(),
      type,
      value: value.trim().toLowerCase(),
      enabled: true,
      createdAt: new Date().toISOString()
    };

    const listKey = RULE_LIST_BY_TYPE[type];
    const normalizedScanSettings = normalizeScanSettings(state.scanSettings);
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
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}),
    {
      name: 'mail-financial-sync-storage',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir datos necesarios (no funciones ni estados temporales)
      partialize: (state) => ({
        user: state.user,
        events: state.events,
        darkMode: state.darkMode,
        notificationsEnabled: state.notificationsEnabled,
        selectedMonth: state.selectedMonth,
        scanSettings: state.scanSettings,
        syncMetadata: state.syncMetadata
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState>;
        const notificationPermission = getCurrentNotificationPermission();
        return {
          ...currentState,
          ...persisted,
          notificationsEnabled: notificationPermission === 'granted'
            ? Boolean(persisted.notificationsEnabled)
            : false,
          notificationPermission,
          scanSettings: normalizeScanSettings(persisted.scanSettings),
          syncMetadata: {
            ...DEFAULT_SYNC_METADATA,
            ...(persisted.syncMetadata ?? {})
          }
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
          debugLog('[Store] Usuario:', state.user?.email || 'ninguno');
          debugLog('[Store] Eventos recuperados:', state.events?.length || 0);
          debugLog('[Store] Última sincronización:', state.syncMetadata?.lastSyncTimestamp);

          // Restaurar estado de autenticación basado en usuario persistido
          if (state.user?.isAuthenticated) {
            // El usuario estaba autenticado, restaurar estado
            // Nota: el token podría estar expirado, ensureValidToken lo manejará
            state.authStatus = 'authenticated';
            debugLog('[Store] Sesión restaurada para:', state.user.email);
          }

          state.notificationPermission = getCurrentNotificationPermission();
          if (state.notificationPermission !== 'granted') {
            state.notificationsEnabled = false;
          }
        }
      }
    }
  )
);
