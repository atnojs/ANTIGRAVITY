import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  Upload, FileVideo, CheckCircle, AlertCircle, Download,
  Cpu, Zap, Settings, Activity, Clock, Gauge, Save, Monitor, X
} from 'lucide-react';

type OptimizationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'waiting-gpu';

interface HistoryItem {
  id: string;
  name: string;
  size: string;
  platform: string;
  timestamp: number;
}

const PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', resolution: '720p (1280:-2)', icon: '📱' },
  { id: 'instagram', label: 'Instagram Reels', resolution: '1080x1920', icon: '📷' },
  { id: 'tiktok', label: 'TikTok', resolution: '1080x1920', icon: '🎵' },
  { id: 'youtube-shorts', label: 'YouTube Shorts', resolution: '1080x1920', icon: '▶️' },
  { id: 'twitter', label: 'Twitter/X', resolution: '720p (1280:-2)', icon: '🐦' },
  { id: 'custom', label: 'Custom', resolution: 'Configurable', icon: '⚙️' },
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<OptimizationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('0%');
  const [logs, setLogs] = useState<string[]>(['> [sistema] Motor inicializado.']);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('whatsapp');
  const [customWidth, setCustomWidth] = useState(1280);
  const [hwStatus, setHwStatus] = useState<'checking' | 'gpu' | 'cpu-only' | 'error'>('checking');
  const [showGpuWarning, setShowGpuWarning] = useState(false);
  const [useCpuFallback, setUseCpuFallback] = useState(false);
  const [ffmpegStats, setFfmpegStats] = useState({ frame: 0, fps: 0, time: '00:00:00', speed: '0x' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, []);

  useEffect(() => {
    axios.get('/api/hw-status').then(res => {
      if (res.data.vaapi) {
        setHwStatus('gpu');
        addLog('[vaapi] ✅ AMD VA-API detectada. GPU lista.');
      } else {
        setHwStatus('cpu-only');
        addLog('[vaapi] ⚠️ VA-API no disponible.');
        addLog('[sistema] Se requiere confirmación para usar CPU.');
        setShowGpuWarning(true);
      }
    }).catch(() => {
      setHwStatus('error');
      addLog('[error] No se pudo verificar el hardware.');
    });
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `> ${msg}`].slice(-20));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setDownloadUrl(null);
      setProgress(0);
      setProgressText('0%');
      setFfmpegStats({ frame: 0, fps: 0, time: '00:00:00', speed: '0x' });
      addLog(`[archivo] Cargado: ${e.target.files[0].name} (${(e.target.files[0].size / (1024 * 1024)).toFixed(1)}MB)`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (hwStatus === 'cpu-only' && !useCpuFallback) {
      setShowGpuWarning(true);
      setStatus('waiting-gpu');
      return;
    }

    setStatus('uploading');
    addLog(`[subida] Enviando: ${file.name}`);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('platform', selectedPlatform);
    if (selectedPlatform === 'custom') {
      formData.append('customWidth', customWidth.toString());
    }
    formData.append('useCpu', (hwStatus !== 'gpu').toString());

    try {
      setStatus('processing');
      addLog(hwStatus === 'gpu' ? '[vaapi] Aceleración por hardware activada.' : '[cpu] Codificación por software (libx264).');

      const response = await axios.post('/api/optimize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const taskId = response.data.taskId;
      const initialDownloadUrl = response.data.downloadUrl as string | undefined;

      if (taskId) {
        if (pollRef.current) clearInterval(pollRef.current);
        let completed = false;

        pollRef.current = setInterval(async () => {
          if (completed) return;
          try {
            const res = await axios.get(`/api/progress/${taskId}`);
            const data = res.data;
            if (typeof data.progress === 'number') {
              setProgress(Math.min(data.progress, 100));
              setProgressText(`${Math.round(Math.min(data.progress, 100))}%`);
            }
            if (data.frame) {
              setFfmpegStats(prev => ({
                ...prev,
                frame: data.frame || prev.frame,
                fps: data.fps || prev.fps,
                time: data.time || prev.time,
                speed: data.speed || prev.speed,
              }));
            }
            if (data.status === 'completed' && !completed) {
              completed = true;
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
              setDownloadUrl(data.downloadUrl || initialDownloadUrl || null);
              setStatus('success');
              setProgress(100);
              setProgressText('100%');
              addLog('[sistema] ✅ Optimización completada.');
              setHistory(prev => [{
                id: Math.random().toString(36).substring(2, 11),
                name: file!.name,
                size: (file!.size / (1024 * 1024)).toFixed(1) + 'MB',
                platform: PLATFORMS.find(p => p.id === selectedPlatform)?.label || selectedPlatform,
                timestamp: Date.now()
              }, ...prev]);
            } else if (data.status === 'error' && !completed) {
              completed = true;
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
              setStatus('error');
              addLog('[error] ❌ La conversión ha fallado.');
            }
          } catch {
            // Network hiccup, retry next interval
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      addLog(`[error] ❌ ${err.response?.data?.error || 'Error de conexión.'}`);
    }
  };

  const resetApp = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setProgressText('0%');
    setDownloadUrl(null);
    setFfmpegStats({ frame: 0, fps: 0, time: '00:00:00', speed: '0x' });
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const codecLabel = hwStatus === 'gpu' && !useCpuFallback ? 'h264_vaapi' : 'libx264';
  const accelLabel = hwStatus === 'gpu' && !useCpuFallback ? 'GPU VA-API' : 'CPU';

  return (
    <div className="min-h-screen bg-[#050608] text-gray-300 font-sans selection:bg-orange-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-orange-900/5 rounded-full blur-[100px]"></div>
      </div>

      {/* GPU Warning Modal */}
      <AnimatePresence>
        {showGpuWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowGpuWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-orange-500/30 rounded-2xl p-8 max-w-lg mx-4 shadow-2xl shadow-orange-500/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <AlertCircle className="text-orange-500" size={24} />
                  VA-API no disponible
                </h3>
                <button onClick={() => setShowGpuWarning(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3 text-sm text-gray-400 mb-8">
                <p>No se detectó aceleración por hardware AMD VA-API.</p>
                <p className="text-gray-500 text-xs">Posibles causas:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-1 ml-2">
                  <li>No tienes una GPU AMD o los drivers no están instalados</li>
                  <li>WSL2 no tiene acceso a /dev/dri (necesitas GPU-PV)</li>
                  <li>El servicio vainfo no responde</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setUseCpuFallback(true); setShowGpuWarning(false); addLog('[cpu] ✅ Modo CPU activado por el usuario.'); }}
                  className="flex-1 py-3 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all"
                >
                  <Cpu size={16} className="inline mr-2" />
                  Usar CPU (más lento)
                </button>
                <button
                  onClick={() => { setShowGpuWarning(false); addLog('[sistema] Esperando resolución de GPU.'); }}
                  className="flex-1 py-3 px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-xl font-bold text-sm transition-all"
                >
                  <Monitor size={16} className="inline mr-2" />
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Navbar */}
        <nav className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30">
              <FileVideo className="text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">OPTIMIZADOR AMD FFMPEG</h1>
              <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">v1.1.0 // Entorno WSL2</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Estado de Hardware</span>
              {hwStatus === 'checking' && (
                <span className="text-[11px] font-medium text-yellow-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> Verificando...
                </span>
              )}
              {hwStatus === 'gpu' && (
                <span className="text-[11px] font-medium text-green-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> VA-API Activo
                </span>
              )}
              {hwStatus === 'cpu-only' && (
                <button onClick={() => setShowGpuWarning(true)} className="text-[11px] font-medium text-orange-400 flex items-center gap-1.5 hover:text-orange-300 cursor-pointer">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  VA-API no disponible {useCpuFallback ? '(CPU activa)' : ''}
                </button>
              )}
              {hwStatus === 'error' && (
                <span className="text-[11px] font-medium text-red-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Error de hardware
                </span>
              )}
            </div>
          </div>
        </nav>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <section className="space-y-8">
            {/* Upload + Progress */}
            <div className="grid md:grid-cols-[340px_1fr] gap-8">
              <div
                className={`relative group aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-5 p-8 cursor-pointer
                  ${status === 'idle' ? 'border-gray-800 hover:border-blue-500/50 bg-gray-900/20' : 'border-gray-800 bg-gray-900/10 opacity-50 pointer-events-none'}`}
                onClick={() => status === 'idle' && fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*,.mp4,.mov,.mkv,.avi,.webm,.wmv,.flv" className="hidden" />
                <div className="p-5 rounded-full bg-gray-800/50 border border-gray-700 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-gray-400 group-hover:text-blue-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-1">Subir Vídeo</h3>
                  <p className="text-sm text-gray-500">Arrastra o haz clic para seleccionar</p>
                  <p className="text-[10px] text-gray-600 mt-1">MP4, MOV, MKV, AVI, WebM</p>
                  <p className="mt-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">Límite: 2GB</p>
                </div>
              </div>

              {/* Progress Panel */}
              <div className="bg-gray-900/40 rounded-2xl border border-gray-800 p-8 flex flex-col">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {status === 'idle' ? 'Listo para procesar' :
                       status === 'waiting-gpu' ? 'Esperando decisión de GPU' :
                       status === 'uploading' ? 'Subiendo archivo' :
                       status === 'processing' ? `Procesando: ${file?.name}` :
                       status === 'success' ? 'Optimización completada' : 'Error detectado'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {file ? `Entrada: ${file.name} (${(file.size / (1024*1024)).toFixed(0)}MB)` : "Selecciona un vídeo para comenzar."}
                    </p>
                  </div>
                  {status !== 'idle' && status !== 'waiting-gpu' && (
                    <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      status === 'uploading' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {status === 'processing' ? 'En curso' : status === 'uploading' ? 'Subiendo' : status === 'success' ? 'Éxito' : 'Error'}
                    </div>
                  )}
                </div>

                <div className="flex-grow flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                      {status === 'processing' ? `FFmpeg: Frame ${ffmpegStats.frame} / Vel. ${ffmpegStats.speed}` : 'Estado'}
                    </span>
                    <span className="text-xl font-mono font-bold text-white">{progressText}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                    <motion.div
                      className={`h-full ${status === 'success' ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    ></motion.div>
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-600">
                    <div className="flex items-center gap-2"><Clock size={12} /> Tiempo: {ffmpegStats.time}</div>
                    <div className="flex items-center gap-2">Vel: {ffmpegStats.speed}</div>
                  </div>
                </div>

                <div className="mt-8 bg-black/60 rounded-xl border border-gray-800 p-4 font-mono text-[11px] h-36 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${
                      log.includes('error') || log.includes('❌') ? 'text-red-400' :
                      log.includes('[vaapi]') || log.includes('✅') ? 'text-green-400' :
                      log.includes('⚠️') ? 'text-orange-400' :
                      log.includes('[cpu]') ? 'text-yellow-400' :
                      'text-gray-400'}`}>
                      {log}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>

            {/* Platform + Settings */}
            <div className="bg-gray-900/20 rounded-2xl border border-gray-800 p-8">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Plataforma de destino</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      selectedPlatform === p.id
                        ? 'border-blue-500/50 bg-blue-500/10 text-white'
                        : 'border-gray-800 bg-gray-800/30 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    <div className="text-xl mb-2">{p.icon}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider">{p.label}</div>
                  </button>
                ))}
              </div>

              {selectedPlatform === 'custom' && (
                <div className="mb-6 flex items-center gap-4">
                  <label className="text-xs text-gray-500 uppercase tracking-widest">Ancho (px)</label>
                  <input type="number" value={customWidth} onChange={e => setCustomWidth(Number(e.target.value))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm w-32 focus:border-blue-500 focus:outline-none" />
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Resolución', value: PLATFORMS.find(p => p.id === selectedPlatform)?.resolution || '720p', icon: Activity },
                  { label: 'Códec', value: codecLabel, icon: Cpu },
                  { label: 'Audio', value: 'AAC 128k', icon: Gauge },
                  { label: 'Aceleración', value: accelLabel, icon: hwStatus === 'gpu' && !useCpuFallback ? Zap : Cpu },
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-800/30 border border-gray-700/50 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="text-[9px] uppercase tracking-widest font-bold">{item.label}</span>
                      <item.icon size={12} />
                    </div>
                    <div className="text-sm font-bold text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={status === 'success' ? resetApp : handleUpload}
                disabled={!file || status === 'uploading' || status === 'processing'}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                  ${!file || status === 'processing' || status === 'uploading' ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700' :
                    'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border border-blue-400/30'}`}
              >
                {status === 'success' ? <><Save size={18} /> Procesar otro</> : <><Zap size={18} /> Optimizar para RRSS</>}
              </button>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-8">
            <div className="bg-gray-900/40 rounded-2xl border border-gray-800 p-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Optimizaciones recientes</h4>
                <div className="text-[10px] text-gray-600 flex items-center gap-1"><Clock size={10} /></div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-800 rounded-xl">
                  <FileVideo className="mx-auto text-gray-700 mb-2" size={24} />
                  <p className="text-xs text-gray-600">Sin registros aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.id} className="group bg-gray-800/20 border border-gray-800 hover:border-gray-700 p-4 rounded-xl transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                            <p className="text-[9px] text-gray-500 mt-1 uppercase">{item.size} · {item.platform}</p>
                          </div>
                        </div>
                        {downloadUrl && (
                          <a href={downloadUrl} download className="opacity-40 group-hover:opacity-100 p-2 hover:bg-gray-700 rounded-lg transition-all text-gray-400">
                            <Download size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {status === 'success' && downloadUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 bg-blue-600 rounded-xl flex items-center justify-between shadow-xl shadow-blue-600/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-blue-100" />
                    <span className="text-xs font-bold text-white">Descarga lista</span>
                  </div>
                  <a href={downloadUrl} download className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all">
                    <Download size={18} className="text-white" />
                  </a>
                </motion.div>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-transparent rounded-2xl border border-blue-900/20 p-8">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Información de Arquitectura</h4>
              <p className="text-[11px] leading-relaxed text-gray-400">
                {hwStatus === 'gpu'
                  ? 'Aceleración AMD VA-API activa. La GPU procesa H.264 sin carga en la CPU.'
                  : 'Sin VA-API, la codificación es por software (libx264). Para activar GPU, configura WSL2 con GPU-PV.'}
                <br /><br />
                Códec: <code className="bg-black/40 px-1 rounded text-blue-300">{codecLabel}</code>
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-16 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-800 pt-8 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex gap-6 text-[9px] font-mono uppercase tracking-widest">
            <span>Aceleración: {accelLabel}</span>
            <span>Plataforma: {PLATFORMS.find(p => p.id === selectedPlatform)?.label}</span>
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest">AMD Video Optimizer</div>
        </footer>
      </div>
    </div>
  );
}