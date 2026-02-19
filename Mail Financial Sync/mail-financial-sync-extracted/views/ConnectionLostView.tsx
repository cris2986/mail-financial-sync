import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const ConnectionLostView: React.FC = () => {
  const navigate = useNavigate();
  const login = useAppStore((state) => state.login);
  const syncError = useAppStore((state) => state.syncError);
  const authStatus = useAppStore((state) => state.authStatus);

  const handleRetry = async () => {
    navigate('/loading');
    try {
      const count = await login();
      navigate(count > 0 ? '/dashboard' : '/empty', { replace: true });
    } catch {
      navigate('/error', { replace: true });
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-8 relative w-full max-w-md mx-auto h-full bg-bg-light dark:bg-bg-dark">
      <div className="mb-10 relative">
        <div className="absolute inset-0 bg-primary/20 dark:bg-primary/10 rounded-full blur-2xl transform scale-150 animate-pulse"></div>
        <div className="relative w-32 h-32 rounded-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-xl flex items-center justify-center">
          <div className="relative">
            <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-500">cloud_off</span>
            <div className="absolute bottom-1 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-3 mb-12">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Sync Connection Lost</h1>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px] mx-auto text-sm">
          We couldn't reach your Gmail account. Please check your network or reconnect access.
        </p>
        {syncError && <p className="text-xs text-red-500">{syncError}</p>}
      </div>

      <div className="w-full space-y-4">
        <button
          onClick={handleRetry}
          disabled={authStatus === 'loading'}
          className="w-full group relative flex items-center justify-center py-4 px-6 border border-transparent text-base font-medium rounded-xl text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {authStatus === 'loading' ? 'Retrying...' : 'Retry Connection'}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-center py-4 px-6 border border-gray-200 dark:border-gray-700 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-gray-700 active:bg-gray-100 dark:active:bg-gray-700"
        >
          Check Settings
        </button>
      </div>
    </main>
  );
};
