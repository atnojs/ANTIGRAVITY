/*
 * AI Lab — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: PN / jN / zN + BN.
 * Generación de imágenes con prompt, formatos, estilos e historial.
 */

import React from "react";
import { doc, increment, updateDoc } from "firebase/firestore";
import {
  History,
  Image,
  Lightbulb,
  LoaderCircle,
  Palette,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";
import { db } from "../lib/firebase";
const ASPECT_RATIOS = [
    {
      id: "1:1",
      label: "1:1",
    },
    {
      id: "16:9",
      label: "16:9",
    },
    {
      id: "9:16",
      label: "9:16",
    },
    {
      id: "21:9",
      label: "21:9",
    },
  ],
  PROMPT_BOOSTERS = [
    "hyper-detailed 8k",
    "unreal engine 5 render",
    "cinematic lighting",
    "masterpiece",
    "photorealistic",
    "volumetric rays",
    "extremely sharp focus",
  ],
  STYLE_PRESETS = [
    {
      label: "Anime",
      prompt: "masterpiece anime style, vibrant colors",
    },
    {
      label: "Cine",
      prompt: "cinematic movie still, shallow depth of field, 35mm",
    },
    {
      label: "Óleo",
      prompt: "thick palette knife oil painting, heavy texture",
    },
    {
      label: "Cyber",
      prompt: "cyberpunk aesthetic, neon city, rainy night",
    },
  ];
export function AILab({ user: s, userData: e, onTransfer: i }) {
  const [r, o] = React.useState(""),
    [c, d] = React.useState(!1),
    [p, g] = React.useState(!1),
    [y, b] = React.useState([]),
    [S, R] = React.useState("1:1"),
    [B, Q] = React.useState([]),
    Z = async (ee = r) => {
      if (!ee.trim()) return;
      const te = e?.role === "vip" || e?.role === "admin",
        ce = e?.usageCount || 0;
      if (!te && ce >= 8) {
        alert(
          "Has alcanzado el límite diario (8 imágenes). ¡Pásate a VIP para creación ilimitada!",
        );
        return;
      }
      d(!0);
      try {
        const fe = await api.generateImage(ee, S);
        if (
          (b([
            {
              id: Date.now(),
              url: fe,
              prompt: ee,
            },
            ...y,
          ]),
          s)
        ) {
          const de = doc(db, "users", s.uid);
          await updateDoc(de, {
            usageCount: increment(1),
            lastActive: new Date().getTime(),
          });
        }
      } catch (fe) {
        alert(fe.message);
      } finally {
        d(!1);
      }
    },
    W = async () => {
      if (r.trim()) {
        g(!0);
        try {
          const ee = await api.enhancePrompt(r);
          Q(ee.options || []);
        } catch (ee) {
          console.error(ee);
        } finally {
          g(!1);
        }
      }
    },
    re = () => {
      const ee = `${r}, ${PROMPT_BOOSTERS.join(", ")}`;
      o(ee);
    };
  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <aside className="lg:w-96 flex flex-col gap-8">
        <div className="glass p-8 rounded-[2.5rem] border-cyan-500/20 space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Prompt Maestro
            </label>
            <button
              onClick={re}
              className="text-[9px] font-black text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded bg-emerald-500/5 hover:bg-emerald-500/10 transition-all flex items-center gap-1"
            >
              <Zap size={10} /> BOOST 8K
            </button>
          </div>
          <div className="relative">
            <textarea
              value={r}
              onChange={(ee) => o(ee.target.value)}
              placeholder="Describe tu visión..."
              className="w-full h-44 bg-black/30 border border-white/5 rounded-2xl p-5 text-sm outline-none resize-none focus:border-cyan-400/50 transition-all font-medium custom-scrollbar"
            />
            <button
              onClick={W}
              disabled={p || !r.trim()}
              className="absolute bottom-3 right-3 p-3 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all border border-cyan-500/20 disabled:opacity-30"
              title="Expandir con IA"
            >
              {p ? (
                <LoaderCircle className="animate-spin w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((ee) => (
              <button
                onClick={() => o(`${r} (${ee.prompt})`)}
                className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:border-white/10 transition-all flex items-center gap-2"
              >
                <Palette size={12} className="text-cyan-500/50" /> {ee.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Formato
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((ee) => (
                <button
                  onClick={() => R(ee.id)}
                  className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${S === ee.id ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-white/5 bg-white/5 text-slate-500 hover:border-white/10"}`}
                >
                  {ee.label}
                </button>
              ))}
            </div>
          </div>
          {B.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">
                Sugerencias de la IA
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {B.map((ee, te) => (
                  <button
                    onClick={() => {
                      (o(ee), Q([]));
                    }}
                    className="w-full p-3 text-left text-[11px] bg-purple-500/5 border border-purple-500/10 rounded-xl hover:bg-purple-500/10 transition-all text-slate-400 hover:text-slate-200 line-clamp-2"
                  >
                    {ee}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => Z()}
            disabled={c || !r.trim()}
            className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl btn-3d disabled:opacity-30"
          >
            {c ? (
              <LoaderCircle className="animate-spin" size={20} />
            ) : (
              <WandSparkles size={20} />
            )}
            {c ? "INYECTANDO CREATIVIDAD..." : "GENERAR OBRA MAESTRA"}
          </button>
        </div>
      </aside>
      <main className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-3 text-white/50">
            <History size={24} /> HISTORIAL
          </h2>
          <span className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {y.length} Archivos
          </span>
        </div>
        {y.length === 0 ? (
          <div className="h-[600px] glass rounded-[3.5rem] border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600 gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/10 blur-[60px] rounded-full" />
              <Image size={64} className="opacity-20 relative" />
            </div>
            <p className="font-bold uppercase tracking-widest text-xs">
              El lienzo está esperando...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {y.map((ee) => (
              <div className="group relative glass rounded-[3rem] overflow-hidden border-white/5 hover:border-cyan-500/30 transition-all duration-500">
                <img
                  src={ee.url}
                  alt={ee.prompt}
                  className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-10 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={14} className="text-cyan-400" />
                    <p className="text-[11px] text-slate-300 line-clamp-2 font-bold uppercase tracking-tighter leading-tight">
                      {ee.prompt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const ce = await (await fetch(ee.url)).blob(),
                            fe = window.URL.createObjectURL(ce),
                            de = document.createElement("a");
                          ((de.href = fe),
                            (de.download = `unified-lab-${ee.id}.png`),
                            document.body.appendChild(de),
                            de.click(),
                            window.URL.revokeObjectURL(fe));
                        } catch {
                          window.open(ee.url, "_blank");
                        }
                      }}
                      className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase hover:bg-white text-black transition-all text-center"
                    >
                      Exportar
                    </button>
                    <button
                      onClick={() => i?.("edit-studio", ee.url)}
                      className="px-6 py-4 glass rounded-2xl text-[10px] font-black uppercase border-purple-500/30 hover:bg-purple-500 bg-purple-500/10 text-white transition-all shadow-xl"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => i?.("pro-effects", ee.url)}
                      className="px-6 py-4 glass rounded-2xl text-[10px] font-black uppercase border-emerald-500/30 hover:bg-emerald-500 bg-emerald-500/10 text-white transition-all shadow-xl"
                    >
                      Retocar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
