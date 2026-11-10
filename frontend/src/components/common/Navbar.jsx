import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Building2, Sparkles, CreditCard, Truck } from 'lucide-react';
import { BRAND } from '../../config/brand';
import Button from './Button';
import PaymentModal from './PaymentModal';
import TrackOrderModal from './TrackOrderModal';
import { useRealm } from '../../context/RealmContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const location = useLocation();
  const { mode, setMode, isWedding, isCorporate } = useRealm();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: isWedding ? 'Wedding Gifts' : 'Corporate Gifts', path: isWedding ? '/weddings' : '/corporate' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  // Segmented Pill Toggle Component
  const renderToggle = (isDrawer = false) => (
    <div
      className={`relative inline-flex items-center p-0.5 sm:p-1 rounded-full transition-all duration-300 shadow-2xs ${
        isWedding
          ? 'bg-[#F2ECE4] border border-[#E4D9CC]'
          : 'bg-[#F0EDE6] border border-[#E2DDD5]'
      } ${isDrawer ? 'w-full justify-between' : ''}`}
      role="group"
      aria-label="Occasion Toggle"
    >
      {/* Corporate Button */}
      <button
        type="button"
        onClick={() => setMode('corporate')}
        className={`relative z-10 flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-sans tracking-[0.14em] uppercase transition-all duration-300 ${
          isDrawer ? 'flex-1' : ''
        } ${
          isCorporate
            ? 'text-[#FAF8F5] font-medium'
            : 'text-[#5A5A58] hover:text-[#1A1A1A]'
        }`}
        aria-label="Corporate Gifting Realm"
        aria-pressed={isCorporate}
      >
        <Building2 className={`w-3 h-3 ${isCorporate ? 'text-[#B89B6A]' : 'text-[#8E8880]'}`} />
        <span>Corporate</span>
      </button>

      {/* Wedding Button */}
      <button
        type="button"
        onClick={() => setMode('wedding')}
        className={`relative z-10 flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-sans tracking-[0.14em] uppercase transition-all duration-300 ${
          isDrawer ? 'flex-1' : ''
        } ${
          isWedding
            ? 'text-[#FAF8F5] font-medium'
            : 'text-[#5A5A58] hover:text-[#1A1A1A]'
        }`}
        aria-label="Wedding Keepsakes Realm"
        aria-pressed={isWedding}
      >
        <Sparkles className={`w-3 h-3 ${isWedding ? 'text-[#FAF8F5]' : 'text-[#8E8880]'}`} />
        <span>Wedding</span>
      </button>

      {/* Sliding Pill Indicator */}
      <div
        className={`absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 rounded-full transition-all duration-300 ease-out shadow-xs ${
          isDrawer
            ? (isCorporate ? 'left-0.5 w-[calc(50%-2px)] bg-[#1A1A1A]' : 'left-[50%] w-[calc(50%-2px)] bg-[#B89B6A]')
            : (isCorporate ? 'left-0.5 sm:left-1 w-[calc(50%-2px)] sm:w-[calc(50%-4px)] bg-[#1A1A1A]' : 'left-[calc(50%+1px)] sm:left-[calc(50%+2px)] w-[calc(50%-2px)] sm:w-[calc(50%-4px)] bg-[#B89B6A]')
        }`}
      />
    </div>
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? isWedding
              ? 'bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#EAE3D8] py-3.5 shadow-xs'
              : 'bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E7E3DC] py-3.5 shadow-xs'
            : 'bg-transparent py-5 sm:py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Wordmark + Desktop Realm Toggle */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              to="/"
              className="group flex items-center gap-1.5 sm:gap-2 text-decoration-none focus:outline-none shrink-0"
              aria-label={`${BRAND.name} Home`}
            >
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-normal tracking-[0.16em] sm:tracking-[0.24em] text-[#1A1A1A] transition-colors group-hover:text-[#B89B6A]">
                {BRAND.name.toUpperCase()}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${isWedding ? 'bg-[#C29F72]' : 'bg-[#B89B6A]'} opacity-80`} />
            </Link>

            {/* Desktop Mode Toggle */}
            <div className="hidden md:inline-flex">
              {renderToggle(false)}
            </div>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-sans text-xs tracking-[0.16em] uppercase transition-colors duration-200 relative py-1 ${
                    active ? 'text-[#1A1A1A] font-medium' : 'text-[#5A5A58] hover:text-[#1A1A1A]'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className={`absolute bottom-0 left-0 right-0 h-[1.5px] ${isWedding ? 'bg-[#C29F72]' : 'bg-[#B89B6A]'}`} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: CTA & Mobile Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Tablet-only toggle (between md and lg) */}
            <div className="hidden sm:inline-flex md:hidden">
              {renderToggle(false)}
            </div>

            {/* Mobile Header Compact Toggle (< sm) */}
            <div className="sm:hidden">
              <button
                onClick={() => setMode(isCorporate ? 'wedding' : 'corporate')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-sans tracking-[0.12em] uppercase border flex items-center gap-1 transition-all ${
                  isWedding
                    ? 'bg-[#B89B6A] text-white border-[#B89B6A]'
                    : 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                }`}
                title="Tap to toggle Corporate / Wedding"
              >
                {isWedding ? <Sparkles className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                <span>{isWedding ? 'Wedding' : 'Corporate'}</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <Link
              to={isWedding ? '/designer?occasion=wedding' : '/designer'}
              className="hidden sm:inline-block"
            >
              <Button
                size="sm"
                variant={isWedding ? 'gold' : 'primary'}
                icon={ArrowUpRight}
                className={isWedding ? 'bg-[#B89B6A] hover:bg-[#A6885A] text-white border-none' : ''}
              >
                {isWedding ? 'Curate Wedding Gift' : 'Begin your gift'}
              </Button>
            </Link>

            {/* Track Button — visible on desktop */}
            <button
              id="navbar-track-btn"
              onClick={() => setTrackModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E7E3DC] text-[#5A5A58] hover:border-[#B89B6A] hover:text-[#1A1A1A] font-sans text-[11px] tracking-[0.14em] uppercase transition-all duration-200 focus:outline-none"
              aria-label="Track order by invoice or reference"
            >
              <Truck className="w-3.5 h-3.5 text-[#B89B6A]" />
              Track
            </button>

            {/* Pay Button — visible on desktop */}
            <button
              id="navbar-pay-btn"
              onClick={() => setPayModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#B89B6A] text-[#B89B6A] hover:bg-[#B89B6A] hover:text-white font-sans text-[11px] tracking-[0.14em] uppercase transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#B89B6A]"
              aria-label="Open payment portal"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Pay
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-[#1A1A1A] hover:text-[#B89B6A] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div
          className={`fixed inset-0 z-50 lg:hidden flex flex-col justify-between p-6 sm:p-8 pt-20 overflow-y-auto max-h-screen animate-in fade-in duration-300 ${
            isWedding ? 'bg-[#FAF6F0]' : 'bg-[#FAF8F5]'
          }`}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-5 right-5 p-2 text-[#1A1A1A] hover:text-[#B89B6A] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col space-y-6">
            {/* Header Brand Wordmark & Mode in Drawer */}
            <div>
              <span className="font-serif text-2xl tracking-[0.2em] text-[#1A1A1A]">
                {BRAND.name.toUpperCase()}
              </span>
              <p className="font-serif italic text-xs text-[#B89B6A] mt-0.5">
                {isWedding ? 'Luxury Wedding Return Gifts' : BRAND.tagline}
              </p>
            </div>

            {/* Drawer Realm Selector */}
            <div className="p-3 bg-white border border-[#E7E3DC] rounded-xl space-y-2">
              <span className="block font-sans text-[10px] uppercase tracking-[0.2em] text-[#8E8880] font-medium">
                Select Occasion
              </span>
              {renderToggle(true)}
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col space-y-4 pt-2">
              <Link
                to={isWedding ? '/weddings' : '/corporate'}
                className="font-serif text-xl sm:text-2xl font-light text-[#1A1A1A] hover:text-[#B89B6A] transition-colors py-1 flex items-center justify-between"
              >
                <span>{isWedding ? 'Wedding Gifts' : 'Corporate Gifts'}</span>
                <span className="text-xs uppercase tracking-wider text-[#B89B6A] font-sans font-normal">Active</span>
              </Link>
              <Link
                to={isWedding ? '/corporate' : '/weddings'}
                className="font-serif text-xl sm:text-2xl font-light text-[#5A5A58] hover:text-[#1A1A1A] transition-colors py-1"
                onClick={() => setMode(isWedding ? 'corporate' : 'wedding')}
              >
                {isWedding ? 'Corporate Gifts' : 'Wedding Gifts'}
              </Link>
              <Link
                to="/gallery"
                className="font-serif text-xl sm:text-2xl font-light text-[#1A1A1A] hover:text-[#B89B6A] transition-colors py-1"
              >
                Gallery
              </Link>
              <Link
                to="/about"
                className="font-serif text-xl sm:text-2xl font-light text-[#1A1A1A] hover:text-[#B89B6A] transition-colors py-1"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="font-serif text-xl sm:text-2xl font-light text-[#1A1A1A] hover:text-[#B89B6A] transition-colors py-1"
              >
                Contact
              </Link>

              {/* Track — mobile drawer */}
              <button
                id="drawer-track-btn"
                onClick={() => { setMobileOpen(false); setTrackModalOpen(true); }}
                className="flex items-center gap-2 font-serif text-xl sm:text-2xl font-light text-[#1A1A1A] hover:text-[#B89B6A] transition-colors py-1 text-left"
                aria-label="Track order"
              >
                <Truck className="w-5 h-5 text-[#B89B6A]" />
                Track Order
              </button>

              {/* Pay — mobile drawer */}
              <button
                id="drawer-pay-btn"
                onClick={() => { setMobileOpen(false); setPayModalOpen(true); }}
                className="flex items-center gap-2 font-serif text-xl sm:text-2xl font-light text-[#B89B6A] hover:text-[#A6885A] transition-colors py-1 text-left"
                aria-label="Open payment portal"
              >
                <CreditCard className="w-5 h-5" />
                Pay
              </button>
            </nav>

            {/* Drawer CTA */}
            <div className="pt-2">
              <Link
                to={isWedding ? '/designer?occasion=wedding' : '/designer'}
                className="block w-full"
              >
                <Button
                  size="lg"
                  variant={isWedding ? 'gold' : 'primary'}
                  className="w-full justify-center"
                  icon={ArrowUpRight}
                >
                  {isWedding ? 'Curate Wedding Gift' : 'Begin your gift'}
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-t border-[#E7E3DC] pt-6 mt-8 flex flex-col space-y-2 text-xs text-[#5A5A58]">
            <p className="font-medium text-[#1A1A1A]">{BRAND.contact.email}</p>
            <p>{BRAND.contact.supportEmail || 'support@shvom.in'}</p>
            <Link to="/admin" className="text-[#8E8880] hover:text-[#1A1A1A] pt-2 inline-block">
              Concierge Access &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} />

      {/* Track Order Modal */}
      <TrackOrderModal isOpen={trackModalOpen} onClose={() => setTrackModalOpen(false)} />
    </>
  );
}
