import React, { useState, useEffect } from 'react';
import { Mail, Phone, Check, AlertCircle, ArrowUpRight } from 'lucide-react';
import Section from '../components/common/Section';
import Button from '../components/common/Button';
import SeoHead from '../components/common/SeoHead';
import { BRAND } from '../config/brand';
import { bookConsultation } from '../utils/api';
import { useRealm } from '../context/RealmContext';

export default function Contact() {
  const { isWedding } = useRealm();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    inquiry_type: isWedding ? 'Wedding' : 'Corporate',
    preferred_date: '',
    preferred_time_slot: 'Morning (11:00 AM - 1:00 PM)',
    notes: ''
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      inquiry_type: isWedding ? 'Wedding' : 'Corporate'
    }));
  }, [isWedding]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await bookConsultation(formData);
      setSuccess(true);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        inquiry_type: 'Wedding',
        preferred_date: '',
        preferred_time_slot: 'Morning (11:00 AM - 1:00 PM)',
        notes: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Private Consultation & Atelier Appointments | Shvom"
        description="Book a private consultation with the Shvom atelier concierge for corporate milestones or couture wedding gifting."
      />

      {/* Header */}
      <section className="pt-32 pb-16 bg-[#FAF8F5] border-b border-[#E7E3DC] px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Get In Touch
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-[#1A1A1A] leading-tight">
            Schedule a Consultation
          </h1>
          <p className="font-sans text-sm sm:text-base text-[#5A5A58] font-light max-w-xl mx-auto leading-relaxed">
            Meet with our gifting team via private consultation or video call to view curation decks, physical sample archives, and design your bespoke suite.
          </p>
        </div>
      </section>

      {/* Two Column: Direct Contact & Booking Form */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left: Contact Channels */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#B89B6A] font-semibold">
                Direct Contact
              </span>
              <h2 className="font-serif text-3xl font-normal text-[#1A1A1A]">
                We value swift, discreet communication.
              </h2>
              <p className="font-sans text-sm text-[#5A5A58] leading-relaxed font-light">
                For commission timelines, formal RFP briefs, or client support, you may reach our concierge team directly via email.
              </p>
            </div>

            <div className="space-y-6 pt-4 border-t border-[#E7E3DC]">
              {/* Official Inquiries */}
              <div className="p-6 bg-white border border-[#E7E3DC] flex items-start gap-4 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-[#B89B6A]/10 text-[#B89B6A] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-serif text-lg text-[#1A1A1A]">Official Inquiries</h4>
                  <p className="font-sans text-xs text-[#8E8880]">
                    Formal RFP briefs, proposals &amp; bespoke commission support
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <a
                      href={`mailto:${BRAND.contact.email}`}
                      className="text-xs text-[#1A1A1A] hover:text-[#B89B6A] font-medium font-mono transition-colors"
                    >
                      {BRAND.contact.email}
                    </a>
                    <a
                      href="mailto:support@shvom.in"
                      className="text-xs text-[#1A1A1A] hover:text-[#B89B6A] font-medium font-mono transition-colors"
                    >
                      support@shvom.in
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="lg:col-span-7 bg-white border border-[#E7E3DC] p-6 sm:p-8 md:p-12 shadow-subtle">
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1A1A1A] mb-2">
              Request Atelier Consultation
            </h3>
            <p className="font-sans text-xs sm:text-sm text-[#5A5A58] font-light mb-8">
              Complete this brief reservation. A concierge will confirm the schedule and furnish private parking and venue directions.
            </p>

            {success ? (
              <div className="p-8 bg-[#FAF8F5] border border-[#B89B6A] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#B89B6A] text-white flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="font-serif text-2xl text-[#1A1A1A]">Consultation Registered</h4>
                <p className="font-sans text-xs sm:text-sm text-[#5A5A58] leading-relaxed max-w-md mx-auto">
                  Thank you. Our senior concierge will review your preferred date and contact you within one business day with appointment confirmation.
                </p>
                <div className="pt-2">
                  <Button size="sm" variant="outline" onClick={() => setSuccess(false)}>
                    Book Another Appointment
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikramaditya Oberoi"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. vikram@oberoi.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98200 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                      Occasion / Inquiry Type *
                    </label>
                    <select
                      value={formData.inquiry_type}
                      onChange={(e) => setFormData({ ...formData, inquiry_type: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                    >
                      <option value="Wedding">Wedding Return Gifts</option>
                      <option value="Corporate">Corporate & Business Event Gifts</option>
                      <option value="Private Visit">In-Person Sample Viewing</option>
                      <option value="Virtual Curation">Video Call Consultation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                      Time Slot
                    </label>
                    <select
                      value={formData.preferred_time_slot}
                      onChange={(e) => setFormData({ ...formData, preferred_time_slot: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                    >
                      <option>Morning (11:00 AM - 1:00 PM)</option>
                      <option>Afternoon (2:00 PM - 4:30 PM)</option>
                      <option>Evening (5:00 PM - 7:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                    Gathering Context / Special Inquiries
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Approximate guest volume, venue destination, or specific materials of interest..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" size="lg" variant="primary" loading={loading} className="w-full">
                    Confirm Consultation Request
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
