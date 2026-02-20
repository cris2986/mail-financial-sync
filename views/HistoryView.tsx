import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const HistoryView: React.FC = () => {
  const navigate = useNavigate();
  const events = useAppStore((state) => state.events);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const exportToCSV = useAppStore((state) => state.exportToCSV);

  // Agregar eventos por mes
  const historyData = events.reduce((acc, e) => {
    const monthKey = e.date.substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expense: 0 };
    }
    if (e.direction === 'income') acc[monthKey].income += e.amount;
    else acc[monthKey].expense += e.amount;
    return acc;
  }, {} as Record<string, { income: number, expense: number }>);

  // Ordenar meses descendente
  const sortedMonths = Object.keys(historyData).sort((a, b) => b.localeCompare(a));

  const totalExpenses = events
    .filter(e => e.direction === 'expense')
    .reduce((acc, e) => acc + e.amount, 0);

  const handleMonthClick = (monthKey: string) => {
    setSelectedMonth(monthKey);
    navigate('/dashboard');
  };

  const handleExport = () => {
    const csvContent = exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `eventos-financieros-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Volver al resumen"
            className="p-1 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full active:bg-gray-100"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Historial</h1>
        </div>
        <button
          type="button"
          onClick={handleExport}
          aria-label="Exportar CSV"
          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full active:bg-gray-100"
          title="Exportar CSV"
        >
          <span className="material-symbols-outlined text-[24px]">download</span>
        </button>
      </header>

      <main className="flex-1 px-6 pt-6 pb-24 overflow-y-auto bg-gray-50 dark:bg-bg-dark">
        <div className="mb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Detectado (Todo el tiempo)</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">${formatCurrency(totalExpenses)}</h2>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">en egresos</span>
          </div>
        </div>

        <div className="relative space-y-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
          {sortedMonths.map((monthKey, idx) => {
            const stats = historyData[monthKey];
            const dateObj = new Date(monthKey + '-02');
            const name = dateObj.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
            const isActive = monthKey === selectedMonth;

            return (
              <div key={idx} onClick={() => handleMonthClick(monthKey)} className="relative group cursor-pointer active:opacity-70 transition-opacity">
                <div className={`absolute -left-[25px] top-1.5 w-4 h-4 bg-white dark:bg-surface-dark border-2 rounded-full transition-colors ${isActive ? 'border-gray-500 dark:border-gray-300' : 'border-gray-200 dark:border-gray-700 group-hover:border-gray-400'}`}></div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">{name}</h3>
                  <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-[20px]">chevron_right</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ingresos</p>
                    <p className="text-base font-semibold text-green-500 dark:text-green-400">+${formatCurrency(stats.income)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Egresos</p>
                    <p className="text-base font-semibold text-red-500 dark:text-red-400">-${formatCurrency(stats.expense)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center pb-8">
          <p className="text-xs text-gray-400 opacity-60">
            Solo se muestran eventos detectados en correos.<br />
            Esto no es un estado de cuenta.
          </p>
        </div>
      </main>
    </>
  );
};
