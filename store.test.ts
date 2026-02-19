import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialEvent } from './types';

const mocks = vi.hoisted(() => ({
  revokeGoogleAccess: vi.fn(),
  requestAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  fetchUserInfo: vi.fn(),
  clearTokenClient: vi.fn(),
  getGoogleImplicitAuthUrl: vi.fn(),
  getFinancialEvents: vi.fn(),
  createGmailService: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
  createEvents: vi.fn(),
  deleteEventByEmailId: vi.fn(),
  getSupabase: vi.fn(),
  getCurrentNotificationPermission: vi.fn(() => 'default'),
  requestNotificationPermission: vi.fn(),
  notifyNewEvents: vi.fn()
}));

vi.mock('./services/googleAuth', () => ({
  revokeGoogleAccess: mocks.revokeGoogleAccess,
  getGoogleImplicitAuthUrl: mocks.getGoogleImplicitAuthUrl
}));

vi.mock('./services/googleIdentity', () => ({
  requestAccessToken: mocks.requestAccessToken,
  refreshAccessToken: mocks.refreshAccessToken,
  fetchUserInfo: mocks.fetchUserInfo,
  clearTokenClient: mocks.clearTokenClient
}));

vi.mock('./services/gmailApi', () => ({
  createGmailService: mocks.createGmailService
}));

vi.mock('./services/supabase', () => ({
  getSupabase: mocks.getSupabase
}));

vi.mock('./services/notifications', () => ({
  getCurrentNotificationPermission: mocks.getCurrentNotificationPermission,
  requestNotificationPermission: mocks.requestNotificationPermission,
  notifyNewEvents: mocks.notifyNewEvents
}));

import { useAppStore } from './store';

const buildEvent = (): FinancialEvent => ({
  id: 'msg-1',
  date: '2026-02-16',
  displayDate: '16 feb',
  amount: 12000,
  direction: 'expense',
  category: 'service',
  source: 'Enel',
  description: 'Pago de luz',
  icon: 'receipt_long',
  iconColorClass: 'text-blue-600',
  bgColorClass: 'bg-blue-50'
});

describe('Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.persist.clearStorage();

    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

    mocks.getFinancialEvents.mockResolvedValue([]);
    mocks.createGmailService.mockReturnValue({
      getFinancialEvents: mocks.getFinancialEvents
    });
    mocks.getSupabase.mockReturnValue(null);
    mocks.getCurrentNotificationPermission.mockReturnValue('default');
    mocks.requestNotificationPermission.mockResolvedValue('granted');
    mocks.notifyNewEvents.mockResolvedValue(undefined);
    mocks.revokeGoogleAccess.mockResolvedValue(true);
    mocks.getGoogleImplicitAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?response_type=token');
    mocks.requestAccessToken.mockResolvedValue({
      accessToken: 'access-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    mocks.fetchUserInfo.mockResolvedValue({
      id: 'google-user-1',
      email: 'user@gmail.com',
      name: 'Test User'
    });
    mocks.refreshAccessToken.mockResolvedValue({
      accessToken: 'refreshed-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    mocks.getUser.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({
      id: 'sup-user-1'
    });
    mocks.createEvents.mockResolvedValue([]);
    mocks.deleteEventByEmailId.mockResolvedValue(true);
  });

  it('autentica con GIS y sincroniza eventos reales', async () => {
    const event = buildEvent();
    mocks.getFinancialEvents.mockResolvedValue([event]);

    const count = await useAppStore.getState().loginWithGIS();
    const state = useAppStore.getState();

    expect(count).toBe(1);
    expect(state.authStatus).toBe('authenticated');
    expect(state.user?.email).toBe('user@gmail.com');
    expect(state.events).toEqual([event]);
    expect(state.syncStatus).toBe('success');
  });

  it('autentica con access token directo y sincroniza eventos', async () => {
    const event = buildEvent();
    mocks.getFinancialEvents.mockResolvedValue([event]);

    const count = await useAppStore.getState().loginWithAccessToken('direct-access-token', 3600);
    const state = useAppStore.getState();

    expect(count).toBe(1);
    expect(state.authStatus).toBe('authenticated');
    expect(state.user?.email).toBe('user@gmail.com');
    expect(state.user?.accessToken).toBe('direct-access-token');
    expect(state.events).toEqual([event]);
    expect(state.syncStatus).toBe('success');
  });

  it('falla login GIS cuando OAuth devuelve error', async () => {
    mocks.requestAccessToken.mockRejectedValue(new Error('popup_closed'));

    await expect(useAppStore.getState().loginWithGIS()).rejects.toThrow('popup_closed');
    const state = useAppStore.getState();

    expect(state.authStatus).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.syncError).toContain('popup_closed');
  });

  it('reporta error de sincronización cuando está offline', async () => {
    useAppStore.setState({
      user: {
        email: 'user@gmail.com',
        name: 'Test User',
        isAuthenticated: true,
        googleId: 'google-user-1',
        accessToken: 'access-token',
        tokenExpiresAt: new Date(Date.now() + 60_000).toISOString()
      },
      authStatus: 'authenticated'
    });
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });

    await useAppStore.getState().syncEvents();
    const state = useAppStore.getState();

    expect(state.syncStatus).toBe('error');
    expect(state.syncError).toContain('Sin conexión a internet');
    expect(mocks.createGmailService).not.toHaveBeenCalled();
  });

  it('logout limpia sesión y estado de sincronización', async () => {
    useAppStore.setState({
      user: {
        email: 'user@gmail.com',
        name: 'Test User',
        isAuthenticated: true,
        googleId: 'google-user-1',
        accessToken: 'access-token'
      },
      events: [buildEvent()],
      authStatus: 'authenticated',
      syncStatus: 'success',
      syncError: 'x'
    });

    await useAppStore.getState().logout();
    const state = useAppStore.getState();
    const currentMonth = new Date().toISOString().slice(0, 7);

    expect(state.user).toBeNull();
    expect(state.events).toEqual([]);
    expect(state.authStatus).toBe('unauthenticated');
    expect(state.syncStatus).toBe('idle');
    expect(state.syncError).toBeNull();
    expect(state.selectedMonth).toBe(currentMonth);
    expect(state.syncMetadata).toEqual({
      lastSyncTimestamp: null,
      processedEmailIds: [],
      lastSyncEventCount: 0
    });
  });

  it('deleteEvent elimina localmente y persiste en Supabase cuando aplica', async () => {
    const event = buildEvent();
    mocks.getSupabase.mockReturnValue({
      getUser: mocks.getUser,
      deleteEventByEmailId: mocks.deleteEventByEmailId
    });
    mocks.getUser.mockResolvedValue({ id: 'sup-user-1' });

    useAppStore.setState({
      user: {
        email: 'user@gmail.com',
        name: 'Test User',
        isAuthenticated: true,
        googleId: 'google-user-1',
        accessToken: 'access-token'
      },
      events: [event],
      authStatus: 'authenticated'
    });

    await useAppStore.getState().deleteEvent(event.id);
    const state = useAppStore.getState();

    expect(state.events).toEqual([]);
    expect(mocks.deleteEventByEmailId).toHaveBeenCalledWith('sup-user-1', event.id);
  });

  it('crea usuario en Supabase cuando no existe y guarda eventos nuevos', async () => {
    const event = buildEvent();
    mocks.getFinancialEvents.mockResolvedValue([event]);
    mocks.getSupabase.mockReturnValue({
      getUser: mocks.getUser,
      createUser: mocks.createUser,
      createEvents: mocks.createEvents
    });
    mocks.getUser.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({ id: 'sup-user-1' });

    await useAppStore.getState().loginWithGIS();

    expect(mocks.createUser).toHaveBeenCalledWith({
      email: 'user@gmail.com',
      name: 'Test User',
      google_id: 'google-user-1'
    });
    expect(mocks.createEvents).toHaveBeenCalledTimes(1);
  });

  it('exporta CSV protegido contra formula injection', () => {
    const event = {
      ...buildEvent(),
      description: '=HYPERLINK(\"http://malicioso\")',
      source: '@evil'
    };
    useAppStore.setState({
      events: [event]
    });

    const csv = useAppStore.getState().exportToCSV();

    expect(csv).toContain(`"'=HYPERLINK(""http://malicioso"")"`);
    expect(csv).toContain(`"'@evil"`);
  });

  it('administra reglas inversas de bloqueo en scanSettings', () => {
    const store = useAppStore.getState();

    store.addRule('excluded_sender', 'Promos@Santander.cl');
    store.addRule('excluded_keyword', 'PreAprobado');
    store.addRule('excluded_subject', 'Tenemos el mejor regalo para tu hijo');

    let state = useAppStore.getState();
    expect(state.scanSettings.excludedSenders).toHaveLength(1);
    expect(state.scanSettings.excludedKeywords).toHaveLength(1);
    expect(state.scanSettings.excludedSubjects).toHaveLength(1);
    expect(state.scanSettings.excludedSenders[0].value).toBe('promos@santander.cl');
    expect(state.scanSettings.excludedKeywords[0].value).toBe('preaprobado');
    expect(state.scanSettings.excludedSubjects[0].value).toBe('tenemos el mejor regalo para tu hijo');

    const senderRuleId = state.scanSettings.excludedSenders[0].id;
    useAppStore.getState().toggleRule(senderRuleId);

    state = useAppStore.getState();
    expect(state.scanSettings.excludedSenders[0].enabled).toBe(false);

    useAppStore.getState().removeRule(senderRuleId);
    state = useAppStore.getState();
    expect(state.scanSettings.excludedSenders).toHaveLength(0);
  });

  it('activa notificaciones solo cuando el permiso es otorgado', async () => {
    mocks.requestNotificationPermission.mockResolvedValue('granted');

    await useAppStore.getState().setNotificationsEnabled(true);
    let state = useAppStore.getState();
    expect(state.notificationsEnabled).toBe(true);
    expect(state.notificationPermission).toBe('granted');

    mocks.requestNotificationPermission.mockResolvedValue('denied');
    await useAppStore.getState().setNotificationsEnabled(true);
    state = useAppStore.getState();
    expect(state.notificationsEnabled).toBe(false);
    expect(state.notificationPermission).toBe('denied');
  });

  it('notifica nuevos eventos en sincronización incremental', async () => {
    const event = buildEvent();
    mocks.getFinancialEvents.mockResolvedValue([event]);

    useAppStore.setState({
      user: {
        email: 'user@gmail.com',
        name: 'Test User',
        isAuthenticated: true,
        googleId: 'google-user-1',
        accessToken: 'access-token',
        tokenExpiresAt: new Date(Date.now() + 60_000).toISOString()
      },
      authStatus: 'authenticated',
      notificationsEnabled: true,
      syncMetadata: {
        lastSyncTimestamp: new Date(Date.now() - 60_000).toISOString(),
        processedEmailIds: [],
        lastSyncEventCount: 0
      }
    });

    await useAppStore.getState().syncEvents(false);

    expect(mocks.notifyNewEvents).toHaveBeenCalledWith([event]);
  });
});
