import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Cpu, 
  Sparkles, 
  Layout, 
  Zap, 
  Copy, 
  RefreshCw,
  History,
  Trash2,
  Terminal,
  FileJson,
  Search,
  Target,
  BarChart3,
  Globe,
  CheckCircle2,
  Database // Corregido: Importación faltante
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- CONFIGURACIÓN DE REQUISITOS ---
const APP_REQUIREMENTS = {
  type: [
    { id: 'generator', label: 'Generador desde Texto', desc: 'Enfoque en Text-to-Image avanzado' },
    { id: 'editor', label: 'Editor / Inpainting', desc: 'Modificación de áreas y retoque IA' },
    { id: 'upscaler', label: 'Restaurador / Upscale', desc: 'Aumento de resolución y detalle' },
    { id: 'styles', label: 'Transferencia de Estilo', desc: 'Filtros artísticos neuronales' }
  ],
  interface: [
    { id: 'minimalist', label: 'Minimalismo Apple', desc: 'Limpio, mucho aire, tipografía premium' },
    { id: 'futuristic', label: 'Cyberpunk / Dark', desc: 'Neones, neomorfismo, alto contraste' },
    { id: 'dashboard', label: 'SaaS Profesional', desc: 'Paneles laterales, gestión de assets' },
    { id: 'glass', label: 'Glassmorphism', desc: 'Transparencias y desenfoques modernos' }
  ],
  features: [
    { id: 'history', label: 'Historial Cloud', desc: 'Persistencia en base de datos' },
    { id: 'batch', label: 'Proceso por Lotes', desc: 'Manejo de múltiples imágenes' },
    { id: 'social', label: 'Social / Feed', desc: 'Compartir y galería pública' },
    { id: 'api', label: 'Multi-Modelo API', desc: 'Imagen + DALL-E + Midjourney' }
  ]
};

const App = () => {
  const [user, setUser] = useState(null);
  const [appConcept, setAppConcept] = useState('');
  const [specs, setSpecs] = useState({ type: '', interface: '', features: [] });
  const [masterPrompt, setMasterPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [error, setError] = useState(null);

  // 1. Auth (Regla 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Historial (Reglas 1 y 2)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'blueprints'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBlueprints(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error("Firestore error", err));
    return () => unsubscribe();
  }, [user]);

  // Función con Backoff Exponencial
  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  // 3. Análisis de Competencia con Google Search
  const analyzeCompetition = async () => {
    if (!appConcept) return;
    setIsAnalyzing(true);
    setError(null);
    const apiKey = "";

    try {
      const payload = {
        contents: [{ parts: [{ text: `Analiza las aplicaciones líderes actuales de IA relacionadas con: ${appConcept}. Identifica sus 3 funciones estrella, su stack tecnológico probable y qué les falta (puntos débiles) que podríamos mejorar en nuestra nueva app.` }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: "Eres un analista de mercado de software. Tu respuesta debe ser un resumen ejecutivo estructurado con 'Líderes', 'Fortalezas' y 'Oportunidades'." }] }
      };

      const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || "No se obtuvo análisis.";
      setMarketAnalysis(analysisText);
    } catch (err) {
      setError("No se pudo completar el análisis de mercado.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. Generación de Blueprint Maestro
  const generateAppBlueprint = async () => {
    if (!appConcept || !user) return;
    setIsGenerating(true);
    setError(null);
    const apiKey = "";

    const systemPrompt = `Eres un Arquitecto Senior de Software (OpenCode). Tu misión es redactar un PROMPT MAESTRO DE CONSTRUCCIÓN para una IA de desarrollo. El prompt debe ser tan detallado que la IA resultante sea capaz de competir con los líderes del mercado. Incluye arquitectura de archivos, hooks personalizados, integraciones de API de imagen, y una UI con Tailwind CSS que sea superior a la competencia analizada.`;
    
    const userQuery = `
      CONSTRUYE EL BLUEPRINT PARA ESTA APP:
      - Concepto: ${appConcept}
      - Mercado: ${typeof marketAnalysis === 'string' ? marketAnalysis : 'Análisis no disponible'}
      - Arquitectura: ${APP_REQUIREMENTS.type.find(t => t.id === specs.type)?.label || 'Estándar'}
      - Diseño: ${APP_REQUIREMENTS.interface.find(i => i.id === specs.interface)?.label || 'Estándar'}
      - Funciones: ${specs.features.map(f => APP_REQUIREMENTS.features.find(req => req.id === f)?.label).filter(Boolean).join(', ')}
      
      Salida: Documento estructurado Markdown "INSTRUCCIONES DE CONSTRUCCIÓN" optimizado para GPT/Gemini/Claude.
    `;

    try {
      const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setMasterPrompt(text);
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'blueprints'), {
          concept: appConcept,
          specs,
          blueprint: text,
          marketIntelligence: marketAnalysis || "",
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      setError("Error al orquestar el blueprint definitivo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  return (
    <div className="min-h-screen bg-[#060709] text-slate-300 font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 p-6 max-w-[1600px] mx-auto">
        <header className="flex items-center justify-between mb-10 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50 backdrop-blur-md">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Target className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white uppercase italic leading-none">Market Architect <span className="text-indigo-500">PRO</span></h1>
              <p className="text-[9px] font-bold text-slate-500 tracking-[0.4em] uppercase mt-1">Inteligencia Competitiva de Software</p>
            </div>
          </div>
          <div className="flex items-center gap-6 px-4">
            <div className="hidden lg:block text-right">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Repo Sync</p>
              <p className="text-xs text-emerald-400 font-mono">atnojs/google_ai_studio_1</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-slate-700 uppercase">
              {user?.uid?.slice(0, 2) || "AT"}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest">
                  <Terminal size={16} className="text-indigo-500" />
                  ADN de la Aplicación
                </h2>
                {isAnalyzing && <RefreshCw size={14} className="animate-spin text-indigo-400" />}
              </div>

              <div className="space-y-6">
                <section>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Misión Estratégica</label>
                  <div className="relative">
                    <textarea
                      value={appConcept}
                      onChange={(e) => setAppConcept(e.target.value)}
                      placeholder="Ej: Plataforma de generación de retratos realistas que supere a Midjourney..."
                      className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none h-24"
                    />
                    <button 
                      onClick={analyzeCompetition}
                      disabled={!appConcept || isAnalyzing}
                      className="absolute bottom-3 right-3 p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all disabled:opacity-50"
                      title="Analizar Competencia Actual"
                    >
                      <Search size={14} className="text-white" />
                    </button>
                  </div>
                </section>

                {marketAnalysis && (
                  <section className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                      <BarChart3 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Market Insights</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-relaxed font-sans line-clamp-4">
                      {typeof marketAnalysis === 'string' ? marketAnalysis : "Análisis procesado."}
                    </div>
                    <button className="text-[9px] text-indigo-400 font-bold mt-2 hover:underline" onClick={() => copyToClipboard(String(marketAnalysis))}>Copiar Inteligencia</button>
                  </section>
                )}

                <section>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Arquitectura Core</label>
                  <div className="grid grid-cols-1 gap-2">
                    {APP_REQUIREMENTS.type.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSpecs(prev => ({ ...prev, type: t.id }))}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          specs.type === t.id ? 'bg-indigo-600/10 border-indigo-500 text-white' : 'bg-black/20 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{t.label}</div>
                        <div className="text-[9px] opacity-60 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block text-center lg:text-left">UI Engine</label>
                  <div className="grid grid-cols-2 gap-2">
                    {APP_REQUIREMENTS.interface.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => setSpecs(prev => ({ ...prev, interface: i.id }))}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          specs.interface === i.id ? 'bg-blue-600/10 border-blue-500 text-white' : 'bg-black/20 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="font-bold text-[10px]">{i.label}</div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <button
                onClick={generateAppBlueprint}
                disabled={!appConcept || !specs.type || isGenerating}
                className={`w-full mt-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${
                  isGenerating ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/30'
                }`}
              >
                {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                Generar Blueprint Final
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-[2.5rem] h-full flex flex-col overflow-hidden backdrop-blur-md">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3 text-white">
                  <FileJson className="text-indigo-400" size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Blueprint Result</span>
                </div>
                {masterPrompt && (
                  <button onClick={() => copyToClipboard(masterPrompt)} className="px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-indigo-600 hover:text-white transition-all">
                    Copiar Prompt
                  </button>
                )}
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed">
                {masterPrompt ? (
                  <div className="space-y-4 prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-slate-300 bg-transparent border-none p-0">{String(masterPrompt)}</pre>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                    <Globe size={48} className="mb-4 animate-pulse" />
                    <p className="max-w-[240px] font-sans text-xs italic">Define el concepto y analiza el mercado para sintetizar el ADN de tu próxima aplicación competitiva.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/20 border-t border-slate-800 text-[9px] text-slate-500 font-bold flex justify-between items-center px-8">
                <span>FORMATO: MARKDOWN ESTRUCTURADO</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> OPTIMIZADO PARA OPENCODE</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-slate-900/20 border border-slate-800/50 rounded-[2.5rem] h-full p-6 flex flex-col backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="flex items-center gap-2 text-slate-500 font-bold text-[9px] uppercase tracking-widest">
                  <History size={14} /> Arquitecturas Guardadas
                </h3>
                <span className="bg-slate-800 px-2 py-1 rounded text-[10px] font-bold text-slate-400 border border-slate-700">{blueprints.length}</span>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {blueprints.length === 0 ? (
                  <div className="py-20 text-center opacity-10">
                    <Database size={40} className="mx-auto mb-2" />
                    <p className="text-[10px] uppercase font-bold">Sin registros</p>
                  </div>
                ) : (
                  blueprints.map((b) => (
                    <div 
                      key={b.id} 
                      className="group bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer relative"
                      onClick={() => { setMasterPrompt(b.blueprint); setMarketAnalysis(b.marketIntelligence); }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[8px] bg-indigo-600/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold uppercase">
                          {APP_REQUIREMENTS.type.find(t => t.id === b.specs.type)?.label || 'App'}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'blueprints', b.id)); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all text-slate-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-white text-[11px] font-bold line-clamp-2 mb-1 group-hover:text-indigo-300 transition-colors">{b.concept}</p>
                      <p className="text-[9px] text-slate-600 font-mono italic">ADN v{b.createdAt?.seconds?.toString().slice(-4) || '1.0'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-12 text-center">
          <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.6em]">
            Google Antigravity Market Intel • atnojs@gmail.com • WSL Ubuntu LTS
          </p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
      `}} />
    </div>
  );
};

export default App;