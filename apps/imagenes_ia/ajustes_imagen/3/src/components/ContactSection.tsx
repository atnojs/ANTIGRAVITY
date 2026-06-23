import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, Send, Calendar, CheckCircle2, Star, ShieldAlert } from 'lucide-react';
import { Language, Translations } from '../types';

interface ContactSectionProps {
  currentLang: Language;
  translations: Translations;
}

export default function ContactSection({ currentLang, translations }: ContactSectionProps) {
  // Form Type toggle: 'reserve' or 'message'
  const [formType, setFormType] = useState<'reserve' | 'message'>('reserve');
  
  // Input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [message, setMessage] = useState('');

  // Status flags
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Validate form before processing
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = currentLang === 'es' ? 'El nombre es obligatorio' : currentLang === 'en' ? 'Name is required' : 'Name ist erforderlich';
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = currentLang === 'es' ? 'Introduce un correo válido' : currentLang === 'en' ? 'Provide a valid email' : 'Geben Sie eine gültige E-Mail an';
    }
    if (!phone.trim()) {
      newErrors.phone = currentLang === 'es' ? 'El teléfono es obligatorio' : currentLang === 'en' ? 'Phone is required' : 'Telefon ist erforderlich';
    }

    if (formType === 'reserve') {
      if (!date) {
        newErrors.date = currentLang === 'es' ? 'Selecciona una fecha' : currentLang === 'en' ? 'Select a date' : 'Datum wählen';
      }
      if (!time) {
        newErrors.time = currentLang === 'es' ? 'Selecciona una hora' : currentLang === 'en' ? 'Select time' : 'Uhrzeit wählen';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear and Submit
    setErrors({});
    setIsSubmitted(true);
    
    // Auto-reset success message after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setName('');
      setEmail('');
      setPhone('');
      setDate('');
      setTime('');
      setGuests('2');
      setMessage('');
    }, 6000);
  };

  return (
    <section id="contact" className="py-24 bg-[#0d0d0c] text-gray-200 relative overflow-hidden">
      {/* Visual Ambient Spot Lights */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-[#c4a484]/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
            Get In Touch
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="contact-title">
            {translations.contact.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="contact-subtitle">
            {translations.contact.subtitle}
          </h3>
        </div>

        {/* Form & Info Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start" id="contact-form-grid">
          
          {/* Column 1: Interactive Reservation / Messaging Form */}
          <div className="lg:col-span-7 bg-[#111110] border border-white/10 p-6 sm:p-10 rounded-sm shadow-xl relative" id="contact-form-card">
            
            {/* Form Type Toggles */}
            <div className="flex bg-black/30 p-1.5 rounded-sm border border-white/5 mb-8" id="contact-form-toggles">
              <button
                type="button"
                onClick={() => {
                  setFormType('reserve');
                  setIsSubmitted(false);
                }}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase rounded-sm transition-all duration-200 cursor-pointer ${
                  formType === 'reserve'
                    ? 'bg-[#c4a484] text-black font-extrabold shadow-md'
                    : 'text-gray-450 hover:text-white'
                }`}
                id="toggle-booking-form"
              >
                <span>{translations.hero.ctaReserve}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('message');
                  setIsSubmitted(false);
                }}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase rounded-sm transition-all duration-200 cursor-pointer ${
                  formType === 'message'
                    ? 'bg-[#c4a484] text-black font-extrabold shadow-md'
                    : 'text-gray-450 hover:text-white'
                }`}
                id="toggle-message-form"
              >
                <span>{translations.contact.sendMessage}</span>
              </button>
            </div>

            {/* Success Alert Banner */}
            {isSubmitted && (
              <div
                className="bg-emerald-950/40 border-l-4 border-emerald-500 text-emerald-300 p-5 rounded-sm mb-8 flex items-start space-x-3.5 animate-in fade-in duration-300"
                id="contact-success-alert"
              >
                <CheckCircle2 className="w-5.5 h-5.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-serif text-sm text-emerald-205">
                    {currentLang === 'es' ? '¡Solicitud Procesada!' : currentLang === 'en' ? 'Request Received!' : 'Anfrage Erhalten!'}
                  </h5>
                  <p className="text-xs sm:text-sm text-emerald-400 leading-relaxed mt-1">
                    {formType === 'reserve' ? translations.contact.successReserve : translations.contact.successMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Standard HTML Form */}
            <form onSubmit={handleSubmit} className="space-y-5" id="form-inner">
              
              {/* Row 1: Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                    {translations.contact.formName} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    disabled={isSubmitted}
                    className={`w-full bg-[#161615] border rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c4a484] transition-all ${
                      errors.name ? 'border-red-500/80 focus:border-red-500' : 'border-white/10'
                    }`}
                    id="form-name-input"
                  />
                  {errors.name && <span className="text-[11px] text-red-500 block">{errors.name}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                    {translations.contact.formEmail} *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@bayapartments.com"
                    disabled={isSubmitted}
                    className={`w-full bg-[#161615] border rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c4a484] transition-all ${
                      errors.email ? 'border-red-500/80 focus:border-red-500' : 'border-white/10'
                    }`}
                    id="form-email-input"
                  />
                  {errors.email && <span className="text-[11px] text-red-500 block">{errors.email}</span>}
                </div>
              </div>

              {/* Row 2: Phone & (Guests if Reserve) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                    {translations.contact.formPhone} *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +34 600 123 456"
                    disabled={isSubmitted}
                    className={`w-full bg-[#161615] border rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c4a484] transition-all ${
                      errors.phone ? 'border-red-500/80 focus:border-red-500' : 'border-white/10'
                    }`}
                    id="form-phone-input"
                  />
                  {errors.phone && <span className="text-[11px] text-red-500 block">{errors.phone}</span>}
                </div>

                {formType === 'reserve' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                      {translations.contact.formGuests}
                    </label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      disabled={isSubmitted}
                      className="w-full bg-[#161615] border border-white/10 rounded-sm py-3 px-4 text-xs sm:text-sm text-white focus:outline-none focus:border-[#c4a484] transition-all cursor-pointer"
                      id="form-guests-select"
                    >
                      <option value="1">1 Persona</option>
                      <option value="2">2 Personas</option>
                      <option value="3">3 Personas</option>
                      <option value="4">4 Personas</option>
                      <option value="5">5 Personas</option>
                      <option value="6">6 Personas</option>
                      <option value="8">8 Personas (Sugerido)</option>
                      <option value="10">10+ Personas (Grupo)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Row 3: Event Booking Extras (Date & Time) */}
              {formType === 'reserve' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-fade-in" id="form-booking-date-time">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                      {translations.contact.formDate} *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isSubmitted}
                      className={`w-full bg-[#161615] border rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c4a484] transition-all cursor-pointer ${
                        errors.date ? 'border-red-500/80 focus:border-red-500' : 'border-white/10'
                      }`}
                      id="form-date-input"
                    />
                    {errors.date && <span className="text-[11px] text-red-500 block">{errors.date}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                      {translations.contact.formTime} *
                    </label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      disabled={isSubmitted}
                      className={`w-full bg-[#161615] border rounded-sm py-3 px-4 text-xs sm:text-sm text-white focus:outline-none focus:border-[#c4a484] transition-all cursor-pointer ${
                        errors.time ? 'border-red-500/80 focus:border-red-500' : 'border-white/10'
                      }`}
                      id="form-time-input"
                    >
                      <option value="">-- select time --</option>
                      <option value="09:00">09:00 h (Breakfast)</option>
                      <option value="11:00">11:00 h (Brunch)</option>
                      <option value="13:30">13:30 h (Lunch / Tapas)</option>
                      <option value="15:00">15:00 h (Midday Coffee)</option>
                      <option value="17:00">17:00 h (Sunset Chillout)</option>
                      <option value="19:30">19:30 h (Dinner Show Open)</option>
                      <option value="20:30">20:30 h (Live Music Stage)</option>
                      <option value="21:30">21:30 h (Late Dinner)</option>
                    </select>
                    {errors.time && <span className="text-[11px] text-red-500 block">{errors.time}</span>}
                  </div>
                </div>
              )}

              {/* Message Special Requests Textbox */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#c4a484] font-mono">
                  {translations.contact.formMessage}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    formType === 'reserve'
                      ? 'e.g. Alergias, trona para bebé, mesa cerca a la pantalla...'
                      : 'e.g. Hola! ¿Organizan cumpleaños los domingos?'
                  }
                  rows={4}
                  disabled={isSubmitted}
                  className="w-full bg-[#161615] border border-white/10 rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-650 focus:outline-none focus:border-[#c4a485] transition-all resize-none"
                  id="form-message"
                />
              </div>

              {/* Booking warnings */}
              {formType === 'reserve' && (
                <div className="p-3 bg-[#c4a484]/5 rounded-sm border border-[#c4a484]/15 flex items-start space-x-2.5 text-gray-400 text-xs text-left" id="form-note-banner">
                  <ShieldAlert className="w-4.5 h-4.5 text-[#c4a484] shrink-0 mt-0.5" />
                  <p>{translations.contact.formNotes}</p>
                </div>
              )}

              {/* Submit CTA button */}
              <button
                type="submit"
                disabled={isSubmitted}
                className="w-full bg-[#c4a484] hover:bg-[#b39374] active:bg-[#a38364] disabled:bg-[#161615] disabled:text-gray-600 text-black font-sans text-xs font-bold uppercase tracking-widest py-4 px-6 rounded-sm flex items-center justify-center space-x-2.5 shadow-md active:scale-99 cursor-pointer"
                id="form-btn-submit"
              >
                {formType === 'reserve' ? (
                  <>
                    <Calendar className="w-4.5 h-4.5" />
                    <span>{translations.contact.formSubmitReserve}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4.5 h-4.5" />
                    <span>{translations.contact.formSubmitMessage}</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Column 2: Information, Address block, quick dials and map */}
          <div className="lg:col-span-5 space-y-8" id="contact-info-panel">
            
            {/* Quick dials Card */}
            <div className="bg-[#111110] border border-white/10 p-6 sm:p-8 rounded-sm space-y-6 shadow-lg" id="contact-info-card">
              <h4 className="font-serif tracking-wide text-lg text-white border-b border-white/5 pb-3 font-semibold" id="contact-info-headline">
                {translations.contact.contactInfo}
              </h4>

              <div className="space-y-4" id="contact-channels-info">
                
                {/* Phone */}
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-sm bg-[#161615] text-[#c4a484] border border-white/10 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono tracking-widest uppercase text-gray-500">
                      {translations.contact.phoneLabel}
                    </span>
                    <a href="tel:+34900123456" className="font-sans font-bold text-sm sm:text-base text-white hover:text-[#c4a484]">
                      +34 900 123 456
                    </a>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-sm bg-emerald-950/40 text-emerald-400 border border-emerald-905/30 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono tracking-widest uppercase text-emerald-500">
                      {translations.contact.whatsappLabel}
                    </span>
                    <a
                      href={`https://wa.me/34900123456?text=Hola%20CON~SENTID%40S!%20Deseo%20hacer%20una%20reserva%20en%2520la%2520terraza%20(${currentLang.toUpperCase()})`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans font-bold text-sm sm:text-base text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                    >
                      <span>+34 600 987 654</span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-emerald-500/20 font-bold ml-2">Chat Express</span>
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-sm bg-[#161615] text-[#c4a484] border border-white/10 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono tracking-widest uppercase text-gray-500">
                      {translations.contact.emailLabel}
                    </span>
                    <a href="mailto:reservas@consentidosbistrot.com" className="font-sans font-semibold text-sm sm:text-base text-gray-200 hover:text-[#c4a484]">
                      reservas@consentidosbistrot.com
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-sm bg-[#161615] text-[#c4a484] border border-white/10 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono tracking-widest uppercase text-gray-500">
                      {translations.contact.addressLabel}
                    </span>
                    <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed">
                      Marina Bay Apartments, Bloque C-2, Marina del Sol, Mijas Costa, Málaga, España.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Custom Simulated Interactive Vector Map Section */}
            <div className="bg-[#111110] border border-white/10 p-6 rounded-sm shadow-lg relative overflow-hidden" id="contact-map-card">
              <h5 className="font-sans font-semibold text-xs uppercase tracking-wider text-[#c4a484] mb-4 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{translations.contact.mapTitle}</span>
              </h5>
              
              {/* Responsive Vector styled block */}
              <div
                className="w-full h-52 sm:h-60 rounded-sm bg-[#161615] border border-white/5 relative overflow-hidden flex items-center justify-center p-3"
                id="simulated-vector-map"
              >
                {/* Background grid vector style */}
                <div className="absolute inset-0 opacity-10 bg-grid-lines" />

                {/* Streets overlay */}
                <div className="absolute top-2/3 left-0 w-full h-8 bg-[#111110] border-y border-white/5 -rotate-3 text-[9px] font-mono text-gray-600 px-12 flex items-center justify-between">
                  <span>Avenida del Sol</span>
                  <span>Marina Beach Road</span>
                </div>

                <div className="absolute top-0 left-1/2 w-6 h-full bg-[#111110] border-x border-white/5 rotate-12 text-[9px] font-mono text-gray-600 py-6 flex flex-col justify-between items-center">
                  <span>M</span>
                  <span>A</span>
                  <span>I</span>
                  <span>N</span>
                </div>

                {/* Simulated Complex Circle and Building bounds */}
                <div className="absolute top-1/4 left-1/4 w-32 h-20 bg-[#111110]/60 border border-white/5 rounded-sm flex items-center justify-center text-[9px] font-mono text-gray-500">
                  <span>Marina Bay Complex</span>
                </div>

                {/* CON~SENTID@S Cafeteria Main Pin */}
                <div className="absolute top-[45%] left-[55%] z-20 flex flex-col items-center">
                  <div className="relative">
                    <span className="w-5 h-5 rounded-full bg-[#c4a484] absolute animate-ping-slow duration-3000 opacity-75" />
                    <div className="w-5 h-5 rounded-full bg-[#c4a484] border-2 border-[#111110] flex items-center justify-center text-[9px] text-[#111110] font-bold relative shadow-md">
                      C
                    </div>
                  </div>
                  <div className="bg-[#c4a484] text-black font-sans font-bold text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm shadow-md mt-1.5 whitespace-nowrap">
                    CON~SENTID@S CAFÉ
                  </div>
                </div>

                {/* Compass visual indicator */}
                <div className="absolute bottom-3 right-3 p-1.5 bg-[#111110] border border-white/5 rounded-sm text-[8px] font-mono text-gray-500 text-center">
                  <span>N 36.512, W 4.673</span>
                </div>
              </div>

              {/* Action: Open safely in google maps */}
              <a
                href="https://maps.google.com/?q=Mijas+Costa+Malaga+Marina+del+Sol"
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full bg-[#161615] hover:bg-black text-[#c4a484] py-3 rounded-sm font-sans text-xs font-bold uppercase tracking-widest border border-white/10 text-center block transition-colors duration-250"
              >
                {currentLang === 'es' && 'Abrir en Google Maps'}
                {currentLang === 'en' && 'Open in Google Maps'}
                {currentLang === 'de' && 'In Google Maps öffnen'}
              </a>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
