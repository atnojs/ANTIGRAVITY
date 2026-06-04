import { VisualStyle } from "../types";
import { VISUAL_STYLES } from "../data";
import { Sparkles, ChevronRight } from "lucide-react";

interface VisualCarouselProps {
  selectedStyleId: string;
  onSelectStyle: (styleId: string) => void;
}

export default function VisualCarousel({
  selectedStyleId,
  onSelectStyle
}: VisualCarouselProps) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7C3AED]" />
          Preajustes de Estilo Visual
        </label>
        <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition-colors">
          Deslizar estilos
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      {/* Elegant horizontal scroll */}
      <div 
        id="styles-carousel-container"
        className="flex gap-4 overflow-x-auto pb-3.5 pt-1 px-1 no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing snap-x"
      >
        {VISUAL_STYLES.map((style) => {
          const isSelected = selectedStyleId === style.id;
          return (
            <button
              key={style.id}
              id={`style-btn-${style.id}`}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className="flex-shrink-0 w-[140px] snap-start group text-left focus:outline-none"
            >
              {/* Outer Thumbnail Card */}
              <div 
                className={`relative w-full aspect-square rounded-[14px] overflow-hidden transition-all duration-300 mb-2 border ${
                  isSelected 
                    ? "border-gradient border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.35)] scale-[1.03]" 
                    : "border-white/10 group-hover:border-white/20 group-hover:scale-[1.01]"
                }`}
              >
                {/* Image */}
                <img 
                  src={style.thumbnail} 
                  alt={style.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />

                {/* Shading/Tint overlays */}
                <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
                  isSelected 
                    ? "from-slate-950/90 via-slate-950/40 to-transparent" 
                    : "from-slate-950/80 via-slate-950/20 to-transparent group-hover:from-slate-950/85"
                }`} />

                {/* Selected Accent border or check indicator */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] p-0.5 shadow-md flex items-center justify-center animate-fade-in">
                    <Sparkles className="w-3" />
                  </div>
                )}

                {/* Bottom Style Name inside the card */}
                <div className="absolute bottom-2.5 left-3 right-3 text-slate-200">
                  <span className={`text-[11px] font-semibold tracking-wide block truncate group-hover:text-white transition-colors ${
                    isSelected ? "text-white text-glow" : ""
                  }`}>
                    {style.name}
                  </span>
                </div>
              </div>

              {/* Outside short description */}
              <p className="text-[10px] text-slate-500 line-clamp-2 px-1 leading-normal font-sans group-hover:text-slate-400 transition-colors">
                {style.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
