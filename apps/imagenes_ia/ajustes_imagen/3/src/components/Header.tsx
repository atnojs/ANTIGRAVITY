import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Calendar, Globe, ChevronDown } from 'lucide-react';
import { Language, Translations } from '../types';
import Logo from './Logo';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  translations: Translations;
}

export default function Header({ currentLang, onLanguageChange, translations }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 'about', label: translations.nav.about },
    { id: 'menu', label: translations.nav.menu },
    { id: 'sports', label: translations.nav.sports },
    { id: 'music', label: translations.nav.music },
    { id: 'gallery', label: translations.nav.gallery },
    { id: 'schedule', label: translations.nav.schedule },
    { id: 'reviews', label: translations.nav.reviews },
    { id: 'contact', label: translations.nav.contact },
  ];

  const languages = [
    { code: 'es' as Language, label: 'Español', flag: '🇪🇸' },
    { code: 'en' as Language, label: 'English', flag: '🇬🇧' },
    { code: 'de' as Language, label: 'Deutsch', flag: '🇩🇪' },
  ];

  const currentLanguageObj = languages.find((l) => l.code === currentLang) || languages[0];

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#121211]/95 backdrop-blur-md shadow-lg border-b border-white/10 py-3'
          : 'bg-gradient-to-b from-[#0d0d0c]/80 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => scrollToSection('hero')}
            id="header-brand-logo"
          >
            <Logo variant="header" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1" id="desktop-navbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="px-3 py-2 rounded-sm font-sans text-xs xl:text-sm font-medium text-gray-350 hover:text-[#c4a484] hover:bg-white/5 transition-all duration-200 cursor-pointer"
                id={`nav-${item.id}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions: Lang Selector & Reserve CTA */}
          <div className="hidden sm:flex items-center space-x-4" id="desktop-actions">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                onBlur={() => setTimeout(() => setIsLangDropdownOpen(false), 200)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#c4a484] text-xs font-semibold tracking-wide border border-[#c4a484]/20 transition-all duration-200 cursor-pointer outline-none"
                id="btn-language-selector"
              >
                <span>{currentLanguageObj.flag}</span>
                <span className="uppercase">{currentLanguageObj.code}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {isLangDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-36 bg-[#121211] border border-white/10 rounded-sm shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  id="lang-dropdown-menu"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`flex items-center space-x-2 w-full px-4 py-2 text-left text-xs font-sans tracking-wide transition-colors duration-150 cursor-pointer ${
                        currentLang === lang.code
                          ? 'bg-[#c4a484]/15 text-[#c4a484] font-semibold'
                          : 'text-gray-300 hover:bg-white/5 hover:text-[#c4a484]'
                      }`}
                      id={`lang-select-${lang.code}`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* General CTA Table Booking */}
            <button
              onClick={() => scrollToSection('contact')}
              className="flex items-center space-x-2 bg-[#c4a484] hover:bg-[#b39374] text-black px-6 py-2.5 rounded-sm font-sans text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
              id="header-btn-reserve"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{translations.hero.ctaReserve}</span>
            </button>
          </div>

          {/* Mobile Buttons */}
          <div className="flex items-center lg:hidden space-x-2" id="mobile-actions">
            {/* Direct Phone / Call for Quick Access */}
            <a
              href="tel:+34900123456"
              className="p-2 rounded-full bg-white/5 text-[#c4a484] hover:text-[#b39374] active:bg-white/10 sm:hidden"
              aria-label="Call Cafeteria"
              id="header-phone-quick"
            >
              <Phone className="w-4 h-4" />
            </a>

            {/* Language Selector for mobile (quick pill toggles loop) */}
            <button
              onClick={() => {
                const currentIndex = languages.findIndex((l) => l.code === currentLang);
                const nextIndex = (currentIndex + 1) % languages.length;
                onLanguageChange(languages[nextIndex].code);
              }}
              className="flex items-center justify-center p-2 rounded-full bg-[#121211] border border-white/10 text-xs font-sans text-[#c4a484] sm:hidden cursor-pointer"
              title="Change Language"
              id="lang-quick-toggle-mobile"
            >
              <span className="mr-1">{currentLanguageObj.flag}</span>
              <span className="uppercase text-[9px] font-bold">{currentLanguageObj.code}</span>
            </button>

            {/* Language Dropdown for tablets */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-white/5 text-[#c4a484] text-xs font-semibold cursor-pointer"
                id="btn-lang-tablet"
              >
                <span>{currentLanguageObj.flag}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-[#121211] border border-white/10 rounded-sm shadow-xl py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5 cursor-pointer"
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-white hover:text-[#c4a484] active:bg-white/10 cursor-pointer"
              aria-label="Toggle Menu"
              id="btn-hamburger"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden absolute top-full left-0 w-full bg-[#121211]/98 backdrop-blur-lg border-b border-white/10 shadow-2xl py-4"
          id="mobile-drawer-menu"
        >
          <div className="px-4 pt-2 pb-4 space-y-1 sm:px-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left px-4 py-3 rounded-sm text-base font-medium text-gray-200 hover:text-[#c4a484] hover:bg-white/5 transition-colors"
                id={`nav-mobile-${item.id}`}
              >
                {item.label}
              </button>
            ))}

            <div className="pt-4 pb-2 px-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Language Options Drawer Row */}
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#c4a484]" />
                <span className="text-xs text-gray-400 font-sans mr-2">Idioma:</span>
                <div className="flex space-x-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => onLanguageChange(lang.code)}
                      className={`px-2.5 py-1 rounded-sm border text-xs flex items-center space-x-1 transition-all ${
                        currentLang === lang.code
                          ? 'bg-[#c4a484] text-black border-[#c4a484] font-bold'
                          : 'bg-[#121211] text-gray-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="uppercase font-mono">{lang.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking CTA for Mobile Drawer */}
              <button
                onClick={() => scrollToSection('contact')}
                className="w-full flex items-center justify-center space-x-2 bg-[#c4a484] hover:bg-[#b39374] text-black py-3 rounded-sm font-sans font-bold uppercase tracking-wider text-sm shadow-md"
                id="drawer-btn-reserve"
              >
                <Calendar className="w-4 h-4" />
                <span>{translations.hero.ctaReserve}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
