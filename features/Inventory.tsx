
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../db';
import { Product } from '../types';
import { 
  Search, FileUp, Plus, Trash2, Edit3, Package, AlertTriangle, 
  FileSpreadsheet, Download, Filter, MoreHorizontal, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../App';

const Inventory: React.FC = () => {
  const { isMobile } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchProducts = useCallback(async () => {
    let result: Product[];
    if (searchTerm) {
      result = await db.products
        .where('name')
        .startsWithIgnoreCase(searchTerm)
        .or('batch')
        .startsWithIgnoreCase(searchTerm)
        .toArray();
    } else {
      result = await db.products.orderBy(sortField).limit(200).toArray();
      if (sortOrder === 'desc') result.reverse();
    }
    setProducts(result);
  }, [searchTerm, sortField, sortOrder]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleSort = (field: keyof Product) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
      const mapped = rows.map(r => ({
        name: r.Name || r.Product || r.Item || 'New Item',
        manufacturer: r.MFG || r.Brand || 'NA',
        batch: r.Batch || 'B001',
        expiry: r.Exp || '2030-01-01',
        hsn: String(r.HSN || '3004'),
        gstRate: parseFloat(r.GST || 12),
        mrp: parseFloat(r.MRP || 0),
        purchaseRate: parseFloat(r.Purchase || 0),
        saleRate: parseFloat(r.Rate || 0),
        stock: parseFloat(r.Stock || r.Qty || 0)
      }));
      await db.products.bulkAdd(mapped);
      fetchProducts();
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Live Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Managing {products.length}+ SKUs across warehouse.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-all active:scale-95 font-bold text-sm">
            <FileSpreadsheet size={18} className="text-emerald-500" />
            {isImporting ? 'Ingesting...' : 'Import Excel'}
            <input type="file" className="hidden" onChange={handleImport} />
          </label>
          {!isMobile && (
            <button className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-black text-sm active:scale-95 transition-all">
              <Plus size={18} />
              Add Stock
            </button>
          )}
        </div>
      </header>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
          <input 
            type="text" 
            placeholder="Search SKU, Batch, HSN..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500">
            <Filter size={16} /> Filter
          </button>
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* High Density Table */}
      <div className="bg-white dark:bg-slate-900 rounded-4xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 lg:p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2">Item Description <ArrowUpDown size={12}/></div>
                </th>
                <th className="p-4 lg:p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Batch Info</th>
                <th className="p-4 lg:p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock Level</th>
                <th className="p-4 lg:p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Valuation</th>
                <th className="p-4 lg:p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                  <td className="p-4 lg:p-6">
                    <p className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{p.manufacturer} • HSN {p.hsn}</p>
                  </td>
                  <td className="p-4 lg:p-6">
                    <p className="text-xs font-black text-slate-600 dark:text-slate-300">#{p.batch}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">EXP {new Date(p.expiry).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                  </td>
                  <td className="p-4 lg:p-6 text-center">
                    <div className={`inline-flex flex-col items-center px-4 py-2 rounded-2xl border-2 ${p.stock < 20 ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/50' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                      <span className="text-sm font-black leading-none">{p.stock}</span>
                      <span className="text-[8px] font-black uppercase mt-1">Units</span>
                    </div>
                  </td>
                  <td className="p-4 lg:p-6 text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white">₹{p.saleRate}</p>
                    <p className="text-[10px] font-bold text-slate-400 line-through">₹{p.mrp}</p>
                  </td>
                  <td className="p-4 lg:p-6">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Edit3 size={16}/></button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"><Trash2 size={16}/></button>
                    </div>
                    {isMobile && <div className="text-center"><MoreHorizontal size={18} className="mx-auto text-slate-300"/></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
