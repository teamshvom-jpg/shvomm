import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Calendar,
  Building,
  User,
  Truck,
  CreditCard,
} from 'lucide-react';
import { updateAdminPayment } from '../../utils/api';
import Button from '../common/Button';

export default function EditInvoiceModal({ payment, token, onClose, onUpdated }) {
  if (!payment) return null;

  let initialNotes = {};
  try {
    if (payment.notes && typeof payment.notes === 'string' && payment.notes.startsWith('{')) {
      initialNotes = JSON.parse(payment.notes);
    } else if (payment.notes && typeof payment.notes === 'object') {
      initialNotes = payment.notes;
    }
  } catch (_) {
    initialNotes = {};
  }

  // Derive initial items
  const initialItems = useMemo(() => {
    if (Array.isArray(initialNotes.items) && initialNotes.items.length > 0) {
      return initialNotes.items.map((it, idx) => ({
        id: it.id || `item_${idx + 1}`,
        description: it.description || it.name || 'Payment towards Shvom Enterprises',
        hsn: (it.hsn && it.hsn !== '997212') ? it.hsn : '-',
        qty: Number(it.qty) || 1,
        unit: it.unit || 'PCS',
        rate: Number(it.rate) || 0,
        gst_rate: it.gst_rate !== undefined ? Number(it.gst_rate) : 18,
      }));
    }
    const payAmt = Number(payment.amount) || 0;
    return [
      {
        id: 'item_1',
        description: payment.purpose || 'Payment towards Shvom Enterprises',
        hsn: '-',
        qty: 1,
        unit: 'PCS',
        rate: Math.round(payAmt / 1.18 * 100) / 100,
        gst_rate: 18,
      },
    ];
  }, [payment, initialNotes]);

  // Derive initial extra payments
  const initialExtraPayments = useMemo(() => {
    const raw = initialNotes.extra_payments || [];
    if (Array.isArray(raw)) {
      return raw.map((p, idx) => ({
        id: p.id || `extra_${idx + 1}`,
        label: p.label || `${idx + 2}nd Payment`,
        amount: Number(p.amount) || 0,
        payment_mode: p.payment_mode || p.mode || 'Bank Transfer',
        date: p.date || '',
      }));
    }
    return [];
  }, [initialNotes]);

  // Form state
  const [formData, setFormData] = useState({
    invoice_no: payment.invoice_no || '',
    parent_invoice_no: initialNotes.parent_invoice_no || '',
    order_id: payment.order_id || initialNotes.parent_order_id || '',
    invoice_date: payment.invoice_date || initialNotes.invoice_date || (payment.created_at ? payment.created_at.split('T')[0] : ''),
    status: payment.status || 'PAID',
    payment_method: payment.payment_method || 'Bank Transfer',
    purpose: payment.purpose || 'Payment towards Shvom Enterprises',
    reference_code: payment.reference_code || '',
    customer_name: payment.customer_name || '',
    customer_email: payment.customer_email || '',
    customer_phone: payment.customer_phone || '',
    customer_gstin: initialNotes.customer_gstin || '',
    customer_address: initialNotes.customer_address || '',
    place_of_supply: initialNotes.place_of_supply || 'Telangana',
    advance_amount: initialNotes.advance_amount !== undefined ? String(initialNotes.advance_amount) : '',
    advance_payment_mode: initialNotes.advance_payment_mode || 'Bank Transfer',
    remaining_amount: initialNotes.remaining_amount !== undefined ? String(initialNotes.remaining_amount) : '',
    remaining_payment_mode: initialNotes.remaining_payment_mode || 'Bank Transfer',
    tracking_status: payment.tracking_status || 'Order Confirmed',
    courier_name: payment.courier_name || 'Blue Dart Express',
    tracking_number: payment.tracking_number || '',
    tracking_url: payment.tracking_url || '',
    estimated_delivery: payment.estimated_delivery || '',
    tracking_notes: payment.tracking_notes || '',
  });

  const [items, setItems] = useState(initialItems);
  const [extraPayments, setExtraPayments] = useState(initialExtraPayments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'client' | 'items' | 'split' | 'tracking'

  // Dynamic calculations
  const totals = useMemo(() => {
    let taxable = 0;
    let totalGst = 0;
    let grandTotal = 0;

    items.forEach((it) => {
      const q = Number(it.qty) || 1;
      const r = Number(it.rate) || 0;
      const gst = Number(it.gst_rate) !== undefined ? Number(it.gst_rate) : 18;
      const tax = Math.round(q * r * 100) / 100;
      const taxGst = Math.round((tax * gst) / 100 * 100) / 100;
      taxable += tax;
      totalGst += taxGst;
      grandTotal += tax + taxGst;
    });

    taxable = Math.round(taxable * 100) / 100;
    totalGst = Math.round(totalGst * 100) / 100;
    grandTotal = Math.round(grandTotal * 100) / 100;

    const adv = Number(formData.advance_amount) || 0;
    const extraTotal = extraPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const paidSoFar = adv + extraTotal;
    const calcRemaining = Math.max(0, Math.round((grandTotal - paidSoFar) * 100) / 100);

    return { taxable, totalGst, grandTotal, paidSoFar, calcRemaining };
  }, [items, formData.advance_amount, extraPayments]);

  // Item handlers
  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        description: 'Custom Bespoke Hamper',
        hsn: '-',
        qty: 1,
        unit: 'PCS',
        rate: 5000,
        gst_rate: 18,
      },
    ]);
  }

  function handleRemoveItem(idx) {
    if (items.length <= 1) {
      alert('Invoice must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleItemChange(idx, field, value) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }

  // Extra payments handlers
  function handleAddExtraPayment() {
    const nextIdx = extraPayments.length;
    const nextNum = nextIdx + 2;
    const suffix = nextNum % 10 === 2 && nextNum % 100 !== 12 ? 'nd' : nextNum % 10 === 3 && nextNum % 100 !== 13 ? 'rd' : 'th';
    setExtraPayments((prev) => [
      ...prev,
      {
        id: `extra_${Date.now()}`,
        label: `${nextNum}${suffix} Payment`,
        amount: 0,
        payment_mode: 'Bank Transfer',
        date: new Date().toISOString().split('T')[0],
      },
    ]);
  }

  function handleRemoveExtraPayment(idx) {
    setExtraPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleExtraPaymentChange(idx, field, value) {
    setExtraPayments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  // Save handler
  async function handleSave(e) {
    if (e) e.preventDefault();
    if (!formData.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const isInstallment = initialNotes.action === 'installment_payment' || Boolean(initialNotes.now_paid_amount);
      const effectiveAmount = isInstallment ? Number(payment.amount) : totals.grandTotal;

      const updatedNotes = {
        ...initialNotes,
        items: items,
        taxable: totals.taxable,
        total_gst: totals.totalGst,
        grand_total: totals.grandTotal,
        customer_address: formData.customer_address,
        customer_gstin: formData.customer_gstin,
        place_of_supply: formData.place_of_supply,
        advance_amount: Number(formData.advance_amount) || 0,
        advance_payment_mode: formData.advance_payment_mode,
        extra_payments: extraPayments,
        remaining_amount: formData.remaining_amount !== '' ? Number(formData.remaining_amount) : totals.calcRemaining,
        remaining_payment_mode: formData.remaining_payment_mode,
        invoice_date: formData.invoice_date,
        parent_order_id: formData.order_id,
        parent_invoice_no: formData.parent_invoice_no ? formData.parent_invoice_no.trim() : (initialNotes.parent_invoice_no || formData.invoice_no),
        installment_invoice_no: formData.invoice_no.trim(),
      };

      const payload = {
        id: payment.id,
        payment_id: payment.id,
        invoice_no: formData.invoice_no.trim() || undefined,
        order_id: formData.order_id.trim() || undefined,
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        customer_phone: formData.customer_phone.trim() || undefined,
        status: formData.status,
        payment_method: formData.payment_method,
        purpose: formData.purpose.trim(),
        reference_code: formData.reference_code.trim() || undefined,
        invoice_date: formData.invoice_date || undefined,
        amount: effectiveAmount,
        tracking_status: formData.tracking_status,
        courier_name: formData.courier_name,
        tracking_number: formData.tracking_number,
        tracking_url: formData.tracking_url,
        estimated_delivery: formData.estimated_delivery,
        tracking_notes: formData.tracking_notes,
        notes: JSON.stringify(updatedNotes),
      };

      const updated = await updateAdminPayment(token, payment.id, payload);

      setSuccessMsg('Invoice & payment record updated successfully!');
      if (onUpdated) {
        onUpdated(updated);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(err.message || 'Failed to update invoice.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#E7E3DC] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl rounded-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7E3DC] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#B89B6A]/10 border border-[#B89B6A]/20 flex items-center justify-center text-[#8D7243]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Edit Invoice & Payment Record
              </h2>
              <p className="text-[11px] text-[#8E8880] font-mono">
                {formData.invoice_no || payment.transaction_id} &bull; {formData.order_id || 'NO-ORDER-REF'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E8880] hover:text-[#1A1A1A] hover:bg-[#E7E3DC]/40 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#E7E3DC] bg-white px-6 overflow-x-auto text-xs">
          {[
            { id: 'general', label: 'Invoice & Order', icon: Calendar },
            { id: 'client', label: 'Client & Billing', icon: User },
            { id: 'items', label: `Items (${items.length})`, icon: Building },
            { id: 'split', label: 'Payment Breakdown', icon: CreditCard },
            { id: 'tracking', label: 'Logistics', icon: Truck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 font-semibold whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'border-[#B89B6A] text-[#8D7243] bg-[#FAF8F5]'
                    : 'border-transparent text-[#5A5A58] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 rounded">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL INVOICE & ORDER DETAILS */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Invoice Number <span className="text-[#B89B6A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_no}
                    onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono text-xs font-bold text-[#1A1A1A]"
                    required
                  />
                  <span className="text-[10px] text-[#8E8880]">This bill's unique invoice №</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Parent / Final Order Invoice No
                  </label>
                  <input
                    type="text"
                    value={formData.parent_invoice_no}
                    onChange={(e) => setFormData({ ...formData, parent_invoice_no: e.target.value })}
                    placeholder="e.g. VAS/2026-27/6712"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono text-xs text-[#1A1A1A]"
                  />
                  <span className="text-[10px] text-[#8E8880]">Different from installment invoice №</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Order ID / Commission Ref
                  </label>
                  <input
                    type="text"
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono text-xs text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Payment Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs font-semibold"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PENDING">PENDING</option>
                    <option value="BILLED">BILLED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    placeholder="Bank Transfer, UPI, Cheque, Cashfree"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Reference / PO Code
                  </label>
                  <input
                    type="text"
                    value={formData.reference_code}
                    onChange={(e) => setFormData({ ...formData, reference_code: e.target.value })}
                    placeholder="e.g. PO-8821"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                  Purpose / Line Description
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CLIENT & BILLING DETAILS */}
          {activeTab === 'client' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Client Name <span className="text-[#B89B6A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs font-semibold text-[#1A1A1A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.customer_gstin}
                    onChange={(e) => setFormData({ ...formData, customer_gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 36AABCU9603R1ZM"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono text-xs text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    value={formData.place_of_supply}
                    onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })}
                    placeholder="Telangana, Maharashtra, etc."
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                  Billing & Shipping Address
                </label>
                <textarea
                  rows={2}
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  placeholder="Full street address, city, state, pincode"
                  className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ITEMS & PRICING */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E7E3DC]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
                  Invoice Line Items
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 text-xs bg-[#B89B6A] hover:bg-[#8D7243] text-white rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => {
                  const qty = Number(it.qty) || 1;
                  const rate = Number(it.rate) || 0;
                  const gst = Number(it.gst_rate) !== undefined ? Number(it.gst_rate) : 18;
                  const taxable = Math.round(qty * rate * 100) / 100;
                  const itemTotal = Math.round((taxable + (taxable * gst) / 100) * 100) / 100;

                  return (
                    <div
                      key={it.id || idx}
                      className="p-3 bg-[#FAF8F5] border border-[#E7E3DC] rounded grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                          Item Description
                        </label>
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs font-medium focus:border-[#B89B6A] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                          HSN/SAC
                        </label>
                        <input
                          type="text"
                          value={it.hsn}
                          onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded font-mono text-xs focus:border-[#B89B6A] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={it.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs focus:border-[#B89B6A] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs focus:border-[#B89B6A] focus:outline-none font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                          GST %
                        </label>
                        <input
                          type="number"
                          value={it.gst_rate}
                          onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs focus:border-[#B89B6A] focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between gap-1 pt-3 sm:pt-0">
                        <div className="text-right">
                          <span className="block text-[9px] text-[#8E8880]">Total</span>
                          <span className="font-serif font-bold text-xs text-[#1A1A1A]">
                            ₹{itemTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-white border border-[#E7E3DC] rounded flex flex-col sm:flex-row justify-between items-center text-xs gap-3">
                <div className="text-[#5A5A58]">
                  <span>Taxable: ₹{totals.taxable.toLocaleString('en-IN')}</span>
                  <span className="mx-2">&bull;</span>
                  <span>GST (18%): ₹{totals.totalGst.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <span className="text-xs text-[#8E8880] font-normal uppercase tracking-wider">Grand Total:</span>
                  <span className="font-serif text-base text-[#8D7243]">
                    ₹{totals.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT BREAKDOWN & INSTALLMENTS */}
          {activeTab === 'split' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Advance Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.advance_amount}
                    onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs font-semibold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Advance Payment Mode
                  </label>
                  <input
                    type="text"
                    value={formData.advance_payment_mode}
                    onChange={(e) => setFormData({ ...formData, advance_payment_mode: e.target.value })}
                    placeholder="Bank Transfer, UPI, Cheque"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Extra Payments (2nd, 3rd Payment installments) */}
              <div className="pt-2 border-t border-[#E7E3DC] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
                    Subsequent Installment Payments (2nd, 3rd, etc.)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddExtraPayment}
                    className="px-2.5 py-1 text-xs bg-[#FAF8F5] border border-[#B89B6A] hover:bg-[#B89B6A] hover:text-white text-[#8D7243] rounded font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Installment</span>
                  </button>
                </div>

                {extraPayments.length === 0 ? (
                  <p className="text-xs text-[#8E8880] italic">
                    No extra installment payments recorded for this order.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {extraPayments.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-3 bg-[#FAF8F5] border border-[#E7E3DC] rounded grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                      >
                        <div className="sm:col-span-4">
                          <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                            Installment Label
                          </label>
                          <input
                            type="text"
                            value={p.label}
                            onChange={(e) => handleExtraPaymentChange(idx, 'label', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs font-semibold focus:border-[#B89B6A] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                            Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={p.amount}
                            onChange={(e) => handleExtraPaymentChange(idx, 'amount', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs font-bold text-emerald-800 focus:border-[#B89B6A] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] font-bold">
                            Payment Mode
                          </label>
                          <input
                            type="text"
                            value={p.payment_mode}
                            onChange={(e) => handleExtraPaymentChange(idx, 'payment_mode', e.target.value)}
                            placeholder="Bank Transfer, UPI"
                            className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs focus:border-[#B89B6A] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraPayment(idx)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete installment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remaining balance row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E3DC]">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Remaining Balance Due (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.remaining_amount !== '' ? formData.remaining_amount : totals.calcRemaining}
                    onChange={(e) => setFormData({ ...formData, remaining_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs font-bold text-[#8D7243]"
                  />
                  <p className="text-[10px] text-[#8E8880] mt-1">
                    Auto-calculated balance: ₹{totals.calcRemaining.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Remaining Payment Expected Mode
                  </label>
                  <input
                    type="text"
                    value={formData.remaining_payment_mode}
                    onChange={(e) => setFormData({ ...formData, remaining_payment_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs text-[#1A1A1A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOGISTICS & TRACKING */}
          {activeTab === 'tracking' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Tracking Status
                  </label>
                  <select
                    value={formData.tracking_status}
                    onChange={(e) => setFormData({ ...formData, tracking_status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs font-semibold"
                  >
                    <option value="Order Confirmed">Order Confirmed</option>
                    <option value="Procuring">Procuring</option>
                    <option value="Engraving">Engraving</option>
                    <option value="Packing">Packing</option>
                    <option value="Shipping">Shipping</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Courier Partner
                  </label>
                  <input
                    type="text"
                    value={formData.courier_name}
                    onChange={(e) => setFormData({ ...formData, courier_name: e.target.value })}
                    placeholder="Blue Dart, DTDC, Delhivery"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Tracking Number / AWB
                  </label>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    placeholder="e.g. BLU987654321"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Tracking URL
                  </label>
                  <input
                    type="url"
                    value={formData.tracking_url}
                    onChange={(e) => setFormData({ ...formData, tracking_url: e.target.value })}
                    placeholder="https://track..."
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                    Estimated Delivery
                  </label>
                  <input
                    type="text"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                    placeholder="e.g. 15 Nov 2026"
                    className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                  Tracking / Dispatch Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.tracking_notes}
                  onChange={(e) => setFormData({ ...formData, tracking_notes: e.target.value })}
                  placeholder="Notes for customer dispatch..."
                  className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] text-xs"
                />
              </div>
            </div>
          )}

          {/* Action buttons footer */}
          <div className="pt-4 border-t border-[#E7E3DC] flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={saving}
              className="px-6 font-semibold shadow-sm"
              icon={Save}
              iconPosition="left"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {saving ? 'Updating Invoice…' : 'Save & Update Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

