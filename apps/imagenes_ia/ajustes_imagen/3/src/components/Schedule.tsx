import React from 'react';
import { Clock, Star, Landmark, GlassWater } from 'lucide-react';
import { Translations } from '../types';

interface ScheduleProps {
  translations: Translations;
}

export default function Schedule({ translations }: ScheduleProps) {
  return (
    <section id="schedule" className="py-24 bg-[#0d0d0c] relative overflow-hidden">
      {/* Decorative Gold Spotlight in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
            Weekly Agenda & Hours
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="schedule-title">
            {translations.schedule.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="schedule-subtitle">
            {translations.schedule.subtitle}
          </h3>
        </div>

        {/* Schedule Panels Container */}
        <div className="bg-[#111110] p-8 sm:p-12 border border-white/10 rounded-sm shadow-xl space-y-8 max-w-3xl mx-auto" id="schedule-blackboard">
          
          {/* Main List */}
          <div className="space-y-6 text-left" id="schedule-hours-rows">
            
            {/* Row 1: Weekdays */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10" id="schedule-row-weekdays">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#161615] border border-white/10 flex items-center justify-center text-[#c4a484]">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-serif text-white text-base sm:text-lg">
                    {translations.schedule.weekdays}
                  </span>
                  <span className="text-xs text-gray-400 font-sans">
                    Desayunos, Almuerzos, Almuerzos Ejecutivos & Cenas
                  </span>
                </div>
              </div>
              <span className="font-serif font-medium text-[#c4a484] text-base sm:text-lg sm:text-right bg-black/40 px-4 py-1.5 rounded-sm border border-white/10">
                {translations.schedule.weekdaysTime}
              </span>
            </div>

            {/* Row 2: Weekends */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10" id="schedule-row-weekends">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-[#c4a484]/20 flex items-center justify-center text-[#c4a484]">
                  <GlassWater className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-serif text-white text-base sm:text-lg">
                    {translations.schedule.weekends}
                  </span>
                  <span className="text-xs text-gray-300 font-sans">
                    Actuaciones de Música en Vivo & Cócteles Premium
                  </span>
                </div>
              </div>
              <span className="font-serif font-bold text-black text-base sm:text-lg sm:text-right bg-[#c4a484] px-4 py-1.5 rounded-sm border border-[#c4a484]/20">
                {translations.schedule.weekendsTime}
              </span>
            </div>

            {/* Row 3: Sundays */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="schedule-row-sundays">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#161615] border border-white/10 flex items-center justify-center text-[#c4a484]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-serif text-white text-base sm:text-lg">
                    {translations.schedule.specialEvents}
                  </span>
                  <span className="text-xs text-gray-400 font-sans">
                    Brunch, Sesión DJ Chillout Sunset & Aperitivos
                  </span>
                </div>
              </div>
              <span className="font-serif font-medium text-[#c4a484] text-base sm:text-lg sm:text-right bg-black/40 px-4 py-1.5 rounded-sm border border-white/10">
                {translations.schedule.specialEventsTime}
              </span>
            </div>

          </div>

          {/* Bottom Alert / Warning Tagline */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-center space-x-2 text-gray-400 text-xs sm:text-sm font-serif italic" id="schedule-kitchen-note">
            <Clock className="w-4.5 h-4.5 text-[#c4a484] shrink-0" />
            <p>{translations.schedule.tagline}</p>
          </div>

        </div>

      </div>
    </section>
  );
}
