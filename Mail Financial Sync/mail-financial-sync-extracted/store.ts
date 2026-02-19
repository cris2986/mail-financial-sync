import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Transaction } from './types';
import { syncFinancialEvents } from './gmailSync';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function latestMonthFromTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) return currentMonth();

  const sorted = [...transactions].sort((a, b) => (a.fullDate < b.fullDate ? 1 : -1));
  return sorted[0].fullDate.slice(0, 7);
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to sync with Gmail. Please try again.';
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      authStatus: 'idle',
      syncError: null,
      transactions: [],
      darkMode: false,
      selectedMonth: currentMonth(),

      login: async () => {
        set({ authStatus: 'loading', syncError: null });

        try {
          const { user, transactions } = await syncFinancialEvents();
          const selectedMonth = latestMonthFromTransactions(transactions);

          set({
            user,
            authStatus: 'authenticated',
            transactions,
            selectedMonth,
            syncError: null,
          });

          return transactions.length;
        } catch (error) {
          set({
            authStatus: 'unauthenticated',
            user: null,
            transactions: [],
            selectedMonth: currentMonth(),
            syncError: readableError(error),
          });
          throw error;
        }
      },

      logout: () =>
        set({
          user: null,
          authStatus: 'unauthenticated',
          syncError: null,
          transactions: [],
          selectedMonth: currentMonth(),
        }),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      setSelectedMonth: (month) => set({ selectedMonth: month }),
    }),
    {
      name: 'mail-financial-sync',
      partialize: (state) => ({
        user: state.user,
        authStatus: state.authStatus,
        transactions: state.transactions,
        darkMode: state.darkMode,
        selectedMonth: state.selectedMonth,
      }),
    }
  )
);
