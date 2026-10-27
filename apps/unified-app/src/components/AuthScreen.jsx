/*
 * Pantalla de acceso — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: FN.
 * Login y registro con email/contraseña y con Google.
 */

import React from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  Lock,
  Mail,
} from "lucide-react";
import { auth, db } from "../lib/firebase";
export function AuthScreen({ onAuthSuccess: s }) {
  const [e, i] = React.useState(!0),
    [r, o] = React.useState(""),
    [c, d] = React.useState(""),
    [p, g] = React.useState(""),
    [y, b] = React.useState(!1),
    S = async (Q) => {
      const Z = doc(db, "users", Q.uid);
      (await getDoc(Z)).exists() ||
        (await setDoc(Z, {
          email: Q.email,
          role: "free",
          usageCount: 0,
          lastDate: new Date().toISOString().split("T")[0],
          lastActive: new Date().getTime(),
        }));
    },
    R = async (Q) => {
      (Q.preventDefault(), g(""), b(!0));
      try {
        let Z;
        (e
          ? (Z = await signInWithEmailAndPassword(auth, r, c))
          : (Z = await createUserWithEmailAndPassword(auth, r, c)),
          await S(Z.user),
          s?.());
      } catch (Z) {
        (console.error(Z),
          g(
            Z.message.includes("auth/")
              ? "Credenciales inválidas o error de red."
              : Z.message,
          ));
      } finally {
        b(!1);
      }
    },
    B = async () => {
      const Q = new GoogleAuthProvider();
      b(!0);
      try {
        const Z = await signInWithPopup(auth, Q);
        (await S(Z.user), s?.());
      } catch (Z) {
        g(Z.message);
      } finally {
        b(!1);
      }
    };
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md glass p-10 rounded-[3rem] border-white/10 shadow-[0_32px_120px_-10px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center text-cyan-400 mx-auto mb-6 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <Lock size={40} />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
            {e ? "Bienvenido" : "Únete Gratis"}
          </h2>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase mt-2">
            {e ? "Identidad Creativa Requerida" : "Comienza tu viaje visual"}
          </p>
        </div>
        {p && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold leading-tight">
            <CircleAlert size={20} className="shrink-0" />
            {p}
          </div>
        )}
        <form onSubmit={R} className="space-y-4">
          <div className="relative group">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
              size={18}
            />
            <input
              type="email"
              placeholder="Email Corporativo / Personal"
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-cyan-500/30 transition-all font-medium"
              value={r}
              onChange={(Q) => o(Q.target.value)}
              required={!0}
            />
          </div>
          <div className="relative group">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
              size={18}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-cyan-500/30 transition-all font-medium"
              value={c}
              onChange={(Q) => d(Q.target.value)}
              required={!0}
            />
          </div>
          <button
            type="submit"
            disabled={y}
            className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95 shadow-xl uppercase tracking-widest text-xs"
          >
            {y ? (
              <LoaderCircle className="animate-spin" />
            ) : e ? (
              "Entrar al Estudio"
            ) : (
              "Crear Cuenta"
            )}
            {!y && <ArrowRight size={16} />}
          </button>
        </form>
        <div className="mt-8 flex items-center gap-4 text-slate-600">
          <div className="h-px bg-white/5 flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            O accede con
          </span>
          <div className="h-px bg-white/5 flex-1" />
        </div>
        <button
          onClick={B}
          disabled={y}
          className="mt-6 w-full py-4 glass border-white/5 hover:bg-white/5 rounded-2xl flex items-center justify-center gap-3 text-slate-300 font-bold text-xs uppercase tracking-widest transition-all"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            className="w-5 h-5"
            alt="G"
          />
          Google ID
        </button>
        <p className="mt-10 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {e ? "¿No tienes acceso?" : "¿Ya eres miembro?"}
          <button
            onClick={() => i(!e)}
            className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {e ? "Regístrate aquí" : "Inicia Sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
