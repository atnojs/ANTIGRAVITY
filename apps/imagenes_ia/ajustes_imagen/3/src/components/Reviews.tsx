import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, Quote, X, Check, Heart, ShieldCheck } from 'lucide-react';
import { Language, Translations, Review } from '../types';
import { INITIAL_REVIEWS } from '../translations';

interface ReviewsProps {
  currentLang: Language;
  translations: Translations;
}

export default function Reviews({ currentLang, translations }: ReviewsProps) {
  const [reviewsList, setReviewsList] = useState<Review[]>(INITIAL_REVIEWS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Review Form inputs
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;

    const newReview: Review = {
      id: `r-${Date.now()}`,
      author: author.trim(),
      rating,
      comment: comment.trim(),
      source: 'direct',
      date: new Date().toISOString().substring(0, 10),
    };

    setReviewsList([newReview, ...reviewsList]);
    setSuccessMsg(true);

    // Auto close and reset
    setTimeout(() => {
      setIsModalOpen(false);
      setSuccessMsg(false);
      setAuthor('');
      setRating(5);
      setComment('');
    }, 4000);
  };

  const getSourceBadge = (src: 'google' | 'tripadvisor' | 'direct') => {
    switch (src) {
      case 'google':
        return <span className="text-[9px] font-mono tracking-widest uppercase bg-[#161615] text-[#c4a484] border border-[#c4a484]/20 px-2 py-0.5 rounded-sm">Google Reviews</span>;
      case 'tripadvisor':
        return <span className="text-[9px] font-mono tracking-widest uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-905/30 px-2 py-0.5 rounded-sm">TripAdvisor</span>;
      default:
        return <span className="text-[9px] font-mono tracking-widest uppercase bg-[#161615] text-gray-400 border border-white/10 px-2 py-0.5 rounded-sm">CON~SENTID@S Guest</span>;
    }
  };

  return (
    <section id="reviews" className="py-24 bg-[#0d0d0c] text-gray-200 relative overflow-hidden">
      {/* Decorative lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c4a484]/25 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 max-w-5xl mx-auto">
          <div className="text-left">
            <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
              Guest Experiences
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="reviews-title">
              {translations.reviews.title}
            </h2>
            <div className="w-16 h-0.5 bg-[#c4a484]/40 mb-6" />
            <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="reviews-subtitle">
              {translations.reviews.subtitle}
            </h3>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="self-start md:self-end bg-[#c4a484] hover:bg-[#b39374] active:bg-[#a38364] text-black py-3.5 px-6 rounded-sm font-sans text-xs sm:text-sm font-bold uppercase tracking-widest shadow-lg flex items-center space-x-2 cursor-pointer transition-colors duration-250 active:scale-98"
            id="reviews-write-btn"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{translations.reviews.addReview}</span>
          </button>
        </div>

        {/* Testimonials Feeds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto" id="reviews-cards-grid">
          {reviewsList.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#111110] border border-white/5 p-6 sm:p-8 rounded-sm flex flex-col justify-between shadow-md relative group hover:border-[#c4a484]/35 transition-colors duration-300"
              id={`review-card-${rev.id}`}
            >
              <div>
                {/* Quote details */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-1" id={`rating-star-row-${rev.id}`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rev.rating ? 'text-[#c4a484] fill-[#c4a484]' : 'text-stone-700'
                        }`}
                      />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-[#c4a484]/20 shrink-0" />
                </div>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed italic mb-6 font-serif">
                  "{rev.comment}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="block font-serif text-white text-xs">
                    {rev.author}
                  </span>
                  <span className="block text-[9px] text-gray-500 font-mono">
                    {rev.date}
                  </span>
                </div>
                {getSourceBadge(rev.source)}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Leave review box */}
        <AnimatePresence>
          {isModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
              id="reviews-form-modal"
              onClick={() => setIsModalOpen(false)}
            >
              <div
                className="bg-[#111110] border border-white/10 p-6 sm:p-10 rounded-sm max-w-lg w-full relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-serif tracking-wide text-xl sm:text-2xl text-white mb-1 flex items-center space-x-2 font-semibold">
                  <MessageSquare className="w-5.5 h-5.5 text-[#c4a484]" />
                  <span>{translations.reviews.addReview}</span>
                </h3>
                <p className="text-gray-400 text-xs font-sans mb-6">
                  {currentLang === 'es' && '¡Comparte tu experiencia en CON~SENTID@S con otros residentes y turistas!'}
                  {currentLang === 'en' && 'Share your CON~SENTID@S experiences with other resort residents and travelers!'}
                  {currentLang === 'de' && 'Teilen Sie Ihre CON~SENTID@S-Erfahrungen mit anderen Resort-Bewohnern und Reisenden!'}
                </p>

                {/* Success Review Toast */}
                {successMsg ? (
                  <div className="bg-emerald-950/40 border-l-4 border-emerald-500 p-6 rounded-sm text-center space-y-4 text-emerald-305">
                    <div className="w-12 h-12 bg-emerald-505 text-stone-950 rounded-full flex items-center justify-center mx-auto shadow-md">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold mb-2">{translations.reviews.successReview}</p>
                    <span className="block text-xs text-stone-400">Generando visuales...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    
                    {/* Author Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#c4a484] font-mono">
                        {translations.reviews.formAuthor}
                      </label>
                      <input
                        type="text"
                        required
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="e.g. Mathias Schmidt (Múnich)"
                        className="w-full bg-[#161615] border border-white/10 rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-stone-700 focus:outline-none focus:border-[#c4a484] transition-all"
                        id="review-author"
                      />
                    </div>

                    {/* Star selection */}
                    <div className="space-y-1.5 p-3 rounded-sm bg-[#161615] border border-white/10">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#c4a484] font-mono">
                        {translations.reviews.formRating}
                      </label>
                      <div className="flex items-center space-x-2 py-1.5" id="rating-interactive-stars-row">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const starValue = i + 1;
                          return (
                            <button
                              type="button"
                              key={i}
                              onClick={() => setRating(starValue)}
                              onMouseEnter={() => setHoveredStar(starValue)}
                              onMouseLeave={() => setHoveredStar(null)}
                              className="p-1 rounded cursor-pointer transition-transform duration-100 hover:scale-120 outline-none"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  starValue <= (hoveredStar ?? rating)
                                    ? 'text-[#c4a484] fill-[#c4a484]'
                                    : 'text-[#111110]'
                                  }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comment text */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#c4a484] font-mono">
                        {translations.reviews.formComment}
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="e.g. Un café increíble y un personal encantador..."
                        className="w-full bg-[#161615] border border-white/10 rounded-sm py-3 px-4 text-xs sm:text-sm text-white placeholder-stone-700 focus:outline-none focus:border-[#c4a484] transition-all resize-none"
                        id="review-comment"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#c4a484] hover:bg-[#b39374] text-black font-sans text-xs sm:text-sm font-bold uppercase tracking-widest py-3.5 px-6 rounded-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-99 transition-all cursor-pointer"
                      id="review-submit-btn"
                    >
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>{translations.reviews.formSubmit}</span>
                    </button>

                  </form>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
