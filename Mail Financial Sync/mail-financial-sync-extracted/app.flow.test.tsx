import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./gmailSync', () => ({
  syncFinancialEvents: vi.fn(async () => ({
    user: {
      email: 'real.user@gmail.com',
      name: 'real.user',
      isAuthenticated: true,
    },
    transactions: [
      {
        id: 'tx-01',
        title: 'Salary Deposit',
        merchant: 'Employer Payroll',
        date: 'Feb 10',
        fullDate: '2026-02-10',
        amount: 5000,
        type: 'income' as const,
        icon: 'account_balance',
        iconColorClass: 'text-green-600',
        bgColorClass: 'bg-green-50',
      },
      {
        id: 'tx-02',
        title: 'Credit Card Payment',
        merchant: 'Bank',
        date: 'Jan 09',
        fullDate: '2026-01-09',
        amount: 900,
        type: 'expense' as const,
        icon: 'credit_card',
        iconColorClass: 'text-orange-600',
        bgColorClass: 'bg-orange-50',
      },
    ],
  })),
}));

import App from './App';
import { useAppStore } from './store';

const initialState = useAppStore.getInitialState();

describe('app user flow', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects unauthenticated users from protected routes to login', async () => {
    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /connect with gmail/i })).toBeDefined();
  });

  it('completes the main user journey from login to logout and re-login', async () => {
    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /connect with gmail/i }));
    expect(await screen.findByRole('heading', { name: /monthly summary/i })).toBeDefined();
    expect(screen.getByText(/salary deposit/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /go to history/i }));
    expect(await screen.findByRole('heading', { name: /^history$/i })).toBeDefined();

    fireEvent.click(screen.getByText(/january 2026/i));
    expect(await screen.findByText(/january 2026/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /go to settings/i }));
    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /privacy policy/i }));
    expect(await screen.findByRole('heading', { name: /privacy policy/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /disconnect account/i }));
    expect(await screen.findByRole('button', { name: /connect with gmail/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /connect with gmail/i }));
    expect(await screen.findByRole('heading', { name: /monthly summary/i })).toBeDefined();
    expect(screen.getByText(/salary deposit/i)).toBeDefined();
  });
});
