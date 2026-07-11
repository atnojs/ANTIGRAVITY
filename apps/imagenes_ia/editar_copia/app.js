import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as Lucide from 'lucide-react';

const {
    Sparkles, Wand2, ChevronLeft, X, Upload, Send,
    Loader2, LayoutGrid, History, Info, Image: ImageIcon,
    Square, RectangleHorizontal, RectangleVertical,
    Monitor, Smartphone, Key, ExternalLink,
    Trash2, RefreshCw, MessageSquare, Download, Share2
} = Lucide;

// --- CONSTANTES (ORIGINAL) ---
const AspectRatio = { SQUARE: '1:1', PORTRAIT: '3:4', WIDE: '16:9', TALL: '9:16', ULTRAWIDE: '21:9' };

const resizeImage = (base64Str, maxWidth = 1024, quality = 0.85) => {
    return new Promise((resolve) => {
        const img = new Image();
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
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
};

// Reduce una imagen (data URL) a un máximo de lado antes de mandarla a FLUX como
// imagen de entrada (image-to-image). Evita exceder el tope de 4MP en la subida.
const clampInputImage = (base64Str, maxSide = 2048) => resizeImage(base64Str, maxSide, 0.92);

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

const STYLE_GROUPS = {
    fotografico: [
        { id: 'fotografia-grupo', name: 'Fotografía / Realista', promptSuffix: '' },
        { id: 'hiperrealista', name: 'Hiperrealista', promptSuffix: 'Hyperrealistic photograph, ultra-detailed, razor-sharp focus, natural skin textures and micro-details, physically accurate lighting, 8k resolution, shot on a full-frame DSLR with a prime lens, lifelike depth and clarity.' },
        { id: 'fotorrealista', name: 'Fotorrealista', promptSuffix: 'Photorealistic image, true-to-life colors and lighting, realistic materials and reflections, high dynamic range, professional photography quality, natural and believable.' },
        { id: 'cinematografico', name: 'Cinematográfico', promptSuffix: 'Cinematic film still, dramatic cinematic lighting, anamorphic lens, shallow depth of field, moody color grading, filmic contrast, movie scene aesthetic, shot on ARRI Alexa.' },
        { id: 'retrato-estudio', name: 'Retrato de Estudio', promptSuffix: 'Professional studio portrait, softbox lighting, elegant background, sharp eyes, flattering rim light, high-end fashion photography, 85mm lens, creamy bokeh.' },
        { id: 'fotoperiodismo', name: 'Fotoperiodismo', promptSuffix: 'Candid photojournalistic shot, natural available light, authentic real-life moment, documentary realism, 35mm reportage style, true colors.' },
        { id: 'macro', name: 'Macro / Detalle', promptSuffix: 'Extreme macro photography, incredible fine detail, razor-thin depth of field, crisp textures, studio macro lighting, ultra-close-up realism.' },
        { id: 'paisaje-natural', name: 'Paisaje Natural', promptSuffix: 'Breathtaking landscape photograph, golden hour natural light, vast depth of field, rich atmospheric detail, National Geographic quality, ultra-high resolution.' },
        { id: 'nocturna', name: 'Fotografía Nocturna', promptSuffix: 'Night photography, long exposure, glowing city or star lights, deep shadows with rich detail, low-light realism, cinematic night mood.' },
        { id: 'producto', name: 'Foto de Producto', promptSuffix: 'Commercial product photography, clean seamless background, precise studio lighting, glossy accurate reflections, sharp detail, advertising quality.' },
        { id: 'aereo-drone', name: 'Aérea / Dron', promptSuffix: 'Aerial drone photograph, top-down or bird’s-eye view, realistic scale and perspective, crisp high-altitude detail, natural daylight, ultra-high resolution.' }
    ],
    ilustracion: [
        { id: '', name: 'Dibujo / Ilustración', promptSuffix: '' },
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
        { id: '', name: 'Arte / Tradicional', promptSuffix: '' },
        { id: 'acuarela', name: 'Acuarela Artística', promptSuffix: 'Exquisite watercolor painting, soft dreamlike color bleeds, realistic wet-on-wet technique, textured cold-press paper background, delicate artistic touch.' },
        { id: 'oleo', name: 'Pintura al Ã“leo', promptSuffix: 'Masterpiece oil painting on canvas, visible thick impasto brushstrokes, rich oil textures, dramatic chiaroscuro lighting, traditional fine art aesthetic.' },
        { id: 'vintage', name: 'Vintage / Retro', promptSuffix: 'Authentic retro vintage aesthetic, 1970s film grain, faded nostalgic colors, analog photography look, warm lighting, distressed texture.' },
        { id: 'fantasia', name: 'Fantasía Ã‰pica', promptSuffix: 'High fantasy concept art, magical glowing elements, legendary creatures, intricate gold armor, cinematic atmospheric lighting, epic scale.' },
        { id: 'surrealista', name: 'Surrealismo', promptSuffix: 'Surrealist masterpiece, dreamlike impossible landscape, melting objects, bizarre proportions, Dalí-esque subconscious imagery, thought-provoking.' },
        { id: 'gouache', name: 'Gouache Vibrante', promptSuffix: 'Vibrant gouache painting, flat opaque colors, hand-painted matte textures, charming book illustration aesthetic, bold and colorful.' },
        { id: 'acrilico', name: 'Acrílico Moderno', promptSuffix: 'Modern acrylic painting style, bold expressive colors, textured brushwork, high contrast, contemporary art gallery aesthetic.' },
        { id: 'expresionismo', name: 'Expresionismo', promptSuffix: 'Expressionist art style, intense emotional colors, distorted forms for dramatic impact, raw energetic brushstrokes, soul-stirring composition.' },
        { id: 'realismo', name: 'Realismo Pictórico', promptSuffix: 'Sophisticated painterly realism, focus on lighting and atmosphere, accurate proportions with visible artistic brushstrokes, high-end fine art.' },
        { id: 'impresionismo', name: 'Impresionismo', promptSuffix: 'Impressionist masterpiece, small thin visible brushstrokes, emphasis on light qualities, vibrant unmixed colors, capturing the fleeting movement.' }
    ],
    digital: [
        { id: '', name: 'Digital / 3D', promptSuffix: '' },
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
        { id: '', name: 'Gráfico / Moderno', promptSuffix: '' },
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

// Resolución de salida (SOLO flux-2-max en la app de edición).
// FLUX 2 edita como máx 4 MP (~2048px lado). El 4K real (4096) se logra
// haciendo upscale client-side x2 desde los 2048 nativos.
const RESOLUTION_OPTIONS = [
    { id: '512', label: '512px', calidad: 'pro', targetPx: 512, downloadPx: 512 },
    { id: '1K-hd', label: '1.024px', calidad: 'pro', targetPx: 1024, downloadPx: 1024 },
    { id: '2K', label: '2.048px', calidad: 'pro', targetPx: 2048, downloadPx: 2048 },
    { id: '4K', label: '4.096px', calidad: 'pro', targetPx: 2048, downloadPx: 4096 },
];

const PROMPT_FIELD_DEFINITIONS = [
    {
        id: 'subject',
        generateLabel: 'Sujeto',
        editLabel: 'Acción',
        generatePlaceholder: 'Ej: mujer astronauta, robot, producto, paisaje...',
        editPlaceholder: 'Ej: cambiar, eliminar, añadir, transformar...',
        generateHelp: 'Describe el protagonista o elemento principal de la imagen que quieres crear desde cero.',
        generateExample: 'Un robot explorador pequeño con mochila y casco transparente.',
        editHelp: 'Indica qué quieres que haga la IA sobre la imagen subida: cambiar algo, añadir un elemento, quitarlo, mejorar la luz o transformar el estilo.',
        editExample: 'Cambiar el cielo gris por un atardecer cálido sin tocar a la persona.'
    },
    {
        id: 'action',
        generateLabel: 'Acción',
        editLabel: 'Elemento específico a cambiar/editar',
        generatePlaceholder: 'Ej: caminando, posando, volando, explorando...',
        editPlaceholder: 'Ej: personaje principal, fondo, objeto central...',
        generateHelp: 'Explica qué está haciendo el sujeto o qué situación debe ocurrir en la imagen generada.',
        generateExample: 'Caminando por una calle mojada mientras mira luces de neón.',
        editHelp: 'Especifica qué parte concreta de la imagen existente debe modificarse para evitar cambios innecesarios.',
        editExample: 'Solo el fondo, manteniendo el rostro y la ropa intactos.'
    },
    {
        id: 'background',
        generateLabel: 'Fondo',
        editLabel: 'Elemento nuevo',
        generatePlaceholder: 'Ej: bosque, ciudad futurista, estudio blanco...',
        editPlaceholder: 'Ej: luces neón, flores, un castillo lejano...',
        generateHelp: 'Indica el entorno, escenario o contexto visual donde debe aparecer el sujeto.',
        generateExample: 'Una ciudad futurista nocturna con lluvia y reflejos en el suelo.',
        editHelp: 'Describe el nuevo elemento que quieres añadir o usar como sustitución dentro de la imagen existente.',
        editExample: 'Añadir un lazo rojo en el pelo de la niña.'
    },
    {
        id: 'visualStyle',
        generateLabel: 'Estilo',
        editLabel: 'Estilo',
        generatePlaceholder: 'Ej: realista, anime, acuarela, cyberpunk...',
        editPlaceholder: 'Ej: realista, anime, acuarela, cyberpunk...',
        generateHelp: 'Indica el estilo artístico de la imagen nueva: realista, editorial, anime, 3D, acuarela, cyberpunk, minimalista, etc.',
        generateExample: 'Estilo 3D cinematográfico, iluminación de estudio y mucho detalle.',
        editHelp: 'Indica si quieres conservar el estilo original o transformar la imagen a un estilo concreto. También puedes usar el Panel de Estilos de abajo.',
        editExample: 'Convertir la foto en una ilustración acuarela manteniendo la composición.'
    },
    {
        id: 'lighting',
        generateLabel: 'Iluminación',
        editLabel: 'Efecto deseado',
        generatePlaceholder: 'Ej: luz dorada, neón, contraluz, estudio...',
        editPlaceholder: 'Ej: épico, elegante, luminoso, mágico...',
        generateHelp: 'Define la luz de la escena: hora del día, tipo de iluminación, sombras, ambiente o color dominante.',
        generateExample: 'Luz dorada de atardecer, sombras suaves y reflejos cinematográficos.',
        editHelp: 'Describe el resultado final que buscas al editar: cambio de luz, color, ambiente, acabado o impacto visual.',
        editExample: 'Hacer la imagen más elegante y luminosa, con tonos dorados.'
    },
    {
        id: 'details',
        generateLabel: 'Detalles',
        editLabel: 'Detalles relevantes',
        generatePlaceholder: 'Ej: formato, colores, cámara, evitar texto...',
        editPlaceholder: 'Ej: formato, colores, evitar texto, conservar rasgos...',
        generateHelp: 'Añade instrucciones importantes para la imagen nueva: colores, composición, encuadre, elementos a evitar, proporciones o texto no deseado.',
        generateExample: 'Sin texto, composición centrada, colores azul y dorado, fondo limpio.',
        editHelp: 'Añade restricciones para proteger partes de la imagen: qué conservar, qué no tocar, colores concretos o instrucciones extra.',
        editExample: 'Mantener el rostro igual, no cambiar la pose y conservar el encuadre original.'
    }
];

const createInitialPromptFields = (details = '') => PROMPT_FIELD_DEFINITIONS.reduce((acc, field) => {
    acc[field.id] = field.id === 'details' ? details : '';
    return acc;
}, {});

const getPromptFieldLabel = (field, mode) => mode === 'remix' ? field.editLabel : field.generateLabel;
const getPromptFieldPlaceholder = (field, mode) => `${getPromptFieldLabel(field, mode)}??`;

const buildStructuredPrompt = (fields, mode) => PROMPT_FIELD_DEFINITIONS
    .map((field) => {
        const value = (fields[field.id] || '').trim();
        return value ? `${getPromptFieldLabel(field, mode)}: ${value}` : '';
    })
    .filter(Boolean)
    .join('\n');

// --- SERVICES (ORIGINAL LOGIC) ---
const PROXY_URL = './proxy.php';
const HISTORY_URL = './history.php';

// --- SERVER PERSISTENCE (sync híbrido: localStorage caché + servidor fuente) ---
const syncToServer = async (image) => {
    try {
        const res = await fetch(HISTORY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: image.id,
                prompt: image.prompt,
                style: image.style,
                aspectRatio: image.aspectRatio,
                size: image.size,
                calidad: image.calidad,
                targetPx: image.targetPx || null,
                downloadPx: image.downloadPx || null,
                createdAt: image.createdAt,
                imageData: image.url
            })
        });
        if (!res.ok) console.warn('Sync server falló:', res.status);
    } catch (e) { console.warn('Error syncing al servidor:', e); }
};

const deleteFromServer = async (id) => {
    try {
        await fetch(HISTORY_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
    } catch (e) { console.warn('Error eliminando del servidor:', e); }
};

const clearServerHistory = async () => {
    try {
        await fetch(HISTORY_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clearAll: true })
        });
    } catch (e) { console.warn('Error limpiando servidor:', e); }
};

const loadFromServer = async () => {
    try {
        const res = await fetch(HISTORY_URL);
        if (!res.ok) return [];
        const data = await res.json();
        return data?.items || [];
    } catch (e) { console.warn('Error cargando del servidor:', e); return []; }
};

const mergeHistory = (localItems, serverItems) => {
    const localMap = new Map(localItems.map(item => [item.id, item]));
    for (const s of serverItems) {
        if (!localMap.has(s.id)) {
            localMap.set(s.id, { ...s, url: s.imageUrl || s.url });
        }
    }
    return Array.from(localMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

// Llama al proxy en modo FLUX (imágenes). Contrato: {prompt, calidad, aspectRatio, targetPx, imagen?}
// -> {success, imageUrl (data URL), coste, modelo, calidad, width, height}
const callFlux = async ({ prompt, calidad, aspectRatio, targetPx, imagen }) => {
    const body = { prompt, calidad, aspectRatio, targetPx };
    if (imagen) body.imagen = imagen;
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        let msg = `Error ${response.status}`;
        try { const j = await response.json(); msg = j?.error?.message || msg; }
        catch (e) { msg = `${msg}: ${await response.text()}`; }
        throw new Error(msg);
    }
    const data = await response.json();
    if (!data.success || !data.imageUrl) {
        throw new Error(data?.error?.message || 'FLUX no devolvió imagen');
    }
    return data.imageUrl;
};

// Upscale client-side (para la descarga 4K desde el máximo nativo de FLUX, 4MP)
const upscaleImage = (dataUrl, targetMaxSide = 4096) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width <= 0 || height <= 0) { resolve(dataUrl); return; }
            const scale = targetMaxSide / Math.max(width, height);
            if (scale <= 1) { resolve(dataUrl); return; } // ya es suficiente
            const w = Math.round(width * scale);
            const h = Math.round(height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

const generateImage = async (params) => {
    let basePrompt = (params.prompt || '').trim();
    const styleSuffix = (params.styleSuffix || '').trim();
    const fullStylePrompt = `${basePrompt} ${styleSuffix}`.trim();

    let finalPrompt = '';
    if (params.sourceImage) {
        if (fullStylePrompt) {
            finalPrompt = `Transform this image into the following style and content: ${fullStylePrompt}. Keep a complete, high-quality result in ${params.aspectRatio} format.`;
        } else {
            finalPrompt = `Recreate this image as a complete, natural, high-quality result, maintaining its original style and context, in ${params.aspectRatio} format.`;
        }
    } else {
        finalPrompt = fullStylePrompt || 'A beautiful high-quality image';
    }

    const imageUrl = await callFlux({
        prompt: finalPrompt,
        calidad: params.calidad || 'normal',
        aspectRatio: params.aspectRatio,
        targetPx: params.targetPx || 1024,
        imagen: params.sourceImage || undefined
    });

    // Descarga a 4K real: upscale client-side desde el nativo (máx 4MP de FLUX)
    if (params.downloadPx && params.downloadPx > (params.targetPx || 1024)) {
        return await upscaleImage(imageUrl, params.downloadPx);
    }
    return imageUrl;
};

const editImageConversation = async (params) => {
    const imageUrl = await callFlux({
        prompt: params.instruction,
        calidad: params.calidad || 'normal',
        aspectRatio: params.aspectRatio,
        targetPx: params.targetPx || 1024,
        imagen: params.originalImage
    });
    if (params.downloadPx && params.downloadPx > (params.targetPx || 1024)) {
        return await upscaleImage(imageUrl, params.downloadPx);
    }
    return imageUrl;
};

// --- COMPONENTS ---
const ApiKeyChecker = ({ children }) => <>{children}</>;

const LoadingOverlay = () => (
    <div className="loading-overlay">
        <div className="spinner-triple">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
        </div>
        <p className="loading-text">IA Generando Obra Maestra...</p>
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

const StructuredPromptFields = ({ fields, onChange, mode }) => {
    const isEditMode = mode === 'remix';

    return (
        <div className="structured-prompt-panel">
            {PROMPT_FIELD_DEFINITIONS.map((field) => (
                <div key={field.id} className="prompt-field-wrap group/field">
                    <label htmlFor={`prompt-${field.id}`} className="sr-only">{getPromptFieldLabel(field, mode)}</label>
                    <input
                        id={`prompt-${field.id}`}
                        type="text"
                        value={fields[field.id] || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        placeholder={getPromptFieldPlaceholder(field, mode)}
                        aria-describedby={`prompt-help-${field.id}`}
                        className="structured-prompt-input"
                    />
                    <div id={`prompt-help-${field.id}`} role="tooltip" className="prompt-tooltip">
                        <span className="prompt-tooltip-title">{getPromptFieldLabel(field, mode)}</span>
                        <span>{isEditMode ? field.editHelp : field.generateHelp}</span>
                        <span className="prompt-tooltip-example">
                            Ejemplo {isEditMode ? 'edición' : 'generación'}: {isEditMode ? field.editExample : field.generateExample}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ImageCard = ({ image, onDelete, onRegenerate, onEdit, onClick, onHdDownload }) => {
    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `flux-studio-${image.id}.jpg`;
        link.click();
    };
    const handleHdDownload = (e) => {
        e.stopPropagation();
        onHdDownload(image);
    };

    return (
        <div onClick={() => onClick && onClick(image)} className="group relative glass rounded-[2.5rem] overflow-hidden flex flex-col glass-hover cursor-zoom-in border-white/10 shadow-2xl">
            <div className="absolute top-4 left-4 z-10">
                <div className="px-3 py-1 glass rounded-full text-[9px] font-bold uppercase tracking-widest text-white/90 border-white/5 backdrop-blur-md">
                    {image.style.name} | {image.aspectRatio}
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
                            <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-tighter">Nuevas</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); onEdit(image); }} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center group-hover/btn:bg-purple-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
                                <MessageSquare className="text-purple-400" size={16} />
                            </div>
                            <span className="text-[8px] font-bold text-purple-200 uppercase tracking-tighter">Variar</span>
                        </button>

                        <button onClick={handleDownload} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center group-hover/btn:bg-slate-700 group-hover/btn:scale-110 transition-all shadow-lg">
                                <Download className="text-slate-200" size={16} />
                            </div>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Bajar</span>
                        </button>

                        <button onClick={handleHdDownload} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center group-hover/btn:bg-amber-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
                                <Download className="text-amber-400" size={16} />
                            </div>
                            <span className="text-[8px] font-bold text-amber-300 uppercase tracking-tighter">HD</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); onDelete(image.id); }} className="flex flex-col items-center gap-1.5 group/btn">
                            <div className="w-9 h-9 rounded-full bg-red-900/40 border border-red-500/50 flex items-center justify-center group-hover/btn:bg-red-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
                                <Trash2 className="text-red-400" size={16} />
                            </div>
                            <span className="text-[8px] font-bold text-red-300 uppercase tracking-tighter">Quitar</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-900/80 backdrop-blur-md flex flex-col gap-1 border-t border-white/5">
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight italic">
                    {image.prompt}
                </p>
                <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                    {new Date(image.createdAt).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

const Splash = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12">
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4">
            <h1 className="text-6xl md:text-8xl font-extrabold gradient-text tracking-tight uppercase">Diseña como un Pro</h1>
            <p className="text-gray-300 text-lg md:text-2xl font-light max-w-2xl mx-auto">
                <span className="neon-text font-semibold">Edición/Generación de Imágenes</span>
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            <a href="?mode=edit" className="group glass glass-hover relative p-12 rounded-[3rem] text-left space-y-4 overflow-hidden border-purple-500/30 block">
                <div className="absolute top-0 right-0 p-8 text-purple-500/10 transform group-hover:scale-150 group-hover:rotate-12 transition-transform duration-700">
                    <ImageIcon size={200} />
                </div>
                <div className="bg-purple-500/20 w-16 h-16 rounded-2xl flex items-center justify-center text-purple-400 mb-6 border border-purple-500/30">
                    <Wand2 size={32} />
                </div>
                <h2 className="text-4xl font-bold">Editar Imagen</h2>
                <p className="text-gray-400 text-lg leading-relaxed">Edita imágenes existentes con la máxima calidad de FLUX (flux-2-max).</p>
            </a>
            <a href="../generar_copia/" className="group glass glass-hover relative p-12 rounded-[3rem] text-left space-y-4 overflow-hidden border-cyan-500/30 block">
                <div className="absolute top-0 right-0 p-8 text-cyan-500/10 transform group-hover:scale-150 group-hover:-rotate-12 transition-transform duration-700">
                    <Sparkles size={200} />
                </div>
                <div className="bg-cyan-500/20 w-16 h-16 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/30">
                    <Sparkles size={32} />
                </div>
                <h2 className="text-4xl font-bold">Generar Imágenes</h2>
                <p className="text-gray-400 text-lg leading-relaxed">Genera imágenes desde una descripción de texto.</p>
            </a>
        </div>
    </div>
);

const STORAGE_KEY = 'flux_editar_studio_history';

// --- APP MAIN ---
const App = () => {
    // Si la URL trae ?mode=edit, entramos directos al editor (enlace nativo -> sin doble clic).
    const _startInEditor = (typeof window !== 'undefined' && /[?&]mode=edit\b/.test(window.location.search));
    const [view, setView] = useState(_startInEditor ? 'editor' : 'splash');
    const [mode, setMode] = useState('remix');
    const [promptFields, setPromptFields] = useState(() => createInitialPromptFields());
    const [selectedStyle, setSelectedStyle] = useState(STYLE_GROUPS.fotografico[1]);
    const [selectedAR, setSelectedAR] = useState(AspectRatio.SQUARE);
    const [images, setImages] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { console.warn('Error cargando historial:', e); }
        return [];
    });

    // Persistencia: guardar historial al cambiar (máx 50 items en local)
    useEffect(() => {
        try {
            const toSave = images.slice(0, 50);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) { console.warn('Error guardando historial:', e); }
    }, [images]);

    // Al montar: cargar del servidor y fusionar con localStorage
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                const localItems = saved ? (JSON.parse(saved) || []) : [];
                const serverItems = await loadFromServer();
                if (cancelled) return;
                // Forma funcional: no captura 'images' en clausura, así este
                // update asíncrono no compite con otros cambios de estado (p.ej. la
                // transición splash->editor) que pisaban el primer clic.
                setImages(prev => {
                    const merged = mergeHistory((prev && prev.length ? prev : localItems), serverItems);
                    return merged.length ? merged : prev;
                });
            } catch (e) { console.warn('Error en sync inicial:', e); }
        })();
        return () => { cancelled = true; };
    }, []); // solo al montar
    const [remixSource, setRemixSource] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editImage, setEditImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [error, setError] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [originalImageAR, setOriginalImageAR] = useState(AspectRatio.SQUARE);
    const [imageSize, setImageSize] = useState(RESOLUTION_OPTIONS[0]);

    const fileInputRef = useRef(null);

    // Si entramos directos al editor por ?mode=edit, abrir el selector de archivo al montar.
    useEffect(() => {
        if (_startInEditor) {
            const t = setTimeout(() => fileInputRef.current?.click(), 300);
            return () => clearTimeout(t);
        }
    }, []);

    const handleStart = (m) => {
        // App de EDICIÓN: solo modo 'remix'. La generación vive en generar_copia.
        setMode('remix');
        setView('editor');
        setTimeout(() => fileInputRef.current?.click(), 100);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            const img = new Image();
            img.onload = async () => {
                const detectedAR = getClosestAspectRatio(img.width, img.height);
                setSelectedAR(detectedAR);
                setOriginalImageAR(detectedAR);
                // Limitar la imagen de entrada a <=2048px de lado (tope 4MP de FLUX)
                const clamped = await clampInputImage(f.target.result, 2048);
                setRemixSource(clamped);
            };
            img.src = f.target.result;
        };
        reader.readAsDataURL(file);
    };

    const currentPrompt = buildStructuredPrompt(promptFields, mode);

    const updatePromptField = (fieldId, value) => {
        setPromptFields(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleGenerate = async (finalPrompt = currentPrompt) => {
        const effectivePrompt = finalPrompt.trim() || (mode === 'remix' && remixSource ? ' ' : '');
        if (!effectivePrompt && !(mode === 'remix' && remixSource)) return;
        setIsGenerating(true);
        setError(null);
        try {
            const styleSuffix = selectedStyle.promptSuffix;
            const imageUrl = await generateImage({
                prompt: effectivePrompt,
                styleSuffix,
                aspectRatio: selectedAR,
                calidad: imageSize.calidad,
                targetPx: imageSize.targetPx,
                downloadPx: imageSize.downloadPx,
                sourceImage: mode === 'remix' ? (remixSource || undefined) : undefined
            });

            const newImage = {
                id: Math.random().toString(36).substring(7),
                url: imageUrl,
                prompt: effectivePrompt || 'Remezcla',
                style: selectedStyle,
                aspectRatio: selectedAR,
                size: imageSize.label,
                calidad: imageSize.calidad,
                targetPx: imageSize.targetPx,
                downloadPx: imageSize.downloadPx,
                createdAt: Date.now()
            };

            setImages(prev => [newImage, ...prev]);
            syncToServer(newImage); // persistir en servidor (fuego-y-olvido)
        } catch (err) {
            setError(err.message || "Error de generación");
        } finally {
            setIsGenerating(false);
            // Se conservan los campos del prompt, estilo y formato para poder
            // repetir con el mismo prompt cambiando otras opciones.
        }
    };

    const handleDelete = (id) => {
        setImages(images.filter(img => img.id !== id));
        deleteFromServer(id);
    };
    const handleClearHistory = () => { if (window.confirm('¿Deseas eliminar todo el historial?')) { setImages([]); try { localStorage.removeItem(STORAGE_KEY); } catch(e) {} clearServerHistory(); } };
    const handleRegenerate = (img) => {
        setPromptFields(createInitialPromptFields(img.prompt));
        setSelectedStyle(img.style);
        setSelectedAR(img.aspectRatio);
        handleGenerate(img.prompt);
    };
    const handleHdDownload = async (img) => {
        setIsGenerating(true);
        setError(null);
        try {
            // Descarga HD: upscale client-side de la imagen guardada hasta 4K (4096px lado).
            // FLUX genera como máx 4MP (~2048); el escalado x2 entrega un 4K listo para imprimir/descargar.
            const hdUrl = await upscaleImage(img.url, 4096);
            const link = document.createElement('a');
            link.href = hdUrl;
            link.download = `flux-hd-${img.id}.jpg`;
            link.click();
        } catch (err) {
            setError("Error HD: " + (err.message || ''));
        } finally {
            setIsGenerating(false);
        }
    };
    const handleOpenEdit = (img) => {
        setEditImage(img);
        setEditInstruction('');
    };

    const handleEditSubmit = async () => {
        if (!editImage || !editInstruction.trim()) return;
        setIsGenerating(true);
        try {
            const updatedUrl = await editImageConversation({
                originalImage: editImage.url,
                instruction: editInstruction,
                aspectRatio: editImage.aspectRatio,
                calidad: editImage.calidad || 'normal',
                targetPx: editImage.targetPx || 1024,
                downloadPx: editImage.downloadPx
            });
            const updatedImage = { ...editImage, id: Math.random().toString(36).substring(7), url: updatedUrl, createdAt: Date.now() };
            setImages([updatedImage, ...images]);
            syncToServer(updatedImage);
            setEditImage(null);
        } catch (err) { setError("Error de edición"); } finally { setIsGenerating(false); }
    };

    const isGenerateDisabled = isGenerating || (mode === 'text-to-image' && !currentPrompt.trim()) || (mode === 'remix' && !remixSource);

    return (
        <ApiKeyChecker>
            {isGenerating && <LoadingOverlay />}
            <div className="min-h-screen custom-scrollbar overflow-y-auto">
                {view === 'splash' ? (
                    <Splash />
                ) : (
                    <div className="flex flex-col lg:flex-row min-h-screen">
                        <aside className="lg:w-[440px] glass border-r border-white/5 lg:sticky lg:top-0 lg:h-screen overflow-y-auto p-10 space-y-10 custom-scrollbar flex flex-col z-20">
                            <div className="flex items-center justify-between shrink-0">
                                <button onClick={() => { setView('splash'); if (typeof window !== 'undefined' && window.location.search) window.history.replaceState(null, '', window.location.pathname); }} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest">
                                    <ChevronLeft size={16} /> <span>Volver</span>
                                </button>
                            </div>

                            {mode === 'remix' && (
                                <div className="space-y-4 animate-in">
                                    <label className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">Imagen a Editar</label>
                                    <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer border-2 border-dashed border-purple-500/30 rounded-[2.5rem] overflow-hidden aspect-video flex items-center justify-center bg-slate-900/40 hover:border-purple-500 transition-all">
                                        {remixSource ? <img src={remixSource} className="w-full h-full object-cover" /> : <div className="text-purple-400 flex flex-col items-center gap-2"><Upload size={24} /><span className="text-[10px] font-bold uppercase">Sube Imagen</span></div>}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Quieres añadir algo??</label>
                                <StructuredPromptFields
                                    fields={promptFields}
                                    onChange={updatePromptField}
                                    mode={mode}
                                />
                            </div>

                            <div className="space-y-6">
                                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Panel de Estilos</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomSelect
                                        options={STYLE_GROUPS.fotografico}
                                        value={STYLE_GROUPS.fotografico.some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                        onChange={(id) => id ? setSelectedStyle(STYLE_GROUPS.fotografico.find(s => s.id === id)) : setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' })}
                                    />
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
                                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Formato de Salida</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {ASPECT_RATIOS.map((ar) => (
                                        <button
                                            key={ar.id}
                                            onClick={() => setSelectedAR(ar.id)}
                                            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedAR === ar.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'border-white/10 bg-white/5 text-gray-200 hover:border-cyan-500/40 hover:text-cyan-300'}`}
                                        >
                                            <div className="flex items-center justify-center">{ar.icon}</div>
                                            <span className="text-[9px] font-bold tracking-tighter">{ar.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Resolución de Salida</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {RESOLUTION_OPTIONS.map((res) => (
                                        <button
                                            key={res.id}
                                            onClick={() => setImageSize(res)}
                                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${imageSize.id === res.id ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'border-white/10 bg-white/5 text-gray-200 hover:border-cyan-500/40 hover:text-cyan-300'}`}
                                        >
                                            <span className="text-[10px] font-bold tracking-tighter">{res.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 order-last">
                                <button onClick={() => handleGenerate()} disabled={isGenerateDisabled} className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold rounded-[2rem] flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(46,232,255,0.3)] btn-3d disabled:opacity-20">
                                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    {isGenerating ? 'PROCESANDO...' : (mode === 'text-to-image' ? 'GENERAR IMAGEN' : 'GENERAR EDICIÓN')}
                                </button>
                                {error && <p className="text-red-400 text-[10px] text-center mt-4 font-bold uppercase tracking-widest">{error}</p>}
                            </div>
                        </aside>

                        <main className="flex-1 p-10 lg:p-20 overflow-y-auto custom-scrollbar">
                            <div className="max-w-7xl mx-auto space-y-16">
                                <div className="flex items-end justify-between">
                                    <div className="space-y-2">
                                        <h2 className="text-4xl font-bold tracking-tight">{mode === 'text-to-image' ? 'Historial de Imágenes Generadas' : 'Historial de Imágenes Editadas'}</h2>
                                        <p className="text-gray-400 font-medium">{mode === 'text-to-image' ? 'Controla y revisa tus creaciones visuales generadas en tiempo real.' : 'Controla y refina tus creaciones visuales en tiempo real.'}</p>
                                    </div>
                                    <button onClick={handleClearHistory} className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest border border-red-500/20">
                                        <Trash2 size={16} /> LIMPIAR TODO
                                    </button>
                                </div>

                                {images.length === 0 ? (
                                    <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6 animate-in">
                                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-gray-700 border border-white/5 shadow-inner">
                                            <ImageIcon size={48} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-gray-400 tracking-tight">No hay imágenes aún</h3>
                                            <p className="text-gray-400 max-w-sm mx-auto">Comienza por describir tu idea en el panel lateral.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                        {images.map((img) => (
                                            <ImageCard key={img.id} image={img} onDelete={handleDelete} onRegenerate={handleRegenerate} onEdit={handleOpenEdit} onClick={setLightboxImage} onHdDownload={handleHdDownload} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </main>

                        {lightboxImage && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl cursor-zoom-out" onClick={() => setLightboxImage(null)}>
                                <div className="relative w-full h-full flex flex-col items-center justify-center">
                                    <img src={lightboxImage.url} className="w-full h-full object-contain" />
                                    <div className="absolute bottom-8 glass px-8 py-4 rounded-full flex gap-10 text-[11px] font-bold text-gray-400 tracking-widest uppercase" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={(e) => { e.stopPropagation(); handleHdDownload(lightboxImage); }} className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full hover:bg-amber-500/40 transition-all">
                                            <Download size={12} className="text-amber-400" />
                                            <span className="text-amber-300 text-[10px]">HD</span>
                                        </button>
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
                                            <button onClick={handleEditSubmit} disabled={isGenerating || !editInstruction.trim()} className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold rounded-[2rem] flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(46,232,255,0.3)] btn-3d disabled:opacity-20">
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

const root = createRoot(document.getElementById('root'));
root.render(<App />);

