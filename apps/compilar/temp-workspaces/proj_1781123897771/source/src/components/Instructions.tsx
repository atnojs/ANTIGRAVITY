import React from "react";
import { BookOpen, HelpCircle, Check, FileText, ArrowRight, CornerDownRight } from "lucide-react";
import { ProjectSummary, DatabaseConfig, DeploymentConfig } from "../types.js";

interface InstructionsProps {
  summary: ProjectSummary;
  deployment: DeploymentConfig | null;
  dbConfig?: DatabaseConfig;
}

export const Instructions: React.FC<InstructionsProps> = ({ summary, deployment, dbConfig }) => {
  const isSPA = ["React_Vite", "Vue_Vite", "NextJS"].includes(summary.technology);
  const isMySQL = !!dbConfig;

  return (
    <div className="space-y-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-sans" id="instructions-container">
      {/* Resumen de Compilación / Ficha Técnica */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-4 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800">
          <BookOpen className="text-indigo-600" size={18} />
          <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">
            Ficha Técnica de Despliegue para Hostinger
          </h4>
        </div>
        
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wide">Tecnología Detectada</span>
            <div className="font-semibold text-neutral-850 dark:text-neutral-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {summary.technology === "React_Vite" && "React S.P.A (Vite)"}
              {summary.technology === "Vue_Vite" && "Vue S.P.A (Vite)"}
              {summary.technology === "NextJS" && "Next S.P.A (Static Export)"}
              {summary.technology === "Static" && "HTML/CSS Estático"}
              {summary.technology === "PHP" && "PHP Puro (Dinámico)"}
              {summary.technology === "NodeJS" && "NodeJS backend"}
              {summary.technology === "Unknown" && "Tecnología Desconocida"}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wide">Enrutador / Direccionamiento</span>
            <div className="font-semibold text-neutral-850 dark:text-neutral-200 font-mono">
              {isSPA ? ".htaccess Activo (SPA Rewrite)" : "Directo de Apache (Index)"}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wide">Ruta Base de Destino</span>
            <div className="font-semibold text-neutral-850 dark:text-neutral-200 font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 py-0.5 px-2 rounded w-fit">
              {deployment?.deployType === "subfolder" 
                ? `public_html/${deployment.subfolderPath.replace(/^\/|\/$/g, "")}`
                : "public_html/ (Dominio Principal)"
              }
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wide">Base de Datos Protegida</span>
            <div className="font-semibold text-neutral-850 dark:text-neutral-200">
              {isMySQL ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check size={14} /> Configurada ({dbConfig?.type})
                </span>
              ) : "No detectada o saltada"}
            </div>
          </div>

          <div className="space-y-1 col-span-1 sm:col-span-2">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wide">Archivos Principales Compilados e Incluidos</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-850 rounded text-neutral-700 dark:text-neutral-400 font-mono">
                <FileText size={11} className="text-neutral-400" /> index.html
              </span>
              {isSPA && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-850 rounded text-neutral-700 dark:text-neutral-400 font-mono">
                  <FileText size={11} className="text-amber-500" /> .htaccess
                </span>
              )}
              {summary.technology === "PHP" && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-850 rounded text-neutral-700 dark:text-neutral-400 font-mono">
                  <FileText size={11} className="text-blue-500" /> db_connection.php
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-850 rounded text-neutral-750 dark:text-neutral-400 font-mono">
                assets/ (JS/CSS optimizados)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual paso a paso de Despliegue en Hostinger  */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
          <HelpCircle size={15} className="text-indigo-500" />
          Guía de Despliegue Paso a Paso en Hostinger
        </h3>

        {/* Paso 1 */}
        <div className="flex gap-3">
          <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center font-bold text-[10px] text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5">
            1
          </div>
          <div className="space-y-1 flex-1">
            <h5 className="font-semibold text-neutral-800 dark:text-neutral-200">Acceder al Panel de Administración de Hostinger</h5>
            <p className="text-neutral-500 leading-relaxed text-xs">
              Inicia sesión en tu cuenta de Hostinger, dirígete a la pestaña de <strong>Sitios Web</strong> y haz clic en el botón <strong>Administrar</strong> de tu dominio para abrir el panel principal (hPanel).
            </p>
          </div>
        </div>

        {isMySQL && (
          <>
            {/* Base de Datos Paso */}
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center font-bold text-[10px] text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1 flex-1">
                <h5 className="font-semibold text-neutral-800 dark:text-neutral-200">Crear Base de Datos MySQL e Importar Esquema</h5>
                <p className="text-neutral-500 leading-relaxed text-xs">
                  Dentro del panel, busca en la sección de <strong>Bases de Datos</strong> la opción <strong>Bases de Datos MySQL</strong>. Crea una nueva base de datos y un usuario anotando el prefijo autogenerado. Luego haz clic en <strong>Entrar a phpMyAdmin</strong>, selecciona tu base de datos y presiona la pestaña <strong>Importar</strong> para cargar tus esquemas de tablas (.sql) correspondientes.
                </p>
                <div className="mt-1.5 p-2 rounded bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800/60 font-mono text-[10px] flex items-center gap-1.5">
                  <CornerDownRight size={12} className="text-neutral-400" />
                  <span>Tu conexión ya está programada de forma segura para usar el usuario: <strong>{dbConfig?.user}</strong></span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Paso Navegar a Administrador */}
        <div className="flex gap-3">
          <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center font-bold text-[10px] text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5">
            {isMySQL ? "3" : "2"}
          </div>
          <div className="space-y-1 flex-1">
            <h5 className="font-semibold text-neutral-800 dark:text-neutral-200">Abrir el Administrador de Archivos (File Manager)</h5>
            <p className="text-neutral-500 leading-relaxed text-xs">
              Localiza el botón de <strong>Administrador de Archivos</strong> en el panel de Hostinger. Se abrirá la interfaz gráfica estructurada de archivos. Dirígete a la carpeta raíz de tu sitio: <code>domains/tu-dominio/public_html</code>.
            </p>
          </div>
        </div>

        {/* Paso Subida y Extracción */}
        <div className="flex gap-3">
          <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center font-bold text-[10px] text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5">
            {isMySQL ? "4" : "3"}
          </div>
          <div className="space-y-1 flex-1">
            <h5 className="font-semibold text-neutral-800 dark:text-neutral-200">Subir y Descomprimir el Archivo ZIP</h5>
            <p className="text-neutral-500 leading-relaxed text-xs">
              Sube el archivo <code>hostinger-proyecto-listo.zip</code> que has descargado de esta aplicación utilizando el icono de <strong>Subir Archivo</strong> de la barra superior. Una vez subido, haz clic derecho sobre él, escoge la opción <strong>Descomprimir</strong> (Extract) e introduce el punto (<code>.</code>) o la ruta de subcarpeta deseada.
            </p>
            {deployment?.deployType === "subfolder" && (
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-550/10 p-2 rounded mt-1.5 flex items-start gap-1.5">
                <span className="font-bold">Nota:</span>
                <span>Como configuraste subcarpeta ("{deployment.subfolderPath}"), asegúrate de crear la carpeta con el mismo nombre exacto dentro de public_html antes de extraerlo. El .htaccess se reescribió para funcionar en esa ruta.</span>
              </div>
            )}
          </div>
        </div>

        {/* Paso Verificación */}
        <div className="flex gap-3">
          <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center font-bold text-[10px] text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5">
            {isMySQL ? "5" : "4"}
          </div>
          <div className="space-y-1 flex-1">
            <h5 className="font-semibold text-neutral-800 dark:text-neutral-200">Verificación Final</h5>
            <p className="text-neutral-500 leading-relaxed text-xs">
              Elimina el archivo <code>.zip</code> para no ocupar espacio en disco. ¡Listo! Abre tu navegador favorito y accede a tu dominio o subdominio. Tu proyecto Hostinger funcionará de inmediato con total estabilidad y enrutamiento asegurado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
