const { useState, useEffect, useRef, useCallback } = React;
const { createRoot } = ReactDOM;

// Iconos SVG inline (reemplazo de lucide-react)
const Icon = ({ size, children }) => React.createElement('svg', {
    width: size || 24, height: size || 24, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'inline-block', verticalAlign: 'middle' }
}, children);

const Upload = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
    React.createElement('polyline', { points: '17 8 12 3 7 8' }),
    React.createElement('line', { x1: 12, y1: 3, x2: 12, y2: 15 })
);
const Wand2 = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'm21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72' }),
    React.createElement('path', { d: 'm14 7 3 3' }),
    React.createElement('path', { d: 'M5 6v4' }),
    React.createElement('path', { d: 'M19 14v4' }),
    React.createElement('path', { d: 'M10 2v2' }),
    React.createElement('path', { d: 'M7 8H3' }),
    React.createElement('path', { d: 'M21 16h-4' }),
    React.createElement('path', { d: 'M11 3H9' })
);
const Download = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
    React.createElement('polyline', { points: '7 10 12 15 17 10' }),
    React.createElement('line', { x1: 12, y1: 15, x2: 12, y2: 3 })
);
const Trash2 = ({ size }) => React.createElement(Icon, { size },
    React.createElement('polyline', { points: '3 6 5 6 21 6' }),
    React.createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
    React.createElement('line', { x1: 10, y1: 11, x2: 10, y2: 17 }),
    React.createElement('line', { x1: 14, y1: 11, x2: 14, y2: 17 })
);
const Image = ({ size }) => React.createElement(Icon, { size },
    React.createElement('rect', { width: 18, height: 18, x: 3, y: 3, rx: 2, ry: 2 }),
    React.createElement('circle', { cx: 9, cy: 9, r: 2 }),
    React.createElement('path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' })
);
const Loader2 = ({ size }) => React.createElement(Icon, { size, className: 'animate-spin' },
    React.createElement('path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' })
);
const Eye = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }),
    React.createElement('circle', { cx: 12, cy: 12, r: 3 })
);
const History = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'M3 3v5h5' }),
    React.createElement('path', { d: 'M3.05 13A9 9 0 1 0 6 5.3L3 8' }),
    React.createElement('path', { d: 'M12 7v5l4 2' })
);
const Sparkles = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' }),
    React.createElement('path', { d: 'M5 3v4' }),
    React.createElement('path', { d: 'M19 17v4' }),
    React.createElement('path', { d: 'M3 5h4' }),
    React.createElement('path', { d: 'M17 19h4' })
);
const X = ({ size }) => React.createElement(Icon, { size },
    React.createElement('path', { d: 'M18 6 6 18' }),
    React.createElement('path', { d: 'm6 6 12 12' })
);

const STORAGE_KEY = 'illusion_diffusion_history';

function App() {
    // Estado principal
    const [containerImage, setContainerImage] = useState(null);
    const [contentImage, setContentImage] = useState(null);
    const [containerOpacity, setContainerOpacity] = useState(50);
    const [contentOpacity, setContentOpacity] = useState(50);
    const [containerBW, setContainerBW] = useState(false);
    const [contentBW, setContentBW] = useState(false);
    const [contentPos, setContentPos] = useState({ x: 0, y: 0 });
    const [contentScale, setContentScale] = useState(1); // NUEVO: escala del contenido
    const [isDragging, setIsDragging] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);
    const [mouseStartPos, setMouseStartPos] = useState({ x: 0, y: 0 });
    const dragMovedRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const [history, setHistory] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewerImage, setViewerImage] = useState(null);
    const [canvasViewerImage, setCanvasViewerImage] = useState(null);

    const canvasRef = useRef(null);
    const containerInputRef = useRef(null);
    const contentInputRef = useRef(null);

    // Cargar historial desde localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setHistory(parsed);
                }
            }
        } catch (e) {
            console.warn('Error cargando historial:', e);
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.warn('Error guardando historial:', e);
        }
    }, [history]);

    // Convertir imagen a blanco y negro
    const applyGrayscale = useCallback((imageData) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
        return imageData;
    }, []);

    // Renderizar preview en canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !containerImage || !contentImage) return;

        const ctx = canvas.getContext('2d');
        const containerImg = new window.Image();
        const contentImg = new window.Image();
        let loadedCount = 0;

        const onLoad = () => {
            loadedCount++;
            if (loadedCount < 2) return;

            const width = containerImg.naturalWidth;
            const height = containerImg.naturalHeight;
            canvas.width = width;
            canvas.height = height;

            // 1. Fondo blanco
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            // 2. Analizar contenedor para crear máscara
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(containerImg, 0, 0, width, height);

            // Aplicar B/N al contenedor si está activo
            if (containerBW) {
                const containerData = tempCtx.getImageData(0, 0, width, height);
                applyGrayscale(containerData);
                tempCtx.putImageData(containerData, 0, 0);
            }

            // Obtener datos de la imagen original (con transparencia si la hay)
            const originalCanvas = document.createElement('canvas');
            originalCanvas.width = width;
            originalCanvas.height = height;
            const originalCtx = originalCanvas.getContext('2d');
            originalCtx.drawImage(containerImg, 0, 0, width, height);
            const originalImageData = originalCtx.getImageData(0, 0, width, height);
            const originalData = originalImageData.data;

            const imageData = tempCtx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Crear máscara adaptativa
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext('2d');
            const maskData = maskCtx.createImageData(width, height);

            const ALPHA_SOLID = 250;
            let transparentCount = 0;
            const totalPixels = width * height;
            for (let i = 3; i < originalData.length; i += 4) {
                if (originalData[i] < ALPHA_SOLID) transparentCount++;
            }
            const transparencyRatio = transparentCount / totalPixels;
            const hasSignificantTransparency = transparencyRatio > 0.01;

            const ALPHA_THRESHOLD = 10;
            const WHITE_THRESHOLD = 250;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = originalData[i + 3];

                const brightness = (r + g + b) / 3;

                let isInSilhouette;
                if (hasSignificantTransparency) {
                    isInSilhouette = a > ALPHA_THRESHOLD;
                } else {
                    isInSilhouette = brightness < WHITE_THRESHOLD;
                }

                maskData.data[i] = 0;
                maskData.data[i + 1] = 0;
                maskData.data[i + 2] = 0;
                maskData.data[i + 3] = isInSilhouette ? 255 : 0;
            }
            maskCtx.putImageData(maskData, 0, 0);

            // 3. Preparar contenido
            const contentCanvas = document.createElement('canvas');
            contentCanvas.width = width;
            contentCanvas.height = height;
            const contentCtx = contentCanvas.getContext('2d');

            // Escalar contenido para cubrir canvas CON ZOOM
            const scaleX = width / contentImg.naturalWidth;
            const scaleY = height / contentImg.naturalHeight;
            const baseScale = Math.max(scaleX, scaleY);
            const scale = baseScale * contentScale; // Aplicar zoom
            const scaledWidth = contentImg.naturalWidth * scale;
            const scaledHeight = contentImg.naturalHeight * scale;
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;

            contentCtx.drawImage(contentImg, offsetX + contentPos.x, offsetY + contentPos.y, scaledWidth, scaledHeight);

            // Aplicar B/N al contenido si está activo
            if (contentBW) {
                const contentData = contentCtx.getImageData(0, 0, width, height);
                applyGrayscale(contentData);
                contentCtx.putImageData(contentData, 0, 0);
            }

            // Aplicar máscara al contenido
            contentCtx.globalCompositeOperation = 'destination-in';
            contentCtx.drawImage(maskCanvas, 0, 0);

            // 4. Dibujar contenido con opacidad
            ctx.save();
            ctx.globalAlpha = contentOpacity / 100;
            ctx.drawImage(contentCanvas, 0, 0);
            ctx.restore();

            // 5. Superponer contenedor con opacidad
            const containerCanvas = document.createElement('canvas');
            containerCanvas.width = width;
            containerCanvas.height = height;
            const containerCtx = containerCanvas.getContext('2d');
            containerCtx.drawImage(tempCanvas, 0, 0);
            containerCtx.globalCompositeOperation = 'destination-in';
            containerCtx.drawImage(maskCanvas, 0, 0);

            ctx.save();
            ctx.globalAlpha = containerOpacity / 100;
            ctx.drawImage(containerCanvas, 0, 0);
            ctx.restore();
        };

        containerImg.onload = onLoad;
        contentImg.onload = onLoad;
        containerImg.src = containerImage;
        contentImg.src = contentImage;
    }, [containerImage, contentImage, containerOpacity, contentOpacity, containerBW, contentBW, contentPos, contentScale, applyGrayscale]);

    // Actualizar canvas cuando cambian los parámetros
    useEffect(() => {
        renderCanvas();
    }, [renderCanvas]);

    // Handlers para arrastrar imagen de contenido
    const handleMouseDown = (e) => {
        if (!containerImage || !contentImage) return;
        setIsDragging(true);
        setHasMoved(false);
        dragMovedRef.current = false;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setMouseStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - mouseStartPos.x;
        const dy = e.clientY - mouseStartPos.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            setHasMoved(true);
            dragMovedRef.current = true;
        }
        setContentPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setMouseStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e) => {
        if (e && dragStartRef.current) {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                dragMovedRef.current = true;
            }
        }
        setIsDragging(false);
    };

    // NUEVO: Handler para zoom con rueda del ratón
    const handleWheel = (e) => {
        if (!containerImage || !contentImage) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setContentScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    // Manejar subida de imagen
    const handleImageUpload = (e, setImage) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImage(ev.target.result);
                if (setImage === setContentImage) {
                    setContentPos({ x: 0, y: 0 });
                    setContentScale(1); // Resetear zoom
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Generar y añadir al historial
    const handleGenerate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsGenerating(true);

        setTimeout(() => {
            try {
                const imageData = canvas.toDataURL('image/png');
                const newItem = {
                    id: `illusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    data: imageData,
                    createdAt: Date.now(),
                    containerOpacity: containerOpacity,
                    contentOpacity: contentOpacity,
                    containerBW: containerBW,
                    contentBW: contentBW
                };
                setHistory(prev => [newItem, ...prev]);
            } catch (e) {
                console.error('Error generando imagen:', e);
                alert('Error al generar la imagen');
            } finally {
                setIsGenerating(false);
            }
        }, 300);
    };

    // Descargar imagen
    const downloadImage = (dataUrl, filename) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename || `illusion_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Eliminar del historial
    const removeFromHistory = (id) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    // Limpiar todo el historial
    const clearHistory = () => {
        if (confirm('¿Eliminar todas las imágenes del historial?')) {
            setHistory([]);
        }
    };

    const canGenerate = containerImage && contentImage;

    return (
        <div className="app-layout">
            {/* Main Content */}
            <div className="app-main">
                {/* Header */}
                <header className="app-header">
                    <h1 className="gradient-text">✨ Illusion Diffusion</h1>
                    <p>Crea efectos de doble exposición con control total de transparencia</p>
                </header>

                {/* Images Grid: Container | Preview | Content */}
                <div className="images-grid">
                    {/* Container Image */}
                    <div
                        className={`upload-area glass ${containerImage ? 'has-image' : ''}`}
                        onClick={() => containerInputRef.current?.click()}
                    >
                        {containerImage ? (
                            <>
                                <img src={containerImage} alt="Contenedor" />
                                <button
                                    className="remove-btn"
                                    onClick={(e) => { e.stopPropagation(); setContainerImage(null); }}
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Upload className="upload-icon" size={40} />
                                <span className="upload-text">Contenedor</span>
                                <span className="upload-hint">Silueta</span>
                            </>
                        )}
                        <input
                            ref={containerInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleImageUpload(e, setContainerImage)}
                        />
                    </div>

                    {/* Preview */}
                    <div className="preview-section glass">
                        <h3><Eye size={18} /> Vista Previa <span className="zoom-indicator">🔍 {Math.round(contentScale * 100)}%</span></h3>
                        <div className="preview-canvas-container">
                            {canGenerate ? (
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onWheel={handleWheel}
                                    onClick={(e) => {
                                        if (dragMovedRef.current) {
                                            dragMovedRef.current = false;
                                            return;
                                        }
                                        if (!hasMoved && canvasRef.current) {
                                            setCanvasViewerImage(canvasRef.current.toDataURL());
                                        }
                                    }}
                                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                                />
                            ) : (
                                <div className="no-preview">
                                    <Sparkles size={40} style={{ opacity: 0.4, marginBottom: 8 }} />
                                    <p>Sube ambas imágenes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Image */}
                    <div
                        className={`upload-area glass ${contentImage ? 'has-image' : ''}`}
                        onClick={() => contentInputRef.current?.click()}
                    >
                        {contentImage ? (
                            <>
                                <img src={contentImage} alt="Contenido" />
                                <button
                                    className="remove-btn"
                                    onClick={(e) => { e.stopPropagation(); setContentImage(null); setContentPos({ x: 0, y: 0 }); setContentScale(1); }}
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Image className="upload-icon" size={40} />
                                <span className="upload-text">Contenido</span>
                                <span className="upload-hint">Interior</span>
                            </>
                        )}
                        <input
                            ref={contentInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleImageUpload(e, setContentImage)}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="controls-section glass">
                    <div className="sliders-row">
                        <div className="control-group">
                            <div className="control-label">
                                <span>🎭 Opacidad Contenedor</span>
                                <span className="label-badge">{containerOpacity}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={containerOpacity}
                                onChange={(e) => setContainerOpacity(parseInt(e.target.value))}
                            />
                        </div>

                        <div className="control-group">
                            <div className="control-label">
                                <span>🖼️ Opacidad Contenido</span>
                                <span className="label-badge">{contentOpacity}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={contentOpacity}
                                onChange={(e) => setContentOpacity(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="checkbox-row">
                        <div className="checkbox-item">
                            <input
                                type="checkbox"
                                id="containerBW"
                                checked={containerBW}
                                onChange={(e) => setContainerBW(e.target.checked)}
                            />
                            <label htmlFor="containerBW">🎭 Contenedor en Blanco y Negro</label>
                        </div>
                        <div className="checkbox-item">
                            <input
                                type="checkbox"
                                id="contentBW"
                                checked={contentBW}
                                onChange={(e) => setContentBW(e.target.checked)}
                            />
                            <label htmlFor="contentBW">🖼️ Contenido en Blanco y Negro</label>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="animate-spin" size={24} />
                            PROCESANDO...
                        </>
                    ) : (
                        <>
                            <Wand2 size={24} />
                            GENERAR ILLUSION
                        </>
                    )}
                </button>
            </div>

            {/* Sidebar History */}
            <aside className="history-sidebar glass">
                <div className="history-header">
                    <h3><History size={18} /> Historial ({history.length})</h3>
                </div>

                <div className="history-scroll">
                    {history.length > 0 ? (
                        <>
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="history-item"
                                    onClick={() => setViewerImage(item.data)}
                                >
                                    <img src={item.data} alt="Generada" />
                                    <div className="item-config">
                                        <span>🎭{item.containerOpacity ?? 50}%{item.containerBW ? ' B/N' : ''}</span>
                                        <span>🖼️{item.contentOpacity ?? 50}%{item.contentBW ? ' B/N' : ''}</span>
                                    </div>
                                    <div className="item-actions">
                                        <button
                                            className="action-btn download-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                downloadImage(item.data, `illusion_${item.id}.png`);
                                            }}
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromHistory(item.id);
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="empty-history">
                            <Sparkles size={32} style={{ opacity: 0.4 }} />
                            <p>Sin imágenes</p>
                        </div>
                    )}
                </div>

                {history.length > 0 && (
                    <button className="clear-history-btn" onClick={clearHistory}>
                        <Trash2 size={14} />
                        Limpiar todo
                    </button>
                )}
            </aside>

            {/* Image Viewer Modal */}
            {viewerImage && (
                <div className="image-viewer zoom-in-cursor" onClick={() => setViewerImage(null)}>
                    <img src={viewerImage} alt="Vista completa" />
                </div>
            )}

            {/* Canvas Viewer Modal */}
            {canvasViewerImage && (
                <div className="image-viewer zoom-out-cursor" onClick={() => setCanvasViewerImage(null)}>
                    <img src={canvasViewerImage} alt="Vista Previa Ampliada" />
                </div>
            )}
        </div>
    );
}

// Mount React App
const root = createRoot(document.getElementById('root'));
root.render(<App />);
