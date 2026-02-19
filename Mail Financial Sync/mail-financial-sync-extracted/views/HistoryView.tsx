import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const HistoryView: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, setSelectedMonth, selectedMonth } = useAppStore();

  // Aggregate transactions by month
  const historyData = transactions.reduce((acc, t) => {
    const monthKey = t.fullDate.substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') acc[monthKey].income += t.amount;
    else acc[monthKey].expense += t.amount;
    return acc;
  }, {} as Record<string, { income: number, expense: number }>);

  // Sort months descending
  const sortedMonths = Object.keys(historyData).sort((a, b) => b.localeCompare(a));

  const totalDetected = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const handleMonthClick = (monthKey: string) => {
    setSelectedMonth(monthKey);
    navigate('/dashboard');
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            aria-label="Back to dashboard"
            onClick={() => navigate('/dashboard')}
            className="p-1 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full active:bg-gray-100"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">History</h1>
        </div>
        <button aria-label="Filter history (coming soon)" className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full active:bg-gray-100">
          <span className="material-symbols-outlined text-[24px]">filter_list</span>
        </button>
      </header>

      <main className="flex-1 px-6 pt-6 pb-24 overflow-y-auto bg-gray-50 dark:bg-bg-dark">
        <div className="mb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Detected (All time)</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">${totalDetected.toLocaleString('en-US', {maximumFractionDigits: 0})}</h2>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">in expenses</span>
          </div>
        </div>

        <div className="relative space-y-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
          {sortedMonths.map((monthKey, idx) => {
             const stats = historyData[monthKey];
             const dateObj = new Date(monthKey + '-02');
             const name = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
             const isActive = monthKey === selectedMonth;

             return (
                <div key={idx} onClick={() => handleMonthClick(monthKey)} className="relative group cursor-pointer active:opacity-70 transition-opacity">
                  <div className={`absolute -left-[25px] top-1.5 w-4 h-4 bg-white dark:bg-surface-dark border-2 rounded-full transition-colors ${isActive ? 'border-gray-500 dark:border-gray-300' : 'border-gray-200 dark:border-gray-700 group-hover:border-gray-400'}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{name}</h3>
                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-[20px]">chevron_right</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Income</p>
                      <p className="text-base font-semibold text-green-500 dark:text-green-400">+${stats.income.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Expenses</p>
                      <p className="text-base font-semibold text-red-500 dark:text-red-400">-${stats.expense.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </div>
             );
          })}
        </div>

        <div className="mt-12 text-center pb-8">
          <p className="text-xs text-gray-400 opacity-60">
            Only transactions detected in email are shown.<br />
            This is not a bank statement.
          </p>
        </div>
      </main>
    </>
  );
};
