
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { Product } from '../types';
import { 
  Search, FileSpreadsheet, Plus, Trash2, Edit3, 
  Filter, Loader2, X, Zap
} from 'lucide-react';
import { useApp } from '../App';
import { readExcelFile, normalizeData } from '../utils/importEngine';
import { smartSearch } from '../utils/searchEngine';

const Inventory: React.FC = () => {
  const { isMobile } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState({ active: false, progress: 0, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', manufacturer: '', batch: '', expiry: '', hsn: '', gstRate: 12, mrp: 0, purchaseRate: 0, saleRate: 0, stock: 10
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const searchTimeout = useRef<any>(null);

  const performSearch = useCallback(async (val: string) => {
    setIsSearching(true);
    try {
      if (!db.products) throw new Error("Database table not initialized");
      
      const results = await smartSearch(
        db.products,
        val,
        ['name', 'batch', 'manufacturer', 'hsn'],
        100
      );
      setProducts((results || []) as Product[]);
    } catch (err) {
      console.error("Search engine fault:", err);
      setProducts([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 200);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm, performSearch]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawRows = await readExcelFile(file);
      const normalized = normalizeData(rawRows, 'PRODUCT');
      setImporting({ active: true, progress: 0, total: normalized.length });
      
      const chunkSize = 1000;
      for (let i = 0; i < normalized.length; i += chunkSize) {
        await db.products.bulkAdd(normalized.slice(i, i + chunkSize));
        setImporting(prev => ({ ...prev, progress: Math.min(i + chunkSize, normalized.length) }));
        await new Promise(r => setTimeout(r, 0));
      }
      performSearch(searchTerm);
      setTimeout(() => setImporting({ active: false, progress: 0, total: 0 }), 1000);
    } catch (err) {
      console.error(err);
      alert('Import failed. Please check file format.');
      setImporting({ active: false, progress: 0, total: 0 });
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.products.add(newProduct as Product);
      setIsModalOpen(false);
      setNewProduct({ name: '', manufacturer: '', batch: '', expiry: '', hsn: '', gstRate: 12, mrp: 0, purchaseRate: 0, saleRate: 0, stock: 10 });
      performSearch(searchTerm);
    } catch (err) {
      alert('Error adding product.');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id) return;
    try {
      await db.products.update(editingProduct.id, editingProduct);
      setIsEditModalOpen(false);
      setEditingProduct(null);
      performSearch(searchTerm);
    } catch (err) {
      alert('Error updating product.');
    }
  };

  const deleteProduct = async (id?: number) => {
    if (!id || !confirm('Remove SKU from registry?')) return;
    await db.products.delete(id);
    performSearch(searchTerm);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Import Progress Overlay */}
      {importing.active && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Zap size={40} />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">Core Engine Ingesting</h3>
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.5)]" 
                style={{ width: `${(importing.progress / (importing.total || 1)) * 100}%` }}
              />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {importing.progress.toLocaleString()} / {importing.total.toLocaleString()} Units Loaded
            </p>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black tracking-tight">Add New SKU</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Medicine Name</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Manufacturer</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.manufacturer} onChange={e => setNewProduct({...newProduct, manufacturer: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Batch</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.batch} onChange={e => setNewProduct({...newProduct, batch: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Exp (MM/YY)</label>
                  <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="MM/YY" value={newProduct.expiry} onChange={e => setNewProduct({...newProduct, expiry: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Stock</label>
                  <input required type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Purchase Rate</label>
                  <input required type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.purchaseRate} onChange={e => setNewProduct({...newProduct, purchaseRate: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Sale Rate</label>
                  <input required type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.saleRate} onChange={e => setNewProduct({...newProduct, saleRate: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="col-span-full pt-4">
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">SAVE MEDICINE</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black tracking-tight">Edit SKU Details</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Medicine Name</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Manufacturer</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.manufacturer} onChange={e => setEditingProduct({...editingProduct, manufacturer: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Batch</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.batch} onChange={e => setEditingProduct({...editingProduct, batch: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Exp</label>
                  <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="MM/YY" value={editingProduct.expiry} onChange={e => setEditingProduct({...editingProduct, expiry: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Stock</label>
                  <input required type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} />
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">MRP</label>
                  <input required type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.mrp} onChange={e => setEditingProduct({...editingProduct, mrp: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Sale Rate</label>
                  <input required type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.saleRate} onChange={e => setEditingProduct({...editingProduct, saleRate: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="col-span-full pt-4">
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-3xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all">UPDATE REGISTRY</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Live Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Power Search: 1M+ Records indexed & ready.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl cursor-pointer hover:scale-105 transition-all font-black text-sm text-emerald-600">
            <FileSpreadsheet size={20} />
            EXCEL SYNC
            <input type="file" className="hidden" onChange={handleImport} accept=".xlsx,.xls,.csv" />
          </label>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-3xl shadow-2xl shadow-blue-500/30 font-black text-sm active:scale-95 transition-all">
            <Plus size={20} />
            NEW SKU
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
        <div className="relative flex-1 group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            {isSearching ? <Loader2 className="text-blue-500 animate-spin" size={20} /> : <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />}
          </div>
          <input 
            type="text" 
            placeholder="Smart Keyword Search (e.g. 'Abbott Paracet 500')..." 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-blue-600 transition-all">
          <Filter size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Medicine Description</th>
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Batch / Exp</th>
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">In-Stock</th>
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Wholesale Rate</th>
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/5 transition-colors group">
                  <td className="p-6">
                    <p className="font-black text-base text-slate-900 dark:text-white leading-tight">{p.name || 'Untitled SKU'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 tracking-wider">{(p.manufacturer || 'Unknown Manufacturer')} • HSN {(p.hsn || 'N/A')}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">B: {p.batch || '-'}</p>
                    <p className="text-[10px] font-black text-rose-500 mt-1 uppercase">E {p.expiry || '-'}</p>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-5 py-2 rounded-2xl font-black text-sm border-2 ${(p.stock || 0) < 15 ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20'}`}>
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-base font-black text-slate-900 dark:text-white">₹{(p.saleRate || 0).toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">MRP ₹{(p.mrp || 0).toFixed(2)}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditModal(p)} className="p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Edit3 size={18}/></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-3 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !isSearching && (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <div className="opacity-10 grayscale mb-6"><Zap size={80} className="mx-auto" /></div>
                    <p className="text-slate-400 font-black tracking-widest uppercase text-xs">Awaiting Smart Input...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
