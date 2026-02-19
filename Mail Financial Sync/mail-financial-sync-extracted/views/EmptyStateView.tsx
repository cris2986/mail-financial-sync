import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const EmptyStateView: React.FC = () => {
  const navigate = useNavigate();
  const login = useAppStore((state) => state.login);
  const authStatus = useAppStore((state) => state.authStatus);

  const handleRescan = async () => {
    navigate('/loading');
    try {
      const count = await login();
      navigate(count > 0 ? '/dashboard' : '/empty', { replace: true });
    } catch {
      navigate('/error', { replace: true });
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-bg-dark h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Header Area */}
      <div className="absolute top-0 left-0 w-full px-6 pt-12 flex justify-between items-center z-10">
        <button 
          aria-label="Open dashboard menu"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          <span className="material-symbols-outlined text-gray-800 dark:text-white">menu</span>
        </button>
        <span className="font-semibold text-sm tracking-wide uppercase text-gray-500 dark:text-gray-400">Dashboard</span>
        <button 
          aria-label="Open settings"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors"
          onClick={() => navigate('/settings')}
        >
          <span className="material-symbols-outlined text-gray-800 dark:text-white">account_circle</span>
        </button>
      </div>

      <main className="w-full max-w-sm flex flex-col items-center text-center mt-10 space-y-8">
        <div className="relative w-48 h-48 flex items-center justify-center mb-4">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full opacity-60 blur-xl transform scale-90"></div>
          <div className="relative z-10">
            <div className="w-32 h-24 bg-white dark:bg-surface-dark border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center relative transform -rotate-3 translate-y-2">
              <span className="material-symbols-outlined text-gray-300 dark:text-gray-500 text-6xl">mail</span>
            </div>
            <div className="absolute -top-4 -right-4 bg-white dark:bg-surface-dark rounded-full p-3 shadow-lg border border-gray-100 dark:border-gray-700 transform rotate-12">
              <span className="material-symbols-outlined text-primary text-5xl">search</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">No events detected yet</h1>
          <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
            We've synced your inbox but haven't found clear financial events for the selected period.
          </p>
        </div>

        <div className="w-full space-y-3 pt-4">
          <button 
            onClick={handleRescan}
            disabled={authStatus === 'loading'}
            className="w-full bg-primary text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            {authStatus === 'loading' ? 'Syncing...' : 'Re-scan Email'}
          </button>
          <button 
            onClick={() => navigate('/error')}
            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3.5 px-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            Check Connection Settings
          </button>
        </div>
      </main>

      <div className="absolute bottom-24 text-center px-10">
        <p className="text-xs text-gray-400">
          Mail Financial Sync detects explicit transaction notifications. Statement PDFs may be skipped.
        </p>
      </div>
    </div>
  );
};
