import React, { useState, useEffect } from 'react';
import {
  Lock,
  Search,
  Filter,
  Download,
  Eye,
  LogOut,
  RefreshCw,
  Building,
  Heart,
  TrendingUp,
  Inbox,
  FileCheck,
  Printer,
  Truck,
  CreditCard,
  IndianRupee,
  FileText,
  CheckCircle,
  Clock,
  ExternalLink,
  X,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import {
  adminLogin,
  fetchAdminRequests,
  fetchAdminStats,
  fetchAdminPayments,
  updatePaymentTracking,
  getPdfUrl,
} from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BRAND } from '../config/brand';
import { printInvoice, printProformaInvoice } from '../utils/invoice';
import StatusBadge from '../components/admin/StatusBadge';
import RequestDetailModal from '../components/admin/RequestDetailModal';
import PaymentModal from '../components/common/PaymentModal';
import Button from '../components/common/Button';
import SeoHead from '../components/common/SeoHead';

const ADMIN_TOKEN_KEY = 'shvom_admin_token';
const ADMIN_USER_KEY = 'shvom_admin_user';

function prepareInvoiceData(item) {
  let parsedNotes = {};
  try {
    if (item.notes && item.notes.startsWith('{')) {
      parsedNotes = JSON.parse(item.notes);
    }
  } catch (e) {
    parsedNotes = {};
  }

  const items = parsedNotes.items || [
    {
      description: item.purpose || 'Bespoke Atelier Commission & Curation',
      hsn: '997212',
      qty: 1,
      unit: 'PCS',
      rate: Math.round(item.amount / 1.18),
      gst_rate: 18,
    },
  ];

  const receipt = {
    transaction_id: item.transaction_id,
    order_id: item.order_id,
    invoice_no: item.invoice_no || item.transaction_id,
    amount: item.amount,
    currency: item.currency || 'INR',
    customer_name: item.customer_name,
    customer_email: item.customer_email,
    customer_phone: item.customer_phone,
    customer_gstin: parsedNotes.customer_gstin || '',
    customer_address: parsedNotes.customer_address || '',
    place_of_supply: parsedNotes.place_of_supply || 'Telangana',
    reference_code: item.reference_code,
    purpose: item.purpose,
    payment_method: item.payment_method,
    status: item.status,
    invoice_date: item.invoice_date || parsedNotes.invoice_date || '',
    created_at: item.created_at,
  };

  const formData = {
    customer_name: item.customer_name,
    customer_email: item.customer_email,
    customer_phone: item.customer_phone,
    customer_gstin: parsedNotes.customer_gstin || '',
    customer_address: parsedNotes.customer_address || '',
    place_of_supply: parsedNotes.place_of_supply || 'Telangana',
    reference_code: item.reference_code,
    invoice_no: item.invoice_no || item.transaction_id,
    invoice_date: item.invoice_date || parsedNotes.invoice_date || '',
    invoice_number: item.invoice_no,
    notes: parsedNotes.notes || item.notes || '',
    items: items,
  };

  return { receipt, formData };
}

function PaymentTrackingModal({ payment, token, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    invoice_no: payment.invoice_no || '',
    tracking_status: payment.tracking_status || 'Order Confirmed',
    courier_name: payment.courier_name || 'Blue Dart Express',
    tracking_number: payment.tracking_number || '',
    tracking_url: payment.tracking_url || '',
    estimated_delivery: payment.estimated_delivery || '',
    tracking_notes: payment.tracking_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Per-item tracking
  const initItemTrackings = () => {
    try {
      if (payment.item_trackings && payment.item_trackings.length > 0) return payment.item_trackings;
    } catch (_) {}
    return [];
  };
  const [itemTrackings, setItemTrackings] = useState(initItemTrackings);
  const [usePerItem, setUsePerItem] = useState(initItemTrackings().length > 1);

  // Derive bill items from payment notes JSON
  const getBillItems = () => {
    try {
      const notes = JSON.parse(payment.notes || '{}');
      if (Array.isArray(notes.items) && notes.items.length > 1) return notes.items;
    } catch (_) {}
    return [];
  };
  const billItems = getBillItems();

  const STEP_MAP = {
    'Order Confirmed': 1,
    'Procuring': 2,
    'Engraving': 3,
    'Packing': 4,
    'Shipping': 5,
    'Delivered': 6,
  };

  function addItemTracking() {
    setItemTrackings(prev => [
      ...prev,
      {
        item_label: `Item ${prev.length + 1}`,
        tracking_status: formData.tracking_status || 'Order Confirmed',
        status_step: STEP_MAP[formData.tracking_status] || 1,
        courier_name: formData.courier_name,
        tracking_number: formData.tracking_number || '',
        tracking_url: '',
        tracking_notes: ''
      }
    ]);
  }
  function removeItemTracking(idx) {
    setItemTrackings(prev => prev.filter((_, i) => i !== idx));
  }
  function updateItemTracking(idx, field, value) {
    setItemTrackings(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  const trackingSteps = [
    'Order Confirmed',
    'Procuring',
    'Engraving',
    'Packing',
    'Shipping',
    'Delivered',
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updatePaymentTracking(token, payment.id, {
        ...formData,
        item_trackings: usePerItem ? itemTrackings : [],
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update tracking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-[#E7E3DC] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl rounded-sm">
        <div className="flex items-center justify-between border-b border-[#E7E3DC] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#B89B6A] font-semibold">
              Logistics &amp; Fulfillment
            </span>
            <h3 className="font-serif text-xl text-[#1A1A1A]">
              Update Order Tracking
            </h3>
            <p className="text-xs text-[#8E8880] mt-0.5 font-mono">
              Order: {payment.invoice_no || payment.transaction_id} &bull; {payment.customer_name}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E8880] hover:text-[#1A1A1A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
              Invoice Number
            </label>
            <input
              type="text"
              value={formData.invoice_no}
              onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
              placeholder="e.g. VAS/2026-27/0014"
              className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
              Tracking Stage
            </label>
            <select
              value={formData.tracking_status}
              onChange={(e) => setFormData({ ...formData, tracking_status: e.target.value })}
              className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A]"
            >
              {trackingSteps.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {!usePerItem && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                  Courier Partner
                </label>
                <input
                  type="text"
                  value={formData.courier_name}
                  onChange={(e) => setFormData({ ...formData, courier_name: e.target.value })}
                  placeholder="Blue Dart, DTDC, Delhivery"
                  className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                  Tracking Number / AWB
                </label>
                <input
                  type="text"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="e.g. BLU987654321"
                  className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A] font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!usePerItem && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                  Tracking URL
                </label>
                <input
                  type="url"
                  value={formData.tracking_url}
                  onChange={(e) => setFormData({ ...formData, tracking_url: e.target.value })}
                  placeholder="https://track..."
                  className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A]"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
                Estimated Delivery
              </label>
              <input
                type="text"
                value={formData.estimated_delivery}
                onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                placeholder="e.g. 15 Nov 2026"
                className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={usePerItem}
              onChange={(e) => {
                setUsePerItem(e.target.checked);
                if (e.target.checked && itemTrackings.length === 0) {
                  if (billItems.length > 1) {
                    setItemTrackings(billItems.map((it, idx) => ({
                      item_label: it.description || `Item ${idx + 1}`,
                      tracking_status: formData.tracking_status || 'Order Confirmed',
                      status_step: STEP_MAP[formData.tracking_status] || 1,
                      courier_name: formData.courier_name,
                      tracking_number: formData.tracking_number || '',
                      tracking_url: '',
                      tracking_notes: '',
                    })));
                  } else {
                    setItemTrackings([
                      { item_label: 'Item 1', tracking_status: formData.tracking_status || 'Order Confirmed', status_step: 1, courier_name: formData.courier_name, tracking_number: formData.tracking_number || '', tracking_url: '', tracking_notes: '' },
                      { item_label: 'Item 2', tracking_status: formData.tracking_status || 'Order Confirmed', status_step: 1, courier_name: formData.courier_name, tracking_number: formData.tracking_number || '', tracking_url: '', tracking_notes: '' },
                    ]);
                  }
                }
              }}
              className="w-4 h-4 accent-[#B89B6A]"
            />
            <span className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#B89B6A]" />
              Multiple items with individual delivery tracking &amp; status
            </span>
          </label>

          {usePerItem && (
            <div className="space-y-3 border border-[#E7E3DC] rounded-lg p-3 bg-[#FAFAF8]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#8D7243]">Per-Item Delivery Status &amp; Tracking</span>
                <button type="button" onClick={addItemTracking} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#B89B6A] hover:text-[#8D7243] border border-[#D4BE96] px-2 py-1 rounded">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              {itemTrackings.length === 0 && (
                <p className="text-xs text-[#8E8880] text-center py-1">Click "Add Item" to add rows.</p>
              )}
              {itemTrackings.map((it, idx) => (
                <div key={idx} className="bg-white border border-[#E7E3DC] rounded p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Item label" value={it.item_label} onChange={(e) => updateItemTracking(idx, 'item_label', e.target.value)} className="flex-1 p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-semibold focus:border-[#B89B6A] focus:outline-none" />
                    <button type="button" onClick={() => removeItemTracking(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] mb-0.5 font-bold">
                        Delivery Status
                      </label>
                      <select
                        value={it.tracking_status || formData.tracking_status || 'Order Confirmed'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateItemTracking(idx, 'tracking_status', val);
                          updateItemTracking(idx, 'status_step', STEP_MAP[val] || 1);
                        }}
                        className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-semibold text-[#1A1A1A] focus:border-[#B89B6A] focus:outline-none rounded"
                      >
                        {trackingSteps.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] mb-0.5 font-bold">
                        Carrier Partner
                      </label>
                      <input type="text" placeholder="Courier Partner" value={it.courier_name} onChange={(e) => updateItemTracking(idx, 'courier_name', e.target.value)} className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none rounded" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] mb-0.5 font-bold">
                      Consignment / AWB No.
                    </label>
                    <input type="text" placeholder="AWB No. (or same as consignment)" value={it.tracking_number} onChange={(e) => updateItemTracking(idx, 'tracking_number', e.target.value)} className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-mono focus:border-[#B89B6A] focus:outline-none rounded" />
                  </div>

                  <input type="url" placeholder="Tracking URL (optional)" value={it.tracking_url} onChange={(e) => updateItemTracking(idx, 'tracking_url', e.target.value)} className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none" />
                  <input type="text" placeholder="Client note for this item (optional)" value={it.tracking_notes} onChange={(e) => updateItemTracking(idx, 'tracking_notes', e.target.value)} className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none" />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8E8880] mb-1 font-semibold">
              Dispatch &amp; Logistics Notes
            </label>
            <textarea
              rows={2}
              value={formData.tracking_notes}
              onChange={(e) => setFormData({ ...formData, tracking_notes: e.target.value })}
              placeholder="e.g. Handcrafted curation packaged with tamper-evident seal."
              className="w-full px-3 py-2 border border-[#E7E3DC] bg-[#FAF8F5] focus:outline-none focus:border-[#B89B6A]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E3DC]">
            <Button size="sm" variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="gold" type="submit" loading={saving} icon={Truck}>
              Save Logistics Update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [adminUser, setAdminUser] = useState(() => localStorage.getItem(ADMIN_USER_KEY));

  // Login form state
  const [loginUsername, setLoginUsername] = useState('concierge');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Tab: 'payments' | 'commissions'
  const [activeTab, setActiveTab] = useState('payments');

  // Dashboard requests & stats state
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters for Commissions
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for Payments
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedPaymentForTracking, setSelectedPaymentForTracking] = useState(null);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billInitialData, setBillInitialData] = useState(null);

  const commissionStatuses = ['All', 'New', 'Contacted', 'Quoted', 'Confirmed', 'Closed'];
  const paymentStatuses = ['All', 'PAID', 'PENDING', 'BILLED', 'Completed'];

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await adminLogin(loginUsername, loginPassword);
      setToken(data.access_token);
      setAdminUser(data.full_name);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
      localStorage.setItem(ADMIN_USER_KEY, data.full_name);
    } catch (err) {
      setLoginError(err.message || 'Incorrect credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setAdminUser(null);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  };

  // Load Data
  const loadDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [reqData, statsData, payData] = await Promise.all([
        fetchAdminRequests(token, { status: statusFilter, search: searchQuery }),
        fetchAdminStats(token),
        fetchAdminPayments(token, { status: paymentStatusFilter, search: paymentSearchQuery }),
      ]);
      setRequests(reqData.items || []);
      setStats(statsData);
      setPayments(payData.items || []);
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('credentials')) {
        handleLogout();
      } else {
        setError(err.message || 'Failed to load atelier records');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token, statusFilter, paymentStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadDashboardData();
  };

  // If unauthenticated, render login portal
  if (!token) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-[#FAF8F5]">
        <SeoHead title="Concierge Portal Login | Shvom" />

        <div className="bg-white border border-[#E7E3DC] p-8 sm:p-12 max-w-md w-full shadow-elevated space-y-8">
          <div className="text-center space-y-2">
            <span className="font-serif text-3xl tracking-[0.24em] text-[#1A1A1A]">
              {BRAND.name.toUpperCase()}
            </span>
            <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#B89B6A] font-semibold">
              Concierge Atelier Management
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Username
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm focus:border-[#B89B6A] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Passphrase
              </label>
              <input
                type="password"
                required
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm focus:border-[#B89B6A] focus:outline-none"
              />
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E7E3DC] text-[11px] text-[#8E8880] space-y-1">
              <p className="font-medium text-[#1A1A1A]">Default Atelier Demo Login:</p>
              <p>Username: <code className="text-[#1A1A1A]">concierge</code></p>
              <p>Passphrase: <code className="text-[#1A1A1A]">ShvomAtelier2026!</code></p>
            </div>

            <Button
              type="submit"
              size="lg"
              variant="primary"
              loading={loginLoading}
              className="w-full"
              icon={Lock}
            >
              Access Concierge Portal
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Concierge Atelier Management | Shvom" />

      <div className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-screen space-y-8">
        {/* Top Bar: Title & User Logout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E7E3DC]">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B89B6A] font-medium">
              <span>{BRAND.name} Atelier Operations</span>
              <span>&bull;</span>
              <span>Confidential</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1A1A1A] mt-1">
              Atelier Management Portal
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              variant="gold"
              onClick={() => {
                setBillInitialData(null);
                setBillModalOpen(true);
              }}
              icon={Printer}
            >
              Generate Bill
            </Button>
            <span className="text-xs text-[#5A5A58]">
              Signed in as <b className="text-[#1A1A1A]">{adminUser || 'Head Concierge'}</b>
            </span>
            <Button size="sm" variant="outline" onClick={handleLogout} icon={LogOut}>
              Exit Portal
            </Button>
          </div>
        </div>

        {/* Stats Strip â€” showing zeroed commissions and all actual/test payments & revenue */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 border border-[#E7E3DC] space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8E8880] flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5 text-[#B89B6A]" />
              <span>Total Commissions</span>
            </span>
            <p className="font-serif text-3xl font-normal text-[#1A1A1A]">
              {stats ? stats.total_requests : 0}
            </p>
          </div>

          <div className="bg-white p-5 border border-[#E7E3DC] space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#B89B6A] flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-[#B89B6A]" />
              <span>Total Payments &amp; Bills</span>
            </span>
            <p className="font-serif text-3xl font-normal text-[#1A1A1A]">
              {stats ? (stats.total_payments !== undefined ? stats.total_payments : payments.length) : payments.length}
            </p>
          </div>

          <div className="bg-white p-5 border border-[#E7E3DC] space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8E8880] flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
              <span>Total Revenue Received</span>
            </span>
            <p className="font-serif text-2xl sm:text-3xl font-normal text-emerald-800">
              {stats ? formatCurrency(stats.total_revenue || 0) : 'â‚¹0'}
            </p>
          </div>

          <div className="bg-white p-5 border border-[#E7E3DC] space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8E8880] flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
              <span>Paid / Verified Transactions</span>
            </span>
            <p className="font-serif text-3xl font-normal text-[#1A1A1A]">
              {stats ? (stats.paid_payments !== undefined ? stats.paid_payments : 0) : 0}
            </p>
          </div>
        </div>

        {/* View Switcher: Payments & Billing Registry vs Commissions & Inquiries */}
        <div className="flex border-b border-[#E7E3DC] gap-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-xs uppercase tracking-[0.18em] font-medium transition-all relative flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'text-[#1A1A1A] font-semibold border-b-2 border-[#B89B6A]'
                : 'text-[#8E8880] hover:text-[#1A1A1A]'
            }`}
          >
            <CreditCard className="w-4 h-4 text-[#B89B6A]" />
            <span>Payments &amp; Billing Registry</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#B89B6A]/15 text-[#B89B6A] font-mono">
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`pb-3 text-xs uppercase tracking-[0.18em] font-medium transition-all relative flex items-center gap-2 ${
              activeTab === 'commissions'
                ? 'text-[#1A1A1A] font-semibold border-b-2 border-[#B89B6A]'
                : 'text-[#8E8880] hover:text-[#1A1A1A]'
            }`}
          >
            <Inbox className="w-4 h-4 text-[#B89B6A]" />
            <span>Commissions &amp; Inquiries</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 text-[#5A5A58] font-mono">
              {requests.length}
            </span>
          </button>
        </div>

        {/* ================= TAB 1: PAYMENTS & BILLING REGISTRY ================= */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Filter and Search Bar for Payments */}
            <div className="bg-white p-6 border border-[#E7E3DC] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 flex-wrap">
                  {paymentStatuses.map((st) => (
                    <button
                      key={st}
                      onClick={() => setPaymentStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-sans uppercase tracking-[0.14em] transition-colors border ${
                        paymentStatusFilter === st
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-[#FAF8F5] text-[#5A5A58] border-[#E7E3DC] hover:border-[#1A1A1A]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSearchSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 text-[#8E8880] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search invoice, customer, order..."
                      value={paymentSearchQuery}
                      onChange={(e) => setPaymentSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none w-full sm:w-64"
                    />
                  </div>
                  <Button size="sm" variant="outline" type="submit">
                    Search
                  </Button>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="p-2 border border-[#E7E3DC] hover:border-[#1A1A1A] text-[#5A5A58]"
                    title="Refresh Registry"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </form>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white border border-[#E7E3DC] overflow-hidden shadow-subtle rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1A1A1A] min-w-[1360px]">
                  <thead className="bg-[#FAF8F5] border-b border-[#E7E3DC] font-sans text-[10px] uppercase tracking-[0.18em] text-[#8E8880]">
                    <tr>
                      <th className="py-4 px-5 min-w-[160px]">Invoice / Txn ID</th>
                      <th className="py-4 px-5 min-w-[180px]">Client / Entity</th>
                      <th className="py-4 px-5 min-w-[200px]">Purpose / Items</th>
                      <th className="py-4 px-5 min-w-[110px] whitespace-nowrap">Amount</th>
                      <th className="py-4 px-5 min-w-[150px]">Source / Method</th>
                      <th className="py-4 px-5 min-w-[140px] whitespace-nowrap">Payment Status</th>
                      <th className="py-4 px-5 min-w-[180px]">Logistics Tracking</th>
                      <th className="py-4 px-5 text-right sticky right-0 bg-[#FAF8F5] border-l border-[#E7E3DC]/80 shadow-[-6px_0_12px_rgba(0,0,0,0.04)] z-10 whitespace-nowrap min-w-[220px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3DC]">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-xs text-[#8E8880]">
                          Loading atelier payment registry...
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-xs text-[#8E8880]">
                          No payment records found. Use "Generate Bill" to create a recorded bill or perform a test payment.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => {
                        const isPaid = ['PAID', 'Completed', 'SUCCESS', 'BILLED'].includes(p.status);
                        return (
                          <tr key={p.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-4 px-5 min-w-[160px]">
                              <div className="font-mono font-semibold text-[#1A1A1A]">
                                {p.invoice_no || p.transaction_id}
                              </div>
                              {p.order_id && (
                                <div className="text-[10px] font-mono text-[#8E8880]">
                                  {p.order_id}
                                </div>
                              )}
                              <div className="text-[10px] text-[#8E8880]">
                                {formatDate(p.created_at)}
                              </div>
                            </td>

                            <td className="py-4 px-5 min-w-[180px]">
                              <div className="font-medium text-[#1A1A1A]">{p.customer_name}</div>
                              <div className="text-[11px] text-[#8E8880]">{p.customer_email}</div>
                              {p.customer_phone && (
                                <div className="text-[10px] text-[#8E8880]">{p.customer_phone}</div>
                              )}
                            </td>

                            <td className="py-4 px-5 min-w-[200px] max-w-xs">
                              <div className="truncate text-[#5A5A58]" title={p.purpose}>
                                {p.purpose}
                              </div>
                              {p.reference_code && (
                                <div className="text-[10px] font-mono text-[#B89B6A]">
                                  Ref: {p.reference_code}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-5 min-w-[110px] whitespace-nowrap">
                              <span className="font-serif font-bold text-sm text-[#1A1A1A]">
                                {formatCurrency(p.amount)}
                              </span>
                            </td>

                            <td className="py-4 px-5 min-w-[150px]">
                              <span className="text-[11px] text-[#5A5A58]">
                                {p.payment_method || 'Cashfree PG'}
                              </span>
                            </td>

                            <td className="py-4 px-5 min-w-[140px] whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border whitespace-nowrap ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : p.status === 'PARTIAL'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : p.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                                {p.status}
                              </span>
                            </td>

                            <td className="py-4 px-5 min-w-[180px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#B89B6A]" />
                                <span className="text-[11px] font-medium text-[#1A1A1A]">
                                  {p.tracking_status || 'Order Confirmed'}
                                </span>
                              </div>
                              {p.courier_name && (
                                <div className="text-[10px] text-[#8E8880]">
                                  {p.courier_name} {p.tracking_number ? `(${p.tracking_number})` : ''}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-5 text-right space-x-1.5 sticky right-0 bg-white border-l border-[#E7E3DC]/80 shadow-[-6px_0_12px_rgba(0,0,0,0.04)] z-10 whitespace-nowrap min-w-[220px]">
                              <button
                                onClick={() => {
                                  const { receipt, formData } = prepareInvoiceData(p);
                                  printInvoice(receipt, formData);
                                }}
                                className="px-2.5 py-1 text-[11px] border border-[#E7E3DC] hover:border-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors rounded inline-flex items-center gap-1 text-[#1A1A1A] font-medium"
                                title="Print Tax Invoice"
                              >
                                <Printer className="w-3 h-3 text-[#B89B6A]" />
                                <span>Tax Invoice</span>
                              </button>

                              <button
                                onClick={() => {
                                  const { receipt, formData } = prepareInvoiceData(p);
                                  printProformaInvoice(receipt, formData);
                                }}
                                className="px-2.5 py-1 text-[11px] border border-[#E7E3DC] hover:border-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors rounded inline-flex items-center gap-1 text-[#5A5A58] font-medium"
                                title="Print Proforma Invoice"
                              >
                                <FileText className="w-3 h-3 text-[#B89B6A]" />
                                <span>Proforma</span>
                              </button>

                              <button
                                onClick={() => setSelectedPaymentForTracking(p)}
                                className="p-1.5 text-[#5A5A58] hover:text-[#B89B6A] hover:bg-[#FAF8F5] border border-[#E7E3DC] hover:border-[#B89B6A] rounded transition-colors inline-flex items-center"
                                title="Update Tracking & Logistics"
                              >
                                <Truck className="w-3.5 h-3.5 text-[#B89B6A]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: COMMISSIONS & INQUIRIES ================= */}
        {activeTab === 'commissions' && (
          <div className="space-y-4">
            {/* Filters and Search Bar for Commissions */}
            <div className="bg-white p-6 border border-[#E7E3DC] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 flex-wrap">
                  {commissionStatuses.map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-sans uppercase tracking-[0.14em] transition-colors border ${
                        statusFilter === st
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-[#FAF8F5] text-[#5A5A58] border-[#E7E3DC] hover:border-[#1A1A1A]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSearchSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 text-[#8E8880] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ref, patron, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none w-full sm:w-64"
                    />
                  </div>
                  <Button size="sm" variant="outline" type="submit">
                    Search
                  </Button>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="p-2 border border-[#E7E3DC] hover:border-[#1A1A1A] text-[#5A5A58]"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </form>
              </div>
            </div>

            {/* Commissions Table */}
            <div className="bg-white border border-[#E7E3DC] overflow-hidden shadow-subtle rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1A1A1A] min-w-[1200px]">
                  <thead className="bg-[#FAF8F5] border-b border-[#E7E3DC] font-sans text-[10px] uppercase tracking-[0.18em] text-[#8E8880]">
                    <tr>
                      <th className="py-4 px-5 min-w-[140px]">Ref ID</th>
                      <th className="py-4 px-5 min-w-[180px]">Client / Entity</th>
                      <th className="py-4 px-5 min-w-[150px]">Occasion</th>
                      <th className="py-4 px-5 min-w-[80px]">Qty</th>
                      <th className="py-4 px-5 min-w-[140px] whitespace-nowrap">Estimated Range</th>
                      <th className="py-4 px-5 min-w-[160px]">Destination &amp; Date</th>
                      <th className="py-4 px-5 min-w-[140px] whitespace-nowrap">Status</th>
                      <th className="py-4 px-5 text-right sticky right-0 bg-[#FAF8F5] border-l border-[#E7E3DC]/80 shadow-[-6px_0_12px_rgba(0,0,0,0.04)] z-10 whitespace-nowrap min-w-[160px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3DC]">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-xs text-[#8E8880]">
                          Loading atelier commissions...
                        </td>
                      </tr>
                    ) : requests.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-xs text-[#8E8880]">
                          No commission requests found. New submissions will appear here automatically.
                        </td>
                      </tr>
                    ) : (
                      requests.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedRequest(item)}
                        >
                          <td className="py-4 px-6 font-mono font-medium text-[#1A1A1A]">
                            {item.reference_id}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-[#1A1A1A]">{item.client_name}</div>
                            <div className="text-[11px] text-[#8E8880]">{item.client_email}</div>
                          </td>
                          <td className="py-4 px-6 capitalize">
                            <span className="flex items-center gap-1.5">
                              {item.occasion === 'wedding' ? (
                                <Heart className="w-3.5 h-3.5 text-[#B89B6A]" />
                              ) : (
                                <Building className="w-3.5 h-3.5 text-[#B89B6A]" />
                              )}
                              <span>{item.occasion}</span>
                            </span>
                          </td>
                          <td className="py-4 px-6">{item.quantity} pcs</td>
                          <td className="py-4 px-6 font-medium">
                            {formatCurrency(item.estimated_min_total)} &ndash;{' '}
                            {formatCurrency(item.estimated_max_total)}
                          </td>
                          <td className="py-4 px-6">
                            <div>{item.delivery_city}</div>
                            <div className="text-[11px] text-[#8E8880]">{formatDate(item.delivery_date)}</div>
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={item.status} />
                          </td>
                          <td
                            className="py-3.5 px-5 text-right space-x-2 sticky right-0 bg-white border-l border-[#E7E3DC]/80 shadow-[-6px_0_12px_rgba(0,0,0,0.04)] z-10 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setBillInitialData(item);
                                setBillModalOpen(true);
                              }}
                              className="p-1.5 hover:text-[#B89B6A] transition-colors"
                              title="Generate Bill for Commission"
                            >
                              <Printer className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => setSelectedRequest(item)}
                              className="p-1.5 hover:text-[#B89B6A] transition-colors"
                              title="Update Tracking & Logistics"
                            >
                              <Truck className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => setSelectedRequest(item)}
                              className="p-1.5 hover:text-[#B89B6A] transition-colors"
                              title="Inspect Specifications"
                            >
                              <Eye className="w-4 h-4 inline" />
                            </button>
                            <a
                              href={getPdfUrl(item.reference_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:text-[#B89B6A] transition-colors"
                              title="Download PDF Proposal"
                            >
                              <Download className="w-4 h-4 inline" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Details and Status updates */}
        {selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            token={token}
            onClose={() => setSelectedRequest(null)}
            onUpdated={() => {
              loadDashboardData();
            }}
            onGenerateBill={(req) => {
              setSelectedRequest(null);
              setBillInitialData(req);
              setBillModalOpen(true);
            }}
          />
        )}

        {/* Modal for Updating Payment Tracking */}
        {selectedPaymentForTracking && (
          <PaymentTrackingModal
            payment={selectedPaymentForTracking}
            token={token}
            onClose={() => setSelectedPaymentForTracking(null)}
            onUpdated={() => {
              loadDashboardData();
            }}
          />
        )}

        {/* Bill Generator Modal â€” with NO Pay button in admin mode; saves bill to DB and updates registry */}
        {billModalOpen && (
          <PaymentModal
            isOpen={billModalOpen}
            onClose={() => {
              setBillModalOpen(false);
              setBillInitialData(null);
            }}
            initialData={billInitialData}
            isAdmin={true}
            token={token}
            onBillCreated={() => {
              loadDashboardData();
            }}
          />
        )}
      </div>
    </>
  );
}
