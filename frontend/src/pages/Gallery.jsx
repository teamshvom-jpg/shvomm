import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, ArrowUpRight } from 'lucide-react';
import Section from '../components/common/Section';
import Lightbox from '../components/common/Lightbox';
import SeoHead from '../components/common/SeoHead';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';
import { GALLERY_ITEMS } from '../data/galleryData';

export default function Gallery() {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activeItem, setActiveItem] = useState(null);

  const filters = ['All', 'Weddings', 'Corporate', 'Private'];

  const filteredItems =
    selectedFilter === 'All'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === selectedFilter);

  const handleNext = () => {
    if (!activeItem) return;
    const currentIndex = filteredItems.findIndex((it) => it.id === activeItem.id);
    const nextIndex = (currentIndex + 1) % filteredItems.length;
    setActiveItem(filteredItems[nextIndex]);
  };

  const handlePrev = () => {
    if (!activeItem) return;
    const currentIndex = filteredItems.findIndex((it) => it.id === activeItem.id);
    const prevIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    setActiveItem(filteredItems[prevIndex]);
  };

  return (
    <>
      <SeoHead
        title="Curated Archives & Past Commissions | Shvom"
        description="Explore the curated archives of past bespoke return gifting suites designed for corporate galas and luxury weddings."
      />

      {/* Header */}
      <section className="pt-32 pb-16 bg-[#FAF8F5] border-b border-[#E7E3DC] px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="font-sans text-[11px] uppercase tracking-[0.28em] text-[#B89B6A] font-medium">
            Atelier Archives
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#1A1A1A] leading-tight">
            Curated Past Commissions
          </h1>
          <p className="font-sans text-sm sm:text-base text-[#5A5A58] font-light max-w-xl mx-auto leading-relaxed">
            Every piece pictured was custom-designed for a specific patron. We do not mass produce; these serve as a window into our material standards and craft discipline.
          </p>

          {/* Filter Bar */}
          <div className="pt-8 flex items-center justify-center gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-5 py-2 text-xs font-sans uppercase tracking-[0.16em] transition-all duration-200 border ${
                  selectedFilter === f
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#5A5A58] border-[#E7E3DC] hover:border-[#1A1A1A]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry / Responsive Grid */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                onClick={() => setActiveItem(item)}
                className="group cursor-pointer bg-white border border-[#E7E3DC] overflow-hidden flex flex-col justify-between hover:border-[#B89B6A] transition-colors"
              >
                <div className="relative h-72 sm:h-80 overflow-hidden bg-[#FAF8F5]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-3 bg-white/90 text-[#1A1A1A] rounded-full shadow-lg">
                      <Eye className="w-5 h-5 text-[#1A1A1A]" />
                    </span>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 bg-[#1A1A1A]/90 text-white font-sans text-[10px] uppercase tracking-[0.2em]">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-2">
                  <div className="text-[11px] text-[#8E8880]">
                    <span>{item.year}</span>
                  </div>
                  <h3 className="font-serif text-2xl font-normal text-[#1A1A1A] leading-snug">
                    {item.title}
                  </h3>
                  <p className="font-sans text-xs text-[#5A5A58] line-clamp-2 leading-relaxed pt-1">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Note on imagery */}
        <div className="mt-16 p-6 border border-[#E7E3DC] bg-[#FAF8F5] text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs text-[#8E8880] uppercase tracking-wider font-medium">
            Atelier Confidentiality Note
          </p>
          <p className="text-xs text-[#5A5A58] leading-relaxed">
            Certain private commissions and family insignias are withheld in deference to client privacy. Custom reference books and physical sample cases can be requested for private viewing in our atelier.
          </p>
        </div>

        <div className="text-center mt-12">
          <Link to="/designer">
            <Button size="lg" variant="primary" icon={ArrowUpRight}>
              Begin your custom gift
            </Button>
          </Link>
        </div>
      </section>

      {/* Lightbox */}
      {activeItem && (
        <Lightbox
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </>
  );
}
