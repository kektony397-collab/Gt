
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { Product, Party, Invoice, InvoiceItem, CompanyProfile } from '../types';
import { 
  Search, 
  Trash2, 
  Plus, 
  Download, 
  Save, 
  Truck, 
  FileText,
  User,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { generateInvoice } from '../utils/pdfGenerator';
import { numberToWords } from '../utils/numberToWords';

const Billing: React.FC = () => {
  const [invoiceType, setInvoiceType] = useState<'WHOLESALE' | 'RETAIL'>('WHOLESALE');
  const [party, setParty] = useState<Party | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchParty, setSearchParty] = useState('');
  const [showPartyResults, setShowPartyResults] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductResults, setShowProductResults] = useState(false);

  const [logistics, setLogistics] = useState({
    transport: '',
    vehicleNo: '',
    grNo: ''
  });

  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    const loadCompany = async () => {
      const res = await db.settings.get('company');
      if (res) setCompany(res.value);
    };
    loadCompany();
  }, []);

  const handlePartySearch = async (val: string) => {
    setSearchParty(val);
    if (val.length > 1) {
      const results = await db.parties
        .where('name')
        .startsWithIgnoreCase(val)
        .or('gstin')
        .startsWithIgnoreCase(val)
        .toArray();
      setParties(results);
      setShowPartyResults(true);
    } else {
      setShowPartyResults(false);
    }
  };

  const handleProductSearch = async (val: string) => {
    setSearchProduct(val);
    if (val.length > 1) {
      const results = await db.products
        .where('name')
        .startsWithIgnoreCase(val)
        .or('batch')
        .startsWithIgnoreCase(val)
        .toArray();
      setProducts(results);
      setShowProductResults(true);
    } else {
      setShowProductResults(false);
    }
  };

  const addItem = (p: Product) => {
    const newItem: InvoiceItem = {
      productName: p.name,
      batch: p.batch,
      expiry: p.expiry,
      qty: 1,
      freeQty: 0,
      mrp: p.mrp,
      rate: p.saleRate,
      discount: 0,
      hsn: p.hsn,
      gstRate: p.gstRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    };
    const updatedItems = [...items, calculateRow(newItem)];
    setItems(updatedItems);
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
  const grandTotalRaw = subtotal + totalTax;
  const grandTotalRounded = Math.round(grandTotalRaw);
  const roundOff = parseFloat((grandTotalRounded - grandTotalRaw).toFixed(2));

  const handleGenerateInvoice = async () => {
    if (!party || items.length === 0 || !company) {
      alert("Validation Error: Please select a valid party and add at least one product.");
      return;
    }

    const invoice: Invoice = {
      invoiceNo: `TI-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: invoiceType,
      partyName: party.name,
      partyGstin: party.gstin,
      logistics,
      items,
      subtotal,
      totalTax,
      roundOff,
      grandTotal: grandTotalRounded
    };

    try {
      await db.invoices.add(invoice);
      
      for (const item of items) {
        const prod = await db.products.where({ name: item.productName, batch: item.batch }).first();
        if (prod) {
          await db.products.update(prod.id!, { stock: prod.stock - (item.qty + item.freeQty) });
        }
      }

      generateInvoice(invoice, company, party);
      
      setItems([]);
      setParty(null);
      // FIXED TYPO: removed the '<' character before grNo
      setLogistics({ transport: '', vehicleNo: '', grNo: '' });
      alert("Invoice Generated Successfully!");
    } catch (err) {
      console.error(err);
      alert("Error generating invoice.");
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-500">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing Center</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Mode: <span className="font-bold text-blue-600">{invoiceType}</span></p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
          <button 
            onClick={() => setInvoiceType('WHOLESALE')}
            className={`px-8 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${invoiceType === 'WHOLESALE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            WHOLESALE
          </button>
          <button 
            onClick={() => setInvoiceType('RETAIL')}
            className={`px-8 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${invoiceType === 'RETAIL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            RETAIL
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-800 glass p-8 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm relative z-30">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-500" />
              Customer Details
            </h3>
            
            <div className="relative">
              {!party ? (
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by Party Name or GSTIN..."
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 text-lg transition-all"
                    value={searchParty}
                    onChange={(e) => handlePartySearch(e.target.value)}
                  />
                  {showPartyResults && parties.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                      {parties.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => { setParty(p); setShowPartyResults(false); setSearchParty(''); }}
                          className="w-full p-6 text-left hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-lg">{p.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{p.gstin} • {p.address}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-500 px-3 py-1 bg-blue-50 dark:bg-blue-900/40 rounded-full">{p.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/50 group">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {party.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{party.name}</h4>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">GSTIN: {party.gstin} | DL: {party.dl1}</p>
                    </div>
                  </div>
                  <button onClick={() => setParty(null)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
                    Change Party
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800/50 glass rounded-4xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                Billing Grid
              </h3>
              <div className="relative group w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Scan Barcode or Search Product..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  value={searchProduct}
                  onChange={(e) => handleProductSearch(e.target.value)}
                />
                {showProductResults && products.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-40">
                    {products.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => addItem(p)}
                        disabled={p.stock <= 0}
                        className={`w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between ${p.stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                      >
                        <div>
                          <p className="font-bold text-sm">{p.name}</p>
                          <p className="text-[10px] text-slate-400">Batch: {p.batch} | Exp: {p.expiry}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">₹{p.saleRate}</p>
                          <p className={`text-[10px] font-bold ${p.stock < 10 ? 'text-rose-500' : 'text-slate-400'}`}>Stock: {p.stock}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Free</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Rate</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Disc%</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Taxable</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">GST</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-20 text-center">
                        <div className="max-w-xs mx-auto text-slate-300">
                          <Calculator size={64} className="mx-auto mb-4 opacity-10" />
                          <p className="text-lg font-medium">Ready to start billing</p>
                          <p className="text-sm">Add items from your inventory to begin generating a tax invoice.</p>
                        </div>
                      </td>
                    </tr>
                  ) : items.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.productName}</p>
                        <div className="flex gap-2 text-[10px] font-medium text-slate-400 mt-1 uppercase">
                          <span>Batch: {item.batch}</span>
                          <span>Exp: {item.expiry}</span>
                          <span>HSN: {item.hsn}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="number" 
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 p-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="number" 
                          value={item.freeQty}
                          onChange={(e) => updateItem(idx, 'freeQty', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 p-2 text-center bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-sm font-medium text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </td>
                      <td className="p-4 text-center">
                         <input 
                          type="number" 
                          value={item.rate}
                          onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-24 p-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm outline-none"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="number" 
                          value={item.discount}
                          onChange={(e) => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-14 p-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm outline-none"
                        />
                      </td>
                      <td className="p-4 text-right font-bold text-sm text-slate-700 dark:text-slate-200">₹{item.taxable.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-right">
                         <p className="text-xs font-bold text-emerald-600">₹{(item.cgst + item.sgst + item.igst).toFixed(2)}</p>
                         <p className="text-[10px] text-slate-400 font-bold">{item.gstRate}% GST</p>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white dark:bg-slate-800 p-8 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />
              Logistics
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Carrier / Transport</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. BlueDart, VRL"
                  value={logistics.transport}
                  onChange={(e) => setLogistics({...logistics, transport: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Vehicle No</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                    placeholder="DL 01 XX 0000"
                    value={logistics.vehicleNo}
                    onChange={(e) => setLogistics({...logistics, vehicleNo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">GR / Docket No</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="000123"
                    value={logistics.grNo}
                    onChange={(e) => setLogistics({...logistics, grNo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 dark:bg-slate-950 p-8 rounded-4xl text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-125 transition-transform duration-700">
               <Calculator size={200} />
            </div>
            
            <h3 className="text-xl font-bold mb-8 relative">Checkout Summary</h3>
            
            <div className="space-y-4 text-slate-400 text-sm relative">
              <div className="flex justify-between">
                <span>Taxable Value</span>
                <span className="text-white font-bold">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Consolidated GST</span>
                <span className="text-emerald-400 font-bold">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rounding</span>
                <span className="text-white font-medium bg-slate-800 px-2 py-1 rounded-lg text-xs">{roundOff >= 0 ? `+${roundOff}` : roundOff}</span>
              </div>
              <div className="h-[1px] bg-slate-800 my-6"></div>
              <div className="flex justify-between items-end pb-2">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-blue-400">Total Payable</p>
                  <p className="text-4xl font-black text-white mt-1 leading-none">₹{grandTotalRounded.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-4 relative">
              <button 
                onClick={handleGenerateInvoice}
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
              >
                <Download size={22} />
                Generate & Print
              </button>
              <div className="flex gap-2">
                <button className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-700 transition-all">
                  <Save size={18} />
                  Draft
                </button>
                <button 
                  onClick={() => { setItems([]); setParty(null); }}
                  className="px-6 py-4 bg-rose-900/20 text-rose-500 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-900/40 transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {items.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/50 flex gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                Stock levels will be automatically adjusted upon generation of the invoice. Ensure DL numbers are valid.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-8 left-[300px] right-8 z-50 bg-white/90 dark:bg-slate-800/90 glass px-12 py-6 rounded-4xl border border-slate-200 dark:border-slate-700 shadow-2xl flex items-center justify-between hidden lg:flex animate-in slide-in-from-bottom-10 duration-700">
        <div className="flex items-center gap-12">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items / Total Qty</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">
              {items.length} <span className="text-slate-400 font-medium">/</span> {items.reduce((sum, i) => sum + i.qty + i.freeQty, 0)}
            </p>
          </div>
          <div className="w-[1px] h-10 bg-slate-200 dark:bg-slate-700"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tax (GST)</p>
            <p className="text-2xl font-black text-emerald-600">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-[1px] h-10 bg-slate-200 dark:bg-slate-700"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Total</p>
            <p className="text-2xl font-black text-blue-600">₹{grandTotalRounded.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="max-w-md text-right">
           <p className="text-sm font-bold text-slate-500 italic leading-snug">
            "{numberToWords(grandTotalRounded)} Rupees Only"
           </p>
           <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Autogenerated Summary</p>
        </div>
      </div>
    </div>
  );
};

export default Billing;
