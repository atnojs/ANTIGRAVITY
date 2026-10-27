/*
 * Pro Effects — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: Gv / Fv + GN.
 * Ajustes de brillo, contraste y saturación, estilos IA y upscaler.
 */

import React from "react";
import { doc, increment, updateDoc } from "firebase/firestore";
import {
  Camera,
  Download,
  Eye,
  Maximize,
  RefreshCw,
  SlidersVertical,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { db } from "../lib/firebase";
import { SelectField } from "./SelectField";
const PRO_EFFECTS = [
    {
      id: "lego",
      label: "LEGO Universe",
      prompt: "Mundo LEGO",
    },
    {
      id: "comic-americano",
      label: "Efecto Marvel/DC",
      prompt: "Estilo Cómic Americano",
    },
    {
      id: "pixar",
      label: "CGI Pixar",
      prompt: "Estilo Pixar 3D",
    },
    {
      id: "tim-burton",
      label: "Gótico Burton",
      prompt: "Gótico Tim Burton",
    },
    {
      id: "cyberpunk",
      label: "Cyberpunk Neon",
      prompt: "Cyberpunk Aesthetic Neon Purples and Cyans 8k",
    },
    {
      id: "ghibli",
      label: "Anime Ghibli",
      prompt: "Studio Ghibli painting style soft colors",
    },
    {
      id: "vaporwave",
      label: "Vaporwave 90s",
      prompt: "Vaporwave aesthetic glitch art 90s",
    },
    {
      id: "surrealist",
      label: "Surrealismo Dalí",
      prompt: "Salvador Dali surrealism oil painting",
    },
    {
      id: "claymation",
      label: "Claymation/Arcilla",
      prompt: "Claymation model",
    },
    {
      id: "synthwave",
      label: "Retro-Synthwave",
      prompt: "80s synthwave retro-futurism aesthetic",
    },
    {
      id: "charcoal",
      label: "Carboncillo Pro",
      prompt: "Professional charcoal sketch on textured paper",
    },
    {
      id: "watercolor",
      label: "Acuarela Etérea",
      prompt: "Fluid watercolor painting artistic ink splashes",
    },
    {
      id: "isometric",
      label: "3D Isométrico",
      prompt: "Low poly isometric 3d render clean edges",
    },
    {
      id: "blueprint",
      label: "Plano Técnico/Blueprint",
      prompt: "Blue architectural blueprint technical schematic",
    },
    {
      id: "oil-classic",
      label: "Óleo Renacentista",
      prompt: "Classical oil painting masterpiece chiaroscuro",
    },
    {
      id: "pixel-art",
      label: "Pixel Art 16-bit",
      prompt: "SNES style pixel art 16-bit color palette",
    },
  ],
  UPSCALE_PRESETS = [
    {
      id: "1k",
      label: "Calidad 1K (Estándar)",
      scale: 1,
    },
    {
      id: "2k",
      label: "Calidad 2K (HD)",
      scale: 2,
    },
    {
      id: "4k",
      label: "Calidad 4K (Ultra Pro)",
      scale: 4,
    },
  ];
export function ProEffects({
  user: s,
  userData: e,
  initialImage: i,
  onTransfer: r,
}) {
  const [o, c] = React.useState(i || null),
    [d, p] = React.useState(i || null),
    [g, y] = React.useState("none"),
    [b, S] = React.useState("1k"),
    [R, B] = React.useState(!1),
    [Q, Z] = React.useState(!1),
    [W, re] = React.useState(!1),
    [ee, te] = React.useState(100),
    [ce, fe] = React.useState(100),
    [de, x] = React.useState(100),
    [w, N] = React.useState(0),
    V = (we) => {
      const Ke = we.target.files[0];
      if (Ke) {
        const G = new FileReader();
        ((G.onload = (ne) => {
          (c(ne.target.result), p(ne.target.result), O());
        }),
          G.readAsDataURL(Ke));
      }
    },
    O = () => {
      (te(100), fe(100), x(100), N(0));
    },
    L = async () => {
      if (!(!o || g === "none")) {
        Z(!0);
        try {
          const we = PRO_EFFECTS.find((G) => G.id === g),
            Ke = await api.applyStyle(
              `Transform this image completely into ${we.prompt} style. Maintain the composition but change the entire aesthetic.`,
              o,
            );
          (p(Ke),
            s &&
              (await updateDoc(doc(db, "users", s.uid), {
                usageCount: increment(1),
              })));
        } catch (we) {
          alert("Error al aplicar estilo: " + we.message);
        } finally {
          Z(!1);
        }
      }
    },
    I = async () => {
      if (o) {
        B(!0);
        try {
          const we = UPSCALE_PRESETS.find((G) => G.id === b).scale,
            Ke = await api.upscale(d || o, we);
          Ke.image &&
            (p(Ke.image),
            s &&
              (await updateDoc(doc(db, "users", s.uid), {
                usageCount: increment(1),
              })));
        } catch (we) {
          alert(we.message);
        } finally {
          B(!1);
        }
      }
    };
  return (
    <div className="flex flex-col gap-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <SlidersVertical className="text-emerald-400" /> AJUSTES PRO
              </h3>
              {o && (
                <button
                  onClick={() => {
                    (c(null), p(null));
                  }}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            {o ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Brillo
                    </label>
                    <span className="text-[10px] text-emerald-400 font-black">
                      {ee}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={ee}
                    onChange={(we) => te(we.target.value)}
                    className="w-full accent-emerald-500 bg-white/5 h-1 rounded-full outline-none"
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Contraste
                    </label>
                    <span className="text-[10px] text-cyan-400 font-black">
                      {ce}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={ce}
                    onChange={(we) => fe(we.target.value)}
                    className="w-full accent-cyan-500 bg-white/5 h-1 rounded-full outline-none"
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Saturación
                    </label>
                    <span className="text-[10px] text-pink-400 font-black">
                      {de}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={de}
                    onChange={(we) => x(we.target.value)}
                    className="w-full accent-pink-500 bg-white/5 h-1 rounded-full outline-none"
                  />
                </div>
                <div className="h-px bg-white/5" />
                <SelectField
                  label="Estilos Artísticos IA"
                  options={[
                    {
                      id: "none",
                      label: "Sin estilo",
                    },
                    ...PRO_EFFECTS,
                  ]}
                  value={g}
                  onChange={y}
                />
                <button
                  disabled={g === "none" || Q}
                  onClick={L}
                  className="w-full py-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-500/20 transition-all disabled:opacity-30 uppercase tracking-widest text-[10px]"
                >
                  {Q ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Aplicar Estilo IA
                </button>
                <div className="h-px bg-white/5" />
                <div className="space-y-4">
                  <SelectField
                    label="Resolución Final"
                    options={UPSCALE_PRESETS}
                    value={b}
                    onChange={S}
                  />
                  <button
                    disabled={R}
                    onClick={I}
                    className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl btn-3d uppercase tracking-widest text-xs"
                  >
                    {R ? (
                      <RefreshCw className="animate-spin" />
                    ) : (
                      <Maximize size={20} />
                    )}
                    {R ? "ESCALANDO..." : `UPSCALER AI ${b.toUpperCase()}`}
                  </button>
                </div>
              </div>
            ) : (
              <label className="block w-full h-80 glass border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/30 transition-all group overflow-hidden">
                <input
                  type="file"
                  className="hidden"
                  onChange={V}
                  accept="image/*"
                />
                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 group-hover:text-emerald-400">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={40} />
                  </div>
                  <div className="text-center px-6">
                    <p className="font-bold text-sm uppercase tracking-widest">
                      Cargar Imagen para Retoque de Precisión
                    </p>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          {o ? (
            <div className="flex flex-col gap-6">
              <div className="glass rounded-[3.5rem] overflow-hidden border-white/5 relative bg-[#050810] flex items-center justify-center p-4 min-h-[500px]">
                <img
                  src={W ? o : d || o}
                  className="max-h-[75vh] w-auto shadow-2xl rounded-2xl transition-all duration-300"
                  style={{
                    filter: W
                      ? "none"
                      : `brightness(${ee}%) contrast(${ce}%) saturate(${de}%)`,
                  }}
                />
                <div className="absolute top-10 left-10 flex gap-2">
                  <button
                    onMouseDown={() => re(!0)}
                    onMouseUp={() => re(!1)}
                    onMouseLeave={() => re(!1)}
                    className={`flex items-center gap-2 px-6 py-3 glass rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-white/5 ${W ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]" : "text-slate-400 hover:text-white"}`}
                  >
                    <Eye size={14} />
                    {W ? "Original" : "Ver Original"}
                  </button>
                </div>
                <div className="absolute bottom-10 right-10 flex gap-2">
                  <div className="px-5 py-2 glass rounded-full text-[10px] font-black text-cyan-400 border-cyan-500/30 uppercase tracking-[0.2em] shadow-2xl backdrop-blur-3xl">
                    {b} AI Output
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    try {
                      const Ke = await (await fetch(d || o)).blob(),
                        G = window.URL.createObjectURL(Ke),
                        ne = document.createElement("a");
                      ((ne.href = G),
                        (ne.download = `unified-pro-${b}.png`),
                        document.body.appendChild(ne),
                        ne.click(),
                        window.URL.revokeObjectURL(G));
                    } catch {
                      window.open(d || o, "_blank");
                    }
                  }}
                  className="flex-1 py-5 bg-white text-black font-black rounded-[2rem] text-center text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Descargar Maestría {b.toUpperCase()}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] glass rounded-[3.5rem] border-dashed border-white/5 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
                <Camera
                  size={80}
                  className="text-emerald-500/20 relative animate-pulse"
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white/50 uppercase tracking-tighter">
                  Laboratorio de Acabados
                </h2>
                <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
                  Personalización técnica, estilos masivos y escalado AI de
                  ultra-alta definición.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
