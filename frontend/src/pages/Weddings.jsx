import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  Heart,
  Sparkles,
  Feather,
  Crown,
  Gift,
  MapPin,
  Check,
  ChevronDown,
  Layers,
  Palette,
  ShieldCheck,
  Compass,
  MessageSquare,
  Send,
  Loader2
} from 'lucide-react';
import Section from '../components/common/Section';
import Button from '../components/common/Button';
import SeoHead from '../components/common/SeoHead';
import { BRAND } from '../config/brand';
import { bookConsultation } from '../utils/api';
import WeddingHeroAnimations from '../components/wedding/WeddingHeroAnimations';

export default function Weddings() {
  // Interactive Monogram State for Brides & Grooms
  const [partnerOne, setPartnerOne] = useState('Alisha');
  const [partnerTwo, setPartnerTwo] = useState('Kabir');
  const [activeSealStyle, setActiveSealStyle] = useState('gold_wax');

  // Interactive Wedding Hamper Anatomy tab
  const [activeHamperItem, setActiveHamperItem] = useState(0);

  // Wedding FAQ Accordion state
  const [openFaq, setOpenFaq] = useState(null);

  // What's on your mind form state
  const [mindForm, setMindForm] = useState({
    name: '',
    phone: '',
    email: '',
    vision: ''
  });
  const [mindStatus, setMindStatus] = useState({ loading: false, success: false, error: null });

  const weddingVisionPrompts = [
    "Welcome room hampers for 150 guests in Udaipur",
    "Solid brass diya & organic Kashmiri saffron",
    "Sterling silver coin stamped with our wedding date",
    "Handwritten calligraphy cards & sandalwood candle"
  ];

  const handleMindSubmit = async (e) => {
    e.preventDefault();
    if (!mindForm.name || !mindForm.email || !mindForm.phone || !mindForm.vision) {
      setMindStatus({
        loading: false,
        success: false,
        error: "Please provide your name, contact details, and wedding ideas."
      });
      return;
    }
    setMindStatus({ loading: true, success: false, error: null });
    try {
      await bookConsultation({
        full_name: mindForm.name,
        email: mindForm.email,
        phone: mindForm.phone,
        inquiry_type: "Wedding: What's On Your Mind",
        notes: mindForm.vision
      });
      setMindStatus({ loading: false, success: true, error: null });
      setMindForm({ name: '', phone: '', email: '', vision: '' });
    } catch (err) {
      setMindStatus({
        loading: false,
        success: false,
        error: err.message || "Failed to submit. Please contact team.shvom@gmail.com directly."
      });
    }
  };

  const weddingRituals = [
    {
      title: "Destination Welcome Hampers",
      occasion: "Arrival & Room Placements",
      desc: "Delivered to guests' suites upon arrival at Lake Como, Udaipur, Goa, or Tuscany. Custom printed itineraries, refreshing drinks, gourmet sweets, and personalized linen pouches.",
      img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop",
      tag: "First Impression"
    },
    {
      title: "Sangeet & Mehendi Favors",
      desc: "Vibrant and festive gifts for celebration evenings: scented botanical candles in hand-crafted brass jars, artisan scarves, and slow-roasted dry fruits in silk pouches.",
      occasion: "Festive Pre-Wedding",
      img: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=800&auto=format&fit=crop",
      tag: "Celebration Night"
    },
    {
      title: "Wedding Reception Gift Box",
      desc: "The signature return gift. Solid hardwood or fine linen gift boxes personalized with the couple's brass monogram, enclosing hallmarked sterling silver keepsakes and premium sweets.",
      occasion: "Grand Reception & Departure",
      img: "/images/makrana-marble-tray.jpg",
      tag: "Main Keepsake"
    },
    {
      title: "Gifts for Family Elders & VIP Guests",
      desc: "Specially commissioned for aunts, uncles, and family elders: Makrana marble trays, saffron sweets, and personalized handwritten thank-you cards.",
      occasion: "Immediate Family & Elders",
      img: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=800&auto=format&fit=crop",
      tag: "Heirloom Edition"
    }
  ];

  const hamperLayers = [
    {
      title: "Hand-Crafted Teak Chest",
      detail: "Solid Sheesham or teak hardwood with concealed brass hinges and your custom intertwined monogram engraved into the lid.",
      highlight: "Keepsake Box"
    },
    {
      title: "Hallmarked 925 Sterling Silver Coin",
      detail: "Certified pure sterling silver coin custom stamped with wedding blessings, the couple's crest, or auspicious motifs.",
      highlight: "Heirloom Silver"
    },
    {
      title: "Kashmiri Mamra Almonds & Saffron",
      detail: "Single-origin dry fruits and saffron slow-roasted in Rajasthan and enclosed in hand-stitched raw silk potli bags.",
      highlight: "Gourmet Sweets"
    },
    {
      title: "Hand-Poured Jasmine & Sandalwood Candle",
      detail: "Clean-burning organic soy wax poured into hand-hammered brass vessels that guests reuse in their homes for years.",
      highlight: "Home Scent"
    },
    {
      title: "Calligraphy Thank-You Card",
      detail: "Heavy 600gsm cotton card with deckle borders, individually scripted with the couple's gratitude in gold or deep ink.",
      highlight: "Personal Message"
    }
  ];

  const weddingThemes = [
    {
      title: "Udaipur Royal Palace",
      location: "Rajasthan",
      colors: ["#F9F6F0", "#C8A97E", "#2B2824", "#E8D8C0"],
      vibe: "Makrana marble, etched brass, raw silk ribbons, and antique gold wax seals."
    },
    {
      title: "Lake Como Villa",
      location: "Italy",
      colors: ["#F4EFE6", "#6B7B6E", "#C29F72", "#3E3B36"],
      vibe: "Olive leaf greens, Belgian linen boxes, lemon elixirs, and letterpress cards."
    },
    {
      title: "Goa Coastal Romance",
      location: "Goa",
      colors: ["#FDFBF7", "#C98A66", "#D4BE96", "#202020"],
      vibe: "Artisan terracotta, sunlit amber bottles, scented sea salt candles, and woven jute."
    },
    {
      title: "Jaipur Heritage Grandeur",
      location: "Jaipur",
      colors: ["#FDF8F5", "#D98282", "#B89B6A", "#262322"],
      vibe: "Blush rose cotton paper, botanical attar, hand-hammered brass, and saffron treats."
    }
  ];

  const faqs = [
    {
      q: "How far in advance should we order our wedding return gifts?",
      a: "We recommend initiating your curation 4 to 8 weeks before your celebration. This allows time for creating your personalized monogram die, preparing physical prototype boxes for your review, and white-glove packaging. For rush commissions (under 3 weeks), our concierge team can fast-track ready-to-personalize suites."
    },
    {
      q: "Can we receive physical sample boxes before placing our full order?",
      a: "Yes, absolutely. Once we narrow down your preferred items and theme through our gift designer or a consultation, our atelier prepares a tactile sample box and ships it directly to your home so you can touch the materials and taste the confections."
    },
    {
      q: "Do you deliver directly to destination wedding venues and hotels?",
      a: "Yes. We coordinate directly with your wedding planners and luxury hotel concierge teams across Udaipur, Goa, Lake Como, Tuscany, Dubai, and beyond. Every hamper is packaged for travel and staged for seamless in-room placement before guests check in."
    },
    {
      q: "Are all edible treats vegetarian and preservative-free?",
      a: "100% yes. All dry fruits, saffron, and sweets are certified vegetarian, free from artificial preservatives, and packed fresh in food-safe sealed pouches inside the keepsake containers."
    },
    {
      q: "What is the minimum quantity for custom wedding gifting?",
      a: "Our bespoke wedding curations start from 25 units. We cater to intimate 25-guest celebrations up to grand royal destination weddings of 2,500+ guests."
    }
  ];

  const initials = `${(partnerOne[0] || 'A').toUpperCase()} & ${(partnerTwo[0] || 'K').toUpperCase()}`;

  return (
    <>
      <SeoHead
        title="Luxury Wedding Return Gifting & Keepsakes | Shvom"
        description="Bespoke return gifts for destination weddings, sangeet favors, reception keepsakes, and family crest monogramming."
      />

      {/* 1. ROMANTIC EDITORIAL HERO */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-32 pb-20 bg-[#FAF7F2] border-b border-[#E8DFC8] px-6 md:px-12 text-center overflow-hidden">
        {/* Soft Ambient Radiance */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#B89B6A]/[0.06] rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-10 w-72 h-72 bg-[#E8C7A3]/[0.08] rounded-full blur-2xl" />
          <div className="absolute top-1/2 right-10 w-72 h-72 bg-[#D4BE96]/[0.08] rounded-full blur-2xl" />
        </div>

        {/* Wedding Animations: Falling Rose & Jasmine Petals, Palace Filigree & Stardust */}
        <WeddingHeroAnimations />

        <div className="relative max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C29F72]/50 bg-white/80 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B89B6A]" />
            <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-[#1A1A1A] font-medium">
              Luxury Wedding Return Gifts
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#1A1A1A] leading-[1.12]"
          >
            The Wedding Keepsake, <br className="hidden sm:inline" />
            <span className="italic font-light text-[#8A7352]">Handcrafted with Love.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-sans text-base sm:text-lg text-[#5A5A58] font-light max-w-2xl mx-auto leading-relaxed"
          >
            A wedding return gift is more than a formality—it is an enduring thank-you that journeys home with the people who traveled across the world for your celebration.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/designer?occasion=wedding">
              <Button size="lg" variant="gold" icon={ArrowUpRight} className="shadow-xs">
                Start Designing Wedding Gifts
              </Button>
            </Link>
            <Link to="/gallery">
              <Button size="lg" variant="outline">
                View Past Wedding Keepsakes
              </Button>
            </Link>
          </motion.div>

          {/* Nuptial Accents Strip */}
          <div className="pt-8 flex items-center justify-center gap-6 sm:gap-10 text-[11px] font-sans uppercase tracking-[0.2em] text-[#8E8880] flex-wrap">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#B89B6A]" /> Custom Monogramming
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#B89B6A]" /> 100% Vegetarian Purity
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#B89B6A]" /> Venue Room Staging
            </span>
          </div>
        </div>
      </section>

      {/* 2. LIVE INTERACTIVE WEDDING MONOGRAM & WAX SEAL PREVIEW */}
      <Section
        tag="Interactive Personalization"
        title="See Your Names on a Custom Monogram"
        subtitle="Type your names below to preview how your personalized initials will look across our signature gift finishes."
        className="bg-white border-b border-[#E8DFC8]"
      >
        <div className="max-w-4xl mx-auto bg-[#FAF7F2] border border-[#E8DFC8] p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Input fields */}
            <div className="space-y-6">
              <div className="space-y-4">
                <span className="font-sans text-xs uppercase tracking-[0.16em] text-[#B89B6A] font-semibold block">
                  Couple's First Names
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#5A5A58] uppercase tracking-wider mb-1">
                      Partner One
                    </label>
                    <input
                      type="text"
                      value={partnerOne}
                      onChange={(e) => setPartnerOne(e.target.value)}
                      placeholder="e.g. Alisha"
                      className="w-full px-3 py-2 bg-white border border-[#E8DFC8] text-sm text-[#1A1A1A] font-medium focus:outline-none focus:border-[#B89B6A]"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5A5A58] uppercase tracking-wider mb-1">
                      Partner Two
                    </label>
                    <input
                      type="text"
                      value={partnerTwo}
                      onChange={(e) => setPartnerTwo(e.target.value)}
                      placeholder="e.g. Kabir"
                      className="w-full px-3 py-2 bg-white border border-[#E8DFC8] text-sm text-[#1A1A1A] font-medium focus:outline-none focus:border-[#B89B6A]"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              {/* Seal Style Selector */}
              <div className="space-y-2">
                <span className="font-sans text-xs uppercase tracking-[0.16em] text-[#5A5A58] font-medium block">
                  Choose Finish & Presentation
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSealStyle('gold_wax')}
                    className={`px-3 py-2 text-xs font-sans tracking-wider rounded border transition-all ${
                      activeSealStyle === 'gold_wax'
                        ? 'bg-[#B89B6A] text-white border-[#B89B6A] shadow-xs'
                        : 'bg-white text-[#5A5A58] border-[#E8DFC8] hover:text-[#1A1A1A]'
                    }`}
                  >
                    Gold Wax Stamp
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSealStyle('brass_plate')}
                    className={`px-3 py-2 text-xs font-sans tracking-wider rounded border transition-all ${
                      activeSealStyle === 'brass_plate'
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                        : 'bg-white text-[#5A5A58] border-[#E8DFC8] hover:text-[#1A1A1A]'
                    }`}
                  >
                    Brushed Brass
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSealStyle('linen_foil')}
                    className={`px-3 py-2 text-xs font-sans tracking-wider rounded border transition-all ${
                      activeSealStyle === 'linen_foil'
                        ? 'bg-[#8A7352] text-white border-[#8A7352] shadow-xs'
                        : 'bg-white text-[#5A5A58] border-[#E8DFC8] hover:text-[#1A1A1A]'
                    }`}
                  >
                    Linen Foil
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/designer?occasion=wedding&couple=${encodeURIComponent(initials)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-sans uppercase tracking-[0.16em] text-[#1A1A1A] font-semibold hover:text-[#B89B6A] transition-colors"
                >
                  <span>Apply this monogram to your design blueprint</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Visual Preview Card */}
            <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-white border border-[#E8DFC8] shadow-xs relative">
              <span className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.2em] text-[#B89B6A] font-sans">
                Live Preview
              </span>

              {/* Monogram Seal Artwork */}
              <div
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-md ${
                  activeSealStyle === 'gold_wax'
                    ? 'bg-gradient-to-br from-[#D4BE96] via-[#B89B6A] to-[#8C7247] text-white border-2 border-[#FAF7F2]'
                    : activeSealStyle === 'brass_plate'
                    ? 'bg-gradient-to-br from-[#2D2B28] via-[#1A1A1A] to-[#121110] text-[#D4BE96] border-2 border-[#B89B6A]/50'
                    : 'bg-[#FAF6F0] text-[#8A7352] border-2 border-[#E8DFC8]'
                }`}
              >
                <Crown className="w-4 h-4 mb-1 opacity-75" />
                <span className="font-serif text-2xl font-normal tracking-[0.1em]">
                  {initials}
                </span>
                <span className="text-[8px] uppercase tracking-[0.24em] opacity-80 mt-1 font-sans">
                  The Union
                </span>
              </div>

              <div className="mt-5 text-center space-y-1">
                <p className="font-serif text-lg text-[#1A1A1A]">
                  {partnerOne || 'Alisha'} & {partnerTwo || 'Kabir'}
                </p>
                <p className="font-sans text-xs text-[#8E8880]">
                  {activeSealStyle === 'gold_wax' && 'Deep embossed wax seal with raw botanical edges'}
                  {activeSealStyle === 'brass_plate' && 'Solid brushed brass plate inlaid into hardwood chest'}
                  {activeSealStyle === 'linen_foil' && 'Champagne gold foil debossed on archival Belgian linen'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. FOUR CEREMONY CHAPTERS */}
      <Section
        tag="Celebration Chapters"
        title="Gifts for Each Wedding Ritual"
        subtitle="From arrival welcome gifts to the reception farewell, our collections reflect the emotion of each special moment."
        className="bg-[#FAF7F2]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {weddingRituals.map((ritual) => (
            <div
              key={ritual.title}
              className="group bg-white border border-[#E8DFC8] overflow-hidden flex flex-col sm:flex-row shadow-2xs hover:border-[#B89B6A] transition-all duration-300"
            >
              <div className="sm:w-2/5 h-60 sm:h-auto overflow-hidden relative">
                <img
                  src={ritual.img}
                  alt={ritual.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 bg-[#1A1A1A] text-white text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 font-sans">
                  {ritual.tag}
                </div>
              </div>
              <div className="sm:w-3/5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium">
                    {ritual.occasion}
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-[#1A1A1A] leading-tight">
                    {ritual.title}
                  </h3>
                  <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                    {ritual.desc}
                  </p>
                </div>
                <div>
                  <Link
                    to="/designer?occasion=wedding"
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-[#1A1A1A] font-medium hover:text-[#B89B6A] transition-colors"
                  >
                    <span>Configure this gift</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. ANATOMY OF A SIGNATURE WEDDING GIFT BOX */}
      <Section
        tag="What's Inside"
        title="Anatomy of a Shvom Wedding Keepsake"
        subtitle="Every element inside your return gift is selected for meaning, beauty, and lasting memories."
        className="bg-white border-y border-[#E8DFC8]"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {hamperLayers.map((layer, idx) => (
              <button
                key={layer.highlight}
                type="button"
                onClick={() => setActiveHamperItem(idx)}
                className={`p-4 border text-left transition-all duration-200 ${
                  activeHamperItem === idx
                    ? 'bg-[#FAF7F2] border-[#B89B6A] shadow-xs'
                    : 'bg-white border-[#E8DFC8] hover:border-[#B89B6A]/50'
                }`}
              >
                <span className="font-serif text-sm text-[#B89B6A] block mb-1">
                  0{idx + 1}
                </span>
                <h4 className="font-sans text-xs uppercase tracking-wider font-semibold text-[#1A1A1A]">
                  {layer.highlight}
                </h4>
              </button>
            ))}
          </div>

          <div className="p-8 bg-[#FAF7F2] border border-[#E8DFC8] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium font-sans">
                Component 0{activeHamperItem + 1} of 05
              </span>
              <h3 className="font-serif text-2xl font-normal text-[#1A1A1A]">
                {hamperLayers[activeHamperItem].title}
              </h3>
              <p className="font-sans text-sm text-[#5A5A58] leading-relaxed max-w-xl font-light">
                {hamperLayers[activeHamperItem].detail}
              </p>
            </div>
            <Link to="/designer?occasion=wedding" className="shrink-0">
              <Button size="sm" variant="gold" icon={ArrowUpRight}>
                Customize in Designer
              </Button>
            </Link>
          </div>
        </div>
      </Section>

      {/* 5. DESTINATION WEDDING COLOR THEMES */}
      <Section
        tag="Aesthetic Color Themes"
        title="Inspired by Iconic Wedding Destinations"
        subtitle="Choose a color harmony that matches your destination wedding venue."
        className="bg-[#FAF7F2]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {weddingThemes.map((theme) => (
            <div
              key={theme.title}
              className="bg-white p-6 border border-[#E8DFC8] space-y-4 shadow-2xs hover:border-[#B89B6A] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg text-[#1A1A1A]">{theme.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#B89B6A] font-sans font-medium">
                  {theme.location}
                </span>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-2">
                {theme.colors.map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border border-black/10 shadow-2xs"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                {theme.vibe}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. WEDDING PATRON STORY */}
      <Section
        tag="Nuptial Reflection"
        title="A Real Destination Wedding Story"
        className="bg-white border-t border-[#E8DFC8]"
      >
        <div className="max-w-3xl mx-auto bg-[#FAF7F2] border border-[#E8DFC8] p-8 sm:p-12 text-center space-y-6">
          <Heart className="w-6 h-6 text-[#B89B6A] mx-auto fill-[#B89B6A]/20" />
          <p className="font-serif italic text-xl sm:text-2xl text-[#1A1A1A] leading-relaxed">
            "Every single guest remarked on the sheer elegance of the sandalwood return chests. They felt like an extension of our home, not a bulk wedding favor. Seeing our intertwined monogram stamped in gold wax was unforgettable."
          </p>
          <div className="border-t border-[#E8DFC8] pt-4 max-w-xs mx-auto">
            <h4 className="font-serif text-lg text-[#1A1A1A]">Nandini & Vikram Singhania</h4>
            <p className="font-sans text-xs text-[#B89B6A] mt-0.5">Palace Wedding, Udaipur</p>
            <p className="font-sans text-[11px] text-[#8E8880]">280 Bespoke Keepsake Chests Commissioned</p>
          </div>
        </div>
      </Section>

      {/* 6.5 WHAT'S ON YOUR MIND SECTION */}
      <Section
        tag="Personal Vision"
        title="Tell Us What's on Your Mind"
        subtitle="Have a specific gift in mind, a cherished family tradition, or a destination theme? Share your thoughts freely and our wedding concierge will design it for you."
        className="bg-[#FAF7F2] border-t border-[#E8DFC8]"
      >
        <div className="max-w-3xl mx-auto bg-white border border-[#E8DFC8] p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-[#FAF7F2]">
            <div className="w-10 h-10 rounded-full bg-[#B89B6A]/10 flex items-center justify-center text-[#B89B6A]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-[#1A1A1A]">Share Your Wedding Gifting Ideas</h3>
              <p className="font-sans text-xs text-[#8E8880]">Our founders and wedding curations team review every note directly.</p>
            </div>
          </div>

          {/* Quick Idea Chips */}
          <div className="pt-4">
            <span className="font-sans text-[11px] uppercase tracking-wider text-[#8E8880] font-medium block mb-2">
              Tap for inspiration:
            </span>
            <div className="flex flex-wrap gap-2">
              {weddingVisionPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMindForm(prev => ({
                    ...prev,
                    vision: prev.vision ? `${prev.vision}. ${prompt}` : prompt
                  }))}
                  className="font-sans text-xs px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#B89B6A]/15 text-[#5A5A58] hover:text-[#1A1A1A] border border-[#E8DFC8] rounded-full transition-colors text-left"
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
                placeholder="Tell us about your wedding date, destination, items you love (e.g. silver coin, scented candles, dry fruits), budget thoughts, or special family customs..."
                className="w-full p-3.5 bg-[#FAF7F2]/50 border border-[#E8DFC8] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors resize-y font-light"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={mindForm.name}
                  onChange={(e) => setMindForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Alisha Kapoor"
                  className="w-full p-3 bg-[#FAF7F2]/50 border border-[#E8DFC8] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
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
                  placeholder="+91 98765 43210"
                  className="w-full p-3 bg-[#FAF7F2]/50 border border-[#E8DFC8] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
                />
              </div>
              <div>
                <label className="block font-sans text-xs uppercase tracking-wider text-[#5A5A58] mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={mindForm.email}
                  onChange={(e) => setMindForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="alisha@example.com"
                  className="w-full p-3 bg-[#FAF7F2]/50 border border-[#E8DFC8] focus:border-[#B89B6A] focus:bg-white text-sm text-[#1A1A1A] placeholder-[#8E8880] outline-none transition-colors font-light"
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
                  <Check className="w-4 h-4" /> Thank you for sharing your thoughts!
                </div>
                <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                  We've received your note and sent a confirmation to your email. Our wedding concierge will reply within 24 hours with ideas and sample suggestions.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="submit"
                disabled={mindStatus.loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#B89B6A] hover:bg-[#a38758] text-white text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
              >
                {mindStatus.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Your Thoughts...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Your Thoughts
                  </>
                )}
              </button>

              <Link
                to={mindForm.vision ? `/designer?occasion=wedding&vision=${encodeURIComponent(mindForm.vision)}` : "/designer?occasion=wedding"}
                className="font-sans text-xs text-[#B89B6A] hover:underline flex items-center gap-1.5"
              >
                Or customize directly in 3D Gift Designer <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </form>
        </div>
      </Section>

      {/* 7. WEDDING FAQS ACCORDION */}
      <Section
        tag="Frequently Asked Questions"
        title="Everything You Need to Know"
        subtitle="Common questions from couples planning wedding return gifts."
        className="bg-[#FAF7F2] border-t border-[#E8DFC8]"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-[#E8DFC8] overflow-hidden transition-all duration-200"
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
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#FAF7F2] text-sm text-[#5A5A58] font-light leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 8. CALLOUT CTA */}
      <section className="py-20 bg-[#1A1A1A] text-white text-center px-6 border-t border-[#2C2B29]">
        <div className="max-w-2xl mx-auto space-y-6">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Begin Your Wedding Keepsake
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal">
            Ready to design your wedding return gifts?
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#E7E3DC]/80 font-light leading-relaxed">
            Answer a few quick questions to receive a custom proposal and sample options for your wedding date.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/designer?occasion=wedding">
              <Button size="lg" variant="gold" icon={ArrowUpRight}>
                Start Designing Wedding Gifts
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="secondary">
                Request Free Consultation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
