/*
 * Editor de máscara — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: qN.
 * Editor de precisión: pinta la máscara que se enviará al inpainting.
 */

import React from "react";
import {
  Check,
  Eraser,
  Maximize2,
  Minimize2,
  Paintbrush,
  X,
} from "lucide-react";
export function MaskEditorModal({ src: s, onSave: e, onClose: i }) {
  const r = React.useRef(null),
    o = React.useRef(null),
    [c, d] = React.useState(!1),
    [p, g] = React.useState(40),
    [y, b] = React.useState(1),
    [S, R] = React.useState(null);
  (React.useEffect(() => {
    const te = r.current;
    if (!te) return;
    const ce = te.getContext("2d");
    ((ce.lineCap = "round"),
      (ce.lineJoin = "round"),
      (ce.strokeStyle = "rgba(34, 211, 238, 0.6)"),
      R(ce));
  }, []),
    React.useEffect(() => {
      S && (S.lineWidth = p);
    }, [p, S]));
  const B = () => {
      const te = o.current,
        ce = r.current;
      ((ce.width = te.naturalWidth), (ce.height = te.naturalHeight));
    },
    Q = (te) => {
      const ce = r.current.getBoundingClientRect(),
        fe =
          ((te.clientX || te.touches[0].clientX) - ce.left) *
          (r.current.width / ce.width),
        de =
          ((te.clientY || te.touches[0].clientY) - ce.top) *
          (r.current.height / ce.height);
      return {
        x: fe,
        y: de,
      };
    },
    Z = (te) => {
      d(!0);
      const { x: ce, y: fe } = Q(te);
      (S.beginPath(), S.moveTo(ce, fe));
    },
    W = (te) => {
      if (!c) return;
      const { x: ce, y: fe } = Q(te);
      (S.lineTo(ce, fe), S.stroke());
    },
    re = () => {
      (d(!1), S.closePath());
    },
    ee = () => {
      const te = r.current,
        ce = document.createElement("canvas");
      ((ce.width = te.width), (ce.height = te.height));
      const fe = ce.getContext("2d");
      ((fe.fillStyle = "black"),
        fe.fillRect(0, 0, ce.width, ce.height),
        (fe.globalCompositeOperation = "source-over"),
        fe.drawImage(te, 0, 0));
      const de = fe.getImageData(0, 0, ce.width, ce.height);
      for (let x = 0; x < de.data.length; x += 4)
        de.data[x + 3] > 0 &&
          ((de.data[x] = 255),
          (de.data[x + 1] = 255),
          (de.data[x + 2] = 255),
          (de.data[x + 3] = 255));
      (fe.putImageData(de, 0, 0),
        e({
          original: s,
          mask: ce.toDataURL("image/png").split(",")[1],
          visual: te.toDataURL("image/png"),
        }));
    };
  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
          Editor de Precisión
        </h3>
        <button
          onClick={i}
          className="p-3 glass rounded-2xl hover:bg-white/5 transition-all"
        >
          <X className="text-slate-500" />
        </button>
      </div>
      <div className="flex-1 flex gap-8 items-center justify-center overflow-hidden">
        <div className="flex flex-col gap-4 glass p-4 rounded-3xl border-white/5">
          <button
            className="p-4 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 tooltip"
            title="Pincel"
          >
            <Paintbrush size={24} />
          </button>
          <button
            onClick={() => S.clearRect(0, 0, r.current.width, r.current.height)}
            className="p-4 glass text-slate-500 rounded-2xl hover:text-white transition-all tooltip"
            title="Limpiar todo"
          >
            <Eraser size={24} />
          </button>
          <div className="h-px bg-white/5 my-2" />
          <button
            onClick={() => b((te) => Math.min(te + 0.5, 3))}
            className="p-4 glass text-slate-500 rounded-2xl hover:text-white transition-all"
          >
            <Maximize2 size={24} />
          </button>
          <button
            onClick={() => b((te) => Math.max(te - 0.5, 1))}
            className="p-4 glass text-slate-500 rounded-2xl hover:text-white transition-all"
          >
            <Minimize2 size={24} />
          </button>
        </div>
        <div className="relative glass rounded-[3rem] overflow-hidden border-white/5 shadow-2xl cursor-crosshair group flex items-center justify-center bg-[#0a0f1e] p-10 flex-1 h-full">
          <div
            style={{
              transform: `scale(${y})`,
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="relative shadow-[0_0_100px_rgba(0,0,0,1)]"
          >
            <img
              ref={o}
              src={s}
              onLoad={B}
              className="max-h-[70vh] w-auto pointer-events-none select-none"
              alt="Source"
            />
            <canvas
              ref={r}
              onMouseDown={Z}
              onMouseMove={W}
              onMouseUp={re}
              onMouseLeave={re}
              onTouchStart={Z}
              onTouchMove={W}
              onTouchEnd={re}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>
      <div className="mt-8 glass p-6 rounded-[2.5rem] flex items-center justify-between border-white/5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-6 flex-1 pr-10">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Tamaño del Pincel
          </span>
          <input
            type="range"
            min="5"
            max="150"
            value={p}
            onChange={(te) => g(parseInt(te.target.value))}
            className="flex-1 accent-cyan-500 h-1 bg-white/5 rounded-full outline-none"
          />
          <span className="text-xs font-black text-cyan-400 w-12 text-center">
            {p}px
          </span>
        </div>
        <button
          onClick={ee}
          className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black rounded-2xl flex items-center gap-3 transition-all transform active:scale-95 shadow-xl btn-3d"
        >
          <Check size={20} /> LISTO PARA EDITAR
        </button>
      </div>
    </div>
  );
}
