import React from 'react';
import { motion } from 'motion/react';
import { Sunset, Compass, GlassWater, Landmark } from 'lucide-react';
import { Translations } from '../types';

interface AboutProps {
  translations: Translations;
}

export default function About({ translations }: AboutProps) {
  const cardVariants = {
    hover: {
      y: -10,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  return (
    <section id="about" className="py-24 bg-[#0d0d0c] border-b border-white/5 relative overflow-hidden">
      {/* Decorative Warm Light Spotlights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
            CON~SENTID@S Caffê & Bistrot
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="about-title">
            {translations.about.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="about-subtitle">
            {translations.about.subtitle}
          </h3>
        </div>

        {/* Brand Narrative / Grid Side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20" id="about-narrative-container">
          <div className="lg:col-span-6 space-y-6" id="about-text-narrative">
            <p className="text-gray-300 font-sans text-base sm:text-lg leading-relaxed first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-[#c4a484] first-letter:mr-3 first-letter:float-left">
              {translations.about.desc1}
            </p>
            <p className="text-gray-400 font-sans text-base leading-relaxed">
              {translations.about.desc2}
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10" id="about-stats">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-sm bg-[#161615] text-[#c4a484]">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-2xl font-serif font-bold text-white">150+</span>
                  <span className="text-xs text-gray-500 font-sans">Capacidad de mesas</span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-sm bg-[#161615] text-[#c4a484]">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-2xl font-serif font-bold text-white">3</span>
                  <span className="text-xs text-gray-500 font-sans">Ambientes únicos</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative group" id="about-image-narration">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#c4a484] to-[#121211] rounded-sm opacity-10 blur-xl group-hover:opacity-20 transition-all duration-500" />
            <img
              src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80"
              alt="Plato gourmet bistro preparado en CON~SENTID@S"
              className="rounded-sm shadow-2xl relative z-10 w-full h-80 sm:h-96 object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Ambient Separation Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="about-ambiences-grid">
          
          {/* Card 1: Terrace */}
          <motion.div
            whileHover="hover"
            variants={cardVariants}
            className="bg-[#111110] border border-white/10 rounded-sm overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#c4a484]/30 transition-all duration-300 flex flex-col h-full"
            id="ambient-card-terrace"
          >
            <div className="relative h-60 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80"
                alt="Terraza exterior de CON~SENTID@S"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-[#c4a484] text-black py-1 px-3 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1.5 shadow-md">
                <Sunset className="w-3.5 h-3.5" />
                <span>TERRAZA</span>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-grow flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-serif tracking-wide text-white mb-3">
                  {translations.about.terraceTitle}
                </h4>
                <p className="text-sm font-sans text-gray-400 leading-relaxed mb-6">
                  {translations.about.terraceDesc}
                </p>
              </div>
              <div className="h-[1px] bg-[#c4a484]/30 w-12" />
            </div>
          </motion.div>

          {/* Card 2: Intimate Interior */}
          <motion.div
            whileHover="hover"
            variants={cardVariants}
            className="bg-[#111110] border border-white/10 rounded-sm overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#c4a484]/30 transition-all duration-300 flex flex-col h-full"
            id="ambient-card-lounge"
          >
            <div className="relative h-60 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80"
                alt="Ambiente interior cálido con chimenea de CON~SENTID@S"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-[#c4a484] text-black py-1 px-3 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1.5 shadow-md">
                <Landmark className="w-3.5 h-3.5" />
                <span>Loungy-Gastro</span>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-grow flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-serif tracking-wide text-white mb-3">
                  {translations.about.ambience1Title}
                </h4>
                <p className="text-sm font-sans text-gray-400 leading-relaxed mb-6">
                  {translations.about.ambience1Desc}
                </p>
              </div>
              <div className="h-[1px] bg-[#c4a484]/30 w-12" />
            </div>
          </motion.div>

          {/* Card 3: Dynamic Bar Atmosphere */}
          <motion.div
            whileHover="hover"
            variants={cardVariants}
            className="bg-[#111110] border border-white/10 rounded-sm overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#c4a484]/30 transition-all duration-300 flex flex-col h-full"
            id="ambient-card-bar"
          >
            <div className="relative h-60 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                alt="Ambiente activo y barra de cócteles de CON~SENTID@S"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-[#c4a484] text-black py-1 px-3 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1.5 shadow-md">
                <GlassWater className="w-3.5 h-3.5" />
                <span>Bar-Social</span>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-grow flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-serif tracking-wide text-white mb-3">
                  {translations.about.ambience2Title}
                </h4>
                <p className="text-sm font-sans text-gray-400 leading-relaxed mb-6">
                  {translations.about.ambience2Desc}
                </p>
              </div>
              <div className="h-[1px] bg-[#c4a484]/30 w-12" />
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
