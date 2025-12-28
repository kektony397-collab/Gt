
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { Party } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Building2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  MoreVertical,
  MapPin,
  Trash2
} from 'lucide-react';

const Parties: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const addDummyParty = async () => {
    // Fixed: Added missing pricingTier, creditLimit, and currentBalance properties to match the Party interface
    const dummy: Party = {
      name: 'Sunrise Pharmacy',
      gstin: '07BBBBB1234B1Z5',
      address: 'Main Market, Sector 15, Rohini, Delhi',
      phone: '9988776655',
      email: 'sunrise@gmail.com',
      stateCode: '07',
      dl1: '20B-9988/24',
      dl2: '21B-4455/24',
      type: 'WHOLESALE',
      pricingTier: 'WHOLESALE',
      creditLimit: 100000,
      currentBalance: 0
    };
    await db.parties.add(dummy);
    fetchParties();
  };

  const deleteParty = async (id?: number) => {
    if (!id) return;
    if (confirm('Delete this party?')) {
      await db.parties.delete(id);
      fetchParties();
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Party Management</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage Wholesale (B2B) and Retail (B2C) clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addDummyParty}
            className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm font-semibold"
          >
            Import Excel
          </button>
          <button 
            className="bg-blue-600 text-white px-8 py-3 rounded-3xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center gap-2 font-bold"
          >
            <Plus size={20} />
            New Party
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-4xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search by Party Name, GSTIN, or DL Number..."
            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parties.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Users size={64} className="mx-auto mb-4 opacity-10" />
            <p className="text-xl font-medium text-slate-400">Your party list is empty.</p>
          </div>
        ) : parties.map((party) => (
          <div key={party.id} className="bg-white dark:bg-slate-800 glass p-8 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-4">
              <button onClick={() => deleteParty(party.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-400 hover:text-rose-600 transition-all">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {party.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-bold line-clamp-1">{party.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${party.type === 'WHOLESALE' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                    {party.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">#{party.id}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-blue-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">GSTIN</p>
                  <p className="text-sm font-semibold">{party.gstin}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-blue-500 mt-1 shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{party.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-start gap-2">
                   <Phone size={14} className="text-slate-400 mt-1" />
                   <span className="text-sm font-medium">{party.phone}</span>
                 </div>
                 <div className="flex items-start gap-2">
                   <Building2 size={14} className="text-slate-400 mt-1" />
                   <span className="text-sm font-medium">State: {party.stateCode}</span>
                 </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-4">
              <div className="text-center flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">DL 20B</p>
                <p className="text-xs font-semibold">{party.dl1}</p>
              </div>
              <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-700"></div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">DL 21B</p>
                <p className="text-xs font-semibold">{party.dl2}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Parties;
