/*
 * Panel de administración — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: QN.
 * Panel de administración en tiempo real (usuarios, roles y uso).
 */

import React from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  Activity,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { db } from "../lib/firebase";
import { StatCard } from "./StatCard";
export function AdminPanel({ onClose: s }) {
  const [e, i] = React.useState([]),
    [r, o] = React.useState(!0),
    [c, d] = React.useState(""),
    [p, g] = React.useState({
      total: 0,
      activeToday: 0,
      vip: 0,
    });
  React.useEffect(() => {
    const R = query(
        collection(db, "users"),
        orderBy("lastActive", "desc"),
        limit(100),
      ),
      B = onSnapshot(
        R,
        (Q) => {
          const Z = Q.docs.map((re) => ({
            id: re.id,
            ...re.data(),
          }));
          i(Z);
          const W = new Date().toISOString().split("T")[0];
          (g({
            total: Z.length,
            activeToday: Z.filter((re) => re.lastDate === W).length,
            vip: Z.filter((re) => re.role === "vip" || re.role === "admin")
              .length,
          }),
            o(!1));
        },
        (Q) => {
          (console.error("Error fetching users:", Q), o(!1));
        },
      );
    return () => B();
  }, []);
  const y = async (R, B) => {
      try {
        await updateDoc(doc(db, "users", R), {
          role: B,
        });
      } catch (Q) {
        alert("Error al actualizar rol: " + Q.message);
      }
    },
    b = async (R) => {
      try {
        await updateDoc(doc(db, "users", R), {
          usageCount: 0,
        });
      } catch (B) {
        alert("Error al resetear uso: " + B.message);
      }
    },
    S = e.filter(
      (R) =>
        R.email?.toLowerCase().includes(c.toLowerCase()) ||
        R.id?.toLowerCase().includes(c.toLowerCase()),
    );
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] glass rounded-[3rem] border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black gradient-text uppercase tracking-tighter">
              Control Central
            </h2>
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">
              Panel de Administración • Tiempo Real
            </p>
          </div>
          <button
            onClick={s}
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all text-slate-400"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            label="Usuarios Totales"
            value={p.total}
            color="text-cyan-400"
          />
          <StatCard
            icon={Activity}
            label="Activos Hoy"
            value={p.activeToday}
            color="text-purple-400"
          />
          <StatCard
            icon={ShieldCheck}
            label="Usuarios VIP/Admin"
            value={p.vip}
            color="text-emerald-400"
          />
        </div>
        <div className="px-8 pb-4 flex gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por email o ID..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-cyan-500/50 transition-all"
              value={c}
              onChange={(R) => d(R.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-8 pb-8 custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-4">
                <th className="pb-4 pl-4">Usuario</th>
                <th className="pb-4">Rol</th>
                <th className="pb-4">Uso (Hoy)</th>
                <th className="pb-4">Última Actividad</th>
                <th className="pb-4 pr-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {r ? (
                <tr>
                  <td colSpan="5" className="text-center py-20">
                    <RefreshCcw
                      className="animate-spin mx-auto text-cyan-500 mb-4"
                      size={32}
                    />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                      Cargando base de datos...
                    </p>
                  </td>
                </tr>
              ) : (
                S.map((R) => (
                  <tr className="glass hover:bg-white/5 transition-colors group">
                    <td className="py-4 pl-6 rounded-l-2xl border-l border-y border-white/5">
                      <p className="text-sm font-bold text-white mb-1">
                        {R.email || "Anónimo"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-tighter">
                        {R.id}
                      </p>
                    </td>
                    <td className="py-4 border-y border-white/5">
                      <select
                        value={R.role || "free"}
                        onChange={(B) => y(R.id, B.target.value)}
                        className="bg-transparent text-xs font-bold text-cyan-400 outline-none cursor-pointer"
                      >
                        <option value="free" className="bg-slate-900">
                          FREE
                        </option>
                        <option value="vip" className="bg-slate-900">
                          VIP
                        </option>
                        <option value="admin" className="bg-slate-900">
                          ADMIN
                        </option>
                      </select>
                    </td>
                    <td className="py-4 border-y border-white/5">
                      <span
                        className={`text-sm font-black ${R.usageCount >= 8 ? "text-red-400" : "text-slate-300"}`}
                      >
                        {R.usageCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">
                        / 8
                      </span>
                    </td>
                    <td className="py-4 border-y border-white/5">
                      <p className="text-xs text-slate-400 font-medium">
                        {R.lastDate || "Nunca"}
                      </p>
                    </td>
                    <td className="py-4 pr-6 rounded-r-2xl border-r border-y border-white/5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => b(R.id)}
                          className="p-2 bg-white/5 rounded-xl hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-all"
                          title="Resetear uso diario"
                        >
                          <RefreshCcw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
