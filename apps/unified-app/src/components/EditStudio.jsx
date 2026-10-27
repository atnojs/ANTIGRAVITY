/*
 * Edit Studio — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: HN.
 * Inpainting sobre una imagen con máscara y motores Gemini / Seadreams.
 */

import React from "react";
import { doc, increment, updateDoc } from "firebase/firestore";
import {
  Check,
  Download,
  Image,
  Info,
  Layers,
  Paintbrush,
  RefreshCw,
  Sparkles,
  Upload,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";
import { db } from "../lib/firebase";
import { MaskEditorModal } from "./MaskEditorModal";
export function EditStudio({
  user: s,
  userData: e,
  initialImage: i,
  onTransfer: r,
}) {
  const [o, c] = React.useState(i || null),
    [d, p] = React.useState(!1),
    [g, y] = React.useState(null),
    [b, S] = React.useState(""),
    [R, B] = React.useState("gemini"),
    [Q, Z] = React.useState(null),
    [W, re] = React.useState(!1),
    ee = (fe) => {
      const de = fe.target.files[0];
      if (de) {
        const x = new FileReader();
        ((x.onload = (w) => c(w.target.result)), x.readAsDataURL(de));
      }
    },
    te = (fe) => {
      (y(fe), p(!1));
    },
    ce = async () => {
      if (!(!b.trim() || !g)) {
        re(!0);
        try {
          const fe = await api.editWithMask(b, g.original, g.mask, R);
          (Z(fe),
            s &&
              (await updateDoc(doc(db, "users", s.uid), {
                usageCount: increment(1),
                lastActive: new Date().getTime(),
              })));
        } catch (fe) {
          alert(fe.message);
        } finally {
          re(!1);
        }
      }
    };
  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
      {d && <MaskEditorModal src={o} onSave={te} onClose={() => p(!1)} />}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-purple-500/20 space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <Layers className="text-purple-400" /> RECONFIGURAR
            </h3>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Motor de Edición
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => B("gemini")}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${R === "gemini" ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-white/5 bg-white/5 text-slate-500"}`}
                >
                  <Zap size={20} />
                  <span className="text-[10px] font-black uppercase">
                    Gemini 3
                  </span>
                </button>
                <button
                  onClick={() => B("seadreams")}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${R === "seadreams" ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-white/5 bg-white/5 text-slate-500"}`}
                >
                  <Sparkles size={20} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    Seadreams 4.0
                  </span>
                </button>
              </div>
            </div>
            {o ? (
              <div className="space-y-4">
                <div className="relative group rounded-2xl overflow-hidden glass border-white/10">
                  <img
                    src={o}
                    className="w-full h-48 object-cover opacity-50 group-hover:opacity-80 transition-opacity"
                  />
                  <button
                    onClick={() => c(null)}
                    className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-lg hover:bg-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => p(!0)}
                      className="px-6 py-3 bg-purple-600 text-white font-black text-[10px] rounded-xl flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform"
                    >
                      <Paintbrush size={14} />{" "}
                      {g ? "EDITAR MÁSCARA" : "PINTAR ZONA"}
                    </button>
                  </div>
                </div>
                {g && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <Check className="text-emerald-400" size={16} />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      Máscara Lista
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <label className="block w-full h-64 glass border-dashed border-white/10 rounded-[2rem] cursor-pointer hover:border-purple-500/30 transition-all group overflow-hidden">
                <input
                  type="file"
                  className="hidden"
                  onChange={ee}
                  accept="image/*"
                />
                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 group-hover:text-purple-400 transition-colors">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Subir Imagen Base</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">
                      JPG, PNG hasta 10MB
                    </p>
                  </div>
                </div>
              </label>
            )}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Instrucción Maestra
              </label>
              <textarea
                placeholder="Ej: Reemplaza el cielo por una supernova púrpura..."
                value={b}
                onChange={(fe) => S(fe.target.value)}
                className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-purple-500/40 transition-all font-medium resize-none custom-scrollbar"
              />
            </div>
            <button
              disabled={!o || !g || !b.trim() || W}
              onClick={ce}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 btn-3d disabled:opacity-30 uppercase tracking-widest text-xs"
            >
              {W ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <WandSparkles size={18} />
              )}
              {W ? "PROCESANDO..." : "REGENERAR MÁSCARA"}
            </button>
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          {Q ? (
            <div className="space-y-6">
              <div className="glass rounded-[3rem] overflow-hidden border-white/5 shadow-2xl bg-[#0a0f1e] group relative">
                <img
                  src={Q}
                  className="w-full h-auto animate-in zoom-in-95 duration-700"
                />
                <div className="absolute top-6 right-6 flex gap-2">
                  <button className="p-4 glass rounded-2xl hover:bg-white/10 text-white transition-all">
                    <Image size={20} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => r?.("pro-effects", Q)}
                  className="flex-1 py-5 glass rounded-[2rem] border-purple-500/30 text-purple-400 font-black text-xs uppercase tracking-widest hover:bg-purple-500/10 transition-all"
                >
                  Mejorar Calidad
                </button>
                <button
                  onClick={async () => {
                    try {
                      const de = await (await fetch(Q)).blob(),
                        x = window.URL.createObjectURL(de),
                        w = document.createElement("a");
                      ((w.href = x),
                        (w.download = "unified-edit.png"),
                        document.body.appendChild(w),
                        w.click(),
                        window.URL.revokeObjectURL(x));
                    } catch {
                      window.open(Q, "_blank");
                    }
                  }}
                  className="flex-1 py-5 bg-white text-black font-black rounded-[2rem] text-center text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Descargar Arte
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] glass rounded-[3.5rem] border-dashed border-white/5 flex flex-col items-center justify-center p-12 text-center gap-6">
              <div className="w-24 h-24 bg-purple-500/5 rounded-full flex items-center justify-center text-purple-500/20">
                <WandSparkles size={64} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-200 mb-2 tracking-tight">
                  Estudio de Edición Inteligente
                </h4>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Sube una imagen, marca la zona que quieres cambiar y deja que
                  la IA se encargue del resto con{" "}
                  <span className="text-purple-400 font-bold">
                    Inpainting Cuántico
                  </span>
                  .
                </p>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                  <Zap size={12} className="text-cyan-400" /> Ultra Rápido
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                  <Info size={12} className="text-purple-400" /> Multicapa
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
