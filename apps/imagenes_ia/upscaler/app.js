const { useState, useEffect, useRef } = React;

// =============================================================================
// CONFIGURACIÓN DE MODELOS ESRGAN
// =============================================================================
// Los modelos ESRGAN son redes neuronales de super-resolución REALES
// que generan píxeles de alta frecuencia a partir de la imagen original.
// NO son modelos generativos - NO reimaginan ni inventan contenido.
// Son entrenados específicamente para upscaling fiel.

const MODEL_OPTIONS = [
    {
        id: 'slim-2x',
        name: 'ESRGAN Slim 2x',
        description: 'Rápido. Modelo ligero (~900KB). Buena calidad, ideal para pruebas rápidas.',
        scale: 2,
        getModel: () => ESRGANSlim2x,
        globalName: 'ESRGANSlim2x'
    },
    {
        id: 'slim-4x',
        name: 'ESRGAN Slim 4x',
        description: 'Rápido. 4x con modelo ligero. Buenos resultados generales.',
        scale: 4,
        getModel: () => ESRGANSlim4x,
        globalName: 'ESRGANSlim4x'
    },
    {
        id: 'medium-2x',
        name: 'ESRGAN Medium 2x',
        description: 'Equilibrado. Modelo de 2.7MB. Mejor detalle en texturas y bordes.',
        scale: 2,
        getModel: () => ESRGANMedium2x,
        globalName: 'ESRGANMedium2x'
    },
    {
        id: 'medium-4x',
        name: 'ESRGAN Medium 4x',
        description: 'Mejor calidad. 4x con modelo medio. Excelente para fotos e impresión.',
        scale: 4,
        getModel: () => ESRGANMedium4x,
        globalName: 'ESRGANMedium4x'
    }
];

const DINA4_LONG = 7016;   // 297mm @ 600dpi
const DINA4_SHORT = 4960;  // 210mm @ 600dpi

// =============================================================================
// DATABASE (IndexedDB)
// =============================================================================

const DB_NAME = 'upscaler_standalone_db';
const STORE_NAME = 'history';
let dbInstance = null;

const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => { dbInstance = request.result; resolve(dbInstance); };
    request.onerror = () => reject(request.error);
});

const saveToDb = async (item) => {
    if (!dbInstance) await openDb();
    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getAllFromDb = async () => {
    if (!dbInstance) await openDb();
    return new Promise((resolve) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    });
};

const deleteFromDb = async (id) => {
    if (!dbInstance) await openDb();
    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

// =============================================================================
// DPI INJECTOR (cabecera JFIF binaria → 600 DPI)
// =============================================================================

const inject600Dpi = (base64DataUrl) => {
    try {
        const parts = base64DataUrl.split(',');
        const binaryString = atob(parts[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF && bytes[3] === 0xE0) {
            bytes[13] = 1;    // Unidades: Pulgadas
            bytes[14] = 0x02; bytes[15] = 0x58; // X density = 600
            bytes[16] = 0x02; bytes[17] = 0x58; // Y density = 600
        }

        const blob = new Blob([bytes], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.warn('Error inyectando DPI:', e);
        return base64DataUrl;
    }
};

// =============================================================================
// UTILIDADES DE IMAGEN
// =============================================================================

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

// Escalar canvas en múltiples pasos de 2x para mejor interpolación
const canvasMultiStepScale = (sourceCanvas, targetW, targetH) => {
    let current = sourceCanvas;
    let cw = sourceCanvas.width;
    let ch = sourceCanvas.height;

    while (cw < targetW || ch < targetH) {
        const nw = Math.min(cw * 2, targetW);
        const nh = Math.min(ch * 2, targetH);
        const step = document.createElement('canvas');
        step.width = nw;
        step.height = nh;
        const ctx = step.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(current, 0, 0, nw, nh);
        current = step;
        cw = nw;
        ch = nh;
    }
    return current;
};

// =============================================================================
// PIPELINE DE UPSCALING CON ESRGAN
// =============================================================================

const runUpscale = async (sourceDataUrl, modelOption, useDinA4, onProgress, onStatus) => {
    const sourceImg = await loadImage(sourceDataUrl);
    const srcW = sourceImg.width;
    const srcH = sourceImg.height;
    const esrganScale = modelOption.scale; // 2 o 4

    // Dimensiones tras ESRGAN
    const esrganW = srcW * esrganScale;
    const esrganH = srcH * esrganScale;

    // Dimensiones objetivo finales
    let targetW, targetH;
    if (useDinA4) {
        const isLandscape = srcW > srcH;
        targetW = isLandscape ? DINA4_LONG : DINA4_SHORT;
        targetH = isLandscape ? DINA4_SHORT : DINA4_LONG;
    } else {
        targetW = esrganW;
        targetH = esrganH;
    }

    onStatus('Cargando modelo ESRGAN...');
    onProgress(5);

    // Crear upscaler con el modelo seleccionado
    const modelDef = modelOption.getModel();
    const upscaler = new Upscaler({ model: modelDef });

    onStatus('Modelo cargado. Procesando super-resolución...');
    onProgress(10);

    // Ejecutar ESRGAN sobre la imagen original
    // patchSize y padding para procesar por parches (evita OOM en imágenes grandes)
    const upscaledSrc = await upscaler.upscale(sourceDataUrl, {
        patchSize: 128,
        padding: 6,
        progress: (pct) => {
            const progressPct = 10 + Math.round(pct * 75);
            onProgress(progressPct);
            onStatus(`Super-resolución ESRGAN: ${Math.round(pct * 100)}%`);
        }
    });

    onProgress(85);
    onStatus('Super-resolución completada. Ajustando tamaño final...');

    // Si las dimensiones ESRGAN coinciden con el objetivo, ya está
    // Si no (DIN A4), escalar con Canvas de alta calidad
    let finalDataUrl;

    if (targetW === esrganW && targetH === esrganH) {
        finalDataUrl = upscaledSrc;
    } else {
        // Necesitamos re-escalar al tamaño DIN A4
        onStatus(`Ajustando a ${targetW}x${targetH} (DIN A4 600dpi)...`);
        const esrganImg = await loadImage(upscaledSrc);
        const esrganCanvas = document.createElement('canvas');
        esrganCanvas.width = esrganImg.width;
        esrganCanvas.height = esrganImg.height;
        esrganCanvas.getContext('2d').drawImage(esrganImg, 0, 0);

        const finalCanvas = canvasMultiStepScale(esrganCanvas, targetW, targetH);

        // Si el canvas resultante es más grande que el objetivo, recortar
        if (finalCanvas.width !== targetW || finalCanvas.height !== targetH) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = targetW;
            cropCanvas.height = targetH;
            const ctx = cropCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(finalCanvas, 0, 0, targetW, targetH);
            finalDataUrl = cropCanvas.toDataURL('image/jpeg', 0.95);
        } else {
            finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
        }
    }

    onProgress(95);
    onStatus('Finalizando...');

    // Limpiar modelo
    await upscaler.dispose();

    onProgress(100);
    return { dataUrl: finalDataUrl, width: targetW, height: targetH };
};

// =============================================================================
// COMPONENTES UI
// =============================================================================

const LoadingOverlay = ({ progress, status }) => (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-slate-950/90 backdrop-blur-xl">
        <div className="spinner-triple">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
        </div>
        <div className="flex flex-col items-center gap-3 px-8 max-w-md">
            <div className="text-cyan-400 font-bold tracking-[0.3em] uppercase text-[10px] animate-pulse text-center">
                {status || 'Procesando...'}
            </div>
            <div className="text-6xl font-black gradient-text font-montserrat">{progress}%</div>
            <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    </div>
);

const App = () => {
    const [source, setSource] = useState(null);
    const [sourceInfo, setSourceInfo] = useState(null);
    const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[3]); // medium-4x por defecto
    const [isDinA4, setIsDinA4] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [modelsReady, setModelsReady] = useState(false);
    const fileInputRef = useRef(null);

    // Inicializar DB e historial (filtrar entradas corruptas sin imagen válida)
    useEffect(() => {
        openDb().then(() => getAllFromDb().then(items => {
            const valid = items.filter(item => item.dataUrl && item.dataUrl.startsWith('data:'));
            setHistory(valid);
        })).catch(console.warn);
    }, []);

    // Verificar que los modelos están cargados (globals de los scripts CDN)
    useEffect(() => {
        const check = () => {
            if (typeof Upscaler !== 'undefined' &&
                typeof ESRGANSlim2x !== 'undefined' &&
                typeof ESRGANSlim4x !== 'undefined' &&
                typeof ESRGANMedium2x !== 'undefined' &&
                typeof ESRGANMedium4x !== 'undefined') {
                setModelsReady(true);
            } else {
                setTimeout(check, 200);
            }
        };
        check();
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(null);
        const reader = new FileReader();
        reader.onload = (f) => {
            const dataUrl = f.target.result;
            setSource(dataUrl);
            const img = new Image();
            img.onload = () => {
                setSourceInfo({ width: img.width, height: img.height, name: file.name, size: file.size });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleUpscale = async () => {
        if (!source || !modelsReady) return;
        setIsProcessing(true);
        setProgress(0);
        setStatus('Iniciando...');
        setError(null);

        try {
            const result = await runUpscale(
                source,
                selectedModel,
                isDinA4,
                setProgress,
                setStatus
            );

            const sizeLabel = `${result.width}x${result.height} (600 DPI)`;
            const newItem = {
                id: Date.now().toString(),
                dataUrl: result.dataUrl,
                name: selectedModel.name + (isDinA4 ? ' → DIN A4' : ''),
                size: sizeLabel,
                createdAt: Date.now()
            };

            await saveToDb(newItem);
            setHistory(prev => [newItem, ...prev]);
            setSource(null);
            setSourceInfo(null);

        } catch (e) {
            console.error('Error en upscaling:', e);
            setError('Error: ' + e.message);
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setStatus('');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Borrar esta imagen del historial?')) return;
        await deleteFromDb(id);
        setHistory(prev => prev.filter(h => h.id !== id));
    };

    const getTargetDimensions = () => {
        if (!sourceInfo) return null;
        if (isDinA4) {
            const isLandscape = sourceInfo.width > sourceInfo.height;
            return {
                width: isLandscape ? DINA4_LONG : DINA4_SHORT,
                height: isLandscape ? DINA4_SHORT : DINA4_LONG
            };
        }
        return {
            width: sourceInfo.width * selectedModel.scale,
            height: sourceInfo.height * selectedModel.scale
        };
    };

    const targetDims = getTargetDimensions();

    return (
        <div className="flex flex-col lg:flex-row min-h-screen">
            {isProcessing && <LoadingOverlay progress={progress} status={status} />}

            {/* SIDEBAR */}
            <aside className="lg:w-[480px] glass border-r border-white/10 p-10 space-y-8 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl">
                        <i className="fa-solid fa-expand"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold uppercase font-montserrat tracking-tight">Upscaler Pro</h1>
                        <p className="text-[9px] font-bold text-cyan-500/60 uppercase tracking-widest">ESRGAN Super-Resolución Real</p>
                    </div>
                </div>

                {/* Estado del modelo */}
                {!modelsReady && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-pulse">
                        <p className="text-[10px] text-amber-300">
                            <i className="fa-solid fa-circle-notch fa-spin mr-1"></i>
                            Cargando modelos ESRGAN desde CDN...
                        </p>
                    </div>
                )}

                {/* Upload */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] ml-2">Imagen Original</label>
                    <div
                        onClick={() => fileInputRef.current.click()}
                        className="image-field-container glass border-2 border-dashed border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all relative"
                    >
                        {source ? (
                            <img src={source} className="object-contain w-full h-full" alt="Original" />
                        ) : (
                            <div className="text-center opacity-40">
                                <i className="fa-solid fa-cloud-arrow-up text-2xl text-cyan-400 mb-2"></i>
                                <span className="block text-[9px] font-bold uppercase">Click para subir</span>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    {sourceInfo && (
                        <div className="text-[10px] text-gray-400 text-center space-x-3">
                            <span>{sourceInfo.width}x{sourceInfo.height} px</span>
                            <span>{(sourceInfo.size / 1024).toFixed(0)} KB</span>
                        </div>
                    )}
                </div>

                {/* Model Selection */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] ml-2">Modelo ESRGAN</label>
                    {MODEL_OPTIONS.map(model => (
                        <button
                            key={model.id}
                            onClick={() => setSelectedModel(model)}
                            className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                selectedModel.id === model.id
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${
                                    selectedModel.id === model.id ? 'text-cyan-400' : 'text-gray-400'
                                }`}>
                                    {model.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                        selectedModel.id === model.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-600'
                                    }`}>
                                        {model.scale}x
                                    </span>
                                    {selectedModel.id === model.id && <i className="fa-solid fa-check text-cyan-400 text-xs"></i>}
                                </div>
                            </div>
                            <p className={`text-[10px] leading-relaxed ${
                                selectedModel.id === model.id ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                                {model.description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* DIN A4 Toggle */}
                <div className="space-y-4">
                    <button
                        onClick={() => setIsDinA4(!isDinA4)}
                        className={`w-full p-5 rounded-[2rem] border flex items-center justify-between transition-all ${
                            isDinA4
                                ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                                : 'border-white/5 bg-white/5 text-gray-600'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-print text-lg"></i>
                            <div className="text-left">
                                <span className="block text-[10px] font-black uppercase leading-none">Formato DIN A4</span>
                                <span className="text-[8px] opacity-50 uppercase font-bold">Ajustar a 600 DPI para impresión</span>
                            </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative ${isDinA4 ? 'bg-purple-500' : 'bg-slate-800'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isDinA4 ? 'right-1' : 'left-1'}`} />
                        </div>
                    </button>

                    {/* Dimensiones resultado */}
                    {targetDims && (
                        <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[10px] text-gray-500 block mb-1">Resultado esperado</span>
                            <span className="text-sm font-bold text-white">{targetDims.width} x {targetDims.height} px</span>
                            <span className="text-[9px] text-gray-500 ml-2">(600 DPI)</span>
                        </div>
                    )}
                </div>

                {/* Action */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-300 leading-relaxed">
                            <i className="fa-solid fa-microchip mr-1"></i>
                            ESRGAN es un modelo de super-resolución real (no generativo).
                            Preserva fielmente el contenido original mientras añade detalle real.
                            Se ejecuta en tu GPU vía WebGL.
                        </p>
                    </div>

                    <button
                        onClick={handleUpscale}
                        disabled={!source || isProcessing || !modelsReady}
                        className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl disabled:opacity-20 uppercase text-[11px] tracking-widest font-montserrat btn-hover-effect"
                    >
                        <i className={isProcessing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bolt'}></i>
                        {isProcessing ? 'Procesando...' : 'Iniciar Super-Resolución'}
                    </button>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-[10px] font-bold">{error}</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT - Historial */}
            <main className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="flex items-center justify-between border-b border-white/5 pb-8">
                        <h2 className="text-3xl font-black tracking-tight font-montserrat uppercase gradient-text">
                            Historial
                        </h2>
                        <div className="px-4 py-1 glass rounded-full text-[9px] font-bold text-gray-500 uppercase">
                            {history.length} resultado{history.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {history.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                            <i className="fa-solid fa-images text-4xl mb-4 opacity-20"></i>
                            <p className="text-sm font-medium">Aún no hay imágenes escaladas</p>
                            <p className="text-[10px] text-gray-700 mt-1">Sube una imagen y haz click en Iniciar Super-Resolución</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                        {history.map(item => (
                            <div key={item.id} className="group relative glass overflow-hidden transition-all shadow-2xl bg-slate-900/40 border-white/5 hover:border-cyan-500/30">
                                <img
                                    src={item.dataUrl}
                                    className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
                                    alt={item.name}
                                />
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 backdrop-blur-sm">
                                    <button
                                        onClick={() => {
                                            const dpiUrl = inject600Dpi(item.dataUrl);
                                            const a = document.createElement('a');
                                            a.href = dpiUrl;
                                            a.download = `upscale-600dpi-${item.id}.jpg`;
                                            a.click();
                                            setTimeout(() => URL.revokeObjectURL(dpiUrl), 5000);
                                        }}
                                        className="w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                                    >
                                        <i className="fa-solid fa-download text-black text-xl"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                    >
                                        <i className="fa-solid fa-trash text-xl"></i>
                                    </button>
                                </div>
                                <div className="p-6 bg-slate-900/80">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-cyan-400 uppercase">{item.name}</span>
                                        <span className="text-[9px] font-bold text-gray-500">{item.size}</span>
                                    </div>
                                    <div className="text-[8px] font-bold text-gray-600 uppercase">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
