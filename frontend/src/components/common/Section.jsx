import React from 'react';
import { motion } from 'framer-motion';

export default function Section({
  children,
  className = '',
  tag = '',
  title = '',
  subtitle = '',
  align = 'center',
  maxWidth = 'max-w-7xl',
  id = '',
  divider = false
}) {
  const alignClass = {
    center: 'text-center items-center',
    left: 'text-left items-start',
    right: 'text-right items-end'
  }[align] || 'text-center items-center';

  return (
    <section id={id} className={`relative py-20 md:py-28 px-6 md:px-12 ${className}`}>
      {divider && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[1px] bg-[#B89B6A]/30" />
      )}
      
      <div className={`mx-auto ${maxWidth}`}>
        {(tag || title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`flex flex-col ${alignClass} mb-12 md:mb-16 space-y-3.5`}
          >
            {tag && (
              <span className="font-sans text-[11px] tracking-[0.28em] uppercase text-[#B89B6A] font-medium">
                {tag}
              </span>
            )}
            {title && (
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal tracking-[-0.01em] text-[#1A1A1A] leading-[1.2]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="font-sans text-sm md:text-base font-light text-[#5A5A58] max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        {children}
      </div>
    </section>
  );
}
