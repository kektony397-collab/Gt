
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  PackageSearch, 
  AlertCircle, 
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap
} from 'lucide-react';
// Corrected import from useTheme to useApp as defined in App.tsx
import { useApp } from '../App';

const Dashboard: React.FC = () => {
  // Use useApp() which provides the theme context
  const { theme } = useApp();
  const [stats, setStats] = useState({
    totalSales: 0,
    invoiceCount: 0,
    lowStock: 0,
    expiringSoon: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const invoices = await db.invoices.toArray();
      const products = await db.products.toArray();
      
      const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const lowStock = products.filter(p => p.stock < 10).length;
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 3);
      const expiringSoon = products.filter(p => {
        const exp = new Date(p.expiry);
        return exp < nextMonth && exp > new Date();
      }).length;

      setStats({
        totalSales,
        invoiceCount: invoices.length,
        lowStock,
        expiringSoon
      });

      // Synthetic Data for Trends
      setChartData([
        { name: 'Mon', revenue: 14200, sales: 12 },
        { name: 'Tue', revenue: 18500, sales: 24 },
        { name: 'Wed', revenue: 12100, sales: 15 },
        { name: 'Thu', revenue: 26400, sales: 38 },
        { name: 'Fri', revenue: 29800, sales: 42 },
        { name: 'Sat', revenue: 11000, sales: 8 },
        { name: 'Sun', revenue: 4500, sales: 3 },
      ]);
    };
    fetchStats();
  }, []);

  const themeColors = {
    primary: theme === 'midnight' ? '#3b82f6' : '#2563eb',
    accent: theme === 'royal' ? '#8b5cf6' : '#6366f1'
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest mb-2">
            <Zap size={14} /> Systems Operational
          </div>
          <h2 className="text-4xl font-black tracking-tighter">Business Intelligence</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Monitoring enterprise performance for Gopi Distributors.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
          <button className="px-6 py-2.5 text-xs font-black bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">LIVE METRICS</button>
          <button className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-widest">History</button>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="GROSS REVENUE" 
          value={`₹${stats.totalSales.toLocaleString('en-IN')}`} 
          icon={TrendingUp} 
          colorClass="bg-blue-600 shadow-blue-500/30"
          trend="+18.4%"
          trendUp={true}
        />
        <StatCard 
          label="TOTAL INVOICES" 
          value={stats.invoiceCount.toString()} 
          icon={Activity} 
          colorClass="bg-indigo-600 shadow-indigo-500/30"
          trend="+4.2%"
          trendUp={true}
        />
        <StatCard 
          label="CRITICAL STOCK" 
          value={stats.lowStock.toString()} 
          icon={AlertCircle} 
          colorClass="bg-rose-600 shadow-rose-500/30"
          trend="-12.1%"
          trendUp={false}
        />
        <StatCard 
          label="STOCK AGING (3M)" 
          value={stats.expiringSoon.toString()} 
          icon={CalendarClock} 
          colorClass="bg-amber-600 shadow-amber-500/30"
          trend="+0.0%"
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 glass p-10 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm group">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black tracking-tight">Revenue Trajectory</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Week</span>
            </div>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={theme === 'midnight' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dx={-10} />
                <Tooltip 
                  cursor={{ stroke: themeColors.primary, strokeWidth: 2 }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    backgroundColor: theme === 'midnight' ? '#1e293b' : '#ffffff',
                    padding: '20px'
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stroke={themeColors.primary} strokeWidth={6} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 glass p-10 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-2xl font-black tracking-tight mb-10">Orders Volume</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={theme === 'midnight' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dx={-10} />
                <Tooltip 
                   contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    backgroundColor: theme === 'midnight' ? '#1e293b' : '#ffffff'
                  }} 
                />
                <Bar dataKey="sales" fill={themeColors.accent} radius={[12, 12, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  icon: any;
  colorClass: string;
  trend: string;
  trendUp: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClass, trend, trendUp }) => {
  return (
    <div className="bg-white dark:bg-slate-800/50 glass p-8 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
      <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-150 transition-transform duration-1000 group-hover:rotate-12`}>
        <Icon size={120} />
      </div>
      <div className="flex items-center justify-between mb-8">
        <div className={`p-4 rounded-3xl ${colorClass} text-white shadow-lg`}>
          <Icon size={28} />
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-widest ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <p className="text-3xl font-black mt-2 tracking-tighter text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
