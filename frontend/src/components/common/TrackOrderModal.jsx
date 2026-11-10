import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  Plus,
  Layers,
} from 'lucide-react';
import { trackOrder } from '../../utils/api';
import Button from './Button';

const TRACKING_STEPS = [
  { step: 1, label: 'Order Confirmed', desc: 'Commission recorded & confirmed' },
  { step: 2, label: 'Procuring', desc: 'Artisan materials & curation in progress' },
  { step: 3, label: 'Engraving', desc: 'Custom engraving, monogramming & wax seals' },
  { step: 4, label: 'Packing', desc: 'Bespoke presentation keepsake packaging & QA' },
  { step: 5, label: 'Shipping', desc: 'Handed to courier partner & in transit' },
  { step: 6, label: 'Delivered', desc: 'Safely arrived at delivery destination' },
];

export default function TrackOrderModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedItemIdx(0);
    try {
      const data = await trackOrder(query);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(
        err.message ||
          `No order or commission found for '${query}'. Please check your invoice number or reference code.`
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setQuery('');
    setResult(null);
    setError(null);
    setSelectedItemIdx(0);
  }

  const trackingNumber = result?.tracking_number || result?.invoice_no || result?.reference_id || query.trim();
  const defaultCourier = result?.courier_name || 'Blue Dart Express';

  const itemsList = useMemo(() => {
    if (!result) return [];
    let list = [];

    if (Array.isArray(result.item_trackings) && result.item_trackings.length > 0) {
      list = result.item_trackings.map((it, idx) => ({
        item_label: it.item_label || `Item ${idx + 1}`,
        quantity: it.quantity || 1,
        tracking_status: it.tracking_status || result.tracking_status || 'Order Confirmed',
        status_step: Number(it.status_step || result.status_step || 1),
        courier_name: it.courier_name || defaultCourier,
        tracking_number: it.tracking_number || trackingNumber,
        tracking_url: it.tracking_url || result.tracking_url,
        tracking_notes: it.tracking_notes || result.tracking_notes,
      }));
    } else if (Array.isArray(result.items) && result.items.length > 0) {
      list = result.items.map((it, idx) => ({
        item_label: it.description || `Item ${idx + 1}`,
        quantity: it.qty || 1,
        tracking_status: result.tracking_status || 'Order Confirmed',
        status_step: Number(result.status_step || 1),
        courier_name: defaultCourier,
        tracking_number: trackingNumber, // Same tracking number for all items
        tracking_url: result.tracking_url,
        tracking_notes: result.tracking_notes,
      }));
    } else {
      list = [
        {
          item_label: result.occasion ? `Item 1: ${result.occasion}` : 'Item 1: Bespoke Return Gifting Curation',
          quantity: result.quantity || 1,
          tracking_status: result.tracking_status || 'Order Confirmed',
          status_step: Number(result.status_step || 1),
          courier_name: defaultCourier,
          tracking_number: trackingNumber,
          tracking_url: result.tracking_url,
          tracking_notes: result.tracking_notes,
        },
      ];
    }

    return list;
  }, [result, trackingNumber, defaultCourier]);

  const currentItem = itemsList[selectedItemIdx] || itemsList[0] || result;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A1A1A]/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-[#FAF8F5] rounded-2xl shadow-2xl overflow-hidden border border-[#E7E3DC] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#1A1A1A] px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B89B6A]/20 flex items-center justify-center border border-[#B89B6A]/30">
              <Truck className="w-4 h-4 text-[#B89B6A]" />
            </div>
            <div>
              <h2 className="font-serif text-base tracking-[0.1em] text-[#FAF8F5]">
                Order &amp; Delivery Tracking
              </h2>
              <p className="font-sans text-[9px] tracking-[0.16em] uppercase text-[#B89B6A]">
                Shvom Enterprises
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#FAF8F5]/60 hover:text-[#FAF8F5] transition-colors rounded-lg hover:bg-white/5"
            aria-label="Close tracking"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label
                htmlFor="track-query"
                className="block font-sans text-[10px] uppercase tracking-[0.18em] text-[#5A5A58] mb-1.5 font-semibold"
              >
                Track by Invoice Number or Reference Code
              </label>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8880]" />
                  <input
                    id="track-query"
                    type="text"
                    required
                    placeholder="e.g. VAS/2026-27/3798, PI-VAS/26-27/01, SHV-2026-0001"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E7E3DC] rounded-lg font-mono text-xs text-[#1A1A1A] placeholder-[#8E8880] focus:outline-none focus:border-[#B89B6A]"
                  />
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  className="px-4 py-2.5 text-xs font-semibold shrink-0"
                  disabled={loading || !query.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
                </Button>
              </div>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Search Result */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Order Meta Header Card */}
              <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EDE8] pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8E8880] block font-sans">
                      Invoice / Tracking Consignment No.
                    </span>
                    <span className="font-mono text-sm font-bold text-[#1A1A1A]">
                      {result.invoice_no || result.reference_id}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#8E8880] block font-sans">
                      Overall Status
                    </span>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FBF5EB] border border-[#D4BE96] text-[#8D7243] font-sans text-xs font-bold uppercase tracking-wider">
                      {result.tracking_status || 'Order Confirmed'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#8E8880] block text-[10px] uppercase">Client:</span>
                    <span className="font-semibold text-[#1A1A1A]">{result.client_name}</span>
                  </div>
                  <div>
                    <span className="text-[#8E8880] block text-[10px] uppercase">Destination:</span>
                    <span className="font-semibold text-[#1A1A1A] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#B89B6A]" />
                      {result.destination || 'Registered Address'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[#8E8880] block text-[10px] uppercase">Est. Delivery:</span>
                    <span className="font-semibold text-[#1A1A1A] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#B89B6A]" />
                      {result.estimated_delivery || 'To be confirmed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Item Shipment Selector (Toggles between items in order) */}
              {itemsList.length > 1 && (
                <div className="bg-white p-3.5 border border-[#E7E3DC] rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#B89B6A]" />
                      <span className="font-sans text-[11px] uppercase tracking-[0.16em] font-bold text-[#1A1A1A]">
                        Shipment Items ({itemsList.length} Items in Consignment)
                      </span>
                    </div>
                  </div>

                  {/* Item Tabs */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {itemsList.map((it, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedItemIdx(idx)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
                          selectedItemIdx === idx
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                            : 'bg-[#FAF8F5] text-[#5A5A58] border-[#E7E3DC] hover:border-[#B89B6A]'
                        }`}
                      >
                        <Package className={`w-3.5 h-3.5 ${selectedItemIdx === idx ? 'text-[#B89B6A]' : 'text-[#8E8880]'}`} />
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                          {it.item_label || `Item ${idx + 1}`}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${
                          selectedItemIdx === idx ? 'bg-white/20 text-[#FAF8F5]' : 'bg-[#E7E3DC] text-[#5A5A58]'
                        }`}>
                          Stage {it.status_step || 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Item Tracking Card */}
              {currentItem && (
                <div className="bg-[#FAF8F5] p-3.5 border border-[#D4BE96] rounded-xl text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#E7E3DC] pb-2">
                    <span className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#B89B6A]" />
                      {currentItem.item_label || `Item ${selectedItemIdx + 1}`}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded bg-white border border-[#D4BE96] text-[#8D7243] font-sans text-[10px] font-bold uppercase tracking-wider">
                      {currentItem.tracking_status || 'Order Confirmed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[#8E8880] text-[10px] uppercase block">Carrier Partner:</span>
                      <b className="text-[#1A1A1A]">{currentItem.courier_name || defaultCourier}</b>
                    </div>
                    <div>
                      <span className="text-[#8E8880] text-[10px] uppercase block">Consignment / Tracking No:</span>
                      <div className="flex items-center gap-1.5">
                        <b className="font-mono text-[#1A1A1A]">{currentItem.tracking_number || trackingNumber}</b>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-sans">
                          Same Tracking No
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentItem.tracking_notes && (
                    <p className="text-[11px] text-[#5A5A58] italic pt-1 border-t border-[#E7E3DC] mt-1">
                      &ldquo;{currentItem.tracking_notes}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* Progress Stepper for Selected Item */}
              <div className="bg-white p-5 border border-[#E7E3DC] rounded-xl space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] uppercase tracking-[0.16em] font-bold text-[#1A1A1A]">
                      {currentItem?.item_label || `Item ${selectedItemIdx + 1}`} &bull; Delivery Progress
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-[#B89B6A]">
                      Stage {Math.min(6, Math.max(1, currentItem?.status_step || 1))} of 6 &bull; {Math.round((Math.min(6, Math.max(1, currentItem?.status_step || 1)) / 6) * 100)}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#E7E3DC] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#B89B6A] h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${(Math.min(6, Math.max(1, currentItem?.status_step || 1)) / 6) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#E7E3DC] before:z-0">
                  {TRACKING_STEPS.map((st) => {
                    const stepVal = Number(currentItem?.status_step || 1);
                    const isCompleted = stepVal >= st.step;
                    const isCurrent = stepVal === st.step;

                    return (
                      <div key={st.step} className="flex items-start gap-3 relative z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                            isCompleted
                              ? 'bg-[#1A1A1A] text-white'
                              : 'bg-white border-2 border-[#D3CEC4] text-[#8E8880]'
                          } ${isCurrent ? 'ring-4 ring-[#B89B6A]/30' : ''}`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-[#B89B6A]" />
                          ) : (
                            st.step
                          )}
                        </div>

                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-semibold ${
                                isCurrent
                                  ? 'text-[#B89B6A] font-bold'
                                  : isCompleted
                                  ? 'text-[#1A1A1A]'
                                  : 'text-[#8E8880]'
                              }`}
                            >
                              {st.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] uppercase tracking-wider text-[#B89B6A] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#D4BE96]">
                                Current Stage
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#5A5A58] mt-0.5">{st.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items in this Consignment Breakdown */}
              {itemsList.length > 1 && (
                <div className="bg-white p-4 border border-[#E7E3DC] rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
                    <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-[#8D7243] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#B89B6A]" />
                      Items in Consignment ({itemsList.length} Items with Tracking: {trackingNumber})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {itemsList.map((it, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedItemIdx(idx)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                          selectedItemIdx === idx
                            ? 'bg-[#FAF8F5] border-[#B89B6A]'
                            : 'bg-white border-[#E7E3DC] hover:border-[#D4BE96]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <b className="text-xs text-[#1A1A1A] truncate">{it.item_label || `Item ${idx + 1}`}</b>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#FAF8F5] border border-[#E7E3DC] text-[#8E8880]">
                              AWB: {it.tracking_number || trackingNumber}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8E8880] block mt-0.5">
                            Courier: {it.courier_name || defaultCourier} &bull; Stage {it.status_step || 1} of 6
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-[#FBF5EB] border border-[#D4BE96] text-[#8D7243] shrink-0">
                          {it.tracking_status || 'Order Confirmed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Tracking link if URL available */}
              {(currentItem?.tracking_url || result.tracking_url) && (
                <div className="pt-1">
                  <a
                    href={currentItem?.tracking_url || result.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#B89B6A] hover:underline font-semibold"
                  >
                    Track on {currentItem?.courier_name || defaultCourier} Official Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  Track Another Order
                </Button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
