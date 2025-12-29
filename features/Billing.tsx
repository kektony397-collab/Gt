
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { Product, Party, Invoice, InvoiceItem, CompanyProfile } from '../types';
import { 
  Search, Trash2, Plus, Download, Save, Truck, 
  FileText, User, Calculator, AlertCircle, Loader2, Zap
} from 'lucide-react';
import { generateInvoice } from '../utils/pdfGenerator';
import { numberToWords } from '../utils/numberToWords';
import { smartSearch } from '../utils/searchEngine';

const Billing: React.FC = () => {
  const [invoiceType, setInvoiceType] = useState<'WHOLESALE' | 'RETAIL'>('WHOLESALE');
  const [party, setParty] = useState<Party | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchParty, setSearchParty] = useState('');
  const [showPartyResults, setShowPartyResults] = useState(false);
  const [isSearchingParty, setIsSearchingParty] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductResults, setShowProductResults] = useState(false);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  const [logistics, setLogistics] = useState({ transport: '', vehicleNo: '', grNo: '' });
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  // Fix: Replaced NodeJS.Timeout with any for browser compatibility
  const partyTimeout = useRef<any>(null);
  const productTimeout = useRef<any>(null);

  useEffect(() => {
    db.settings.get('company').then(res => res && setCompany(res.value));
  }, []);

  const handlePartySearch = useCallback(async (val: string) => {
    setSearchParty(val);
    if (partyTimeout.current) clearTimeout(partyTimeout.current);
    
    if (val.length > 1) {
      setIsSearchingParty(true);
      partyTimeout.current = setTimeout(async () => {
        const results = await smartSearch(db.parties, val, ['name', 'gstin', 'phone'], 10);
        setParties(results as Party[]);
        setShowPartyResults(true);
        setIsSearchingParty(false);
      }, 150);
    } else {
      setShowPartyResults(false);
    }
  }, []);

  const handleProductSearch = useCallback(async (val: string) => {
    setSearchProduct(val);
    if (productTimeout.current) clearTimeout(productTimeout.current);

    if (val.length > 1) {
      setIsSearchingProduct(true);
      productTimeout.current = setTimeout(async () => {
        const results = await smartSearch(db.products, val, ['name', 'batch', 'hsn'], 15);
        setProducts(results as Product[]);
        setShowProductResults(true);
        setIsSearchingProduct(false);
      }, 150);
    } else {
      setShowProductResults(false);
    }
  }, []);

  const addItem = (p: Product) => {
    const newItem: InvoiceItem = {
      productName: p.name, batch: p.batch, expiry: p.expiry, qty: 1, freeQty: 0, mrp: p.mrp, rate: p.saleRate, 
      discount: 0, hsn: p.hsn, gstRate: p.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0
    };
    setItems([...items, calculateRow(newItem)]);
    setSearchProduct('');
    setShowProductResults(false);
  };

  const calculateRow = (item: InvoiceItem): InvoiceItem => {
    const taxableValue = (item.rate * item.qty) * (1 - item.discount / 100);
    const taxAmount = (taxableValue * item.gstRate) / 100;
    const isInterState = party && company && party.stateCode !== company.stateCode;
    return {
      ...item,
      taxable: parseFloat(taxableValue.toFixed(2)),
      igst: isInterState ? parseFloat(taxAmount.toFixed(2)) : 0,
      cgst: !isInterState ? parseFloat((taxAmount / 2).toFixed(2)) : 0,
      sgst: !isInterState ? parseFloat((taxAmount / 2).toFixed(2)) : 0,
      total: parseFloat((taxableValue + taxAmount).toFixed(2))
    };
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const updated = { ...newItems[index], [field]: value };
    newItems[index] = calculateRow(updated);
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.taxable, 0);
  const totalTax = items.reduce((sum, item) => sum + (item.cgst + item.sgst + item.igst), 0);
  const grandTotalRounded = Math.round(subtotal + totalTax);
  const roundOff = parseFloat((grandTotalRounded - (subtotal + totalTax)).toFixed(2));

  const handleGenerateInvoice = async () => {
    if (!party || items.length === 0 || !company) return alert("Select party and items.");
    const invoice: Invoice = {
      invoiceNo: `TI-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: invoiceType,
      partyName: party.name,
      partyGstin: party.gstin,
      logistics, items, subtotal, totalTax, roundOff, grandTotal: grandTotalRounded
    };
    try {
      await db.invoices.add(invoice);
      for (const item of items) {
        const prod = await db.products.where({ name: item.productName, batch: item.batch }).first();
        if (prod) await db.products.update(prod.id!, { stock: prod.stock - (item.qty + item.freeQty) });
      }
      generateInvoice(invoice, company, party);
      setItems([]); setParty(null); setLogistics({ transport: '', vehicleNo: '', grNo: '' });
      alert("Success!");
    } catch (err) { alert("Error generating invoice."); }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-500">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Billing Center</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Active Terminal: 01-A</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
          {['WHOLESALE', 'RETAIL'].map(mode => (
            <button key={mode} onClick={() => setInvoiceType(mode as any)} className={`px-10 py-3 text-[11px] font-black rounded-full transition-all ${invoiceType === mode ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>
              {mode}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-800 glass p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 shadow-xl relative z-30">
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3 text-blue-600">
              <User size={18} /> Customer Lookup
            </h3>
            
            <div className="relative">
              {!party ? (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2">
                    {isSearchingParty ? <Loader2 className="animate-spin text-blue-500" size={20} /> : <Search className="text-slate-400" size={20} />}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter Party Keyword (Name, GST, Phone)..."
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 text-lg font-black transition-all"
                    value={searchParty}
                    onChange={(e) => handlePartySearch(e.target.value)}
                  />
                  {showPartyResults && parties.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[60] animate-in slide-in-from-top-4 duration-300">
                      {parties.map(p => (
                        <button key={p.id} onClick={() => { setParty(p); setShowPartyResults(false); setSearchParty(''); }} className="w-full p-6 text-left hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-all flex items-center justify-between group">
                          <div>
                            <p className="font-black text-xl group-hover:text-blue-600 transition-colors">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.gstin || 'No GST'} • {p.address}</p>
                          </div>
                          <span className="text-[10px] font-black text-blue-500 px-4 py-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl">{p.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-900/20 p-8 rounded-[32px] border border-blue-100 dark:border-blue-900/50">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] flex items-center justify-center text-white font-black text-3xl shadow-2xl">
                      {party.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black tracking-tight">{party.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">GSTIN: {party.gstin || 'N/A'} • DL: {party.dl1}</p>
                    </div>
                  </div>
                  <button onClick={() => setParty(null)} className="px-6 py-3 text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all">CHANGE CLIENT</button>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800/50 glass rounded-[40px] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-blue-600">
                <FileText size={18} /> Line Items
              </h3>
              <div className="relative group w-96">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  {isSearchingProduct ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search className="text-slate-400" size={16} />}
                </div>
                <input 
                  type="text" 
                  placeholder="Smart Product Scan (Name, Batch, HSN)..."
                  className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-black transition-all shadow-inner"
                  value={searchProduct}
                  onChange={(e) => handleProductSearch(e.target.value)}
                />
                {showProductResults && products.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[70] animate-in slide-in-from-top-4">
                    {products.map(p => (
                      <button key={p.id} onClick={() => addItem(p)} disabled={p.stock <= 0} className={`w-full p-5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between ${p.stock <= 0 ? 'opacity-30' : ''}`}>
                        <div>
                          <p className="font-black text-sm">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">B: {p.batch} | E: {p.expiry}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-blue-600">₹{p.saleRate}</p>
                          <p className={`text-[9px] font-black uppercase ${p.stock < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>STK: {p.stock}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto min-h-[450px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-6">Description</th>
                    <th className="p-6 text-center">Qty</th>
                    <th className="p-6 text-center">Free</th>
                    <th className="p-6 text-center">Rate</th>
                    <th className="p-6 text-center">Disc%</th>
                    <th className="p-6 text-right">Taxable</th>
                    <th className="p-6 text-right">Total</th>
                    <th className="p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-32 text-center opacity-20">
                        <Zap size={64} className="mx-auto mb-4" />
                        <p className="text-xl font-black uppercase tracking-tighter">Engine Ready</p>
                      </td>
                    </tr>
                  ) : items.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-blue-50/20 transition-colors">
                      <td className="p-6">
                        <p className="font-black text-sm text-slate-900 dark:text-white leading-tight">{item.productName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">B: {item.batch} • E: {item.expiry}</p>
                      </td>
                      <td className="p-6 text-center">
                        <input type="number" value={item.qty} onChange={(e) => updateItem(idx, 'qty', Math.max(0, parseInt(e.target.value) || 0))} className="w-16 p-3 text-center bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="p-6 text-center">
                        <input type="number" value={item.freeQty} onChange={(e) => updateItem(idx, 'freeQty', Math.max(0, parseInt(e.target.value) || 0))} className="w-14 p-3 text-center bg-transparent border-none rounded-xl text-xs font-bold text-slate-400" />
                      </td>
                      <td className="p-6 text-center">
                         <input type="number" value={item.rate} onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} className="w-24 p-3 text-center bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black" />
                      </td>
                      <td className="p-6 text-center">
                        <input type="number" value={item.discount} onChange={(e) => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} className="w-14 p-3 text-center bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black" />
                      </td>
                      <td className="p-6 text-right font-black text-sm">₹{item.taxable.toLocaleString('en-IN')}</td>
                      <td className="p-6 text-right font-black text-sm text-blue-600">₹{item.total.toLocaleString('en-IN')}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-3 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900 dark:bg-black p-10 rounded-[40px] text-white shadow-[0_40px_80px_-20px_rgba(30,41,59,0.5)] relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-125 transition-all duration-1000"><Calculator size={220} /></div>
            <h3 className="text-xl font-black mb-10 relative uppercase tracking-tighter">Invoice Summary</h3>
            <div className="space-y-5 text-slate-400 text-sm relative">
              <div className="flex justify-between font-bold"><span>Total Taxable</span><span className="text-white">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold"><span>Total Tax (GST)</span><span className="text-emerald-400">₹{totalTax.toFixed(2)}</span></div>
              <div className="flex justify-between items-center font-bold"><span>Round Off</span><span className="bg-slate-800 px-3 py-1 rounded-lg text-xs text-white">{roundOff}</span></div>
              <div className="h-[1px] bg-slate-800/50 my-8"></div>
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Net Payable</p>
                <p className="text-5xl font-black text-white tracking-tighter leading-none">₹{grandTotalRounded.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="mt-12 space-y-4 relative">
              <button onClick={handleGenerateInvoice} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-[0_20px_40px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-widest">
                <Download size={24} /> Generate
              </button>
              <div className="flex gap-3">
                <button className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-3xl font-black text-xs uppercase hover:bg-slate-700 transition-all">Draft</button>
                <button onClick={() => { setItems([]); setParty(null); }} className="px-6 py-4 bg-rose-900/20 text-rose-500 rounded-3xl font-black text-xs uppercase hover:bg-rose-900/40 transition-all">Reset</button>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3 text-blue-600">
              <Truck size={18} /> Shipment Details
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Transport Agent</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none text-xs font-black" value={logistics.transport} onChange={(e) => setLogistics({...logistics, transport: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Vehicle No</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none text-xs font-black uppercase" value={logistics.vehicleNo} onChange={(e) => setLogistics({...logistics, vehicleNo: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">LR/GR No</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none text-xs font-black" value={logistics.grNo} onChange={(e) => setLogistics({...logistics, grNo: e.target.value})} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Billing;
