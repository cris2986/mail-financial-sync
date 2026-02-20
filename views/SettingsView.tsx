import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const darkMode = useAppStore((state) => state.darkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const syncMetadata = useAppStore((state) => state.syncMetadata);
  const clearSyncCache = useAppStore((state) => state.clearSyncCache);
  const syncEvents = useAppStore((state) => state.syncEvents);
  const events = useAppStore((state) => state.events);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const notificationPermission = useAppStore((state) => state.notificationPermission);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    navigate('/login');
  };

  const toggleNotifications = async () => {
    await setNotificationsEnabled(!notificationsEnabled);
  };

  const notificationStatusText = notificationPermission === 'unsupported'
    ? 'Tu navegador no soporta notificaciones.'
    : notificationPermission === 'denied'
      ? 'Notificaciones bloqueadas. Debes habilitarlas en tu navegador.'
      : notificationsEnabled
        ? 'Recibirás avisos cuando se detecten nuevas transacciones.'
        : 'Notificaciones desactivadas.';

  return (
    <div className="h-full flex flex-col bg-bg-light dark:bg-bg-dark">
      <header className="sticky top-0 z-50 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 px-6 safe-top">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Volver al resumen"
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-primary"
          >
            <span className="material-icons-round text-2xl">arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold text-center flex-1 pr-8 text-gray-900 dark:text-white">Ajustes</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8 overflow-y-auto pb-24">
        {/* Sección Cuenta */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Cuenta</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-primary text-xl">mail</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">Conectado a</span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">{user?.email || 'No conectado'}</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${syncStatus === 'error' ? 'bg-red-500' : syncStatus === 'syncing' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                <span className={`text-xs font-medium hidden sm:inline-block ${syncStatus === 'error' ? 'text-red-500' : syncStatus === 'syncing' ? 'text-yellow-500' : 'text-green-500'}`}>
                  {syncStatus === 'error' ? 'Error Sync' : syncStatus === 'syncing' ? 'Sincronizando' : 'Conectado'}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
              >
                <span className="text-red-500 font-medium">{isLoggingOut ? 'Desconectando...' : 'Desconectar Cuenta'}</span>
                <span className="material-icons-round text-red-500/50 group-active:text-red-500 text-xl">logout</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Desconectar detendrá la sincronización inmediatamente. Los datos existentes se conservarán por 30 días.
          </p>
        </section>

        {/* Sección Preferencias */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Preferencias</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">

            {/* Toggle Modo Oscuro */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <span className="material-icons-round text-lg">dark_mode</span>
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white">Modo Oscuro</span>
              </div>

              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="Alternar modo oscuro"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`${darkMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {/* Toggle Notificaciones */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-icons-round text-lg">notifications</span>
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white">Notificaciones</span>
              </div>
              <button
                type="button"
                onClick={() => { void toggleNotifications(); }}
                aria-label="Alternar notificaciones"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${notificationsEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`}
                />
              </button>
            </div>
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{notificationStatusText}</p>
            </div>
          </div>
        </section>

        {/* Sección Escaneo */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Escaneo</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            <button
              type="button"
              onClick={() => navigate('/rules')}
              className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                  <span className="material-icons-round text-lg">filter_list</span>
                </div>
                <div className="text-left">
                  <span className="text-base font-medium text-gray-900 dark:text-white block">Reglas de Escaneo</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Configura qué correos analizar</span>
                </div>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>

            {/* Info de sincronización */}
            <div className="px-4 py-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <span className="material-icons-round text-lg">sync</span>
                </div>
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900 dark:text-white block">Sincronización</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {syncMetadata.lastSyncTimestamp
                      ? `Última: ${new Date(syncMetadata.lastSyncTimestamp).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : 'Sin sincronizar'}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {events.length} eventos
                </span>
              </div>
            </div>

            {/* Botón limpiar caché */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <span className="material-icons-round text-lg">refresh</span>
                </div>
                <div className="text-left">
                  <span className="text-base font-medium text-gray-900 dark:text-white block">Re-sincronizar Todo</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Borra caché y busca todos los correos</span>
                </div>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-orange-500 transition-colors">chevron_right</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            La sincronización es incremental: solo busca correos nuevos desde la última vez.
          </p>
        </section>

        {/* Sección Legal y Privacidad */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Privacidad</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            <button type="button" onClick={() => navigate('/legal/terms')} className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">Términos de Servicio</span>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>
            <button type="button" onClick={() => navigate('/legal/privacy')} className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">Política de Privacidad</span>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>
            <button type="button" onClick={() => navigate('/legal/data')} className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">Uso de Datos</span>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Pie de página */}
        <footer className="mt-8 px-4 text-center">
          <div className="flex justify-center mb-4">
            <span className="material-icons-round text-gray-400 dark:text-gray-600 text-3xl">verified_user</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed font-medium">
            Mail Financial Sync solo lee correos de notificaciones financieras. No almacenamos el contenido completo de tus correos.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
            Versión 1.0.0 (Build 1)
          </p>
        </footer>
      </main>

      {/* Modal de confirmación para limpiar caché */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">refresh</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">¿Re-sincronizar todo?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Esto eliminará todos los eventos guardados y buscará todos los correos desde cero.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSyncCache();
                  setShowClearConfirm(false);
                  syncEvents(true);
                  navigate('/dashboard');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
              >
                Re-sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
