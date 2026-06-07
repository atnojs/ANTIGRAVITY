const { useState, useRef, useEffect, Fragment, useCallback, createContext, useContext } = React;
const ReactDOM = window.ReactDOM;

// ═══════════════════════════════════════════════════
// ICON SYSTEM
// ═══════════════════════════════════════════════════
const toPascal = (kebab) => kebab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
const Icon = ({ name, size = 20, className = '', ...rest }) => {
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
                    if (className) className.split(/\s+/).filter(Boolean).forEach(c => svg.classList.add(c));
                    ref.current.appendChild(svg);
                }
            }
        } catch (e) {}
    }, [name, size, className]);
    return <span ref={ref} style={{ display: 'inline-flex', width: size, height: size }} {...rest} />;
};

// Icon components
const Sparkles = (p) => <Icon name="sparkles" {...p} />;
const Wand2 = (p) => <Icon name="wand-2" {...p} />;
const Upload = (p) => <Icon name="upload" {...p} />;
const Send = (p) => <Icon name="send" {...p} />;
const Loader2 = (p) => <Icon name="loader-2" {...p} />;
const ImageIcon = (p) => <Icon name="image" {...p} />;
const Square = (p) => <Icon name="square" {...p} />;
const RectangleHorizontal = (p) => <Icon name="rectangle-horizontal" {...p} />;
const RectangleVertical = (p) => <Icon name="rectangle-vertical" {...p} />;
const Monitor = (p) => <Icon name="monitor" {...p} />;
const Smartphone = (p) => <Icon name="smartphone" {...p} />;
const Trash2 = (p) => <Icon name="trash-2" {...p} />;
const Download = (p) => <Icon name="download" {...p} />;
const X = (p) => <Icon name="x" {...p} />;
const ChevronLeft = (p) => <Icon name="chevron-left" {...p} />;
const Pencil = (p) => <Icon name="pencil" {...p} />;
const RotateCcw = (p) => <Icon name="rotate-ccw" {...p} />;
const Info = (p) => <Icon name="info" {...p} />;
const Palette = (p) => <Icon name="palette" {...p} />;
const Zap = (p) => <Icon name="zap" {...p} />;
const Layers = (p) => <Icon name="layers" {...p} />;

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
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
            let width = img.width, height = img.height;
            if (width > maxWidth || height > maxWidth) {
                if (width > height) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                else { width = Math.round((width * maxWidth) / height); height = maxWidth; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

// ═══════════════════════════════════════════════════
// STYLE GROUPS (preserved from original)
// ═══════════════════════════════════════════════════
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

const STYLE_CATEGORIES = [
    { key: 'ilustracion', label: '🖌️ Ilustración', color: '#F59E0B' },
    { key: 'pictorico', label: '🎨 Pictórico', color: '#8B5CF6' },
    { key: 'digital', label: '💻 Digital 3D', color: '#06B6D4' },
    { key: 'grafico', label: '📐 Gráfico', color: '#10B981' },
];

const ASPECT_RATIOS = [
    { id: AspectRatio.SQUARE, name: '1:1', icon: <Square size={16} /> },
    { id: AspectRatio.PORTRAIT, name: '3:4', icon: <RectangleVertical size={16} /> },
    { id: AspectRatio.WIDE, name: '16:9', icon: <Monitor size={16} /> },
    { id: AspectRatio.TALL, name: '9:16', icon: <Smartphone size={16} /> },
    { id: AspectRatio.ULTRAWIDE, name: '21:9', icon: <RectangleHorizontal size={16} /> },
];

// ═══════════════════════════════════════════════════
// INDEXEDDB (preserved from original)
// ═══════════════════════════════════════════════════
const DB_NAME = 'editar_generar_db_v2';
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

const loadHistoryFromDb = async () => {
    try {
        if (!historyDb) await openHistoryDb();
        return new Promise((resolve, reject) => {
            const tx = historyDb.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const items = req.result || [];
                items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                resolve(items);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) { return []; }
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
    } catch (e) {}
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
    } catch (e) {}
};

const clearHistoryFromDb = async () => {
    try {
        if (!historyDb) await openHistoryDb();
        return new Promise((resolve, reject) => {
            const tx = historyDb.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {}
};

// ═══════════════════════════════════════════════════
// API CALLS (preserved from original)
// ═══════════════════════════════════════════════════
const API_BASE = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');

const enhancePrompt = async (text) => {
    const resp = await fetch(`${API_BASE}/proxy.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enhance', prompt: text })
    });
    if (!resp.ok) throw new Error(`Enhance failed: ${resp.status}`);
    const data = await resp.json();
    return data.prompts || [];
};

const generateImage = async ({ prompt, styleSuffix, aspectRatio, sourceImage }) => {
    const resp = await fetch(`${API_BASE}/proxy.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'generate',
            prompt: prompt,
            styleSuffix: styleSuffix,
            aspectRatio: aspectRatio,
            sourceImage: sourceImage || null
        })
    });
    if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed: ${resp.status}`);
    }
    const data = await resp.json();
    return data.imageUrl || data.url || data.image;
};

const editImageConversation = async ({ originalImage, instruction, aspectRatio }) => {
    const resp = await fetch(`${API_BASE}/proxy.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'edit',
            sourceImage: originalImage,
            instruction: instruction,
            aspectRatio: aspectRatio
        })
    });
    if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Edit failed: ${resp.status}`);
    }
    const data = await resp.json();
    return data.imageUrl || data.url || data.image;
};

// ═══════════════════════════════════════════════════
// PREMIUM COMPONENTS
// ═══════════════════════════════════════════════════

// ── Loading Overlay ──
const LoadingOverlay = ({ progress = 0, status = '' }) => (
    <div className="loading-overlay">
        <div className="loading-card">
            <div className="loading-spinner"></div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {status || 'Procesando...'}
            </div>
            <div className="progress-track" style={{ width: '100%' }}>
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                {Math.round(progress)}%
            </div>
        </div>
    </div>
);

// ── Custom Select ──
const CustomSelect = ({ options, value, onChange, accentColor = '#F59E0B' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = options.find(o => o.id === value) || options[0];

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                className="style-select"
                style={{ width: '100%', textAlign: 'left' }}
            >
                <span style={{ opacity: value ? 1 : 0.4 }}>{selected.name}</span>
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', maxHeight: 240, overflowY: 'auto',
                    zIndex: 50, boxShadow: 'var(--shadow-lg)',
                    animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both'
                }}>
                    {options.map(o => (
                        <div
                            key={o.id}
                            onClick={() => { onChange(o.id); setOpen(false); }}
                            style={{
                                padding: '10px 14px', cursor: 'pointer', fontSize: '0.75rem',
                                color: o.id === value ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: o.id === value ? 'rgba(255,255,255,0.04)' : 'transparent',
                                transition: 'all var(--transition-fast)',
                                borderLeft: o.id === value ? `2px solid ${accentColor}` : '2px solid transparent'
                            }}
                            onMouseEnter={e => { if (o.id !== value) e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { if (o.id !== value) e.target.style.background = 'transparent'; }}
                        >
                            {o.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Image Card (Premium) ──
const ImageCard = ({ image, onDelete, onRegenerate, onEdit, onClick, index = 0 }) => {
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div
            className="card-premium animate-in"
            style={{ animationDelay: `${0.06 * index}s` }}
        >
            <div
                className="card-image-wrap"
                style={{ aspectRatio: image.aspectRatio === '9:16' ? '9/16' : image.aspectRatio === '16:9' ? '16/9' : image.aspectRatio === '21:9' ? '21/9' : image.aspectRatio === '3:4' ? '3/4' : '1/1' }}
                onClick={() => onClick(image)}
            >
                {!imgLoaded && (
                    <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
                )}
                <img
                    src={image.url}
                    alt={image.prompt || 'Generated image'}
                    onLoad={() => setImgLoaded(true)}
                    style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
                />
                <div className="card-overlay">
                    <button
                        className="card-action-btn"
                        onClick={(e) => { e.stopPropagation(); onRegenerate(image); }}
                        title="Regenerar"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        className="card-action-btn"
                        onClick={(e) => { e.stopPropagation(); onEdit(image); }}
                        title="Editar"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        className="card-action-btn danger"
                        onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                        title="Eliminar"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="card-info-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span className="tag">{image.aspectRatio}</span>
                    {image.style?.name && image.style.name !== '🖌️ Dibujo / Ilustración' && image.style.name !== '🎨 Arte / Tradicional' && image.style.name !== '💻 Digital / 3D' && image.style.name !== '📐 Gráfico / Moderno' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {image.style.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                    )}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {new Date(image.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </span>
            </div>
        </div>
    );
};

// ── Splash Screen (Premium) ──
const Splash = ({ onSelect }) => (
    <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
        position: 'relative', overflow: 'hidden'
    }}>
        {/* Glow orbs */}
        <div className="glow-orb glow-orb-amber"></div>
        <div className="glow-orb glow-orb-violet"></div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 700 }}>
            {/* Logo */}
            <div className="animate-scale-in" style={{ marginBottom: 32 }}>
                <div style={{
                    width: 80, height: 80, margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    borderRadius: 'var(--radius-xl)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 20px 60px rgba(245,158,11,0.3)'
                }}>
                    <Wand2 size={36} style={{ color: '#09090B' }} />
                </div>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    fontWeight: 800, letterSpacing: '-0.02em',
                    lineHeight: 1.1, marginBottom: 12
                }}>
                    <span className="gradient-text">Image Studio Pro</span>
                </h1>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '1rem', fontWeight: 400, maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
                    Crea, edita y transforma imágenes con inteligencia artificial de última generación
                </p>
            </div>

            {/* Mode cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16, marginTop: 48
            }} className="stagger">
                <div className="splash-card animate-in" onClick={() => onSelect('text-to-image')}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-soft)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 16
                    }}>
                        <Sparkles size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, color: 'var(--text-primary)' }}>
                        Texto a Imagen
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                        Describe tu idea y la IA la convierte en una imagen única con el estilo que elijas
                    </p>
                </div>

                <div className="splash-card animate-in" onClick={() => onSelect('remix')}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 'var(--radius-md)',
                        background: 'var(--violet-soft)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 16
                    }}>
                        <Layers size={24} style={{ color: 'var(--violet)' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, color: 'var(--text-primary)' }}>
                        Remezclar Imagen
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                        Sube una imagen base y transfórmala con nuevos estilos, composiciones y detalles
                    </p>
                </div>

                <div className="splash-card animate-in" onClick={() => onSelect('text-to-image')}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 'var(--radius-md)',
                        background: 'rgba(6,182,212,0.12)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 16
                    }}>
                        <Palette size={24} style={{ color: '#06B6D4' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, color: 'var(--text-primary)' }}>
                        Explorar Estilos
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                        +40 estilos artísticos: anime, óleo, 3D, pixel art, acuarela, cómic y mucho más
                    </p>
                </div>
            </div>

            {/* Footer */}
            <p style={{ marginTop: 48, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em' }}>
                POTENCIADO POR GEMINI AI · GENERACIÓN EN SEGUNDOS
            </p>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
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
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [toast, setToast] = useState(null);

    const fileInputRef = useRef(null);

    // Load history
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const items = await loadHistoryFromDb();
                if (items.length > 0) setImages(items);
            } catch (e) {}
        };
        loadHistory();
    }, []);

    // Toast auto-dismiss
    useEffect(() => {
        if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
    }, [toast]);

    const handleStart = (m) => {
        setMode(m);
        setView('editor');
        if (m === 'text-to-image') setRemixSource(null);
        if (m === 'remix') setTimeout(() => fileInputRef.current?.click(), 300);
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
        } catch (err) {} finally { setIsEnhancing(false); }
    };

    const handleGenerate = async (finalPrompt = prompt) => {
        const effectivePrompt = finalPrompt.trim() || (mode === 'remix' && remixSource ? ' ' : '');
        if (!effectivePrompt && !(mode === 'remix' && remixSource)) return;
        setIsGenerating(true); setError(null); setProgress(0);
        setProgressStatus('Preparando...');
        try {
            const styleSuffix = selectedStyle.promptSuffix;
            let finalSourceImage = mode === 'remix' ? (remixSource || undefined) : undefined;
            if (finalSourceImage) finalSourceImage = await resizeImage(finalSourceImage, 1024, 0.85);

            setProgress(10); setProgressStatus('Generando imagen 1 de 2...');
            const results = await Promise.all([
                generateImage({ prompt: effectivePrompt, styleSuffix, aspectRatio: selectedAR, sourceImage: finalSourceImage })
                    .then(url => { setProgress(40); setProgressStatus('Generando imagen 2 de 2...'); return url; }),
                generateImage({ prompt: effectivePrompt + (mode === 'remix' ? " (Alternative detailed variation)" : " --variation distinct composition"), styleSuffix, aspectRatio: selectedAR, sourceImage: finalSourceImage })
            ]);

            setProgress(85); setProgressStatus('Guardando...');
            const newHistoryImages = results.map(imageUrl => ({
                id: Math.random().toString(36).substring(7),
                url: imageUrl,
                prompt: effectivePrompt || 'Remezcla',
                style: selectedStyle,
                aspectRatio: selectedAR,
                size: '1K',
                createdAt: Date.now()
            }));
            for (const img of newHistoryImages) await saveHistoryItemToDb(img);
            setProgress(100);
            setImages(prev => [...newHistoryImages, ...prev]);
            setToast({ type: 'success', message: '¡Imágenes generadas con éxito!' });
        } catch (err) {
            setError(err.message || "Error de generación");
            setToast({ type: 'error', message: 'Error al generar. Inténtalo de nuevo.' });
        } finally {
            setTimeout(() => { setIsGenerating(false); setProgress(0); setProgressStatus(''); }, 400);
            setPrompt(""); setSelectedStyle(STYLE_GROUPS.ilustracion[0]);
            setSelectedAR(AspectRatio.SQUARE);
        }
    };

    const handleDelete = async (id) => {
        await deleteHistoryItemFromDb(id);
        setImages(images.filter(img => img.id !== id));
        setToast({ type: 'info', message: 'Imagen eliminada' });
    };

    const handleClearHistory = async () => {
        if (!confirm('¿Eliminar todo el historial?')) return;
        await clearHistoryFromDb();
        setImages([]);
    };

    const handleRegenerate = (img) => {
        setPrompt(img.prompt);
        setSelectedStyle(img.style);
        setSelectedAR(img.aspectRatio);
        handleGenerate(img.prompt);
    };

    const handleOpenEdit = (img) => { setEditImage(img); setEditInstruction(''); };

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
            const updatedImage = { ...editImage, id: Math.random().toString(36).substring(7), url: updatedUrl, createdAt: Date.now() };
            await saveHistoryItemToDb(updatedImage);
            setImages([updatedImage, ...images]);
            setEditImage(null);
            setToast({ type: 'success', message: '¡Imagen refinada con éxito!' });
        } catch (err) {
            setError("Error de edición");
            setToast({ type: 'error', message: 'Error al editar la imagen.' });
        } finally { setIsGenerating(false); }
    };

    const handleBackToSplash = () => {
        setView('splash');
        setRemixSource(null);
        setPrompt('');
        setEnhancedPrompts([]);
    };

    const isGenerateDisabled = isGenerating ||
        (mode === 'text-to-image' && !prompt.trim()) ||
        (mode === 'remix' && !remixSource);

    // Find active style category
    const activeCategory = STYLE_CATEGORIES.find(cat =>
        STYLE_GROUPS[cat.key].some(s => s.id === selectedStyle.id)
    );

    return (
        <div className="app-container custom-scrollbar" style={{ position: 'relative' }}>
            {/* Ambient glow orbs */}
            <div className="glow-orb glow-orb-amber" style={{ opacity: 0.08 }}></div>
            <div className="glow-orb glow-orb-violet" style={{ opacity: 0.06 }}></div>

            {/* Loading Overlay */}
            {isGenerating && <LoadingOverlay progress={progress} status={progressStatus} />}

            {/* Toast */}
            {toast && (
                <div className="toast" style={{
                    borderColor: toast.type === 'error' ? 'rgba(239,68,68,0.3)' :
                                toast.type === 'success' ? 'rgba(16,185,129,0.3)' :
                                'var(--border-default)'
                }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: toast.type === 'error' ? '#EF4444' :
                                   toast.type === 'success' ? '#10B981' : '#F59E0B'
                    }}></div>
                    {toast.message}
                </div>
            )}

            {view === 'splash' ? (
                <Splash onSelect={handleStart} />
            ) : (
                <>
                    {/* ── SIDEBAR ── */}
                    <aside className="sidebar custom-scrollbar">
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    onClick={handleBackToSplash}
                                    className="btn-ghost"
                                    style={{ padding: 6 }}
                                    title="Volver al inicio"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="gradient-text" style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                                        Image Studio
                                    </h1>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em' }}>
                                        PREMIUM EDITION
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mode tabs */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                className={`mode-tab ${mode === 'text-to-image' ? 'active' : ''}`}
                                onClick={() => handleStart('text-to-image')}
                            >
                                <Sparkles size={14} /> Texto a Imagen
                            </button>
                            <button
                                className={`mode-tab ${mode === 'remix' ? 'active' : ''}`}
                                onClick={() => handleStart('remix')}
                            >
                                <Layers size={14} /> Remezclar
                            </button>
                        </div>

                        {/* Upload zone (remix mode) */}
                        {mode === 'remix' && (
                            <div className="animate-in-fast">
                                <div className="section-label" style={{ marginBottom: 10, color: 'var(--violet)' }}>
                                    Imagen Base
                                </div>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`upload-zone ${remixSource ? 'has-image' : ''}`}
                                >
                                    {remixSource ? (
                                        <img src={remixSource} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            <Upload size={28} style={{ margin: '0 auto 8px' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Click para subir imagen</span>
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*" />
                            </div>
                        )}

                        {/* Prompt */}
                        <div>
                            <div className="section-label" style={{ marginBottom: 10, color: 'var(--accent)' }}>
                                Prompt
                            </div>
                            <div style={{ position: 'relative' }}>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe la imagen que deseas crear..."
                                    className="textarea-premium"
                                    style={{ height: mode === 'remix' ? 100 : 130 }}
                                />
                                <button
                                    onClick={handleEnhance}
                                    disabled={isEnhancing || !prompt.trim()}
                                    title="Mejorar prompt con IA"
                                    style={{
                                        position: 'absolute', bottom: 12, right: 12,
                                        width: 36, height: 36, borderRadius: 'var(--radius-full)',
                                        background: 'var(--accent-soft)', border: '1px solid var(--border-accent)',
                                        color: 'var(--accent)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all var(--transition-fast)',
                                        opacity: prompt.trim() ? 1 : 0.3
                                    }}
                                >
                                    {isEnhancing ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Zap size={16} />
                                    )}
                                </button>
                            </div>

                            {/* Enhanced prompts */}
                            {enhancedPrompts.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }} className="stagger">
                                    {enhancedPrompts.map((p, i) => (
                                        <div
                                            key={i}
                                            className="prompt-chip animate-in"
                                            onClick={() => { setPrompt(p.text); setEnhancedPrompts([]); }}
                                        >
                                            <div className="chip-type">{p.type}</div>
                                            <div className="chip-text">{p.text}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Style selector */}
                        <div>
                            <div className="section-label" style={{ marginBottom: 10 }}>
                                Estilo Artístico
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                                {STYLE_CATEGORIES.map(cat => {
                                    const isActive = STYLE_GROUPS[cat.key].some(s => s.id === selectedStyle.id);
                                    return (
                                        <button
                                            key={cat.key}
                                            onClick={() => setSelectedStyle(STYLE_GROUPS[cat.key][0])}
                                            style={{
                                                padding: '5px 10px', borderRadius: 'var(--radius-full)',
                                                fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                                                background: isActive ? `${cat.color}20` : 'transparent',
                                                border: `1px solid ${isActive ? cat.color + '40' : 'transparent'}`,
                                                color: isActive ? cat.color : 'var(--text-muted)',
                                                transition: 'all var(--transition-fast)'
                                            }}
                                        >
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {STYLE_CATEGORIES.map(cat => (
                                    <div key={cat.key}>
                                        <CustomSelect
                                            options={STYLE_GROUPS[cat.key]}
                                            value={STYLE_GROUPS[cat.key].some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                            onChange={(id) => {
                                                const found = STYLE_GROUPS[cat.key].find(s => s.id === id);
                                                if (found) setSelectedStyle(found);
                                                else setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' });
                                            }}
                                            accentColor={cat.color}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Aspect ratio */}
                        <div>
                            <div className="section-label" style={{ marginBottom: 10 }}>
                                Formato
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                                {ASPECT_RATIOS.map((ar) => (
                                    <button
                                        key={ar.id}
                                        onClick={() => setSelectedAR(ar.id)}
                                        className={`ar-btn ${selectedAR === ar.id ? 'active' : ''}`}
                                    >
                                        {ar.icon}
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{ar.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generate button */}
                        <div style={{ paddingTop: 8 }}>
                            <button
                                onClick={() => handleGenerate()}
                                disabled={isGenerateDisabled}
                                className="btn-primary"
                                style={{ width: '100%', padding: '16px 24px', fontSize: '0.9rem' }}
                            >
                                {isGenerating ? (
                                    <><Loader2 size={18} className="animate-spin" /> GENERANDO...</>
                                ) : (
                                    <><Sparkles size={18} /> GENERAR IMAGEN</>
                                )}
                            </button>
                            {error && (
                                <p style={{
                                    color: '#EF4444', fontSize: '0.7rem', textAlign: 'center',
                                    marginTop: 12, fontWeight: 600, letterSpacing: '0.04em'
                                }}>
                                    {error}
                                </p>
                            )}
                        </div>
                    </aside>

                    {/* ── MAIN CONTENT ── */}
                    <main className="main-content custom-scrollbar" style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                            {/* Header */}
                            <div className="history-header">
                                <div>
                                    <h2 style={{
                                        fontFamily: "'Playfair Display', serif",
                                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                                        fontWeight: 700, letterSpacing: '-0.02em',
                                        color: 'var(--text-primary)', marginBottom: 4
                                    }}>
                                        Galería
                                    </h2>
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                        {images.length === 0
                                            ? 'Tus creaciones aparecerán aquí'
                                            : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'} en el historial`}
                                    </p>
                                </div>
                                {images.length > 0 && (
                                    <button onClick={handleClearHistory} className="btn-secondary">
                                        <Trash2 size={14} /> Limpiar historial
                                    </button>
                                )}
                            </div>

                            {/* Image grid or empty state */}
                            {images.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <ImageIcon size={40} />
                                    </div>
                                    <h3 style={{
                                        fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-secondary)',
                                        marginBottom: 8
                                    }}>
                                        Sin imágenes aún
                                    </h3>
                                    <p style={{
                                        color: 'var(--text-tertiary)', maxWidth: 360, lineHeight: 1.7,
                                        fontSize: '0.85rem'
                                    }}>
                                        Describe tu idea en el panel lateral y observa cómo cobra vida con inteligencia artificial
                                    </p>
                                </div>
                            ) : (
                                <div className="image-grid">
                                    {images.map((img, i) => (
                                        <ImageCard
                                            key={img.id}
                                            image={img}
                                            index={i}
                                            onDelete={handleDelete}
                                            onRegenerate={handleRegenerate}
                                            onEdit={handleOpenEdit}
                                            onClick={setLightboxImage}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                </>
            )}

            {/* ── LIGHTBOX ── */}
            {lightboxImage && (
                <div className="lightbox-backdrop" onClick={() => setLightboxImage(null)}>
                    <img src={lightboxImage.url} className="lightbox-image" />
                    <div className="lightbox-info">
                        <span style={{ color: 'var(--accent)' }}>{lightboxImage.aspectRatio}</span>
                        <span>RES: {lightboxImage.size}</span>
                        <span style={{ color: 'var(--text-muted)' }}>ID: {lightboxImage.id}</span>
                    </div>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {editImage && (
                <div className="modal-backdrop" onClick={() => setEditImage(null)}>
                    <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div style={{
                            padding: '24px 32px', borderBottom: '1px solid var(--border-default)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                                    background: 'var(--violet-soft)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Wand2 size={18} style={{ color: 'var(--violet)' }} />
                                </div>
                                Refinar Imagen
                            </h3>
                            <button
                                onClick={() => setEditImage(null)}
                                className="btn-ghost"
                                style={{ padding: 8 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div className="edit-image-preview">
                                    <img src={editImage.url} alt="Original" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{
                                        background: 'var(--violet-soft)', border: '1px solid var(--border-violet)',
                                        borderRadius: 'var(--radius-md)', padding: '14px 18px',
                                        fontSize: '0.75rem', color: '#A78BFA', lineHeight: 1.6, fontWeight: 500
                                    }}>
                                        <Info size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -3 }} />
                                        Indica los cambios que quieres aplicar: iluminación, color, composición, estilo...
                                    </div>
                                    <textarea
                                        value={editInstruction}
                                        onChange={(e) => setEditInstruction(e.target.value)}
                                        placeholder="Ej: 'Convierte el fondo a un atardecer dorado con nubes dramáticas'..."
                                        className="textarea-premium"
                                        style={{ flex: 1, minHeight: 130 }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleEditSubmit}
                                disabled={isGenerating || !editInstruction.trim()}
                                className="btn-primary"
                                style={{ width: '100%', padding: '16px 24px' }}
                            >
                                {isGenerating ? (
                                    <><Loader2 size={18} className="animate-spin" /> APLICANDO...</>
                                ) : (
                                    <><Send size={18} /> Aplicar Cambios</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
