import React, { useState } from "react";
import { Database, ShieldAlert, CheckCircle, ArrowRight } from "lucide-react";
import { DatabaseConfig } from "../types.js";

interface DBFormProps {
  onSave: (config: DatabaseConfig) => Promise<boolean>;
  initialConfig?: DatabaseConfig;
  saving?: boolean;
}

export const DBForm: React.FC<DBFormProps> = ({ onSave, initialConfig, saving = false }) => {
  const [host, setHost] = useState(initialConfig?.host || "localhost");
  const [database, setDatabase] = useState(initialConfig?.database || "");
  const [user, setUser] = useState(initialConfig?.user || "");
  const [pass, setPass] = useState(initialConfig?.pass || "");
  const [port, setPort] = useState(initialConfig?.port || "3306");
  const [type, setType] = useState<DatabaseConfig["type"]>(initialConfig?.type || "PHP_PDO");
  
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!database || !user) {
      setErrorMsg("El nombre de la base de datos y el usuario son campos obligatorios.");
      return;
    }
    setErrorMsg("");
    setSaved(false);

    const success = await onSave({
      host,
      database,
      user,
      pass,
      port,
      type
    });

    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } else {
      setErrorMsg("Hubo un error al guardar la estructura de conexión.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900/60 shadow-sm" id="database-connection-form">
      <div className="flex items-center gap-2 mb-3">
        <Database className="text-violet-500 fill-violet-500/10" size={18} />
        <div>
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Formulario de Conexión de Base de Datos MySQL
          </h4>
          <p className="text-[11px] text-neutral-400">
            Inyecta de forma segura los parámetros de producción de tu plan de Hostinger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Tipo de Configuración / Lenguaje
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DatabaseConfig["type"])}
            className="w-full text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 px-2 text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="PHP_PDO">PHP PDO (Recomendado)</option>
            <option value="PHP_MYSQLI">PHP MySQLi</option>
            <option value="Node_ENV">Archivo Node .env ($DB_HOST, etc.)</option>
            <option value="Generic_ENV">Archivo genérico .env.production</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Servidor de BD (MySQL Host en Hostinger)
          </label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 px-2 text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            placeholder="ej: mysql.hostinger.es o localhost"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Nombre de la Base de Datos (DB Name)
          </label>
          <input
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className="w-full text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 px-2 text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            placeholder="ej: u123456789_tienda"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Usuario MySQL (DB User)
          </label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="w-full text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 px-2 text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            placeholder="ej: u123456789_admin"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Contraseña de MySQL (DB Password)
          </label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 px-2 text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="••••••••••••••••"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Puerto de Conexión
          </label>
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-full text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 px-2 text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            placeholder="3306"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1 text-xs text-rose-500 border border-rose-500/10 p-2 rounded bg-rose-500/5">
          <ShieldAlert size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
          <CheckCircle size={15} />
          <span>¡Guardado con éxito! Se ha generado / configurado el archivo de conexión segura.</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="flex items-center gap-1 text-xs px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-md transition-colors shadow-sm cursor-pointer"
          disabled={saving}
        >
          {saving ? "Inyectando variables..." : "Aplicar Parámetros de Base de Datos"}
          <ArrowRight size={13} />
        </button>
      </div>
    </form>
  );
};
