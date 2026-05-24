import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Upload, FileVideo, CheckCircle, AlertCircle, Download, 
  Cpu, Zap, Info, ArrowRight, Settings, Terminal, 
  Activity, Clock, Gauge, Save
} from 'lucide-react';

type OptimizationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface HistoryItem {
  id: string;
  name: string;
  size: string;
  speed: string;
  timestamp: number;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<OptimizationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState('00:00:00');
  const [logs, setLogs] = useState<string[]>([
    '> [sistema] Motor inicializado.',
    '> [vaapi] Codificación por hardware H.264 lista.'
  ]);
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', name: 'Concierto_Final.mp4', size: '12MB', speed: '4s codificación', timestamp: Date.now() - 3600000 },
    { id: '2', name: 'Skate_Trick_01.mp4', size: '4.5MB', speed: '2s codificación', timestamp: Date.now() - 7200000 }
  ]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `> ${msg}`].slice(-10));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setDownloadUrl(null);
      setProgress(0);
      addLog(`Archivo cargado: ${e.target.files[0].name}`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    addLog(`Iniciando subida: ${file.name}`);
    
    const formData = new FormData();
    formData.append('video', file);

    try {
      // Simulate processing phases for UI demo
      setTimeout(() => {
        setStatus('processing');
        addLog('Aceleración por hardware activada: VA-API');
      }, 1000);

      const response = await axios.post('/api/optimize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update state for success
      setDownloadUrl(response.data.downloadUrl);
      setStatus('success');
      setProgress(100);
      addLog('Pasada 1-de-1 completada.');
      addLog('Muxing finalizado. Salida lista.');

      // Add to history
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + 'MB',
        speed: 'Optimizado',
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);

    } catch (err) {
      console.error(err);
      setStatus('error');
      addLog('CRÍTICO: Tiempo de espera agotado de GPU o formato inválido.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-gray-300 font-sans selection:bg-orange-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-orange-900/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Top Navbar */}
        <nav className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30">
              <FileVideo className="text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 text-wrap">
                OPTIMIZADOR AMD FFMPEG
              </h1>
              <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">
                v1.0.4-estable // Entorno WSL2
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Estado de Hardware</span>
                <span className="text-[11px] font-medium text-green-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  AMD Radeon RX 6600 (VA-API Activo)
                </span>
              </div>
            </div>
            <button className="bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 px-5 py-2 rounded-lg text-xs font-semibold transition-all">
              Ajustes
            </button>
          </div>
        </nav>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <section className="space-y-8">
            {/* Upload Area */}
            <div className="grid md:grid-cols-[340px_1fr] gap-8">
              <div 
                className={`relative group aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-5 p-8
                  ${status === 'idle' ? 'border-gray-800 hover:border-blue-500/50 bg-gray-900/20' : 'border-gray-800 bg-gray-900/10 opacity-50 pointer-events-none'}`}
                onClick={() => status === 'idle' && fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
                <div className="p-5 rounded-full bg-gray-800/50 border border-gray-700 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-gray-400 group-hover:text-blue-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-1">Subir Vídeo</h3>
                  <p className="text-sm text-gray-500">Arrastra o haz clic para seleccionar MP4, MOV, MKV</p>
                  <p className="mt-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">Límite: 2GB por subida</p>
                </div>
              </div>

              {/* Status / Progress Panel */}
              <div className="bg-gray-900/40 rounded-2xl border border-gray-800 p-8 flex flex-col">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {status === 'idle' ? 'Listo para procesar' : 
                       status === 'uploading' ? 'Subiendo archivo' : 
                       status === 'processing' ? `Procesando: ${file?.name}` : 
                       status === 'success' ? 'Optimización completada' : 'Error detectado'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {file ? `Entrada: ${file.name} (${(file.size / (1024*1024)).toFixed(0)}MB)` : "Selecciona una fuente para comenzar la cadena de optimización."}
                    </p>
                  </div>
                  {status !== 'idle' && (
                    <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
                      {status === 'processing' ? 'En curso' : status === 'uploading' ? 'Subiendo' : status === 'success' ? 'Éxito' : 'Error'}
                    </div>
                  )}
                </div>

                {/* Progress Visual */}
                <div className="flex-grow flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Estado FFmpeg: Frame 1248 / Vel. 8.2x</span>
                    <span className="text-xl font-mono font-bold text-white">{status === 'processing' ? '68%' : status === 'success' ? '100%' : '0%'}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                      initial={{ width: 0 }}
                      animate={{ width: status === 'processing' ? '68%' : status === 'success' ? '100%' : '0%' }}
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-600">
                    <div className="flex items-center gap-2">
                       <Clock size={12} /> Tiempo: 00:00:12
                    </div>
                    <div className="flex items-center gap-2">
                       ETA: 00:00:06
                    </div>
                  </div>
                </div>

                {/* Log Terminal */}
                <div className="mt-8 bg-black/60 rounded-xl border border-gray-800 p-4 font-mono text-[11px] h-32 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${log.includes('error') || log.includes('CRÍTICO') ? 'text-red-400' : log.includes('[vaapi]') ? 'text-blue-400' : 'text-gray-400'}`}>
                      {log}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>

            {/* Target Settings */}
            <div className="bg-gray-900/20 rounded-2xl border border-gray-800 p-8">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Optimización de destino</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Resolución', value: '720p (1280:-2)', icon: Activity },
                  { label: 'Códec', value: 'h264_vaapi', icon: Cpu },
                  { label: 'Audio', value: 'AAC 128k', icon: Gauge },
                  { label: 'Flags', value: '+faststart', icon: Zap }
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

              <div className="mt-8">
                <button 
                  onClick={handleUpload}
                  disabled={!file || status === 'uploading' || status === 'processing'}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                    ${!file || status === 'processing' ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700' : 
                      'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border border-blue-400/30'}`}
                >
                  {status === 'success' ? <><Save size={18} /> Procesar otro</> : <><Zap size={18} /> Optimizar para RRSS</>}
                </button>
              </div>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-8">
            <div className="bg-gray-900/40 rounded-2xl border border-gray-800 p-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Optimizaciones recientes</h4>
                <div className="text-[10px] text-gray-600 flex items-center gap-1">
                  Historial <Clock size={10} />
                </div>
              </div>
              
              <div className="space-y-4">
                {history.map(item => (
                  <div key={item.id} className="group bg-gray-800/20 border border-gray-800 hover:border-gray-700 p-4 rounded-xl transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-tighter">
                            {item.size} • {item.speed}
                          </p>
                        </div>
                      </div>
                      <button className="opacity-40 group-hover:opacity-100 p-2 hover:bg-gray-700 rounded-lg transition-all text-gray-400">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
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
                Optimizado para WSL2. La aceleración por GPU evita cuellos de botella de CPU al mapear los drivers DRI del host en contenedores Linux. 
                <br /><br />
                Códec objetivo: <code className="bg-black/40 px-1 rounded text-blue-300">h264_vaapi</code>
              </p>
            </div>
          </aside>
        </div>

        {/* System Info Bar */}
        <footer className="mt-16 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-800 pt-8 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex gap-6 text-[9px] font-mono uppercase tracking-widest ">
            <span className="flex items-center gap-2">IP: 172.18.0.1 (WSL)</span>
            <span className="flex items-center gap-2">VA-API: 1.14</span>
            <span className="flex items-center gap-2">Carga CPU: 4%</span>
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-right">
            Solo para amigos íntimos. No compartas el enlace.
          </div>
        </footer>
      </div>
    </div>
  );
}


