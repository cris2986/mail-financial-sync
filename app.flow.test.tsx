import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { FinancialEvent } from './types';

const mocks = vi.hoisted(() => ({
  requestAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  fetchUserInfo: vi.fn(),
  clearTokenClient: vi.fn(),
  revokeGoogleAccess: vi.fn(),
  getGoogleImplicitAuthUrl: vi.fn(),
  getFinancialEvents: vi.fn(),
  createGmailService: vi.fn(),
  getSupabase: vi.fn()
}));

vi.mock('./services/googleIdentity', () => ({
  requestAccessToken: mocks.requestAccessToken,
  refreshAccessToken: mocks.refreshAccessToken,
  fetchUserInfo: mocks.fetchUserInfo,
  clearTokenClient: mocks.clearTokenClient,
  isGISConfigured: vi.fn(() => true)
}));

vi.mock('./services/googleAuth', () => ({
  revokeGoogleAccess: mocks.revokeGoogleAccess,
  getGoogleImplicitAuthUrl: mocks.getGoogleImplicitAuthUrl
}));

vi.mock('./services/gmailApi', () => ({
  createGmailService: mocks.createGmailService
}));

vi.mock('./services/supabase', () => ({
  getSupabase: mocks.getSupabase
}));

import App from './App';
import { useAppStore } from './store';

const buildEvent = (): FinancialEvent => ({
  id: 'msg-1',
  date: '2026-02-16',
  displayDate: '16 feb',
  amount: 12500,
  direction: 'expense',
  category: 'service',
  source: 'Enel',
  description: 'Pago de luz',
  icon: 'receipt_long',
  iconColorClass: 'text-blue-600',
  bgColorClass: 'bg-blue-50'
});

const renderApp = (path = '/login') =>
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

describe('Flujo de usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.persist.clearStorage();

    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

    mocks.getSupabase.mockReturnValue(null);
    mocks.createGmailService.mockReturnValue({
      getFinancialEvents: mocks.getFinancialEvents
    });
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
      accessToken: 'access-token-2',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    mocks.revokeGoogleAccess.mockResolvedValue(true);
    mocks.getGoogleImplicitAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?response_type=token');
  });

  it('completa login real, navegación principal y logout', async () => {
    mocks.getFinancialEvents.mockResolvedValue([buildEvent()]);
    const user = userEvent.setup();

    renderApp('/dashboard');
    expect(await screen.findByRole('button', { name: /Conectar con Gmail/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Conectar con Gmail/i }));
    expect(await screen.findByText(/Resumen Mensual/i)).toBeInTheDocument();
    expect(await screen.findByText(/Pago de luz/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Historial/i }));
    expect(await screen.findByRole('heading', { name: /Historial/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ir a Resumen/i }));
    expect(await screen.findByText(/Resumen Mensual/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ir a Ajustes' }));
    expect(await screen.findByRole('heading', { name: /Ajustes/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Desconectar Cuenta/i }));
    expect(await screen.findByRole('button', { name: /Conectar con Gmail/i })).toBeInTheDocument();
  });

  it('envía a empty state cuando no hay eventos y permite reescaneo', async () => {
    mocks.getFinancialEvents.mockResolvedValue([]);
    const user = userEvent.setup();

    renderApp('/login');
    await user.click(await screen.findByRole('button', { name: /Conectar con Gmail/i }));

    expect(await screen.findByText(/Sin eventos detectados/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Re-escanear Correo/i }));
    await waitFor(() => {
      expect(mocks.getFinancialEvents).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/Sin eventos detectados/i)).toBeInTheDocument();
  });
});
