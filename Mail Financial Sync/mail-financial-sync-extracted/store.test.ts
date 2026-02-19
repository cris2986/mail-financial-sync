import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./gmailSync', () => ({
  syncFinancialEvents: vi.fn(async () => ({
    user: {
      email: 'real.user@gmail.com',
      name: 'real.user',
      isAuthenticated: true,
    },
    transactions: [
      {
        id: 't-1',
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
        id: 't-2',
        title: 'Credit Card Payment',
        merchant: 'Bank',
        date: 'Feb 12',
        fullDate: '2026-02-12',
        amount: 1200,
        type: 'expense' as const,
        icon: 'credit_card',
        iconColorClass: 'text-orange-600',
        bgColorClass: 'bg-orange-50',
      },
    ],
  })),
}));

import { useAppStore } from './store';

const initialState = useAppStore.getInitialState();

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('authenticates user and loads synced transactions on login', async () => {
    const count = await useAppStore.getState().login();
    const state = useAppStore.getState();

    expect(count).toBe(2);
    expect(state.authStatus).toBe('authenticated');
    expect(state.user?.email).toBe('real.user@gmail.com');
    expect(state.transactions).toHaveLength(2);
    expect(state.selectedMonth).toBe('2026-02');
  });

  it('clears session and transactions on logout', async () => {
    await useAppStore.getState().login();
    useAppStore.getState().logout();
    const state = useAppStore.getState();

    expect(state.user).toBeNull();
    expect(state.authStatus).toBe('unauthenticated');
    expect(state.transactions).toHaveLength(0);
  });

  it('removes one transaction by id', async () => {
    await useAppStore.getState().login();
    const stateBefore = useAppStore.getState();
    const targetId = stateBefore.transactions[0]?.id;

    expect(targetId).toBeDefined();
    if (!targetId) return;

    stateBefore.deleteTransaction(targetId);
    const stateAfter = useAppStore.getState();

    expect(stateAfter.transactions.find((t) => t.id === targetId)).toBeUndefined();
    expect(stateAfter.transactions.length).toBe(stateBefore.transactions.length - 1);
  });
});
