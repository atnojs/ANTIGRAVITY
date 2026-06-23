import React, { useEffect, useRef } from "react";
import { Terminal, ShieldX, CheckCircle, HelpCircle } from "lucide-react";
import { CompilationLog } from "../types.js";

interface ConsoleViewProps {
  log: CompilationLog;
  onRetry: () => void;
  technology: string;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ log, onRetry, technology }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [log.stdout, log.stderr]);

  const hasContent = log.stdout || log.stderr;

  return (
    <div className="space-y-4 font-sans" id="console-terminal-view">
      {/* Semantic Summary card for Non-Technical Users */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {log.status === "success" ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                <CheckCircle size={18} />
              </div>
            ) : log.status === "failed" ? (
              <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
                <ShieldX size={18} />
              </div>
            ) : log.status === "idle" ? (
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-600">
                <HelpCircle size={18} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-1 flex-1">
            <h4 className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {log.status === "idle" && "Estado: Esperando compilación"}
              {log.status === "installing" && "Estado: Instalando dependencias"}
              {log.status === "compiling" && "Estado: Compilando recursos estáticos"}
              {log.status === "success" && "Estado: Compilación exitosa para producción"}
              {log.status === "failed" && "Estado: Fallo en el proceso de compilación"}
            </h4>
            <p className="text-xs text-neutral-500 max-w-xl">
              {log.status === "idle" && "Tu proyecto estático o PHP no requiere compilación previa obligatoria, pero proyectos Node/Vite requerirán generar sus compilados estáticos antes del empaquetamiento."}
              {log.status === "installing" && "Instalando paquetes reales necesarios declarados en package.json en un entorno temporal aislado. Esto puede tardar unos segundos."}
              {log.status === "compiling" && "Ejecutando proceso de transformación con Webpack/Vite/Vite bundler para comprimir recursos CSS y JS para Hostinger."}
              {log.status === "success" && "Se han generado todos los recursos compilados listos para empaquetamiento. Tu sitio web se ejecutará de forma super veloz en Hostinger."}
              {log.status === "failed" && (log.errorMsg || "Comprueba los códigos de error del terminal para realizar modificaciones complementarias.")}
            </p>
          </div>
        </div>
      </div>

      {/* Actual CLI Terminal Component */}
      <div className="border border-neutral-800 rounded-xl overflow-hidden shadow-lg shadow-neutral-900/20">
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <Terminal size={14} className="text-emerald-500" />
            <span>Terminal de Compilación (Consola Técnica - {technology})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 block" />
          </div>
        </div>

        <div className="bg-neutral-950 font-mono text-xs text-neutral-300 p-4 h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 space-y-1.5 leading-relaxed selection:bg-emerald-500/20 select-text">
          {hasContent ? (
            <div className="whitespace-pre-wrap breakdown-words font-mono">
              {log.stdout}
              {log.stderr && (
                <span className="text-rose-400 font-bold block mt-2">
                  [STDERR/ERRORLOGS]:
                  {"\n" + log.stderr}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <span>A la espera de iniciar comandos del sistema.</span>
              <span className="text-[10px] text-neutral-600 mt-1">Presiona el botón de Compilar para inicializar.</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {log.status === "failed" && (
        <button
          onClick={onRetry}
          className="text-xs px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Reintentar Compilación
        </button>
      )}
    </div>
  );
};
