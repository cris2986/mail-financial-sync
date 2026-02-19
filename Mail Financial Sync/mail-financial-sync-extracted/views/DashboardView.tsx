import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, selectedMonth, deleteTransaction, setSelectedMonth } = useAppStore();

  // Filter transactions by selected month (format YYYY-MM)
  const filteredTransactions = transactions.filter(t => t.fullDate.startsWith(selectedMonth));

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netDifference = totalIncome - totalExpense;

  // Month Formatting
  const dateObj = new Date(selectedMonth + '-02'); // Add day to avoid timezone shifts
  const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
     const prev = new Date(dateObj);
     prev.setMonth(prev.getMonth() - 1);
     setSelectedMonth(prev.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
     const next = new Date(dateObj);
     next.setMonth(next.getMonth() + 1);
     setSelectedMonth(next.toISOString().slice(0, 7));
  };

  return (
    <>
      <header className="px-6 py-4 pt-12 flex items-center justify-between bg-white dark:bg-bg-dark border-b border-gray-50 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Monthly Summary</h1>
        <button 
          aria-label="Open settings"
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-dark flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">settings</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-bg-dark pb-24">
        <div className="px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estimate</h2>
            <div className="flex items-center space-x-2">
                <button aria-label="Previous month" onClick={handlePrevMonth} className="text-gray-400 hover:text-gray-600"><span className="material-icons-round text-sm">arrow_back_ios</span></button>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium min-w-[90px] text-center">{monthLabel}</span>
                <button aria-label="Next month" onClick={handleNextMonth} className="text-gray-400 hover:text-gray-600"><span className="material-icons-round text-sm">arrow_forward_ios</span></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-28">
              <div className="flex items-start justify-between">
                <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                  <span className="material-symbols-outlined text-xl">arrow_downward</span>
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Detected Income</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">${totalIncome.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-28">
              <div className="flex items-start justify-between">
                <span className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-1.5 rounded-lg">
                  <span className="material-symbols-outlined text-xl">arrow_upward</span>
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Detected Expenses</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">${totalExpense.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">Net Difference</span>
            <span className={`text-lg font-bold ${netDifference >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-red-600 dark:text-red-400'}`}>
              {netDifference >= 0 ? '+' : ''}${netDifference.toLocaleString('en-US', {minimumFractionDigits: 2})}
            </span>
          </div>
        </div>

        <div className="px-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Detected Events</h2>
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
            
            {filteredTransactions.length === 0 ? (
                 <div className="p-6 text-center text-gray-400 text-sm">
                    No transactions found for this month.
                 </div>
            ) : filteredTransactions.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.bgColorClass} ${t.iconColorClass}`}>
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.merchant} • {t.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </span>
                  <button 
                    aria-label={`Delete ${t.title}`}
                    onClick={() => deleteTransaction(t.id)}
                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}

          </div>
        </div>

        <div className="px-8 mt-8 mb-4 text-center">
          <p className="text-xs text-gray-400 font-normal leading-relaxed">
            Data based on detected emails only.<br />
            Does not replace official bank statements.
          </p>
        </div>
      </main>
    </>
  );
};
