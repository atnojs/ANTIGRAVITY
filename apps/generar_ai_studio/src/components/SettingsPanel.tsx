import React, { useRef, useState } from "react";
import { 
  Square, 
  Tv, 
  Smartphone, 
  Image as ImageIcon, 
  Upload, 
  Sliders, 
  HelpCircle, 
  X,
  Gauge,
  Activity,
  Maximize2
} from "lucide-react";
import { AspectRatioOption, GenerationSettings } from "../types";
import { ASPECT_RATIOS } from "../data";

interface SettingsPanelProps {
  settings: GenerationSettings;
  onChangeSettings: (newSettings: Partial<GenerationSettings>) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isGenerating?: boolean;
}

export default function SettingsPanel({
  settings,
  onChangeSettings,
  isOpenMobile,
  onCloseMobile,
  isGenerating = false
}: SettingsPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAspectIcon = (iconName: string) => {
    switch (iconName) {
      case "Square": return <Square className="w-5 h-5" />;
      case "Tv": return <Tv className="w-5 h-5" />;
      case "Smartphone": return <Smartphone className="w-5 h-5" />;
      case "Image": return <ImageIcon className="w-5 h-5" />;
      default: return <Square className="w-5 h-5" />;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readImageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      readImageFile(file);
    }
  };

  const readImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor sube un archivo de imagen válido.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChangeSettings({ referenceImage: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearReferenceImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeSettings({ referenceImage: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const panelContent = (
    <div className="space-y-6">
      {/* Aspect Ratio Header */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <label className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-[#7C3AED]" />
            Relación de Aspecto
          </label>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Fijado: {settings.aspectRatioId}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ASPECT_RATIOS.map((opt) => {
            const isSelected = settings.aspectRatioId === opt.id;
            return (
              <button
                key={opt.id}
                id={`ratio-${opt.id}`}
                onClick={() => onChangeSettings({ aspectRatioId: opt.id })}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
                  isSelected 
                    ? "bg-[#121824]/90 border-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.15)] ring-1 ring-[#7C3AED]" 
                    : "bg-[#121824]/40 border-white/10 hover:border-white/20 hover:bg-[#121824]/70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${isSelected ? "text-white bg-gradient-to-tr from-[#7C3AED] to-[#EC4899]" : "text-slate-400 bg-white/5"}`}>
                    {getAspectIcon(opt.icon)}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold group-hover:text-slate-300 transition-colors">
                    {opt.displayRatio}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-200 tracking-wide">{opt.label.split(" ")[0]}</span>
                <span className="text-[9px] text-slate-400 mt-1 leading-normal line-clamp-2">{opt.subLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Image Reference Dropzone */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#EC4899]" />
            Imagen de Referencia
          </label>
          <span className="text-[10px] text-slate-500 font-sans">Lienzo opcional</span>
        </div>

        <div 
          id="image-dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`relative group flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed transition-all cursor-pointer ${
            settings.referenceImage 
              ? "border-[#EC4899] bg-[#121824]/80" 
              : dragActive 
                ? "border-[#7C3AED] bg-[#7C3AED]/5" 
                : "border-white/10 hover:border-white/25 bg-[#121824]/40 hover:bg-[#121824]/60"
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {settings.referenceImage ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden glass-border">
              <img 
                src={settings.referenceImage} 
                alt="Imagen para referencia" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  id="clear-reference-img"
                  onClick={clearReferenceImage}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-xs transition-all pointer-events-auto"
                >
                  <X className="w-4 h-4" />
                  Quitar Referencia
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-slate-100 group-hover:scale-110 transition-all border border-white/5 mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                Arrastra o haz clic aquí
              </p>
              <p className="text-[9px] text-slate-500 mt-1 max-w-[180px] mx-auto leading-relaxed">
                Aplica las instrucciones del prompt sobre los contornos estructurales de la imagen
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fine-Tuning controls */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <label className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#7C3AED]" />
          Ajustes Estéticos Avanzados
        </label>

        {/* Guidance CFG scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              Escala de Guía (CFG)
            </span>
            <span className="text-[#EC4899] font-semibold">{settings.cfgScale.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={settings.cfgScale}
              onChange={(e) => onChangeSettings({ cfgScale: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#121824] rounded-lg appearance-none cursor-pointer accent-[#7C3AED] border border-white/5"
            />
          </div>
          <p className="text-[9px] text-slate-500 leading-normal">
            Valores más altos vinculan el estilo estrictamente a las palabras clave del prompt.
          </p>
        </div>

        {/* Generation Steps */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              Pasos de Refinamiento
            </span>
            <span className="text-[#7C3AED] font-semibold">{settings.steps}</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range"
              min="10"
              max="100"
              step="5"
              value={settings.steps}
              onChange={(e) => onChangeSettings({ steps: parseInt(e.target.value) })}
              className="w-full h-1 bg-[#121824] rounded-lg appearance-none cursor-pointer accent-[#EC4899] border border-white/5"
            />
          </div>
          <p className="text-[9px] text-slate-500 leading-normal">
            Un muestreo más denso produce perfiles de textura sumamente detallados pero demora más.
          </p>
        </div>

        {/* Sampler Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Muestreador de Difusión</span>
            <span className="text-slate-500 text-[10px]">Gen-3 Beta</span>
          </div>
          <select
            id="sampler-dropdown"
            value={settings.sampler}
            onChange={(e) => onChangeSettings({ sampler: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#121824] hover:border-white/20 text-slate-300 hover:text-white font-sans text-xs focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="DPM++ 2M SDE Karras">DPM++ 2M SDE Karras (Premium)</option>
            <option value="Euler Ancestral (Karras)">Euler Ancestral (Karras - Alta Velocidad)</option>
            <option value="Heun (SD)">Heun (SD - Detalles Finos)</option>
            <option value="DDIM">DDIM (Paisajes Fotográficos)</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Panel Right */}
      <aside 
        id="desktop-settings"
        className="hidden xl:block w-80 flex-shrink-0 border-l border-white/10 p-6 space-y-6 overflow-y-auto h-screen fixed right-0 top-0 bg-[#080B11]/90 backdrop-blur-md custom-scrollbar z-20"
      >
        <div className="flex items-center gap-2 mb-6 pt-1 border-b border-white/5 pb-4">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-sans font-bold tracking-wide text-white">Ajustes del Motor</h2>
            <p className="text-[10px] text-slate-500 font-mono">Configuración Personalizada</p>
          </div>
        </div>
        {panelContent}
      </aside>

      {/* Mobile Bottom Sheet Overlay with Slide animation */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="xl:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#080B11]/95 border-t border-white/10 rounded-t-[2.5rem] p-6 pb-12 animate-slide-up relative z-50 overflow-y-auto max-h-[85vh] custom-scrollbar"
          >
            {/* Grab handle */}
            <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sliders className="text-[#7C3AED] w-4 h-4" />
                <span className="font-display font-semibold text-white tracking-wide">Ajustes del Espacio</span>
              </div>
              <button 
                id="close-mobile-settings"
                onClick={onCloseMobile} 
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {panelContent}
          </div>
        </div>
      )}
    </>
  );
}
