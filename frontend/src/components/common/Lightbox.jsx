import React, { useEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Lightbox({ item, onClose, onPrev, onNext }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A1A1A]/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-[#FAF8F5]/80 hover:text-[#FAF8F5] transition-colors focus:outline-none z-50"
        aria-label="Close Lightbox"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev button */}
      {onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="flex absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-[#FAF8F5] bg-black/40 sm:bg-transparent hover:bg-white/20 rounded-full transition-all focus:outline-none z-50"
          aria-label="Previous image"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Next button */}
      {onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="flex absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-[#FAF8F5] bg-black/40 sm:bg-transparent hover:bg-white/20 rounded-full transition-all focus:outline-none z-50"
          aria-label="Next image"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      )}

      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col md:flex-row bg-[#FAF8F5] text-[#1A1A1A] overflow-hidden shadow-2xl border border-[#E7E3DC]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:w-3/5 bg-[#1A1A1A] flex items-center justify-center overflow-hidden h-52 sm:h-72 md:h-auto shrink-0">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover max-h-[42vh] md:max-h-[85vh]"
          />
        </div>

        <div className="md:w-2/5 p-6 sm:p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#B89B6A] font-semibold">
                {item.category} &bull; {item.year}
              </span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl font-normal text-[#1A1A1A] leading-tight">
              {item.title}
            </h3>
            <hr className="border-t border-[#E7E3DC]" />
            <p className="font-sans text-sm text-[#5A5A58] leading-relaxed">
              {item.description}
            </p>
          </div>

          <div className="pt-8 border-t border-[#E7E3DC] mt-8 flex items-center justify-between">
            <span className="font-serif italic text-xs text-[#8E8880]">
              Bespoke Atelier Archive &bull; Shvom
            </span>
            <button
              onClick={onClose}
              className="text-xs uppercase tracking-[0.14em] text-[#1A1A1A] hover:text-[#B89B6A] font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
