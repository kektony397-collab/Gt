
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { Product } from '../types';
import { 
  Search, FileSpreadsheet, Plus, Trash2, Edit3, 
  Filter, Loader2, X, Zap, ChevronRight, Package, Info
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
      if (!db || !db.products) {
        console.error("Database or products table is not available");
        return;
      }
      
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
      // Use put for full object replacement including the primary key
      await db.products.put(editingProduct);
      setIsEditModalOpen(false);
      setEditingProduct(null);
      performSearch(searchTerm);
    } catch (err) {
      console.error("Update failed:", err);
      alert('Error updating product.');
    }
  };

  const deleteProduct = async (id?: number) => {
    if (!id || !confirm('Permanently remove this SKU from registry?')) return;
    await db.products.delete(id);
    performSearch(searchTerm);
  };

  const openEditModal = (product: Product) => {
    // Create a fresh clone to avoid binding to the state list
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Import Progress Overlay */}
      {importing.active && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Zap size={48} />
            </div>
            <h3 className="text-3xl font-black tracking-tight mb-2 uppercase">Core Engine Ingesting</h3>
            <p className="text-slate-500 mb-6 font-medium">Synchronizing local data bank...</p>
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.5)]" 
                style={{ width: `${(importing.progress / (importing.total || 1)) * 100}%` }}
              />
            </div>
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {importing.progress.toLocaleString()} / {importing.total.toLocaleString()} Units
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal Shared Logic */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 glass my-auto relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${isEditModalOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isEditModalOpen ? <Edit3 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{isEditModalOpen ? 'Edit SKU Details' : 'Add New Medicine'}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isEditModalOpen ? `Registry ID: #${editingProduct?.id}` : 'Create Registry Entry'}</p>
                </div>
              </div>
              <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); setEditingProduct(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X size={28} /></button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateProduct : handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Conditional Form Data */}
              {(() => {
                const target = isEditModalOpen ? editingProduct : newProduct;
                const setTarget = isEditModalOpen ? (val: any) => setEditingProduct(val) : (val: any) => setNewProduct(val);
                
                if (!target) return null;

                return (
                  <>
                    <div className="col-span-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Medicine Name</label>
                      <input required type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-black text-lg transition-all" value={target.name} onChange={e => setTarget({...target, name: e.target.value})} />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Manufacturer</label>
                      <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/10 outline-none font-bold transition-all" value={target.manufacturer} onChange={e => setTarget({...target, manufacturer: e.target.value})} />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Batch Number</label>
                      <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/10 outline-none font-bold transition-all" value={target.batch} onChange={e => setTarget({...target, batch: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Exp (MM/YY)</label>
                        <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/10 outline-none font-bold transition-all" placeholder="MM/YY" value={target.expiry} onChange={e => setTarget({...target, expiry: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Current Stock</label>
                        <input required type="number" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/10 outline-none font-black transition-all" value={target.stock} onChange={e => setTarget({...target, stock: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">MRP (₹)</label>
                        <input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border-2 border-transparent focus:border-emerald-500/20 outline-none font-black text-emerald-600 transition-all" value={target.mrp} onChange={e => setTarget({...target, mrp: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Wholesale Rate (₹)</label>
                        <input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border-2 border-transparent focus:border-blue-500/20 outline-none font-black text-blue-600 transition-all" value={target.saleRate} onChange={e => setTarget({...target, saleRate: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Purchase Rate (₹)</label>
                      <input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/10 outline-none font-bold transition-all" value={target.purchaseRate} onChange={e => setTarget({...target, purchaseRate: parseFloat(e.target.value) || 0})} />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">HSN Code</label>
                      <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-500/10 outline-none font-bold transition-all uppercase" value={target.hsn} onChange={e => setTarget({...target, hsn: e.target.value})} />
                    </div>

                    <div className="col-span-full pt-6">
                      <button type="submit" className={`w-full py-5 rounded-[24px] font-black text-lg shadow-2xl transition-all uppercase tracking-widest active:scale-95 ${isEditModalOpen ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700'} text-white`}>
                        {isEditModalOpen ? 'Commit Changes' : 'Add to Inventory'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Inventory v4.2</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Product Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage global pharmaceutical stock with real-time indexing.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-black text-sm text-emerald-600">
            <FileSpreadsheet size={20} />
            EXCEL SYNC
            <input type="file" className="hidden" onChange={handleImport} accept=".xlsx,.xls,.csv" />
          </label>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-10 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl shadow-2xl shadow-blue-500/30 font-black text-sm active:scale-95 transition-all">
            <Plus size={20} />
            ADD NEW SKU
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-4xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm flex-1 w-full">
          <div className="relative flex-1 group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2">
              {isSearching ? <Loader2 className="text-blue-500 animate-spin" size={20} /> : <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />}
            </div>
            <input 
              type="text" 
              placeholder="Deep Search: Name, Batch, Manufacturer, HSN..." 
              className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-[24px] outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-black transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-blue-600 transition-all">
            <Filter size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-6 py-4 rounded-4xl border border-slate-200 dark:border-slate-800 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SKUs</span>
            <span className="text-lg font-black">{products.length} Units</span>
          </div>
          <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Stock Alerts</span>
            <span className="text-lg font-black text-rose-500">{products.filter(p => p.stock < 15).length} Items</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-[48px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Medicine & Manufacturer</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Batch / HSN</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Available Stock</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Rates (MRP / Sale)</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(products || []).map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/5 transition-colors group">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Package size={24} />
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-900 dark:text-white leading-tight">{p.name || 'Untitled SKU'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{(p.manufacturer || 'Unknown Lab')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500">BCH</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{p.batch || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-rose-50 text-rose-500 px-2 py-1 rounded-md">EXP</span>
                        <span className="text-[10px] font-black text-rose-500 uppercase">{p.expiry || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className={`px-6 py-2.5 rounded-[18px] font-black text-base border-2 shadow-sm transition-all ${(p.stock || 0) < 15 ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20'}`}>
                        {p.stock ?? 0}
                      </span>
                      {(p.stock || 0) < 15 && <span className="text-[9px] font-black text-rose-500 mt-2 uppercase tracking-tighter animate-pulse">Low Supply</span>}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-xl font-black text-slate-900 dark:text-white leading-none">₹{(p.saleRate || 0).toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase">MRP</span>
                        <p className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">₹{(p.mrp || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button onClick={() => openEditModal(p)} className="p-3.5 bg-blue-50 text-blue-600 rounded-[18px] hover:bg-blue-600 hover:text-white shadow-lg shadow-blue-500/10 transition-all transform hover:-translate-y-1">
                        <Edit3 size={18}/>
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="p-3.5 bg-rose-50 text-rose-500 rounded-[18px] hover:bg-rose-600 hover:text-white shadow-lg shadow-rose-500/10 transition-all transform hover:-translate-y-1">
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && !isSearching && (
                <tr>
                  <td colSpan={5} className="p-40 text-center">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-slate-200">
                      <Info size={48} />
                    </div>
                    <p className="text-slate-400 font-black tracking-widest uppercase text-sm mb-2">Registry Empty</p>
                    <p className="text-slate-300 dark:text-slate-600 text-xs font-bold">Use EXCEL SYNC or ADD NEW SKU to populate the data bank.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Info */}
      <footer className="p-10 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Global Pharmaceutical Data Management Engine</p>
      </footer>
    </div>
  );
};

export default Inventory;
