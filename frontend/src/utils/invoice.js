/**
 * invoice.js — Tax Invoice Generator for Vasanta (Shvom Bespoke Gifting)
 * Designed to match the Mahesh_CH tax invoice layout & specifications.
 * Bank details sourced from verified HDFC Bank records (PDFGallery).
 *
 * GSTIN: 36AHEPC4719K1ZD
 * Address: Rajendra Nager, Hyderabad, Telangana, 500048
 * Bank: HDFC Bank, Tolichowki Branch (IFSC: HDFC0010444, A/C: 50200112212031)
 */

/**
 * Converts a numeric amount to Indian currency words with paise.
 * Example: 116672.10 -> "One Lakh Sixteen Thousand Six Hundred Seventy Two Rupees and Ten Paise"
 */
export function amountInWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      str += convertTwoDigits(n);
    }
    return str.trim();
  }

  const rounded = Math.round(Number(num) * 100) / 100;
  const integerPart = Math.floor(rounded);
  const paisePart = Math.round((rounded - integerPart) * 100);

  if (integerPart === 0 && paisePart === 0) return 'Zero Rupees Only';

  let rupeesStr = '';
  let crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  let hundred = remainder % 1000;

  if (crore > 0) rupeesStr += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) rupeesStr += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) rupeesStr += convertThreeDigits(thousand) + ' Thousand ';
  if (hundred > 0) rupeesStr += convertThreeDigits(hundred) + ' ';

  rupeesStr = rupeesStr.trim();
  let result = rupeesStr ? rupeesStr + ' Rupees' : '';

  if (paisePart > 0) {
    const paiseStr = convertTwoDigits(paisePart) + ' Paise';
    result = result ? `${result} and ${paiseStr}` : paiseStr;
  }

  return (result + ' Only').trim();
}

/**
 * Format currency with Indian comma separators.
 */
function formatINR(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Normalizes line items for calculation and invoice presentation.
 */
export function normalizeItems(form, receipt) {
  if (form && Array.isArray(form.items) && form.items.length > 0) {
    return form.items.map((item, idx) => {
      const qty = Number(item.qty) || 1;
      const rate = Number(item.rate) || 0;
      const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : 18;
      const taxable = Math.round(qty * rate * 100) / 100;
      const gstAmount = Math.round((taxable * gstRate) / 100 * 100) / 100;
      const total = Math.round((taxable + gstAmount) * 100) / 100;

      return {
        sno: idx + 1,
        description: item.description || item.name || 'Bespoke Curation & Gifting Services',
        hsn: item.hsn ? String(item.hsn).trim() : '997212',
        qty: qty,
        unit: item.unit || 'PCS',
        rate: rate,
        taxable: taxable,
        gstRate: gstRate,
        gstAmount: gstAmount,
        total: total,
      };
    });
  }

  // Fallback for single-amount receipts / legacy form inputs
  const totalAmount = Number((receipt && receipt.amount) || (form && form.amount) || 0);
  const gstRate = 18;
  const taxable = Math.round((totalAmount / (1 + gstRate / 100)) * 100) / 100;
  const gstAmount = Math.round((totalAmount - taxable) * 100) / 100;

  const desc =
    (form && (form.description || form.purpose_description || form.notes)) ||
    (receipt && receipt.purpose) ||
    'Bespoke Return Gifting & Custom Packaging';

  const hsn = (form && form.hsn) || '997212';

  return [
    {
      sno: 1,
      description: desc,
      hsn: hsn,
      qty: 1,
      unit: 'LOT',
      rate: taxable,
      taxable: taxable,
      gstRate: gstRate,
      gstAmount: gstAmount,
      total: totalAmount,
    },
  ];
}

/**
 * generateInvoiceHTML — builds a complete A4-ready invoice HTML string
 * in the exact style of the reference invoice (Mahesh_CH file).
 * Supports both standard TAX INVOICE and PROFORMA INVOICE templates.
 *
 * @param {Object} receipt — Payment response or bill record
 * @param {Object} form    — Form inputs (bill to, GSTIN, items, notes)
 * @param {Object} options — { isProforma: boolean }
 */
export function generateInvoiceHTML(receipt = {}, form = {}, options = {}) {
  const isProforma = Boolean(options.isProforma);
  const docTitle = isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  const copyTag = isProforma ? 'PRE-PAYMENT ESTIMATE' : 'ORIGINAL FOR RECIPIENT';

  // Strictly use the custom date entered on the bill if provided
  const rawDate = form.invoice_date || receipt.invoice_date || receipt.created_at;
  let dateFormatted = '';
  if (rawDate) {
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-');
      dateFormatted = `${d}/${m}/${y}`;
    } else {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(
          d.getMonth() + 1
        ).padStart(2, '0')}/${d.getFullYear()}`;
      }
    }
  }
  if (!dateFormatted) {
    const invoiceDate = new Date();
    dateFormatted = `${String(invoiceDate.getDate()).padStart(2, '0')}/${String(
      invoiceDate.getMonth() + 1
    ).padStart(2, '0')}/${invoiceDate.getFullYear()}`;
  }

  const defaultPrefix = isProforma ? 'PI-VAS' : 'VAS';
  const invoiceNo =
    form.invoice_no ||
    receipt.invoice_no ||
    receipt.transaction_id ||
    `${defaultPrefix}/${invoiceDate.getFullYear()}-${String(invoiceDate.getFullYear() + 1).slice(-2)}/${String(
      Math.floor(10 + Math.random() * 90)
    )}`;

  // Bill To details
  const customerName = form.customer_name || receipt.customer_name || 'Mahesh CH';
  const customerPhone = form.customer_phone || receipt.customer_phone || '';
  const customerEmail = form.customer_email || receipt.customer_email || '';
  const customerGstin = form.customer_gstin || receipt.customer_gstin || '';
  const customerAddress =
    form.customer_address || receipt.customer_address || '';
  const placeOfSupply =
    form.place_of_supply || receipt.place_of_supply || 'Telangana';

  // Process items
  const items = normalizeItems(form, receipt);

  let totalQty = 0;
  let totalTaxable = 0;
  let totalGstAmount = 0;
  let grandTotal = 0;

  items.forEach((it) => {
    totalQty += it.qty;
    totalTaxable += it.taxable;
    totalGstAmount += it.gstAmount;
    grandTotal += it.total;
  });

  // Check if place of supply is Telangana (State Code 36)
  // If intra-state Telangana, CGST + SGST (each half of gstRate)
  // If interstate, IGST
  const isIntrastate =
    placeOfSupply.toLowerCase().includes('telangana') ||
    (customerGstin && customerGstin.startsWith('36'));

  // Group by HSN/SAC and GST Rate for the Tax Summary Table
  const hsnMap = {};
  items.forEach((it) => {
    const key = `${it.hsn}_${it.gstRate}`;
    if (!hsnMap[key]) {
      hsnMap[key] = {
        hsn: it.hsn,
        gstRate: it.gstRate,
        taxable: 0,
        gstAmount: 0,
      };
    }
    hsnMap[key].taxable += it.taxable;
    hsnMap[key].gstAmount += it.gstAmount;
  });

  const hsnRows = Object.values(hsnMap);

  const amountWords = amountInWords(grandTotal);

  // Payment split details (from admin bill or customer form)
  const advanceAmount = Number(form.advance_amount) || Number(receipt.advance_amount) || 0;
  const advancePaymentMode = form.advance_payment_mode || receipt.advance_payment_mode || '';
  const remainingAmount = advanceAmount > 0
    ? Math.max(0, grandTotal - advanceAmount)
    : (Number(form.remaining_amount) || Number(receipt.remaining_amount) || 0);
  const remainingPaymentMode = form.remaining_payment_mode || receipt.remaining_payment_mode || '';
  // Payment reference (Cashfree transaction ID for customer invoices)
  const paymentRef = receipt.transaction_id || receipt.order_id || form.transaction_id || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle} ${invoiceNo} — Vasanta</title>
  <style>
    /* ── Base Setup ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 210mm;
      background: #f4f4f4;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── A4 Page Sheet ── */
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 10px auto;
      background: #fff;
      padding: 10mm 12mm;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }

    /* ── Outer Invoice Container with Solid Border ── */
    .invoice-box {
      border: 1.5px solid #000;
      background: transparent;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }

    /* ── Top Header Bar ── */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 6px;
      border-bottom: 1.5px solid #000;
      font-size: 8pt;
      font-weight: bold;
    }
    .top-title { font-size: 9pt; letter-spacing: 0.05em; }
    .top-copy {
      border: 1px solid #777;
      padding: 1px 6px;
      font-size: 7.5pt;
      color: #444;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* ── Header Two-Column Grid ── */
    .header-grid {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      border-bottom: 1.5px solid #000;
    }
    .header-left {
      padding: 8px 10px;
      border-right: 1.5px solid #000;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .seller-logo {
      width: 62px;
      height: 62px;
      object-fit: contain;
      border-radius: 50%;
      flex-shrink: 0;
      background: #1a1a1a;
      border: 1px solid #c8b082;
    }
    .seller-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .seller-name {
      font-size: 13pt;
      font-weight: bold;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .seller-address {
      font-size: 7.5pt;
      color: #222;
      line-height: 1.3;
      margin-top: 1px;
    }
    .seller-meta {
      font-size: 7.5pt;
      margin-top: 3px;
      color: #111;
      line-height: 1.35;
    }
    .seller-meta b { font-weight: 700; color: #000; }

    .header-right {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 6px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    .meta-table td {
      padding: 2px 2px;
      vertical-align: top;
    }
    .meta-table .label {
      font-weight: 700;
      color: #000;
      width: 48%;
    }
    .meta-table .val {
      font-weight: 600;
      color: #111;
    }
    .attn-box {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #ccc;
      font-size: 7.5pt;
    }
    .attn-box .attn-title { font-weight: 700; color: #333; }
    .attn-box .attn-name { font-size: 8.5pt; font-weight: bold; margin-top: 2px; }

    /* ── Bill To / Ship To Grid ── */
    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1.5px solid #000;
    }
    .party-col {
      padding: 6px 10px;
      font-size: 8pt;
      line-height: 1.4;
    }
    .party-col:first-child {
      border-right: 1.5px solid #000;
    }
    .party-title {
      font-size: 7.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
      color: #000;
      text-decoration: underline;
    }
    .party-name {
      font-weight: bold;
      font-size: 9pt;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .party-line { font-size: 7.5pt; color: #222; }

    /* ── Main Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    .items-table th, .items-table td {
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 5px 6px;
      vertical-align: middle;
    }
    .items-table th:last-child, .items-table td:last-child {
      border-right: none;
    }
    .items-table th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .col-sno { width: 34px; text-align: center; }
    .col-desc { text-align: left; }
    .col-hsn { width: 75px; text-align: center; }
    .col-qty { width: 65px; text-align: center; }
    .col-rate { width: 75px; text-align: right; }
    .col-gst { width: 60px; text-align: center; }
    .col-amt { width: 90px; text-align: right; }

    .item-row td {
      min-height: 28px;
    }
    .item-desc-text {
      font-weight: 600;
      color: #000;
    }

    /* Subtotal & Tax Rows */
    .tax-subrow td {
      padding: 4px 6px;
      font-size: 7.5pt;
      border-bottom: 1px solid #000;
    }
    .tax-subrow .tax-label {
      text-align: right;
      font-weight: bold;
      font-style: italic;
    }
    .tax-subrow .tax-val {
      text-align: right;
      font-weight: 600;
    }

    /* Total Row */
    .total-row td {
      background: #e8f3e8;
      font-weight: bold;
      font-size: 8.5pt;
      border-bottom: 1.5px solid #000;
      padding: 5px 6px;
    }
    .total-row .total-label {
      text-align: right;
      letter-spacing: 0.05em;
    }
    .total-row .total-qty { text-align: center; }
    .total-row .total-amt { text-align: right; font-size: 9pt; }

    /* ── HSN/SAC Tax Summary Table ── */
    .hsn-section {
      border-bottom: 1.5px solid #000;
    }
    .hsn-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    .hsn-table th, .hsn-table td {
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 6px;
      text-align: center;
    }
    .hsn-table th:last-child, .hsn-table td:last-child {
      border-right: none;
    }
    .hsn-table tr:last-child td {
      border-bottom: none;
    }
    .hsn-table th {
      background: #e8f3e8;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 7pt;
    }
    .hsn-table .col-taxable { text-align: right; }
    .hsn-table .col-taxamt { text-align: right; }
    .hsn-total-row td {
      background: #fafafa;
      font-weight: bold;
    }

    /* ── Amount in Words Bar ── */
    .words-box {
      padding: 5px 8px;
      border-bottom: 1.5px solid #000;
      background: #fafafa;
      font-size: 7.5pt;
    }
    .words-box .words-label {
      font-weight: bold;
      color: #000;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-size: 7pt;
    }
    .words-box .words-content {
      font-weight: bold;
      font-size: 8pt;
      color: #111;
    }

    /* ── Bottom Section (Bank Details + Signatory) ── */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      border-bottom: none;
    }
    .bottom-left {
      padding: 6px 10px;
      border-right: 1.5px solid #000;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .box-title {
      font-size: 7.5pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
      margin-bottom: 3px;
    }
    .bank-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      line-height: 1.35;
    }
    .bank-table td { padding: 1px 2px; vertical-align: top; }
    .bank-table .b-label { width: 75px; color: #333; font-weight: 600; }
    .bank-table .b-val { color: #000; font-weight: bold; }

    .terms-box {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dashed #bbb;
      font-size: 7pt;
      color: #333;
      line-height: 1.35;
    }
    .terms-box ol {
      margin-left: 14px;
      margin-top: 2px;
    }

    .bottom-right {
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .qr-area {
      font-size: 7.5pt;
    }
    .qr-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 3px;
    }
    .qr-box {
      width: 48px;
      height: 48px;
      border: 1px solid #999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      font-weight: bold;
      color: #444;
      background: #fafafa;
    }
    .upi-info {
      font-size: 7pt;
      line-height: 1.3;
    }
    .upi-info b { color: #000; }

    .sign-area {
      display: flex;
      flex-direction: column;
      margin-top: auto;
    }
    .sign-title {
      font-size: 7.5pt;
      color: #333;
    }
    .sign-entity {
      font-size: 9pt;
      font-weight: bold;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    .pay-split-box {
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 5px 7px;
      margin-bottom: 6px;
      background: #fafafa;
      text-align: left;
    }

    /* ── Action Bar for Browser View ── */
    .screen-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 12px;
      background: #1a1a1a;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .screen-actions button {
      padding: 7px 20px;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-print { background: #b89b6a; color: #fff; }
    .btn-print:hover { background: #a38758; }
    .btn-close { background: #444; color: #fff; }

    /* ── Print Overrides ── */
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    @media print {
      body { background: #fff; }
      .sheet {
        margin: 0;
        padding: 0;
        box-shadow: none;
        width: 100%;
        min-height: auto;
      }
      .no-print { display: none !important; }
      .invoice-box { border: 1.5px solid #000 !important; }
    }

    /* ── Watermark: Static, upright, centered medallion ── */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 0;
      opacity: 0.085;
      width: 440px;
      height: 440px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    @media print {
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.085;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

  <!-- Screen-only action toolbar -->
  <div class="screen-actions no-print">
    <button class="btn-close" onclick="window.close()">✕ Close</button>
    <button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
  </div>

  <div class="sheet">
    <!-- Centered Static Logo Watermark -->
    <div class="watermark">
      <img src="/images/watermark_logo.png" alt="Shvom Emblem Watermark" onerror="this.src='/images/watermark_logo.jpg'" />
    </div>

    <div class="invoice-box">

      <!-- ── TOP BAR ── -->
      <div class="top-bar">
        <span class="top-title">${docTitle}</span>
        <span class="top-copy">${copyTag}</span>
      </div>

      <!-- ── HEADER: LOGO, SELLER & INVOICE META ── -->
      <div class="header-grid">
        <div class="header-left">
          <img src="/images/logo.png" alt="Vasanta Logo" class="seller-logo" onerror="this.src='/images/file_logo.png'" />
          <div class="seller-details">
            <div class="seller-name">Shvom Enterprises</div>
            <div class="seller-address">Telangana, India</div>
            <div class="seller-meta">
              <b>GSTIN:</b> 36AHEPC4719K1ZD<br />
              
              <b>Email:</b> team.shvom@gmail.com &nbsp;|&nbsp; support@shvom.in<br />
            </div>
          </div>
        </div>

        <div class="header-right">
          <table class="meta-table">
            <tr>
              <td class="label">${isProforma ? 'Proforma No.' : 'Invoice No.'}</td>
              <td class="val">${invoiceNo}</td>
            </tr>
            <tr>
              <td class="label">Invoice Date</td>
              <td class="val">${dateFormatted}</td>
            </tr>
            <tr>
              <td class="label">Place of Supply</td>
              <td class="val">${placeOfSupply}</td>
            </tr>
          </table>

          <div class="attn-box">
            <span class="attn-title">Kind Attn:</span>
            <div class="attn-name">${customerName}</div>
          </div>
        </div>
      </div>

      <!-- ── BILL TO & SHIP TO ── -->
      <div class="party-grid">
        <div class="party-col">
          <div class="party-title">BILL TO</div>
          <div class="party-name">${customerName}</div>
          <div class="party-line"><b>Address:</b> ${customerAddress}</div>
          ${customerGstin ? `<div class="party-line"><b>GSTIN:</b> ${customerGstin}</div>` : ''}
          <div class="party-line"><b>Place of Supply:</b> ${placeOfSupply}</div>
          ${customerPhone ? `<div class="party-line"><b>Phone:</b> ${customerPhone}</div>` : ''}
          ${customerEmail ? `<div class="party-line"><b>Email:</b> ${customerEmail}</div>` : ''}
        </div>

        <div class="party-col">
          <div class="party-title">SHIP TO</div>
          <div class="party-name">${customerName}</div>
          <div class="party-line"><b>Address:</b> ${customerAddress}</div>
          <div class="party-line"><b>Place of Supply:</b> ${placeOfSupply}</div>
          ${customerPhone ? `<div class="party-line"><b>Contact:</b> ${customerPhone}</div>` : ''}
        </div>
      </div>

      <!-- ── MAIN ITEMS TABLE ── -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-sno">S.NO.</th>
            <th class="col-desc">ITEMS / DESCRIPTION</th>
            <th class="col-hsn">HSN/SAC</th>
            <th class="col-qty">QTY.</th>
            <th class="col-rate">RATE (₹)</th>
            <th class="col-gst">GST</th>
            <th class="col-amt">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${items
      .map(
        (it) => `
          <tr class="item-row">
            <td class="col-sno">${it.sno}</td>
            <td class="col-desc">
              <span class="item-desc-text">${it.description}</span>
            </td>
            <td class="col-hsn">${it.hsn}</td>
            <td class="col-qty">${it.qty} ${it.unit}</td>
            <td class="col-rate">${formatINR(it.rate)}</td>
            <td class="col-gst">${it.gstRate}%</td>
            <td class="col-amt">${formatINR(it.taxable)}</td>
          </tr>`
      )
      .join('')}

          <!-- Tax rows -->
          ${isIntrastate
      ? `
          <tr class="tax-subrow">
            <td colspan="5" class="tax-label">CGST @ 9%</td>
            <td class="col-gst">9%</td>
            <td class="tax-val">₹ ${formatINR(totalGstAmount / 2)}</td>
          </tr>
          <tr class="tax-subrow">
            <td colspan="5" class="tax-label">SGST @ 9%</td>
            <td class="col-gst">9%</td>
            <td class="tax-val">₹ ${formatINR(totalGstAmount / 2)}</td>
          </tr>`
      : `
          <tr class="tax-subrow">
            <td colspan="5" class="tax-label">IGST @ 18%</td>
            <td class="col-gst">18%</td>
            <td class="tax-val">₹ ${formatINR(totalGstAmount)}</td>
          </tr>`
    }

          <!-- Total Row -->
          <tr class="total-row">
            <td colspan="3" class="total-label">TOTAL</td>
            <td class="total-qty">${totalQty}</td>
            <td colspan="2"></td>
            <td class="total-amt">₹ ${formatINR(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- ── HSN / SAC TAX SUMMARY TABLE ── -->
      <div class="hsn-section">
        <table class="hsn-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 120px;">HSN/SAC</th>
              <th rowspan="2" class="col-taxable">Taxable Value (₹)</th>
              <th colspan="2">${isIntrastate ? 'CGST + SGST' : 'IGST'}</th>
              <th rowspan="2" class="col-taxamt" style="width: 140px;">Total Tax Amount (₹)</th>
            </tr>
            <tr>
              <th style="width: 80px;">Rate</th>
              <th style="width: 110px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${hsnRows
      .map(
        (h) => `
            <tr>
              <td>${h.hsn}</td>
              <td class="col-taxable">${formatINR(h.taxable)}</td>
              <td>${h.gstRate}%</td>
              <td class="col-taxamt">${formatINR(h.gstAmount)}</td>
              <td class="col-taxamt">₹ ${formatINR(h.gstAmount)}</td>
            </tr>`
      )
      .join('')}
            <tr class="hsn-total-row">
              <td><b>Total</b></td>
              <td class="col-taxable"><b>${formatINR(totalTaxable)}</b></td>
              <td></td>
              <td class="col-taxamt"><b>${formatINR(totalGstAmount)}</b></td>
              <td class="col-taxamt"><b>₹ ${formatINR(totalGstAmount)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── TOTAL AMOUNT IN WORDS ── -->
      <div class="words-box">
        <div class="words-label">Total Amount (in words)</div>
        <div class="words-content">${amountWords}</div>
      </div>

      <!-- ── BOTTOM GRID: BANK DETAILS, TERMS & SIGNATORY ── -->
      <div class="bottom-grid">
        <div class="bottom-left">
          <div class="box-title">Bank Details</div>
          <table class="bank-table">
            <tr>
              <td class="b-label">Name:</td>
              <td class="b-val">Shvom Enterprises</td>
            </tr>
            <tr>
              <td class="b-label">IFSC Code:</td>
              <td class="b-val">HDFC0010444</td>
            </tr>
            <tr>
              <td class="b-label">Account No:</td>
              <td class="b-val">50200112212031</td>
            </tr>
            <tr>
              <td class="b-label">Bank:</td>
              <td class="b-val">HDFC Bank, Tolichowki, Hyderabad, Telangana</td>
            </tr>
            <tr>
              <td class="b-label">Account Type:</td>
              <td class="b-val">Current Account</td>
            </tr>
          </table>

          <div class="terms-box">
            <div class="box-title" style="margin-bottom: 2px;">Terms and Conditions</div>
            <ol>
              <li>Goods once sold will not be taken back or exchanged</li>
              <li>All disputes are subject to Hyderabad jurisdiction only</li>
              ${isProforma
      ? `<li>This is a Proforma Invoice for advance payment estimation. Final Tax Invoice will be issued upon payment realization.</li>`
      : ''
    }
            </ol>
          </div>
        </div>

        
          <div class="sign-area">
            ${advanceAmount > 0 ? `
            <div class="pay-split-box">
              <div class="box-title" style="text-align:left;">Payment Summary</div>
              <table class="bank-table" style="font-size:7.5pt;">
                <tr>
                  <td class="b-label" style="width:120px;">Invoice Value:</td>
                  <td class="b-val">₹ ${formatINR(grandTotal)}</td>
                </tr>
                <tr>
                  <td class="b-label">Advance Received:</td>
                  <td class="b-val" style="color:#1a6e2e;">₹ ${formatINR(advanceAmount)}${advancePaymentMode ? ` <span style="font-weight:400;color:#555;">(via ${advancePaymentMode})</span>` : ''}</td>
                </tr>
                <tr>
                  <td class="b-label">Remaining Balance:</td>
                  <td class="b-val" style="color:#8B4513;">₹ ${formatINR(remainingAmount)}${remainingPaymentMode ? ` <span style="font-weight:400;color:#555;">(via ${remainingPaymentMode})</span>` : ''}</td>
                </tr>
                ${paymentRef ? `<tr><td class="b-label">Payment Ref:</td><td class="b-val" style="font-size:6.5pt;word-break:break-all;">${paymentRef}</td></tr>` : ''}
              </table>
            </div>` : `${paymentRef ? `
            <div class="pay-split-box">
              <table class="bank-table" style="font-size:7.5pt;">
                <tr><td class="b-label" style="width:120px;">Payment Ref:</td><td class="b-val" style="font-size:6.5pt;word-break:break-all;">${paymentRef}</td></tr>
              </table>
            </div>` : ''}`}
            <div style="padding-top:${advanceAmount > 0 || paymentRef ? '10px' : '24px'};text-align:right;margin-top:auto;">
              <div class="sign-title">Authorised Signatory For</div>
              <div class="sign-entity">Shvom Enterprises</div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /invoice-box -->
  </div><!-- /sheet -->

</body>
</html>`;
}

/**
 * generateProformaInvoiceHTML — helper for Proforma Invoice generation.
 */
export function generateProformaInvoiceHTML(receipt = {}, form = {}) {
  return generateInvoiceHTML(receipt, form, { isProforma: true });
}

/**
 * Opens invoice in a clean print-ready window and triggers the print dialog.
 */
export function printInvoice(receipt = {}, form = {}, options = {}) {
  const html = generateInvoiceHTML(receipt, form, options);
  const win = window.open('', '_blank', 'width=950,height=1050');
  if (!win) {
    alert('Pop-ups are blocked. Please allow pop-ups for this site to print or save the invoice.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => {
    setTimeout(() => {
      try {
        win.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    }, 400);
  });
}

/**
 * Opens Proforma invoice in a clean print-ready window and triggers the print dialog.
 */
export function printProformaInvoice(receipt = {}, form = {}) {
  return printInvoice(receipt, form, { isProforma: true });
}
