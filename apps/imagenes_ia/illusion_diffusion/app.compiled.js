const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;
const {
  createRoot
} = ReactDOM;

// Iconos SVG inline (reemplazo de lucide-react)
const Icon = ({
  size,
  children
}) => React.createElement('svg', {
  width: size || 24,
  height: size || 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
  style: {
    display: 'inline-block',
    verticalAlign: 'middle'
  }
}, children);
const Upload = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'
}), React.createElement('polyline', {
  points: '17 8 12 3 7 8'
}), React.createElement('line', {
  x1: 12,
  y1: 3,
  x2: 12,
  y2: 15
}));
const Wand2 = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'm21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72'
}), React.createElement('path', {
  d: 'm14 7 3 3'
}), React.createElement('path', {
  d: 'M5 6v4'
}), React.createElement('path', {
  d: 'M19 14v4'
}), React.createElement('path', {
  d: 'M10 2v2'
}), React.createElement('path', {
  d: 'M7 8H3'
}), React.createElement('path', {
  d: 'M21 16h-4'
}), React.createElement('path', {
  d: 'M11 3H9'
}));
const Download = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'
}), React.createElement('polyline', {
  points: '7 10 12 15 17 10'
}), React.createElement('line', {
  x1: 12,
  y1: 15,
  x2: 12,
  y2: 3
}));
const Trash2 = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('polyline', {
  points: '3 6 5 6 21 6'
}), React.createElement('path', {
  d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'
}), React.createElement('line', {
  x1: 10,
  y1: 11,
  x2: 10,
  y2: 17
}), React.createElement('line', {
  x1: 14,
  y1: 11,
  x2: 14,
  y2: 17
}));
const Image = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('rect', {
  width: 18,
  height: 18,
  x: 3,
  y: 3,
  rx: 2,
  ry: 2
}), React.createElement('circle', {
  cx: 9,
  cy: 9,
  r: 2
}), React.createElement('path', {
  d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'
}));
const Loader2 = ({
  size
}) => React.createElement(Icon, {
  size,
  className: 'animate-spin'
}, React.createElement('path', {
  d: 'M21 12a9 9 0 1 1-6.219-8.56'
}));
const Eye = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'
}), React.createElement('circle', {
  cx: 12,
  cy: 12,
  r: 3
}));
const History = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M3 3v5h5'
}), React.createElement('path', {
  d: 'M3.05 13A9 9 0 1 0 6 5.3L3 8'
}), React.createElement('path', {
  d: 'M12 7v5l4 2'
}));
const Sparkles = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z'
}), React.createElement('path', {
  d: 'M5 3v4'
}), React.createElement('path', {
  d: 'M19 17v4'
}), React.createElement('path', {
  d: 'M3 5h4'
}), React.createElement('path', {
  d: 'M17 19h4'
}));
const X = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M18 6 6 18'
}), React.createElement('path', {
  d: 'm6 6 12 12'
}));
const Plus = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M5 12h14'
}), React.createElement('path', {
  d: 'M12 5v14'
}));
const Minus = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M5 12h14'
}));
const RotateCcw = ({
  size
}) => React.createElement(Icon, {
  size
}, React.createElement('path', {
  d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'
}), React.createElement('path', {
  d: 'M3 3v5h5'
}));
const STORAGE_KEY = 'illusion_diffusion_history';
const HISTORY_APP = 'illusion_diffusion';

// Instancia canónica del historial (servidor). history-manager.js expone la CLASE:
// hay que instanciarla, no existen métodos estáticos.
const historyManager = new HistoryManager(HISTORY_APP);

// El servidor devuelve la imagen como imageUrl y la configuración dentro de data.
const toHistoryItem = entry => {
  const data = entry && typeof entry.data === 'object' && entry.data ? entry.data : {};
  const created = entry && entry.createdAt ? Date.parse(entry.createdAt) : NaN;
  return {
    id: entry && entry.id ? entry.id : `illusion_${Date.now()}`,
    data: entry.imageUrl || data.dataUrl || data.url || '',
    createdAt: Number.isFinite(created) ? created : Date.now(),
    containerOpacity: Number.isFinite(data.containerOpacity) ? data.containerOpacity : 50,
    contentOpacity: Number.isFinite(data.contentOpacity) ? data.contentOpacity : 50,
    containerBW: !!data.containerBW,
    contentBW: !!data.contentBW
  };
};
function App() {
  // Estado principal
  const [containerImage, setContainerImage] = useState(null);
  const [contentImage, setContentImage] = useState(null);
  const [containerOpacity, setContainerOpacity] = useState(50);
  const [contentOpacity, setContentOpacity] = useState(50);
  const [containerBW, setContainerBW] = useState(false);
  const [contentBW, setContentBW] = useState(false);
  const [contentPos, setContentPos] = useState({
    x: 0,
    y: 0
  });
  const [contentScale, setContentScale] = useState(1); // NUEVO: escala del contenido
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [mouseStartPos, setMouseStartPos] = useState({
    x: 0,
    y: 0
  });
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({
    x: 0,
    y: 0
  });
  const [history, setHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { src, alt }
  const [toast, setToast] = useState(null); // { message, tone }
  const toastTimerRef = useRef(null);
  const lightboxCloseRef = useRef(null);
  const canvasRef = useRef(null);
  const containerInputRef = useRef(null);
  const contentInputRef = useRef(null);

  // Cargar historial desde HistoryManager (servidor) con fallback a localStorage
  useEffect(() => {
    let active = true;
    const loadLocalFallback = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && active) setHistory(parsed);
      } catch (e) {
        console.warn('Error cargando localStorage:', e);
      }
    };
    historyManager.load().then(entries => {
      if (!active) return;
      const loaded = (entries || []).map(toHistoryItem).filter(item => item.data);
      if (loaded.length > 0) {
        setHistory(loaded);
      } else {
        loadLocalFallback();
      }
    }).catch(error => {
      console.warn('Error cargando el historial del servidor:', error);
      loadLocalFallback();
    });
    return () => {
      active = false;
    };
  }, []);

  // Aviso flotante Hoola (el propio toast lleva aria-live)
  const notify = useCallback((message, tone = 'ok') => {
    setToast({
      message,
      tone
    });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // API de cierre para el módulo compartido lightbox-zoom.js
  useEffect(() => {
    window.AntigravityLightbox = {
      close: () => setLightbox(null)
    };
    return () => {
      delete window.AntigravityLightbox;
    };
  }, []);

  // El visor atrapa el foco y se cierra con Escape
  useEffect(() => {
    if (!lightbox) return undefined;
    const previousFocus = document.activeElement;
    lightboxCloseRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [lightbox]);
  const openLightbox = useCallback((src, alt) => {
    if (src) setLightbox({
      src,
      alt: alt || 'Vista ampliada'
    });
  }, []);

  // Convertir imagen a blanco y negro
  const applyGrayscale = useCallback(imageData => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
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
  const handleMouseDown = e => {
    if (!containerImage || !contentImage) return;
    setIsDragging(true);
    setHasMoved(false);
    dragMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };
    setMouseStartPos({
      x: e.clientX,
      y: e.clientY
    });
  };
  const handleMouseMove = e => {
    if (!isDragging) return;
    const dx = e.clientX - mouseStartPos.x;
    const dy = e.clientY - mouseStartPos.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      setHasMoved(true);
      dragMovedRef.current = true;
    }
    setContentPos(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    setMouseStartPos({
      x: e.clientX,
      y: e.clientY
    });
  };
  const handleMouseUp = e => {
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
  const handleWheel = e => {
    if (!containerImage || !contentImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setContentScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // Intercambiar las dos capas sin tocar sus ajustes de fusión
  const swapImages = () => {
    if (!containerImage || !contentImage) return;
    setContainerImage(contentImage);
    setContentImage(containerImage);
    setContentPos({
      x: 0,
      y: 0
    });
    notify('Capas intercambiadas');
  };

  // Volver a los ajustes de partida
  const resetAdjustments = () => {
    setContainerOpacity(50);
    setContentOpacity(50);
    setContainerBW(false);
    setContentBW(false);
    setContentPos({
      x: 0,
      y: 0
    });
    setContentScale(1);
    notify('Ajustes restablecidos');
  };
  const zoomBy = delta => {
    setContentScale(prev => Math.max(0.1, Math.min(5, Math.round((prev + delta) * 10) / 10)));
  };

  // Manejar subida de imagen
  const handleImageUpload = (e, setImage) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setImage(ev.target.result);
        if (setImage === setContentImage) {
          setContentPos({
            x: 0,
            y: 0
          });
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
        // Fuente de verdad: el servidor (history.php). Un fallo de red no debe
        // romper la generación local.
        historyManager.save({
          id: newItem.id,
          type: 'image',
          model: HISTORY_APP,
          data: {
            containerOpacity,
            contentOpacity,
            containerBW,
            contentBW
          },
          imageData: imageData,
          createdAt: new Date(newItem.createdAt).toISOString()
        }).catch(err => console.warn('Error guardando el historial en el servidor:', err));
        notify('Ilusión añadida al historial');
      } catch (e) {
        console.error('Error generando imagen:', e);
        notify('No se pudo generar la imagen', 'error');
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
  const removeFromHistory = id => {
    setHistory(prev => prev.filter(item => item.id !== id));
    historyManager.delete(id).catch(err => console.warn('Error eliminando del historial:', err));
    notify('Imagen eliminada del historial');
  };

  // Limpiar todo el historial
  const clearHistory = () => {
    if (confirm('¿Eliminar todas las imágenes del historial?')) {
      setHistory([]);
      historyManager.clear().catch(err => console.warn('Error limpiando el historial:', err));
      notify('Historial vaciado');
    }
  };
  const canGenerate = containerImage && contentImage;
  const loadedLayers = (containerImage ? 1 : 0) + (contentImage ? 1 : 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "app",
    "aria-busy": isGenerating
  }, /*#__PURE__*/React.createElement("header", {
    className: "topbar",
    role: "banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mark",
    "aria-hidden": "true"
  }, "ID"), /*#__PURE__*/React.createElement("h1", {
    className: "brand-name"
  }, "Illusion ", /*#__PURE__*/React.createElement("em", null, "Diffusion")), /*#__PURE__*/React.createElement("span", {
    className: "brand-tag",
    "aria-hidden": "true"
  }, "Hoola")), /*#__PURE__*/React.createElement("span", {
    className: "topbar-divider",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "topbar-tagline"
  }, "Doble exposici\xF3n con m\xE1scara adaptativa"), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: `status-chip ${canGenerate ? 'is-ready' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    "aria-hidden": "true"
  }), loadedLayers, "/2 capas"), /*#__PURE__*/React.createElement("span", {
    className: "doc-meta mono",
    title: "Zoom del contenido"
  }, Math.round(contentScale * 100), "%")), /*#__PURE__*/React.createElement("main", {
    className: "workspace"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "panel panel-left",
    "aria-label": "Fuentes de imagen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "Fuentes"), /*#__PURE__*/React.createElement("span", {
    className: "panel-sub mono"
  }, "02")), /*#__PURE__*/React.createElement("div", {
    className: "panel-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sources-grid"
  }, /*#__PURE__*/React.createElement("section", {
    className: "group"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "group-title"
  }, "Contenedor"), /*#__PURE__*/React.createElement("div", {
    className: `dropzone ${containerImage ? 'has-image' : ''}`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "dropzone-open",
    "aria-label": containerImage ? 'Cambiar la imagen del contenedor' : 'Subir la imagen del contenedor',
    onClick: () => containerInputRef.current?.click()
  }, containerImage ? /*#__PURE__*/React.createElement("img", {
    src: containerImage,
    alt: "Imagen del contenedor",
    draggable: "false"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "dropzone-empty"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dropzone-ico"
  }, /*#__PURE__*/React.createElement(Upload, {
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    className: "dropzone-title"
  }, "Subir silueta"), /*#__PURE__*/React.createElement("span", {
    className: "dropzone-hint"
  }, "PNG o JPG \xB7 fondo claro"))), containerImage && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "dropzone-badge"
  }, "Silueta"), /*#__PURE__*/React.createElement("button", {
    className: "remove-btn",
    type: "button",
    "aria-label": "Quitar la imagen del contenedor",
    onClick: () => setContainerImage(null)
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), /*#__PURE__*/React.createElement("input", {
    ref: containerInputRef,
    type: "file",
    accept: "image/*",
    hidden: true,
    "aria-label": "Archivo de imagen para la silueta",
    onChange: e => handleImageUpload(e, setContainerImage)
  })), /*#__PURE__*/React.createElement("p", {
    className: "field-note"
  }, "La silueta recorta el contenido: usa fondo blanco o transparente.")), /*#__PURE__*/React.createElement("section", {
    className: "group"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "group-title"
  }, "Contenido"), /*#__PURE__*/React.createElement("div", {
    className: `dropzone ${contentImage ? 'has-image' : ''}`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "dropzone-open",
    "aria-label": contentImage ? 'Cambiar la imagen de contenido' : 'Subir la imagen de contenido',
    onClick: () => contentInputRef.current?.click()
  }, contentImage ? /*#__PURE__*/React.createElement("img", {
    src: contentImage,
    alt: "Imagen de contenido",
    draggable: "false"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "dropzone-empty"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dropzone-ico"
  }, /*#__PURE__*/React.createElement(Image, {
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    className: "dropzone-title"
  }, "Subir contenido"), /*#__PURE__*/React.createElement("span", {
    className: "dropzone-hint"
  }, "PNG o JPG \xB7 imagen interior"))), contentImage && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "dropzone-badge"
  }, "Interior"), /*#__PURE__*/React.createElement("button", {
    className: "remove-btn",
    type: "button",
    "aria-label": "Quitar la imagen de contenido",
    onClick: () => {
      setContentImage(null);
      setContentPos({
        x: 0,
        y: 0
      });
      setContentScale(1);
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), /*#__PURE__*/React.createElement("input", {
    ref: contentInputRef,
    type: "file",
    accept: "image/*",
    hidden: true,
    "aria-label": "Archivo de imagen para el contenido",
    onChange: e => handleImageUpload(e, setContentImage)
  })), /*#__PURE__*/React.createElement("p", {
    className: "field-note"
  }, "La imagen que rellena la silueta. Arr\xE1strala y aj\xFAstala en el lienzo."))), /*#__PURE__*/React.createElement("div", {
    className: "btn-row panel-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    type: "button",
    onClick: swapImages,
    disabled: !canGenerate
  }, "Intercambiar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    type: "button",
    onClick: resetAdjustments
  }, "Reiniciar")))), /*#__PURE__*/React.createElement("section", {
    className: "stage",
    "aria-label": "Vista previa de la ilusi\xF3n"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stage-head"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement(Eye, {
    size: 15
  }), " Vista previa"), /*#__PURE__*/React.createElement("span", {
    className: "badge mono"
  }, Math.round(contentScale * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "canvas-area"
  }, canGenerate ? /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    role: "img",
    "aria-label": "Composici\xF3n de la ilusi\xF3n con la silueta y el contenido superpuestos",
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onWheel: handleWheel,
    onClick: () => {
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }
      if (!hasMoved && canvasRef.current) {
        openLightbox(canvasRef.current.toDataURL(), 'Ilusión a tamaño completo');
      }
    },
    style: {
      cursor: isDragging ? 'grabbing' : 'grab'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "stage-empty"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stage-empty-ico"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 30
  })), /*#__PURE__*/React.createElement("h2", null, "Empieza con dos im\xE1genes"), /*#__PURE__*/React.createElement("p", null, "Sube una silueta y el contenido que quieres ver dentro. La m\xE1scara se calcula sola."), /*#__PURE__*/React.createElement("div", {
    className: "stage-empty-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    type: "button",
    onClick: () => containerInputRef.current?.click()
  }, "Elegir silueta"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    type: "button",
    onClick: () => contentInputRef.current?.click()
  }, "Elegir contenido")))), /*#__PURE__*/React.createElement("div", {
    className: "stage-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "btn-group",
    role: "group",
    "aria-label": "Zoom del contenido"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    type: "button",
    "aria-label": "Alejar el contenido",
    onClick: () => zoomBy(-0.1),
    disabled: !canGenerate
  }, /*#__PURE__*/React.createElement(Minus, {
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    className: "zoom-value mono"
  }, Math.round(contentScale * 100), "%"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    type: "button",
    "aria-label": "Ampliar el contenido",
    onClick: () => zoomBy(0.1),
    disabled: !canGenerate
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 15
  }))), /*#__PURE__*/React.createElement("button", {
    className: "link-btn",
    type: "button",
    onClick: () => setContentScale(1),
    disabled: !canGenerate || contentScale === 1
  }, "Restablecer"), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "stage-hint"
  }, "Arrastra para mover \xB7 Rueda para zoom \xB7 Clic para ampliar"))), /*#__PURE__*/React.createElement("aside", {
    className: "panel panel-right",
    "aria-label": "Ajustes e historial"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "Ajustes"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn icon-btn-sm",
    type: "button",
    onClick: resetAdjustments,
    "aria-label": "Restablecer todos los ajustes",
    title: "Restablecer todos los ajustes"
  }, /*#__PURE__*/React.createElement(RotateCcw, {
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "panel-body"
  }, /*#__PURE__*/React.createElement("section", {
    className: "group"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "group-title"
  }, "Fusi\xF3n"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    htmlFor: "containerOpacity"
  }, "Opacidad silueta"), /*#__PURE__*/React.createElement("span", {
    className: "badge mono"
  }, containerOpacity, "%")), /*#__PURE__*/React.createElement("input", {
    id: "containerOpacity",
    type: "range",
    min: "0",
    max: "100",
    value: containerOpacity,
    onChange: e => setContainerOpacity(parseInt(e.target.value, 10)),
    style: {
      '--fill': `${containerOpacity}%`
    },
    "aria-valuetext": `${containerOpacity} por ciento`
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    htmlFor: "contentOpacity"
  }, "Opacidad contenido"), /*#__PURE__*/React.createElement("span", {
    className: "badge mono"
  }, contentOpacity, "%")), /*#__PURE__*/React.createElement("input", {
    id: "contentOpacity",
    type: "range",
    min: "0",
    max: "100",
    value: contentOpacity,
    onChange: e => setContentOpacity(parseInt(e.target.value, 10)),
    style: {
      '--fill': `${contentOpacity}%`
    },
    "aria-valuetext": `${contentOpacity} por ciento`
  })), /*#__PURE__*/React.createElement("div", {
    className: "switch-row"
  }, /*#__PURE__*/React.createElement("label", {
    className: "switch",
    htmlFor: "containerBW"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "containerBW",
    checked: containerBW,
    onChange: e => setContainerBW(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "switch-track",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, "Silueta en blanco y negro")), /*#__PURE__*/React.createElement("label", {
    className: "switch",
    htmlFor: "contentBW"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "contentBW",
    checked: contentBW,
    onChange: e => setContentBW(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "switch-track",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, "Contenido en blanco y negro")))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary btn-block",
    type: "button",
    onClick: handleGenerate,
    disabled: !canGenerate || isGenerating
  }, isGenerating ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 18
  }), "PROCESANDO...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Wand2, {
    size: 18
  }), "GENERAR ILUSI\xD3N")), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("section", {
    className: "history-block",
    "aria-label": "Historial de ilusiones"
  }, /*#__PURE__*/React.createElement("div", {
    className: "history-head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "group-title"
  }, /*#__PURE__*/React.createElement(History, {
    size: 13
  }), " Historial ", /*#__PURE__*/React.createElement("span", {
    className: "badge mono"
  }, history.length)), history.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "link-btn is-danger",
    type: "button",
    onClick: clearHistory
  }, "Limpiar")), /*#__PURE__*/React.createElement("div", {
    className: "history-scroll",
    role: "list"
  }, history.length > 0 ? history.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "history-item",
    role: "listitem"
  }, /*#__PURE__*/React.createElement("button", {
    className: "history-open",
    type: "button",
    "aria-label": "Ampliar la ilusi\xF3n generada",
    onClick: () => openLightbox(item.data, 'Ilusión generada')
  }, /*#__PURE__*/React.createElement("img", {
    src: item.data,
    alt: `Ilusión del ${new Date(item.createdAt).toLocaleDateString('es-ES')}`,
    width: "160",
    height: "213",
    loading: "lazy",
    draggable: "false"
  })), /*#__PURE__*/React.createElement("div", {
    className: "history-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "history-chip"
  }, "A ", item.containerOpacity ?? 50, "%"), /*#__PURE__*/React.createElement("span", {
    className: "history-chip"
  }, "B ", item.contentOpacity ?? 50, "%"), (item.containerBW || item.contentBW) && /*#__PURE__*/React.createElement("span", {
    className: "history-chip"
  }, "B/N")), /*#__PURE__*/React.createElement("div", {
    className: "history-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    type: "button",
    "aria-label": "Descargar esta imagen del historial",
    onClick: () => downloadImage(item.data, `${item.id}.png`)
  }, /*#__PURE__*/React.createElement(Download, {
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn is-danger",
    type: "button",
    "aria-label": "Eliminar esta imagen del historial",
    onClick: () => removeFromHistory(item.id)
  }, /*#__PURE__*/React.createElement(Trash2, {
    size: 13
  }))))) : /*#__PURE__*/React.createElement("div", {
    className: "empty-line"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20
  }), /*#__PURE__*/React.createElement("p", null, "Sin ilusiones todav\xEDa"), /*#__PURE__*/React.createElement("span", null, "Genera la primera para verla aqu\xED."))))))), /*#__PURE__*/React.createElement("footer", {
    className: "statusbar"
  }, /*#__PURE__*/React.createElement("span", {
    className: `status-item ${canGenerate ? 'is-ready' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    "aria-hidden": "true"
  }), canGenerate ? 'Listo para componer' : 'Esperando imágenes'), /*#__PURE__*/React.createElement("span", {
    className: "status-sep",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "status-item status-sources"
  }, "Silueta: ", containerImage ? 'cargada' : '—'), /*#__PURE__*/React.createElement("span", {
    className: "status-sep status-sources",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "status-item status-sources"
  }, "Contenido: ", contentImage ? 'cargado' : '—'), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono status-pos"
  }, Math.round(contentPos.x), " / ", Math.round(contentPos.y), " px"), /*#__PURE__*/React.createElement("span", {
    className: "status-sep status-pos",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "v1.1 \xB7 Hoola")), toast && /*#__PURE__*/React.createElement("div", {
    className: `toast ${toast.tone === 'error' ? 'is-error' : ''}`,
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("span", {
    className: "toast-ico",
    "aria-hidden": "true"
  }, toast.tone === 'error' ? /*#__PURE__*/React.createElement(X, {
    size: 15
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 15
  })), /*#__PURE__*/React.createElement("span", null, toast.message), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    type: "button",
    "aria-label": "Cerrar aviso",
    onClick: () => setToast(null)
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  }))), lightbox && /*#__PURE__*/React.createElement("div", {
    className: "lightbox",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": lightbox.alt,
    onClick: () => setLightbox(null)
  }, /*#__PURE__*/React.createElement("button", {
    ref: lightboxCloseRef,
    className: "lightbox-close",
    type: "button",
    "aria-label": "Cerrar el visor",
    onClick: e => {
      e.stopPropagation();
      setLightbox(null);
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 17
  })), /*#__PURE__*/React.createElement("img", {
    src: lightbox.src,
    alt: lightbox.alt,
    draggable: "false",
    onClick: e => e.stopPropagation()
  })), isGenerating && /*#__PURE__*/React.createElement("div", {
    className: "loading-overlay",
    role: "status",
    "aria-live": "polite",
    "aria-busy": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner-triple",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ring ring-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ring ring-2"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ring ring-3"
  })), /*#__PURE__*/React.createElement("p", {
    className: "loading-text"
  }, "Componiendo la ilusi\xF3n..."), /*#__PURE__*/React.createElement("p", {
    className: "loading-sub"
  }, "Recortando el contenido con la m\xE1scara de la silueta. No cierres esta pesta\xF1a."), /*#__PURE__*/React.createElement("div", {
    className: "loading-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "loading-bar",
    role: "progressbar",
    "aria-valuemin": "0",
    "aria-valuemax": "100"
  }, /*#__PURE__*/React.createElement("span", null)))));
}

// Mount React App
const root = createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));