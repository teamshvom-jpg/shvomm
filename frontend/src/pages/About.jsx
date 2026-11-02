import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, Feather, Leaf, Shield, Sparkles } from 'lucide-react';
import Section from '../components/common/Section';
import Button from '../components/common/Button';
import SeoHead from '../components/common/SeoHead';
import { BRAND } from '../config/brand';

export default function About() {
  const pillars = [
    {
      title: "The Heritage of the Parting Gift",
      desc: "In ancient Indian traditions and European high society alike, the gift offered upon departure was known as a blessing and a covenant. It was never a souvenir; it was a physical manifestation of mutual respect. Shvom was founded in Mumbai to restore this lost dignity to contemporary celebrations.",
      icon: Compass
    },
    {
      title: "Master Guild Artisans",
      desc: "We do not rely on automated factory lines. Our boxes are wrapped by hand by second-generation bookbinders. Our brass bowls are turned and hammered by traditional Thathera coppersmiths. Our silver bears the BIS 925 hallmark, certified pure.",
      icon: Feather
    },
    {
      title: "Discreet & Sustainable Luxury",
      desc: "Luxury without consciousness is outdated. We use chlorine-free FSC-certified archival board, 100% recycled handmade cotton paper made from garment industry offcuts, and natural soy-and-beeswax blends scented with pure botanicals.",
      icon: Leaf
    }
  ];

  const materials = [
    { name: "Belgian Archival Linen", origin: "Flanders, Belgium", use: "Book-bound keepsake boxes and folio wraps" },
    { name: "White Makrana Marble", origin: "Rajasthan, India", use: "Hand-carved trays, incense burners, and decorative bowls" },
    { name: "Hallmarked 925 Sterling Silver", origin: "Jaipur Guilds", use: "Custom engraved silver coins and heirloom accents" },
    { name: "Full-Grain Tuscan Leather", origin: "Florence, Italy", use: "Desk folios, travel trunks, and key keepers" },
    { name: "Single-Origin Kashmiri Mamra", origin: "Pulwama, Kashmir", use: "Slow-roasted artisanal confectionery" },
    { name: "Pure Botanic Wax & Essences", origin: "Kannauj, India", use: "Hand-poured candles and terracotta scent stones" }
  ];

  return (
    <>
      <SeoHead
        title="Atelier Story & Master Craftsmanship | Shvom"
        description="The story of Shvom: reviving the art of the return gift through master artisans, noble materials, and quiet luxury."
      />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#FAF8F5] border-b border-[#E7E3DC] px-6 md:px-12 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Atelier Origins
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#1A1A1A] leading-[1.15]">
            Quiet Elegance. Enduring Gratitude.
          </h1>
          <p className="font-sans text-base sm:text-lg text-[#5A5A58] font-light max-w-2xl mx-auto leading-relaxed">
            Shvom was created to rescue the return gift from generic catalogs and disposable trinkets. We believe the final object placed in your guest's hands should be as enduring as the memory itself.
          </p>
        </div>
      </section>

      {/* The Story & Three Pillars */}
      <Section
        tag="The Foundation"
        title="Our Guiding Craft Principles"
        className="bg-[#FFFFFF]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="bg-[#FAF8F5] p-8 sm:p-10 border border-[#E7E3DC] space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 border border-[#B89B6A] flex items-center justify-center text-[#B89B6A]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-2xl font-normal text-[#1A1A1A] leading-tight">
                    {p.title}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#5A5A58] leading-relaxed font-light">
                    {p.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Noble Materials Table */}
      <Section
        tag="Noble Provenance"
        title="Our Curated Material Registry"
        subtitle="We travel to origin sources to commission materials directly from traditional guilds."
        className="bg-[#FAF8F5] border-t border-[#E7E3DC]"
      >
        <div className="max-w-4xl mx-auto bg-white border border-[#E7E3DC] overflow-hidden">
          <div className="divide-y divide-[#E7E3DC]">
            {materials.map((m) => (
              <div
                key={m.name}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF8F5]/60 transition-colors"
              >
                <div>
                  <h4 className="font-serif text-xl font-normal text-[#1A1A1A]">
                    {m.name}
                  </h4>
                  <p className="font-sans text-xs text-[#5A5A58] mt-0.5">{m.use}</p>
                </div>
                <div className="text-left sm:text-right sm:shrink-0">
                  <span className="font-sans text-[11px] uppercase tracking-wider text-[#B89B6A] font-medium">
                    {m.origin}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Sustainability Statement */}
      <section className="py-20 bg-[#1A1A1A] text-white px-6 md:px-12 text-center border-t border-[#2C2B29]">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Conscious Legacy
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal">
            Gifts designed to stay on desks and coffee tables for a lifetime.
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#E7E3DC]/80 font-light max-w-xl mx-auto leading-relaxed">
            The greatest sustainability achievement in gifting is permanence. By crafting heirloom pieces of genuine utility and beauty, nothing from a Shvom commission is discarded.
          </p>
          <div className="pt-4">
            <Link to="/designer">
              <Button size="lg" variant="gold" icon={ArrowUpRight}>
                Begin Your Gift Concept
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
