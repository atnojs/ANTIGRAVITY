import React, { useState, useEffect } from 'react';
import { Language } from './types';
import { TRANSLATIONS } from './translations';

// Components
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import MenuSection from './components/MenuSection';
import SportsZone from './components/SportsZone';
import LiveMusic from './components/LiveMusic';
import Gallery from './components/Gallery';
import Schedule from './components/Schedule';
import Reviews from './components/Reviews';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('consentidos_lang');
      return (saved as Language) || 'es';
    } catch (_) {
      return 'es';
    }
  });

  const translations = TRANSLATIONS[currentLang];

  useEffect(() => {
    try {
      localStorage.setItem('consentidos_lang', currentLang);
    } catch (_) {
      // Ignore storage errors in sandbox context if any
    }
    // Update HTML lang attribute dynamically for screen readers and SEO
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-[#c4a484] selection:text-black">
      
      {/* Floating Header & Navigation Drawer */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        translations={translations}
      />

      {/* Main Sections */}
      <main className="flex-grow">
        {/* Hero Landing banner */}
        <Hero translations={translations} />

        {/* Cafe Description, Terrace & Atmospheres */}
        <About translations={translations} />

        {/* Tabbed Menu & Pricing Sheet */}
        <MenuSection
          currentLang={currentLang}
          translations={translations}
        />

        {/* Big screen TV Sports broadcast guide */}
        <SportsZone
          currentLang={currentLang}
          translations={translations}
        />

        {/* Weekend Live performances live program */}
        <LiveMusic
          currentLang={currentLang}
          translations={translations}
        />

        {/* Experience filterable Gallery & lightbox */}
        <Gallery translations={translations} />

        {/* General Opening Hours and special events */}
        <Schedule translations={translations} />

        {/* Testimonial comments and live add review */}
        <Reviews
          currentLang={currentLang}
          translations={translations}
        />

        {/* Contact address details, whatsapp speed dial and table bookings form */}
        <ContactSection
          currentLang={currentLang}
          translations={translations}
        />
      </main>

      {/* Footer credits, legal sheets, secondary toggler */}
      <Footer
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        translations={translations}
      />

    </div>
  );
}
