export interface Transaction {
  id: string;
  title: string;
  merchant: string;
  date: string; // Display string like "Oct 24"
  fullDate: string; // ISO date for sorting/filtering "2023-10-24"
  amount: number;
  type: 'income' | 'expense';
  icon: string;
  iconColorClass: string;
  bgColorClass: string;
}

export interface User {
  email: string;
  name: string;
  isAuthenticated: boolean;
}

export interface AppState {
  user: User | null;
  authStatus: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  syncError: string | null;
  transactions: Transaction[];
  darkMode: boolean;
  selectedMonth: string; // Format "YYYY-MM"
  
  // Actions
  login: () => Promise<number>;
  logout: () => void;
  toggleDarkMode: () => void;
  deleteTransaction: (id: string) => void;
  setSelectedMonth: (month: string) => void;
}
