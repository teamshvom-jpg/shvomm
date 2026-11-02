import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowRight, ShieldCheck, Sparkles, Feather, Building2, Heart, Award } from 'lucide-react';
import { BRAND } from '../config/brand';
import Button from '../components/common/Button';
import Section from '../components/common/Section';
import Lightbox from '../components/common/Lightbox';
import SeoHead from '../components/common/SeoHead';
import { GALLERY_ITEMS } from '../data/galleryData';
import { useRealm } from '../context/RealmContext';
import WeddingHeroAnimations from '../components/wedding/WeddingHeroAnimations';

export default function Home() {
  const [activeLightboxItem, setActiveLightboxItem] = useState(null);
  const { mode, isWedding, isCorporate } = useRealm();

  const corporateSteps = [
    {
      num: '01',
      title: '1. Select Gift Style & Materials',
      desc: 'Choose the tone of your event. Pick from full-grain leather folios, solid brass pens, scented candles, or custom gift sets with subtle logo branding.'
    },
    {
      num: '02',
      title: '2. Review Samples & Custom Box',
      desc: 'We send tangible samples—custom boxes, stationery, and material finishes—for you and your team to review in person.'
    },
    {
      num: '03',
      title: '3. Handcrafted & Delivered',
      desc: 'Carefully assembled by master artisans in Mumbai, individually inspected, and securely delivered directly to your event venue or office.'
    }
  ];

  const weddingSteps = [
    {
      num: '01',
      title: '1. Share Your Wedding Story',
      desc: 'Tell us about your celebration theme and venue. Our designers create custom monograms, initials, and personalized wax seals.'
    },
    {
      num: '02',
      title: '2. Sample Boxes Sent to You',
      desc: 'Receive sample gift boxes with custom wooden chests, scented candles, silver keepsakes, and treats right at home.'
    },
    {
      num: '03',
      title: '3. Beautifully Packed & Delivered',
      desc: 'Each gift is individually packaged with handwritten thank-you cards and coordinated with your planner for seamless room placement.'
    }
  ];

  const steps = isWedding ? weddingSteps : corporateSteps;

  const corporateTestimonials = [
    {
      quote:
        "Shvom understood what 99% of gifting vendors miss: true discretion. Our international summit delegates still talk about the bespoke leather folios and scented stone.",
      author: "Aditya Singhania",
      role: "Managing Director, Global Capital Partners",
      event: "Annual Private Equity Forum, Mumbai"
    },
    {
      quote:
        "The Makrana marble trays were the highlight of our annual client honours. Flawless presentation, zero loud branding, pure quiet luxury.",
      author: "Pooja Mehta",
      role: "Head of Private Wealth, Apex Banking",
      event: "Private Client Conclave, Singapore"
    }
  ];

  const weddingTestimonials = [
    {
      quote:
        "Every single guest remarked on the sheer elegance of the sandalwood-encased return keepsakes. It felt like an extension of our home, not a bulk favor.",
      author: "Nandini & Vikram",
      role: "Bride & Groom",
      event: "Palace Wedding, Udaipur"
    },
    {
      quote:
        "Our Lake Como welcome hampers set the tone for the entire week. The personalized linen pouches and brass crests were timeless.",
      author: "Alia & Sameer",
      role: "Bride & Groom",
      event: "Destination Nuptials, Lake Como"
    }
  ];

  const testimonials = isWedding ? weddingTestimonials : corporateTestimonials;

  return (
    <>
      <SeoHead
        title={
          isWedding
            ? "Shvom — Minimal Couture Wedding Keepsakes & Return Gifts"
            : "Shvom — The Art of the Thoughtful Departure | Institutional & Corporate Gifting"
        }
        description={
          isWedding
            ? "Minimal bespoke wedding return gifts and destination favors handcrafted with ancestral warmth and quiet restraint."
            : BRAND.philosophy
        }
      />

      {/* 1. FULL-SCREEN HERO */}
      <section
        className={`relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 px-6 md:px-12 overflow-hidden border-b transition-colors duration-500 ${
          isWedding
            ? 'bg-[#FAF7F2] border-[#E8DFC8]'
            : 'bg-[#FAF8F5] border-[#E7E3DC]'
        }`}
      >
        {/* Subtle decorative architectural lines for corporate vs soft radiant glow for wedding */}
        {isWedding ? (
          <>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#B89B6A]/[0.05] rounded-full blur-3xl" />
              <div className="absolute left-8 top-12 bottom-12 w-[1px] bg-[#E8DFC8]/40 hidden md:block" />
              <div className="absolute right-8 top-12 bottom-12 w-[1px] bg-[#E8DFC8]/40 hidden md:block" />
            </div>
            {/* Wedding Side Animations: Petals Rain, Stardust & Palace Filigree */}
            <WeddingHeroAnimations />
          </>
        ) : (
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-[#E7E3DC]" />
            <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-[#E7E3DC]" />
          </div>
        )}

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Badge */}
              <div
                className={`inline-flex items-center gap-2.5 px-4 py-1.5 border transition-all duration-300 ${
                  isWedding
                    ? 'border-[#C29F72]/50 bg-[#FAF7F2]/80 shadow-2xs'
                    : 'border-[#B89B6A]/40 bg-[#FAF8F5]'
                }`}
              >
                {isWedding ? (
                  <Sparkles className="w-3.5 h-3.5 text-[#B89B6A]" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-[#B89B6A]" />
                )}
                <span className="font-sans text-[11px] tracking-[0.24em] uppercase text-[#1A1A1A] font-medium">
                  {isWedding ? 'Luxury Wedding Return Gifts' : 'Corporate & Executive Gifting'}
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-[#1A1A1A] tracking-[-0.015em] leading-[1.12]">
                {isWedding ? (
                  <>
                    The Wedding Keepsake, <br className="hidden sm:inline" />
                    <span className="italic font-light">Handcrafted with Care.</span>
                  </>
                ) : (
                  <>
                    Thoughtful Return Gifts for <br className="hidden sm:inline" />
                    <span className="italic font-light">Corporate Events.</span>
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="font-sans text-sm sm:text-base md:text-lg text-[#5A5A58] font-light max-w-xl mx-auto leading-relaxed">
                {isWedding
                  ? 'Meaningful return gifts your guests will cherish forever. Custom gift boxes for destination weddings, sangeet favors, and family gatherings.'
                  : 'Premium return gifts for leadership summits, annual conferences, and client appreciation. Made with high quality materials and subtle branding.'}
              </p>

              {/* Hero Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
                <Link
                  to={isWedding ? '/designer?occasion=wedding' : '/designer'}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    variant={isWedding ? 'gold' : 'primary'}
                    icon={ArrowUpRight}
                    className="w-full justify-center"
                  >
                    {isWedding ? 'Curate Wedding Gift' : 'Begin Corporate Gift'}
                  </Button>
                </Link>
                <Link
                  to={isWedding ? '/weddings' : '/corporate'}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full justify-center"
                  >
                    {isWedding ? 'Explore Wedding Approach' : 'Explore Corporate Approach'}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quiet scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
          <span className="font-sans text-[9px] uppercase tracking-[0.24em] text-[#8E8880]">Scroll</span>
          <div className="w-[1px] h-6 bg-[#B89B6A]" />
        </div>
      </section>

      {/* 2. THE SHVOM PHILOSOPHY */}
      <Section className={isWedding ? 'bg-[#FAF7F2]' : 'bg-[#FAF8F5]'}>
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            {isWedding ? 'Our Wedding Philosophy' : 'Our Gifting Philosophy'}
          </span>
          <p className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1A1A1A] font-light leading-snug">
            {isWedding
              ? '"A wedding return gift is more than a formality—it is a heartfelt thank you that travels home with the people you love most."'
              : `"${BRAND.philosophy}"`}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 sm:gap-3 text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#8E8880] flex-wrap">
            {isWedding ? (
              <>
                <span>Custom Monograms</span>
                <span>&bull;</span>
                <span>Premium Quality</span>
                <span>&bull;</span>
                <span>Zero Clutter</span>
                <span>&bull;</span>
                <span>Venue Delivery</span>
              </>
            ) : (
              <>
                <span>Custom Curated</span>
                <span>&bull;</span>
                <span>Premium Materials</span>
                <span>&bull;</span>
                <span>Subtle Branding</span>
                <span>&bull;</span>
                <span>White-Glove Delivery</span>
              </>
            )}
          </div>
        </div>
      </Section>

      {/* 3. TWO ENTRY CARDS: CORPORATE VS WEDDINGS */}
      <Section
        tag="Choose Your Occasion"
        title="Corporate Events & Wedding Celebrations"
        subtitle={
          isWedding
            ? "Handcrafted return gifts for weddings, sangeets, and family celebrations."
            : "Whether hosting an executive summit or celebrating a family wedding, we create custom return gifts that fit your style perfectly."
        }
        className={isWedding ? "bg-[#FAF7F2] border-y border-[#E8DFC8]" : "bg-[#FFFFFF] border-y border-[#E7E3DC]"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Card 1: Weddings Card (first if wedding mode) */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className={`group relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
              isWedding
                ? 'order-1 bg-white border-2 border-[#B89B6A]/70 shadow-md ring-1 ring-[#B89B6A]/20'
                : 'order-2 bg-[#FAF8F5] border border-[#E7E3DC]'
            }`}
          >
            <div className="h-72 sm:h-80 overflow-hidden relative">
              <img
                src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop"
                alt="Luxury Wedding Return Gifting by Shvom"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="px-3 py-1 bg-[#1A1A1A] text-[#FAF8F5] font-sans text-[10px] uppercase tracking-[0.2em]">
                  Weddings & Celebrations
                </span>
                {isWedding && (
                  <span className="px-2.5 py-1 bg-[#B89B6A] text-white font-sans text-[9px] uppercase tracking-[0.2em] font-medium shadow-xs">
                    Selected
                  </span>
                )}
              </div>
            </div>

            <div className="p-8 sm:p-10 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="font-serif text-3xl font-normal text-[#1A1A1A]">
                  The Wedding Keepsake
                </h3>
                <p className="font-sans text-sm text-[#5A5A58] leading-relaxed">
                  Indian craftsmanship with modern elegance. Sangeet gifts, destination welcome hampers, hallmarked silver coins, and custom engraved wooden boxes for your cherished guests.
                </p>
              </div>

              <div className="pt-6 border-t border-[#E7E3DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Link
                  to="/weddings"
                  className="font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] group-hover:text-[#B89B6A] font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Explore Wedding Gifts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/designer?occasion=wedding" className="w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant={isWedding ? 'gold' : 'outline'}
                    className="w-full sm:w-auto justify-center"
                  >
                    Design Wedding Gift
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Corporate Card (first if corporate mode) */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className={`group relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
              isCorporate
                ? 'order-1 bg-white border-2 border-[#1A1A1A] shadow-md'
                : 'order-2 bg-[#FAF8F5] border border-[#E7E3DC]'
            }`}
          >
            <div className="h-72 sm:h-80 overflow-hidden relative">
              <img
                src="https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=1200&auto=format&fit=crop"
                alt="Corporate Return Gifting by Shvom"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="px-3 py-1 bg-[#1A1A1A] text-[#FAF8F5] font-sans text-[10px] uppercase tracking-[0.2em]">
                  Corporate & Business Events
                </span>
                {isCorporate && (
                  <span className="px-2.5 py-1 bg-[#1A1A1A] text-white border border-[#B89B6A]/50 font-sans text-[9px] uppercase tracking-[0.2em] font-medium">
                    Selected
                  </span>
                )}
              </div>
            </div>

            <div className="p-8 sm:p-10 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="font-serif text-3xl font-normal text-[#1A1A1A]">
                  Corporate Excellence
                </h3>
                <p className="font-sans text-sm text-[#5A5A58] leading-relaxed">
                  Understated, functional, and premium. For leadership summits, client appreciation, annual honours, and team retreats. Subtle logo embossing—no loud billboard branding.
                </p>
              </div>

              <div className="pt-6 border-t border-[#E7E3DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Link
                  to="/corporate"
                  className="font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] group-hover:text-[#B89B6A] font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Explore Corporate Gifts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/designer?occasion=corporate" className="w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant={isCorporate ? 'primary' : 'outline'}
                    className="w-full sm:w-auto justify-center"
                  >
                    Design Corporate Gift
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* 4. 3-STEP "HOW IT WORKS" */}
      <Section
        tag="Simple 3-Step Process"
        title="How It Works"
        subtitle={
          isWedding
            ? "We eliminate the stress of finding the right gifts. Every keepsake is tailored to your celebration and delivered with care."
            : "No flipping through confusing product catalogs. Our guided designer makes it simple to choose, sample, and order custom gifts."
        }
        className={isWedding ? "bg-[#FAF7F2]" : "bg-[#FAF8F5]"}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((st, i) => (
            <motion.div
              key={st.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="bg-white p-8 sm:p-10 border border-[#E7E3DC] relative flex flex-col justify-between shadow-xs"
            >
              <div>
                <span className="font-serif text-4xl text-[#B89B6A] font-light block mb-4">
                  {st.num}
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#1A1A1A] mb-3">
                  {st.title}
                </h3>
                <p className="font-sans text-sm text-[#5A5A58] leading-relaxed font-light">
                  {st.desc}
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[#F2EFE9] flex items-center gap-2 text-[11px] font-sans uppercase tracking-[0.16em] text-[#8E8880]">
                <span>Step {i + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to={isWedding ? "/designer?occasion=wedding" : "/designer?occasion=corporate"}>
            <Button
              size="md"
              variant={isWedding ? "gold" : "primary"}
              icon={ArrowUpRight}
            >
              {isWedding ? "Start Designing Wedding Gifts" : "Start Designing Corporate Gifts"}
            </Button>
          </Link>
        </div>
      </Section>

      {/* 5. RESTRAINED GALLERY PREVIEW */}
      <Section
        tag="Past Work"
        title="Featured Return Gifts"
        subtitle={
          isWedding
            ? "A showcase of custom destination hampers, silver keepsakes, and handcrafted gift boxes."
            : "A selection of recent custom return gift sets designed for corporate conferences and summits."
        }
        className="bg-[#FFFFFF] border-y border-[#E7E3DC]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(isWedding
            ? GALLERY_ITEMS.filter((i) => i.category === 'Weddings' || i.category === 'Private').concat(GALLERY_ITEMS)
            : GALLERY_ITEMS.filter((i) => i.category === 'Corporate' || i.category === 'Private').concat(GALLERY_ITEMS)
          )
            .filter((item, idx, self) => self.findIndex((s) => s.id === item.id) === idx)
            .slice(0, 4)
            .map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveLightboxItem(item)}
                className="group cursor-pointer bg-[#FAF8F5] border border-[#E7E3DC] overflow-hidden hover:border-[#B89B6A] transition-colors"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="p-5 space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium">
                    {item.category}
                  </span>
                  <h4 className="font-serif text-lg font-normal text-[#1A1A1A] truncate">
                    {item.title}
                  </h4>
                </div>
              </div>
            ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/gallery">
            <Button size="md" variant="outline">
              Explore All Past Commissions &rarr;
            </Button>
          </Link>
        </div>
      </Section>

      {/* 6. TESTIMONIALS */}
      <Section
        tag="Client Stories"
        title="In Their Own Words"
        className={isWedding ? "bg-[#FAF7F2]" : "bg-[#FAF8F5]"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white p-8 md:p-10 border border-[#E7E3DC] space-y-6 flex flex-col justify-between shadow-xs"
            >
              <p className="font-serif italic text-lg sm:text-xl text-[#1A1A1A] leading-relaxed">
                "{t.quote}"
              </p>
              <div className="border-t border-[#E7E3DC] pt-4">
                <h4 className="font-serif text-base font-normal text-[#1A1A1A]">{t.author}</h4>
                <p className="font-sans text-xs text-[#B89B6A]">{t.role}</p>
                <p className="font-sans text-[11px] text-[#8E8880] mt-0.5">{t.event}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. CLOSING CTA */}
      <section className="py-24 bg-[#1A1A1A] text-[#FAF8F5] text-center px-6 md:px-12 border-t border-[#2C2B29]">
        <div className="max-w-3xl mx-auto space-y-8">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            {isWedding ? "Custom Wedding Gifts" : "Get In Touch"}
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-[-0.01em] leading-tight">
            {isWedding
              ? "Create a gift your guests will cherish."
              : "Leave a lasting impression on your guests."}
          </h2>
          <p className="font-sans text-sm sm:text-base text-[#E7E3DC]/80 font-light max-w-lg mx-auto leading-relaxed">
            {isWedding
              ? "We craft custom wedding gifts with care, attention to detail, and personalized monograms. Contact our team to explore gift ideas for your wedding."
              : "We design custom gifts with personal care and high attention to detail. Contact our team to discuss your event dates and explore sample options."}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={isWedding ? "/designer?occasion=wedding" : "/designer?occasion=corporate"}>
              <Button size="lg" variant="gold" icon={ArrowUpRight}>
                {isWedding ? "Start Designing Wedding Gifts" : "Start Designing Corporate Gifts"}
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

      {/* Lightbox Modal */}
      {activeLightboxItem && (
        <Lightbox
          item={activeLightboxItem}
          onClose={() => setActiveLightboxItem(null)}
        />
      )}
    </>
  );
}
