import React, { useState } from "react";
import { Wand2, Sparkles, ArrowRight, Loader2, Zap } from "lucide-react";

interface PromptSectionProps {
  prompt: string;
  onChangePrompt: (prompt: string) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  styleName: string;
}

export default function PromptSection({
  prompt,
  onChangePrompt,
  onOptimize,
  isOptimizing,
  onGenerate,
  isGenerating,
  styleName
}: PromptSectionProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onGenerate();
      }
    }
  };

  const hasPrompt = prompt.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Expansive styled prompt area */}
      <div 
        className={`relative rounded-3xl transition-all duration-300 ${
          isFocused 
            ? "bg-[#121824]/90 border-[#7C3AED]/50 shadow-[0_0_25px_rgba(124,58,237,0.12)] ring-1 ring-[#7C3AED]/30" 
            : "bg-[#121824]/70 border-white/10 hover:border-white/20"
        } border p-4 flex flex-col min-h-[140px]`}
      >
        <textarea
          id="prompt-textbox"
          rows={3}
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Describe tu obra maestra aquí... (ej. 'Un majestuoso fénix de cristal surgiendo de polvo estelar cósmico')"
          className="w-full bg-transparent resize-none text-slate-100 placeholder-slate-500 font-sans text-sm md:text-base border-0 focus:outline-none focus:ring-0 leading-relaxed overflow-y-auto custom-scrollbar"
        />

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          {/* Active Preset Tag Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#EC4899] bg-[#EC4899]/10 px-2.5 py-1 rounded-full border border-[#EC4899]/20 flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3 h-3 text-[#EC4899]" />
              Estilo: {styleName}
            </span>
          </div>

          {/* Spell/Magic wand optimizer inside box */}
          <button
            type="button"
            id="optimize-prompt-btn"
            disabled={!hasPrompt || isOptimizing}
            onClick={onOptimize}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono text-[10px] sm:text-xs font-semibold tracking-wider transition-all duration-300 ${
              !hasPrompt 
                ? "bg-white/5 border-white/5 text-slate-500 cursor-not-allowed" 
                : isOptimizing 
                  ? "bg-[#121824] border-white/10 text-[#7C3AED]" 
                  : "bg-[#7C3AED]/10 border-[#7C3AED]/30 text-white hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/60 hover:shadow-[0_0_15px_rgba(124,58,237,0.2)]"
            }`}
          >
            {/* Pulsing ring outline if prompt is ready and not optimizing */}
            {hasPrompt && !isOptimizing && (
              <span className="absolute inset-0 rounded-xl bg-[#7C3AED]/20 animate-pulse-ring" />
            )}

            {isOptimizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#7C3AED] animate-spin" />
                Optimizando Prompt...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 text-[#7C3AED] animate-pulse" />
                Mejorar Redacción
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary generate image button */}
      <div>
        <button
          type="button"
          id="generate-image-btn"
          disabled={!hasPrompt || isGenerating}
          onClick={onGenerate}
          className={`w-full relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2.5xl font-sans font-bold text-sm tracking-widest uppercase transition-all duration-300 ${
            !hasPrompt 
              ? "bg-[#121824]/50 border border-white/5 text-slate-500 cursor-not-allowed" 
              : "glow-gradient text-white hover:opacity-95 cursor-pointer border border-white/10 shadow-[0_4px_25px_rgba(124,58,237,0.4)] hover:shadow-[0_4px_35px_rgba(124,58,237,0.6)] group hover:scale-[1.01]"
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 text-white animate-spin" />
              <span>Esculpiendo imaginación...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
              <span>Generar Imagen</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
