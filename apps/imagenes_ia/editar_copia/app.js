const ReactObj = window.React || {};
const { useState, useRef, useEffect, Fragment } = ReactObj;
const ReactDOM = window.ReactDOM || {};

// --- Lucide Icon Wrapper ---
const toPascal = (kebab) => kebab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
const Icon = ({ name, size = 24, className = '', ...rest }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current || !window.lucide) return;
        ref.current.innerHTML = '';
        try {
            const iconData = window.lucide.icons[toPascal(name)];
            if (iconData) {
                const svg = window.lucide.createElement(iconData);
                if (svg) {
                    svg.setAttribute('width', size);
                    svg.setAttribute('height', size);
                    if (className) {
                        className.split(/\s+/).filter(Boolean).forEach(c => svg.classList.add(c));
                    }
                    ref.current.appendChild(svg);
                }
            }
        } catch (e) {}
    }, [name, size, className]);
    return <span ref={ref} style={{ display: 'inline-flex', width: size, height: size }} {...rest} />;
};

const Sparkles = (p) => <Icon name="sparkles" {...p} />;
const Wand2 = (p) => <Icon name="wand-2" {...p} />;
const ChevronLeft = (p) => <Icon name="chevron-left" {...p} />;
const X = (p) => <Icon name="x" {...p} />;
const Upload = (p) => <Icon name="upload" {...p} />;
const Send = (p) => <Icon name="send" {...p} />;
const Loader2 = (p) => <Icon name="loader-2" {...p} />;
const LayoutGrid = (p) => <Icon name="layout-grid" {...p} />;
const History = (p) => <Icon name="history" {...p} />;
const Info = (p) => <Icon name="info" {...p} />;
const ImageIcon = (p) => <Icon name="image" {...p} />;
const Square = (p) => <Icon name="square" {...p} />;
const RectangleHorizontal = (p) => <Icon name="rectangle-horizontal" {...p} />;
const RectangleVertical = (p) => <Icon name="rectangle-vertical" {...p} />;
const Monitor = (p) => <Icon name="monitor" {...p} />;
const Smartphone = (p) => <Icon name="smartphone" {...p} />;
const Key = (p) => <Icon name="key" {...p} />;
const ExternalLink = (p) => <Icon name="external-link" {...p} />;
const Trash2 = (p) => <Icon name="trash-2" {...p} />;
const RefreshCw = (p) => <Icon name="refresh-cw" {...p} />;
const MessageSquare = (p) => <Icon name="message-square" {...p} />;
const Download = (p) => <Icon name="download" {...p} />;
const Share2 = (p) => <Icon name="share-2" {...p} />;

// --- CONSTANTES ---
const AspectRatio = { SQUARE: '1:1', PORTRAIT: '3:4', WIDE: '16:9', TALL: '9:16', ULTRAWIDE: '21:9' };

const getClosestAspectRatio = (width, height) => {
    const ratio = width / height;
    const targets = [
        { id: AspectRatio.SQUARE, val: 1 },
        { id: AspectRatio.PORTRAIT, val: 3 / 4 },
        { id: AspectRatio.WIDE, val: 16 / 9 },
        { id: AspectRatio.TALL, val: 9 / 16 },
        { id: AspectRatio.ULTRAWIDE, val: 21 / 9 }
    ];
    return targets.reduce((prev, curr) => Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev).id;
};

const resizeImage = (base64Str, maxWidth = 1024, quality = 0.85) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxWidth) {
                if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

const STYLE_GROUPS = {
    ilustracion: [
        { id: '', name: '🖌️ Dibujo / Ilustración', promptSuffix: '' },
        { id: 'anime', name: 'Anime Moderno', promptSuffix: 'Modern masterpiece anime style, high-quality animation aesthetic, sharp line art, vibrant cel-shading, expressive characters.' },
        { id: 'comic', name: 'Cómic Americano', promptSuffix: 'Classic American comic book style, Marvel/DC aesthetic, bold black ink outlines, heroic anatomy, vibrant colors, Ben-Day dots and halftone shading.' },
        { id: 'mortadelo', name: 'Mortadelo y Filemón', promptSuffix: 'Unmistakable Francisco Ibañez cartoon style, slapstick aesthetic, humorous caricatures. Include ONE or TWO small, clean speech bubbles with a very short, satirical and funny Spanish phrase strictly related to the main characters and their absurd situation. Keep text minimal and sharp.' },
        { id: 'boceto', name: 'Boceto a Lápiz', promptSuffix: 'Artistic charcoal and graphite pencil sketch, rough hand-drawn lines, visible hatching, textured paper background, expressive unfinished look.' },
        { id: 'ghibli', name: 'Studio Ghibli', promptSuffix: 'Breathtaking Studio Ghibli anime style, painterly hand-painted backgrounds, whimsical and nostalgic atmosphere, soft natural lighting, magical aesthetic.' },
        { id: 'manga-clasico', name: 'Manga Clásico (BN)', promptSuffix: 'Classic 90s monochrome manga style, hand-drawn ink lines, professional screentones, dramatic hatching, high-contrast black and white art.' },
        { id: 'line-art', name: 'Line Art Minimalista', promptSuffix: 'Clean minimalist line art, pure black lines on stark white background, sharp elegant contours, no shading, sophisticated simplicity.' },
        { id: 'cartoon-europeo', name: 'Cartoon Europeo', promptSuffix: 'Classic European bande dessinée style, Tintin/Spirou ligne claire aesthetic, flat charming colors, clean lines, nostalgic adventure atmosphere.' },
        { id: 'il-editorial', name: 'Ilustración Editorial', promptSuffix: 'Contemporary editorial illustration style, sophisticated color palette, stylized geometric shapes, conceptual visual storytelling, clean digital textures.' },
        { id: 'ink', name: 'Dibujo a Tinta', promptSuffix: 'Intricate black ink drawing, artistic cross-hatching, stippling techniques, fine detail, high-contrast pen and ink aesthetic.' }
    ],
    pictorico: [
        { id: '', name: '🎨 Arte / Tradicional', promptSuffix: '' },
        { id: 'acuarela', name: 'Acuarela Artística', promptSuffix: 'Exquisite watercolor painting, soft dreamlike color bleeds, realistic wet-on-wet technique, textured cold-press paper background, delicate artistic touch.' },
        { id: 'oleo', name: 'Pintura al Óleo', promptSuffix: 'Masterpiece oil painting on canvas, visible thick impasto brushstrokes, rich oil textures, dramatic chiaroscuro lighting, traditional fine art aesthetic.' },
        { id: 'vintage', name: 'Vintage / Retro', promptSuffix: 'Authentic retro vintage aesthetic, 1970s film grain, faded nostalgic colors, analog photography look, warm lighting, distressed texture.' },
        { id: 'fantasia', name: 'Fantasía Épica', promptSuffix: 'High fantasy concept art, magical glowing elements, legendary creatures, intricate gold armor, cinematic atmospheric lighting, epic scale.' },
        { id: 'surrealista', name: 'Surrealismo', promptSuffix: 'Surrealist masterpiece, dreamlike impossible landscape, melting objects, bizarre proportions, Dalí-esque subconscious imagery, thought-provoking.' },
        { id: 'gouache', name: 'Gouache Vibrante', promptSuffix: 'Vibrant gouache painting, flat opaque colors, hand-painted matte textures, charming book illustration aesthetic, bold and colorful.' },
        { id: 'acrilico', name: 'Acrílico Moderno', promptSuffix: 'Modern acrylic painting style, bold expressive colors, textured brushwork, high contrast, contemporary art gallery aesthetic.' },
        { id: 'expresionismo', name: 'Expresionismo', promptSuffix: 'Expressionist art style, intense emotional colors, distorted forms for dramatic impact, raw energetic brushstrokes, soul-stirring composition.' },
        { id: 'realismo', name: 'Realismo Pictórico', promptSuffix: 'Sophisticated painterly realism, focus on lighting and atmosphere, accurate proportions with visible artistic brushstrokes, high-end fine art.' },
        { id: 'impresionismo', name: 'Impresionismo', promptSuffix: 'Impressionist masterpiece, small thin visible brushstrokes, emphasis on light qualities, vibrant unmixed colors, capturing the fleeting movement.' }
    ],
    digital: [
        { id: '', name: '💻 Digital / 3D', promptSuffix: '' },
        { id: '3d-render', name: '3D Hyper-Render', promptSuffix: 'Professional 3D render, Octane rendering engine, 8k resolution, realistic ray-tracing, cinematic studio lighting, hyper-detailed textures.' },
        { id: 'lego', name: 'Estilo LEGO', promptSuffix: 'Constructed from high-quality LEGO bricks and minifigures, detailed plastic block textures, toy photography aesthetic, vibrant primary colors.' },
        { id: 'clay', name: 'Plastilina / Clay', promptSuffix: 'Handcrafted claymation style, tactile plasticine textures, fingerprints on material surface, stop-motion animation look, charming and organic.' },
        { id: 'pixel-art', name: 'Pixel Art Retro', promptSuffix: 'High-quality 16-bit pixel art, nostalgic retro video game aesthetic, vibrant limited color palette, clean grid-aligned pixels.' },
        { id: 'isometrico', name: '3D Isométrico', promptSuffix: 'Stylized 3D isometric perspective, clean geometry, miniature world aesthetic, soft global illumination, vibrant digital toy look.' },
        { id: 'low-poly', name: 'Low Poly Art', promptSuffix: 'Modern low poly 3D aesthetic, visible polygonal triangulation, clean gradients, minimalist geometric digital art.' },
        { id: 'clay-render', name: 'Clay Render 3D', promptSuffix: 'Professional 3D clay render, matte monochrome material, soft shadows, global illumination, focus on form and volume.' },
        { id: 'diorama', name: 'Diorama Digital', promptSuffix: 'Intricate digital diorama, miniature scene isolated in a 3D box, tilt-shift lens effect, magical and detailed miniature environment.' },
        { id: 'voxel', name: 'Voxel Art', promptSuffix: 'Detailed voxel art style, constructed from tiny 3D cubes, retro-modern digital aesthetic, vibrant 3D pixelated world.' },
        { id: 'maqueta', name: 'Maqueta 3D', promptSuffix: 'Architectural scale model style, clean white materials, precision laser-cut details, professional 3D presentation aesthetic.' }
    ],
    grafico: [
        { id: '', name: '📐 Gráfico / Moderno', promptSuffix: '' },
        { id: 'neon', name: 'Luces de Neón', promptSuffix: 'Vibrant neon light aesthetic, glowing electric colors, dark atmospheric background, synthwave cyberpunk vibe.' },
        { id: 'pop-art', name: 'Pop Art Clásico', promptSuffix: 'Iconic Pop Art style, Andy Warhol and Roy Lichtenstein aesthetic, bold solid colors, Ben-Day dots, high-impact graphic culture.' },
        { id: 'minimalista', name: 'Minimalismo Puro', promptSuffix: 'Minimalist graphic design, clean simple shapes, strategic use of negative space, restricted elegant color palette, essentialist aesthetic.' },
        { id: 'flat', name: 'Illustration Flat', promptSuffix: 'Modern flat design illustration, no shadows, geometric simplicity, clean solid colors, trendy digital graphic style.' },
        { id: 'vectorial', name: 'Gráfico Vectorial', promptSuffix: 'Sharp SVG vector illustration, smooth paths, clean edges, professional logo-style graphics, scalable digital art.' },
        { id: 'geometrico', name: 'Abstracción Geométrica', promptSuffix: 'Abstract art made of geometric patterns, triangles and circles, mathematical precision, vibrant color blocks, balanced composition.' },
        { id: 'memphis', name: 'Estilo Memphis', promptSuffix: 'Quirky 80s Memphis design movement, loud clashing patterns, zig-zags and squiggles, pastel colors with bold outlines.' },
        { id: 'duotono', name: 'Duotono Impactante', promptSuffix: 'Bold duotone color effect, two high-contrast ink colors, graphic design aesthetic, modern visual power.' },
        { id: 'glitch', name: 'Glitch Art Digital', promptSuffix: 'Digital glitch aesthetic, chromatic aberration, data corruption artifacts, scanlines, cybernetic distortion look.' },
        { id: 'poster', name: 'Póster Moderno', promptSuffix: 'Contemporary graphic poster layout, swiss design style, grid-based composition, high-impact typographic focus (simulated).' }
    ]
};

const ASPECT_RATIOS = [
    { id: AspectRatio.SQUARE, name: '1:1', icon: <Square size={18} /> },
    { id: AspectRatio.PORTRAIT, name: '3:4', icon: <RectangleVertical size={18} /> },
    { id: AspectRatio.WIDE, name: '16:9', icon: <Monitor size={18} /> },
    { id: AspectRatio.TALL, name: '9:16', icon: <Smartphone size={18} /> },
    { id: AspectRatio.ULTRAWIDE, name: '21:9', icon: <Smartphone size={18} /> },
];

// --- HISTORIAL PERSISTENTE CON INDEXEDDB FILTRADO POR MODO ---
const DB_NAME = 'editar_imagenes_db';
const DB_VERSION = 1;
const STORE_NAME = 'history';

let historyDb = null;

const openHistoryDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { historyDb = request.result; resolve(historyDb); };
    request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
    };
});

const loadHistoryFromDb = async (mode) => {
    try {
        if (!historyDb) await openHistoryDb();
        return new Promise((resolve, reject) => {
            const tx = historyDb.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const items = (req.result || []).filter(item => (item.mode || 'remix') === mode);
                items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                resolve(items);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error cargando historial:', e); return []; }
};

const saveHistoryItemToDb = async (item) => {
    try {
        if (!historyDb) await openHistoryDb();
        return new Promise((resolve, reject) => {
            const tx = historyDb.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error guardando item:', e); }
};

const deleteHistoryItemFromDb = async (id) => {
    try {
        if (!historyDb) await openHistoryDb();
        return new Promise((resolve, reject) => {
            const tx = historyDb.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error eliminando item:', e); }
};

const clearHistoryFromDb = async (mode) => {
    try {
        if (!historyDb) await openHistoryDb();
        const allItems = await new Promise((resolve) => {
            const tx = historyDb.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => resolve(req.result || []);
        });
        const txDelete = historyDb.transaction(STORE_NAME, 'readwrite');
        const store = txDelete.objectStore(STORE_NAME);
        allItems.filter(i => (i.mode || 'remix') === mode).forEach(i => store.delete(i.id));
    } catch (e) { console.warn('Error limpiando historial:', e); }
};

// --- SERVICES CORREGIDOS ---
const PROXY_URL = './proxy.php';

const callProxy = async (model, contents, config = {}, promptText = '') => {
    // Garantizamos que el objeto enviado siempre lleve parametro 'prompt'
    const payload = { 
        model: (window.selectedModel || model), 
        prompt: promptText, 
        contents, 
        ...config 
    };
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
    }
    return await response.json();
};

const enhancePrompt = async (basePrompt) => {
    try {
        const systemInstructions = `ERES UN EXPERTO EN MEJORA DE PROMPTS PARA GENERACIÓN DE IMÁGENES.
TU REGLA DE ORO ES: RESPETA ESTRICTAMENTE LA INTENCIÓN DEL USUARIO.
Instrucciones:
1. NO inventes sujetos nuevos.
2. NO cambies el entorno drásticamente.
3. Céntrate en añadir detalles técnicos de calidad para que el prompt sea más efectivo.

Analiza este prompt original: "${basePrompt}" y genera 4 variantes en español (Descriptiva, Cinematográfica, Artística, y Minimalista) siguiendo estas reglas estrictas.`;
        const contents = [{ parts: [{ text: systemInstructions }] }];
        const config = {
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { type: { type: "STRING" }, text: { type: "STRING" } },
                        required: ["type", "text"]
                    }
                }
            }
        };
        const result = await callProxy('flux', contents, config);
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text ? JSON.parse(text) : [];
    } catch (e) {
        console.error("Failed to enhance prompt", e);
        return [];
    }
};

const generateImage = async (params) => {
    let basePrompt = (params.prompt || '').trim();
    const styleSuffix = (params.styleSuffix || '').trim();
    const fullStylePrompt = `${basePrompt} ${styleSuffix}`.trim();

    let finalPrompt = '';
    if (params.sourceImage) {
        const sizeInfo = `Adjust the aspect ratio to ${params.aspectRatio}.`;
        if (fullStylePrompt) {
            finalPrompt = `${sizeInfo} TRANSFORM this entire image into the following style and content: ${fullStylePrompt}. Ensure the output is a complete, high-quality image that fills the ${params.aspectRatio} format perfectly.`;
        } else {
            finalPrompt = `${sizeInfo} Fill any empty areas seamlessly maintaining the original style and context of the image. The result must be a complete, natural image.`;
        }
    } else {
        finalPrompt = fullStylePrompt || 'A beautiful high-quality image';
    }

    const parts = [{ text: finalPrompt }];
    if (params.sourceImage) {
        const base64Data = params.sourceImage.split(',')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
    }
    const contents = [{ parts }];
    const config = {
        generationConfig: {
            imageConfig: {
                aspectRatio: params.aspectRatio
            }
        }
    };

    // Pasamos 'finalPrompt' como parámetro explícito
    const result = await callProxy('flux', contents, config, finalPrompt);
    const partsResponse = result?.candidates?.[0]?.content?.parts || [];
    for (const part of partsResponse) {
        if (part.inlineData) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    throw new Error("No se pudo generar la imagen");
};

const editImageConversation = async (params) => {
    const base64Data = params.originalImage.split(',')[1];
    const contents = [{
        parts: [
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            { text: params.instruction }
        ]
    }];
    const config = { generationConfig: { imageConfig: { aspectRatio: params.aspectRatio } } };
    const result = await callProxy('flux', contents, config);
    const partsResponse = result?.candidates?.[0]?.content?.parts || [];
    for (const part of partsResponse) {
        if (part.inlineData) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    throw new Error("Error en la edición conversacional");
};

// --- COMPONENTS ---
const ApiKeyChecker = ({ children }) => <>{children}</>;

const LoadingOverlay = ({ progress = 0, status = '' }) => (
    <div className="loading-overlay">
        <div className="spinner-triple">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
        </div>
        <p className="loading-text">IA Generando Obra Maestra...</p>
        <div className="progress-container">
            <div className="progress-percentage">{progress}%</div>
            <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-status">{status || 'Iniciando...'}</div>
        </div>
    </div>
);

const CustomSelect = ({ options, value, onChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.id === value) || options[0];
    const isPlaceholder = !value;
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className={`relative ${className || ''}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-black/20 border border-white/5 rounded-3xl p-4 text-[11px] outline-none cursor-pointer text-left flex items-center justify-between hover:border-cyan-400/50 focus:border-cyan-400 transition-all ${isPlaceholder ? 'opacity-60' : 'neon-border-purple'}`}
            >
                <span className={isPlaceholder ? 'text-gray-500' : 'text-gray-200'}>{selectedOption.name}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 glass rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {options.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-xs transition-all flex items-center gap-3 ${opt.id === value
                                    ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-cyan-400 border-l-2 border-transparent'
                                    }`}
                            >
                                {opt.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ImageCard = ({ image, onDelete, onRegenerate, onEdit, onClick }) => {
    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `gemini-studio-${image.id}.jpg`;
        link.click();
    };

    return (
        <div onClick={() => onClick && onClick(image)} className="group relative glass rounded-[2.5rem] overflow-hidden flex flex-col glass-hover cursor-zoom-in border-white/10 shadow-2xl">
            <div className="absolute top-4 left-4 z-10">
                <div className="px-3 py-1 glass rounded-full text-[9px] uppercase text-white/90 border-white/5 backdrop-blur-md btn-canon">
                    {image.style ? image.style.name : 'Estilo'} | {image.aspectRatio}
                </div>
            </div>
            <div className="relative aspect-square bg-slate-950 overflow-hidden flex items-center justify-center">
                <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />

                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-start justify-center pt-8 backdrop-blur-[2px] z-20">
                    <div className="flex items-center justify-center gap-4 w-full">
                        <button onClick={(e) => { e.stopPropagation(); onRegenerate(image); }} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center group-hover/btn:bg-cyan-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
                                <RefreshCw className="text-cyan-400" size={16} />
                            </div>
                            <span className="btn-canon text-[8px] text-cyan-200">Nuevas</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); onEdit(image); }} className="flex flex-col items-center gap-1.5 group/btn">
    <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center group-hover/btn:bg-cyan-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
        <MessageSquare className="text-cyan-400" size={16} />
    </div>
    <span className="btn-canon text-[8px] text-cyan-200">Variar</span>
</button>

                        <button onClick={handleDownload} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center group-hover/btn:bg-slate-700 group-hover/btn:scale-110 transition-all shadow-lg">
                                <Download className="text-slate-200" size={16} />
                            </div>
                            <span className="btn-canon text-[8px] text-slate-300">Bajar</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); onDelete(image.id); }} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-red-900/40 border border-red-500/50 flex items-center justify-center group-hover/btn:bg-red-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
                                <Trash2 className="text-red-400" size={16} />
                            </div>
                            <span className="btn-canon text-[8px] text-red-300">Quitar</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-900/80 backdrop-blur-md flex flex-col gap-1 border-t border-white/5">
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight italic">
                    {image.prompt}
                </p>
                <div className="text-[9px] text-gray-600 uppercase mt-1 btn-canon">
                    {new Date(image.createdAt).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

const Splash = ({ onSelect }) => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12">
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4">
            <h1 className="splash-title">Edita como un Pro</h1>
            <p className="splash-subtitle">
                Edición y Generación de Imágenes con IA
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            {/* Tarjeta 1: Editar Imagen */}
            <button onClick={() => onSelect('remix')} className="group glass glass-hover relative p-12 rounded-[3rem] text-left space-y-4 overflow-hidden border-cyan-500/30">
                <div className="absolute top-0 right-0 p-8 text-cyan-500/10 transform group-hover:scale-150 group-hover:rotate-12 transition-transform duration-700">
                    <ImageIcon size={200} />
                </div>
                <div className="bg-cyan-500/20 w-16 h-16 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/30">
                    <Wand2 size={32} />
                </div>
                <h2 className="btn-editar-imagen">Editar Imagen</h2>
                <p className="card-desc">Edita imágenes existentes con la potencia de Nano Banana.</p>
            </button>

            {/* Tarjeta 2: Generar Imágenes */}
            <button onClick={() => onSelect('text-to-image')} className="group glass glass-hover relative p-12 rounded-[3rem] text-left space-y-4 overflow-hidden border-cyan-500/30">
                <div className="absolute top-0 right-0 p-8 text-cyan-500/10 transform group-hover:scale-150 group-hover:-rotate-12 transition-transform duration-700">
                    <Sparkles size={200} />
                </div>
                <div className="bg-cyan-500/20 w-16 h-16 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/30">
                    <Sparkles size={32} />
                </div>
                <h2 className="btn-generar-imagenes">Generar Imágenes</h2>
                <p className="card-desc">Genera imágenes desde una descripción de texto.</p>
            </button>
        </div>
    </div>
);


// --- APP MAIN ---
const App = () => {
    const [view, setView] = useState('splash');
    const [mode, setMode] = useState('remix');
    const [prompt, setPrompt] = useState('');
    const [enhancedPrompts, setEnhancedPrompts] = useState([]);
    const [selectedStyle, setSelectedStyle] = useState(STYLE_GROUPS.ilustracion[0]);
    const [selectedAR, setSelectedAR] = useState(AspectRatio.SQUARE);
    const [images, setImages] = useState([]);
    const [remixSource, setRemixSource] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [editImage, setEditImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [error, setError] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState('flux-pro');

  // Sincronizar modelo con variable global (accesible desde callProxy)
  useEffect(() => { window.selectedModel = selectedModel; }, [selectedModel]);

    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');

    const fileInputRef = useRef(null);

    // Cargar historial desacoplado por modo activo
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const items = await loadHistoryFromDb(mode);
                setImages(items);
            } catch (e) { console.warn('Error cargando historial:', e); }
        };
        if (view === 'editor') {
            loadHistory();
        }
    }, [view, mode]);

    const handleStart = (m) => {
        setMode(m);
        setView('editor');
        if (m === 'text-to-image') setRemixSource(null);
        setError(null);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            const img = new Image();
            img.onload = () => {
                const detectedAR = getClosestAspectRatio(img.width, img.height);
                setSelectedAR(detectedAR);
                setRemixSource(f.target.result);
            };
            img.src = f.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleEnhance = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(prompt);
            setEnhancedPrompts(enhanced);
        } catch (err) { console.error(err); } finally { setIsEnhancing(false); }
    };

    const handleGenerate = async (finalPrompt = prompt) => {
        const effectivePrompt = (typeof finalPrompt === 'string' ? finalPrompt : prompt).trim();
        
        if (mode === 'text-to-image' && !effectivePrompt) {
            setError("Escribe una descripción antes de generar.");
            return;
        }
        if (mode === 'remix' && !remixSource) {
            setError("Sube una imagen para poder editarla.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setProgress(0);
        setProgressStatus('Preparando...');
        try {
            const styleSuffix = selectedStyle.promptSuffix;
            let finalSourceImage = mode === 'remix' ? (remixSource || undefined) : undefined;

            if (finalSourceImage) {
                finalSourceImage = await resizeImage(finalSourceImage, 1024, 0.85);
            }

            setProgress(10);
            setProgressStatus('Generando imagen 1 de 2...');

            const results = await Promise.all([
                generateImage({
                    prompt: effectivePrompt,
                    styleSuffix,
                    aspectRatio: selectedAR,
                    sourceImage: finalSourceImage
                }).then(url => { setProgress(40); setProgressStatus('Generando imagen 2 de 2...'); return url; }),
                generateImage({
                    prompt: effectivePrompt + (mode === 'remix' ? " (Alternative detailed variation)" : " --variation distinct composition"),
                    styleSuffix,
                    aspectRatio: selectedAR,
                    sourceImage: finalSourceImage
                }).then(url => { setProgress(70); setProgressStatus('Finalizando...'); return url; })
            ]);

            setProgress(90);
            setProgressStatus('Guardando...');

            const newHistoryImages = results.map(imageUrl => ({
                id: Math.random().toString(36).substring(7),
                url: imageUrl,
                prompt: effectivePrompt || 'Edición de imagen',
                style: selectedStyle,
                aspectRatio: selectedAR,
                size: '1K',
                mode: mode,
                createdAt: Date.now()
            }));

            for (const img of newHistoryImages) {
                await saveHistoryItemToDb(img);
            }

            setProgress(100);
            setImages(prev => [...newHistoryImages, ...prev]);
        } catch (err) {
            setError(err.message || "Error de generación");
        } finally {
            setTimeout(() => { setIsGenerating(false); setProgress(0); setProgressStatus(''); }, 400);
            setPrompt("");
            setSelectedStyle(STYLE_GROUPS.ilustracion[0]);
            setSelectedAR(AspectRatio.SQUARE);
        }
    };

    const handleDelete = async (id) => {
        await deleteHistoryItemFromDb(id);
        setImages(images.filter(img => img.id !== id));
    };

    const handleClearHistory = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar el historial de este modo?')) return;
        await clearHistoryFromDb(mode);
        setImages([]);
    };

    const handleRegenerate = (img) => {
        setPrompt(img.prompt);
        if (img.style) setSelectedStyle(img.style);
        setSelectedAR(img.aspectRatio);
        handleGenerate(img.prompt);
    };

    const handleOpenEdit = (img) => {
        setEditImage(img);
        setEditInstruction('');
    };

    const handleEditSubmit = async () => {
        if (!editImage || !editInstruction.trim()) return;
        setIsGenerating(true);
        try {
            const compressedOriginal = await resizeImage(editImage.url, 1024, 0.85);
            const updatedUrl = await editImageConversation({
                originalImage: compressedOriginal,
                instruction: editInstruction,
                aspectRatio: editImage.aspectRatio
            });
            const updatedImage = { ...editImage, id: Math.random().toString(36).substring(7), url: updatedUrl, mode: mode, createdAt: Date.now() };
            await saveHistoryItemToDb(updatedImage);
            setImages([updatedImage, ...images]);
            setEditImage(null);
        } catch (err) { setError("Error de edición"); } finally { setIsGenerating(false); }
    };

    const isGenerateDisabled = isGenerating || (mode === 'text-to-image' && !prompt.trim()) || (mode === 'remix' && !remixSource);

    return (
        <ApiKeyChecker>
            {isGenerating && <LoadingOverlay progress={progress} status={progressStatus} />}
            <div className="min-h-screen custom-scrollbar overflow-y-auto">
                {view === 'splash' ? (
                    <Splash onSelect={handleStart} />
                ) : (
                    <div className="flex flex-col lg:flex-row min-h-screen">
                        <aside className="lg:w-[440px] glass border-r border-white/5 lg:sticky lg:top-0 lg:h-screen overflow-y-auto p-10 space-y-10 custom-scrollbar flex flex-col z-20">
                            <div className="flex items-center justify-between shrink-0">
    <h1 onClick={() => setView('splash')} className="aside-title flex items-center gap-3 cursor-pointer">
        <Wand2 className="text-cyan-400" size={28} />
        {mode === 'remix' ? 'Editar Imagen' : 'Generar Imágenes'}
    </h1>
</div>
                            {mode === 'remix' && (
    <div className="space-y-4 animate-in">
        <label className="btn-canon text-[11px] text-cyan-400">Imagen a Editar</label>
        <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer border-2 border-dashed border-cyan-500/30 rounded-[2.5rem] overflow-hidden aspect-video flex items-center justify-center bg-slate-900/40 hover:border-cyan-400 transition-all">
            {remixSource ? (
                <img src={remixSource} className="w-full h-full object-contain" />
            ) : (
                <div className="text-cyan-400 flex flex-col items-center gap-2">
                    <Upload size={24} />
                    <span className="btn-canon text-[10px]">Sube Imagen</span>
                </div>
            )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
    </div>
)}

                            <div className="space-y-4">
                                <label className="btn-canon text-[11px] text-cyan-400">Describe tu imagen</label>
                                <div className="relative">
                                    <textarea
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Detalla lo que deseas ver en tu imagen..."
    className="w-full h-48 bg-black/20 border border-white/5 rounded-3xl p-6 text-sm outline-none resize-none custom-scrollbar focus:border-cyan-400 placeholder:text-cyan-400 transition-all shadow-inner"
/>
                                    <button
                                        onClick={handleEnhance}
                                        disabled={isEnhancing || !prompt.trim()}
                                        title="mejorar prompt con IA"
                                        className="absolute bottom-4 right-4 p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl hover:bg-cyan-500/30 transition-all z-30"
                                    >
                                        {isEnhancing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    </button>
                                </div>

                                {enhancedPrompts.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                                        {enhancedPrompts.map((p, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setPrompt(p.text);
                                                }}
                                                className="text-[10px] text-left p-3 glass-light border border-white/5 rounded-2xl text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all leading-tight group"
                                            >
                                                <div className="font-bold text-[9px] uppercase tracking-tighter text-gray-500 group-hover:text-cyan-500 mb-1">{p.type}</div>
                                                <div className="line-clamp-2 italic opacity-80">{p.text}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <label className="btn-canon text-[11px] text-cyan-400">Panel de Estilos</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomSelect
                                        options={STYLE_GROUPS.ilustracion}
                                        value={STYLE_GROUPS.ilustracion.some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                        onChange={(id) => id ? setSelectedStyle(STYLE_GROUPS.ilustracion.find(s => s.id === id)) : setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' })}
                                    />
                                    <CustomSelect
                                        options={STYLE_GROUPS.pictorico}
                                        value={STYLE_GROUPS.pictorico.some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                        onChange={(id) => id ? setSelectedStyle(STYLE_GROUPS.pictorico.find(s => s.id === id)) : setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' })}
                                    />
                                    <CustomSelect
                                        options={STYLE_GROUPS.digital}
                                        value={STYLE_GROUPS.digital.some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                        onChange={(id) => id ? setSelectedStyle(STYLE_GROUPS.digital.find(s => s.id === id)) : setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' })}
                                    />
                                    <CustomSelect
                                        options={STYLE_GROUPS.grafico}
                                        value={STYLE_GROUPS.grafico.some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                        onChange={(id) => id ? setSelectedStyle(STYLE_GROUPS.grafico.find(s => s.id === id)) : setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="btn-canon text-[11px] text-cyan-400">Formato de Salida</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {ASPECT_RATIOS.map((ar) => (
                                        <button
                                            key={ar.id}
                                            onClick={() => setSelectedAR(ar.id)}
                                            className={`aspect-ratio-button ${selectedAR === ar.id ? 'active' : ''}`}
                                        >
                                            <div className="flex items-center justify-center">{ar.icon}</div>
                                            <span className="btn-canon text-[9px]">{ar.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Selector de Modelo IA (canonico hoola) ── */}
                            <div className="model-selector">
                              <span className="model-selector-label">Modelo IA</span>
                              <div className="model-toggle-group" role="group" aria-label="Seleccionar modelo">
                                {[
                                  { id: 'flux-pro', name: 'Flux Pro', cls: 'flux' },
                                  { id: 'flux-max', name: 'Flux Max', cls: 'flux' },
                                  { id: 'gemini-flash', name: 'Gemini 3.1', secondLine: 'Flash', cls: '' },
                                  { id: 'gemini-pro', name: 'Gemini 3', secondLine: 'Pro', cls: '' }
                                ].map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => setSelectedModel(m.id)}
                                    className={`model-toggle ${selectedModel === m.id ? 'active' + (m.cls ? ' ' + m.cls : '') : ''}`}
                                  >{m.name}{m.secondLine && <><br />{m.secondLine}</>}</button>
                                ))}
                              </div>
                            </div>

                            <div className="pt-6 order-last">
                                <button onClick={() => handleGenerate()} disabled={isGenerateDisabled} className="btn-canon w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-[2rem] flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(46,232,255,0.3)] btn-3d disabled:opacity-20">
                                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    {isGenerating ? 'PROCESANDO...' : (mode === 'remix' ? 'GENERAR EDICIÓN' : 'GENERAR IMAGEN')}
                                </button>
                                {error && <p className="btn-canon text-red-400 text-[11px] text-center mt-4">{error}</p>}
                            </div>
                        </aside>

                        <main className="flex-1 p-10 lg:p-20 overflow-y-auto custom-scrollbar">
                            <div className="max-w-7xl mx-auto space-y-16">
                                <div className="flex items-end justify-between">
                                    <div className="space-y-2">
                                        <h2 className="section-title">{mode === 'remix' ? 'Historial de Imágenes Editadas' : 'Historial de Imágenes Generadas'}</h2>
                                        <p className="empty-subtitle" style={{textAlign:'left', marginLeft:0, marginRight:0}}>Controla y refina tus creaciones visuales en tiempo real.</p>
                                    </div>
                                    {images.length > 0 && (
                                        <button onClick={handleClearHistory} className="px-4 py-2 glass rounded-2xl text-xs text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-2">
                                            <Trash2 size={14} /> Limpiar
                                        </button>
                                    )}
                                </div>

                                {images.length === 0 ? (
                                    <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6 animate-in">
                                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-gray-700 border border-white/5 shadow-inner">
                                            <ImageIcon size={48} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="empty-title">No hay imágenes aún</h3>
                                            <p className="empty-subtitle">Comienza por describir tu idea en el panel lateral.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                        {images.map((img) => (
                                            <ImageCard key={img.id} image={img} onDelete={handleDelete} onRegenerate={handleRegenerate} onEdit={handleOpenEdit} onClick={setLightboxImage} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </main>

                        {lightboxImage && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-8 cursor-zoom-out" onClick={() => setLightboxImage(null)}>
                                <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center gap-8">
                                    <img src={lightboxImage.url} className="max-w-full max-h-[85vh] object-contain rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5" />
                                    <div className="glass px-8 py-4 rounded-full flex gap-10 text-[11px] text-gray-400 uppercase btn-canon" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-cyan-400">{lightboxImage.aspectRatio}</span>
                                        <span>RES: {lightboxImage.size}</span>
                                        <span className="text-gray-600">ID: {lightboxImage.id}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editImage && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-md animate-in">
                                <div className="glass max-w-4xl w-full rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                                    <div className="p-10 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-2xl font-bold flex items-center gap-4">
                                            <Wand2 size={24} className="text-purple-400" /> Refinar Proyecto
                                        </h3>
                                        <button onClick={() => setEditImage(null)} className="p-2 text-gray-500 hover:text-white transition-all"><X size={24} /></button>
                                    </div>
                                    <div className="p-12 flex flex-col md:flex-row gap-12">
                                        <div className="w-full md:w-1/2 aspect-square rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/5 shadow-inner">
                                            <img src={editImage.url} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between space-y-8">
                                            <div className="space-y-4">
                                                <div className="bg-cyan-500/10 p-5 rounded-2xl text-[11px] text-cyan-300 leading-relaxed border border-cyan-500/20 font-medium">
                                                    Indica modificaciones puntuales (luz, color, expansión) para aplicar sobre la base actual manteniendo la coherencia estructural.
                                                </div>
                                                <textarea
                                                    value={editInstruction}
                                                    onChange={(e) => setEditInstruction(e.target.value)}
                                                    placeholder="Ej: 'Transforma la iluminación a un atardecer cálido'..."
                                                    className="w-full h-44 bg-black/20 border border-white/5 rounded-3xl p-6 text-sm outline-none resize-none focus:border-cyan-400 transition-all shadow-inner"
                                                />
                                            </div>
                                            <button onClick={handleEditSubmit} disabled={isGenerating || !editInstruction.trim()} className="btn-canon w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-[2rem] flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(46,232,255,0.3)] btn-3d disabled:opacity-20">
                                                {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                                Aplicar Cambios
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ApiKeyChecker>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);