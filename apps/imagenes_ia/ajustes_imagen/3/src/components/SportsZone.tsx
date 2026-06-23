import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Tv, Trophy, Calendar, Sparkles, Pin, CheckCircle2 } from 'lucide-react';
import { Language, Translations, SportEvent } from '../types';
import { SPORTS_EVENTS } from '../translations';

interface SportsZoneProps {
  currentLang: Language;
  translations: Translations;
}

export default function SportsZone({ currentLang, translations }: SportsZoneProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'football' | 'tennis' | 'formula1'>('all');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const events: SportEvent[] = SPORTS_EVENTS[currentLang];

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === 'all') return true;
    return ev.sport === activeFilter;
  });

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'football':
        return '⚽';
      case 'tennis':
        return '🎾';
      case 'formula1':
        return '🏎️';
      case 'basketball':
        return '🏀';
      default:
        return '🏆';
    }
  };

  const handleBookEvent = (eventTitle: string) => {
    setSelectedMatch(eventTitle);
    
    // Smooth scroll to the contact form
    const element = document.getElementById('contact');
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }

    // Auto-populate the special requests input field
    setTimeout(() => {
      const textarea = document.getElementById('form-message') as HTMLTextAreaElement;
      if (textarea) {
        let text = '';
        if (currentLang === 'es') text = `Deseo reservar una mesa frente de la pantalla para ver el partido: ${eventTitle}`;
        if (currentLang === 'en') text = `I would like to reserve a table close to the screen to watch: ${eventTitle}`;
        if (currentLang === 'de') text = `Ich möchte einen Tisch vor der Leinwand reservieren für das Spiel: ${eventTitle}`;
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    }, 800);
  };

  return (
    <section id="sports" className="py-24 bg-[#0d0d0c] relative overflow-hidden">
      {/* Visual background lines and neon effect in corners */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c4a484]/30 to-transparent" />
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-bold block mb-2">
            Sports Live Lounge
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="sports-title">
            {translations.sports.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="sports-subtitle">
            {translations.sports.subtitle}
          </h3>
        </div>

        {/* Section Content: Banner + Sports Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 items-start" id="sports-container">
          
          {/* Big screen presentation banner / explanation */}
          <div className="lg:col-span-5 space-y-6" id="sports-branding-panel">
            <div className="bg-[#111110] border border-white/10 p-8 rounded-sm relative overflow-hidden shadow-xl">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#c4a484]/10 rounded-full blur-2xl" />
              
              <div className="w-12 h-12 rounded-sm bg-[#161615] border border-[#c4a484]/20 flex items-center justify-center text-[#c4a484] mb-6 shadow-md">
                <Tv className="w-6 h-6" />
              </div>

              <h4 className="text-2xl font-serif text-white mb-3" id="sports-banner-headline">
                4K Ultra-Large Screen
              </h4>
              <p className="text-gray-400 font-sans text-sm sm:text-base leading-relaxed mb-6">
                {translations.sports.desc}
              </p>

              {/* Tournament Checklist */}
              <div className="space-y-3.5 pt-6 border-t border-white/10" id="sports-tournaments-checklist">
                <div className="flex items-center space-x-3 text-gray-300 text-sm">
                  <Trophy className="w-4.5 h-4.5 text-[#c4a484] shrink-0" />
                  <span>La Liga, Premier League & Champions League</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300 text-sm">
                  <Trophy className="w-4.5 h-4.5 text-[#c4a484] shrink-0" />
                  <span>Wimbledon & Roland Garros Tennis Grand Slams</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300 text-sm">
                  <Trophy className="w-4.5 h-4.5 text-[#c4a484] shrink-0" />
                  <span>Formula 1 Grand Prix races</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300 text-sm">
                  <Trophy className="w-4.5 h-4.5 text-[#c4a484] shrink-0" />
                  <span>Eurocopa Finals & Olympic Tournaments</span>
                </div>
              </div>
            </div>

            {/* Quick booking banner */}
            <div className="p-6 rounded-sm bg-[#161615] border border-white/5 flex items-center justify-between" id="sports-booking-bar">
              <div className="space-y-1">
                <span className="block text-xs text-[#c4a484] font-mono tracking-widest font-bold uppercase">
                  RECOMENDACIÓN
                </span>
                <span className="text-xs text-gray-400 leading-relaxed">
                  {currentLang === 'es' && 'La zona del televisor suele llenarse rápido. ¡Sugerimos reservar mesa!'}
                  {currentLang === 'en' && 'The television lounge fills up fast. Table booking is highly recommended!'}
                  {currentLang === 'de' && 'Der TV-Bereich füllt sich schnell. Eine Reservierung wird dringend empfohlen!'}
                </span>
              </div>
            </div>
          </div>

          {/* Scheduele calendar & event table filters */}
          <div className="lg:col-span-7 space-y-6" id="sports-calendar-panel">
            
            {/* Nav Filters */}
            <div className="flex flex-wrap gap-2 pb-2" id="sports-categories-tabs">
              {(['all', 'football', 'tennis', 'formula1'] as const).map((filter) => {
                const labels = {
                  all: translations.sports.filterAll,
                  football: currentLang === 'es' ? 'Fútbol' : currentLang === 'en' ? 'Football/Soccer' : 'Fußball',
                  tennis: 'Tennis',
                  formula1: 'Formula 1',
                };
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-sm font-sans text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                      activeFilter === filter
                        ? 'bg-[#c4a484] text-black shadow-md'
                        : 'bg-[#111110] text-gray-400 border border-white/10 hover:bg-[#161615] hover:text-[#c4a484]'
                    }`}
                  >
                    <span className="mr-1.5">{getSportIcon(filter !== 'all' ? filter : '')}</span>
                    <span>{labels[filter]}</span>
                  </button>
                );
              })}
            </div>

            {/* Event Table Card */}
            <div className="bg-[#111110] border border-white/10 rounded-sm overflow-hidden shadow-xl" id="sports-epg-table-card">
              <div className="px-6 py-4 bg-[#161615] border-b border-white/10 flex items-center justify-between">
                <h5 className="font-serif text-sm tracking-wide text-[#c4a484] flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{translations.sports.upcoming}</span>
                </h5>
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  Live Broadcast Feed
                </span>
              </div>

              <div className="divide-y divide-white/10 max-h-120 overflow-y-auto" id="sports-events-list">
                {filteredEvents.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm font-sans">
                    {translations.sports.noEvents}
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                        event.isLive
                          ? 'bg-[#c4a484]/5 border-l-4 border-[#c4a484]'
                          : 'hover:bg-white/5'
                      }`}
                      id={`event-item-${event.id}`}
                    >
                      {/* Left: Timing and Competition */}
                      <div className="space-y-1 sm:max-w-2/3">
                        <div className="flex items-center space-x-2.5">
                          {event.isLive ? (
                            <span className="flex items-center space-x-1.5 bg-[#c4a484]/20 text-[#c4a484] px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono font-bold tracking-wider animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c4a484]" />
                              <span>{translations.sports.liveIndicator}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-[#c4a484] font-sans font-semibold">
                              {event.date} • {event.time}
                            </span>
                          )}
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#c4a484] bg-[#0d0d0c] px-2 py-0.5 rounded-sm border border-white/10">
                            {event.competition}
                          </span>
                        </div>
                        <h6 className="text-[15px] font-serif tracking-wide text-white leading-snug">
                          <span className="mr-1.5">{getSportIcon(event.sport)}</span>
                          {event.title}
                        </h6>
                      </div>

                      {/* Right Booking Action */}
                      <button
                        onClick={() => handleBookEvent(event.title)}
                        className={`sm:self-center px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                          event.isLive
                            ? 'bg-[#c4a484] hover:bg-[#b39374] text-black shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-[#c4a484] border border-[#c4a484]/25'
                        } ${selectedMatch === event.title ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-850/30' : ''}`}
                        title="Reservar mesa para ver"
                      >
                        {selectedMatch === event.title ? (
                          <span className="flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {currentLang === 'es' && 'Asignado'}
                              {currentLang === 'en' && 'Assigned'}
                              {currentLang === 'de' && 'Zugewiesen'}
                            </span>
                          </span>
                        ) : (
                          <span>
                            {currentLang === 'es' && 'Reservar Mesa'}
                            {currentLang === 'en' && 'Reserve Table'}
                            {currentLang === 'de' && 'Tisch buchen'}
                          </span>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
