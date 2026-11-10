import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Loader2,
  FileText,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Printer,
  Search,
  Wallet,
  Package,
} from 'lucide-react';
import {
  createCashfreeOrder,
  verifyCashfreePayment,
  createAdminBill,
  recordAdminBalancePayment,
  fetchBalanceDue,
  fetchOrderDetails,
  addItemToOrder,
} from '../../utils/api';
import { getCashfree, getCashfreeMode } from '../../utils/cashfree';
import { printInvoice, printProformaInvoice, printPaymentReceipt } from '../../utils/invoice';
import Button from './Button';

/**
 * PaymentModal — Standard Web Checkout & Bill Generator.
 * Supports dynamic line items (HSN/SAC, Rate, GST %, Amount),
 * free text purpose description, and full Bill-To / GSTIN metadata.
 */
export default function PaymentModal({
  isOpen,
  onClose,
  initialData = null,
  isAdmin = false,
  token = null,
  onBillCreated = null,
}) {
  // Steps: 'form' | 'initiating' | 'checkout' | 'verifying' | 'success' | 'error'
  const [step, setStep] = useState('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordingBill, setRecordingBill] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const firstInputRef = useRef(null);
  const submittedFormRef = useRef(null);
  const finalOrderReceiptRef = useRef(null);
  const finalOrderFormRef = useRef(null);

  // Pay Tab state: 'checkout' | 'remaining' | 'add_item'
  const [payTab, setPayTab] = useState('checkout');
  const [remainingQuery, setRemainingQuery] = useState('');
  const [remainingLoading, setRemainingLoading] = useState(false);
  const [remainingError, setRemainingError] = useState('');
  const [remainingData, setRemainingData] = useState(null);
  const [customPayAmount, setCustomPayAmount] = useState('');

  // Add Item to Existing Bill state
  const [addItemQuery, setAddItemQuery] = useState('');
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemError, setAddItemError] = useState('');
  const [existingOrder, setExistingOrder] = useState(null);
  const [newItem, setNewItem] = useState({
    description: '',
    hsn: '-',
    qty: 1,
    unit: 'PCS',
    rate: '',
    gst_rate: 18,
  });
  const [addItemPayType, setAddItemPayType] = useState('full'); // 'full' | 'advance'
  const [addItemAdvanceAmount, setAddItemAdvanceAmount] = useState('');
  const [addItemSubmitting, setAddItemSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Admin "Generate from Existing Bill" state
  const [adminExistingQuery, setAdminExistingQuery] = useState('');
  const [adminExistingLoading, setAdminExistingLoading] = useState(false);
  const [adminExistingError, setAdminExistingError] = useState('');

  // Admin Remaining Payment Recording state
  const [adminBalanceMode, setAdminBalanceMode] = useState('Bank Transfer');
  const [adminBalanceDate, setAdminBalanceDate] = useState(todayStr);
  const [adminBalanceLoading, setAdminBalanceLoading] = useState(false);

  // Line items state
  const defaultItem = {
    id: 'item_1',
    description: 'Bespoke Return Gifting Curation',
    hsn: '-',
    qty: 1,
    unit: 'PCS',
    rate: 5000,
    gst_rate: 18,
  };

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_gstin: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    customer_pincode: '',
    place_of_supply: 'Telangana',
    reference_code: '',
    notes: '',
    invoice_date: todayStr,
    parent_invoice_no: '',
    invoice_no: '',
    order_id: '',
    tracking_number: '',
    is_existing_bill: false,
    advance_amount: '',
    advance_payment_mode: 'Bank Transfer',
    extra_payments: [],
    remaining_payment_mode: 'Bank Transfer',
    items: [defaultItem],
  });

  // Calculate live financial totals from items
  const calculatedTotals = React.useMemo(() => {
    let taxable = 0;
    let totalGst = 0;
    let grandTotal = 0;
    let totalQty = 0;

    (form.items || []).forEach((it) => {
      const q = Math.max(1, Number(it.qty) || 1);
      const r = Math.max(0, Number(it.rate) || 0);
      const gstP = Number(it.gst_rate !== undefined ? it.gst_rate : 18);
      const lineTaxable = Math.round(q * r * 100) / 100;
      const lineGst = Math.round((lineTaxable * gstP) / 100 * 100) / 100;
      taxable += lineTaxable;
      totalGst += lineGst;
      grandTotal += lineTaxable + lineGst;
      totalQty += q;
    });

    return {
      taxable: Math.round(taxable * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      totalQty,
    };
  }, [form.items]);

  const environmentMode = getCashfreeMode();

  // Populate from initialData if provided
  useEffect(() => {
    if (initialData && isOpen) {
      setForm((prev) => ({
        ...prev,
        customer_name: initialData.client_name || initialData.customer_name || prev.customer_name,
        customer_email: initialData.client_email || initialData.customer_email || prev.customer_email,
        customer_phone: initialData.client_phone || initialData.customer_phone || prev.customer_phone,
        customer_address: initialData.delivery_city ? `${initialData.delivery_city}, Telangana` : prev.customer_address,
        reference_code: initialData.reference_id || initialData.reference_code || prev.reference_code,
        items: [
          {
            id: 'item_1',
            description: initialData.occasion
              ? `Bespoke Curation for ${initialData.occasion}`
              : 'Bespoke Return Gifting Curation',
            hsn: '-',
            qty: initialData.quantity || 1,
            unit: 'PCS',
            rate: initialData.estimated_min_unit || 5000,
            gst_rate: 18,
          },
        ],
      }));
    }
  }, [initialData, isOpen]);

  // Handle URL redirect query param on page load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get('order_id');
    if (orderIdParam && isOpen && step === 'form') {
      performServerVerification(orderIdParam);
    }
  }, [isOpen]);

  // Focus first field when modal opens
  useEffect(() => {
    if (isOpen && step === 'form') {
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen, step]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape' && step !== 'verifying' && step !== 'initiating') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, step]);

  // Prevent background body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep('form');
      setPayTab('checkout');
      setErrorMsg('');
      setActiveOrderId(null);
      setActiveSessionId(null);
      setReceipt(null);
      setAddItemQuery('');
      setAddItemError('');
      setExistingOrder(null);
      setNewItem({
        description: '',
        hsn: '-',
        qty: 1,
        unit: 'PCS',
        rate: '',
        gst_rate: 18,
      });
      setAddItemPayType('full');
      setAddItemAdvanceAmount('');
      setAdminExistingQuery('');
      setAdminExistingError('');
      setForm({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_gstin: '',
        customer_address: '',
        customer_city: '',
        customer_state: '',
        customer_pincode: '',
        place_of_supply: 'Telangana',
        reference_code: '',
        notes: '',
        invoice_date: new Date().toISOString().split('T')[0],
        invoice_no: '',
        order_id: '',
        tracking_number: '',
        is_existing_bill: false,
        advance_amount: '',
        advance_payment_mode: 'Bank Transfer',
        extra_payments: [],
        remaining_payment_mode: 'Bank Transfer',
        items: [defaultItem],
      });
    }, 300);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Extra payment handlers (2nd payment, 3rd payment, etc.)
  function handleAddExtraPayment() {
    const nextIdx = (form.extra_payments || []).length;
    const nextNum = nextIdx + 2;
    const suffix =
      nextNum % 10 === 2 && nextNum % 100 !== 12
        ? 'nd'
        : nextNum % 10 === 3 && nextNum % 100 !== 13
        ? 'rd'
        : 'th';
    const newEntry = {
      id: `extra_pay_${Date.now()}`,
      label: `${nextNum}${suffix} Payment`,
      amount: '',
      payment_mode: 'Bank Transfer',
    };
    setForm((prev) => ({
      ...prev,
      extra_payments: [...(prev.extra_payments || []), newEntry],
    }));
  }

  function handleUpdateExtraPayment(index, field, value) {
    setForm((prev) => {
      const copy = [...(prev.extra_payments || [])];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, extra_payments: copy };
    });
  }

  function handleRemoveExtraPayment(index) {
    setForm((prev) => {
      const copy = [...(prev.extra_payments || [])];
      copy.splice(index, 1);
      return { ...prev, extra_payments: copy };
    });
  }

  // Line item modifiers
  function addItemRow() {
    const newId = `item_${Date.now()}`;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newId,
          description: '',
          hsn: '-',
          qty: 1,
          unit: 'PCS',
          rate: 0,
          gst_rate: 18,
        },
      ],
    }));
  }

  function removeItemRow(id) {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  }

  function updateItemRow(id, field, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id !== id) return it;
        return { ...it, [field]: value };
      }),
    }));
  }

  const isFormValid =
    calculatedTotals.grandTotal >= 1 &&
    form.customer_name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email);

  /**
   * Fetches an existing bill/order details in Admin mode.
   */
  async function handleAdminFetchExisting(e) {
    if (e) e.preventDefault();
    if (!adminExistingQuery.trim()) return;
    setAdminExistingLoading(true);
    setAdminExistingError('');
    try {
      const order = await fetchOrderDetails(adminExistingQuery.trim());
      setForm((prev) => ({
        ...prev,
        customer_name: order.customer_name || order.client_name || prev.customer_name,
        customer_email: order.customer_email || order.client_email || prev.customer_email,
        customer_phone: order.customer_phone || order.client_phone || prev.customer_phone,
        customer_gstin: order.customer_gstin || prev.customer_gstin,
        customer_address: order.customer_address || prev.customer_address,
        customer_city: order.customer_city || prev.customer_city,
        customer_state: order.customer_state || prev.customer_state,
        customer_pincode: order.customer_pincode || prev.customer_pincode,
        place_of_supply: order.place_of_supply || prev.place_of_supply,
        reference_code: order.reference_code || order.order_id || prev.reference_code,
        notes: order.notes || prev.notes,
        advance_amount: order.advance_amount ? String(order.advance_amount) : prev.advance_amount,
        advance_payment_mode: order.advance_payment_mode || prev.advance_payment_mode,
        extra_payments: Array.isArray(order.extra_payments) ? order.extra_payments : [],
        remaining_payment_mode: order.remaining_payment_mode || prev.remaining_payment_mode,
        items: Array.isArray(order.items) && order.items.length > 0 ? order.items : prev.items,
        invoice_date: order.invoice_date || prev.invoice_date,
        parent_invoice_no: order.invoice_no || '',
        invoice_no: '', // Blank so a fresh unique invoice number is generated on every new bill creation
        order_id: order.order_id || '', // Matched with exact order number
        tracking_number: order.tracking_number || '',
        is_existing_bill: true,
      }));
    } catch (err) {
      setAdminExistingError(err.message || 'Could not find existing order with that ID.');
    } finally {
      setAdminExistingLoading(false);
    }
  }

  /**
   * Fetches existing order details for Customer "Add an item to the existing bill"
   */
  async function handleFetchOrderForAddItem(e) {
    if (e) e.preventDefault();
    if (!addItemQuery.trim()) return;
    setAddItemLoading(true);
    setAddItemError('');
    setExistingOrder(null);
    try {
      const order = await fetchOrderDetails(addItemQuery.trim());
      setExistingOrder(order);
    } catch (err) {
      setAddItemError(err.message || 'No order found with that Order ID or Invoice No.');
    } finally {
      setAddItemLoading(false);
    }
  }

  /**
   * Submits newly added item and makes payment (Full or Advance) for existing order
   */
  async function handleAddItemSubmit(e) {
    if (e) e.preventDefault();
    if (!existingOrder) return;
    if (!newItem.description.trim()) {
      alert('Please enter an item description.');
      return;
    }
    const rateNum = Number(newItem.rate);
    if (!rateNum || rateNum <= 0) {
      alert('Please enter a valid unit rate for the item.');
      return;
    }

    const qtyNum = Math.max(1, Number(newItem.qty) || 1);
    const gstP = Number(newItem.gst_rate !== undefined ? newItem.gst_rate : 18);
    const itemTaxable = qtyNum * rateNum;
    const itemGst = (itemTaxable * gstP) / 100;
    const itemTotal = Math.round((itemTaxable + itemGst) * 100) / 100;

    let payAmount = itemTotal;
    if (addItemPayType === 'advance') {
      const advNum = Number(addItemAdvanceAmount);
      if (!advNum || advNum < 1) {
        alert('Please enter a valid advance amount of at least ₹1.00');
        return;
      }
      if (advNum > itemTotal) {
        alert(`Advance amount cannot exceed the total item cost of ₹${itemTotal.toLocaleString('en-IN')}`);
        return;
      }
      payAmount = advNum;
    }

    setAddItemSubmitting(true);
    setStep('initiating');
    setErrorMsg('');

    try {
      const payload = {
        order_id: existingOrder.order_id || existingOrder.invoice_no,
        order_identifier: existingOrder.order_id || existingOrder.invoice_no,
        item: {
          description: newItem.description.trim(),
          hsn: newItem.hsn || '-',
          qty: qtyNum,
          unit: newItem.unit || 'PCS',
          rate: rateNum,
          gst_rate: gstP,
        },
        is_advance: addItemPayType === 'advance',
        payment_amount: payAmount,
        advance_amount: payAmount,
        payment_method: 'Online Checkout / Cashfree PG',
        customer_name: existingOrder.customer_name || existingOrder.client_name,
        customer_email: existingOrder.customer_email || existingOrder.client_email,
        customer_phone: existingOrder.customer_phone || existingOrder.client_phone,
      };

      const result = await addItemToOrder(payload);

      const addedReceipt = {
        transaction_id: result.transaction_id,
        order_id: result.order_id,
        invoice_no: result.invoice_no,
        amount: result.amount_paid,
        currency: 'INR',
        customer_name: existingOrder.customer_name || existingOrder.client_name,
        customer_email: existingOrder.customer_email || existingOrder.client_email,
        customer_phone: existingOrder.customer_phone || existingOrder.client_phone,
        customer_address: existingOrder.customer_address,
        place_of_supply: existingOrder.place_of_supply || 'Telangana',
        purpose: `Item Added: ${newItem.description}`,
        payment_method: 'Cashfree Standard Checkout',
        status: 'PAID',
        tracking_number: result.tracking_number, // SAME TRACKING NUMBER
        invoice_date: existingOrder.invoice_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      };

      setReceipt(addedReceipt);
      submittedFormRef.current = {
        customer_name: existingOrder.customer_name || existingOrder.client_name,
        customer_email: existingOrder.customer_email || existingOrder.client_email,
        customer_phone: existingOrder.customer_phone || existingOrder.client_phone,
        customer_address: existingOrder.customer_address,
        place_of_supply: existingOrder.place_of_supply || 'Telangana',
        invoice_no: result.invoice_no,
        invoice_date: existingOrder.invoice_date || new Date().toISOString().split('T')[0],
        items: result.items || [...(existingOrder.items || []), newItem],
        amount: result.new_grand_total || result.amount_paid,
        notes: `Item added: ${newItem.description}`,
      };

      setStep('success');
    } catch (err) {
      console.error('Error adding item to order:', err);
      setErrorMsg(err.message || 'Failed to add item to existing order.');
      setStep('error');
    } finally {
      setAddItemSubmitting(false);
    }
  }

  /**
   * Generates and records bill directly in Admin Portal and prints invoice.
   */
  async function handleGenerateAdminBill(isProforma = false) {
    if (!form.customer_name.trim()) {
      alert(`Please enter the customer name to generate the ${isProforma ? 'Proforma' : 'Tax'} Invoice.`);
      return;
    }
    setRecordingBill(true);
    setErrorMsg('');
    try {
      const yearStr = '2026-27';
      const parentInvoiceNo = form.parent_invoice_no || (form.is_existing_bill ? form.invoice_no : '');
      const parentOrderId = form.order_id ? form.order_id.trim() : undefined;

      // Unique installment invoice number for 2nd/subsequent bills
      let installmentInvoiceNo = '';
      do {
        const seq = Math.floor(1000 + Math.random() * 9000);
        installmentInvoiceNo = isProforma ? `PI-VAS/${yearStr}/${seq}` : `VAS/${yearStr}/${seq}`;
      } while (installmentInvoiceNo === parentInvoiceNo);

      // If user typed a custom invoice number (different from previous parent invoice), use it for the installment
      if (form.invoice_no && form.invoice_no.trim() !== parentInvoiceNo) {
        installmentInvoiceNo = form.invoice_no.trim();
      }

      // Unique final order invoice number (guaranteed strictly different from installment invoice number!)
      let finalOrderInvoiceNo = parentInvoiceNo;
      if (!finalOrderInvoiceNo || finalOrderInvoiceNo === installmentInvoiceNo || finalOrderInvoiceNo.startsWith('ORDER-')) {
        do {
          const seq = Math.floor(1000 + Math.random() * 9000);
          finalOrderInvoiceNo = isProforma ? `PI-VAS/${yearStr}/${seq}` : `VAS/${yearStr}/${seq}`;
        } while (finalOrderInvoiceNo === installmentInvoiceNo);
      }

      const targetInvoiceNo = installmentInvoiceNo;
      const targetOrderId = parentOrderId || `ORDER-${Date.now().toString(36).toUpperCase()}`;
      const targetTrackingNo = form.tracking_number || installmentInvoiceNo;

      const fullAddress = [
        form.customer_address,
        form.customer_city,
        form.customer_state ? `${form.customer_state} - ${form.customer_pincode || ''}` : form.customer_pincode,
      ]
        .filter(Boolean)
        .join(', ');

      const totalPaidSoFar =
        (Number(form.advance_amount) || 0) +
        (form.extra_payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const remainingAmount = Math.max(
        0,
        Math.round((calculatedTotals.grandTotal - totalPaidSoFar) * 100) / 100
      );

      // Check if this generation is for an existing order with an extra payment (e.g. 2nd payment of 1.6 Lakh)
      const hasExtraPayments = Array.isArray(form.extra_payments) && form.extra_payments.length > 0;
      const lastExtra = hasExtraPayments ? form.extra_payments[form.extra_payments.length - 1] : null;
      const extraPaymentAmt = lastExtra ? Number(lastExtra.amount) || 0 : 0;
      const isInstallmentGeneration = Boolean(form.is_existing_bill && extraPaymentAmt > 0);

      // Automatically initialize tracking for each item in the order with the same tracking number
      const initialItemTrackings = (form.items || []).map((it, idx) => ({
        item_label: it.description || `Item ${idx + 1}`,
        quantity: Number(it.qty) || 1,
        courier_name: 'Blue Dart Express',
        tracking_number: targetTrackingNo,
        tracking_status: 'Order Confirmed',
        status_step: 1,
        tracking_url: '',
        tracking_notes: 'Commission confirmed and assigned to master atelier queue.',
      }));

      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('shvom_admin_token') : '');

      let recorded = null;

      if (isInstallmentGeneration) {
        // 1. Update the parent bill in the database with the updated extra_payments and remaining_amount
        const parentUpdateNotes = {
          items: form.items,
          customer_gstin: form.customer_gstin,
          customer_address: fullAddress,
          place_of_supply: form.place_of_supply,
          taxable: calculatedTotals.taxable,
          total_gst: calculatedTotals.totalGst,
          grand_total: calculatedTotals.grandTotal,
          notes: form.notes,
          invoice_date: form.invoice_date,
          advance_amount: Number(form.advance_amount) || 0,
          advance_payment_mode: form.advance_payment_mode || 'Bank Transfer',
          extra_payments: form.extra_payments || [],
          remaining_amount: remainingAmount,
          remaining_payment_mode: form.remaining_payment_mode || 'Bank Transfer',
        };

        try {
          await createAdminBill(activeToken, {
            is_existing_bill: true,
            order_id: targetOrderId,
            invoice_no: finalOrderInvoiceNo,
            customer_name: form.customer_name.trim(),
            customer_email: form.customer_email.trim() || 'concierge@vasanta.in',
            customer_phone: form.customer_phone.trim() || undefined,
            status: remainingAmount <= 0 ? 'PAID' : 'PARTIAL',
            notes: JSON.stringify({
              ...parentUpdateNotes,
              parent_invoice_no: finalOrderInvoiceNo,
            }),
          });
        } catch (parentErr) {
          console.warn('Could not update parent bill in place:', parentErr);
        }

        // 2. Create the distinct installment payment bill record so it appears directly in the Admin Payments table
        const installmentBillPayload = {
          amount: extraPaymentAmt, // Exact payment amount (e.g. ₹1,60,000) so it is visible in the list!
          currency: 'INR',
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim() || 'concierge@vasanta.in',
          customer_phone: form.customer_phone.trim() || undefined,
          reference_code: form.reference_code.trim() || targetOrderId,
          purpose: `${lastExtra.label || '2nd Payment'}: ${form.items[0]?.description || targetOrderId}`,
          payment_method: lastExtra.payment_mode || 'Bank Transfer',
          status: remainingAmount <= 0 ? 'PAID' : 'PARTIAL',
          invoice_no: installmentInvoiceNo, // UNIQUE for the 2nd bill installment!
          order_id: targetOrderId, // MATCHED with exact order number!
          is_existing_bill: false,
          invoice_date: form.invoice_date,
          tracking_status: 'Order Confirmed',
          courier_name: 'Blue Dart Express',
          tracking_number: targetTrackingNo,
          item_tracking_json: JSON.stringify(initialItemTrackings),
          notes: JSON.stringify({
            parent_order_id: targetOrderId,
            parent_invoice_no: finalOrderInvoiceNo, // DIFFERENT from installmentInvoiceNo
            installment_invoice_no: installmentInvoiceNo,
            action: 'installment_payment',
            payment_label: lastExtra.label || '2nd Payment',
            amount: extraPaymentAmt,
            payment_mode: lastExtra.payment_mode || 'Bank Transfer',
            items: form.items,
            taxable: calculatedTotals.taxable,
            total_gst: calculatedTotals.totalGst,
            grand_total: calculatedTotals.grandTotal,
            advance_amount: Number(form.advance_amount) || 0,
            advance_payment_mode: form.advance_payment_mode || 'Bank Transfer',
            extra_payments: form.extra_payments || [],
            now_paid_amount: extraPaymentAmt,
            now_paid_label: lastExtra.label || '2nd Payment',
            now_paid_mode: lastExtra.payment_mode || 'Bank Transfer',
            remaining_amount: remainingAmount,
            remaining_payment_mode: form.remaining_payment_mode || 'Bank Transfer',
            customer_address: fullAddress,
            customer_gstin: form.customer_gstin,
            place_of_supply: form.place_of_supply,
            invoice_date: form.invoice_date,
          }),
        };

        recorded = await createAdminBill(activeToken, installmentBillPayload);
      } else {
        // Standard initial bill or full order generation
        const billPayload = {
          amount: calculatedTotals.grandTotal,
          currency: 'INR',
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim() || 'concierge@vasanta.in',
          customer_phone: form.customer_phone.trim() || undefined,
          reference_code: form.reference_code.trim() || undefined,
          purpose: form.items[0]?.description || 'Payment towards Shvom Enterprises',
          payment_method: isProforma ? 'Admin Proforma Estimate' : 'Admin Recorded Bill',
          status: isProforma ? 'PENDING' : (remainingAmount > 0 ? 'PARTIAL' : 'PAID'),
          invoice_no: targetInvoiceNo,
          order_id: targetOrderId,
          is_existing_bill: Boolean(form.is_existing_bill),
          invoice_date: form.invoice_date,
          tracking_status: 'Order Confirmed',
          courier_name: 'Blue Dart Express',
          tracking_number: targetTrackingNo,
          item_tracking_json: JSON.stringify(initialItemTrackings),
          notes: JSON.stringify({
            items: form.items,
            customer_gstin: form.customer_gstin,
            customer_address: fullAddress,
            place_of_supply: form.place_of_supply,
            taxable: calculatedTotals.taxable,
            total_gst: calculatedTotals.totalGst,
            grand_total: calculatedTotals.grandTotal,
            notes: form.notes,
            invoice_date: form.invoice_date,
            advance_amount: Number(form.advance_amount) || 0,
            advance_payment_mode: form.advance_payment_mode || 'Bank Transfer',
            extra_payments: form.extra_payments || [],
            remaining_amount: remainingAmount,
            remaining_payment_mode: form.remaining_payment_mode || 'Bank Transfer',
          }),
        };

        recorded = await createAdminBill(activeToken, billPayload);
      }

      const finalOrderReceipt = {
        ...recorded,
        invoice_no: finalOrderInvoiceNo, // Strictly final order invoice number
        transaction_id: recorded.transaction_id || finalOrderInvoiceNo,
        order_id: targetOrderId,
        amount: calculatedTotals.grandTotal,
        invoice_date: form.invoice_date,
        customer_name: recorded.customer_name || form.customer_name,
        customer_email: recorded.customer_email || form.customer_email,
        customer_phone: form.customer_phone,
        customer_gstin: form.customer_gstin,
        customer_address: fullAddress,
        place_of_supply: form.place_of_supply,
        reference_code: form.reference_code || targetOrderId,
        purpose: form.items[0]?.description || 'Payment towards Shvom Enterprises',
        payment_method: isInstallmentGeneration ? (lastExtra?.payment_mode || 'Bank Transfer') : (recorded.payment_method || 'Recorded Bill'),
        status: remainingAmount <= 0 ? 'PAID' : 'PARTIAL',
        advance_amount: Number(form.advance_amount) || 0,
        advance_payment_mode: form.advance_payment_mode || 'Bank Transfer',
        extra_payments: form.extra_payments || [],
        remaining_amount: remainingAmount,
        remaining_payment_mode: form.remaining_payment_mode || 'Bank Transfer',
        created_at: form.invoice_date ? new Date(form.invoice_date).toISOString() : (recorded.created_at || new Date().toISOString()),
      };

      const installmentReceipt = isInstallmentGeneration
        ? {
            ...recorded,
            invoice_no: installmentInvoiceNo, // Strictly installment invoice number (GUARANTEED DIFFERENT!)
            transaction_id: recorded.transaction_id || installmentInvoiceNo,
            order_id: targetOrderId,
            amount: extraPaymentAmt,
            now_paid_amount: extraPaymentAmt,
            now_paid_label: lastExtra?.label || '2nd Payment',
            now_paid_mode: lastExtra?.payment_mode || 'Bank Transfer',
            total_order_value: calculatedTotals.grandTotal,
            remaining_amount: remainingAmount,
            invoice_date: form.invoice_date,
            customer_name: recorded.customer_name || form.customer_name,
            customer_email: recorded.customer_email || form.customer_email,
            customer_phone: form.customer_phone,
            customer_gstin: form.customer_gstin,
            customer_address: fullAddress,
            place_of_supply: form.place_of_supply,
            reference_code: form.reference_code || targetOrderId,
            purpose: recorded.purpose || `${lastExtra?.label || '2nd Payment'} Installment`,
            payment_method: lastExtra?.payment_mode || 'Bank Transfer',
            status: remainingAmount <= 0 ? 'PAID' : 'PARTIAL',
            is_installment: true,
            created_at: form.invoice_date ? new Date(form.invoice_date).toISOString() : (recorded.created_at || new Date().toISOString()),
          }
        : null;

      const finalOrderForm = {
        ...form,
        order_id: targetOrderId,
        invoice_no: finalOrderInvoiceNo,
        amount: calculatedTotals.grandTotal,
        customer_address: fullAddress,
        invoice_date: form.invoice_date,
        advance_amount: Number(form.advance_amount) || 0,
        extra_payments: form.extra_payments || [],
        remaining_amount: remainingAmount,
      };

      const installmentForm = {
        ...form,
        order_id: targetOrderId,
        invoice_no: installmentInvoiceNo,
        amount: extraPaymentAmt,
        customer_address: fullAddress,
        invoice_date: form.invoice_date,
        advance_amount: Number(form.advance_amount) || 0,
        extra_payments: form.extra_payments || [],
        remaining_amount: remainingAmount,
      };

      submittedFormRef.current = isInstallmentGeneration ? installmentForm : finalOrderForm;
      finalOrderReceiptRef.current = finalOrderReceipt;
      finalOrderFormRef.current = finalOrderForm;

      // Notify parent to refresh payments list and stats immediately
      if (onBillCreated) {
        onBillCreated(isInstallmentGeneration ? { ...recorded, ...installmentReceipt } : recorded);
      }

      // Automatically trigger invoice print
      if (isProforma) {
        printProformaInvoice(finalOrderReceipt, finalOrderForm);
      } else if (isInstallmentGeneration) {
        printPaymentReceipt(installmentReceipt, installmentForm);
      } else {
        printInvoice(finalOrderReceipt, finalOrderForm);
      }

      setReceipt(isInstallmentGeneration ? installmentReceipt : finalOrderReceipt);
      setStep('success');
    } catch (err) {
      console.error('Error recording admin bill:', err);
      setErrorMsg(err.message || 'Failed to record bill in the admin portal.');
      setStep('error');
    } finally {
      setRecordingBill(false);
    }
  }

  /**
   * Directly prints or saves either Tax Invoice or Proforma Invoice without payment gateway.
   */
  function handleDirectPrint(isProforma = false) {
    if (!form.customer_name.trim()) {
      alert(`Please enter at least the Customer Name to generate a ${isProforma ? 'Proforma' : 'Tax'} Invoice.`);
      return;
    }
    const prefix = isProforma ? 'PI-VAS' : 'VAS';
    const simulatedReceipt = {
      transaction_id: `${prefix}-${Date.now().toString().slice(-6)}`,
      amount: calculatedTotals.grandTotal,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      customer_gstin: form.customer_gstin,
      customer_address: `${form.customer_address}, ${form.customer_city}, ${form.customer_state} - ${form.customer_pincode}`,
      place_of_supply: form.place_of_supply,
      reference_code: form.reference_code,
      purpose: form.items[0]?.description || 'Bespoke Return Gifting Services',
      payment_method: isProforma ? 'Proforma Quotation' : 'Tax Invoice',
      status: isProforma ? 'PROFORMA' : 'ISSUED',
      invoice_date: form.invoice_date,
      created_at: form.invoice_date ? new Date(form.invoice_date).toISOString() : new Date().toISOString(),
    };
    if (isProforma) {
      printProformaInvoice(simulatedReceipt, form);
    } else {
      printInvoice(simulatedReceipt, form);
    }
  }

  /**
   * Secure server-side verification.
   */
  async function performServerVerification(orderId) {
    setStep('verifying');
    setErrorMsg('');
    try {
      const verification = await verifyCashfreePayment(orderId);

      if (verification.success && verification.payment_status === 'PAID') {
        const confirmedReceipt = {
          transaction_id: verification.transaction_id || verification.order_id,
          order_id: verification.order_id,
          cf_order_id: verification.cf_order_id,
          amount: verification.amount || calculatedTotals.grandTotal,
          currency: verification.currency || 'INR',
          customer_name: verification.customer_name || form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          customer_gstin: form.customer_gstin,
          customer_address: `${form.customer_address}, ${form.customer_city}, ${form.customer_state} - ${form.customer_pincode}`,
          place_of_supply: form.place_of_supply,
          reference_code: form.reference_code,
          purpose: form.items[0]?.description || 'Bespoke Return Gifting Services',
          payment_method: 'Cashfree Standard Checkout',
          status: 'PAID',
          created_at: new Date().toISOString(),
          notes: form.notes,
        };
        setReceipt(confirmedReceipt);
        setStep('success');

        if (typeof window !== 'undefined' && window.history.replaceState) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } else {
        setErrorMsg(
          `Payment not confirmed (Status: ${verification.payment_status || 'Unpaid'}). If debited, please contact concierge.`
        );
        setStep('error');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server verification failed. Please try again.');
      setStep('error');
    }
  }

  /**
   * Main checkout handler for Cashfree PG.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!isFormValid) return;

    setStep('initiating');
    setErrorMsg('');

    const advanceVal = Number(form.advance_amount);
    const hasAdvance = advanceVal > 0 && advanceVal < calculatedTotals.grandTotal;
    const chargeAmount = hasAdvance ? advanceVal : calculatedTotals.grandTotal;
    const remainingAmount = hasAdvance ? Math.max(0, calculatedTotals.grandTotal - advanceVal) : 0;

    submittedFormRef.current = {
      ...form,
      amount: chargeAmount,
      total_billed: calculatedTotals.grandTotal,
      advance_amount: hasAdvance ? advanceVal : calculatedTotals.grandTotal,
      remaining_amount: remainingAmount,
      customer_address: `${form.customer_address}, ${form.customer_city}, ${form.customer_state} - ${form.customer_pincode}`,
    };

    let orderId = null;
    let paymentSessionId = null;

    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}?order_id={order_id}`
          : undefined;

      const orderPayload = {
        order_amount: chargeAmount,
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim() || undefined,
        reference_code: form.reference_code.trim() || undefined,
        purpose: hasAdvance
          ? `${form.items[0]?.description || 'Bespoke Gifting'} (Advance Payment)`
          : (form.items[0]?.description || 'Bespoke Gifting Services'),
        return_url: returnUrl,
        notes: JSON.stringify({
          items: form.items,
          customer_gstin: form.customer_gstin,
          customer_address: `${form.customer_address}, ${form.customer_city}, ${form.customer_state} - ${form.customer_pincode}`,
          place_of_supply: form.place_of_supply,
          taxable: calculatedTotals.taxable,
          total_gst: calculatedTotals.totalGst,
          grand_total: calculatedTotals.grandTotal,
          notes: form.notes,
          advance_amount: hasAdvance ? advanceVal : calculatedTotals.grandTotal,
          advance_payment_mode: form.advance_payment_mode || 'Cashfree Standard Checkout',
          remaining_amount: remainingAmount,
          remaining_payment_mode: form.remaining_payment_mode || 'Bank Transfer',
        }),
      };

      const sessionResponse = await createCashfreeOrder(orderPayload);
      orderId = sessionResponse.order_id;
      paymentSessionId = sessionResponse.payment_session_id;

      setActiveOrderId(orderId);
      setActiveSessionId(paymentSessionId);

      const cashfree = await getCashfree();

      setStep('checkout');

      cashfree
        .checkout({
          paymentSessionId: paymentSessionId,
          redirectTarget: '_modal',
        })
        .then(async (result) => {
          if (result && result.error) {
            console.warn('Cashfree modal dropped or closed by user:', result.error);
            setErrorMsg(result.error.message || 'Payment cancelled or closed.');
            setStep('error');
            return;
          }
          if (result && result.redirect) return;
          await performServerVerification(orderId);
        })
        .catch((err) => {
          console.error('Cashfree checkout modal error:', err);
          setErrorMsg(err.message || 'Cashfree modal error. You may try redirect checkout.');
          setStep('error');
        });
    } catch (err) {
      console.error('Order creation error:', err);
      setErrorMsg(err.message || 'Could not initiate Cashfree payment session.');
      setStep('error');
    }
  }

  async function handleRedirectCheckout() {
    if (!activeSessionId) return;
    try {
      const cashfree = await getCashfree();
      cashfree.checkout({
        paymentSessionId: activeSessionId,
        redirectTarget: '_self',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Redirect checkout failed.');
      setStep('error');
    }
  }

  async function handleSearchBalance(e) {
    if (e) e.preventDefault();
    if (!remainingQuery.trim()) return;
    setRemainingLoading(true);
    setRemainingError('');
    setRemainingData(null);
    try {
      const data = await fetchBalanceDue(remainingQuery.trim());

      // Safety check: parse notes to guarantee recorded advance/remaining amounts are respected
      if (data && data.notes) {
        try {
          const parsed = typeof data.notes === 'string' ? JSON.parse(data.notes) : data.notes;
          const rem = parsed.remaining_amount !== undefined ? Number(parsed.remaining_amount) : undefined;
          const adv = Number(parsed.advance_amount || 0);
          const taxable = Number(parsed.taxable || 0);
          const totalGst = Number(parsed.total_gst || 0);
          const grand = Number(parsed.grand_total || (taxable + totalGst) || (adv + (rem || 0)) || data.total_billed || 0);

          if (grand > 0) data.total_billed = grand;
          if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
            data.items = parsed.items;
          }
          if (parsed.extra_payments && Array.isArray(parsed.extra_payments)) {
            data.extra_payments = parsed.extra_payments;
          }
          if (adv > 0) data.advance_amount = adv;
          if (rem !== undefined) {
            data.remaining_amount = rem;
            data.balance_due = rem;
            const extraTotal = (parsed.extra_payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
            data.total_paid = adv + extraTotal;
          }
        } catch (_) { }
      }

      setRemainingData(data);
      setCustomPayAmount(data.balance_due > 0 ? String(data.balance_due) : '0');
    } catch (err) {
      setRemainingError(err.message || 'Could not find order or balance for that ID.');
    } finally {
      setRemainingLoading(false);
    }
  }

  /**
   * Admin-specific handler: Records payment towards remaining balance directly without Cashfree redirect
   * and immediately generates/prints the updated Tax Invoice showing advance, now paid & remaining balance.
   */
  async function handleAdminRecordRemainingPayment(e) {
    if (e) e.preventDefault();
    if (!remainingData) return;
    const payAmt = Math.round(Number(customPayAmount) * 100) / 100;
    if (!payAmt || payAmt <= 0) {
      alert('Please enter a valid amount of at least ₹1.00');
      return;
    }
    setAdminBalanceLoading(true);
    setErrorMsg('');

    try {
      const activeToken =
        token || (typeof window !== 'undefined' ? localStorage.getItem('shvom_admin_token') : '');

      let prevNotes = {};
      try {
        if (remainingData.notes) {
          prevNotes =
            typeof remainingData.notes === 'string'
              ? JSON.parse(remainingData.notes)
              : remainingData.notes;
        }
      } catch (_) {
        prevNotes = {};
      }

      const prevItems =
        remainingData.items && Array.isArray(remainingData.items) && remainingData.items.length > 0
          ? remainingData.items
          : prevNotes.items && Array.isArray(prevNotes.items) && prevNotes.items.length > 0
          ? prevNotes.items
          : [
              {
                description: remainingData.occasion || 'Payment towards Shvom Enterprises',
                hsn: '-',
                qty: 1,
                unit: 'PCS',
                rate: Math.round(Number(remainingData.total_billed || payAmt) / 1.18),
                gst_rate: 18,
              },
            ];

      const prevAdvance =
        Number(remainingData.advance_amount) ||
        Number(prevNotes.advance_amount) ||
        Number(remainingData.total_paid) ||
        0;

      const existingExtra = Array.isArray(prevNotes.extra_payments)
        ? prevNotes.extra_payments
        : Array.isArray(remainingData.extra_payments)
        ? remainingData.extra_payments
        : [];

      // Determine payment index & label (2nd Payment, 3rd Payment, etc.)
      const nextIdx = existingExtra.length;
      const nextNum = nextIdx + 2;
      const suffix =
        nextNum % 10 === 2 && nextNum % 100 !== 12
          ? 'nd'
          : nextNum % 10 === 3 && nextNum % 100 !== 13
          ? 'rd'
          : 'th';
      const paymentLabel = `${nextNum}${suffix} Payment`;

      const newPaymentEntry = {
        id: `extra_pay_${Date.now()}`,
        label: paymentLabel,
        amount: payAmt,
        payment_mode: adminBalanceMode || 'Bank Transfer',
        date: adminBalanceDate || todayStr,
      };

      const updatedExtraPayments = [...existingExtra, newPaymentEntry];
      const totalExtraPaid = updatedExtraPayments.reduce(
        (s, p) => s + (Number(p.amount) || 0),
        0
      );
      const totalPaidSoFar = prevAdvance + totalExtraPaid;

      const totalBilled =
        Number(remainingData.total_billed) ||
        Number(prevNotes.grand_total) ||
        Number(prevNotes.grandTotal) ||
        Math.max(payAmt, prevAdvance + (Number(remainingData.balance_due) || payAmt));

      const newRemainingBalance = Math.max(
        0,
        Math.round((totalBilled - totalPaidSoFar) * 100) / 100
      );

      const parentOrderId =
        remainingData.order_id || remainingData.reference_id || 'ORDER';
      const rawParentInvoiceNo = remainingData.invoice_no || prevNotes.parent_invoice_no;

      // Unique installment invoice number for 2nd/subsequent bills
      const yearStr = '2026-27';
      let installmentInvoiceNo = '';
      do {
        const randSeq = Math.floor(1000 + Math.random() * 9000);
        installmentInvoiceNo = `VAS/${yearStr}/${randSeq}`;
      } while (installmentInvoiceNo === rawParentInvoiceNo);

      // Distinct final order invoice number (guaranteed different from installment invoice number!)
      let finalOrderInvoiceNo = rawParentInvoiceNo;
      if (!finalOrderInvoiceNo || finalOrderInvoiceNo === installmentInvoiceNo || finalOrderInvoiceNo.startsWith('ORDER-')) {
        do {
          const randSeq = Math.floor(1000 + Math.random() * 9000);
          finalOrderInvoiceNo = `VAS/${yearStr}/${randSeq}`;
        } while (finalOrderInvoiceNo === installmentInvoiceNo);
      }

      // Match with the same order number across all invoices for this order
      const installmentOrderId = parentOrderId;

      // 1. Update the parent order in database so its remaining balance is updated
      const parentUpdateNotes = {
        ...prevNotes,
        parent_invoice_no: finalOrderInvoiceNo,
        items: prevItems,
        grand_total: totalBilled,
        advance_amount: prevAdvance,
        advance_payment_mode:
          remainingData.advance_payment_mode ||
          prevNotes.advance_payment_mode ||
          'Bank Transfer',
        extra_payments: updatedExtraPayments,
        remaining_amount: newRemainingBalance,
        remaining_payment_mode: adminBalanceMode || 'Bank Transfer',
      };

      try {
        await createAdminBill(activeToken, {
          is_existing_bill: true,
          order_id: parentOrderId,
          invoice_no: finalOrderInvoiceNo,
          customer_name:
            remainingData.client_name || prevNotes.customer_name || 'Valued Patron',
          customer_email:
            remainingData.client_email || prevNotes.customer_email || 'concierge@vasanta.in',
          customer_phone: remainingData.client_phone || prevNotes.customer_phone,
          status: newRemainingBalance <= 0 ? 'PAID' : 'PARTIAL',
          notes: JSON.stringify(parentUpdateNotes),
        });
      } catch (parentErr) {
        console.warn('Could not update parent bill in place:', parentErr);
      }

      // 2. Create the distinct installment payment record (e.g. ₹1.6 Lakh) so it appears directly in the Admin Payments table
      const installmentBillPayload = {
        amount: payAmt, // Exact payment amount so it shows in the Payments table list
        currency: 'INR',
        customer_name: remainingData.client_name || 'Valued Patron',
        customer_email: remainingData.client_email || 'concierge@vasanta.in',
        customer_phone: remainingData.client_phone || undefined,
        reference_code: parentOrderId,
        purpose: `${paymentLabel} towards Shvom Enterprises${remainingData.occasion ? `: ${remainingData.occasion}` : ''}`,
        payment_method: adminBalanceMode || 'Bank Transfer',
        status: newRemainingBalance <= 0 ? 'PAID' : 'PARTIAL',
        invoice_no: installmentInvoiceNo,
        order_id: installmentOrderId,
        is_existing_bill: false,
        invoice_date: adminBalanceDate || todayStr,
        tracking_status: 'Payment Received',
        courier_name: 'Blue Dart Express',
        tracking_number: finalOrderInvoiceNo,
        notes: JSON.stringify({
          parent_order_id: parentOrderId,
          parent_invoice_no: finalOrderInvoiceNo, // DISTINCT from installmentInvoiceNo!
          installment_invoice_no: installmentInvoiceNo,
          action: 'installment_payment',
          payment_label: paymentLabel,
          amount: payAmt,
          payment_mode: adminBalanceMode || 'Bank Transfer',
          items: prevItems,
          taxable: Math.round((totalBilled / 1.18) * 100) / 100,
          total_gst: Math.round((totalBilled - totalBilled / 1.18) * 100) / 100,
          grand_total: totalBilled,
          advance_amount: prevAdvance,
          advance_payment_mode:
            remainingData.advance_payment_mode ||
            prevNotes.advance_payment_mode ||
            'Bank Transfer',
          extra_payments: updatedExtraPayments,
          now_paid_amount: payAmt,
          now_paid_label: paymentLabel,
          now_paid_mode: adminBalanceMode || 'Bank Transfer',
          remaining_amount: newRemainingBalance,
          remaining_payment_mode: adminBalanceMode || 'Bank Transfer',
          customer_address: prevNotes.customer_address || '',
          customer_gstin: prevNotes.customer_gstin || '',
          place_of_supply: prevNotes.place_of_supply || 'Telangana',
          invoice_date: adminBalanceDate || todayStr,
        }),
      };

      let recorded = null;
      try {
        recorded = await createAdminBill(activeToken, installmentBillPayload);
      } catch (recErr) {
        console.warn('createAdminBill fallback applied:', recErr);
        recorded = {
          ...installmentBillPayload,
          id: Date.now(),
          transaction_id: `VAS-BILL-${Date.now()}`,
        };
      }

      // 3. Update remaining data display in modal
      setRemainingData((prev) => ({
        ...prev,
        total_paid: totalPaidSoFar,
        balance_due: newRemainingBalance,
        remaining_amount: newRemainingBalance,
        extra_payments: updatedExtraPayments,
        notes: JSON.stringify(parentUpdateNotes),
      }));
      setCustomPayAmount(newRemainingBalance > 0 ? String(newRemainingBalance) : '0');

      // 4. Prepare installment receipt and final order receipt objects
      const installmentReceipt = {
        ...recorded,
        invoice_no: installmentInvoiceNo, // Unique invoice number for this generation
        transaction_id: recorded.transaction_id || installmentInvoiceNo,
        order_id: parentOrderId, // Matched with the same order number
        amount: payAmt,
        now_paid_amount: payAmt,
        now_paid_label: paymentLabel,
        now_paid_mode: adminBalanceMode || 'Bank Transfer',
        total_order_value: totalBilled,
        remaining_amount: newRemainingBalance,
        customer_name: remainingData.client_name || recorded.customer_name,
        customer_email: remainingData.client_email || recorded.customer_email,
        customer_phone: remainingData.client_phone || recorded.customer_phone,
        customer_gstin: prevNotes.customer_gstin || '',
        customer_address: prevNotes.customer_address || '',
        place_of_supply: prevNotes.place_of_supply || 'Telangana',
        purpose: `${paymentLabel} towards Shvom Enterprises${remainingData.occasion ? `: ${remainingData.occasion}` : ''}`,
        payment_method: adminBalanceMode || 'Bank Transfer',
        status: newRemainingBalance <= 0 ? 'PAID' : 'PARTIAL',
        invoice_date: adminBalanceDate || todayStr,
        created_at: new Date().toISOString(),
        is_installment: true,
      };

      const finalOrderReceipt = {
        ...recorded,
        invoice_no: finalOrderInvoiceNo,
        transaction_id: recorded.transaction_id || finalOrderInvoiceNo,
        order_id: parentOrderId,
        amount: totalBilled,
        customer_name: remainingData.client_name || recorded.customer_name,
        customer_email: remainingData.client_email || recorded.customer_email,
        customer_phone: remainingData.client_phone || recorded.customer_phone,
        customer_gstin: prevNotes.customer_gstin || '',
        customer_address: prevNotes.customer_address || '',
        place_of_supply: prevNotes.place_of_supply || 'Telangana',
        purpose: remainingData.occasion || 'Payment towards Shvom Enterprises',
        payment_method: adminBalanceMode || 'Bank Transfer',
        status: newRemainingBalance <= 0 ? 'PAID' : 'PARTIAL',
        advance_amount: prevAdvance,
        advance_payment_mode:
          remainingData.advance_payment_mode ||
          prevNotes.advance_payment_mode ||
          'Bank Transfer',
        extra_payments: updatedExtraPayments,
        now_paid_amount: payAmt,
        now_paid_label: paymentLabel,
        remaining_amount: newRemainingBalance,
        remaining_payment_mode: adminBalanceMode || 'Bank Transfer',
        invoice_date: adminBalanceDate || todayStr,
        created_at: new Date().toISOString(),
      };

      const finalOrderForm = {
        ...finalOrderReceipt,
        invoice_no: finalOrderInvoiceNo,
        items: prevItems,
        notes: prevNotes.notes || '',
      };

      const installmentForm = {
        ...installmentReceipt,
        invoice_no: installmentInvoiceNo,
        items: prevItems,
        notes: prevNotes.notes || '',
      };

      submittedFormRef.current = installmentForm;
      finalOrderReceiptRef.current = finalOrderReceipt;
      finalOrderFormRef.current = finalOrderForm;

      // Notify parent AdminDashboard to refresh table immediately with this new bill
      if (onBillCreated) {
        onBillCreated({ ...recorded, ...installmentReceipt });
      }

      // Automatically trigger installment invoice printing
      printPaymentReceipt(installmentReceipt, installmentForm);

      setReceipt(installmentReceipt);
      setStep('success');
    } catch (err) {
      console.error('Error recording balance payment:', err);
      setErrorMsg(err.message || 'Failed to record payment in admin portal.');
      alert(err.message || 'Failed to record payment in admin portal.');
    } finally {
      setAdminBalanceLoading(false);
    }
  }

  async function handlePayRemainingSubmit(e) {
    e.preventDefault();
    if (!remainingData) return;
    const payAmt = Number(customPayAmount);
    if (!payAmt || payAmt < 1) {
      alert('Please enter a valid amount of at least ₹1.00');
      return;
    }
    setStep('initiating');
    setErrorMsg('');
    submittedFormRef.current = {
      customer_name: remainingData.client_name,
      customer_email: remainingData.client_email,
      customer_phone: remainingData.client_phone,
      amount: payAmt,
      purpose: `Remaining Balance: ${remainingData.invoice_no || remainingData.reference_id}`,
    };

    let orderId = null;
    let paymentSessionId = null;

    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}?order_id={order_id}`
          : undefined;

      const orderPayload = {
        order_amount: Math.round(payAmt * 100) / 100,
        customer_name: (remainingData.client_name || 'Valued Patron').trim(),
        customer_email: (remainingData.client_email || 'concierge@vasanta.in').trim(),
        customer_phone: remainingData.client_phone ? remainingData.client_phone.trim() : undefined,
        reference_code: remainingData.reference_id || undefined,
        purpose: `Remaining Balance: ${remainingData.invoice_no || remainingData.reference_id}`,
        return_url: returnUrl,
        notes: `Balance Payment towards ${remainingData.invoice_no || remainingData.reference_id}`,
      };

      const sessionResponse = await createCashfreeOrder(orderPayload);
      orderId = sessionResponse.order_id;
      paymentSessionId = sessionResponse.payment_session_id;

      setActiveOrderId(orderId);
      setActiveSessionId(paymentSessionId);

      const cashfree = await getCashfree();
      setStep('checkout');

      cashfree
        .checkout({
          paymentSessionId: paymentSessionId,
          redirectTarget: '_modal',
        })
        .then(async (result) => {
          if (result && result.error) {
            setErrorMsg(result.error.message || 'Payment cancelled or closed.');
            setStep('error');
            return;
          }
          if (result && result.redirect) return;
          await performServerVerification(orderId);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Cashfree modal error.');
          setStep('error');
        });
    } catch (err) {
      setErrorMsg(err.message || 'Could not initiate payment session.');
      setStep('error');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm"
        onClick={step === 'initiating' || step === 'verifying' ? undefined : handleClose}
      />

      {/* Main Container — expanded width for comfortable bill editing */}
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 border border-[#E7E3DC] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative bg-[#1A1A1A] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B89B6A]/20 flex items-center justify-center border border-[#B89B6A]/30">
              <CreditCard className="w-4 h-4 text-[#B89B6A]" />
            </div>
            <div>
              <h2
                id="payment-modal-title"
                className="font-serif text-base tracking-[0.12em] text-[#FAF8F5]"
              >
                Bill Generator &amp; Checkout
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-[9px] tracking-[0.16em] uppercase text-[#B89B6A]">
                  Shvom Enterprises &bull; GSTIN: 36AHEPC4719K1ZD
                </span>
              </div>
            </div>
          </div>
          {step !== 'initiating' && step !== 'verifying' && (
            <button
              onClick={handleClose}
              className="p-1.5 text-[#FAF8F5]/60 hover:text-[#FAF8F5] transition-colors rounded-lg hover:bg-white/5"
              aria-label="Close payment modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: FORM INPUT */}
          {step === 'form' && (
            <div>
              {/* Tab Switcher — 2-Row Layout bringing 'Add an item to the existing bill' to a line down */}
              <div className="mb-5 space-y-2 border-b border-[#E7E3DC] pb-3">
                {/* Row 1: Bill Generator & Pay Remaining */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayTab('checkout')}
                    className={`py-2.5 px-3 text-xs uppercase tracking-[0.14em] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 border ${
                      payTab === 'checkout'
                        ? 'border-[#B89B6A] bg-[#FAF8F5] text-[#1A1A1A] shadow-xs'
                        : 'border-[#E7E3DC] bg-white text-[#8E8880] hover:text-[#1A1A1A] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#B89B6A]" />
                    <span>{isAdmin ? 'Bill Generator' : 'Bill Generator & Checkout'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayTab('remaining')}
                    className={`py-2.5 px-3 text-xs uppercase tracking-[0.14em] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 border ${
                      payTab === 'remaining'
                        ? 'border-[#B89B6A] bg-[#FAF8F5] text-[#1A1A1A] shadow-xs'
                        : 'border-[#E7E3DC] bg-white text-[#8E8880] hover:text-[#1A1A1A] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#B89B6A]" />
                    <span>Pay Remaining Amount</span>
                  </button>
                </div>

                {/* Row 2: Add an item to the existing bill (A line down as requested) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setPayTab('add_item')}
                    className={`w-full py-2.5 px-4 text-xs uppercase tracking-[0.14em] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 border ${
                      payTab === 'add_item'
                        ? 'border-[#B89B6A] bg-[#FAF8F5] text-[#8D7243] shadow-xs font-bold ring-1 ring-[#B89B6A]'
                        : 'border-[#D4BE96] bg-[#FAF8F5]/60 text-[#8D7243] hover:bg-[#FAF8F5] hover:border-[#B89B6A]'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-[#B89B6A]" />
                    <span>Add an Item to the Existing Bill</span>
                  </button>
                </div>
              </div>

              {payTab === 'checkout' && (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                  {/* ADMIN MODE: Generate an Existing Bill Finder */}
                  {isAdmin && (
                    <div className="p-3.5 bg-white border border-[#D4BE96] rounded-xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[10px] uppercase tracking-[0.16em] font-bold text-[#8D7243] flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-[#B89B6A]" />
                          Generate an Existing Bill
                        </span>
                        {form.is_existing_bill && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-300 font-mono px-2 py-0.5 rounded font-semibold">
                            Editing: {form.invoice_no || form.order_id}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminExistingQuery}
                          onChange={(e) => setAdminExistingQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAdminFetchExisting();
                            }
                          }}
                          placeholder="Enter Order ID or Invoice No (e.g. ORDER-5312D4C7 or VAS/2026-27/4604)"
                          className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded font-mono text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                        <button
                          type="button"
                          onClick={handleAdminFetchExisting}
                          disabled={adminExistingLoading || !adminExistingQuery.trim()}
                          className="px-3.5 py-1.5 bg-[#B89B6A] hover:bg-[#8D7243] text-white rounded font-sans text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                          {adminExistingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Details'}
                        </button>
                        {form.is_existing_bill && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm({
                                customer_name: '',
                                customer_email: '',
                                customer_phone: '',
                                customer_gstin: '',
                                customer_address: '',
                                customer_city: '',
                                customer_state: '',
                                customer_pincode: '',
                                place_of_supply: 'Telangana',
                                reference_code: '',
                                notes: '',
                                invoice_date: todayStr,
                                invoice_no: '',
                                order_id: '',
                                tracking_number: '',
                                is_existing_bill: false,
                                advance_amount: '',
                                advance_payment_mode: 'Bank Transfer',
                                extra_payments: [],
                                remaining_payment_mode: 'Bank Transfer',
                                items: [defaultItem],
                              });
                              setAdminExistingQuery('');
                            }}
                            className="px-2.5 py-1.5 text-xs text-[#8E8880] hover:text-[#1A1A1A] border border-[#E7E3DC] hover:bg-[#FAF8F5] rounded transition-colors"
                            title="Clear and create a fresh new bill"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      {adminExistingError && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          {adminExistingError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* SECTION 1: BILL TO INFORMATION */}
                  <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A]">
                        Bill To Details
                      </span>
                      <span className="text-[10px] text-[#8E8880] font-sans">
                        Customer Information &amp; GSTIN
                      </span>
                    </div>

                    {/* ADMIN MODE: Custom Bill Date */}
                    {isAdmin && (
                      <div className="bg-[#FAF8F5] p-3 border border-[#E7E3DC] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label
                            htmlFor="pay-invoice-date"
                            className="block font-sans text-[10px] uppercase tracking-[0.16em] text-[#8D7243] font-bold"
                          >
                            Bill Date <span className="text-[#8E8880] font-normal font-sans">(Shown on Tax &amp; Proforma Invoices)</span>
                          </label>
                          <p className="text-[11px] text-[#5A5A58] mt-0.5">
                            The date selected here is printed on the bill and recorded in the database.
                          </p>
                        </div>
                        <input
                          id="pay-invoice-date"
                          type="date"
                          value={form.invoice_date || ''}
                          onChange={(e) => updateField('invoice_date', e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#E7E3DC] rounded font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A] w-full sm:w-44"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="pay-name"
                          className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1"
                        >
                          Customer Name <span className="text-[#B89B6A]">*</span>
                        </label>
                        <input
                          ref={firstInputRef}
                          id="pay-name"
                          type="text"
                          placeholder="e.g. Rahul"
                          value={form.customer_name}
                          onChange={(e) => updateField('customer_name', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pay-gstin"
                          className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1"
                        >
                          Customer GSTIN (Optional)
                        </label>
                        <input
                          id="pay-gstin"
                          type="text"
                          placeholder="e.g. 36AUCPK6858J1Z5"
                          value={form.customer_gstin}
                          onChange={(e) => updateField('customer_gstin', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-mono text-xs text-[#1A1A1A] uppercase focus:outline-none focus:border-[#B89B6A]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="pay-email"
                          className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1"
                        >
                          Email Address <span className="text-[#B89B6A]">*</span>
                        </label>
                        <input
                          id="pay-email"
                          type="email"
                          placeholder="rahul@example.com"
                          value={form.customer_email}
                          onChange={(e) => updateField('customer_email', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pay-phone"
                          className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1"
                        >
                          Phone Number
                        </label>
                        <input
                          id="pay-phone"
                          type="tel"
                          placeholder="e.g. 1234567890"
                          value={form.customer_phone}
                          onChange={(e) => updateField('customer_phone', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="pay-address"
                          className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1"
                        >
                          Address Line
                        </label>
                        <input
                          id="pay-address"
                          type="text"
                          placeholder="e.g. Address"
                          value={form.customer_address}
                          onChange={(e) => updateField('customer_address', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pay-supply"
                          className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1"
                        >
                          Place of Supply
                        </label>
                        <input
                          id="pay-supply"
                          type="text"
                          placeholder="Telangana"
                          value={form.place_of_supply}
                          onChange={(e) => updateField('place_of_supply', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: ITEMS / PURPOSE DESCRIPTION TABLE */}
                  <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A]">
                        Items / Purpose of Bill
                      </span>
                      <button
                        type="button"
                        onClick={addItemRow}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-[#1A1A1A] hover:text-[#B89B6A] bg-[#FAF8F5] hover:bg-[#F2EFE9] px-2.5 py-1 rounded border border-[#E7E3DC] transition-colors"
                      >
                        <Plus className="w-3 h-3 text-[#B89B6A]" />
                        Add Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.items.map((it, idx) => {
                        const lineTaxable = (Number(it.qty) || 1) * (Number(it.rate) || 0);
                        const lineGst = (lineTaxable * (Number(it.gst_rate) || 18)) / 100;
                        const lineTotal = lineTaxable + lineGst;

                        return (
                          <div
                            key={it.id}
                            className="p-3 bg-[#FAF8F5] border border-[#E7E3DC] rounded-lg space-y-2 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-[#8E8880] font-semibold">
                                ITEM #{idx + 1}
                              </span>
                              {form.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(it.id)}
                                  className="text-red-500 hover:text-red-700 p-1 text-xs"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Free text Purpose Description */}
                            <div>
                              <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                Description of Purpose (Free Text)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. RR-Polo - Mero White / Bespoke Wedding Favors"
                                value={it.description}
                                onChange={(e) => updateItemRow(it.id, 'description', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                required
                              />
                            </div>

                            {/* Columns: HSN/SAC, Qty, Rate, GST %, Total Amount */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                              <div>
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  HSN / SAC
                                </label>
                                <input
                                  type="text"
                                  placeholder="-"
                                  value={it.hsn}
                                  onChange={(e) => updateItemRow(it.id, 'hsn', e.target.value)}
                                  className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                />
                              </div>

                              <div>
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={it.qty}
                                  onChange={(e) => updateItemRow(it.id, 'qty', e.target.value)}
                                  className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs text-center text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                />
                              </div>

                              <div>
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  Rate (₹)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={it.rate}
                                  onChange={(e) => updateItemRow(it.id, 'rate', e.target.value)}
                                  className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs text-right font-medium text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                />
                              </div>

                              <div>
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  GST Rate
                                </label>
                                <select
                                  value={it.gst_rate}
                                  onChange={(e) => updateItemRow(it.id, 'gst_rate', Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                >
                                  <option value={0}>0%</option>
                                  <option value={5}>5%</option>
                                  <option value={12}>12%</option>
                                  <option value={18}>18%</option>
                                  <option value={28}>28%</option>
                                </select>
                              </div>

                              <div className="col-span-2 sm:col-span-1">
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  Total Amount
                                </label>
                                <div className="px-2 py-1 bg-white border border-[#E7E3DC] rounded text-xs text-right font-bold text-[#1A1A1A]">
                                  ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totals Summary Breakdown */}
                    <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E7E3DC] flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
                      <div className="text-[#5A5A58] flex items-center gap-3">
                        <span>Taxable: <b className="text-[#1A1A1A]">₹{calculatedTotals.taxable.toLocaleString('en-IN')}</b></span>
                        <span>GST: <b className="text-[#1A1A1A]">₹{calculatedTotals.totalGst.toLocaleString('en-IN')}</b></span>
                      </div>
                      <div className="font-serif text-sm text-[#1A1A1A]">
                        Total: <span className="font-bold text-[#B89B6A] text-base">₹{calculatedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PAYMENT SPLIT — Advance, Extra Payments & Remaining */}
                  <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A]">
                        Payment Split (Advance &amp; Installments)
                      </span>
                      <span className="text-[10px] text-[#8E8880] font-sans">
                        Record advance, 2nd payment &amp; remaining balance
                      </span>
                    </div>

                    {/* Advance Payment Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1 font-semibold">
                          Advance Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={calculatedTotals.grandTotal}
                          step="0.01"
                          placeholder={`e.g. ${Math.round(calculatedTotals.grandTotal / 2)}`}
                          value={form.advance_amount}
                          onChange={(e) => updateField('advance_amount', e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                        <span className="text-[9px] text-[#8E8880] mt-0.5 block">
                          Initial advance payment received
                        </span>
                      </div>

                      {isAdmin ? (
                        <div>
                          <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1">
                            Advance Payment Mode
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UPI, Bank Transfer, Cash…"
                            value={form.advance_payment_mode}
                            onChange={(e) => updateField('advance_payment_mode', e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1 font-semibold">
                            Remaining Balance (₹)
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={
                              form.advance_amount !== '' && form.advance_amount !== undefined && Number(form.advance_amount) > 0
                                ? Math.max(0, calculatedTotals.grandTotal - (Number(form.advance_amount) || 0)).toFixed(2)
                                : '0.00'
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-[#F0EDE8] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#5A5A58] cursor-not-allowed font-mono font-medium"
                          />
                        </div>
                      )}
                    </div>

                    {/* Extra Payments List (2nd Payment, 3rd Payment, etc.) */}
                    {isAdmin && (form.extra_payments || []).length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#8D7243] font-bold block">
                          Additional Payments / Installments
                        </span>
                        {(form.extra_payments || []).map((extra, idx) => (
                          <div
                            key={extra.id || idx}
                            className="p-3 bg-[#FAF8F5] border border-[#D4BE96] rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#8D7243] font-bold flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-[#B89B6A]" />
                                {extra.label || `Payment ${idx + 2}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraPayment(idx)}
                                className="text-[#8E8880] hover:text-red-600 p-1 rounded transition-colors text-xs flex items-center gap-1"
                                title="Remove this payment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Remove</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={extra.amount}
                                  onChange={(e) => handleUpdateExtraPayment(idx, 'amount', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-[#E7E3DC] rounded font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                />
                              </div>
                              <div>
                                <label className="block font-sans text-[9px] uppercase tracking-wider text-[#5A5A58] mb-0.5">
                                  Payment Mode
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Bank Transfer, UPI, Cash…"
                                  value={extra.payment_mode}
                                  onChange={(e) => handleUpdateExtraPayment(idx, 'payment_mode', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-[#E7E3DC] rounded font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Another Payment Button for Admin */}
                    {isAdmin && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleAddExtraPayment}
                          className="w-full py-2 px-3 border border-dashed border-[#B89B6A] hover:bg-[#FAF8F5] text-[#8D7243] rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#B89B6A]" />
                          <span>
                            + Add Another Payment{' '}
                            {form.extra_payments?.length === 0 ? '(2nd Payment)' : `(${(form.extra_payments?.length || 0) + 2}th Payment)`}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Remaining Amount & Remaining Mode for Admin */}
                    {isAdmin && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1 font-semibold">
                            Remaining Payment (₹) — Balance Due
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={
                              Number(form.advance_amount) > 0 || (form.extra_payments && form.extra_payments.length > 0)
                                ? Math.max(
                                    0,
                                    calculatedTotals.grandTotal -
                                      ((Number(form.advance_amount) || 0) +
                                        (form.extra_payments || []).reduce(
                                          (sum, p) => sum + (Number(p.amount) || 0),
                                          0
                                        ))
                                  ).toFixed(2)
                                : '0.00'
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-[#F0EDE8] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#5A5A58] cursor-not-allowed font-mono font-medium"
                          />
                          <span className="text-[9px] text-[#8E8880] mt-0.5 block">
                            Auto-calculated: Billed minus (Advance + Extra Payments)
                          </span>
                        </div>

                        <div>
                          <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1">
                            Remaining Payment Mode
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UPI, Bank Transfer, Cash…"
                            value={form.remaining_payment_mode}
                            onChange={(e) => updateField('remaining_payment_mode', e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Live Financial Breakdown */}
                    {(Number(form.advance_amount) > 0 || (form.extra_payments && form.extra_payments.length > 0)) && (
                      <div className="bg-[#FAF8F5] border border-[#E7E3DC] rounded-lg p-3 text-xs text-[#5A5A58] space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E3DC] pb-1.5">
                          <span>
                            Total Billed:{' '}
                            <b className="text-[#1A1A1A]">
                              ₹{calculatedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </b>
                          </span>
                          <span>
                            Total Paid:{' '}
                            <b className="text-[#B89B6A]">
                              ₹{((Number(form.advance_amount) || 0) +
                                (form.extra_payments || []).reduce(
                                  (sum, p) => sum + (Number(p.amount) || 0),
                                  0
                                )).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </b>
                          </span>
                          <span>
                            Remaining:{' '}
                            <b
                              className={
                                Math.max(
                                  0,
                                  calculatedTotals.grandTotal -
                                    ((Number(form.advance_amount) || 0) +
                                      (form.extra_payments || []).reduce(
                                        (sum, p) => sum + (Number(p.amount) || 0),
                                        0
                                      ))
                                ) > 0
                                  ? 'text-[#8D7243]'
                                  : 'text-emerald-700 font-bold'
                              }
                            >
                              ₹{Math.max(
                                0,
                                calculatedTotals.grandTotal -
                                  ((Number(form.advance_amount) || 0) +
                                    (form.extra_payments || []).reduce(
                                      (sum, p) => sum + (Number(p.amount) || 0),
                                      0
                                    ))
                              ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                              {Math.max(
                                0,
                                calculatedTotals.grandTotal -
                                  ((Number(form.advance_amount) || 0) +
                                    (form.extra_payments || []).reduce(
                                      (sum, p) => sum + (Number(p.amount) || 0),
                                      0
                                    ))
                              ) === 0
                                ? '(PAID IN FULL)'
                                : ''}
                            </b>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#8E8880]">
                          {Number(form.advance_amount) > 0 && (
                            <span>
                              Advance Payment: ₹{Number(form.advance_amount).toLocaleString('en-IN')}{' '}
                              {form.advance_payment_mode ? `(${form.advance_payment_mode})` : ''}
                            </span>
                          )}
                          {(form.extra_payments || []).map(
                            (p, idx) =>
                              Number(p.amount) > 0 && (
                                <span key={p.id || idx}>
                                  {p.label || `Payment ${idx + 2}`}: ₹{Number(p.amount).toLocaleString('en-IN')}{' '}
                                  {p.payment_mode ? `(${p.payment_mode})` : ''}
                                </span>
                              )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Pay for customer; Admin can also directly generate invoices */}
                  <div className="pt-2">
                    {isAdmin ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="gold"
                          size="md"
                          className="w-full justify-center text-xs font-semibold py-3"
                          icon={Printer}
                          iconPosition="left"
                          loading={recordingBill}
                          disabled={!isFormValid || recordingBill}
                          onClick={() => handleGenerateAdminBill(false)}
                        >
                          Generate &amp; Record Tax Invoice &bull; ₹{calculatedTotals.grandTotal.toLocaleString('en-IN')}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          className="w-full justify-center text-xs font-semibold py-3 border-[#B89B6A] text-[#B89B6A] hover:bg-[#B89B6A]/10"
                          icon={FileText}
                          iconPosition="left"
                          loading={recordingBill}
                          disabled={!isFormValid || recordingBill}
                          onClick={() => handleGenerateAdminBill(true)}
                        >
                          Generate Proforma Invoice
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        variant="gold"
                        size="md"
                        className="w-full justify-center text-xs font-semibold py-3"
                        disabled={!isFormValid}
                      >
                        {Number(form.advance_amount) > 0 && Number(form.advance_amount) < calculatedTotals.grandTotal
                          ? `Pay Advance · ₹${Number(form.advance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Remaining: ₹${Math.max(0, calculatedTotals.grandTotal - Number(form.advance_amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                          : `Pay · ₹${calculatedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </Button>
                    )}
                  </div>

                </form>
              )}

              {/* PAY REMAINING BALANCE TAB */}
              {payTab === 'remaining' && (
                <div className="space-y-4">
                  {/* Lookup card */}
                  <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A]">
                        Lookup Balance Due
                      </span>
                      <span className="text-[10px] text-[#8E8880] font-sans">
                        Enter Invoice No. or Commission Reference
                      </span>
                    </div>

                    <form onSubmit={handleSearchBalance} className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8880]" />
                        <input
                          type="text"
                          value={remainingQuery}
                          onChange={(e) => setRemainingQuery(e.target.value)}
                          placeholder="e.g. VAS/26-27/33 or SHV-2026-0001"
                          className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-mono text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="gold"
                        size="sm"
                        disabled={remainingLoading || !remainingQuery.trim()}
                        className="text-xs shrink-0"
                      >
                        {remainingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Order'}
                      </Button>
                    </form>

                    {remainingError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                        {remainingError}
                      </div>
                    )}
                  </div>

                  {/* Balance Result & Payment Form */}
                  {remainingData && (
                    <form onSubmit={handlePayRemainingSubmit} className="space-y-4 animate-in fade-in">
                      {/* Summary card */}
                      <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#8E8880] block font-sans">
                              Client / Entity
                            </span>
                            <span className="text-sm font-semibold text-[#1A1A1A]">
                              {remainingData.client_name}
                            </span>
                          </div>
                          <span className="font-mono text-xs text-[#8D7243] bg-[#FAF8F5] border border-[#D4BE96] px-2 py-0.5 rounded">
                            {remainingData.invoice_no || remainingData.reference_id}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-2.5 bg-[#FAF8F5] rounded border border-[#E7E3DC]">
                            <span className="text-[9px] uppercase tracking-wider text-[#8E8880] block">
                              Total Billed
                            </span>
                            <span className="font-mono text-xs font-bold text-[#1A1A1A]">
                              ₹{Number(remainingData.total_billed).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2.5 bg-[#FAF8F5] rounded border border-[#E7E3DC]">
                            <span className="text-[9px] uppercase tracking-wider text-green-700 block">
                              Amount Paid
                            </span>
                            <span className="font-mono text-xs font-bold text-green-700">
                              ₹{Number(remainingData.total_paid).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2.5 bg-[#FAF8F5] rounded border border-[#D4BE96]">
                            <span className="text-[9px] uppercase tracking-wider text-[#8D7243] block">
                              Balance Left
                            </span>
                            <span className="font-mono text-xs font-bold text-[#8D7243]">
                              ₹{Number(remainingData.balance_due).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {remainingData.balance_due <= 0 && (
                          <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 text-xs text-center rounded">
                            ✓ This order has been fully paid! No balance is due.
                          </div>
                        )}
                      </div>

                      {/* Custom Amount Selection */}
                      <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58]">
                          {isAdmin ? 'Choose Amount to Record as Paid (₹ INR)' : 'Choose Amount to Pay (₹ INR)'}
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8880]" />
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={customPayAmount}
                            onChange={(e) => setCustomPayAmount(e.target.value)}
                            placeholder="Enter amount to pay"
                            className="w-full pl-9 pr-3 py-2.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-mono text-sm font-bold text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                            required
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          {remainingData.balance_due > 0 && (
                            <button
                              type="button"
                              onClick={() => setCustomPayAmount(String(remainingData.balance_due))}
                              className="text-[10px] uppercase font-semibold text-[#B89B6A] border border-[#D4BE96] px-2.5 py-1 rounded bg-[#FAF8F5] hover:bg-[#B89B6A]/10"
                            >
                              Pay Full Remaining (₹{remainingData.balance_due})
                            </button>
                          )}
                          {remainingData.balance_due > 2 && (
                            <button
                              type="button"
                              onClick={() => setCustomPayAmount(String(Math.round(remainingData.balance_due / 2)))}
                              className="text-[10px] uppercase font-semibold text-[#5A5A58] border border-[#E7E3DC] px-2.5 py-1 rounded bg-[#FAF8F5] hover:bg-[#E7E3DC]"
                            >
                              Pay 50% (₹{Math.round(remainingData.balance_due / 2)})
                            </button>
                          )}
                        </div>

                        {/* Admin Mode Payment Settings (No Cashfree Redirect) */}
                        {isAdmin && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#F0EDE8]">
                            <div>
                              <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1 font-semibold">
                                Payment Mode
                              </label>
                              <input
                                type="text"
                                value={adminBalanceMode}
                                onChange={(e) => setAdminBalanceMode(e.target.value)}
                                placeholder="e.g. Bank Transfer, UPI, Cash…"
                                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                              />
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {['Bank Transfer', 'UPI', 'Cash', 'Cheque'].map((mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setAdminBalanceMode(mode)}
                                    className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
                                      adminBalanceMode === mode
                                        ? 'bg-[#B89B6A] text-white border-[#B89B6A]'
                                        : 'bg-[#FAF8F5] text-[#5A5A58] border-[#E7E3DC] hover:border-[#B89B6A]'
                                    }`}
                                  >
                                    {mode}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block font-sans text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1 font-semibold">
                                Payment / Invoice Date
                              </label>
                              <input
                                type="date"
                                value={adminBalanceDate}
                                onChange={(e) => setAdminBalanceDate(e.target.value)}
                                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-sans text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                              />
                              <span className="text-[9px] text-[#8E8880] mt-1 block">
                                Printed on the generated receipt &amp; recorded in DB
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {isAdmin ? (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            onClick={handleAdminRecordRemainingPayment}
                            variant="gold"
                            size="md"
                            className="w-full justify-center text-xs font-semibold py-3 gap-2"
                            disabled={adminBalanceLoading || Number(customPayAmount) < 1}
                          >
                            {adminBalanceLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                            <span>
                              Record Payment &amp; Generate Invoice &bull; ₹{Number(customPayAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </Button>
                          <p className="text-[10px] text-center text-[#8E8880]">
                            Directly records payment in database and prints updated Tax Invoice with now paid &amp; remaining balance without Cashfree redirect.
                          </p>
                        </div>
                      ) : (
                        <Button
                          type="submit"
                          variant="gold"
                          size="md"
                          className="w-full justify-center text-xs font-semibold py-3"
                          disabled={Number(customPayAmount) < 1}
                        >
                          Pay Remaining Balance &bull; ₹{Number(customPayAmount || 0).toLocaleString('en-IN')}
                        </Button>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* ADD AN ITEM TO THE EXISTING BILL TAB */}
              {payTab === 'add_item' && (
                <div className="space-y-4">
                  {/* Lookup card */}
                  <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A] flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#B89B6A]" />
                        Add an Item to the Existing Bill
                      </span>
                      <span className="text-[10px] text-[#8E8880] font-sans">
                        Enter Order ID or Invoice No.
                      </span>
                    </div>

                    <form onSubmit={handleFetchOrderForAddItem} className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8880]" />
                        <input
                          type="text"
                          value={addItemQuery}
                          onChange={(e) => setAddItemQuery(e.target.value)}
                          placeholder="e.g. ORDER-5312D4C7 or VAS/2026-27/4604"
                          className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded-md font-mono text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="gold"
                        size="sm"
                        disabled={addItemLoading || !addItemQuery.trim()}
                        className="text-xs shrink-0"
                      >
                        {addItemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Order'}
                      </Button>
                    </form>

                    {addItemError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                        {addItemError}
                      </div>
                    )}
                  </div>

                  {/* Existing Order Preview & Add Item Form */}
                  {existingOrder && (
                    <form onSubmit={handleAddItemSubmit} className="space-y-4 animate-in fade-in">
                      {/* Existing Order Summary Card */}
                      <div className="bg-white p-4 border border-[#D4BE96] rounded-xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EDE8] pb-2">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#8E8880] block font-sans">
                              Existing Order / Patron
                            </span>
                            <span className="text-sm font-semibold text-[#1A1A1A]">
                              {existingOrder.customer_name || existingOrder.client_name}
                            </span>
                            <span className="text-[11px] text-[#5A5A58] block">
                              {existingOrder.customer_email || existingOrder.client_email} {existingOrder.customer_phone ? `• ${existingOrder.customer_phone}` : ''}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs text-[#8D7243] bg-[#FAF8F5] border border-[#D4BE96] px-2 py-0.5 rounded font-bold block">
                              {existingOrder.invoice_no || existingOrder.order_id}
                            </span>
                            <span className="text-[10px] text-[#8E8880] font-mono mt-0.5 block">
                              Tracking AWB: {existingOrder.tracking_number || existingOrder.invoice_no}
                            </span>
                          </div>
                        </div>

                        {/* Existing items breakdown */}
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#8D7243] font-bold block mb-1">
                            Current Items in this Consignment:
                          </span>
                          <div className="space-y-1 bg-[#FAF8F5] p-2.5 rounded border border-[#E7E3DC] text-xs">
                            {(existingOrder.items || []).map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[#1A1A1A]">
                                <span>
                                  {idx + 1}. {it.description || `Item ${idx + 1}`}{' '}
                                  <span className="text-[#8E8880]">({it.qty || 1} {it.unit || 'PCS'})</span>
                                </span>
                                <span className="font-mono font-medium">
                                  ₹{Math.round((Number(it.qty || 1) * Number(it.rate || 0) * (1 + (Number(it.gst_rate ?? 18) / 100)))).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2 bg-[#FAF8F5] rounded border border-[#E7E3DC]">
                            <span className="text-[9px] uppercase tracking-wider text-[#8E8880] block">Current Total</span>
                            <span className="font-mono text-xs font-bold text-[#1A1A1A]">
                              ₹{Number(existingOrder.total_billed || existingOrder.grand_total || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2 bg-[#FAF8F5] rounded border border-[#E7E3DC]">
                            <span className="text-[9px] uppercase tracking-wider text-green-700 block">Total Paid</span>
                            <span className="font-mono text-xs font-bold text-green-700">
                              ₹{Number(existingOrder.total_paid || existingOrder.advance_amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2 bg-[#FAF8F5] rounded border border-[#D4BE96]">
                            <span className="text-[9px] uppercase tracking-wider text-[#8D7243] block">Balance Left</span>
                            <span className="font-mono text-xs font-bold text-[#8D7243]">
                              ₹{Number(existingOrder.balance_due || existingOrder.remaining_amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* New Item Entry Section */}
                      <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                          <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A]">
                            New Item Details to Add
                          </span>
                          <span className="text-[10px] text-[#8E8880] font-sans">
                            Added into SAME Order #{existingOrder.invoice_no || existingOrder.order_id}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5A5A58] mb-1 font-semibold">
                            Item Description / Name <span className="text-[#B89B6A]">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Silver Keepsake Frame / Custom Artisan Box"
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#5A5A58] mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newItem.qty}
                              onChange={(e) => setNewItem({ ...newItem, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] font-mono focus:outline-none focus:border-[#B89B6A]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#5A5A58] mb-1">
                              Unit
                            </label>
                            <input
                              type="text"
                              value={newItem.unit}
                              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value.toUpperCase() })}
                              className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] uppercase focus:outline-none focus:border-[#B89B6A]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#5A5A58] mb-1">
                              Unit Rate (₹) <span className="text-[#B89B6A]">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={newItem.rate}
                              onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] font-mono font-semibold focus:outline-none focus:border-[#B89B6A]"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#5A5A58] mb-1">
                              GST %
                            </label>
                            <select
                              value={newItem.gst_rate}
                              onChange={(e) => setNewItem({ ...newItem, gst_rate: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </div>
                        </div>

                        {/* Calculated New Item Cost */}
                        {(() => {
                          const q = Math.max(1, Number(newItem.qty) || 1);
                          const r = Math.max(0, Number(newItem.rate) || 0);
                          const gstP = Number(newItem.gst_rate ?? 18);
                          const itemTax = Math.round(q * r * 100) / 100;
                          const itemG = Math.round((itemTax * gstP) / 100 * 100) / 100;
                          const totalThisItem = Math.round((itemTax + itemG) * 100) / 100;
                          return (
                            <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E3DC] rounded flex justify-between items-center text-xs">
                              <span className="text-[#5A5A58]">
                                Item Taxable: ₹{itemTax.toLocaleString('en-IN')} + GST ({gstP}%): ₹{itemG.toLocaleString('en-IN')}
                              </span>
                              <span className="font-bold text-[#1A1A1A] font-mono">
                                Total Cost: ₹{totalThisItem.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Payment Option: Full or Advance */}
                      {(() => {
                        const q = Math.max(1, Number(newItem.qty) || 1);
                        const r = Math.max(0, Number(newItem.rate) || 0);
                        const gstP = Number(newItem.gst_rate ?? 18);
                        const itemTax = Math.round(q * r * 100) / 100;
                        const itemG = Math.round((itemTax * gstP) / 100 * 100) / 100;
                        const totalThisItem = Math.round((itemTax + itemG) * 100) / 100;
                        const advVal = Number(addItemAdvanceAmount) || 0;
                        const remainingThisItem = Math.max(0, totalThisItem - advVal);

                        return (
                          <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3">
                            <span className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#B89B6A] block border-b border-[#F0EDE8] pb-2">
                              Payment Choice for Added Item
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <label
                                className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${addItemPayType === 'full'
                                    ? 'bg-[#FAF8F5] border-[#B89B6A] shadow-xs'
                                    : 'border-[#E7E3DC] hover:border-[#B89B6A]/50'
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name="add_item_pay_mode"
                                  checked={addItemPayType === 'full'}
                                  onChange={() => setAddItemPayType('full')}
                                  className="mt-0.5 text-[#B89B6A] focus:ring-[#B89B6A]"
                                />
                                <div>
                                  <span className="text-xs font-bold text-[#1A1A1A] block">
                                    Pay Full Amount
                                  </span>
                                  <span className="text-[11px] text-[#5A5A58]">
                                    Pay complete ₹{totalThisItem.toLocaleString('en-IN')} now
                                  </span>
                                </div>
                              </label>

                              <label
                                className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${addItemPayType === 'advance'
                                    ? 'bg-[#FAF8F5] border-[#B89B6A] shadow-xs'
                                    : 'border-[#E7E3DC] hover:border-[#B89B6A]/50'
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name="add_item_pay_mode"
                                  checked={addItemPayType === 'advance'}
                                  onChange={() => setAddItemPayType('advance')}
                                  className="mt-0.5 text-[#B89B6A] focus:ring-[#B89B6A]"
                                />
                                <div>
                                  <span className="text-xs font-bold text-[#1A1A1A] block">
                                    Pay Advance Amount
                                  </span>
                                  <span className="text-[11px] text-[#5A5A58]">
                                    Pay partial advance &amp; remaining later
                                  </span>
                                </div>
                              </label>
                            </div>

                            {/* Advance Input */}
                            {addItemPayType === 'advance' && (
                              <div className="pt-2 p-3 bg-[#FAF8F5] border border-[#D4BE96] rounded-lg space-y-2 animate-in fade-in">
                                <label className="block text-[10px] uppercase tracking-wider text-[#8D7243] font-bold">
                                  Advance Amount to Pay Now (₹ INR) <span className="text-[#B89B6A]">*</span>
                                </label>
                                <div className="relative">
                                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8880]" />
                                  <input
                                    type="number"
                                    min="1"
                                    max={totalThisItem}
                                    step="0.01"
                                    value={addItemAdvanceAmount}
                                    onChange={(e) => setAddItemAdvanceAmount(e.target.value)}
                                    placeholder={`e.g. ${Math.round(totalThisItem / 2)}`}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E7E3DC] rounded font-mono text-sm font-bold text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                                    required
                                  />
                                </div>
                                <div className="flex justify-between items-center text-xs text-[#5A5A58] pt-1">
                                  <span>Total Item: ₹{totalThisItem.toLocaleString('en-IN')}</span>
                                  <span className="font-semibold text-[#8D7243]">
                                    Remaining Balance: ₹{remainingThisItem.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Action submit button */}
                            <Button
                              type="submit"
                              variant="gold"
                              size="md"
                              className="w-full justify-center text-xs font-semibold py-3 mt-2"
                              disabled={addItemSubmitting || totalThisItem < 1 || (addItemPayType === 'advance' && (!advVal || advVal < 1))}
                            >
                              {addItemSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                              ) : null}
                              {addItemPayType === 'advance'
                                ? `Pay Advance & Add Item • ₹${advVal.toLocaleString('en-IN')} (Balance: ₹${remainingThisItem.toLocaleString('en-IN')})`
                                : `Pay & Add Item to Order • ₹${totalThisItem.toLocaleString('en-IN')}`}
                            </Button>
                          </div>
                        );
                      })()}
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: INITIATING ORDER */}
          {step === 'initiating' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <Loader2 className="w-9 h-9 text-[#B89B6A] animate-spin" />
              <div>
                <h3 className="font-serif text-base text-[#1A1A1A] mb-1">
                  Connecting to Cashfree…
                </h3>
                <p className="font-sans text-xs text-[#5A5A58]">
                  Securing order session and preparing payment modal
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: CHECKOUT MODAL ACTIVE */}
          {step === 'checkout' && (
            <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#B89B6A]/15 flex items-center justify-center animate-pulse">
                <CreditCard className="w-6 h-6 text-[#B89B6A]" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#1A1A1A] mb-1">
                  Cashfree Checkout Active
                </h3>
                <p className="font-sans text-xs text-[#5A5A58] max-w-xs mx-auto">
                  Please complete the payment in the Cashfree modal window.
                </p>
              </div>

              {activeOrderId && (
                <div className="bg-white px-3 py-1.5 rounded-md border border-[#E7E3DC] font-mono text-[11px] text-[#5A5A58]">
                  Order: <span className="text-[#1A1A1A] font-semibold">{activeOrderId}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs"
                  icon={ExternalLink}
                  iconPosition="right"
                  onClick={handleRedirectCheckout}
                >
                  Modal not appearing? Click to Redirect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-xs text-[#8E8880]"
                  onClick={() => performServerVerification(activeOrderId)}
                >
                  Completed payment? Verify now
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFYING PAYMENT */}
          {step === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <RefreshCw className="w-9 h-9 text-[#B89B6A] animate-spin" />
              <div>
                <h3 className="font-serif text-base text-[#1A1A1A] mb-1">
                  Verifying Payment with Cashfree…
                </h3>
                <p className="font-sans text-xs text-[#5A5A58] max-w-xs mx-auto">
                  Validating transaction status directly with Cashfree's secure servers
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: PAYMENT SUCCESS */}
          {step === 'success' && receipt && (
            <div className="flex flex-col items-center text-center py-2 gap-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#1A1A1A] mb-1">
                  Payment Verified
                </h3>
                <p className="font-sans text-xs text-[#5A5A58]">
                  Your payment of{' '}
                  <span className="font-semibold text-[#1A1A1A]">
                    ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>{' '}
                  has been verified and credited.
                </p>
              </div>

              {/* Detailed Receipt Card */}
              <div className="w-full bg-white border border-[#E7E3DC] rounded-xl p-4 text-left space-y-2 shadow-sm text-xs">
                <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                  <span className="text-[#8E8880]">Transaction ID:</span>
                  <span className="font-mono font-semibold text-[#1A1A1A]">{receipt.transaction_id}</span>
                </div>
                {receipt.invoice_no && (
                  <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                    <span className="text-[#8E8880]">Invoice / Order No:</span>
                    <span className="font-mono font-semibold text-[#1A1A1A]">{receipt.invoice_no}</span>
                  </div>
                )}
                {receipt.tracking_number && (
                  <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                    <span className="text-[#8E8880]">Tracking Number:</span>
                    <span className="font-mono font-semibold text-[#8D7243] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#D4BE96]">
                      {receipt.tracking_number}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                  <span className="text-[#8E8880]">Customer:</span>
                  <span className="font-semibold text-[#1A1A1A]">{receipt.customer_name}</span>
                </div>
                {receipt.customer_gstin && (
                  <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                    <span className="text-[#8E8880]">Customer GSTIN:</span>
                    <span className="font-mono text-[#1A1A1A]">{receipt.customer_gstin}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                  <span className="text-[#8E8880]">Amount Paid:</span>
                  <span className="font-bold text-[#1A1A1A]">₹{Number(receipt.amount || 0).toLocaleString('en-IN')} INR</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F2EFE9]">
                  <span className="text-[#8E8880]">Status:</span>
                  <span className="text-emerald-700 font-bold uppercase">{receipt.status}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                {isAdmin && (
                  receipt.is_installment || receipt.now_paid_amount ? (
                    <div className="space-y-2 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          variant="gold"
                          size="sm"
                          className="w-full justify-center text-xs font-bold py-2.5 shadow-sm"
                          icon={FileText}
                          iconPosition="left"
                          onClick={() => printPaymentReceipt(receipt, submittedFormRef.current)}
                        >
                          Print {receipt.now_paid_label || 'Installment'} (₹{Number(receipt.amount || receipt.now_paid_amount || 0).toLocaleString('en-IN')})
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-xs font-bold py-2.5 border-[#B89B6A] text-[#1A1A1A] hover:bg-[#FAF8F5]"
                          icon={Printer}
                          iconPosition="left"
                          onClick={() => {
                            const targetReceipt = finalOrderReceiptRef.current || receipt;
                            const targetForm = finalOrderFormRef.current || submittedFormRef.current;
                            printInvoice(targetReceipt, targetForm);
                          }}
                        >
                          Print Final Order Invoice
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-[11px] text-[#8E8880] hover:text-[#1A1A1A]"
                        icon={Printer}
                        iconPosition="left"
                        onClick={() => printProformaInvoice(finalOrderReceiptRef.current || receipt, submittedFormRef.current)}
                      >
                        Print Proforma Invoice
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full justify-center text-xs font-medium"
                        icon={FileText}
                        iconPosition="left"
                        onClick={() => printInvoice(receipt, submittedFormRef.current)}
                      >
                        Print Tax Invoice
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs font-medium"
                        icon={Printer}
                        iconPosition="left"
                        onClick={() => printProformaInvoice(receipt, submittedFormRef.current)}
                      >
                        Print Proforma
                      </Button>
                    </div>
                  )
                )}

                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleClose}
                  className="w-full justify-center text-xs font-semibold py-2.5"
                >
                  Done &bull; Close Window
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: ERROR */}
          {step === 'error' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#1A1A1A] mb-1">
                  Payment Unsuccessful
                </h3>
                <p className="font-sans text-xs text-red-600 max-w-xs mx-auto">
                  {errorMsg || 'Could not verify or process the transaction.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('form')}
                className="mt-2 text-xs"
              >
                Return to Bill Details
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
