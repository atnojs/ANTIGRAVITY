import React, { useState, useEffect } from "react";
import { 
  Upload, 
  Wrench, 
  Database, 
  Cpu, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Eye, 
  Sparkles, 
  Moon, 
  Sun,
  FileCheck,
  Activity,
  ArrowRight
} from "lucide-react";
import { FileTree } from "./components/FileTree.tsx";
import { DiagnosticList } from "./components/DiagnosticList.tsx";
import { DBForm } from "./components/DBForm.tsx";
import { ConsoleView } from "./components/ConsoleView.tsx";
import { WizardSteps } from "./components/WizardSteps.tsx";
import { Instructions } from "./components/Instructions.tsx";
import { ProjectSummary, DiagnosticIssue, DatabaseConfig, CompilationLog, FileItem } from "./types.js";

const STEPS = [
  "Cargar ZIP",
  "Auditoría",
  "Reparación & BD",
  "Compilar",
  "Prueba & SPA",
  "Descargar"
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  // App core state
  const [projectId, setProjectId] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [issues, setIssues] = useState<DiagnosticIssue[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [compilation, setCompilation] = useState<CompilationLog>({
    status: "idle",
    stdout: "",
    stderr: ""
  });
  const [deployType, setDeployType] = useState<'root' | 'subfolder'>('root');
  const [subfolderPath, setSubfolderPath] = useState('mi-app');

  // UI state managers
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Backups display
  const [performedRepairs, setPerformedRepairs] = useState<any[]>([]);

  // Dark mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Check state and trigger polling loop when compiling
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (isCompiling && projectId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/project/${projectId}/compile/status`);
          if (res.ok) {
            const data: CompilationLog = await res.json();
            setCompilation(data);
            if (data.status === "success" || data.status === "failed") {
              setIsCompiling(false);
            }
          }
        } catch (err) {
          console.error("Error polling comp logs:", err);
        }
      }, 1500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isCompiling, projectId]);

  // Drag and drop events handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      if (file.name.endsWith(".zip")) {
        await uploadFile(file);
      } else {
        setErrorMsg("Error: Solo se permiten archivos formato ZIP.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  // Upload ZIP pipeline
  const uploadFile = async (file: File) => {
    setUploading(true);
    setErrorMsg("");
    const formData = new FormData();
    formData.append("projectZip", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Fallo en la subida del archivo");
      }

      const data = await res.json();
      setProjectId(data.projectId);
      setSummary(data.summary);
      setFiles(data.files);
      
      // Auto-advance to diagnostic tab
      setCurrentStep(1);
      // Run auto diagnostic
      await runDiagnostic(data.projectId);

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Error al subir el proyecto. Verifica que es un ZIP válido.");
    } finally {
      setUploading(false);
    }
  };

  // Run audit diagnostic
  const runDiagnostic = async (idToUse = projectId) => {
    setDiagnosing(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/project/${idToUse}/diagnose`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues);
        // Pre-select all auto fixable issues
        setSelectedIssueIds(data.issues.filter((i: any) => i.canAutoFix).map((i: any) => i.id));
        
        // Update local score
        if (summary) {
          setSummary({
            ...summary,
            compatibilityScore: data.score,
            correctionsPending: data.issues.filter((i: any) => i.canAutoFix).length
          });
        }
      } else {
        throw new Error("No se pudo auditar el código.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Fallo durante el diagnóstico.");
    } finally {
      setDiagnosing(false);
    }
  };

  // Apply auto repairs selective actions
  const applyRepairs = async () => {
    setRepairing(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/project/${projectId}/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SelectedIssueIds: selectedIssueIds })
      });

      if (res.ok) {
        const data = await res.json();
        setPerformedRepairs(data.repaired);
        
        // Refresh diagnosis to confirm repairs
        await runDiagnostic();
        
        // Advance after small lag
        setTimeout(() => {
          setCurrentStep(3); // Go directly to real compiler
          // Fire initial compile
          triggerCompile();
        }, 800);
      } else {
        throw new Error("No se concluyeron las correcciones.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Fallo en el módulo de reparación.");
    } finally {
      setRepairing(false);
    }
  };

  // Save DB connection parameters php or dotenv
  const saveDbParams = async (config: DatabaseConfig) => {
    setSavingDb(true);
    try {
      const res = await fetch(`/api/project/${projectId}/configure-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setSavingDb(false);
    }
  };

  // Trigger system compilation processes
  const triggerCompile = async () => {
    setIsCompiling(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/project/${projectId}/compile`, {
        method: "POST"
      });
      if (res.ok) {
        setCompilation({
          status: "installing",
          stdout: "Inicializando microprocesos NPM en segundo plano...\n",
          stderr: ""
        });
      } else {
        throw new Error("Error iniciando proceso de compulación.");
      }
    } catch (e: any) {
      setIsCompiling(false);
      setErrorMsg(e.message || "No se ha podido arrancar la compilación.");
    }
  };

  // Packaging production bundle
  const processPackage = async () => {
    setPackaging(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/project/${projectId}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deployType, subfolderPath })
      });

      if (res.ok) {
        const data = await res.json();
        setDownloadUrl(data.downloadUrl);
        setPreviewUrl(data.previewUrl);
        setCurrentStep(5); // Go to final instructions
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Fallo al empaquetar los archivos de producción.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Ocurrió un error en el empaquetador limpio.");
    } finally {
      setPackaging(false);
    }
  };

  // Navigation handlers
  const prevStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const nextStep = () => {
    // Prevent skipping steps if critical variables aren't loaded
    if (currentStep === 0 && !projectId) return;
    setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1));
  };

  const handleReset = () => {
    setProjectId("");
    setSummary(null);
    setFiles([]);
    setIssues([]);
    setCompilation({ status: "idle", stdout: "", stderr: "" });
    setPerformedRepairs([]);
    setDownloadUrl("");
    setPreviewUrl("");
    setCurrentStep(0);
    setErrorMsg("");
  };

  const toggleSelectIssue = (id: string) => {
    if (selectedIssueIds.includes(id)) {
      setSelectedIssueIds(selectedIssueIds.filter(x => x !== id));
    } else {
      setSelectedIssueIds([...selectedIssueIds, id]);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-[#0f172a] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Upper Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-850 bg-white/95 dark:bg-[#111a2e]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all text-sm">
              H
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                Project Compiler
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-indigo-600/10 border border-indigo-500/20 rounded-md px-2 py-0.5 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                  Entorno Local
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {projectId && summary && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 px-3 py-1 rounded-full">
                <span className="font-medium text-slate-500">Proyecto Activo:</span>
                <span className="text-slate-800 dark:text-white font-semibold truncate max-w-[200px]" title={summary.name}>{summary.name}</span>
              </div>
            )}
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="Alternar Tema Claro/Oscuro"
            >
              {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-zinc-600" />}
            </button>
            {projectId && (
              <button
                onClick={handleReset}
                className="text-xs font-semibold px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
              >
                Reiniciar Flujo
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-main-columns">
          {/* LEFT COLUMN: Project tree details status indicator (Visible from Step 1 onwards) */}
          {projectId && summary && (
            <div className="lg:col-span-4 space-y-6">
              
              {/* Profile Card */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-550 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-550/20 uppercase">
                    {summary.name.substring(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                      {summary.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      ZIP original procesado
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-550 dark:text-slate-400">Tecnología:</span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                      {summary.technology === "React_Vite" && "React SPA"}
                      {summary.technology === "Vue_Vite" && "Vue SPA"}
                      {summary.technology === "NextJS" && "NextJS SPA"}
                      {summary.technology === "Static" && "HTML Estático"}
                      {summary.technology === "PHP" && "PHP Puro"}
                      {summary.technology === "NodeJS" && "NodeJS"}
                      {summary.technology === "Unknown" && "Desconocida"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-550 dark:text-slate-400">Peso Total:</span>
                    <span className="font-mono text-slate-755 dark:text-slate-300 font-medium">
                      {(summary.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-550 dark:text-slate-400">Archivos cargados:</span>
                    <span className="font-mono text-slate-755 dark:text-slate-300 font-medium">
                      {summary.fileCount}
                    </span>
                  </div>
                  
                  {summary.buildCommand && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-550 dark:text-slate-400">Comando Build:</span>
                      <span className="font-mono text-slate-755 dark:text-slate-300 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 px-1.5 py-0.5 rounded">
                        {summary.buildCommand}
                      </span>
                    </div>
                  )}

                  {summary.outputFolder && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-550 dark:text-slate-400">Directorio salida:</span>
                      <span className="font-mono text-slate-755 dark:text-slate-300 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 px-1.5 py-0.5 rounded">
                        /{summary.outputFolder}
                      </span>
                    </div>
                  )}
                </div>

                {/* Score compatibility UI meter */}
                <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-550 dark:text-slate-400 font-medium">Compatibilidad Hostinger:</span>
                    <span className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                      summary.compatibilityScore >= 90 
                        ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20" 
                        : summary.compatibilityScore >= 70
                          ? "bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20"
                          : "bg-rose-100/80 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20"
                    }`}>
                      {summary.compatibilityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        summary.compatibilityScore >= 90 ? "bg-emerald-500" : summary.compatibilityScore >= 70 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${summary.compatibilityScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced file directory browser */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileCheck size={14} className="text-indigo-400" />
                  Estructura Detectada
                </h4>
                <div className="rounded-lg overflow-hidden border border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-[#162032] p-2">
                  <FileTree files={files} />
                </div>
                <p className="text-[10px] text-slate-400 block italic text-center">
                  Muestra la estructura temporal de compilación
                </p>
              </div>

              {/* Hostinger cloud trust disclaimer */}
              <div className="p-4 bg-[#162032] rounded-2xl border border-slate-700/50 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Entorno Local</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></div>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Análisis aislado 100% libre de fugas de credenciales. Código seguro bajo sandboxing NodeJS local.
                </p>
              </div>

            </div>
          )}

          {/* RIGHT COLUMN: Interactive step wizard workspace container */}
          <div className={projectId ? "lg:col-span-8 space-y-6" : "col-span-12"}>
            
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 md:p-7 rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20 space-y-6">
              
              {/* Stepper display header */}
              {projectId && (
                <WizardSteps currentStep={currentStep} steps={STEPS} />
              )}

              {/* App Errors alerts board */}
              {errorMsg && (
                <div className="p-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/10 flex items-start gap-2.5 text-xs animate-fade-in">
                  <ShieldAlert className="shrink-0 mt-0.5" size={15} />
                  <div>
                    <h5 className="font-semibold">Fallo en la operación</h5>
                    <p>{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* STEP 0: Upload File screen */}
              {currentStep === 0 && (
                <div className="space-y-6 py-6" id="wizard-step-upload">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl md:text-2xl font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-2">
                      <Sparkles className="text-indigo-500 fill-indigo-550/10 animate-pulse" size={20} />
                      Compila Proyectos de IA para Hostinger
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto">
                      Sube el repositorio crudo de tu proyecto de Google AI Studio y deja que nuestro líder automatice el diagnóstico, adapte rutas, compile dependencias y genere un paquete 100% garantizado para Hostinger.
                    </p>
                  </div>

                  {/* Drag and Drop card */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer relative ${
                      isDragging 
                        ? "border-indigo-600 bg-indigo-500/5 scale-[0.99] ring-2 ring-indigo-500/10" 
                        : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-850 dark:hover:border-neutral-700 bg-neutral-50/20 dark:bg-neutral-950/20"
                    }`}
                    onClick={() => document.getElementById("file-select-trigger")?.click()}
                    id="dropzone-area"
                  >
                    <input 
                      type="file" 
                      id="file-select-trigger" 
                      className="hidden" 
                      accept=".zip"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />

                    <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 shadow-sm">
                      {uploading ? (
                        <RefreshCw size={24} className="animate-spin" />
                      ) : (
                        <Upload size={24} />
                      )}
                    </div>

                    <div className="space-y-1.5 msg-selector">
                      <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm md:text-base">
                        {uploading ? "Procesando y Descomprimiendo..." : "Arrastra y suelta tu archivo .zip aquí"}
                      </h4>
                      <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                        {uploading 
                          ? "Aislando entorno físico temporal para análisis de código" 
                          : "O haz clic para explorar tu ordenador local. Solo se admiten archivos empaquetados .zip"
                        }
                      </p>
                    </div>

                    {!uploading && (
                      <span className="text-[10px] font-semibold text-neutral-450 uppercase bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 px-2 py-0.5 rounded">
                        MÍNIMO TIEMPO DE RESPUESTA
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 border border-neutral-150 dark:border-neutral-800/40 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-xl space-y-1">
                      <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block">1. Diagnóstico Real</span>
                      <span className="text-[11px] text-neutral-400 block leading-normal">Mapea imports equivocados, API keys expuestas y entornos de enrutamiento rotos en hPanel de Hostinger.</span>
                    </div>
                    <div className="p-3 border border-neutral-150 dark:border-neutral-800/40 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-xl space-y-1">
                      <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block">2. Inyección Autónoma</span>
                      <span className="text-[11px] text-neutral-400 block leading-normal">Repara de forma segura código sensible, reescribe URLS de localhost y oculta API keys en proxies PHP seguros.</span>
                    </div>
                    <div className="p-3 border border-neutral-150 dark:border-neutral-800/40 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-xl space-y-1">
                      <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block">3. Compilador de Sistema</span>
                      <span className="text-[11px] text-neutral-400 block leading-normal">Ejecuta procesos Node reales instalando dependencias de producción, emitiendo descargas listas con su .htaccess configurado.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: Code Audit screen */}
              {currentStep === 1 && (
                <div className="space-y-4" id="wizard-step-audit">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" size={18} />
                        Análisis Automático y Diagnóstico de Código
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Escaner proactivo enfocado en directrices, puertos duros e incompatibilidades linux.
                      </p>
                    </div>
                    <button
                      onClick={() => runDiagnostic()}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-indigo-500 transition-colors"
                      disabled={diagnosing}
                      title="Forzar Nuevo Escaneo"
                    >
                      <RefreshCw size={15} className={diagnosing ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {diagnosing ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-10 h-10 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin mx-auto" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">Rastreando el árbol de archivos...</span>
                        <span className="text-[11px] text-neutral-450 block">Verificando enlazado sintáctico de imports y credenciales expuestas</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <DiagnosticList 
                        issues={issues}
                        selectedIssueIds={selectedIssueIds}
                        onToggleIssue={toggleSelectIssue}
                        onSelectAll={() => setSelectedIssueIds(issues.filter(i => i.canAutoFix && !i.fixed).map(i => i.id))}
                        onDeselectAll={() => setSelectedIssueIds([])}
                        onManualFix={applyRepairs}
                        repairing={repairing}
                      />
                      
                      {issues.filter(i => i.canAutoFix && !i.fixed).length === 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => setCurrentStep(2)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-600/10"
                          >
                            Continuar a Ajustes de Entorno
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Repairs, backups, and Databases configs */}
              {currentStep === 2 && (
                <div className="space-y-6" id="wizard-step-adjustments">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                      <Database className="text-violet-500" size={18} />
                      Configuración de Ajustes y Backups de Seguridad
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Gestiona entornos de bases de datos compartidos y comprueba las mutaciones de archivos.
                    </p>
                  </div>

                  {/* Backups notification visual feedback */}
                  {performedRepairs.length > 0 && (
                    <div className="border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3 bg-indigo-500/5 font-sans space-y-1.5">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 block">
                        Bitácora de Parches de Código Aplicados Semánticamente:
                      </span>
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pl-1">
                        {performedRepairs.map((rep, idx) => (
                          <div key={idx} className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-emerald-500 font-bold shrink-0">[Hecho]</span>
                            <div>
                              <strong>{rep.file}</strong>: {rep.changeProposed}
                            </div>
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-neutral-400 block italic pt-1 border-t border-neutral-100 dark:border-neutral-900/60">
                        * Se han conservado copias de seguridad de todos los archivos fuentes modificados en /backups
                      </span>
                    </div>
                  )}

                  {/* Direct MySQL injection form */}
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-lg text-[11px] leading-relaxed border border-neutral-200 dark:border-neutral-800 text-neutral-400 flex items-start gap-2">
                      <span className="text-amber-500 font-bold">Nota de Integración:</span>
                      <span>Si tu sitio es una App Estática Simple sin PHP ni MySQL, puedes omitir este formulario e ir directo al paso de compilador de producción.</span>
                    </div>

                    <DBForm onSave={saveDbParams} saving={savingDb} />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-150 dark:border-neutral-850">
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-1 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded font-semibold text-xs text-neutral-500 transition-colors"
                    >
                      <ChevronLeft size={14} /> Atrás
                    </button>

                    <button
                      onClick={() => {
                        setCurrentStep(3);
                        triggerCompile();
                      }}
                      className="flex items-center gap-1 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-600/10"
                    >
                      Proceder a Compilar Código de Producción
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Local NPM compiling system */}
              {currentStep === 3 && (
                <div className="space-y-6" id="wizard-step-compile">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                        <Cpu className="text-indigo-500" size={18} />
                        Motor de Compilación Real de Entornos
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Construcción nativa y compresión minificada de scripts JS, hojas CSS y enlazado de assets.
                      </p>
                    </div>

                    {!isCompiling && (
                      <button
                        onClick={triggerCompile}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 rounded font-semibold text-xs text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        Compilar de Nuevo
                      </button>
                    )}
                  </div>

                  <ConsoleView 
                    log={compilation}
                    onRetry={triggerCompile}
                    technology={summary ? summary.technology : "Unknown"}
                  />

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-150 dark:border-neutral-850">
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-1 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded font-semibold text-xs text-neutral-500 transition-colors"
                      disabled={isCompiling}
                    >
                      <ChevronLeft size={14} /> Atrás
                    </button>

                    <button
                      onClick={() => setCurrentStep(4)}
                      className="flex items-center gap-1 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-600/10"
                      disabled={isCompiling || compilation.status === "failed"}
                    >
                      Configurar Destino y Vista Previa
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Router htaccess configs and Live Pre-deployment Preview overlay */}
              {currentStep === 4 && (
                <div className="space-y-6" id="wizard-step-routing">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                      <Eye className="text-indigo-500" size={18} />
                      Enrutamiento .htaccess y Vista Previa de Producción
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Indica la carpeta de subido en Hostinger para calcular el enrutador virtual de forma perfecta.
                    </p>
                  </div>

                  {/* Destination folder configuration select */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/25">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-300 block">
                      ¿Dónde vas a subir tu proyecto en Hostinger?
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div 
                        onClick={() => setDeployType('root')}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          deployType === 'root' 
                            ? "border-indigo-600 bg-indigo-500/5 dark:bg-indigo-500/10" 
                            : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                        }`}
                      >
                        <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block mb-0.5">Dominio Principal / Subdominio</span>
                        <span className="text-[11px] text-neutral-400 block leading-normal">Se colocará directamente en <code>public_html</code> de tu hosting (URL como: <i>http://misitio.es</i>)</span>
                      </div>

                      <div 
                        onClick={() => setDeployType('subfolder')}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          deployType === 'subfolder' 
                            ? "border-indigo-600 bg-indigo-500/5 dark:bg-indigo-500/10" 
                            : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                        }`}
                      >
                        <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block mb-0.5">Subcarpeta Específica</span>
                        <span className="text-[11px] text-neutral-400 block leading-normal">Se aloja dentro de una carpeta hija (URL como: <i>http://misitio.es/mi-app/</i>)</span>
                      </div>
                    </div>

                    {deployType === 'subfolder' && (
                      <div className="space-y-1.5 animate-fade-in pl-1">
                        <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          Nombre de la Subcarpeta (Base Directory Path):
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-xs text-neutral-400 font-mono">public_html/</span>
                          <input 
                            type="text" 
                            value={subfolderPath} 
                            onChange={(e) => setSubfolderPath(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ""))}
                            className="text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 font-mono w-[160px] focus:outline-none"
                            placeholder="nombre-carpeta"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Majestic Pre-deployment Live Iframe Preview overlay */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1">
                      <Activity size={12} className="text-emerald-500" />
                      Vista Previa Interactiva Local
                    </h4>
                    
                    <div className="border border-neutral-250 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 shadow-inner">
                      {/* Browser Mock Navigation header */}
                      <div className="px-3.5 py-2 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-neutral-705 block" />
                        </div>
                        <div className="bg-neutral-950 rounded text-[10px] text-neutral-400 px-3/1000 py-0.5 max-w-[280px] font-mono truncate border border-neutral-800 px-2 flex items-center gap-1">
                          <Eye size={10} className="text-neutral-500" />
                          <span>servidor-pruebas-local/index.html</span>
                        </div>
                      </div>

                      {/* Actual live static pre-deployment iframe render */}
                      {projectId ? (
                        <iframe 
                          src={`/api/project/${projectId}/preview/`} 
                          className="w-full h-[280px] bg-white" 
                          id="compiled-output-iframe-preview"
                          title="Vista previa del proyecto de producción"
                        />
                      ) : (
                        <div className="h-[280px] flex items-center justify-center text-xs text-neutral-500 font-mono">
                          El compilado final no se ha detectado.
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-450 italic leading-normal">
                      * El iframe anterior simula de forma exacta la ejecución del servidor Apache de Hostinger. Si tienes rutas internas o scripts PHP proxies, puedes hacerles clic para comprobar su estabilidad.
                    </p>
                  </div>

                  {/* Advance to package download */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-150 dark:border-neutral-850">
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-1 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded font-semibold text-xs text-neutral-500 transition-colors"
                    >
                      <ChevronLeft size={14} /> Atrás
                    </button>

                    <button
                      onClick={processPackage}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
                      disabled={packaging}
                    >
                      {packaging ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                          Construyendo ZIP Optimizado...
                        </>
                      ) : (
                        <>
                          Empaquetar para Hostinger
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: Report / Export Zip & Instructions stage */}
              {currentStep === 5 && (
                <div className="space-y-6" id="wizard-step-download">
                  
                  {/* Download Hero Box */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/90 to-slate-900 text-white space-y-4 border border-indigo-500/10 shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 select-none pointer-events-none transform translate-y-6 translate-x-6">
                      <Sparkles size={250} />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-widest font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        Compilación Garantizada
                      </span>
                      <h3 className="text-lg md:text-xl font-black">
                        ¡Tu paquete de Hostinger está listo para su Instalación!
                      </h3>
                      <p className="text-xs text-indigo-200/80 max-w-lg">
                        Hemos purgado las variables locales de desarrollo, reescrito las rutas base e inyectado el enrutador virtual de SPA con el encriptador Apache.
                      </p>
                    </div>

                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all hover:scale-[1.01] shadow-lg shadow-indigo-750/30 cursor-pointer"
                      >
                        <Download size={16} />
                        Descargar Proyecto Corregido (hostinger-proyecto.zip)
                      </a>
                    )}
                  </div>

                  {/* Hostinger specific instruction manual */}
                  <Instructions 
                    summary={summary!} 
                    deployment={{
                      deployType,
                      subfolderPath,
                      databaseConfigured: !!summary?.correctionsPending
                    }}
                    dbConfig={summary && "techConfig" in summary ? undefined : undefined} 
                  />

                  {/* Start another compilation */}
                  <div className="flex justify-between items-center pt-4 border-t border-neutral-150 dark:border-neutral-850">
                    <span className="text-[10px] text-neutral-450 uppercase tracking-wide">
                      Hostinger Project Compiler © 2026
                    </span>
                    
                    <button
                      onClick={handleReset}
                      className="text-xs px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md font-semibold text-neutral-600 dark:text-neutral-450 transition-colors"
                    >
                      Procesar otro Proyecto (.zip)
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* Barra de Estado Inferior */}
      <footer className="h-10 bg-white dark:bg-[#1e293b] border-t border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none shadow-md">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></span>
            Sistema Local: Preparado
          </span>
          <span className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
            Proyecto: {summary ? (summary.technology === "React_Vite" ? "React + Vite" : summary.technology === "PHP" ? "PHP" : summary.technology === "Static" ? "HTML" : "SPA") : "Ninguno cargado"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded text-slate-600 dark:text-slate-350 font-medium">Windows 11 Pro Optimized</span>
          <span className="font-semibold text-slate-400 dark:text-slate-500 font-mono">HPC v1.0.4-stable</span>
        </div>
      </footer>
    </div>
  );
}
