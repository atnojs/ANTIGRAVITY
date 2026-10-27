/*
 * Pantalla de inicio — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: KN.
 * Menú de inicio con las tres secciones de la suite.
 */

import { SlidersVertical, Sparkles, WandSparkles } from "lucide-react";
export const SplashScreen = ({ onNavigate: s, userData: e }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-16 animate-in fade-in duration-1000 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full -z-10">
      <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
      <div
        className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse"
        style={{
          animationDelay: "1s",
        }}
      />
    </div>
    <div className="text-center space-y-6 relative">
      <div className="inline-block px-4 py-1.5 glass rounded-full text-[10px] font-black text-cyan-400 border-cyan-500/30 uppercase tracking-[0.3em] mb-4 shadow-2xl">
        Plataforma Unificada v4.0
      </div>
      <h1 className="text-7xl md:text-9xl font-black gradient-text tracking-tighter uppercase mb-2 drop-shadow-2xl">
        Unified Studio
      </h1>
      <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
        La suite definitiva de{" "}
        <span className="text-white">inteligencia artificial</span> para
        creadores visuales de élite.
      </p>
      {e && (
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="text-center">
            <div className="text-2xl font-black text-white">
              {e.usageCount || 0}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Creaciones
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-black text-cyan-400 uppercase">
              {e.role || "Free"}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Membresía
            </div>
          </div>
        </div>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl relative">
      <button
        onClick={() => s("ai-lab")}
        className="group glass glass-hover relative p-12 rounded-[3.5rem] text-left space-y-6 overflow-hidden border-cyan-500/10 hover:border-cyan-500/40 transition-all duration-500"
      >
        <div className="absolute -top-12 -right-12 p-8 text-cyan-500/5 transform group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-1000">
          <Sparkles size={280} />
        </div>
        <div className="bg-gradient-to-br from-cyan-400 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white p-4 shadow-[0_0_30px_rgba(34,211,238,0.3)] group-hover:scale-110 transition-transform">
          <Sparkles size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            AI LAB
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Generación generativa pura con inyección de Smart Prompts 8K.
          </p>
        </div>
      </button>
      <button
        onClick={() => s("edit-studio")}
        className="group glass glass-hover relative p-12 rounded-[3.5rem] text-left space-y-6 overflow-hidden border-purple-500/10 hover:border-purple-500/40 transition-all duration-500"
      >
        <div className="absolute -top-12 -right-12 p-8 text-purple-500/5 transform group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
          <WandSparkles size={280} />
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white p-4 shadow-[0_0_30px_rgba(167,139,250,0.3)] group-hover:scale-110 transition-transform">
          <WandSparkles size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            EDIT STUDIO
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Inpainting inteligente por máscaras y expansión de lienzos IA.
          </p>
        </div>
      </button>
      <button
        onClick={() => s("pro-effects")}
        className="group glass glass-hover relative p-12 rounded-[3.5rem] text-left space-y-6 overflow-hidden border-emerald-500/10 hover:border-emerald-500/40 transition-all duration-500"
      >
        <div className="absolute -top-12 -right-12 p-8 text-emerald-500/5 transform group-hover:scale-125 group-hover:-rotate-6 transition-transform duration-1000">
          <SlidersVertical size={280} />
        </div>
        <div className="bg-gradient-to-br from-emerald-400 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white p-4 shadow-[0_0_30px_rgba(52,211,153,0.3)] group-hover:scale-110 transition-transform">
          <SlidersVertical size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            PRO EFFECTS
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Laboratorio de acabados, presets pro y upscaling de
            ultra-definición.
          </p>
        </div>
      </button>
    </div>
  </div>
);
