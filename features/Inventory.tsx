
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { Product } from '../types';
import { 
  Search, FileSpreadsheet, Plus, Trash2, Edit3, 
  Filter, Loader2, CheckCircle2, X 
} from 'lucide-react';
import { useApp } from '../App';
import { readExcelFile, normalizeData } from '../utils/importEngine';

const Inventory: React.FC = () => {
  const { isMobile } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState({ active: false, progress: 0, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', manufacturer: '', batch: '', expiry: '', hsn: '', gstRate: 12, mrp: 0, purchaseRate: 0, saleRate: 0, stock: 10
  });

  const fetchProducts = useCallback(async () => {
    let result: Product[];
    // Prevent UI hanging by using limit and efficient searching
    if (searchTerm.trim().length > 1) {
      result = await db.products
        .filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.batch.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .limit(50)
        .toArray();
    } else {
      result = await db.products.orderBy('name').limit(50).toArray();
    }
    setProducts(result);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 300); // Debounce
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readExcelFile(file);
      const normalized = normalizeData(rawRows, 'PRODUCT');
      
      setImporting({ active: true, progress: 0, total: normalized.length });

      const chunkSize = 500;
      for (let i = 0; i < normalized.length; i += chunkSize) {
        const chunk = normalized.slice(i, i + chunkSize);
        await db.products.bulkAdd(chunk);
        setImporting(prev => ({ ...prev, progress: Math.min(i + chunkSize, normalized.length) }));
        await new Promise(r => setTimeout(r, 10)); // Yield to UI thread
      }

      fetchProducts();
      setTimeout(() => setImporting({ active: false, progress: 0, total: 0 }), 1000);
    } catch (err) {
      console.error(err);
      alert('Import failed. Data set might contain duplicates or errors.');
      setImporting({ active: false, progress: 0, total: 0 });
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.products.add(newProduct as Product);
      setIsModalOpen(false);
      setNewProduct({ name: '', manufacturer: '', batch: '', expiry: '', hsn: '', gstRate: 12, mrp: 0, purchaseRate: 0, saleRate: 0, stock: 10 });
      fetchProducts();
    } catch (err) {
      alert('Error adding product. Please ensure all fields are correct.');
    }
  };

  const deleteProduct = async (id?: number) => {
    if (!id || !confirm('Remove this product?')) return;
    await db.products.delete(id);
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      {/* Import Progress Overlay */}
      {importing.active && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
              <svg className="absolute inset-0 rotate-[-90deg]" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="46"
                  fill="transparent"
                  stroke="#2563eb"
                  strokeWidth="8"
                  strokeDasharray="289"
                  strokeDashoffset={289 - (289 * (importing.progress / importing.total))}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-blue-600">
                {Math.round((importing.progress / importing.total) * 100)}%
              </div>
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2">Power Import Engine</h3>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              {importing.progress.toLocaleString()} / {importing.total.toLocaleString()} Records
            </p>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black tracking-tight">Add New Medicine</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Medicine Name</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Manufacturer</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.manufacturer} onChange={e => setNewProduct({...newProduct, manufacturer: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Batch Number</label>
                <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.batch} onChange={e => setNewProduct({...newProduct, batch: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Expiry (MM/YY)</label>
                  <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="04/26" value={newProduct.expiry} onChange={e => setNewProduct({...newProduct, expiry: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">HSN Code</label>
                  <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.hsn} onChange={e => setNewProduct({...newProduct, hsn: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">MRP</label>
                  <input required type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Stock</label>
                  <input required type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="col-span-full pt-4">
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">SAVE PRODUCT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Live Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Auto-mapping Excel data. Displaying optimized view of {products.length} records.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl cursor-pointer hover:scale-105 transition-all font-black text-sm text-emerald-600">
            <FileSpreadsheet size={20} />
            POWER IMPORT
            <input type="file" className="hidden" onChange={handleImport} accept=".xlsx,.xls,.csv" />
          </label>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-3xl shadow-2xl shadow-blue-500/30 font-black text-sm active:scale-95 transition-all">
            <Plus size={20} />
            NEW SKU
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Quick filter (Name or Batch)..." 
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
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Pricing (₹)</th>
                <th className="p-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/5 transition-colors group">
                  <td className="p-6">
                    <p className="font-black text-base text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{p.manufacturer} • HSN {p.hsn}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">BATCH: {p.batch}</p>
                    <p className="text-[10px] font-bold text-rose-400 mt-1 uppercase">EXP {p.expiry}</p>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-5 py-2 rounded-2xl font-black text-sm border-2 ${p.stock < 15 ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-base font-black text-slate-900 dark:text-white">₹{p.saleRate}</p>
                    <p className="text-[10px] font-bold text-slate-400 line-through mt-0.5">MRP ₹{p.mrp}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Edit3 size={18}/></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-3 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !searchTerm && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <Loader2 size={40} className="mx-auto mb-4 text-slate-200 animate-spin" />
                    <p className="text-slate-400 font-bold tracking-tight uppercase text-xs">Waiting for SKU entry...</p>
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
