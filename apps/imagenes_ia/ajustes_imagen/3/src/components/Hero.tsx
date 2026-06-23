import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Utensils, Music, Tv } from 'lucide-react';
import { Translations } from '../types';

interface HeroProps {
  translations: Translations;
}

export default function Hero({ translations }: HeroProps) {
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

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center bg-[#0d0d0c] overflow-hidden pt-20"
    >
      {/* Immersive Background Image with Premium Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=1920&q=80"
          alt="VERANDA Premium Terrace"
          className="w-full h-full object-cover scale-105 filter brightness-40 contrast-110"
          referrerPolicy="no-referrer"
          id="hero-bg-img"
        />
        {/* Gradients to blend into surrounding content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0c] via-black/40 to-black/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#c4a484]/15 via-transparent to-[#0d0d0c]/20 z-10 animate-pulse duration-10000" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12 pb-16 flex flex-col items-center">
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#c4a484]/10 border border-[#c4a484]/30 text-[#c4a484] text-xs sm:text-sm font-sans tracking-widest font-semibold uppercase mb-6 shadow-md"
          id="hero-badge"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#c4a484] animate-ping mr-1" />
          <span>{translations.hero.subtitle}</span>
        </motion.div>

        {/* Catchy Commercial Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-serif text-4xl sm:text-6xl lg:text-7xl font-light italic text-white tracking-wide leading-tight mb-6 max-w-4xl"
          id="hero-headline"
        >
          {translations.hero.title}
        </motion.h1>

        {/* Inspiring Value Proposition Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-sans text-base sm:text-lg text-gray-300 leading-relaxed mb-10 max-w-2xl"
          id="hero-description"
        >
          {translations.hero.desc}
        </motion.p>

        {/* Action Button Toggles */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4 mb-16 w-full sm:w-auto"
          id="hero-actions-container"
        >
          <button
            onClick={() => scrollToSection('contact')}
            className="flex items-center justify-center space-x-2 bg-[#c4a484] hover:bg-[#b39374] text-black px-8 py-3.5 rounded-sm font-sans text-xs sm:text-sm font-bold uppercase tracking-widest shadow-lg hover:shadow-[#c4a484]/10 active:scale-98 transition-all duration-300 cursor-pointer"
            id="hero-btn-book"
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>{translations.hero.ctaReserve}</span>
          </button>
          
          <button
            onClick={() => scrollToSection('about')}
            className="flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-[#c4a484] hover:text-[#b39374] px-8 py-3.5 rounded-sm font-sans text-xs sm:text-sm font-bold uppercase tracking-widest border border-[#c4a484]/20 hover:border-[#c4a484]/40 active:scale-98 transition-all duration-300 cursor-pointer"
            id="hero-btn-menu"
          >
            <Utensils className="w-4.5 h-4.5" />
            <span>{translations.hero.ctaMenu}</span>
          </button>
        </motion.div>

        {/* Dynamic Concept Pillars: Quick Navigation Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl border-t border-white/10 pt-10"
          id="hero-pillars"
        >
          <div
            onClick={() => scrollToSection('about')}
            className="flex flex-col items-center p-3 rounded-sm bg-[#161615] border border-white/5 hover:bg-white/5 cursor-pointer group transition-colors duration-200"
            id="pillar-terrace"
          >
            <div className="w-10 h-10 rounded-full bg-[#111110] border border-[#c4a484]/20 flex items-center justify-center text-[#c4a484] group-hover:bg-[#c4a484] group-hover:text-black transition-all duration-300 mb-2">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-sans font-medium text-[10px] sm:text-xs text-gray-450 group-hover:text-[#c4a484] uppercase tracking-widest transition-colors">
              Amplia Terraza
            </span>
          </div>

          <div
            onClick={() => scrollToSection('sports')}
            className="flex flex-col items-center p-3 rounded-sm bg-[#161615] border border-white/5 hover:bg-white/5 cursor-pointer group transition-colors duration-200"
            id="pillar-sports"
          >
            <div className="w-10 h-10 rounded-full bg-[#111110] border border-[#c4a484]/20 flex items-center justify-center text-[#c4a484] group-hover:bg-[#c4a484] group-hover:text-black transition-all duration-300 mb-2">
              <Tv className="w-5 h-5" />
            </div>
            <span className="font-sans font-medium text-[10px] sm:text-xs text-gray-450 group-hover:text-[#c4a484] uppercase tracking-widest transition-colors">
              Pantalla Grande
            </span>
          </div>

          <div
            onClick={() => scrollToSection('music')}
            className="col-span-2 md:col-span-1 flex flex-col items-center p-3 rounded-sm bg-[#161615] border border-white/5 hover:bg-white/5 cursor-pointer group transition-colors duration-200"
            id="pillar-music"
          >
            <div className="w-10 h-10 rounded-full bg-[#111110] border border-[#c4a484]/20 flex items-center justify-center text-[#c4a484] group-hover:bg-[#c4a484] group-hover:text-black transition-all duration-300 mb-2">
              <Music className="w-5 h-5" />
            </div>
            <span className="font-sans font-medium text-[10px] sm:text-xs text-gray-450 group-hover:text-[#c4a484] uppercase tracking-widest transition-colors">
              Música en Vivo
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
