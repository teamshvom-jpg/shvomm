import React, { useState } from 'react';
import { X, FileText, Download, Check, Save, Printer, Truck, ExternalLink, Plus, Trash2, Package } from 'lucide-react';
import { formatCurrency, formatDate, formatKeyToLabel } from '../../utils/formatters';
import { getPdfUrl, updateRequestStatus, updateTracking } from '../../utils/api';
import StatusBadge from './StatusBadge';
import Button from '../common/Button';

export default function RequestDetailModal({
  request,
  token,
  onClose,
  onUpdated,
  onGenerateBill
}) {
  const [currentStatus, setCurrentStatus] = useState(request.status || 'New');
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Logistics tracking state
  const [invoiceNo, setInvoiceNo] = useState(request.invoice_no || '');
  const [trackingStatus, setTrackingStatus] = useState(request.tracking_status || 'Order Confirmed');
  const [courierName, setCourierName] = useState(request.courier_name || 'Blue Dart Express');
  const [trackingNumber, setTrackingNumber] = useState(request.tracking_number || '');
  const [trackingUrl, setTrackingUrl] = useState(request.tracking_url || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(request.estimated_delivery || request.delivery_date || '');
  const [trackingNotes, setTrackingNotes] = useState(request.tracking_notes || '');
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  // Per-item tracking
  const initItemTrackings = () => {
    try {
      if (request.item_trackings && request.item_trackings.length > 0) return request.item_trackings;
    } catch (_) {}
    return [];
  };
  const [itemTrackings, setItemTrackings] = useState(initItemTrackings);
  const [usePerItem, setUsePerItem] = useState(initItemTrackings().length > 1);

  // Derive item labels from notes JSON (bill items)
  const getBillItems = () => {
    try {
      const notes = JSON.parse(request.notes || '{}');
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
        tracking_status: trackingStatus || 'Order Confirmed',
        status_step: STEP_MAP[trackingStatus] || 1,
        courier_name: courierName,
        tracking_number: trackingNumber || '',
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

  if (!request) return null;

  const handleSaveTracking = async () => {
    setSavingTracking(true);
    setTrackingSuccess(false);
    try {
      await updateTracking(token, request.id, {
        invoice_no: invoiceNo,
        tracking_status: trackingStatus,
        courier_name: courierName,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        estimated_delivery: estimatedDelivery,
        tracking_notes: trackingNotes,
        item_trackings: usePerItem ? itemTrackings : [],
      });
      setTrackingSuccess(true);
      if (onUpdated) onUpdated();
      setTimeout(() => setTrackingSuccess(false), 2500);
    } catch (err) {
      alert(err.message || 'Failed to update tracking');
    } finally {
      setSavingTracking(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateRequestStatus(token, request.id, currentStatus, adminNotes);
      setSaveSuccess(true);
      if (onUpdated) onUpdated();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert(err.message || 'Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  const pdfUrl = getPdfUrl(request.reference_id || request.id);
  const answers = request.answers || {};

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] border border-[#E7E3DC] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#1A1A1A] text-[#FAF8F5] p-4 sm:p-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="font-mono text-xs sm:text-sm tracking-wider text-[#B89B6A]">
                {request.reference_id}
              </span>
              <StatusBadge status={request.status} />
            </div>
            <h3 className="font-serif text-lg sm:text-2xl font-normal text-[#FAF8F5] mt-1 break-words leading-snug">
              Commission Proposal &bull; {request.client_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-[#FAF8F5]/70 hover:text-white shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-[#E7E3DC]">
              <span className="text-[10px] uppercase tracking-wider text-[#8E8880]">Occasion</span>
              <p className="font-serif text-base text-[#1A1A1A] font-medium capitalize mt-1">
                {request.occasion}
              </p>
            </div>
            <div className="bg-white p-4 border border-[#E7E3DC]">
              <span className="text-[10px] uppercase tracking-wider text-[#8E8880]">Quantity</span>
              <p className="font-serif text-base text-[#1A1A1A] font-medium mt-1">
                {request.quantity} units
              </p>
            </div>
            <div className="bg-white p-4 border border-[#E7E3DC]">
              <span className="text-[10px] uppercase tracking-wider text-[#8E8880]">Destination</span>
              <p className="font-serif text-base text-[#1A1A1A] font-medium mt-1">
                {request.delivery_city}
              </p>
            </div>
            <div className="bg-white p-4 border border-[#E7E3DC]">
              <span className="text-[10px] uppercase tracking-wider text-[#8E8880]">Target Date</span>
              <p className="font-serif text-base text-[#1A1A1A] font-medium mt-1">
                {formatDate(request.delivery_date)}
              </p>
            </div>
          </div>

          {/* Client Contact & Indicative Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 border border-[#E7E3DC] space-y-3">
              <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#B89B6A] font-semibold">
                Client Information
              </h4>
              <div className="text-xs space-y-1.5 text-[#5A5A58]">
                <p><b>Name:</b> {request.client_name}</p>
                <p><b>Email:</b> <a href={`mailto:${request.client_email}`} className="text-[#1A1A1A] underline">{request.client_email}</a></p>
                <p><b>Phone:</b> <a href={`tel:${request.client_phone}`} className="text-[#1A1A1A]">{request.client_phone}</a></p>
                <p><b>Received:</b> {formatDate(request.created_at)}</p>
              </div>
            </div>

            <div className="bg-white p-5 border border-[#E7E3DC] space-y-3">
              <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#B89B6A] font-semibold">
                Investment Analysis
              </h4>
              <div className="text-xs space-y-1.5 text-[#5A5A58]">
                <p><b>Per-Unit Estimate:</b> {formatCurrency(request.estimated_min_unit)} &ndash; {formatCurrency(request.estimated_max_unit)}</p>
                <p><b>Total Commission:</b> <span className="font-bold text-[#1A1A1A]">{formatCurrency(request.estimated_min_total)} &ndash; {formatCurrency(request.estimated_max_total)}</span></p>
                <p><b>Client Indicated Budget:</b> {formatCurrency(request.budget_per_gift)} / unit</p>
              </div>
            </div>
          </div>

          {/* Full Answers & Specifications */}
          <div className="bg-white p-5 border border-[#E7E3DC] space-y-4">
            <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#B89B6A] font-semibold">
              Bespoke Selections Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              {Object.entries(answers).map(([key, val]) => (
                <div key={key} className="py-1 border-b border-[#F2EFE9] flex items-baseline justify-between">
                  <span className="text-[#8E8880]">{formatKeyToLabel(key)}:</span>
                  <span className="font-medium text-[#1A1A1A] text-right ml-2">
                    {Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                  </span>
                </div>
              ))}
            </div>

            {request.special_notes && (
              <div className="mt-4 pt-4 border-t border-[#E7E3DC]">
                <span className="text-[10px] uppercase tracking-wider text-[#8E8880] block mb-1">
                  Patron's Bespoke Notes
                </span>
                <p className="text-xs text-[#1A1A1A] italic bg-[#FAF8F5] p-3 border border-[#E7E3DC]">
                  "{request.special_notes}"
                </p>
              </div>
            )}
          </div>

          {/* Concierge Action Box */}
          <div className="bg-[#FAF8F5] p-5 border border-[#B89B6A]/30 space-y-4">
            <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-semibold">
              Concierge Status &amp; Internal Notes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Status</label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E7E3DC] text-xs font-medium focus:border-[#B89B6A] focus:outline-none"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Quoted">Quoted</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Internal Concierge Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Sent sample box via courier; awaiting monogram approval..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  icon={saveSuccess ? Check : Save}
                  className="w-full sm:w-auto justify-center"
                >
                  {saveSuccess ? 'Changes Saved' : 'Update Commission'}
                </Button>

                {onGenerateBill && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onGenerateBill(request)}
                    icon={Printer}
                    className="w-full sm:w-auto justify-center text-xs"
                  >
                    Generate Bill / Invoice
                  </Button>
                )}
              </div>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-[#B89B6A] font-medium hover:underline p-1"
              >
                <Download className="w-4 h-4" />
                <span>Download Shvom PDF Proposal</span>
              </a>
            </div>
          </div>

          {/* Logistics & Invoice Tracking Section */}
          <div className="bg-white p-5 border border-[#E7E3DC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#B89B6A]" />
                <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-bold">
                  Order Tracking &amp; Invoice Dispatch
                </h4>
              </div>
              <span className="text-[10px] text-[#8E8880] uppercase tracking-wider font-mono">
                Patron-Facing Live Tracker
              </span>
            </div>

            {/* Top fields: always visible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. VAS/26-27/33 or PI-VAS/26-27/01"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-mono focus:border-[#B89B6A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                  Tracking Stage
                </label>
                <select
                  value={trackingStatus}
                  onChange={(e) => setTrackingStatus(e.target.value)}
                  className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-medium focus:border-[#B89B6A] focus:outline-none"
                >
                  <option value="Order Confirmed">1. Order Confirmed</option>
                  <option value="Procuring">2. Procuring</option>
                  <option value="Engraving">3. Engraving</option>
                  <option value="Packing">4. Packing</option>
                  <option value="Shipping">5. Shipping</option>
                  <option value="Delivered">6. Delivered</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                  Est. Delivery Date
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15 November 2026"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
                />
              </div>

              {/* Single-courier fields — hidden when per-item mode */}
              {!usePerItem && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                      Courier / Carrier Partner
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Blue Dart, Delhivery, DTDC"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                      AWB / Consignment Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BD-9820045781"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-mono focus:border-[#B89B6A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                      Direct Tracking URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://bluedart.com/tracking?awb=..."
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Per-item toggle */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={usePerItem}
                  onChange={(e) => {
                    setUsePerItem(e.target.checked);
                    if (e.target.checked && itemTrackings.length === 0) {
                      if (billItems.length > 1) {
                        setItemTrackings(billItems.map((it, idx) => ({
                          item_label: it.description || `Item ${idx + 1}`,
                          tracking_status: trackingStatus || 'Order Confirmed',
                          status_step: STEP_MAP[trackingStatus] || 1,
                          courier_name: courierName,
                          tracking_number: trackingNumber || '',
                          tracking_url: '',
                          tracking_notes: '',
                        })));
                      } else {
                        setItemTrackings([
                          { item_label: 'Item 1', tracking_status: trackingStatus || 'Order Confirmed', status_step: 1, courier_name: courierName, tracking_number: trackingNumber || '', tracking_url: '', tracking_notes: '' },
                          { item_label: 'Item 2', tracking_status: trackingStatus || 'Order Confirmed', status_step: 1, courier_name: courierName, tracking_number: trackingNumber || '', tracking_url: '', tracking_notes: '' },
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
            </div>

            {/* Per-item tracking rows */}
            {usePerItem && (
              <div className="space-y-3 border border-[#E7E3DC] rounded-lg p-3 bg-[#FAFAF8]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#8D7243]">
                    Per-Item Delivery Status &amp; Tracking
                  </span>
                  <button
                    type="button"
                    onClick={addItemTracking}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#B89B6A] hover:text-[#8D7243] border border-[#D4BE96] px-2 py-1 rounded"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                {itemTrackings.length === 0 && (
                  <p className="text-xs text-[#8E8880] text-center py-2">
                    Click "Add Item" to add per-item tracking rows.
                  </p>
                )}

                {itemTrackings.map((it, idx) => (
                  <div key={idx} className="bg-white border border-[#E7E3DC] rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Item label, e.g. "Monogrammed Silk Stole"`}
                        value={it.item_label}
                        onChange={(e) => updateItemTracking(idx, 'item_label', e.target.value)}
                        className="flex-1 p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-semibold focus:border-[#B89B6A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItemTracking(idx)}
                        className="p-1 text-red-400 hover:text-red-600 shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] mb-0.5 font-bold">
                          Delivery Status
                        </label>
                        <select
                          value={it.tracking_status || trackingStatus || 'Order Confirmed'}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItemTracking(idx, 'tracking_status', val);
                            updateItemTracking(idx, 'status_step', STEP_MAP[val] || 1);
                          }}
                          className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-semibold text-[#1A1A1A] focus:border-[#B89B6A] focus:outline-none rounded"
                        >
                          {['Order Confirmed', 'Procuring', 'Engraving', 'Packing', 'Shipping', 'Delivered'].map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] mb-0.5 font-bold">
                          Courier Partner
                        </label>
                        <input
                          type="text"
                          placeholder="Courier Partner"
                          value={it.courier_name}
                          onChange={(e) => updateItemTracking(idx, 'courier_name', e.target.value)}
                          className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-[#8E8880] mb-0.5 font-bold">
                        Consignment / AWB No.
                      </label>
                      <input
                        type="text"
                        placeholder="AWB No. (or same as consignment)"
                        value={it.tracking_number}
                        onChange={(e) => updateItemTracking(idx, 'tracking_number', e.target.value)}
                        className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs font-mono focus:border-[#B89B6A] focus:outline-none rounded"
                      />
                    </div>

                    <input
                      type="url"
                      placeholder="Tracking URL (optional)"
                      value={it.tracking_url}
                      onChange={(e) => updateItemTracking(idx, 'tracking_url', e.target.value)}
                      className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Note visible to client for this item (optional)"
                      value={it.tracking_notes}
                      onChange={(e) => updateItemTracking(idx, 'tracking_notes', e.target.value)}
                      className="w-full p-1.5 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A5A58] mb-1">
                Atelier Tracking Notes (Visible to Client)
              </label>
              <input
                type="text"
                placeholder="e.g. Custom monograms completed; shipment securely packed in satin-lined crates."
                value={trackingNotes}
                onChange={(e) => setTrackingNotes(e.target.value)}
                className="w-full p-2 bg-[#FAF8F5] border border-[#E7E3DC] text-xs focus:border-[#B89B6A] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                size="sm"
                variant="gold"
                onClick={handleSaveTracking}
                loading={savingTracking}
                icon={trackingSuccess ? Check : Save}
                className="text-xs"
              >
                {trackingSuccess ? 'Tracking Updated' : 'Save Tracking Information'}
              </Button>

              {invoiceNo && (
                <span className="text-[11px] text-[#8E8880] font-sans">
                  Patron tracks using: <b className="text-[#1A1A1A] font-mono">{invoiceNo}</b>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
