
import { jsPDF } from 'jspdf';
import { Invoice, CompanyProfile, Party, InvoiceItem } from '../types';
import { numberToWords } from './numberToWords';

export const generateInvoice = (invoice: Invoice, company: CompanyProfile, party: Party) => {
  if (invoice.type === 'WHOLESALE') {
    generateWholesale(invoice, company, party);
  } else {
    generateRetail(invoice, company, party);
  }
};

const generateWholesale = (invoice: Invoice, company: CompanyProfile, party: Party) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const m = 5; // Narrow margins like the photo
  const pw = 210;
  const ph = 297;

  // Set font to a dense condensed style if possible, else standard helvetica
  doc.setFont('helvetica', 'bold');
  
  // Outer Border
  doc.setLineWidth(0.3);
  doc.rect(m, m, pw - 2*m, ph - 2*m);

  // TOP BAR: GSTIN | TAX INVOICE | COPY
  doc.setFontSize(8);
  doc.text(`GSTIN No. ${company.gstin}`, m + 2, m + 5);
  doc.text('TAX INVOICE', pw/2, m + 5, { align: 'center' });
  doc.text('Duplicate Copy', pw - m - 2, m + 5, { align: 'right' });
  doc.line(m, m+8, pw-m, m+8);

  // HEADER: Name & Address
  doc.setFontSize(18);
  doc.text(company.name, pw/2, m + 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(company.address, pw/2, m + 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`(${company.dl1})  (${company.dl2})`, pw/2, m + 25, { align: 'center' });
  
  // Right side header (Phones)
  doc.setFont('helvetica', 'bold');
  const phones = company.phone.split(',');
  doc.text(phones[0].trim(), pw - m - 5, m + 15, { align: 'right' });
  doc.text(phones[1]?.trim() || '', pw - m - 5, m + 20, { align: 'right' });
  doc.text(`TERMS : ${company.terms}`, pw - m - 5, m + 25, { align: 'right' });
  doc.line(m, m + 28, pw - m, m + 28);

  // META SECTION: Split 60/40
  const midX = 120;
  doc.setFontSize(8);
  doc.text("Purchaser's Name and Address", m + 2, m + 32);
  doc.setFont('helvetica', 'bold');
  doc.text(party.name, m + 2, m + 36);
  doc.setFont('helvetica', 'normal');
  doc.text(party.address, m + 2, m + 40, { maxWidth: 100 });
  doc.text(`State : ${party.stateCode}`, m + 2, m + 50);
  doc.text(`GSTIN : ${party.gstin}`, m + 2, m + 54);

  // Vertical line separating meta
  doc.line(midX, m + 28, midX, m + 70);
  doc.text(`INVOICE NO. ${invoice.invoiceNo}`, midX + 2, m + 32);
  doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pw - m - 2, m + 32, { align: 'right' });
  doc.line(midX, m + 36, pw - m, m + 36);
  doc.text(`GR No. ${invoice.logistics.grNo || ''}`, midX + 2, m + 41);
  doc.line(midX, m + 45, pw - m, m + 45);
  doc.text(`Vehicle No. ${invoice.logistics.vehicleNo || ''}`, midX + 2, m + 50);
  doc.line(midX, m + 54, pw - m, m + 54);
  doc.text(`TRANSPORT ${invoice.logistics.transport || ''}`, midX + 2, m + 59);

  // TABLE HEADER
  const ty = m + 70;
  doc.line(m, ty, pw - m, ty);
  const cols = [
    { n: 'S.N', w: 8 },
    { n: 'ITEM DESCRIPTION', w: 32 },
    { n: 'Batch', w: 15 },
    { n: 'Exp', w: 12 },
    { n: 'HSN', w: 12 },
    { n: 'OLD', w: 10 },
    { n: 'NEW', w: 10 },
    { n: 'QTY', w: 8 },
    { n: 'Fr.', w: 6 },
    { n: 'RATE', w: 15 },
    { n: 'TOTAL', w: 15 },
    { n: 'DISC', w: 12 },
    { n: 'TAXABLE', w: 15 },
    { n: 'SGST', w: 12 },
    { n: 'CGST', w: 12 },
    { n: 'IGST', w: 12 },
    { n: 'TOTAL', w: 15 }
  ];

  let curX = m;
  doc.setFontSize(6);
  cols.forEach(c => {
    doc.text(c.n, curX + c.w/2, ty + 4, { align: 'center' });
    doc.line(curX, ty, curX, ty + 160); // Vertical table lines
    curX += c.w;
  });
  doc.line(pw - m, ty, pw - m, ty + 160);
  doc.line(m, ty + 8, pw - m, ty + 8); // Header bottom line

  // TABLE DATA
  let curY = ty + 12;
  invoice.items.forEach((item, i) => {
    let x = m;
    doc.text(String(i + 1), x + 4, curY, { align: 'center' }); x += 8;
    doc.text(item.productName, x + 1, curY); x += 32;
    doc.text(item.batch, x + 1, curY); x += 15;
    doc.text(item.expiry, x + 1, curY); x += 12;
    doc.text(item.hsn, x + 1, curY); x += 12;
    doc.text(String(item.mrp || ''), x + 5, curY, { align: 'center' }); x += 10;
    doc.text(String(item.mrp || ''), x + 5, curY, { align: 'center' }); x += 10;
    doc.text(String(item.qty), x + 4, curY, { align: 'center' }); x += 8;
    doc.text(String(item.freeQty), x + 3, curY, { align: 'center' }); x += 6;
    doc.text(item.rate.toFixed(2), x + 14, curY, { align: 'right' }); x += 15;
    doc.text((item.rate * item.qty).toFixed(2), x + 14, curY, { align: 'right' }); x += 15;
    doc.text(item.discount > 0 ? `${item.discount}%` : '', x + 6, curY, { align: 'center' }); x += 12;
    doc.text(item.taxable.toFixed(2), x + 14, curY, { align: 'right' }); x += 15;
    doc.text(item.sgst.toFixed(2), x + 11, curY, { align: 'right' }); x += 12;
    doc.text(item.cgst.toFixed(2), x + 11, curY, { align: 'right' }); x += 12;
    doc.text(item.igst.toFixed(2), x + 11, curY, { align: 'right' }); x += 12;
    doc.text(item.total.toFixed(2), x + 14, curY, { align: 'right' });
    curY += 5;
  });

  // FOOTER LINES
  const fy = ty + 160;
  doc.line(m, fy, pw - m, fy);

  // HSN SUMMARY
  doc.setFontSize(7);
  doc.text('HSN/SAC', m + 2, fy + 5);
  doc.text('Taxable', m + 25, fy + 5);
  doc.text('SGST %', m + 45, fy + 5);
  doc.text('Amt.', m + 60, fy + 5);
  doc.text('CGST %', m + 75, fy + 5);
  doc.text('Amt.', m + 90, fy + 5);
  
  // Group by HSN
  const hsnMap = new Map();
  invoice.items.forEach(item => {
    const existing = hsnMap.get(item.hsn) || { taxable: 0, sgst: 0, cgst: 0, rate: item.gstRate/2 };
    hsnMap.set(item.hsn, { ...existing, taxable: existing.taxable + item.taxable, sgst: existing.sgst + item.sgst, cgst: existing.cgst + item.cgst });
  });

  let hsnY = fy + 10;
  hsnMap.forEach((v, k) => {
    doc.text(k, m + 2, hsnY);
    doc.text(v.taxable.toFixed(2), m + 25, hsnY);
    doc.text(`${v.rate}%`, m + 45, hsnY);
    doc.text(v.sgst.toFixed(2), m + 60, hsnY);
    doc.text(`${v.rate}%`, m + 75, hsnY);
    doc.text(v.cgst.toFixed(2), m + 90, hsnY);
    hsnY += 4;
  });

  // TOTALS ON RIGHT
  const tx = 130;
  doc.text('Total Amount Before Tax', tx, fy + 5);
  doc.text(invoice.subtotal.toFixed(2), pw - m - 2, fy + 5, { align: 'right' });
  doc.text('Add: SGST', tx, fy + 10);
  doc.text((invoice.totalTax/2).toFixed(2), pw - m - 2, fy + 10, { align: 'right' });
  doc.text('Add: CGST', tx, fy + 15);
  doc.text((invoice.totalTax/2).toFixed(2), pw - m - 2, fy + 15, { align: 'right' });
  doc.text('Total Tax Amount : GST', tx, fy + 25);
  doc.text(invoice.totalTax.toFixed(2), pw - m - 2, fy + 25, { align: 'right' });

  doc.line(tx - 5, fy, tx - 5, fy + 45); // Divider line
  doc.line(tx - 5, fy + 35, pw - m, fy + 35);
  doc.setFontSize(11);
  doc.text('GRAND TOTAL', tx, fy + 42);
  doc.text(invoice.grandTotal.toFixed(2), pw - m - 2, fy + 42, { align: 'right' });

  // BOTTOM LEGAL TEXT
  doc.setFontSize(8);
  doc.text(`Bill Amount In Words : ${numberToWords(invoice.grandTotal)} Only`, m + 2, fy + 38);
  doc.line(m, fy + 45, pw - m, fy + 45);

  doc.text('Terms & Conditions:', m + 2, fy + 50);
  doc.setFontSize(7);
  doc.text('E. & .O.E.', m + 2, fy + 54);
  doc.text('Bill No. is must while returning EXP. Products', m + 2, fy + 58);

  doc.setFontSize(10);
  doc.text(`For ${company.name}`, pw - m - 10, fy + 54, { align: 'right' });
  doc.setFontSize(8);
  doc.text('Auth. Signatory', pw - m - 10, fy + 65, { align: 'right' });

  doc.save(`Invoice_Wholesale_${invoice.invoiceNo}.pdf`);
};

const generateRetail = (invoice: Invoice, company: CompanyProfile, party: Party) => {
  const doc = new jsPDF('p', 'mm', [80, 200]); // 80mm Roll format for retail
  doc.setFontSize(12);
  doc.text(company.name, 40, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Retail Receipt', 40, 14, { align: 'center' });
  doc.text(`Invoice: ${invoice.invoiceNo}`, 5, 22);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 5, 26);
  doc.line(5, 28, 75, 28);
  
  let y = 34;
  invoice.items.forEach(item => {
    doc.text(item.productName, 5, y);
    doc.text(`${item.qty} x ${item.rate}`, 5, y + 4);
    doc.text(item.total.toFixed(2), 75, y + 4, { align: 'right' });
    y += 10;
  });
  
  doc.line(5, y, 75, y);
  y += 6;
  doc.setFontSize(10);
  doc.text('TOTAL:', 5, y);
  doc.text(`Rs. ${invoice.grandTotal.toFixed(2)}`, 75, y, { align: 'right' });
  y += 10;
  doc.setFontSize(8);
  doc.text('Thank you for your visit!', 40, y, { align: 'center' });
  
  doc.save(`Receipt_Retail_${invoice.invoiceNo}.pdf`);
};
