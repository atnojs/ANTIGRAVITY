import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  History, 
  Clock, 
  User as UserIcon, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Download, 
  Trash2,
  Loader2,
  CameraIcon,
  RefreshCw
} from 'lucide-react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { X } from 'lucide-react';

// --- Constants & Types ---

const STORAGE_KEY = 'viaje_tiempo_history';

const HISTORICAL_SCENES = [
  {
    id: 'ancient-egypt',
    name: 'Antiguo Egipto',
    era: '1350 a.C.',
    description: 'La edad de oro de los faraones y las pirámides.',
    prompt: 'A majestic Pharaoh or high-ranking Egyptian noble in the court of Akhenaten. Golden ornaments, white linen robes, and the Great Pyramids visible through a stone window.',
    image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'renaissance',
    name: 'Renacimiento',
    era: '1500 d.C.',
    description: 'El renacimiento del arte y la ciencia en Florencia.',
    prompt: 'A wealthy Renaissance merchant or artist in a studio filled with canvases and scientific instruments. Rich velvet clothing, ornate collars, and a view of Florence cathedral.',
    image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'wild-west',
    name: 'Lejano Oeste',
    era: '1880 d.C.',
    description: 'La frontera indómita de vaqueros y forajidos.',
    prompt: 'A legendary gunslinger or pioneer in a dusty frontier town. Leather duster, cowboy hat, rugged boots, standing in front of a wooden saloon with a desert sunset.',
    image: 'https://images.unsplash.com/photo-1533167649158-6d508895b680?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'roaring-twenties',
    name: 'Los Locos Años 20',
    era: '1925 d.C.',
    description: 'La era del Jazz, las Flappers y el Art Déco.',
    prompt: 'A glamorous socialite or dapper gentleman in a smoky jazz club. Sequined flapper dress or pinstripe suit, Art Deco interiors, and a live band in the background.',
    image: 'https://images.unsplash.com/photo-1514525253344-f814d074358a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'medieval',
    name: 'Edad Media',
    era: '1200 d.C.',
    description: 'Caballeros, castillos y caballería.',
    prompt: 'A brave knight in shining plate armor or a noble lady in a medieval castle hall. Tapestries on stone walls, torches flickering, and a tournament field visible outside.',
    image: 'https://images.unsplash.com/photo-1599409673963-8f304a658f4e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'cyberpunk',
    name: 'Futuro Neón',
    era: '2099 d.C.',
    description: 'Una distopía cyberpunk de alta tecnología y baja calidad de vida.',
    prompt: 'A high-tech street samurai or netrunner in a rain-slicked neon city. Cybernetic implants, glowing visor, futuristic jacket, and massive holographic advertisements.',
    image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&q=80'
  }
];

interface TravelEntry {
  id: string;
  uid: string;
  originalPhoto: string;
  historicalPhoto: string;
  scene: string;
  era: string;
  description: string;
  createdAt: any;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'home' | 'booth' | 'gallery'>('home');
  const [selectedScene, setSelectedScene] = useState(HISTORICAL_SCENES[0]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [travels, setTravels] = useState<TravelEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Utilities ---

  const compressImage = (dataUrl: string, maxWidth: number = 600, quality: number = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  };

  // --- Auth & Data ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Cargar historial local inicial (opcional, para rapidez)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && travels.length === 0) setTravels(parsed);
      }
    } catch (e) { console.warn('Error cargando historial:', e); }

    const q = query(
      collection(db, 'travels'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TravelEntry[];
      setTravels(entries);
      
      // Persistir en localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (e) { console.warn('Error guardando historial:', e); }

    }, (err) => {
      console.error("Firestore error:", err);
      setError("Failed to load gallery. Check security rules.");
    });
    return unsubscribe;
  }, [user]);

  // Manejar Escape para el lightbox
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // --- Camera Logic ---

  const startCamera = async () => {
    setError(null);
    try {
      stopCamera();
      
      // Small delay to ensure hardware is released
      await new Promise(resolve => setTimeout(resolve, 100));

      const constraints = [
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'user' } },
        { video: true }
      ];

      let stream: MediaStream | null = null;
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          if (stream) break;
        } catch (e) {
          console.warn("Constraint failed:", constraint, e);
        }
      }

      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        throw new Error("No se pudo acceder a ninguna fuente de video.");
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Acceso a la cámara denegado. Por favor, activa los permisos en tu navegador.");
      } else if (err.name === 'NotFoundError') {
        setError("No se encontró ninguna cámara en este dispositivo.");
      } else {
        setError("No se pudo iniciar la fuente de video. Intenta recargar la página o cerrar otras apps que usen la cámara.");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("Track stopped:", track.label);
      });
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const rawDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        const compressed = await compressImage(rawDataUrl);
        setCapturedImage(compressed);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const compressed = await compressImage(dataUrl);
        setCapturedImage(compressed);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // --- AI Logic ---

  const processTimeTravel = async () => {
    if (!capturedImage || !user) return;
    setIsProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = capturedImage.split(',')[1];

      // Step 1: Analyze the original photo with gemini-3-flash-preview (more robust for vision)
      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: "Analyze this person's facial features, hair, expression, and pose in detail. Provide a concise description that can be used to recreate their likeness in a historical setting."
            }
          ]
        }
      });

      const analysisText = analysisResponse.text;
      if (!analysisText) {
        throw new Error("La IA no pudo analizar la imagen original.");
      }

      // Step 2: Generate the historical photo using gemini-2.5-flash-image
      const generationResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: `Transform the person in this photo into a character from ${selectedScene.name} (${selectedScene.era}). 
                     ${selectedScene.prompt} 
                     Based on this analysis: "${analysisText}", maintain their unique facial features, expression, and pose exactly. 
                     Change their clothing, hair, and background to be historically accurate. 
                     The final image should look like a high-quality historical photograph or painting.`
            }
          ]
        }
      });

      if (!generationResponse.candidates?.[0]?.content?.parts) {
        throw new Error("La IA no devolvió ninguna imagen. Puede que la imagen haya sido bloqueada por filtros de seguridad.");
      }

      let historicalPhotoBase64 = '';
      for (const part of generationResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          historicalPhotoBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!historicalPhotoBase64) {
        throw new Error("AI failed to generate the historical image.");
      }

      // Compress historical photo before saving to Firestore
      const compressedHistorical = await compressImage(historicalPhotoBase64);

      // Step 2: Save to Firestore
      try {
        await addDoc(collection(db, 'travels'), {
          uid: user.uid,
          originalPhoto: capturedImage,
          historicalPhoto: compressedHistorical,
          scene: selectedScene.name,
          era: selectedScene.era,
          description: selectedScene.description,
          createdAt: serverTimestamp()
        });
      } catch (fsErr: any) {
        console.error("Firestore write error:", fsErr);
        if (fsErr.message?.includes("permissions")) {
          throw new Error("Error de permisos en la base de datos. Por favor, contacta con soporte.");
        }
        throw fsErr;
      }

      setView('gallery');
      setCapturedImage(null);
    } catch (err: any) {
      console.error("AI Error:", err);
      setError("¡El viaje en el tiempo ha fallado! La brecha temporal es inestable. Inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este registro histórico?')) return;
    try {
      await deleteDoc(doc(db, 'travels', id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const clearAllHistory = async () => {
    if (!user) return;
    if (!confirm('¿ESTÁS SEGURO? Esta acción destruirá TODOS tus registros temporales de forma permanente.')) return;
    
    try {
      setIsProcessing(true);
      // Borrar de Firestore (limitado a 500 por lote si fuera necesario, aquí borramos uno a uno por sencillez o podriamos usar Batch)
      for (const entry of travels) {
        await deleteDoc(doc(db, 'travels', entry.id));
      }
      // Limpiar local
      localStorage.removeItem(STORAGE_KEY);
      setTravels([]);
    } catch (err) {
      console.error("Clear error:", err);
      setError("Error al limpiar el historial.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render Helpers ---

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0502] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0502] text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-5xl font-light tracking-tighter mb-4">CHRONOS BOOTH</h1>
          <p className="text-zinc-400 mb-12 font-light leading-relaxed">
            Cruza la brecha temporal. Captura tu imagen y obsérvate en el tapiz de la historia.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="w-full py-4 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3"
          >
            <UserIcon className="w-5 h-5" />
            Iniciar sesión con Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-sm bg-black/20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <Clock className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-light tracking-widest">CHRONOS</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView('gallery')}
            className={cn(
              "text-sm tracking-widest uppercase transition-colors",
              view === 'gallery' ? "text-orange-500" : "text-zinc-400 hover:text-white"
            )}
          >
            Galería
          </button>
          <button 
            onClick={logout}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-2 gap-12 items-center py-12"
            >
              <div>
                <h2 className="text-7xl font-light leading-[0.9] tracking-tighter mb-8">
                  ¿A QUÉ ÉPOCA <br />
                  <span className="text-orange-500 italic">PERTENECES?</span>
                </h2>
                <p className="text-zinc-400 text-lg font-light mb-12 max-w-md leading-relaxed">
                  Nuestro motor temporal neuronal reconstruye tu identidad a través de las eras. Selecciona un destino y entra en la cabina.
                </p>
                
                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-semibold">Seleccionar Era</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {HISTORICAL_SCENES.map((scene) => (
                      <button
                        key={scene.id}
                        onClick={() => setSelectedScene(scene)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                          selectedScene.id === scene.id 
                            ? "border-orange-500 bg-orange-500/5" 
                            : "border-white/10 hover:border-white/30 bg-white/5"
                        )}
                      >
                        <div className="relative z-10">
                          <div className="text-xs text-zinc-500 mb-1">{scene.era}</div>
                          <div className="font-medium text-sm tracking-wide">{scene.name}</div>
                        </div>
                        {selectedScene.id === scene.id && (
                          <motion.div 
                            layoutId="active-scene"
                            className="absolute inset-0 bg-orange-500/10"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setView('booth');
                    startCamera();
                  }}
                  className="mt-12 group flex items-center gap-4 py-4 px-8 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-400 transition-all"
                >
                  Entrar en la Cabina
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10">
                <img 
                  src={selectedScene.image} 
                  alt={selectedScene.name}
                  className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0502] via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="text-4xl font-light tracking-tighter mb-2">{selectedScene.name}</div>
                  <p className="text-zinc-400 text-sm font-light">{selectedScene.description}</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'booth' && (
            <motion.div 
              key="booth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl mx-auto py-12"
            >
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => {
                    stopCamera();
                    setView('home');
                  }}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Volver a las Eras
                </button>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-widest text-orange-500 mb-1">Brecha Activa</div>
                  <div className="text-2xl font-light tracking-tight">{selectedScene.name}</div>
                </div>
                <div className="w-24" /> {/* Spacer */}
              </div>

              <div className="relative aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-orange-500/10">
                {!capturedImage ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-80 border-2 border-dashed border-white/20 rounded-full" />
                    </div>
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                      <label className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all">
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <Download className="w-8 h-8 text-white rotate-180" />
                      </label>
                      <button 
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center group hover:scale-110 transition-transform"
                      >
                        <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
                          <CameraIcon className="w-8 h-8 text-black" />
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="relative w-full h-full">
                    <img src={capturedImage} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8 text-center">
                      {error && (
                        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm">
                          {error}
                          <button 
                            onClick={() => {
                              setCapturedImage(null);
                              startCamera();
                            }}
                            className="block mt-2 underline hover:text-red-300"
                          >
                            Reintentar
                          </button>
                        </div>
                      )}
                      {isProcessing ? (
                        <div className="space-y-6">
                          <div className="relative">
                            <RefreshCw className="w-16 h-16 text-orange-500 animate-spin mx-auto" />
                            <Sparkles className="absolute top-0 right-0 w-6 h-6 text-yellow-400 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-light mb-2">Tejiendo el tiempo...</h3>
                            <p className="text-zinc-400 max-w-xs mx-auto text-sm">
                              Alineando vías neuronales con los datos históricos de {selectedScene.name}.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <h3 className="text-3xl font-light">¿Confirmar imagen?</h3>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => {
                                setCapturedImage(null);
                                startCamera();
                              }}
                              className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/5 transition-colors"
                            >
                              Repetir
                            </button>
                            <button 
                              onClick={processTimeTravel}
                              className="px-8 py-3 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors flex items-center gap-2"
                            >
                              Viajar Ahora
                              <Sparkles className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm"
                >
                  {error}
                </motion.div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}

          {view === 'gallery' && (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12"
            >
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-5xl font-light tracking-tighter">REGISTROS TEMPORALES</h2>
                <div className="flex gap-4">
                  {travels.length > 0 && (
                    <button 
                      onClick={clearAllHistory}
                      className="px-4 py-2 rounded-full border border-red-500/30 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpiar todo
                    </button>
                  )}
                  <button 
                    onClick={() => setView('home')}
                    className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm"
                  >
                    Nuevo Viaje
                  </button>
                </div>
              </div>

              {travels.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-white/10 rounded-[2rem]">
                  <History className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">Aún no hay viajes registrados. Entra en la brecha.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {travels.map((entry) => (
                    <motion.div 
                      key={entry.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group bg-white/5 rounded-[2rem] overflow-hidden border border-white/10 hover:border-orange-500/30 transition-all"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <img 
                          src={entry.historicalPhoto} 
                          alt={entry.scene}
                          onClick={() => setSelectedImage(entry.historicalPhoto)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                        />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = entry.historicalPhoto;
                              link.download = `chronos-${entry.scene.toLowerCase()}.png`;
                              link.click();
                            }}
                            className="p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-black/80 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 bg-red-500/60 backdrop-blur-md rounded-full hover:bg-red-500/80 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-4 left-4">
                          <div className="px-3 py-1 bg-orange-500 text-[10px] font-bold uppercase tracking-widest rounded-full">
                            {entry.era}
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="text-xl font-light mb-1">{entry.scene}</div>
                        <div className="text-xs text-zinc-500 mb-4">
                          {new Date(entry.createdAt?.seconds * 1000).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                            <img src={entry.originalPhoto} className="w-full h-full object-cover grayscale" />
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Imagen Original</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-12 text-center border-t border-white/5 mt-24">
        <div className="text-[10px] uppercase tracking-[0.5em] text-zinc-600">
          Desarrollado por Neural Temporal Engine & Gemini AI
        </div>
      </footer>

      {/* Lightbox Standard Antigravity */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImage} 
                className="w-full h-full object-contain rounded-xl shadow-2xl border border-white/10"
                alt="Enlarged temporal record"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage;
                    link.download = `chronos-zoom.png`;
                    link.click();
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar Copia de Alta Definición
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .cursor-zoom-in { cursor: zoom-in; }
        .cursor-zoom-out { cursor: zoom-out; }
      `}</style>
    </div>
  );
}
