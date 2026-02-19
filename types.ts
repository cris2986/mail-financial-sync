// Evento financiero detectado según Tech Doc
export type EventDirection = 'income' | 'expense';  // Ingreso / Egreso
export type EventCategory = 'card' | 'credit' | 'service' | 'transfer' | 'income';  // Pago tarjeta, Crédito, Servicio básico, Transferencia, Ingreso

export interface FinancialEvent {
  id: string;
  date: string;           // Fecha ISO "2023-10-24"
  displayDate: string;    // Fecha para mostrar "24 Oct"
  amount: number;         // Monto
  direction: EventDirection;  // Ingreso / Egreso
  category: EventCategory;    // Tipo general
  source: string;         // Fuente (emisor)
  description: string;    // Descripción breve
  icon: string;           // Icono Material
  iconColorClass: string;
  bgColorClass: string;
}

export interface User {
  email: string;
  name: string;
  isAuthenticated: boolean;
  googleId?: string;        // ID de Google
  picture?: string;         // URL de foto de perfil
  accessToken?: string;     // Token de acceso OAuth
  refreshToken?: string;    // Token de refresco OAuth
  tokenExpiresAt?: string;  // Fecha de expiración del token
}

export interface MonthlySummary {
  month: string;  // "YYYY-MM"
  totalIncome: number;
  totalExpense: number;
  netDifference: number;
  eventCount: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// Progreso detallado de sincronización
export interface SyncProgress {
  phase: 'searching' | 'downloading' | 'processing' | 'saving';
  currentStep: number;
  totalSteps: number;
  message: string;
}

// Reglas de filtrado para escaneo de correos
export interface EmailRule {
  id: string;
  type: 'sender' | 'keyword' | 'subject' | 'excluded_sender' | 'excluded_keyword' | 'excluded_subject';
  value: string;
  enabled: boolean;
  createdAt: string;
}

export interface ScanSettings {
  // Lista de emisores personalizados (adicionales a los predeterminados)
  customSenders: EmailRule[];
  // Palabras clave a buscar
  keywords: EmailRule[];
  // Lista de emisores bloqueados
  excludedSenders: EmailRule[];
  // Palabras clave bloqueadas en asunto/cuerpo
  excludedKeywords: EmailRule[];
  // Asuntos bloqueados
  excludedSubjects: EmailRule[];
  // Usar emisores predeterminados (bancos chilenos, etc.)
  useDefaultSenders: boolean;
  // Días hacia atrás para buscar (default 90)
  daysToScan: number;
  // Categorías habilitadas
  enabledCategories: EventCategory[];
}

// Metadata de sincronización para sync incremental
export interface SyncMetadata {
  // Timestamp de la última sincronización exitosa
  lastSyncTimestamp: string | null;
  // IDs de correos ya procesados
  processedEmailIds: string[];
  // Cantidad de eventos sincronizados en última sesión
  lastSyncEventCount: number;
}

export interface AppState {
  user: User | null;
  authStatus: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  syncStatus: SyncStatus;
  syncError: string | null;
  syncProgress: SyncProgress | null;
  events: FinancialEvent[];
  darkMode: boolean;
  notificationsEnabled: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  selectedMonth: string; // Format "YYYY-MM"
  scanSettings: ScanSettings;
  syncMetadata: SyncMetadata;

  // Actions - Auth
  login: () => Promise<number>;
  loginWithGoogle: (code: string) => Promise<number>;
  loginWithGIS: () => Promise<number>;
  loginWithAccessToken: (accessToken: string, expiresInSeconds?: number) => Promise<number>;
  logout: () => Promise<void>;

  // Actions - Events
  syncEvents: (forceFullSync?: boolean) => Promise<void>;
  setEvents: (events: FinancialEvent[]) => void;
  deleteEvent: (id: string) => Promise<void>;
  clearSyncCache: () => void;
  ensureValidToken: () => Promise<string | null>;

  // Actions - UI
  toggleDarkMode: () => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setSelectedMonth: (month: string) => void;
  setAuthStatus: (status: AppState['authStatus']) => void;
  setSyncStatus: (status: SyncStatus, error?: string) => void;
  setSyncProgress: (progress: SyncProgress | null) => void;

  // Actions - Rules
  addRule: (type: EmailRule['type'], value: string) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  setUseDefaultSenders: (enabled: boolean) => void;
  setDaysToScan: (days: number) => void;
  toggleCategory: (category: EventCategory) => void;

  // Helpers
  getMonthlyEvents: (month: string) => FinancialEvent[];
  getMonthlySummary: (month: string) => MonthlySummary;
  exportToCSV: () => string;
}
