
import { Dexie, type Table } from 'dexie';
import { Product, Party, Invoice, CompanyProfile } from './types';

// Use standard Dexie instance with explicit typing for better TypeScript compatibility
// This avoids inheritance-related property resolution issues in some environments
export const db = new Dexie('GopiDistributorsERP') as Dexie & {
  products: Table<Product>;
  parties: Table<Party>;
  invoices: Table<Invoice>;
  settings: Table<{ key: string; value: any }>;
};

// Define the schema version and stores
db.version(2).stores({
  products: '++id, name, manufacturer, batch, hsn, *tags',
  parties: '++id, name, gstin, phone, type, pricingTier',
  invoices: '++id, invoiceNo, date, partyName, [date+type]',
  settings: 'key'
});

export const DEFAULT_COMPANY: CompanyProfile = {
  name: 'GOPI DISTRIBUTOR',
  address: '74/20/4, Navyug Colony, Bhulabhai Park Crossroad, Ahmedabad-22 Ahmedabad',
  gstin: '24AADPO7411Q1ZE',
  phone: '07925383834, 8460143984, 9426005928',
  email: 'gopi.distributor@yahoo.com',
  dl1: 'GJ-ADC-AA/1946, GJ-ADC-AA/4967',
  dl2: 'GJ-ADC-AA/1953, GJ-ADC-AA/4856',
  stateCode: '24',
  terms: 'Credit'
};

export const initSettings = async () => {
  const company = await db.settings.get('company');
  if (!company) await db.settings.put({ key: 'company', value: DEFAULT_COMPANY });
  const theme = await db.settings.get('theme');
  if (!theme) await db.settings.put({ key: 'theme', value: 'ocean' });
};
