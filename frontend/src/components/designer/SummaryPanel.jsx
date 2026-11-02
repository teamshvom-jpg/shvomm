import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Box, Sliders, Calendar, MapPin, Building, Heart, Check, MessageSquare } from 'lucide-react';
import { formatCurrency, formatKeyToLabel } from '../../utils/formatters';
import { generateConceptNarrative } from './MoodGenerator';
import { BRAND } from '../../config/brand';

export default function SummaryPanel({
  answers,
  estimate,
  loadingEstimate = false,
  className = ''
}) {
  const narrative = generateConceptNarrative(answers);
  const qty = answers.quantity || 50;

  return (
    <aside
      className={`bg-[#FFFFFF] border border-[#E7E3DC] p-6 lg:p-8 flex flex-col justify-between shadow-subtle ${className}`}
      aria-label="Your Gift Concept Live Summary"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-[#E7E3DC] pb-4">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-[#B89B6A] font-semibold">
              Live Atelier Blueprint
            </span>
            <span className="text-[11px] font-mono text-[#8E8880]">
              {narrative.curationCode}
            </span>
          </div>
          <h3 className="font-serif text-2xl font-normal text-[#1A1A1A] mt-1.5">
            Your Gift Concept
          </h3>
        </div>

        {/* Dynamic Concept Mood */}
        <div className="bg-[#FAF8F5] p-4 border-l-2 border-[#B89B6A] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#B89B6A] font-medium">
            <Sparkles className="w-3 h-3 text-[#B89B6A]" />
            <span>Editorial Mood</span>
          </div>
          <p className="font-serif italic text-sm text-[#1A1A1A] leading-relaxed">
            "{narrative.moodText}"
          </p>
        </div>

        {/* Selected Elements Key List */}
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
            <span className="text-[#8E8880] flex items-center gap-1.5">
              {answers.occasion === 'wedding' ? (
                <Heart className="w-3.5 h-3.5 text-[#B89B6A]" />
              ) : answers.occasion === 'whats_on_your_mind' ? (
                <MessageSquare className="w-3.5 h-3.5 text-[#B89B6A]" />
              ) : (
                <Building className="w-3.5 h-3.5 text-[#B89B6A]" />
              )}
              <span>Occasion</span>
            </span>
            <span className="font-medium text-[#1A1A1A]">
              {answers.occasion === 'whats_on_your_mind'
                ? "What's on your mind"
                : answers.occasion
                ? formatKeyToLabel(answers.occasion)
                : 'Pending selection'}
            </span>
          </div>

          {answers.thoughts && (
            <div className="py-1 border-b border-[#F2EFE9] space-y-1">
              <span className="text-[#8E8880] flex items-center gap-1.5 text-[11px]">
                <MessageSquare className="w-3 h-3 text-[#B89B6A]" />
                <span>Your Thoughts</span>
              </span>
              <p className="font-serif italic text-xs text-[#1A1A1A] line-clamp-2">
                "{answers.thoughts}"
              </p>
            </div>
          )}

          {answers.company_name && (
            <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
              <span className="text-[#8E8880] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>Entity / Name</span>
              </span>
              <span className="font-medium text-[#1A1A1A] truncate max-w-[140px]">
                {answers.company_name}
              </span>
            </div>
          )}

          {answers.logo_url && (
            <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
              <span className="text-[#8E8880] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>Company Logo</span>
              </span>
              <span className="font-medium text-[#B89B6A] flex items-center gap-1">
                <Check className="w-3 h-3" /> Attached
              </span>
            </div>
          )}

          {answers.gift_category && (
            <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
              <span className="text-[#8E8880] flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>Medium</span>
              </span>
              <span className="font-medium text-[#1A1A1A]">
                {formatKeyToLabel(answers.gift_category)}
              </span>
            </div>
          )}

          {answers.packaging_style && (
            <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
              <span className="text-[#8E8880] flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>Vessel / Box</span>
              </span>
              <span className="font-medium text-[#1A1A1A]">
                {formatKeyToLabel(answers.packaging_style)}
              </span>
            </div>
          )}

          {answers.personalization_level && (
            <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
              <span className="text-[#8E8880] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>Personalization</span>
              </span>
              <span className="font-medium text-[#1A1A1A]">
                {formatKeyToLabel(answers.personalization_level)}
              </span>
            </div>
          )}

          {answers.delivery_city && (
            <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
              <span className="text-[#8E8880] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>Destination</span>
              </span>
              <span className="font-medium text-[#1A1A1A]">
                {answers.delivery_city}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
            <span className="text-[#8E8880] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#B89B6A]" />
              <span>Volume</span>
            </span>
            <span className="font-medium text-[#1A1A1A]">
              {qty} units
            </span>
          </div>
        </div>

        {/* Indicative Investment Range with Company Logo directly next to Payment */}
        <div className="border border-[#E7E3DC] p-4 bg-[#FAF8F5] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#5A5A58]">
              Indicative Payment Range
            </span>
            {loadingEstimate && (
              <span className="text-[10px] text-[#B89B6A] animate-pulse">Calculating...</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {estimate ? (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-2xl font-normal text-[#1A1A1A]">
                      {formatCurrency(estimate.min_unit)} &ndash; {formatCurrency(estimate.max_unit)}
                    </span>
                    <span className="text-[11px] text-[#8E8880]">per gift</span>
                  </div>
                  <p className="text-[11px] text-[#5A5A58] mt-1">
                    Total Payment: <b>{formatCurrency(estimate.min_total)} &ndash; {formatCurrency(estimate.max_total)}</b> ({qty} units)
                  </p>
                  {estimate.discount_label && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-[#E7E3DC] text-[10px] uppercase tracking-wider text-[#1A1A1A] font-medium">
                      {estimate.discount_label}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#8E8880] italic">
                  Estimated payment compiles as parameters are configured.
                </p>
              )}
            </div>

            {/* Company Logo directly next to the payment */}
            <div className="shrink-0 p-2 bg-white border border-[#E7E3DC] shadow-xs flex flex-col items-center justify-center min-w-[74px] min-h-[60px] text-center">
              {answers.logo_url ? (
                <>
                  <img
                    src={answers.logo_url}
                    alt="Company Logo"
                    className="h-8 max-w-[64px] object-contain"
                  />
                  <span className="text-[8px] uppercase tracking-wider text-[#B89B6A] mt-1 font-sans font-medium">
                    Company Logo
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center text-center py-1">
                  <Building className="w-5 h-5 text-[#8E8880]/60" />
                  <span className="text-[8px] uppercase tracking-wider text-[#8E8880] mt-1 font-sans">
                    Company Logo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assurance Note */}
      <div className="pt-6 border-t border-[#E7E3DC] mt-6 flex items-center gap-2.5 text-[11px] text-[#8E8880]">
        <ShieldCheck className="w-4 h-4 text-[#B89B6A] shrink-0" />
        <span>Atelier white-glove quality assurance & custom sample preview included.</span>
      </div>
    </aside>
  );
}
