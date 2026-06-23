import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, X, ZoomIn, Heart } from 'lucide-react';
import { Translations } from '../types';

interface GalleryProps {
  translations: Translations;
}

interface GalleryItem {
  id: string;
  category: 'terrace' | 'interior' | 'sports' | 'music' | 'food';
  src: string;
  alt: string;
  title: string;
}

export default function Gallery({ translations }: GalleryProps) {
  const [filter, setFilter] = useState<'all' | 'terrace' | 'interior' | 'sports' | 'music' | 'food'>('all');
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null);
  const [lovedItems, setLovedItems] = useState<Record<string, boolean>>({});

  const galleryItems: GalleryItem[] = [
    {
      id: 'g1',
      category: 'terrace',
      src: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=800&q=80',
      alt: 'Nuestra espaciosa terraza iluminada por guirnaldas',
      title: 'Terraza al Atardecer'
    },
    {
      id: 'g2',
      category: 'interior',
      src: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
      alt: 'Salón Gastro interior decorado con plantas',
      title: 'Lounge Interiores'
    },
    {
      id: 'g3',
      category: 'food',
      src: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      alt: 'Hamburguesa angus acompañada de patatas crujientes',
      title: 'Hamburguesa CON~SENTID@S Angus'
    },
    {
      id: 'g4',
      category: 'sports',
      src: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=800&q=80',
      alt: 'Gente disfrutando partido fútbol frente gran pantalla',
      title: 'Zona Deportiva'
    },
    {
      id: 'g5',
      category: 'music',
      src: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
      alt: 'Actuación acústica de guitarra y voz frente a comensales',
      title: 'Voz en Directo'
    },
    {
      id: 'g6',
      category: 'food',
      src: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80',
      alt: 'Vasos con cócteles tropicales decorados con menta y maracuyá',
      title: 'Cócteles de Autor'
    },
    {
      id: 'g7',
      category: 'terrace',
      src: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80',
      alt: 'Copas de vino servidas en mesa exterior a luz de vela',
      title: 'Noches en la Terraza'
    },
    {
      id: 'g8',
      category: 'interior',
      src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      alt: 'Bar con la barra central principal de CON~SENTID@S',
      title: 'Bar Principal'
    },
    {
      id: 'g9',
      category: 'music',
      src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      alt: 'Manos de DJ mezclando música en evento lounge exterior',
      title: 'DJ Chillout Sunset'
    }
  ];

  const filteredItems = galleryItems.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const toggleLove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLovedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="gallery" className="py-24 bg-[#0d0d0c] text-gray-200 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-[#c4a484]/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
            CON~SENTID@S Captured
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="gallery-title">
            {translations.gallery.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="gallery-subtitle">
            {translations.gallery.subtitle}
          </h3>
        </div>

        {/* Categories Tab selector */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-12" id="gallery-filters-row">
          {(['all', 'terrace', 'interior', 'sports', 'music', 'food'] as const).map((cat) => {
            const labels = {
              all: translations.gallery.filterAll,
              terrace: translations.gallery.filterTerrace,
              interior: translations.gallery.filterInterior,
              sports: translations.gallery.filterSports,
              music: translations.gallery.filterMusic,
              food: translations.gallery.filterProducts,
            };
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`py-2 px-4 rounded-sm font-sans text-xs font-bold tracking-wider border cursor-pointer transition-all duration-200 uppercase ${
                  filter === cat
                    ? 'bg-[#c4a484] text-black border-[#c4a484] shadow-md font-extrabold'
                    : 'bg-[#161615] text-gray-400 border-white/5 hover:bg-black hover:text-white'
                }`}
                id={`gallery-filter-btn-${cat}`}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>

        {/* Gallery Overlay Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          id="gallery-grid"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                key={item.id}
                onClick={() => setActiveImage(item)}
                className="group relative h-72 sm:h-80 bg-[#111110] border border-white/5 rounded-sm overflow-hidden shadow-md hover:shadow-2xl hover:border-[#c4a484]/25 cursor-pointer"
                id={`gallery-item-${item.id}`}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106 blur-0 grayscale-10 group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />

                {/* Cover Elegant Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-stone-950/20 to-black/30 opacity-70 group-hover:opacity-85 transition-opacity duration-300" />

                {/* Interactive Heart Button */}
                <button
                  onClick={(e) => toggleLove(item.id, e)}
                  className="absolute top-4 right-4 z-20 p-2.5 rounded-sm bg-black/40 backdrop-blur-md text-gray-200 border border-white/5 shadow-md active:scale-95 transition-transform duration-200"
                  title="Love it"
                >
                  <Heart
                    className={`w-4 h-4 ${lovedItems[item.id] ? 'fill-red-500 text-red-500 animate-ping' : 'text-[#c4a484]'}`}
                  />
                </button>

                {/* Magnify Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none p-3.5 rounded-sm bg-[#c4a484] text-black opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                  <ZoomIn className="w-5 h-5 font-bold" />
                </div>

                {/* Footer text content of card */}
                <div className="absolute bottom-0 left-0 w-full p-6 text-left">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#c4a484] font-bold mb-1 block">
                    {item.category === 'terrace' && 'Terrace Open Area'}
                    {item.category === 'interior' && 'Comfort Lounges'}
                    {item.category === 'food' && 'Gourmet Tapas & Drinks'}
                    {item.category === 'sports' && 'Grand Sport Arena'}
                    {item.category === 'music' && 'Weekend Concert Live'}
                  </span>
                  <h4 className="text-base font-serif font-semibold text-white tracking-wide italic">
                    {item.title}
                  </h4>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Modal Lightbox Popup */}
        <AnimatePresence>
          {activeImage && (
            <div
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
              id="gallery-lightbox-modal"
              onClick={() => setActiveImage(null)}
            >
              <div
                className="relative max-w-4xl w-full max-h-screen-90 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveImage(null)}
                  className="absolute -top-12 sm:top-4 right-2 sm:right-4 bg-[#c4a484] text-black p-2.5 rounded-sm z-50 hover:bg-[#b39374] transition-colors shadow-lg active:scale-95 border-none"
                  id="lightbox-close-btn"
                >
                  <X className="w-5 h-5 font-bold animate-in duration-200" />
                </button>

                {/* Zoomed Image */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#111110] border border-white/10 p-2 sm:p-3 rounded-sm shadow-2xl relative"
                  id="lightbox-image-box"
                >
                  <img
                    src={activeImage.src}
                    alt={activeImage.alt}
                    className="max-h-130 w-auto object-contain rounded-sm max-w-full"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-5 left-5 bg-[#111110]/95 backdrop-blur-md border border-white/5 p-4 rounded-sm text-left max-w-3/4">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c4a484] font-bold block mb-1">
                      {activeImage.category.toUpperCase()}
                    </span>
                    <h5 className="font-serif font-semibold text-sm sm:text-base text-white italic">
                      {activeImage.title}
                    </h5>
                    <p className="text-xs text-gray-400 font-sans mt-1 leading-snug">
                      {activeImage.alt}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
