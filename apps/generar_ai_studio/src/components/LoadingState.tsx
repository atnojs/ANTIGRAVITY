import { Loader2 } from "lucide-react";

export default function LoadingState() {
  const stepsCompleted = [
    "Analizando estructuras semánticas del prompt...",
    "Seleccionando paletas de color con alta fidelidad...",
    "Sintetizando capas de imagen con Aura Motor...",
    "Ejecutando pases de definición ultra alta..."
  ];

  return (
    <div 
      id="generation-loading"
      className="glass-panel rounded-3xl p-12 text-center border border-white/10 max-w-xl mx-auto flex flex-col items-center justify-center space-y-8 animate-pulse relative overflow-hidden"
    >
      {/* Moving purple glow bar at top of the loading container */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent animate-fluid-glow" />

      {/* Spacing indicator */}
      <div className="relative">
        {/* Pulsing visual halo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] rounded-full blur-xl opacity-30 animate-pulse" />
        
        {/* Revolving ring loader */}
        <div className="relative w-16 h-16 rounded-full border-2 border-white/5 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <h3 className="font-display font-medium text-lg tracking-wider text-white">
          Forjando tu imaginación...
        </h3>
        <p className="text-xs text-slate-400 max-w-[320px] mx-auto leading-relaxed">
          Los modelos neuronales de Aura están transformando tus conceptos en píxeles de ultra alta resolución.
        </p>
      </div>

      {/* Dynamic sub-activity stats to increase high quality look-and-feel */}
      <div className="w-full bg-[#121824]/50 border border-white/5 rounded-2xl p-4 space-y-2.5 max-w-sm">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pb-1.5 border-b border-white/5">
          <span>MOTOR DE PROCESAMIENTO</span>
          <span className="text-emerald-400">EN CURSO</span>
        </div>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-mono tracking-wide">Sintetizando parámetros de ruido...</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
            <span className="text-slate-400 font-mono">Validación de escala CFG completada exitosamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
