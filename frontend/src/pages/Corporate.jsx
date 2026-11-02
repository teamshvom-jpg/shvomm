import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Globe,
  Shield,
  Sparkles,
  ChevronDown,
  Check,
  MessageSquare,
  Send,
  Loader2,
  Building2
} from 'lucide-react';
import Section from '../components/common/Section';
import Button from '../components/common/Button';
import SeoHead from '../components/common/SeoHead';
import { BRAND } from '../config/brand';
import { bookConsultation } from '../utils/api';

export default function Corporate() {
  const [openFaq, setOpenFaq] = useState(null);

  // Corporate: What's on your mind state
  const [mindForm, setMindForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    vision: ''
  });
  const [mindStatus, setMindStatus] = useState({ loading: false, success: false, error: null });

  const corporateVisionPrompts = [
    "300 custom leather folios for annual leadership summit",
    "VIP client appreciation gifts with subtle logo blind embossing",
    "Hand-crafted brass keepsake for 20th company anniversary",
    "Direct venue delivery to hotel conference desk in Mumbai"
  ];

  const handleMindSubmit = async (e) => {
    e.preventDefault();
    if (!mindForm.name || !mindForm.email || !mindForm.phone || !mindForm.vision) {
      setMindStatus({
        loading: false,
        success: false,
        error: "Please provide your name, contact details, and requirements."
      });
      return;
    }
    setMindStatus({ loading: true, success: false, error: null });
    try {
      await bookConsultation({
        full_name: mindForm.name,
        email: mindForm.email,
        phone: mindForm.phone,
        inquiry_type: "Corporate: What's On Your Mind",
        notes: `Company: ${mindForm.company || 'Not specified'}\nVision / Requirements:\n${mindForm.vision}`
      });
      setMindStatus({ loading: false, success: true, error: null });
      setMindForm({ name: '', company: '', email: '', phone: '', vision: '' });
    } catch (err) {
      setMindStatus({
        loading: false,
        success: false,
        error: err.message || "Failed to submit. Please contact team.shvom@gmail.com directly."
      });
    }
  };

  const corporateSectors = [
    {
      title: "Executive Summits & Board Retreats",
      desc: "For leadership summits, board meetings, and executive teams. Tailored leather writing folios, solid brass pens, and custom stationery.",
      badge: "Executive Level",
      img: "/images/tuscan-leather-folio.jpg"
    },
    {
      title: "VIP Client Appreciation & Banking",
      desc: "Premium gifts that show genuine appreciation for important clients. Hallmarked sterling silver coins, Makrana marble trays, or Kashmiri saffron.",
      badge: "VIP Clients",
      img: "/images/makrana-marble-tray.jpg"
    },
    {
      title: "Milestone Anniversaries & Achievements",
      desc: "High quality keepsakes in brass, bronze, and stone to celebrate company anniversaries and landmark achievements.",
      badge: "Milestones",
      img: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Festive & Year-End Gifts",
      desc: "Delicious gourmet gift boxes: slow-roasted almonds, fine chocolates, and scented botanical candles.",
      badge: "Festive Season",
      img: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=800&auto=format&fit=crop"
    }
  ];

  const standards = [
    {
      icon: Shield,
      title: "Subtle & Tasteful Branding",
      desc: "We feature your company logo using clean embossing, gold foil, or custom ribbon accents—never loud, cheap-looking logos."
    },
    {
      icon: Globe,
      title: "Reliable Venue & Global Delivery",
      desc: "We deliver directly to conference hotels or ship across Mumbai, Delhi, Bangalore, Dubai, Singapore, and worldwide."
    },
    {
      icon: Award,
      title: "Certified Premium Materials",
      desc: "Every component is certified: full-grain leather, hallmarked 925 sterling silver, pure soy wax, and food safety certifications."
    }
  ];

  const corporateFaqs = [
    {
      q: "Can we include our company logo and brand colors?",
      a: "Yes, absolutely. We offer subtle blind embossing, champagne gold/silver foil stamping, and matched ribbon or inner box lining colors. We specialize in tasteful, executive-grade branding that elevates your company without looking like cheap promotional merchandise."
    },
    {
      q: "Do you provide GST invoices and corporate vendor onboarding?",
      a: "Yes, 100%. We provide official GST tax invoices for all orders. We support corporate purchase orders (POs), vendor empanelment processes, NDA requirements, and payment via NEFT/RTGS/corporate cards."
    },
    {
      q: "What is the typical turnaround time for corporate orders?",
      a: "Standard production and delivery takes 2 to 4 weeks depending on the quantity and customization level. For urgent summits or board meetings, we also offer an expedited track (7 to 10 days) on select ready-to-personalize suites."
    },
    {
      q: "Can our committee inspect physical sample prototypes before confirming?",
      a: "Yes. Once we understand your requirements and budget, our team prepares and dispatches a complete sample prototype box to your office for leadership review and sign-off prior to bulk production."
    },
    {
      q: "Can you ship directly to conference venues or multiple employee addresses?",
      a: "Yes. We offer coordinated single-drop delivery to five-star hotel conference desks and banquet halls, as well as multi-city and international individual doorstep delivery for distributed teams and clients."
    },
    {
      q: "What is the minimum order quantity (MOQ)?",
      a: "Our bespoke corporate curations start from 25 units. We cater to executive retreats of 25–50 delegates up to nationwide annual conferences with 5,000+ attendees."
    }
  ];

  return (
    <>
      <SeoHead
        title="Corporate Return Gifting & Executive Honours | Shvom"
        description="Bespoke return gifts for conferences, client appreciation, milestone events, and executive board retreats."
      />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#FAF8F5] border-b border-[#E7E3DC] px-6 md:px-12 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Corporate Return Gifts
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#1A1A1A] leading-[1.15]">
            Corporate Return Gifts That Truly Impress.
          </h1>
          <p className="font-sans text-base sm:text-lg text-[#5A5A58] font-light max-w-2xl mx-auto leading-relaxed">
            Replace generic promotional merchandise with thoughtfully crafted gifts that board members, clients, and leaders will genuinely appreciate.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/designer?occasion=corporate">
              <Button size="lg" variant="primary" icon={ArrowUpRight}>
                Design Corporate Commission
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                Request Corporate Presentation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Corporate Scenarios Grid */}
      <Section
        tag="Applications"
        title="Bespoke Curation for Critical Occasions"
        subtitle="Every corporate occasion carries its own protocol and hierarchy. We tailor the curation accordingly."
        className="bg-[#FFFFFF]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {corporateSectors.map((sector) => (
            <div
              key={sector.title}
              className="bg-[#FAF8F5] border border-[#E7E3DC] overflow-hidden flex flex-col sm:flex-row"
            >
              <div className="sm:w-2/5 h-56 sm:h-auto overflow-hidden">
                <img
                  src={sector.img}
                  alt={sector.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="sm:w-3/5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium">
                    {sector.badge}
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-[#1A1A1A] leading-tight">
                    {sector.title}
                  </h3>
                  <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                    {sector.desc}
                  </p>
                </div>
                <div>
                  <Link
                    to="/designer?occasion=corporate"
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-[#1A1A1A] font-medium hover:text-[#B89B6A] transition-colors"
                  >
                    <span>Curate this concept</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* The Shvom Corporate Standards */}
      <Section
        tag="Discretion & Execution"
        title="Why Global Corporations Entrust Us"
        className="bg-[#FAF8F5] border-t border-[#E7E3DC]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {standards.map((std) => {
            const Icon = std.icon;
            return (
              <div
                key={std.title}
                className="bg-white p-8 border border-[#E7E3DC] space-y-4"
              >
                <div className="w-10 h-10 border border-[#B89B6A] flex items-center justify-center text-[#B89B6A]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-normal text-[#1A1A1A]">
                  {std.title}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#5A5A58] leading-relaxed font-light">
                  {std.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Corporate: Tell Us What's On Your Mind Section */}
      <Section
        tag="Custom Requirements"
        title="Tell Us What's on Your Mind"
        subtitle="Need a tailored gift for a summit, a milestone anniversary, or custom branded keepsakes for executive clients? Share your vision and our corporate team will prepare a tailored presentation."
        className="bg-[#FAF8F5] border-t border-[#E7E3DC]"
      >
        <div className="max-w-3xl mx-auto bg-white border border-[#E7E3DC] p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-[#FAF8F5]">
            <div className="w-10 h-10 rounded-full bg-[#B89B6A]/10 flex items-center justify-center text-[#B89B6A]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-[#1A1A1A]">Share Your Corporate Gifting Needs</h3>
              <p className="font-sans text-xs text-[#5A5A58]">GST invoices, physical prototypes, NDA compliance, and multi-location delivery supported.</p>
            </div>
          </div>

          {/* Quick Idea Chips */}
          <div className="pt-4">
            <span className="font-sans text-[11px] uppercase tracking-wider text-[#5A5A58] font-medium block mb-2">
              Common requests & ideas (tap to add):
            </span>
            <div className="flex flex-wrap gap-2">
              {corporateVisionPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMindForm(prev => ({
                    ...prev,
                    vision: prev.vision ? `${prev.vision}. ${prompt}` : prompt
                  }))}
                  className="font-sans text-xs px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#B89B6A]/15 text-[#5A5A58] hover:text-[#1A1A1A] border border-[#E7E3DC] rounded-full transition-colors text-left"
                >
                  + {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleMindSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                What's on your mind? *
              </label>
              <textarea
                rows={4}
                value={mindForm.vision}
                onChange={(e) => setMindForm(prev => ({ ...prev, vision: e.target.value }))}
                placeholder="Describe your upcoming event, delegate or client count, preferred materials (leather, brass, marble, gourmet), delivery deadline, or any specific ideas..."
                className="w-full p-3.5 bg-[#FAF8F5]/50 border border-[#E7E3DC] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors resize-y font-light"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={mindForm.name}
                  onChange={(e) => setMindForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Rajesh Mehta"
                  className="w-full p-3 bg-[#FAF8F5]/50 border border-[#E7E3DC] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
                />
              </div>
              <div>
                <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={mindForm.company}
                  onChange={(e) => setMindForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Apex Global Advisors"
                  className="w-full p-3 bg-[#FAF8F5]/50 border border-[#E7E3DC] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                  Corporate Work Email *
                </label>
                <input
                  type="email"
                  value={mindForm.email}
                  onChange={(e) => setMindForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="rajesh@apexadvisors.com"
                  className="w-full p-3 bg-[#FAF8F5]/50 border border-[#E7E3DC] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
                />
              </div>
              <div>
                <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                  Phone / WhatsApp *
                </label>
                <input
                  type="tel"
                  value={mindForm.phone}
                  onChange={(e) => setMindForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98200 12345"
                  className="w-full p-3 bg-[#FAF8F5]/50 border border-[#E7E3DC] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
                />
              </div>
            </div>

            {mindStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {mindStatus.error}
              </div>
            )}

            {mindStatus.success && (
              <div className="p-4 bg-[#B89B6A]/10 border border-[#B89B6A] text-[#1A1A1A] space-y-1">
                <div className="flex items-center gap-2 font-serif text-sm font-medium text-[#B89B6A]">
                  <Check className="w-4 h-4" /> Thank you for submitting your brief!
                </div>
                <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                  We've received your requirements and dispatched a confirmation to your work email. An account director will reply within 24 hours with a preliminary deck and sample options.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="submit"
                disabled={mindStatus.loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-black text-white text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
              >
                {mindStatus.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Your Brief...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Your Brief
                  </>
                )}
              </button>

              <Link
                to={mindForm.vision ? `/designer?occasion=corporate&vision=${encodeURIComponent(mindForm.vision)}` : "/designer?occasion=corporate"}
                className="font-sans text-xs text-[#B89B6A] hover:underline flex items-center gap-1.5"
              >
                Or configure in 3D Gift Designer <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </form>
        </div>
      </Section>

      {/* Corporate FAQs Accordion */}
      <Section
        tag="Corporate FAQs"
        title="Frequently Asked Questions"
        subtitle="Key details about GST invoices, delivery logistics, branding options, and minimum quantities."
        className="bg-white border-t border-[#E7E3DC]"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {corporateFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-[#FAF8F5] border border-[#E7E3DC] overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-lg text-[#1A1A1A] font-normal">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#B89B6A] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#E7E3DC]/60 text-sm text-[#5A5A58] font-light leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Callout CTA */}
      <section className="py-20 bg-[#1A1A1A] text-white text-center px-6 border-t border-[#2C2B29]">
        <div className="max-w-2xl mx-auto space-y-6">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Start Your Corporate Order
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal">
            Planning your upcoming summit or corporate event?
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#E7E3DC]/80 font-light leading-relaxed">
            Submit your requirements through our guided designer to receive a custom price breakdown and sample recommendations within 24 hours.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/designer?occasion=corporate">
              <Button size="lg" variant="gold" icon={ArrowUpRight}>
                Begin Corporate Blueprint
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="secondary">
                Request Corporate Presentation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
