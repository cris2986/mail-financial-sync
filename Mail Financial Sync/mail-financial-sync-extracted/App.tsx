import React from 'react';
import { Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import { MobileFrame } from './components/MobileFrame';
import { BottomNav } from './components/BottomNav';
import { ConnectView } from './views/ConnectView';
import { DashboardView } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';
import { EmptyStateView } from './views/EmptyStateView';
import { LoadingView } from './views/LoadingView';
import { SettingsView } from './views/SettingsView';
import { LegalView } from './views/LegalView';
import { ConnectionLostView } from './views/ConnectionLostView';
import { useAppStore } from './store';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, authStatus } = useAppStore();

  if (authStatus === 'loading') return <LoadingView />;

  if (!user?.isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  const { darkMode, user } = useAppStore();
  const location = useLocation();

  const showBottomNav =
    !!matchPath('/dashboard', location.pathname) ||
    !!matchPath('/history', location.pathname) ||
    !!matchPath('/settings/*', location.pathname) ||
    !!matchPath('/empty', location.pathname);

  return (
    <MobileFrame darkMode={darkMode}>
      <div className="h-full flex flex-col relative">
        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/login" element={<ConnectView />} />

            <Route path="/dashboard" element={<RequireAuth><DashboardView /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><HistoryView /></RequireAuth>} />
            <Route path="/settings/*" element={<RequireAuth><SettingsView /></RequireAuth>} />
            <Route path="/empty" element={<RequireAuth><EmptyStateView /></RequireAuth>} />

            <Route path="/error" element={<ConnectionLostView />} />
            <Route path="/loading" element={<LoadingView />} />

            <Route path="/legal/terms" element={<LegalView type="TERMS" />} />
            <Route path="/legal/privacy" element={<LegalView type="PRIVACY" />} />
            <Route path="/legal/data" element={<LegalView type="DATA_USAGE" />} />

            <Route
              path="*"
              element={<Navigate to={user?.isAuthenticated ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
        </div>

        {showBottomNav && <BottomNav />}
      </div>
    </MobileFrame>
  );
};

export default App;