import React, { useState } from 'react';
import { Clock, Music, Calendar, MapPin, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Language, Translations, LiveMusicEvent } from '../types';
import { LIVE_MUSIC_EVENTS } from '../translations';

interface LiveMusicProps {
  currentLang: Language;
  translations: Translations;
}

export default function LiveMusic({ currentLang, translations }: LiveMusicProps) {
  const [selectedConcert, setSelectedConcert] = useState<string | null>(null);
  const concerts: LiveMusicEvent[] = LIVE_MUSIC_EVENTS[currentLang];

  const handleBookConcert = (artistName: string, date: string, time: string) => {
    setSelectedConcert(artistName);

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
        if (currentLang === 'es') text = `Deseo reservar una mesa delantera para asistir a la actuación de: ${artistName} el día ${date} a las ${time}`;
        if (currentLang === 'en') text = `I would like to reserve a front-row table to attend the live show of: ${artistName} on ${date} at ${time}`;
        if (currentLang === 'de') text = `Ich möchte einen Tisch in der ersten Reihe reservieren, um den Auftritt von: ${artistName} am ${date} um ${time} zu besuchen.`;
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    }, 800);
  };

  return (
    <section id="music" className="py-24 bg-[#0d0d0c] relative overflow-hidden text-gray-250">
      {/* Decorative Gold Spotlight */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
            Weekend Resonance
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="music-title">
            {translations.music.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="music-subtitle">
            {translations.music.subtitle}
          </h3>
        </div>

        {/* Narrative / Context Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 items-center" id="music-top-block">
          <div className="lg:col-span-7 space-y-6" id="music-narrative">
            <p className="text-gray-300 font-sans text-base sm:text-lg leading-relaxed">
              {translations.music.desc}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4" id="music-features">
              <div className="flex items-start space-x-3 bg-[#111110] p-4 rounded-sm border border-white/5">
                <Clock className="w-5 h-5 text-[#c4a484] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-sans font-bold text-sm text-white">
                    {currentLang === 'es' && 'Sin recargo'}
                    {currentLang === 'en' && 'No Cover Charge'}
                    {currentLang === 'de' && 'Kein Eintrittsgeld'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {currentLang === 'es' && 'Entrada gratuita para clientes del restaurante y terraza.'}
                    {currentLang === 'en' && 'Free entry for restaurant guests & terrace patrons.'}
                    {currentLang === 'de' && 'Freier Eintritt für Restaurant- und Terrassengäste.'}
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-[#111110] p-4 rounded-sm border border-white/5">
                <Music className="w-5 h-5 text-[#c4a484] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-sans font-bold text-sm text-white">
                    {currentLang === 'es' && 'Acústica excelente'}
                    {currentLang === 'en' && 'Pristine Acoustics'}
                    {currentLang === 'de' && 'Makellose Akustik'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {currentLang === 'es' && 'Sonido envolvente diseñado para no perturbar las conversaciones.'}
                    {currentLang === 'en' && 'Spatial balanced levels crafted to maintain conversation ease.'}
                    {currentLang === 'de' && 'Ausbalancierter Sound für angenehme Gespräche.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 px-6 py-5 bg-[#161615] border border-white/10 rounded-sm relative overflow-hidden" id="music-info-pill">
            <div className="absolute top-2 right-2 flex items-center space-x-1 font-mono text-[9px] text-[#c4a484] uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-sm font-bold border border-[#c4a484]/15">
              <span>ESTE FIN DE SEMANA</span>
            </div>
            <h5 className="font-sans font-bold text-white uppercase tracking-widest text-xs mb-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#c4a484]" />
              <span>{translations.music.hours}</span>
            </h5>
            <p className="text-gray-400 text-xs sm:text-sm font-sans mb-4 leading-relaxed">
              {currentLang === 'es' && 'Para las actuaciones es sumamente aconsejable reservar con un mínimo de 24 horas de antelación para garantizar mesa en el pasillo central de la terraza o junto al escenario.'}
              {currentLang === 'en' && 'For optimal weekend seat placement, table booking at least 24 hours prior to showtime is highly suggested.'}
              {currentLang === 'de' && 'Für eine optimale Sitzplatzierung wird eine Tischreservierung mindestens 24 Stunden vor Konzertbeginn dringend empfohlen.'}
            </p>
            <button
              onClick={() => {
                const element = document.getElementById('contact');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center space-x-1.5 text-xs text-[#c4a484] hover:text-[#b39374] font-sans font-bold uppercase tracking-wider cursor-pointer"
            >
              <span>{translations.music.bookTable}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Concerts Line-up Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="music-schedule-grid">
          {concerts.map((gig) => (
            <div
              key={gig.id}
              className="bg-[#111110] border border-white/10 hover:border-[#c4a484]/30 rounded-sm overflow-hidden shadow-lg hover:shadow-2xl flex flex-col justify-between group h-full transition-all duration-300"
              id={`gig-card-${gig.id}`}
            >
              {/* Card Photo header */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={gig.image}
                  alt={`${gig.artist} live performing at VERANDA`}
                  className="w-full h-full object-cover group-hover:scale-104 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Date Badges */}
                <div className="absolute top-4 left-4 bg-[#c4a484] text-black px-3.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest shadow-md">
                  <span>{gig.date}</span>
                </div>

                <div className="absolute bottom-4 right-4 bg-[#0d0d0c]/90 backdrop-blur-md text-[#c4a484] px-2.5 py-1 rounded-sm text-[10px] font-semibold flex items-center space-x-1.5 border border-white/5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{gig.time}</span>
                </div>
              </div>

              {/* Card content text details */}
              <div className="p-6 sm:p-8 flex-grow flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-mono tracking-widest uppercase text-[#c4a484]/90 font-bold mb-1.5">
                    {gig.genre}
                  </span>
                  <h4 className="text-xl font-serif tracking-wide text-white mb-3">
                    {gig.artist}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-400 font-sans leading-relaxed mb-6">
                    {gig.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono flex items-center space-x-1 uppercase">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>CON~SENTID@S Stage</span>
                  </span>

                  <button
                    onClick={() => handleBookConcert(gig.artist, gig.date, gig.time)}
                    className={`px-3 py-1.5 rounded-sm text-[11px] font-sans font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                      selectedConcert === gig.artist
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-905/30'
                        : 'bg-[#c4a484] hover:bg-[#b39374] text-black'
                    }`}
                  >
                    {selectedConcert === gig.artist ? (
                      <span>
                        {currentLang === 'es' && 'Asignado'}
                        {currentLang === 'en' && 'Assigned'}
                        {currentLang === 'de' && 'Zugewiesen'}
                      </span>
                    ) : (
                      <span>{translations.music.bookTable}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
