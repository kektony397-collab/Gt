import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { db, initSettings } from './db';
import { ThemeType } from './types';
import Sidebar from './components/Sidebar';
import { 
  Search, Bell, UserCircle, Loader2
} from 'lucide-react';

const Dashboard = lazy(() => import('./features/Dashboard'));
const Inventory = lazy(() => import('./features/Inventory'));
const Parties = lazy(() => import('./features/Parties'));
const Billing = lazy(() => import('./features/Billing'));
const Settings = lazy(() => import('./features/Settings'));

interface AppContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  isMobile: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px]">
    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    <p className="mt-4 text-slate-500 font-bold">Optimizing view...</p>
  </div>
);

const App: React.FC = () => {
  const [theme, setThemeState] = useState<ThemeType>('ocean');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    initSettings().then(async () => {
      const savedTheme = await db.settings.get('theme');
      if (savedTheme) setThemeState(savedTheme.value);
      setLoading(false);
    });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await db.settings.put({ key: 'theme', value: newTheme });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-blue-600 font-bold animate-pulse">Gopi Distributors ERP</p>
    </div>
  );

  return (
    <AppContext.Provider value={{ theme, setTheme, isMobile }}>
      <Router>
        <LayoutContainer />
      </Router>
    </AppContext.Provider>
  );
};

const LayoutContainer: React.FC = () => {
  const { theme } = useApp();
  
  return (
    <div className={`flex h-full w-full overflow-hidden ${theme === 'midnight' ? 'dark' : ''}`}>
      <Sidebar accentClass="text-blue-600" />
      
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <header className="h-16 lg:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Global Search (Alt+S)" 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4 ml-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 border border-slate-300 dark:border-slate-700">
              <UserCircle size={24} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar pb-24 lg:pb-8">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/parties" element={<Parties />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;