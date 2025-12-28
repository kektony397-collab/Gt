import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ReceiptIndianRupee, 
  Settings as SettingsIcon,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { useApp } from '../App';

interface SidebarProps {
  accentClass: string;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { theme, isMobile } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Parties', path: '/parties', icon: Users },
    { name: 'Billing', path: '/billing', icon: ReceiptIndianRupee },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const activeLinkClass = "bg-blue-600 text-white shadow-lg shadow-blue-500/20";
  const idleLinkClass = "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";

  if (isMobile) {
    return (
      <>
        {/* Bottom Nav for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-50">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all
                ${isActive ? 'text-blue-600' : 'text-slate-400'}
              `}
            >
              {/* Fix: Wrap children in a function to access the isActive property provided by NavLink */}
              {({ isActive }) => (
                <>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] font-bold uppercase tracking-tight">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* Floating Add Button for Mobile Billing */}
        {location.pathname !== '/billing' && (
          <NavLink 
            to="/billing" 
            className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center z-40 active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </NavLink>
        )}
      </>
    );
  }

  return (
    <aside className="w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-20 shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">G</div>
        <div>
          <h1 className="text-lg font-black tracking-tighter leading-none dark:text-white">GOPI ERP</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pharma Suite</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200
              ${isActive ? activeLinkClass : idleLinkClass}
            `}
          >
            <item.icon size={20} />
            <span className="text-sm tracking-tight">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Database</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-bold dark:text-slate-300">Local Active</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;