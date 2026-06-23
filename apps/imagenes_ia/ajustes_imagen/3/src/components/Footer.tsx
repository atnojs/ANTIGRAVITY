import React from 'react';
import { Calendar, Phone, Mail, MapPin, Globe, Compass } from 'lucide-react';
import { Language, Translations } from '../types';
import Logo from './Logo';

interface FooterProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  translations: Translations;
}

export default function Footer({ currentLang, onLanguageChange, translations }: FooterProps) {
  const languages = [
    { code: 'es' as Language, label: 'ES', flag: '🇪🇸' },
    { code: 'en' as Language, label: 'EN', flag: '🇬🇧' },
    { code: 'de' as Language, label: 'DE', flag: '🇩🇪' },
  ];

  const scrollToSection = (id: string) => {
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

  const handleLegalAlert = (title: string) => {
    const textMsg = 
      currentLang === 'es' 
        ? `Sección en preparación: El documento de '${title}' se encuentra bajo revisión del departamento jurídico para la normativa local de Málaga.`
        : `Under review: The document for '${title}' is currently being updated by our Malaga resort legal advising desk.`;
    alert(textMsg);
  };

  return (
    <footer className="bg-[#111110] border-t border-white/10 text-gray-400 font-sans" id="main-footer">
      
      {/* Top Footer widget area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-12" id="footer-widgets">
        
        {/* Column 1: Brand pitch & Socials */}
        <div className="space-y-5" id="footer-widget-brand">
          <div className="flex items-center cursor-pointer" onClick={() => scrollToSection('hero')}>
            <Logo variant="header" />
          </div>
          <p className="text-xs sm:text-sm text-gray-450 leading-relaxed">
            {translations.footer.desc}
          </p>

          {/* Social icons */}
          <div className="flex space-x-3 pt-2" id="footer-social-icons">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-sm bg-[#161615] border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#c4a484] hover:bg-black transition-colors"
              title="Instagram"
            >
              <span className="text-xs font-mono font-bold">IG</span>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-sm bg-[#161615] border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#c4a484] hover:bg-black transition-colors"
              title="Facebook"
            >
              <span className="text-xs font-mono font-bold">FB</span>
            </a>
            <a
              href="https://tripadvisor.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-sm bg-[#161615] border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#c4a484] hover:bg-black transition-colors"
              title="TripAdvisor"
            >
              <span className="text-xs font-mono font-bold">TA</span>
            </a>
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-sm bg-[#161615] border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#c4a484] hover:bg-black transition-colors"
              title="Google Location Map"
            >
              <span className="text-xs font-mono font-bold">MAP</span>
            </a>
          </div>
        </div>

        {/* Column 2: Hours recap */}
        <div className="space-y-4" id="footer-widget-hours">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c4a484]">
            {translations.schedule.title}
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="font-semibold text-gray-300">{translations.schedule.weekdays}</span>
              <span className="font-mono text-[#c4a484]">{translations.schedule.weekdaysTime}</span>
            </li>
            <li className="flex justify-between border-b border-white/5 pb-1.5">
              <span className="font-semibold text-gray-300">{translations.schedule.weekends}</span>
              <span className="font-mono text-[#c4a484] font-bold">{translations.schedule.weekendsTime}</span>
            </li>
            <li className="flex justify-between pb-1">
              <span className="font-semibold text-gray-300">{translations.schedule.specialEvents}</span>
              <span className="font-mono text-gray-300">{translations.schedule.specialEventsTime}</span>
            </li>
          </ul>
        </div>

        {/* Column 3: Contact highlights */}
        <div className="space-y-4" id="footer-widget-contact">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c4a484]">
            {translations.contact.contactInfo}
          </h4>
          <ul className="space-y-3 text-xs sm:text-sm">
            <li className="flex items-start space-x-2.5">
              <Phone className="w-4 h-4 text-[#c4a484] shrink-0 mt-0.5" />
              <a href="tel:+34900123456" className="font-sans hover:text-[#c4a484] hover:underline">
                +34 900 123 456
              </a>
            </li>
            <li className="flex items-start space-x-2.5">
              <Mail className="w-4 h-4 text-[#c4a484] shrink-0 mt-0.5" />
              <a href="mailto:reservas@consentidosbistrot.com" className="font-sans hover:text-[#c4a484] hover:underline break-all">
                reservas@consentidosbistrot.com
              </a>
            </li>
            <li className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-[#c4a484] shrink-0 mt-0.5" />
              <span className="text-gray-400 font-sans leading-snug">
                Marina Bay, Bloque C-2, Mijas Costa, Málaga.
              </span>
            </li>
          </ul>
        </div>

        {/* Column 4: Apartments info & Quick language change */}
        <div className="space-y-4" id="footer-widget-resort">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c4a484]">
            Resort Navigation
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            {currentLang === 'es' && 'Diseñado específicamente para asegurar el trato premium a los residentes de los apartamentos Marina Bay y huéspedes de paso.'}
            {currentLang === 'en' && 'Tailored specifically to safeguard premium attention for Marina Bay apartment tenants and visitors.'}
            {currentLang === 'de' && 'Speziell darauf zugeschnitten, den Eigentümern der Marina Bay-Apartments und Gästen erstklassige Aufmerksamkeit zu widmen.'}
          </p>

          <div className="pt-2" id="footer-lang-button-trio">
            <span className="block text-[9px] font-mono tracking-widest uppercase text-gray-550 mb-2">
              Changer Lang / Switch:
            </span>
            <div className="flex space-x-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`py-1 px-2.5 rounded-sm text-[11px] font-mono font-bold tracking-wider uppercase border cursor-pointer transition-colors ${
                    currentLang === lang.code
                      ? 'bg-[#c4a484] text-black border-[#c4a484]'
                      : 'bg-[#161615] text-gray-400 border-white/5 hover:bg-black hover:text-white'
                  }`}
                >
                  <span className="mr-1">{lang.flag}</span>
                  <span>{lang.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom copyrights row & policies links */}
      <div className="bg-[#0d0d0c] border-t border-white/5 py-6" id="footer-bottom-row">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center text-xs">
          <span className="text-gray-550 font-sans" id="footer-rights-text">
            {translations.footer.rights}
          </span>

          <div className="flex flex-wrap justify-center gap-4 text-gray-550" id="footer-policies">
            <button
              onClick={() => handleLegalAlert(translations.footer.legalTerms)}
              className="hover:text-[#c4a484] hover:underline font-sans cursor-pointer focus:outline-none"
            >
              {translations.footer.legalTerms}
            </button>
            <span className="text-stone-800 font-sans">|</span>
            <button
              onClick={() => handleLegalAlert(translations.footer.privacyPolicy)}
              className="hover:text-[#c4a484] hover:underline font-sans cursor-pointer focus:outline-none"
            >
              {translations.footer.privacyPolicy}
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
}
