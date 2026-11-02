import React from 'react';
import { motion } from 'framer-motion';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  icon: Icon = null,
  iconPosition = 'right',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-sans tracking-[0.14em] uppercase text-xs transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-[#B89B6A] focus:ring-offset-2 focus:ring-offset-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[#1A1A1A] text-[#FAF8F5] hover:bg-[#2C2B29] active:bg-[#000000] border border-[#1A1A1A] shadow-sm',
    secondary:
      'bg-[#FAF8F5] text-[#1A1A1A] border border-[#B89B6A] hover:bg-[#B89B6A]/10 active:bg-[#B89B6A]/20 text-[#1A1A1A]',
    outline:
      'bg-transparent text-[#1A1A1A] border border-[#D3CEC4] hover:border-[#1A1A1A] hover:bg-black/5',
    gold:
      'bg-[#B89B6A] text-[#FAF8F5] hover:bg-[#A58857] active:bg-[#8D7243] border border-[#B89B6A]',
    ghost:
      'bg-transparent text-[#1A1A1A] hover:text-[#B89B6A] border-b border-transparent hover:border-[#B89B6A] px-0'
  };

  const sizes = {
    sm: 'px-4 py-2 text-[11px]',
    md: 'px-6 py-3.5 text-xs',
    lg: 'px-8 py-4 text-xs'
  };

  const currentSize = variant === 'ghost' ? 'py-1 text-xs' : sizes[size] || sizes.md;

  return (
    <motion.button
      whileTap={disabled || loading ? {} : { scale: 0.985 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${currentSize} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Curating...</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2.5">
          {Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />}
        </span>
      )}
    </motion.button>
  );
}
