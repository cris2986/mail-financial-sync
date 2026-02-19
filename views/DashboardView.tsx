import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, categoryLabels } from '../store';
import { FinancialEvent } from '../types';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { events, selectedMonth, deleteEvent, setSelectedMonth, syncEvents, syncStatus, syncError, syncProgress } = useAppStore();
  const [eventToDelete, setEventToDelete] = useState<FinancialEvent | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isSyncing = syncStatus === 'syncing';

  // Escuchar cambios de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = async () => {
    await syncEvents();
  };

  // Memoizar filtrado y cálculos para evitar recálculos innecesarios
  const { filteredEvents, incomeEvents, expenseEvents, summary } = useMemo(() => {
    const filtered = events
      .filter(e => e.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));

    const income = filtered.filter(e => e.direction === 'income');
    const expense = filtered.filter(e => e.direction === 'expense');

    const totalIncome = income.reduce((acc, e) => acc + e.amount, 0);
    const totalExpense = expense.reduce((acc, e) => acc + e.amount, 0);

    return {
      filteredEvents: filtered,
      incomeEvents: income,
      expenseEvents: expense,
      summary: {
        totalIncome,
        totalExpense,
        netDifference: totalIncome - totalExpense,
        eventCount: filtered.length
      }
    };
  }, [events, selectedMonth]);

  // Formato del mes
  const dateObj = new Date(selectedMonth + '-02');
  const monthLabel = dateObj.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  // Calcular límites de navegación
  const { canGoBack, canGoForward, minMonth, maxMonth } = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Mes mínimo: el evento más antiguo o 12 meses atrás si no hay eventos
    let minMonth = currentMonth;
    if (events.length > 0) {
      const sortedDates = events.map(e => e.date).sort();
      minMonth = sortedDates[0].substring(0, 7);
    } else {
      const yearAgo = new Date(now);
      yearAgo.setMonth(yearAgo.getMonth() - 12);
      minMonth = yearAgo.toISOString().slice(0, 7);
    }

    // Mes máximo: mes actual (no permitir futuro)
    const maxMonth = currentMonth;

    return {
      canGoBack: selectedMonth > minMonth,
      canGoForward: selectedMonth < maxMonth,
      minMonth,
      maxMonth
    };
  }, [events, selectedMonth]);

  const handlePrevMonth = () => {
    if (!canGoBack) return;
    const prev = new Date(dateObj);
    prev.setMonth(prev.getMonth() - 1);
    setSelectedMonth(prev.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    if (!canGoForward) return;
    const next = new Date(dateObj);
    next.setMonth(next.getMonth() + 1);
    setSelectedMonth(next.toISOString().slice(0, 7));
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleDeleteClick = (event: FinancialEvent) => {
    setEventToDelete(event);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  const cancelDelete = () => {
    setEventToDelete(null);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-bg-dark">
      <header className="shrink-0 px-6 py-4 flex items-center justify-between bg-white dark:bg-bg-dark border-b border-gray-50 dark:border-gray-800 safe-top">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Resumen Mensual</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Sincronizar eventos"
            disabled={isSyncing || !isOnline}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-dark flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title={!isOnline ? 'Sin conexión' : 'Sincronizar'}
          >
            <span className={`material-symbols-outlined text-gray-600 dark:text-gray-400 ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="Ir a ajustes"
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-dark flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-bg-dark pb-24">
        {/* Banner de modo offline */}
        {!isOnline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-900/30 px-6 py-3 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-lg">wifi_off</span>
            <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Sin conexión a internet</span>
          </div>
        )}

        {/* Indicador de sincronización con progreso detallado */}
        {isSyncing && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 px-6 py-3 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 animate-spin text-lg">sync</span>
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {syncProgress?.message || 'Sincronizando correos...'}
              </span>
            </div>
            {syncProgress && syncProgress.totalSteps > 1 && (
              <div className="w-full max-w-xs">
                <div className="h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((syncProgress.currentStep / syncProgress.totalSteps) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-1">
                  {syncProgress.currentStep} de {syncProgress.totalSteps}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error de sincronización */}
        {syncError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 px-6 py-3 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">error</span>
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">{syncError}</span>
          </div>
        )}

        <div className="px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vista Estimada</h2>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={!canGoBack}
                className={`${canGoBack ? 'text-gray-400 hover:text-gray-600' : 'text-gray-200 dark:text-gray-700 cursor-not-allowed'}`}
              >
                <span className="material-icons-round text-sm">arrow_back_ios</span>
              </button>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium min-w-[110px] text-center capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={!canGoForward}
                className={`${canGoForward ? 'text-gray-400 hover:text-gray-600' : 'text-gray-200 dark:text-gray-700 cursor-not-allowed'}`}
              >
                <span className="material-icons-round text-sm">arrow_forward_ios</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-28">
              <div className="flex items-start justify-between">
                <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                  <span className="material-symbols-outlined text-xl">arrow_downward</span>
                </span>
                <span className="text-xs text-gray-400">{incomeEvents.length} eventos</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Ingresos Detectados</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">${formatCurrency(summary.totalIncome)}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-28">
              <div className="flex items-start justify-between">
                <span className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-1.5 rounded-lg">
                  <span className="material-symbols-outlined text-xl">arrow_upward</span>
                </span>
                <span className="text-xs text-gray-400">{expenseEvents.length} eventos</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Egresos Detectados</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">${formatCurrency(summary.totalExpense)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">Diferencia Estimada</span>
            <span className={`text-lg font-bold ${summary.netDifference >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-red-600 dark:text-red-400'}`}>
              {summary.netDifference >= 0 ? '+' : ''}${formatCurrency(summary.netDifference)}
            </span>
          </div>
        </div>

        <div className="px-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Eventos Detectados</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filteredEvents.length} de {events.length} total
            </span>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-700">

            {filteredEvents.length === 0 ? (
              <div className="p-6 text-center">
                <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl mb-2 block">inbox</span>
                <p className="text-gray-400 text-sm">
                  {events.length === 0
                    ? 'No hay eventos sincronizados. Presiona el botón de sincronizar.'
                    : 'No hay eventos para este mes. Usa las flechas para cambiar de mes.'}
                </p>
              </div>
            ) : filteredEvents.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${e.bgColorClass} ${e.iconColorClass}`}>
                    <span className="material-symbols-outlined text-[20px]">{e.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{e.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {e.source} • {e.displayDate} • <span className="text-gray-400">{categoryLabels[e.category]}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${e.direction === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                    {e.direction === 'income' ? '+' : '-'}${formatCurrency(e.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(e)}
                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors p-1"
                    title="Eliminar evento"
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
            Datos basados únicamente en correos detectados.<br />
            No reemplaza estados de cuenta oficiales.
          </p>
        </div>
      </main>

      {/* Modal de confirmación */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">delete</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">¿Eliminar evento?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {eventToDelete.description}<br />
                <span className="font-medium">${formatCurrency(eventToDelete.amount)}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
