import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
  darkMode: boolean;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, darkMode }) => {
  return (
    <div className={`w-full h-full flex justify-center bg-gray-100 dark:bg-black transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <div className="w-full max-w-md h-full bg-white dark:bg-bg-dark flex flex-col relative shadow-2xl overflow-hidden sm:rounded-[2rem] sm:h-[95vh] sm:mt-[2.5vh] sm:border-[8px] sm:border-gray-900 dark:sm:border-gray-700">
        
        {/* Status Bar Mock */}
        <div className="flex justify-between items-center px-6 pt-3 pb-2 w-full z-30 text-xs font-medium bg-transparent absolute top-0 text-gray-900 dark:text-white">
            <div className="flex items-center gap-1">
                <span>9:41</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-90">
                <span className="material-symbols-outlined text-[16px]">signal_cellular_alt</span>
                <span className="material-symbols-outlined text-[16px]">wifi</span>
                <span className="material-symbols-outlined text-[16px]">battery_full</span>
            </div>
        </div>

        {children}
      </div>
    </div>
  );
};