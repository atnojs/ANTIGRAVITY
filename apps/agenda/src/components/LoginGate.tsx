import React, { useEffect, useState } from 'react';
import { Calendar, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { authStatus, login } from '../lib/api';

interface LoginGateProps {
  children: React.ReactNode;
}

/**
 * Puerta de acceso: la agenda guarda datos personales, así que el frontend no
 * se pinta hasta confirmar la sesión. La contraseña es la de edición del
 * proyecto y se valida siempre en el servidor (auth.php).
 */
export const LoginGate: React.FC<LoginGateProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authStatus()
      .then((status) => {
        if (active) setAuthenticated(status.auth);
      })
      .catch(() => {
        if (active) setError('No se pudo contactar con el servidor. Recarga la página.');
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    const onUnauthorized = () => setAuthenticated(false);
    window.addEventListener('agenda:unauthorized', onUnauthorized);

    return () => {
      active = false;
      window.removeEventListener('agenda:unauthorized', onUnauthorized);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const status = await login(password);
      if (!status.auth) {
        throw new Error('Contraseña incorrecta.');
      }
      setPassword('');
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Comprobando sesión…</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100/70 text-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Agenda Personal</h1>
              <p className="text-xs text-slate-500">Servidor propio · atnojs.es</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Esta agenda guarda tus citas, tareas, notas y audios. Introduce la contraseña de
            edición del proyecto para entrar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Contraseña
              </span>
              <div className="relative mt-1">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tu contraseña"
                />
              </div>
            </label>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{submitting ? 'Entrando…' : 'Entrar'}</span>
            </button>
          </form>

          <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">
            Acceso privado. Los datos viven en el servidor, no en este navegador.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
