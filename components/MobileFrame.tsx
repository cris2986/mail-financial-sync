import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
  darkMode: boolean;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, darkMode }) => {
  return (
    <div className={`w-full h-full ${darkMode ? 'dark' : ''}`}>
      <div className="w-full h-full bg-white dark:bg-bg-dark flex flex-col relative overflow-hidden">
        {children}
      </div>
    </div>
  );
};
