import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowUpRight } from 'lucide-react';
import { BRAND } from '../../config/brand';

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-[#FAF8F5] pt-20 pb-12 border-t border-[#2C2B29]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          {/* Brand Col */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-serif text-3xl tracking-[0.24em] font-normal text-[#FAF8F5]">
                {BRAND.name.toUpperCase()}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#B89B6A]" />
            </div>
            <p className="font-serif italic text-sm text-[#B89B6A]">
              {BRAND.tagline}
            </p>
            <p className="font-sans text-xs text-[#8E8880] leading-relaxed max-w-sm pt-2">
              {BRAND.philosophy}
            </p>
          </div>

          {/* Quick Nav */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium mb-4">
              Commissions
            </h4>
            <ul className="space-y-2.5 text-xs text-[#E7E3DC]/80 font-light">
              <li>
                <Link to="/corporate" className="hover:text-[#B89B6A] transition-colors">
                  Corporate Galas
                </Link>
              </li>
              <li>
                <Link to="/weddings" className="hover:text-[#B89B6A] transition-colors">
                  Luxury Weddings
                </Link>
              </li>
              <li>
                <Link to="/designer" className="hover:text-[#B89B6A] transition-colors flex items-center gap-1">
                  <span>Gift Designer</span>
                  <ArrowUpRight className="w-3 h-3 text-[#B89B6A]" />
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-[#B89B6A] transition-colors">
                  Curated Archives
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#B89B6A] transition-colors">
                  Atelier & Craft
                </Link>
              </li>
            </ul>
          </div>

          {/* Concierge & Contact */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium mb-4">
              Concierge Atelier
            </h4>
            <ul className="space-y-3 text-xs text-[#E7E3DC]/80 font-light">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#B89B6A] shrink-0" />
                <a href={`mailto:${BRAND.contact.email}`} className="hover:text-[#B89B6A] transition-colors">
                  {BRAND.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#B89B6A] shrink-0" />
                <a href={`mailto:${BRAND.contact.supportEmail || 'support@shvom.in'}`} className="hover:text-[#B89B6A] transition-colors">
                  {BRAND.contact.supportEmail || 'support@shvom.in'}
                </a>
              </li>
            </ul>
          </div>

          {/* Atelier Hours & Private Bookings */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#B89B6A] font-medium mb-4">
              Private Hours
            </h4>
            <p className="text-xs text-[#8E8880] leading-relaxed">
              {BRAND.contact.hours}
            </p>
            <div className="pt-2">
              <Link
                to="/contact"
                className="inline-block text-[11px] uppercase tracking-[0.16em] text-[#FAF8F5] border-b border-[#B89B6A] pb-0.5 hover:text-[#B89B6A] transition-colors"
              >
                Schedule Atelier Visit
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#2C2B29] pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#8E8880] font-light text-center md:text-left gap-4">
          <p>
            &copy; {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <Link to="/admin" className="hover:text-[#FAF8F5] transition-colors opacity-75 hover:opacity-100 underline sm:no-underline">
              Concierge Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
