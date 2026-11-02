import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Upload, Sparkles, AlertCircle, Building, MessageSquare, CreditCard, ShieldCheck } from 'lucide-react';
import { uploadAssetFile } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';

export default function QuestionCard({
  question,
  answers,
  onChange,
  error
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  if (!question) return null;

  const handleFileUpload = async (e, fieldKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadAssetFile(file);
      onChange(fieldKey, res.url);
    } catch (err) {
      console.warn("Upload failed, using local asset preview fallback:", err);
      // Create local object URL fallback so user preview immediately works
      try {
        const localUrl = URL.createObjectURL(file);
        onChange(fieldKey, localUrl);
      } catch (e) {
        setUploadError(err.message || "Failed to upload asset");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Title & Subtitle */}
      <div className="space-y-2">
        <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-normal text-[#1A1A1A] leading-tight">
          {question.title}
        </h2>
        {question.subtitle && (
          <p className="font-sans text-sm md:text-base text-[#5A5A58] font-light max-w-2xl leading-relaxed">
            {question.subtitle}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. SELECT CARD TYPE */}
      {question.type === 'select_card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((opt) => {
            const isSelected = answers[question.id] === opt.value;
            const isMind = opt.value === 'whats_on_your_mind';
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(question.id, opt.value)}
                className={`text-left p-6 border transition-all duration-300 relative flex flex-col justify-between ${
                  isSelected
                    ? isMind
                      ? 'border-[#B89B6A] bg-white shadow-elevated ring-2 ring-[#B89B6A]'
                      : 'border-[#B89B6A] bg-[#FFFFFF] shadow-subtle ring-1 ring-[#B89B6A]'
                    : isMind
                    ? 'border-[#B89B6A]/50 bg-gradient-to-br from-white via-[#FAF8F5] to-white hover:border-[#B89B6A] hover:shadow-subtle'
                    : 'border-[#E7E3DC] bg-[#FFFFFF]/60 hover:border-[#1A1A1A]/40 hover:bg-[#FFFFFF]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    {opt.badge && (
                      <span className={`text-[10px] uppercase tracking-[0.2em] font-medium flex items-center gap-1.5 ${
                        isMind ? 'text-[#B89B6A] font-semibold' : 'text-[#B89B6A]'
                      }`}>
                        {isMind && <Sparkles className="w-3 h-3 text-[#B89B6A]" />}
                        {opt.badge}
                      </span>
                    )}
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ml-auto ${
                        isSelected
                          ? 'border-[#B89B6A] bg-[#B89B6A] text-[#FAF8F5]'
                          : 'border-[#D3CEC4] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </div>
                  <h4 className={`font-serif text-xl font-normal ${isMind ? 'text-[#1A1A1A] font-medium' : 'text-[#1A1A1A]'}`}>
                    {opt.label}
                  </h4>
                  <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 1.1 THOUGHTS AND VISION (WHAT'S ON YOUR MIND STEP) */}
      {question.type === 'thoughts_and_vision' && (
        <div className="space-y-6">
          {/* Quick Idea Chips for Patron Inspiration */}
          <div className="bg-[#FAF8F5] border border-[#E7E3DC] p-5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-[0.16em] text-[#B89B6A] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#B89B6A]" />
              <span>Tap any curated ideas to add into your thoughts:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                "Full-grain leather folios & brass pens",
                "Hand-poured botanical candles in brass jars",
                "Carved Makrana marble keepsake trays",
                "Solid teak wood keepsake chest with brass hinges",
                "Hallmarked 925 sterling silver coins",
                "Slow-roasted mamra almonds & saffron treats",
                "Custom blind-debossed company logo",
                "Handwritten calligraphy gift cards",
                "Strictly sustainable & plastic-free packaging"
              ].map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    const current = answers.thoughts || '';
                    const updated = current ? `${current.trim()}, ${idea}` : idea;
                    onChange('thoughts', updated);
                  }}
                  className="font-sans text-xs px-3 py-1.5 bg-white hover:bg-[#B89B6A]/10 text-[#5A5A58] hover:text-[#1A1A1A] border border-[#E7E3DC] hover:border-[#B89B6A] transition-colors rounded-full text-left"
                >
                  + {idea}
                </button>
              ))}
            </div>
          </div>

          {/* Main Thoughts Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Your Thoughts & Vision <span className="text-[#B89B6A]">*</span>
              </label>
              <span className="text-[11px] font-sans text-[#8E8880]">
                {answers.thoughts ? `${answers.thoughts.length} characters` : 'Required'}
              </span>
            </div>
            <textarea
              rows={5}
              placeholder="Tell us what's on your mind — your preferred gifting ideas, celebration themes, must-have items, timeline, or any specific requirements..."
              value={answers.thoughts || ''}
              onChange={(e) => onChange('thoughts', e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all leading-relaxed"
            />
            <p className="text-[11px] text-[#8E8880] italic">
              Share your thoughts freely. Our master gifting atelier will translate your brief into a tactile bespoke blueprint.
            </p>
          </div>

          {/* Context Organization and Event Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Company / Organization or Family Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Global Advisors or Singhania Family"
                value={answers.company_name || ''}
                onChange={(e) => onChange('company_name', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Occasion / Gathering Type
              </label>
              <input
                type="text"
                placeholder="e.g. Annual Leadership Summit, VIP Gala, Wedding"
                value={answers.event_type || ''}
                onChange={(e) => onChange('event_type', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1.2 COMPANY LOGO & PAYMENT PARAMETERS (SIDE-BY-SIDE: LOGO NEXT TO PAYMENT) */}
      {question.type === 'logo_and_payment' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* COLUMN 1: COMPANY LOGO */}
          <div className="bg-white border border-[#E7E3DC] p-6 sm:p-7 space-y-5 h-full flex flex-col justify-between shadow-subtle">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E3DC] pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#B89B6A]" />
                  <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                    Company Logo & Insignia
                  </h3>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-sans bg-[#FAF8F5] border border-[#B89B6A]/30 text-[#B89B6A] px-2 py-0.5 font-medium">
                  Atelier Die Tooling
                </span>
              </div>
              <p className="font-sans text-xs text-[#5A5A58] leading-relaxed">
                Upload your vector or high-resolution logo (SVG, PNG, JPG, or PDF) for custom brass engraving, blind debossing, or gold foil stamping.
              </p>

              {/* Upload Dropzone / Logo Preview */}
              {answers.logo_url ? (
                <div className="p-5 bg-[#FAF8F5] border border-[#B89B6A]/50 space-y-4">
                  <div className="h-28 flex items-center justify-center p-3 bg-white border border-[#E7E3DC] shadow-xs">
                    <img
                      src={answers.logo_url}
                      alt="Uploaded Company Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#B89B6A] font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Company Logo Attached
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-[#1A1A1A] underline cursor-pointer hover:text-[#B89B6A]">
                        Replace Logo
                        <input
                          type="file"
                          accept=".svg,.png,.jpg,.jpeg,.webp,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'logo_url')}
                          disabled={uploading}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onChange('logo_url', null)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="cursor-pointer border-2 border-dashed border-[#B89B6A]/50 hover:border-[#B89B6A] bg-[#FAF8F5] hover:bg-white p-7 flex flex-col items-center justify-center text-center gap-2.5 transition-all">
                    <div className="w-10 h-10 rounded-full bg-[#B89B6A]/10 flex items-center justify-center text-[#B89B6A]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-sans text-xs font-medium text-[#1A1A1A] block">
                        {uploading ? 'Attaching company logo...' : 'Click or drag company logo here'}
                      </span>
                      <span className="font-sans text-[11px] text-[#8E8880] block mt-0.5">
                        SVG, PNG, JPG, or PDF (Max 10MB)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.webp,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'logo_url')}
                      disabled={uploading}
                    />
                  </label>
                  {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
                </div>
              )}

              {/* Brand Accent Color */}
              <div className="pt-3 border-t border-[#E7E3DC] space-y-2">
                <label className="block font-sans text-xs uppercase tracking-[0.14em] text-[#1A1A1A] font-medium">
                  Primary Brand Color (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={answers.brand_color || '#1A1A1A'}
                    onChange={(e) => onChange('brand_color', e.target.value)}
                    className="w-9 h-9 border border-[#E7E3DC] cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="#1A1A1A"
                    value={answers.brand_color || ''}
                    onChange={(e) => onChange('brand_color', e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#E7E3DC] text-xs font-mono w-28 focus:border-[#B89B6A] focus:outline-none"
                  />
                  <span className="text-[11px] text-[#8E8880]">Box ribbon & lining matching</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#8E8880] italic pt-2 border-t border-[#E7E3DC]/60">
              Our studio engravers review and optimize vector artwork before casting physical branding dies.
            </div>
          </div>

          {/* COLUMN 2: PAYMENT & BUDGET PARAMETERS (DIRECTLY NEXT TO THE COMPANY LOGO!) */}
          <div className="bg-white border border-[#E7E3DC] p-6 sm:p-7 space-y-6 shadow-subtle">
            <div className="flex items-center justify-between border-b border-[#E7E3DC] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#B89B6A]" />
                <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                  Payment & Investment Parameters
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-sans bg-[#FAF8F5] border border-[#B89B6A]/30 text-[#B89B6A] px-2 py-0.5 font-medium">
                Live Pricing
              </span>
            </div>

            {/* Quantity */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block font-sans text-xs uppercase tracking-[0.14em] text-[#1A1A1A] font-medium">
                  Commission Volume (Quantity)
                </label>
                <span className="font-mono text-xs text-[#B89B6A] font-medium">
                  {answers.quantity || 75} units
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="25"
                  max="5000"
                  step="5"
                  value={answers.quantity || 75}
                  onChange={(e) => onChange('quantity', parseInt(e.target.value, 10) || 25)}
                  className="w-28 px-3 py-2 bg-[#FAF8F5] border border-[#E7E3DC] text-sm font-medium text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                />
                <input
                  type="range"
                  min="25"
                  max="1000"
                  step="25"
                  value={answers.quantity || 75}
                  onChange={(e) => onChange('quantity', parseInt(e.target.value, 10) || 25)}
                  className="flex-1 accent-[#B89B6A] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-[#8E8880]">Minimum atelier production commission is 25 pieces.</p>
            </div>

            {/* Budget Per Gift */}
            <div className="space-y-2.5 pt-2 border-t border-[#E7E3DC]">
              <div className="flex items-center justify-between">
                <label className="block font-sans text-xs uppercase tracking-[0.14em] text-[#1A1A1A] font-medium">
                  Target Investment Per Gift
                </label>
                <span className="font-serif text-base font-semibold text-[#1A1A1A]">
                  {formatCurrency(answers.budget_range || 3500)} / gift
                </span>
              </div>
              <input
                type="range"
                min="1500"
                max="15000"
                step="500"
                value={answers.budget_range || 3500}
                onChange={(e) => onChange('budget_range', parseInt(e.target.value, 10) || 3500)}
                className="w-full accent-[#B89B6A] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8E8880] font-mono">
                <span>₹1,500</span>
                <span>₹5,000</span>
                <span>₹10,000</span>
                <span>₹15,000+</span>
              </div>
            </div>

            {/* Live Payment Breakdown Card */}
            <div className="p-4 bg-[#FAF8F5] border border-[#E7E3DC] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#5A5A58]">
                <span>Indicative Total Payment:</span>
                <span className="font-serif text-lg font-normal text-[#1A1A1A]">
                  {formatCurrency((answers.budget_range || 3500) * (answers.quantity || 75) * 0.9)} &ndash; {formatCurrency((answers.budget_range || 3500) * (answers.quantity || 75) * 1.1)}
                </span>
              </div>

              <div className="text-[11px] text-[#8E8880] space-y-1 pt-2 border-t border-[#E7E3DC]/60">
                <p>• <b>Payment Terms:</b> 50% advance deposit upon physical sample sign-off, 50% prior to white-glove dispatch.</p>
                <p>• <b>Invoicing:</b> Official GST invoice with ITC eligibility included.</p>
              </div>

              {/* Co-Branded Seal Right Next to the Payment */}
              <div className="pt-2 flex items-center justify-between border-t border-[#E7E3DC]/60 text-[10px] text-[#B89B6A]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B89B6A]" />
                  <span className="uppercase tracking-wider font-sans font-medium">Payment Protection</span>
                </div>
                {answers.logo_url && (
                  <div className="flex items-center gap-2 pl-2">
                    <img src={answers.logo_url} alt="Logo preview" className="h-5 max-w-[40px] object-contain" />
                    <span className="text-[10px] text-[#1A1A1A] font-serif font-medium">✕ Shvom Atelier</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEXT SPLIT FIELDS */}
      {question.type === 'text_split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {question.fields.map((field) => (
            <div
              key={field.name}
              className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
            >
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                {field.label} {field.required && <span className="text-[#B89B6A]">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  placeholder={field.placeholder}
                  value={answers[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all"
                />
              ) : (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={answers[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. MULTISELECT CHIPS */}
      {question.type === 'multiselect_chips' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((opt) => {
            const currentList = Array.isArray(answers[question.id]) ? answers[question.id] : [];
            const isSelected = currentList.includes(opt.value);

            const handleToggle = () => {
              if (isSelected) {
                onChange(
                  question.id,
                  currentList.filter((v) => v !== opt.value)
                );
              } else {
                onChange(question.id, [...currentList, opt.value]);
              }
            };

            return (
              <button
                key={opt.value}
                type="button"
                onClick={handleToggle}
                className={`p-5 text-left border transition-all duration-200 flex items-start justify-between ${
                  isSelected
                    ? 'border-[#B89B6A] bg-white shadow-subtle ring-1 ring-[#B89B6A]'
                    : 'border-[#E7E3DC] bg-white/60 hover:border-[#1A1A1A]/40'
                }`}
              >
                <div>
                  <h4 className="font-serif text-lg text-[#1A1A1A] font-normal">{opt.label}</h4>
                  <p className="font-sans text-xs text-[#5A5A58] mt-1">{opt.description}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-sm border shrink-0 mt-0.5 flex items-center justify-center ${
                    isSelected ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' : 'border-[#D3CEC4]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. BRANDING AESTHETIC & LOGO */}
      {question.type === 'branding_aesthetic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {question.tone_options.map((tone) => {
              const isSelected = answers.corporate_tone === tone.value;
              return (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => onChange('corporate_tone', tone.value)}
                  className={`p-5 text-left border transition-all duration-200 ${
                    isSelected
                      ? 'border-[#B89B6A] bg-white shadow-subtle ring-1 ring-[#B89B6A]'
                      : 'border-[#E7E3DC] bg-white/60 hover:border-[#1A1A1A]/40'
                  }`}
                >
                  <h4 className="font-serif text-base text-[#1A1A1A] font-medium">{tone.label}</h4>
                  <p className="font-sans text-xs text-[#5A5A58] mt-1.5 leading-relaxed">
                    {tone.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Color & Logo Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E7E3DC]">
            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Primary Brand Color (Optional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={answers.brand_color || '#1A1A1A'}
                  onChange={(e) => onChange('brand_color', e.target.value)}
                  className="w-10 h-10 border border-[#E7E3DC] cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  placeholder="#1A1A1A"
                  value={answers.brand_color || ''}
                  onChange={(e) => onChange('brand_color', e.target.value)}
                  className="px-3 py-2 bg-white border border-[#E7E3DC] text-xs font-mono w-32 focus:border-[#B89B6A] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Upload Insignia / Vector Logo (Optional)
              </label>
              <label className="cursor-pointer border border-dashed border-[#B89B6A] bg-white/70 hover:bg-white p-4 flex items-center justify-center gap-3 transition-colors text-xs text-[#5A5A58]">
                <Upload className="w-4 h-4 text-[#B89B6A]" />
                <span>
                  {uploading
                    ? 'Uploading insignia...'
                    : answers.logo_url
                    ? 'Insignia attached (click to replace)'
                    : 'Choose SVG / PNG / PDF file (Max 10MB)'}
                </span>
                <input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'logo_url')}
                  disabled={uploading}
                />
              </label>
              {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 5. WEDDING IDENTITY */}
      {question.type === 'wedding_identity' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {question.fields.map((field) => (
            <div
              key={field.name}
              className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-3' : ''}`}
            >
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                {field.label} {field.required && <span className="text-[#B89B6A]">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  placeholder={field.placeholder}
                  value={answers[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all"
                />
              ) : (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={answers[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-[#E7E3DC] text-sm text-[#1A1A1A] placeholder:text-[#8E8880]/60 focus:outline-none focus:border-[#B89B6A] focus:ring-1 focus:ring-[#B89B6A] transition-all"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. BUDGET AND QUANTITY */}
      {question.type === 'budget_and_quantity' && (
        <div className="space-y-8 bg-white p-6 md:p-8 border border-[#E7E3DC]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quantity */}
            <div className="space-y-3">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Quantity of Gifts (Minimum 25 units)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="25"
                  max="5000"
                  step="5"
                  value={answers.quantity || 75}
                  onChange={(e) => onChange('quantity', parseInt(e.target.value) || 25)}
                  className="w-36 px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-base font-medium text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
                />
                <span className="text-xs text-[#8E8880]">Handcrafted bespoke pieces</span>
              </div>
            </div>

            {/* Budget Per Gift */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                  Approximate Budget Target
                </label>
                <span className="font-serif text-lg font-medium text-[#1A1A1A]">
                  {formatCurrency(answers.budget_range || 3500)} / gift
                </span>
              </div>
              <input
                type="range"
                min="1500"
                max="12000"
                step="500"
                value={answers.budget_range || 3500}
                onChange={(e) => onChange('budget_range', parseInt(e.target.value))}
                className="w-full accent-[#B89B6A] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#8E8880]">
                <span>₹1,500</span>
                <span>₹5,000</span>
                <span>₹12,000+</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E3DC] flex items-center gap-3">
            <input
              type="checkbox"
              id="flexible_budget"
              checked={!!answers.flexible_budget}
              onChange={(e) => onChange('flexible_budget', e.target.checked)}
              className="w-4 h-4 rounded border-[#E7E3DC] text-[#1A1A1A] focus:ring-[#B89B6A] accent-[#1A1A1A]"
            />
            <label htmlFor="flexible_budget" className="text-xs text-[#5A5A58] cursor-pointer">
              I am open to Shvom atelier curations and recommendations outside this strict range.
            </label>
          </div>
        </div>
      )}

      {/* 7. CONTACT AND LOGISTICS */}
      {question.type === 'contact_and_logistics' && (
        <div className="space-y-6 bg-white p-6 md:p-8 border border-[#E7E3DC]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Your Full Name <span className="text-[#B89B6A]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Radhika Singhania"
                value={answers.client_name || ''}
                onChange={(e) => onChange('client_name', e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Email Address <span className="text-[#B89B6A]">*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. radhika@singhania.com"
                value={answers.client_email || ''}
                onChange={(e) => onChange('client_email', e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Phone / WhatsApp <span className="text-[#B89B6A]">*</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98200 00000"
                value={answers.client_phone || ''}
                onChange={(e) => onChange('client_phone', e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Destination City / Country <span className="text-[#B89B6A]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Rajasthan, Dubai"
                value={answers.delivery_city || ''}
                onChange={(e) => onChange('delivery_city', e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Required Delivery Date <span className="text-[#B89B6A]">*</span>
              </label>
              <input
                type="date"
                value={answers.delivery_date || ''}
                onChange={(e) => onChange('delivery_date', e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                Bespoke Reference Image (Optional)
              </label>
              <label className="cursor-pointer border border-[#E7E3DC] bg-[#FAF8F5] hover:bg-white p-3 flex items-center justify-center gap-2 text-xs text-[#5A5A58]">
                <Upload className="w-3.5 h-3.5 text-[#B89B6A]" />
                <span>{answers.reference_image_url ? 'Reference image uploaded' : 'Attach moodboard or reference'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'reference_image_url')}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
              Special Atelier Notes & Sensory Preferences (Optional)
            </label>
            <textarea
              rows="3"
              placeholder="Mention dietary preferences for confectionery, preferred wood finishes, specific scent profiles, or guest list requirements..."
              value={answers.special_notes || ''}
              onChange={(e) => onChange('special_notes', e.target.value)}
              className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E7E3DC] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#B89B6A]"
            />
          </div>

          <div className="pt-4 border-t border-[#E7E3DC] flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={!!answers.consent}
              onChange={(e) => onChange('consent', e.target.checked)}
              className="w-4 h-4 rounded border-[#E7E3DC] text-[#1A1A1A] focus:ring-[#B89B6A] accent-[#1A1A1A] mt-0.5"
            />
            <label htmlFor="consent" className="text-xs text-[#5A5A58] cursor-pointer leading-relaxed">
              I consent to Shvom contacting me with this formal bespoke gift blueprint and quotation. All information remains strictly confidential under our concierge privacy standards.
            </label>
          </div>
        </div>
      )}
    </motion.div>
  );
}
