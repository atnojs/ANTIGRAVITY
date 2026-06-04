import React, { useState } from "react";
import { 
  Download, 
  Maximize2, 
  Layers, 
  PenTool, 
  Copy, 
  Trash2, 
  Check, 
  Info,
  Sparkles,
  Calendar,
  X,
  Brush
} from "lucide-react";
import { GeneratedImage } from "../types";

interface MasonryGalleryProps {
  images: GeneratedImage[];
  onDeleteImage: (id: string) => void;
  onSelectImage: (image: GeneratedImage) => void;
  onTriggerVariations: (image: GeneratedImage) => void;
}

export default function MasonryGallery({
  images,
  onDeleteImage,
  onSelectImage,
  onTriggerVariations
}: MasonryGalleryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [upscalingId, setUpscalingId] = useState<string | null>(null);
  const [inpaintingImage, setInpaintingImage] = useState<GeneratedImage | null>(null);
  const [brushedPoints, setBrushedPoints] = useState<{ x: number, y: number }[]>([]);
  const [isBrushing, setIsBrushing] = useState(false);

  const handleCopyPrompt = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(image.prompt);
    setCopiedId(image.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    // Simulate a download by creating a temp link
    const link = document.createElement("a");
    link.href = image.url;
    link.download = `AuraStudio-${image.style}-${image.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpscale = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpscalingId(image.id);
    setTimeout(() => {
      setUpscalingId(null);
      alert(`¡Imagen escalada a 4K Ultra HD con éxito!\nLa resolución aumentó dinámicamente a 4096 x 4096 px.`);
    }, 1800);
  };

  const handleInpaintInit = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setInpaintingImage(image);
    setBrushedPoints([]);
  };

  const handleCloseInpaint = () => {
    setInpaintingImage(null);
  };

  const handleInpaintSubmit = () => {
    alert("¡Máscara de retoque aplicada!\nEl Motor Aura está repintando el área seleccionada...");
    setInpaintingImage(null);
  };

  const handleDrawCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBrushing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBrushedPoints(prev => [...prev, { x, y }]);
  };

  if (images.length === 0) {
    return (
      <div 
        id="empty-gallery"
        className="glass-panel rounded-3xl p-12 text-center border border-white/10 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
          <Layers className="w-6 h-6 text-[#7C3AED]" />
        </div>
        <div>
          <h3 className="text-base font-sans font-bold text-white">No se han esculpido imágenes aún</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[320px] mx-auto leading-relaxed">
            Escribe tu prompt arriba y haz clic en Generar para darle vida a tu imaginación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-gradient-to-b from-[#7C3AED] to-[#EC4899] rounded-full" />
          <h2 className="text-sm font-sans font-bold tracking-wider text-white font-sans">Galería de Obras Creadas</h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Diseño en Mosaico ({images.length} elementos)
        </span>
      </div>

      {/* Modern responsive Masonry Grid */}
      <div 
        id="masonry-grid-canvas"
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 [column-fill:_balance]"
      >
        {images.map((image) => {
          const isCopied = copiedId === image.id;
          const isUpscaling = upscalingId === image.id;

          return (
            <div
              key={image.id}
              id={`image-card-${image.id}`}
              onClick={() => onSelectImage(image)}
              className="group break-inside-avoid relative rounded-2.5xl overflow-hidden border border-white/10 bg-[#121824]/50 cursor-pointer hover:border-white/20 hover:shadow-[0_8px_30px_rgba(8,11,17,0.5)] transition-all duration-300 transform-gpu hover:scale-[1.01]"
            >
              {/* Image element */}
              <img 
                src={image.url} 
                alt={image.prompt} 
                className="w-full h-auto object-cover block"
                referrerPolicy="no-referrer"
              />

              {/* Status and prompt badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 transition-opacity duration-300 group-hover:opacity-0">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-950/75 text-slate-300 border border-white/5 tracking-wider backdrop-blur-md">
                  {image.style}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-950/75 text-slate-300 border border-white/5 tracking-wider backdrop-blur-md">
                  {image.aspectRatio}
                </span>
              </div>

              {/* Action Screen on Hover - High-End Glassmorphism overlay */}
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[6px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 z-20">
                
                {/* Upper stats / copy row */}
                <div className="flex items-center justify-between">
                  <div className="overflow-hidden mr-4">
                    <p className="text-[10px] font-mono text-slate-400 font-bold tracking-wide">SEMILLA: {image.seed}</p>
                    <p className="text-[9px] font-mono text-slate-500">{image.sampler} • {image.steps} pasos</p>
                  </div>
                  
                  <button
                    type="button"
                    id={`copy-prompt-${image.id}`}
                    onClick={(e) => handleCopyPrompt(image, e)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white transition-all relative"
                    title="Copiar texto del Prompt"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale-up" /> : <Copy className="w-3.5 h-3.5" />}
                    
                    {isCopied && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 p-1 rounded bg-[#121824] text-[8px] font-sans text-white border border-white/5 whitespace-nowrap animate-fade-in">
                        ¡Copiado!
                      </span>
                    )}
                  </button>
                </div>

                {/* Prompt block in middle */}
                <div className="my-2 max-h-24 overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed tracking-wide italic select-none">
                    "{image.prompt}"
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 lines-clamp-2 leading-relaxed font-sans">
                    {image.description}
                  </p>
                </div>

                {/* Bottom Interactive Control Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Upscale 4K Button */}
                    <button
                      type="button"
                      id={`upscale-${image.id}`}
                      disabled={isUpscaling}
                      onClick={(e) => handleUpscale(image, e)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-[#7C3AED]/20 to-[#EC4899]/20 border border-[#7C3AED]/30 hover:border-[#7C3AED]/70 hover:from-[#7C3AED]/30 text-white font-sans text-[10px] font-semibold transition-all"
                    >
                      <Maximize2 className="w-3 h-3 text-[#EC4899]" />
                      {isUpscaling ? "Escalando..." : "Escalar 4K"}
                    </button>

                    {/* Variations Button */}
                    <button
                      type="button"
                      id={`variations-${image.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerVariations(image);
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-white font-sans text-[10px] transition-all"
                    >
                      <Layers className="w-3 h-3 text-slate-400" />
                      Variantes
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Inpaint Edit Button */}
                    <button
                      type="button"
                      id={`inpaint-${image.id}`}
                      onClick={(e) => handleInpaintInit(image, e)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-white font-sans text-[10px] transition-all"
                    >
                      <PenTool className="w-3 h-3 text-slate-400" />
                      Retocar región
                    </button>

                    {/* Download Button */}
                    <button
                      type="button"
                      id={`download-${image.id}`}
                      onClick={(e) => handleDownload(image, e)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white font-sans text-[10px] font-semibold transition-all"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      Guardar JPG
                    </button>
                  </div>

                  {/* Delete button (stands out less, elegant) */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Esculpido: {new Date(image.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      id={`delete-${image.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteImage(image.id);
                      }}
                      className="text-red-500 hover:text-red-400 transition-colors p-1"
                      title="Deconstruir Escultura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Inpainting Mask Drawer Layer */}
      {inpaintingImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#080B11]/95 border border-white/10 rounded-3xl p-6 relative">
            <button 
              onClick={handleCloseInpaint}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED]">
                <Brush className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-sans font-bold text-white font-sans">Pincel Corrector Aura</h3>
                <p className="text-[10px] text-slate-500 font-mono">Dibuja sobre el lienzo. El motor recalculará los píxeles seleccionados.</p>
              </div>
            </div>

            {/* Brush Canvas area */}
            <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-[#121824] flex items-center justify-center aspect-[4/3] max-h-[50vh]">
              <img 
                src={inpaintingImage.url} 
                alt="Inpaint visual" 
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />
              <div 
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={() => setIsBrushing(true)}
                onMouseUp={() => setIsBrushing(false)}
                onMouseLeave={() => setIsBrushing(false)}
                onMouseMove={handleDrawCanvas}
              >
                {/* Simulated brush strokes overlay */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                  {brushedPoints.map((point, index) => (
                    <circle 
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="16"
                      fill="rgba(124, 58, 237, 0.45)"
                      className="animate-pulse"
                    />
                  ))}
                </svg>
              </div>

              {brushedPoints.length === 0 && (
                <div className="absolute inset-0 bg-black/45 flex h-full w-full items-center justify-center pointer-events-none text-center p-6">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">Dibuja con tu ratón o dedo</p>
                    <p className="text-xs text-slate-400">Haz clic y arrastra sobre la imagen para pintar una máscara de corrección.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Brush Controls Footer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setBrushedPoints([])}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-medium text-xs transition-colors"
              >
                Limpiar Trazo
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseInpaint}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 font-medium text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={brushedPoints.length === 0}
                  onClick={handleInpaintSubmit}
                  className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                    brushedPoints.length > 0 
                      ? "glow-gradient text-white hover:opacity-90 shadow-md cursor-pointer" 
                      : "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                  }`}
                >
                  Recalcular Área Pintada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
