
export type ThemeType = 'ocean' | 'nature' | 'royal' | 'midnight';
export type PricingTier = 'WHOLESALE' | 'RETAIL' | 'HOSPITAL' | 'INSTITUTIONAL';

export interface Product {
  id?: number;
  name: string;
  manufacturer: string;
  batch: string;
  expiry: string;
  hsn: string;
  gstRate: number;
  mrp: number;
  oldMrp?: number;
  purchaseRate: number;
  saleRate: number;
  stock: number;
  tags?: string[];
}

export interface Party {
  id?: number;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  stateCode: string;
  dl1: string;
  dl2: string;
  type: 'WHOLESALE' | 'RETAIL';
  pricingTier: PricingTier;
  creditLimit: number;
  currentBalance: number;
}

export interface InvoiceItem {
  productName: string;
  batch: string;
  expiry: string;
  qty: number;
  freeQty: number;
  mrp: number;
  rate: number;
  discount: number;
  hsn: string;
  gstRate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Invoice {
  id?: number;
  invoiceNo: string;
  date: string;
  type: 'WHOLESALE' | 'RETAIL';
  partyName: string;
  partyGstin?: string;
  logistics: {
    transport: string;
    vehicleNo: string;
    grNo: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
}

export interface CompanyProfile {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  dl1: string;
  dl2: string;
  stateCode: string;
  terms: string;
}
