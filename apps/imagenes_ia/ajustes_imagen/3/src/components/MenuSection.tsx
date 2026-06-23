import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CupSoda, Coffee, Utensils, GlassWater, Sparkles, Star, AlertCircle, ShoppingBag } from 'lucide-react';
import { Language, Translations, MenuItem } from '../types';
import { MENU_DATA } from '../translations';

interface MenuSectionProps {
  currentLang: Language;
  translations: Translations;
}

export default function MenuSection({ currentLang, translations }: MenuSectionProps) {
  const [activeTab, setActiveTab] = useState<string>('breakfast');

  const categories = MENU_DATA[currentLang];
  const currentCategory = categories.find((cat) => cat.categoryId === activeTab) || categories[0];

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'breakfast':
        return <ShoppingBag className="w-4 h-4" />;
      case 'coffees':
        return <Coffee className="w-4 h-4" />;
      case 'lunchTapas':
        return <Utensils className="w-4 h-4" />;
      case 'dinner':
        return <Utensils className="w-4 h-4" />;
      case 'cocktails':
        return <GlassWater className="w-4 h-4" />;
      default:
        return <Utensils className="w-4 h-4" />;
    }
  };

  const menuTabs = [
    { id: 'breakfast', label: translations.menu.breakfast },
    { id: 'coffees', label: translations.menu.coffees },
    { id: 'lunchTapas', label: translations.menu.lunchTapas },
    { id: 'dinner', label: translations.menu.dinner },
    { id: 'cocktails', label: translations.menu.cocktails },
  ];

  return (
    <section id="menu" className="py-24 bg-[#0d0d0c] relative overflow-hidden">
      {/* Visual Ambient Spotlights */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#c4a484]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#c4a484] font-mono text-xs uppercase tracking-widest font-semibold block mb-2">
            Gourmet Selection
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light italic text-white tracking-wide mb-4" id="menu-title">
            {translations.menu.title}
          </h2>
          <div className="w-16 h-0.5 bg-[#c4a484]/40 mx-auto mb-6" />
          <h3 className="text-lg sm:text-xl text-gray-300 italic font-medium leading-relaxed" id="menu-subtitle">
            {translations.menu.subtitle}
          </h3>
          <p className="text-sm sm:text-base text-gray-400 font-sans mt-4 max-w-2xl mx-auto leading-relaxed">
            {translations.menu.desc}
          </p>
        </div>

        {/* Tab Selection Filter Row */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 sm:mb-16 border-b border-white/10 pb-6 sm:pb-8" id="menu-tabs-bar">
          {menuTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-sm font-sans text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 flex items-center space-x-2 border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#c4a484] text-black border-[#c4a484] shadow-lg'
                  : 'bg-[#111110] text-[#c4a484] border-white/10 hover:bg-[#161615] hover:text-[#b39374]'
              }`}
              id={`menu-tab-btn-${tab.id}`}
            >
              <span className="opacity-90">{getCategoryIcon(tab.id)}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Animated Menu Dishes Grid */}
        <div className="min-h-120" id="menu-items-outer-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"
              id={`menu-grid-container-${activeTab}`}
            >
              {currentCategory.items.map((item: MenuItem) => (
                <div
                  key={item.id}
                  className="bg-[#111110] border border-white/5 hover:border-[#c4a484]/30 p-6 rounded-sm flex flex-col justify-between group hover:bg-[#161615] transition-all duration-300 relative overflow-hidden"
                  id={`menu-dish-${item.id}`}
                >
                  {/* Popular Tag Highlight Overlay */}
                  {item.isPopular && (
                    <div className="absolute top-0 right-0 bg-[#c4a484] text-black py-1 px-4 text-[9px] font-bold uppercase tracking-widest font-sans flex items-center shadow-sm rounded-bl-sm">
                      <Star className="w-3 h-3 fill-black mr-1" />
                      <span>{translations.menu.popular}</span>
                    </div>
                  )}

                  {/* Header Title + Price */}
                  <div>
                    <div className="flex justify-between items-baseline gap-4 mb-2 pr-12">
                      <h4 className="text-base sm:text-lg font-serif tracking-wide text-white group-hover:text-[#c4a484] transition-colors duration-200">
                        {item.name}
                      </h4>
                      <span className="font-serif font-medium text-[#c4a484] text-base sm:text-lg whitespace-nowrap min-w-16 text-right">
                        €{item.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Tags Badge row */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3" id={`menu-dish-tags-${item.id}`}>
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[8px] font-mono font-bold uppercase py-0.5 px-2 rounded-sm bg-[#c4a484]/10 border border-[#c4a484]/25 text-[#c4a484]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Dish description text */}
                    <p className="text-xs sm:text-sm font-sans text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Micro elegant partition separator */}
                  <div className="mt-5 h-px bg-white/5 w-full" />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footnote Allergenic Warning block */}
        <div className="mt-16 bg-[#161615] p-5 rounded-sm border border-white/10 flex items-start space-x-3 max-w-3xl mx-auto" id="menu-allergen-alert">
          <AlertCircle className="w-5 h-5 text-[#c4a484] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            {translations.menu.allergensNote}
          </p>
        </div>

      </div>
    </section>
  );
}
