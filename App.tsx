
import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-slate-500 font-bold tracking-tight">Syncing Pharma Data...</p>
    </div>
  </div>
);

// Fix: Ensure the App component is properly defined and exported as default
const App: React.FC = () => {
  const [theme, setThemeState] = useState<ThemeType>('ocean');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    
    // Bootstrapping the application
    const boot = async () => {
      try {
        await initSettings();
        const savedTheme = await db.settings.get('theme');
        if (savedTheme) setThemeState(savedTheme.value);
      } catch (e) {
        console.error("Database initialization failed", e);
      } finally {
        setLoading(false);
      }
    };
    boot();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await db.settings.put({ key: 'theme', value: newTheme });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-white">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-xs">GOPI</div>
      </div>
      <p className="mt-6 text-slate-400 font-bold text-sm tracking-widest uppercase">Initializing ERP System</p>
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

// Fix: Completed the LayoutContainer component which was truncated
const LayoutContainer: React.FC = () => {
  const { theme } = useApp();
  
  return (
    <div className={`flex h-full w-full overflow-hidden ${theme === 'midnight' ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      <Sidebar accentClass="text-blue-600" />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-colors duration-300">
        <header className="h-16 lg:h-20 bg-white/80 dark:bg-slate-900/80 glass border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
              <input 
                type="text" 
                placeholder="Universal Search..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-400 hover:text-blue-600 rounded-2xl relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black dark:text-white leading-none">ADMIN USER</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Super Admin</p>
              </div>
              <UserCircle className="text-slate-300 dark:text-slate-700 w-10 h-10" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8 no-scrollbar relative">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/parties" element={<Parties />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// Fix: Added missing default export
export default App;
