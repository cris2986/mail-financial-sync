import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItemClass = (active: boolean) => 
    `flex flex-col items-center gap-1 transition-colors ${
      active 
        ? 'text-primary dark:text-blue-400' 
        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
    }`;

  return (
    <nav className="bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 pb-safe pt-3 px-6 flex justify-around items-center text-xs font-medium safe-bottom absolute bottom-0 w-full z-20 h-[80px]">
      <button 
        aria-label="Go to summary"
        className={navItemClass(isActive('/dashboard') || isActive('/empty'))}
        onClick={() => navigate('/dashboard')}
      >
        <span className={`material-symbols-outlined text-[24px] ${isActive('/dashboard') ? 'filled' : ''}`}>dashboard</span>
        <span>Summary</span>
      </button>
      <button 
        aria-label="Go to history"
        className={navItemClass(isActive('/history'))}
        onClick={() => navigate('/history')}
      >
        <span className="material-symbols-outlined text-[24px]">history</span>
        <span>History</span>
      </button>
      <button 
        aria-label="Go to settings"
        className={navItemClass(isActive('/settings'))}
        onClick={() => navigate('/settings')}
      >
        <span className="material-symbols-outlined text-[24px]">settings</span>
        <span>Settings</span>
      </button>
    </nav>
  );
};
