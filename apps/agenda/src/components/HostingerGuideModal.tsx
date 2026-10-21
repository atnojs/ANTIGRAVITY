import React, { useState } from 'react';
import { Server, HardDrive, Terminal, ShieldCheck, X, Copy, Check } from 'lucide-react';

interface HostingerGuideModalProps {
  onClose: () => void;
}

/**
 * Información real del despliegue de esta agenda. No es una app Node/SQLite:
 * el frontend es estático (Vite) y el backend es PHP en el hosting compartido.
 */
export const HostingerGuideModal: React.FC<HostingerGuideModalProps> = ({ onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Dónde vive la agenda',
      content:
        'Esta app está publicada en https://atnojs.es/apps/agenda/. El frontend es un build de Vite (HTML + JS + CSS) y el backend es PHP 8: no hay Node, ni PM2, ni SQLite que mantener.',
      badge: 'Producción',
    },
    {
      title: '2. Dónde están tus datos',
      content:
        'Citas, tareas y notas se guardan en data/state.json con escritura atómica y bloqueo (flock). Los audios van a data/audio/. Esa carpeta está protegida por .htaccess y fuera de Git: cada despliegue NO la pisa.',
      badge: 'Persistencia',
    },
    {
      title: '3. Transcripción de voz',
      content:
        'La transcripción usa la API de OpenAI, con la clave que ya vive en el .htaccess raíz del servidor (OPENAI_API_KEY o su alias O). Nunca se escribe en el repositorio ni se envía al navegador. Si el servicio falla, el audio se guarda igualmente y puedes escribir la transcripción a mano.',
      badge: 'OpenAI',
    },
    {
      title: '4. Clasificación de la nota',
      content:
        'Las reglas en PHP (en español) detectan citas, tareas y notas, además de fechas, horas y prioridad. El resultado siempre lo revisas tú antes de guardar: la app no crea nada automáticamente.',
      badge: 'Reglas',
    },
    {
      title: '5. Acceso y seguridad',
      content:
        'La agenda pide la contraseña de edición del proyecto. La sesión es una cookie HttpOnly + SameSite=Strict y las escrituras llevan token CSRF. Sin sesión, la API responde 401 y los audios no se sirven.',
      badge: 'Privado',
    },
    {
      title: '6. Copia de seguridad',
      content:
        'Descarga desde hPanel la carpeta data/ (state.json + audio) para tener una copia. El repositorio de GitHub solo contiene código: los datos personales no se versionan.',
      badge: 'Backup',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cómo funciona esta agenda</h2>
              <p className="text-xs text-slate-500">PHP + JSON en Hostinger, transcripción con OpenAI y acceso privado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-lg p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">Autoalojado y sin dependencias frágiles:</strong>
              el frontend es estático y el backend PHP usa ficheros JSON con bloqueo. No hay
              base de datos externa ni servicio Node que reiniciar. Tus datos se quedan en tu
              hosting.
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold text-slate-900">{step.title}</h3>
                  {step.badge && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {step.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{step.content}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900">Endpoints útiles</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyCode(
                    'Transcripción: POST https://atnojs.es/apps/agenda/api/audio/process\nSalud: GET https://atnojs.es/apps/agenda/api/health',
                    steps.length
                  )
                }
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                title="Copiar rutas"
              >
                {copiedIndex === steps.length ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <pre className="mt-2.5 p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
              {`Transcripción: POST /apps/agenda/api/audio/process
Salud:        GET  /apps/agenda/api/health
Datos:        /apps/agenda/data/ (protegido)
Audios:       /apps/agenda/uploads/audio/ (requiere sesión)`}
            </pre>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Almacenamiento local del servidor · JSON con bloqueo · audios fuera de Git</span>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
