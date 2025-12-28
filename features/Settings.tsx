
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { CompanyProfile, ThemeType } from '../types';
// Corrected import from useTheme to useApp as defined in App.tsx
import { useApp } from '../App';
import { 
  Building, 
  Palette, 
  ShieldAlert, 
  Save, 
  CheckCircle2,
  Trash2,
  CloudUpload
} from 'lucide-react';

const Settings: React.FC = () => {
  // Use useApp() which provides the theme and setTheme
  const { theme, setTheme } = useApp();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const loadData = async () => {
      const res = await db.settings.get('company');
      if (res) setCompany(res.value);
    };
    loadData();
  }, []);

  const handleCompanyChange = (field: keyof CompanyProfile, value: string) => {
    if (company) setCompany({ ...company, [field]: value });
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    await db.settings.put({ key: 'company', value: company });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const resetData = async () => {
    if (confirm("Are you sure? This will wipe ALL products, invoices and parties forever!")) {
      await db.products.clear();
      await db.invoices.clear();
      await db.parties.clear();
      alert("Database cleared.");
      window.location.reload();
    }
  };

  const themes: { id: ThemeType; name: string; color: string }[] = [
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-blue-500' },
    { id: 'nature', name: 'Nature Green', color: 'bg-emerald-500' },
    { id: 'royal', name: 'Royal Purple', color: 'bg-purple-500' },
    { id: 'midnight', name: 'Midnight Dark', color: 'bg-slate-900' },
  ];

  if (!company) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">System Configuration</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Customize your business profile and app preferences.</p>
      </header>

      {/* Theme Selector */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Palette size={24} className="text-blue-500" />
          Appearance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`
                p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3
                ${theme === t.id ? 'border-blue-500 bg-blue-50 dark:bg-slate-700' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}
              `}
            >
              <div className={`w-12 h-12 rounded-2xl shadow-lg ${t.color}`}></div>
              <span className="font-bold">{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Company Profile Form */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Building size={24} className="text-blue-500" />
          Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Enterprise Name</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={company.name}
                onChange={(e) => handleCompanyChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Business Address</label>
              <textarea 
                rows={3}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={company.address}
                onChange={(e) => handleCompanyChange('address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">GSTIN</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={company.gstin}
                  onChange={(e) => handleCompanyChange('gstin', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">State Code</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={company.stateCode}
                  onChange={(e) => handleCompanyChange('stateCode', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Phone Number</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={company.phone}
                onChange={(e) => handleCompanyChange('phone', e.target.value)}
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">DL No (20B)</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={company.dl1}
                  onChange={(e) => handleCompanyChange('dl1', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">DL No (21B)</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={company.dl2}
                  onChange={(e) => handleCompanyChange('dl2', e.target.value)}
                />
              </div>
            </div>
             <div>
              <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Invoice Terms & Conditions</label>
              <textarea 
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-xs"
                value={company.terms}
                onChange={(e) => handleCompanyChange('terms', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-end gap-4">
          <button 
            onClick={saveSettings}
            disabled={saveStatus !== 'idle'}
            className="bg-blue-600 text-white px-10 py-4 rounded-3xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? <><CheckCircle2 size={20} /> Saved</> : <><Save size={20} /> Save Configuration</>}
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-4xl border border-rose-100 dark:border-rose-900/50">
        <h3 className="text-xl font-bold text-rose-600 mb-6 flex items-center gap-2">
          <ShieldAlert size={24} />
          Danger Zone
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl font-medium">
          Performing these actions will permanently remove data from your local IndexedDB storage. These actions cannot be undone.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={resetData}
            className="bg-rose-600 text-white px-8 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition-all"
          >
            <Trash2 size={20} />
            Wipe All Local Data
          </button>
          <button className="bg-slate-900 dark:bg-slate-800 text-white px-8 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
            <CloudUpload size={20} />
            Force Sync (Cloud)
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
