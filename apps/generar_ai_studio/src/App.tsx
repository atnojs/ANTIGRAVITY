import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Sliders, 
  HelpCircle, 
  Info,
  Calendar,
  Grid,
  TrendingUp,
  Maximize2,
  Database,
  Cpu,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  User,
  Heart,
  X,
  Download
} from "lucide-react";

import { GeneratedImage, GenerationSettings } from "./types";
import { VISUAL_STYLES, INITIAL_GALLERY_IMAGES } from "./data";
import Sidebar from "./components/Sidebar";
import SettingsPanel from "./components/SettingsPanel";
import PromptSection from "./components/PromptSection";
import VisualCarousel from "./components/VisualCarousel";
import MasonryGallery from "./components/MasonryGallery";
import LoadingState from "./components/LoadingState";

export default function App() {
  // Sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTab, setCurrentTab] = useState("generator");

  // Mobile drawer panel toggler
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  // Workspace settings state
  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: "",
    styleId: "photorealistic",
    aspectRatioId: "1:1",
    referenceImage: null,
    steps: 50,
    cfgScale: 7.5,
    sampler: "DPM++ 2M SDE Karras"
  });

  // State holding list of all images (loaded from local storage on load or fallback to initial catalog)
  const [images, setImages] = useState<GeneratedImage[]>([]);

  // Async processing states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Active full screen image modal view
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  // Initialize gallery
  useEffect(() => {
    const saved = localStorage.getItem("aurastudio_gallery");
    if (saved) {
      try {
        setImages(JSON.parse(saved));
      } catch (e) {
        setImages(INITIAL_GALLERY_IMAGES);
      }
    } else {
      setImages(INITIAL_GALLERY_IMAGES);
    }
  }, []);

  // Save gallery changes
  const saveImagesState = (newImages: GeneratedImage[]) => {
    setImages(newImages);
    localStorage.setItem("aurastudio_gallery", JSON.stringify(newImages));
  };

  // Optimize prompt wordings using Gemini
  const handleOptimizePrompt = async () => {
    if (!settings.prompt.trim()) return;
    setIsOptimizing(true);
    try {
      const activeStyle = VISUAL_STYLES.find(s => s.id === settings.styleId)?.name || "General";
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: settings.prompt, 
          style: activeStyle 
        })
      });
      const data = await response.json();
      if (data.optimized) {
        setSettings(prev => ({ ...prev, prompt: data.optimized }));
      } else if (data.error) {
        alert("Aviso de optimización: " + data.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("No se pudo conectar con el optimizador de prompts de Gemini.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Generate image using optimized model pipelines
  const handleGenerateImage = async () => {
    if (!settings.prompt.trim()) return;
    setIsGenerating(true);
    setMobileSettingsOpen(false); // Close mobile drawer if active

    try {
      const activeStyle = VISUAL_STYLES.find(s => s.id === settings.styleId)?.name || "Fotorrealista";
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: settings.prompt,
          style: activeStyle,
          aspectRatio: settings.aspectRatioId,
          referenceImage: settings.referenceImage
        })
      });

      const data = await response.json();
      if (data.error) {
        alert("Error del Motor Aura: " + data.error);
        return;
      }

      // Add resulting image at top of display list
      const freshImage: GeneratedImage = {
        id: `gen-${Date.now()}`,
        url: data.imageUrl,
        prompt: settings.prompt,
        style: activeStyle,
        aspectRatio: settings.aspectRatioId,
        seed: data.seed,
        steps: settings.steps,
        cfgScale: settings.cfgScale,
        sampler: settings.sampler,
        generationTime: `${data.generationTime}s`,
        description: data.optimizedDescription,
        tags: data.tags,
        referenceImage: settings.referenceImage,
        createdAt: new Date().toISOString()
      };

      const updatedGallery = [freshImage, ...images];
      saveImagesState(updatedGallery);
    } catch (e) {
      console.error(e);
      alert("Error de conexión al servidor de Aura Studio. Intente de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete individual sculpture
  const handleDeleteImage = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta escultura permanentemente?")) {
      const updated = images.filter(img => img.id !== id);
      saveImagesState(updated);
    }
  };

  // Variation generations
  const handleTriggerVariations = (srcImage: GeneratedImage) => {
    // Populate settings with source prompt
    setSettings(prev => ({
      ...prev,
      prompt: `Variación de: ${srcImage.prompt}`,
      styleId: VISUAL_STYLES.find(s => s.name === srcImage.style)?.id || "photorealistic",
      aspectRatioId: srcImage.aspectRatio
    }));
    setCurrentTab("generator");
    // Scroll smoothly to prompt input
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeStyleName = VISUAL_STYLES.find(s => s.id === settings.styleId)?.name || "Fotorrealista";

  const getSpaceLabel = () => {
    switch (currentTab) {
      case "generator": return "Entorno Aura";
      case "gallery": return "Historial";
      case "explore": return "Exhibición";
      case "models": return "Modelos IA";
      case "settings": return "Ajustes";
      case "docs": return "Guías";
      default: return "Espacio de Trabajo";
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Container */}
      <div 
        className={`flex-1 transition-all duration-300 md:mb-0 mb-16 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } xl:mr-80`}
      >
        {/* Workspace banner/Header */}
        <header className="glass-panel sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#080B11]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-display font-medium text-xs text-slate-400 capitalize bg-white/5 border border-white/10 rounded-full px-3 py-1 font-mono tracking-wider">
              {getSpaceLabel()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Configure Adjustments Slider for Mobile */}
            <button
              id="mobile-settings-toggle"
              type="button"
              onClick={() => setMobileSettingsOpen(true)}
              className="xl:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-[#121824]/60 text-slate-200 hover:text-white font-sans text-xs transition-all active:scale-95"
            >
              <Sliders className="w-4 h-4 text-[#7C3AED]" />
              <span>Ajustes Avanzados</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Canal de Aura-3 Conectado
            </div>
          </div>
        </header>

        {/* Workspace screens */}
        <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 pb-20">
          
          {currentTab === "generator" && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Heading introduction */}
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight leading-none bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Esculpe Obras de Arte en Alta Resolución
                </h1>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed font-sans">
                  Introduce palabras clave, selecciona estilos visuales, configura proporciones y ordena a los modelos Aura codificar obras prémium al instante.
                </p>
              </div>

              {/* Area 1 & 2: Prompt inputs and action triggers */}
              <PromptSection 
                prompt={settings.prompt}
                onChangePrompt={(p) => setSettings(prev => ({ ...prev, prompt: p }))}
                onOptimize={handleOptimizePrompt}
                isOptimizing={isOptimizing}
                onGenerate={handleGenerateImage}
                isGenerating={isGenerating}
                styleName={activeStyleName}
              />

              {/* Area 4: Horizontal visual style slider (Below Prompt area) */}
              <VisualCarousel 
                selectedStyleId={settings.styleId}
                onSelectStyle={(s) => setSettings(prev => ({ ...prev, styleId: s }))}
              />

              {/* Loader container / Results Showcase area */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                {isGenerating ? (
                  <LoadingState />
                ) : (
                  <MasonryGallery 
                    images={images}
                    onDeleteImage={handleDeleteImage}
                    onSelectImage={setSelectedImage}
                    onTriggerVariations={handleTriggerVariations}
                  />
                )}
              </div>
            </div>
          )}

          {currentTab === "gallery" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-white font-sans">
                  Mi Historial de Esculturas
                </h1>
                <p className="text-xs text-slate-400 max-w-lg font-sans">
                  Explora y descarga tu historial de visualizaciones generadas. Todo se almacena de forma segura en el almacenamiento local de tu navegador.
                </p>
              </div>

              <div className="pt-4">
                <MasonryGallery 
                  images={images}
                  onDeleteImage={handleDeleteImage}
                  onSelectImage={setSelectedImage}
                  onTriggerVariations={handleTriggerVariations}
                />
              </div>
            </div>
          )}

          {currentTab === "explore" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-white font-sans">
                  Galería de Exhibición Aura
                </h1>
                <p className="text-xs text-slate-400 max-w-lg font-sans">
                  Ejemplos curados de prompts sobresalientes y creaciones esculpidas por artistas de todo el planeta mediante el Entorno Aura.
                </p>
              </div>

              {/* Showcase highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden glass-border">
                    <img 
                      src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80" 
                      alt="Floral portrait" 
                      className="w-full h-full object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-pink-400 bg-pink-400/10 px-2.5 py-0.5 rounded-full border border-pink-400/20">
                      Destacado • Surrealismo
                    </span>
                    <h3 className="font-display font-bold text-base text-slate-200">The Botanical Queen</h3>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "Expressive oil portrait painting with intricate real flowers growing out of the shoulders, dripping gold textures, dark background, extreme depth."
                    </p>
                    <button
                      type="button"
                      id="remix-botanical-btn"
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          prompt: "Expressive oil portrait painting with intricate real flowers growing out of the shoulders, dripping gold textures, dark background, extreme depth.",
                          styleId: "photorealistic"
                        }));
                        setCurrentTab("generator");
                      }}
                      className="text-[#7C3AED] hover:text-[#EC4899] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors pt-2"
                    >
                      Copiar Prompt al Editor <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden glass-border">
                    <img 
                      src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80" 
                      alt="Cybernetics helmet" 
                      className="w-full h-full object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
                      Tendencia • Cyberpunk
                    </span>
                    <h3 className="font-display font-bold text-base text-slate-200">Aegis Cyberhelmet</h3>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "Professional product shot of high-tech tactical helmet, carbon armor, neon green glass visor with heads-up metrics, empty matte black background, volumetric lighting."
                    </p>
                    <button
                      type="button"
                      id="remix-aegis-btn"
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          prompt: "Professional product shot of high-tech tactical helmet, carbon armor, neon green glass visor with heads-up metrics, empty matte black background, volumetric lighting.",
                          styleId: "cyberpunk"
                        }));
                        setCurrentTab("generator");
                      }}
                      className="text-[#7C3AED] hover:text-[#EC4899] font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors pt-2"
                    >
                      Copiar Prompt al Editor <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {currentTab === "models" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-white font-sans">
                  Centro de Modelos de Difusión
                </h1>
                <p className="text-xs text-slate-400 max-w-lg font-sans">
                  Visualiza los parámetros internos de los modelos de inteligencia artificial y su latencia de respuesta bajo el motor de AuraStudio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="p-3 w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center font-bold">
                    v3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Aura-3 Estándar (Difusión)</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">MOTOR PRINCIPAL ACTIVO</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Entrenado con más de 500 millones de imágenes premium de alta resolución. Excelente fidelidad estéticamente robusta y encuadre personalizable.
                  </p>
                  <div className="text-[10px] font-mono text-slate-500 space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <p>LATENCIA: ~1.2s</p>
                    <p>MUESTREO: 45 Pasos</p>
                    <p>PRECISIÓN: FP16</p>
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="p-3 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-[#7C3AED] flex items-center justify-center font-bold">
                    HQ
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Aura-3 Ultra (Predicción V)</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">SOPORTE DE ALTA GAMA</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Excelente rendimiento reproduciendo texturas hiper-detalladas (hilos de luz, engranajes microscópicos, reflejos poligonales complejos).
                  </p>
                  <div className="text-[10px] font-mono text-slate-500 space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <p>LATENCIA: ~2.8s</p>
                    <p>MUESTREO: 100 Pasos</p>
                    <p>PRECISIÓN: FP32</p>
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="p-3 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-[#EC4899] flex items-center justify-center font-bold">
                    v2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Aura-2 turbo (Latencia Rápida)</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">MOTOR DE RESPALDO SECUNDARIO</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Utiliza pases ultrarrápidos de consistencia latente (LCM) para renderizar en menos de 0.4s. Ideal para wireframing interactivo rápido.
                  </p>
                  <div className="text-[10px] font-mono text-slate-500 space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <p>LATENCIA: ~0.4s</p>
                    <p>MUESTREO: 8 Pasos</p>
                    <p>PRECISIÓN: INT8</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {currentTab === "settings" && (
            <div className="space-y-6 animate-fade-in max-w-xl">
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-white font-sans">
                  Configuración Global
                </h1>
                <p className="text-xs text-slate-400 font-sans">
                  Administra configuraciones estéticas, visualización de barras, credenciales del motor de inteligencia artificial y estadísticas.
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
                
                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-400 uppercase">Ajustes Generales del Entorno</span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Minimizar Barra Lateral</p>
                      <p className="text-[10px] text-slate-500">Oculta las etiquetas de la barra lateral izquierda en pantallas grandes</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={sidebarCollapsed}
                      onChange={(e) => setSidebarCollapsed(e.target.checked)}
                      className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] bg-slate-950 border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4">
                  <span className="text-xs font-mono text-slate-400 uppercase">Credenciales Neuronales</span>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2.5 font-sans">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">GEMINI BACKEND KEY</span>
                      <span className="text-emerald-400">CONECTADO</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      AuraStudio se conecta al servidor a través de la API oficial de Gemini (con el modelo solicitado <code className="text-xs bg-black/40 px-1 py-0.5 rounded text-[#EC4899] font-mono">gemini-3.1-flash-image-preview</code>) para optimizar tus prompts y generar etiquetas.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4">
                  <span className="text-xs font-mono text-slate-400 uppercase">Estadísticas del Servidor</span>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                      <p className="text-slate-500">CARGA DE VRAM</p>
                      <p className="text-slate-200 font-bold mt-1 text-sm">42.4% / 96GB</p>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                      <p className="text-slate-500">LATENCIA DE RED</p>
                      <p className="text-emerald-400 font-bold mt-1 text-sm">14ms</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {currentTab === "docs" && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-white font-sans">
                  Guía de Redacción Estética
                </h1>
                <p className="text-xs text-slate-400 font-sans">
                  Consejos prácticos para componer prompts sobresalientes y obtener el mejor partido del Motor Aura de AuraStudio.
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6 text-sm leading-relaxed text-slate-300 font-sans">
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-white">1. Fórmula de Estructura de Prompt</h3>
                  <p className="text-xs text-slate-400 leading-normal">
                    Las obras estéticas más refinadas siguen un patrón claro: <code className="text-slate-100 bg-white/5 px-1.5 py-0.5 rounded font-mono">[Sujeto Central] + [Fondo y Atmósfera] + [Configuración de Lente/Cámara] + [Estilos Estéticos/Iluminación]</code>.
                  </p>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h3 className="font-display font-semibold text-white">2. Calibración de la Escala de Guía (CFG)</h3>
                  <p className="text-xs text-slate-400 leading-normal">
                    El valor de CFG determina con qué precisión el modelo interpreta las instrucciones literales de tu prompt:
                  </p>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 ml-2">
                    <li><strong className="text-slate-300">CFG 1 - 5:</strong> Arte suave más abstracto e interpretativo, mayor libertad creadora.</li>
                    <li><strong className="text-slate-300">CFG 7 - 10 (Recomendado):</strong> Renderizado natural bien balanceado que sigue tus palabras a la perfección.</li>
                    <li><strong className="text-slate-300">CFG 12 - 20:</strong> Adherencia matemática extrema, altos contrastes y bordes muy marcados.</li>
                  </ul>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h3 className="font-display font-semibold text-white">3. Pautas de Imagen de Referencia (Img2Img)</h3>
                  <p className="text-xs text-slate-400 leading-normal">
                    La técnica de Imagen a Imagen adquiere las geometrías de contornos del lienzo guía y les superpone tus prompts de texto estéticos. Úsalo con siluetas definidas y contrastes limpios.
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Right Side Settings Panel (Only shown in generator space tab) */}
      {currentTab === "generator" && (
        <SettingsPanel 
          settings={settings}
          onChangeSettings={(newS) => setSettings(prev => ({ ...prev, ...newS }))}
          isOpenMobile={mobileSettingsOpen}
          onCloseMobile={() => setMobileSettingsOpen(false)}
          isGenerating={isGenerating}
        />
      )}

      {/* Detailed full screen image viewing portal (Modal) */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-[#080B11]/95 border border-white/10 rounded-3xl p-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-6"
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Visual view container */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#121824] flex items-center justify-center max-h-[60vh] md:max-h-full">
              <img 
                src={selectedImage.url} 
                alt="Selected Sculpture" 
                className="max-h-full max-w-full object-contain block"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Configuration stats card panel */}
            <div className="w-full md:w-80 flex flex-col justify-between space-y-4 font-sans">
              <div className="space-y-4">
                <span className="text-[10px] font-mono tracking-widest text-[#7C3AED] bg-[#7C3AED]/10 px-2.5 py-1 rounded-full border border-[#7C3AED]/20 inline-block uppercase animate-pulse">
                  OBRA IA DE ALTA GAMA
                </span>

                <h3 className="text-base font-sans font-extrabold text-white tracking-wide">
                  Especificaciones del Modelo
                </h3>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar italic select-all">
                  "{selectedImage.prompt}"
                </div>

                <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5 font-sans">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2">Constantes Neuronales</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <p className="text-slate-500 text-[9px]">SEMILLA</p>
                      <p className="text-slate-200 truncate">{selectedImage.seed}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[9px]">PASOS</p>
                      <p className="text-slate-200">{selectedImage.steps} (HQ)</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[9px]">ESCALA CFG</p>
                      <p className="text-slate-200">{selectedImage.cfgScale.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[9px]">MUESTREADOR</p>
                      <p className="text-slate-200 truncate">{selectedImage.sampler.split(" ")[0]}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedImage.tags.map((tag, i) => (
                    <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = document.createElement("a");
                    link.href = selectedImage.url;
                    link.download = `AuraStudio-${selectedImage.id}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] font-sans font-bold text-xs py-3 rounded-xl text-center text-white cursor-pointer hover:opacity-95 shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Escultura
                </button>
                <p className="text-[9px] text-slate-500 text-center font-mono">
                  Creado el: {new Date(selectedImage.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
