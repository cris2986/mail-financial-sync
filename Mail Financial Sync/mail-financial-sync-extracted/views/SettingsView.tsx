import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, user, logout } = useAppStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col bg-bg-light dark:bg-bg-dark">
      <header className="sticky top-0 z-50 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 pt-12 pb-4 px-6">
        <div className="flex items-center justify-between">
          <button 
            aria-label="Back to dashboard"
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-primary"
          >
            <span className="material-icons-round text-2xl">arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold text-center flex-1 pr-8 text-gray-900 dark:text-white">Settings</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8 overflow-y-auto pb-24">
        {/* Account Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Account</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-primary text-xl">mail</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">Connected account</span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">{user?.email || 'Not connected'}</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></span>
                <span className="text-xs font-medium text-green-500 hidden sm:inline-block">Connected</span>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
              >
                <span className="text-red-500 font-medium">Disconnect Account</span>
                <span className="material-icons-round text-red-500/50 group-active:text-red-500 text-xl">logout</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Disconnecting will stop Gmail sync. You can reconnect at any time from the login screen.
          </p>
        </section>

        {/* Preferences Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Preferences</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            
            {/* Dark Mode Toggle */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <span className="material-icons-round text-lg">dark_mode</span>
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white">Dark Mode</span>
              </div>
              
              <button 
                aria-label="Toggle dark mode"
                aria-pressed={darkMode}
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {/* Notifications Toggle */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-icons-round text-lg">notifications</span>
                </div>
                <span className="text-base font-medium text-gray-900 dark:text-white">Sync Notifications</span>
              </div>
              <button
                aria-label="Sync notifications (coming soon)"
                disabled
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none bg-gray-200 dark:bg-gray-700`}
              >
                <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out" />
              </button>
            </div>
          </div>
        </section>

        {/* Legal & Privacy Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Privacy</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            <button onClick={() => navigate('/legal/terms')} className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">Terms of Service</span>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>
            <button onClick={() => navigate('/legal/privacy')} className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">Privacy Policy</span>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>
            <button onClick={() => navigate('/legal/data')} className="w-full px-4 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">Data Usage Agreement</span>
              </div>
              <span className="material-icons-round text-gray-400 text-xl group-hover:text-primary transition-colors">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Footer Disclosure */}
        <footer className="mt-8 px-4 text-center">
          <div className="flex justify-center mb-4">
            <span className="material-icons-round text-gray-400 dark:text-gray-600 text-3xl">verified_user</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed font-medium">
            Mail Financial Sync reads financial notification emails and extracts transaction metadata only.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
            App Version 1.2.4 (Build 405)
          </p>
        </footer>
      </main>
    </div>
  );
};
