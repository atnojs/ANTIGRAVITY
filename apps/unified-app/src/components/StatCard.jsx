/*
 * Tarjeta de estadística — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: nm.
 * Tarjeta de estadística del panel de administración.
 *
 * Nota de recuperación: el bundle recibía el icono en la prop `icon` y lo
 * renderizaba como `<s size={24}>`; en JSX un tag en minúsculas sería un
 * elemento HTML, así que el binding se restituye con nombre `Icon`.
 */

export const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass p-6 rounded-3xl border-white/5 flex items-center gap-5">
    <div
      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-opacity-20 border border-current`}
    >
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </p>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  </div>
);
