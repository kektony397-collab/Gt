
import * as XLSX from 'xlsx';

/**
 * Fuzzy mapping configuration for pharmaceutical data
 */
const PRODUCT_MAP: Record<string, string[]> = {
  name: ['product', 'item', 'medicine', 'name', 'description', 'brand'],
  manufacturer: ['mfg', 'manufacturer', 'company', 'brand_name', 'lab'],
  batch: ['batch', 'lot', 'bno', 'batch_no'],
  expiry: ['exp', 'expiry', 'valid_till', 'exp_date'],
  hsn: ['hsn', 'hsn_code', 'code'],
  gstRate: ['gst', 'tax', 'gst_rate', 'tax_rate', 'igst'],
  mrp: ['mrp', 'max_price'],
  purchaseRate: ['purchase', 'p_rate', 'cost', 'buy_price'],
  saleRate: ['sale', 's_rate', 'rate', 'selling_price', 'wholesale_rate'],
  stock: ['stock', 'qty', 'quantity', 'closing_stock', 'balance']
};

const PARTY_MAP: Record<string, string[]> = {
  name: ['party', 'customer', 'client', 'name', 'shop', 'firm'],
  gstin: ['gstin', 'gst_no', 'gst', 'tax_id'],
  address: ['address', 'location', 'city', 'area'],
  phone: ['phone', 'mobile', 'contact', 'tel'],
  email: ['email', 'mail'],
  stateCode: ['state', 'state_code', 'code'],
  dl1: ['dl1', 'dl_no_20b', 'drug_license_1', 'license1'],
  dl2: ['dl2', 'dl_no_21b', 'drug_license_2', 'license2']
};

export const normalizeData = (rows: any[], type: 'PRODUCT' | 'PARTY'): any[] => {
  const mapping = type === 'PRODUCT' ? PRODUCT_MAP : PARTY_MAP;
  
  return rows.map(row => {
    const normalized: any = {};
    const keys = Object.keys(row);

    // Initial Default values
    if (type === 'PRODUCT') {
      normalized.gstRate = 12;
      normalized.stock = 10; // Forced Defaulting to 10
      normalized.purchaseRate = 0;
      normalized.saleRate = 0;
      normalized.mrp = 0;
    } else {
      normalized.type = 'WHOLESALE';
      normalized.pricingTier = 'WHOLESALE';
      normalized.creditLimit = 0;
      normalized.currentBalance = 0;
    }

    Object.entries(mapping).forEach(([targetKey, synonyms]) => {
      const sourceKey = keys.find(k => 
        synonyms.includes(k.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
      );
      if (sourceKey) {
        let val = row[sourceKey];
        // Special handling for numeric fields to ensure they don't break logic
        if (['gstRate', 'mrp', 'purchaseRate', 'saleRate', 'stock'].includes(targetKey)) {
          val = parseFloat(val) || (targetKey === 'stock' ? 10 : 0);
        }
        normalized[targetKey] = val;
      }
    });

    return normalized;
  });
};

export const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
