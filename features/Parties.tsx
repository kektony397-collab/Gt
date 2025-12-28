
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { Party } from '../types';
import { 
  Users, Search, Plus, MapPin, Phone, ShieldCheck, 
  Trash2, FileSpreadsheet, CheckCircle2, Loader2 
} from 'lucide-react';
import { readExcelFile, normalizeData } from '../utils/importEngine';

const Parties: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState({ active: false, progress: 0, total: 0 });

  const fetchParties = useCallback(async () => {
    let result: Party[];
    if (searchTerm) {
      result = await db.parties
        .where('name')
        .startsWithIgnoreCase(searchTerm)
        .or('gstin')
        .startsWithIgnoreCase(searchTerm)
        .toArray();
    } else {
      result = await db.parties.toArray();
    }
    setParties(result);
  }, [searchTerm]);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file);
      const normalized = normalizeData(rows, 'PARTY');
      setImporting({ active: true, progress: 0, total: normalized.length });

      const chunkSize = 500;
      for (let i = 0; i < normalized.length; i += chunkSize) {
        await db.parties.bulkAdd(normalized.slice(i, i + chunkSize));
        setImporting(prev => ({ ...prev, progress: Math.min(i + chunkSize, normalized.length) }));
        await new Promise(r => setTimeout(r, 10));
      }

      fetchParties();
      setTimeout(() => setImporting({ active: false, progress: 0, total: 0 }), 1000);
    } catch (err) {
      console.error(err);
      alert('Import failed.');
      setImporting({ active: false, progress: 0, total: 0 });
    }
  };

  const deleteParty = async (id?: number) => {
    if (!id) return;
    if (confirm('Permanently remove this ledger?')) {
      await db.parties.delete(id);
      fetchParties();
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Overlay */}
      {importing.active && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
             <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="animate-spin" size={32} />
             </div>
             <h3 className="text-2xl font-black tracking-tight mb-2">Syncing Client Base</h3>
             <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-6 mb-2">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(importing.progress / importing.total) * 100}%` }}
                ></div>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {importing.progress} of {importing.total} Entities
             </p>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Client Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Auto-Ledger synchronization with fuzzy mapping.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl cursor-pointer hover:scale-105 transition-all font-black text-sm text-indigo-600">
            <FileSpreadsheet size={20} />
            LEDGER IMPORT
            <input type="file" className="hidden" onChange={handleImport} accept=".xlsx,.xls,.csv" />
          </label>
          <button className="bg-blue-600 text-white px-10 py-4 rounded-3xl shadow-2xl shadow-blue-500/30 font-black text-sm active:scale-95 transition-all flex items-center gap-2">
            <Plus size={20} />
            ADD PARTY
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search by Firm Name, GSTIN, or DL No..."
            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-black text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parties.length === 0 ? (
          <div className="col-span-full py-32 text-center opacity-20">
            <Users size={80} className="mx-auto mb-6" />
            <p className="text-2xl font-black tracking-tight">NO CLIENTS FOUND</p>
          </div>
        ) : parties.map((party) => (
          <div key={party.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl group hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => deleteParty(party.id)} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                {party.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight leading-none mb-2">{party.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-lg">
                    {party.type}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">ID: #{party.id}</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <ShieldCheck size={20} className="text-blue-500 mt-1 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tax Identity</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">{party.gstin || 'UNREGISTERED'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin size={20} className="text-blue-500 mt-1 shrink-0" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 line-clamp-2">{party.address}</p>
              </div>
              <div className="flex items-center gap-4">
                <Phone size={18} className="text-slate-400" />
                <span className="text-sm font-black">{party.phone || 'NO CONTACT'}</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">DL 20B</p>
                <p className="text-xs font-black">{party.dl1 || '-'}</p>
              </div>
              <div className="border-l border-slate-100 dark:border-slate-800">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-1">DL 21B</p>
                <p className="text-xs font-black">{party.dl2 || '-'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Parties;
