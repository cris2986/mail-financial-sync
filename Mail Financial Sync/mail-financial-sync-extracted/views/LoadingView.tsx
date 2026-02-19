import React from 'react';

export const LoadingView: React.FC = () => {
  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-bg-light dark:bg-bg-dark">
      <header className="px-5 pt-12 pb-4 bg-bg-light dark:bg-bg-dark sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer bg-[length:200%_100%]"></div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-shimmer bg-[length:200%_100%]"></div>
        </div>
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full w-fit mx-auto mb-2 animate-pulse">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] animate-spin">sync</span>
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Syncing with Gmail...</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-24 no-scrollbar">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-shimmer"></div>
                </div>
              </div>
              <div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 mb-2 rounded-full animate-shimmer"></div>
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-shimmer"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"></div>
            <div className="h-3 w-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"></div>
          </div>
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-md mb-2 animate-shimmer"></div>
          <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"></div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end mb-1">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-shimmer"></div>
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"></div>
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between ${i > 3 ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-shimmer"></div>
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-shimmer"></div>
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"></div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-shimmer"></div>
                  <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
