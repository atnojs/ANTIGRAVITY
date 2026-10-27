/*
 * Selector — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: Hv.
 * Desplegable reutilizable con cierre al hacer clic fuera.
 */

import React from "react";
import { Check, ChevronDown } from "lucide-react";
export function SelectField({
  label: s,
  options: e,
  value: i,
  onChange: r,
  className: o = "",
}) {
  const [c, d] = React.useState(!1),
    p = React.useRef(null),
    g = e.find((y) => y.id === i) || e[0];
  return (
    React.useEffect(() => {
      const y = (b) => {
        p.current && !p.current.contains(b.target) && d(!1);
      };
      return (
        document.addEventListener("mousedown", y),
        () => document.removeEventListener("mousedown", y)
      );
    }, []),
    (
      <div className={`space-y-2 ${o}`} ref={p}>
        {s && (
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
            {s}
          </label>
        )}
        <div className="relative">
          <button
            onClick={() => d(!c)}
            className="w-full glass p-4 rounded-2xl flex items-center justify-between border-white/5 hover:border-white/10 transition-all text-xs font-bold text-slate-200 group"
          >
            <span className="truncate">{g.label || g.name}</span>
            <ChevronDown
              className={`text-slate-500 transition-transform duration-300 ${c ? "rotate-180" : ""}`}
              size={16}
            />
          </button>
          {c && (
            <div className="absolute z-[100] w-full mt-2 glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="max-h-60 overflow-y-auto custom-scrollbar bg-black/40 backdrop-blur-xl">
                {e.map((y) => (
                  <button
                    onClick={() => {
                      (r(y.id), d(!1));
                    }}
                    className={`w-full px-5 py-3 text-left text-[11px] font-bold transition-all flex items-center justify-between group
                    ${y.id === i ? "bg-white/10 text-cyan-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    <span className="truncate">{y.label || y.name}</span>
                    {y.id === i && <Check size={14} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  );
}
