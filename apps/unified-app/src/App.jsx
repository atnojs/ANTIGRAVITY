/*
 * App — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: YN.
 * Raíz de la aplicación: sesión, navegación entre módulos y cierre de sesión.
 */

import React from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeft, LogOut, Shield } from "lucide-react";
import { AILab } from "./components/AILab";
import { AdminPanel } from "./components/AdminPanel";
import { AuthScreen } from "./components/AuthScreen";
import { EditStudio } from "./components/EditStudio";
import { ProEffects } from "./components/ProEffects";
import { SplashScreen } from "./components/SplashScreen";
import { auth, db } from "./lib/firebase";
export function App() {
  const [s, e] = React.useState(null),
    [i, r] = React.useState(null),
    [o, c] = React.useState("splash"),
    [d, p] = React.useState(!1),
    [g, y] = React.useState(!0),
    [b, S] = React.useState(null);
  (React.useEffect(() => {
    const Z = () => {
      signOut(auth);
    };
    return (
      window.addEventListener("beforeunload", Z),
      () => window.removeEventListener("beforeunload", Z)
    );
  }, []),
    React.useEffect(() => {
      const Z = onAuthStateChanged(auth, async (W) => {
        if ((y(!0), W))
          try {
            e(W);
            const re = await getDoc(doc(db, "users", W.uid));
            re.exists() && r(re.data());
          } catch (re) {
            console.error("Error loading user data:", re);
          }
        else (e(null), r(null));
        y(!1);
      });
      return () => Z();
    }, []));
  const R = async () => {
      (await signOut(auth), c("splash"), S(null));
    },
    B = (Z, W) => {
      (S(W), c(Z));
    },
    Q = () => {
      switch (o) {
        case "ai-lab":
          return <AILab user={s} userData={i} onTransfer={B} />;
        case "edit-studio":
          return (
            <EditStudio user={s} userData={i} initialImage={b} onTransfer={B} />
          );
        case "pro-effects":
          return (
            <ProEffects user={s} userData={i} initialImage={b} onTransfer={B} />
          );
        default:
          return (
            <div className="glass p-20 rounded-[3rem] text-center border-neon-cyan/20">
              <h2 className="text-5xl font-black uppercase mb-4">
                {o.replace("-", " ")}
              </h2>
              <p className="text-slate-400 text-xl">
                Módulo en construcción...
              </p>
              <div className="mt-10 flex justify-center">
                <div className="w-20 h-20 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin" />
              </div>
            </div>
          );
      }
    };
  return g ? (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  ) : g ? (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
          Iniciando Suite Pro...
        </p>
      </div>
    </div>
  ) : s ? (
    <div className="min-h-screen text-slate-200 custom-scrollbar overflow-y-auto">
      {d && <AdminPanel onClose={() => p(!1)} />}
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        {i?.role === "admin" && (
          <button
            onClick={() => p(!0)}
            className="px-6 py-3 glass rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 flex items-center gap-2 border-emerald-500/30 text-emerald-400"
          >
            <Shield size={14} /> Admin
          </button>
        )}
        <button
          onClick={R}
          className="w-12 h-12 glass rounded-2xl flex items-center justify-center hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all border-white/5"
        >
          <LogOut size={20} />
        </button>
      </div>
      {o === "splash" ? (
        <SplashScreen onNavigate={(Z) => c(Z)} userData={i} />
      ) : (
        <div className="max-w-7xl mx-auto p-10 pt-24">
          <button
            onClick={() => c("splash")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest mb-10 group"
          >
            <ChevronLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />{" "}
            Volver al Menú
          </button>
          {Q()}
        </div>
      )}
    </div>
  ) : (
    <AuthScreen onAuthSuccess={() => {}} />
  );
}
