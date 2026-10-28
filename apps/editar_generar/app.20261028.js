const ReactObj = window.React || {};
const { useState, useRef, useEffect, useLayoutEffect, Fragment } = ReactObj;
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
const Copy = (p) => <Icon name="copy" {...p} />;
const Check = (p) => <Icon name="check" {...p} />;

// --- CONSTANTES ---
const AspectRatio = { SQUARE: '1:1', PORTRAIT: '3:4', WIDE: '16:9', TALL: '9:16', ULTRAWIDE: '21:9' };

const MODEL_LABELS = {
    'openai-medium': 'MEDIUM',
    'openai-high': 'HIGH',
    'openai-xhigh': 'XHIGH',
    'openai-max-flare': 'MAX FLARE',
    'openai-max-sunburst': 'MAX SUNBURST',
    'openai-image-2-low': 'LOW',
    'openai-image-2': 'IMAGE 2',
    'openai-image-2-high': 'IMAGE 2 HIGH',
    'gemini-2': 'GEMINI 2',
    'gemini-flash': '3.1 FLASH',
    'gemini-pro': '3 PRO',
    'qwen-pro': 'QWEN 3 PRO',
    'flow-nano-banana-2': 'NANO BANANA 2',
    'flow-nano-banana-pro': 'NANO BANANA PRO',
    'flow-nano-banana-2-lite': 'NANO BANANA 2 LITE',
    'upscaler': 'UPSCALER'
};
const getModelLabel = (m) => MODEL_LABELS[m] || m || '—';

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

// --- UPSCALER LOCAL (2K / 4K / 8K) ---
// Amplía con remuestreo progresivo por pasos de 2x (evita el aliasing de un
// único drawImage) y aplica un enfoque suave (unsharp mask) al final. El
// archivo de salida tiene las dimensiones reales solicitadas.
const loadImageElement = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para ampliarla.'));
    img.src = src;
});

const sharpenCanvas = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    // Por encima de ~48 MP el enfoque exige demasiada memoria: se omite.
    if (width * height > 48000000) return;
    const ctx = canvas.getContext('2d');
    const frame = ctx.getImageData(0, 0, width, height);
    const src = frame.data;
    const out = new Uint8ClampedArray(src.length);
    const amount = 0.32;
    const center = 1 + 4 * amount;
    const stride = width * 4;
    for (let y = 0; y < height; y++) {
        const row = y * stride;
        for (let x = 0; x < width; x++) {
            const i = row + x * 4;
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                out[i] = src[i];
                out[i + 1] = src[i + 1];
                out[i + 2] = src[i + 2];
                out[i + 3] = src[i + 3];
                continue;
            }
            out[i] = src[i] * center - amount * (src[i - stride] + src[i + stride] + src[i - 4] + src[i + 4]);
            out[i + 1] = src[i + 1] * center - amount * (src[i - stride + 1] + src[i + stride + 1] + src[i - 3] + src[i + 5]);
            out[i + 2] = src[i + 2] * center - amount * (src[i - stride + 2] + src[i + stride + 2] + src[i - 2] + src[i + 6]);
            out[i + 3] = src[i + 3];
        }
    }
    ctx.putImageData(new ImageData(out, width, height), 0, 0);
};

const upscaleDataUrl = async (src, longEdge, onProgress = () => {}) => {
    const img = await loadImageElement(src);
    const sourceWidth = img.naturalWidth;
    const sourceHeight = img.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error('La imagen no tiene dimensiones válidas.');

    // Nunca se reduce: si la imagen ya supera el objetivo se devuelve tal cual.
    const scale = Math.max(1, longEdge / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    let canvas = document.createElement('canvas');
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    let ctx = canvas.getContext('2d');
    // Fondo blanco: evita que un PNG con transparencia acabe en negro al pasar a JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sourceWidth, sourceHeight);
    ctx.drawImage(img, 0, 0);

    const totalSteps = Math.max(1, Math.ceil(Math.log2(Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight))));
    let step = 0;
    while (canvas.width < targetWidth || canvas.height < targetHeight) {
        const nextWidth = Math.min(targetWidth, canvas.width * 2);
        const nextHeight = Math.min(targetHeight, canvas.height * 2);
        const next = document.createElement('canvas');
        next.width = nextWidth;
        next.height = nextHeight;
        const nextCtx = next.getContext('2d');
        nextCtx.imageSmoothingEnabled = true;
        nextCtx.imageSmoothingQuality = 'high';
        nextCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
        canvas = next;
        step++;
        onProgress(Math.min(80, Math.round((step / totalSteps) * 80)), `Ampliando… ${nextWidth}×${nextHeight}`);
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    onProgress(85, 'Aplicando enfoque…');
    sharpenCanvas(canvas);

    onProgress(92, 'Codificando imagen…');
    let quality = 0.92;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    // Presupuesto del historial: 24 MB de imagen como máximo. El data URL en
    // base64 ocupa ~4/3, así que se limita a 20 millones de caracteres.
    const MAX_DATA_URL_CHARS = 20 * 1024 * 1024;
    while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.55) {
        quality -= 0.07;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return { dataUrl, width: canvas.width, height: canvas.height, quality };
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
    ],
    fotografia: [
        { id: '', name: '📷 Foto / Cine', promptSuffix: '' },
        { id: 'fotorrealismo', name: 'Fotorrealismo Ultra', promptSuffix: 'Hyper-photorealistic image, ultra-detailed skin and material textures, natural true-to-life lighting, shot on a professional full-frame camera with razor-sharp focus, no artistic filters, no digital artifacts.' },
        { id: 'cinematografico', name: 'Cinematográfico', promptSuffix: 'Cinematic film still, anamorphic widescreen framing, dramatic lighting, shallow depth of field, teal and orange color grade, subtle film grain, blockbuster movie production quality.' },
        { id: 'noir', name: 'Noir / Cine Negro', promptSuffix: 'Classic film noir aesthetic, dramatic chiaroscuro lighting, deep black shadows, hard light through venetian blinds, moody 1940s detective atmosphere, high-contrast monochrome.' },
        { id: 'documental', name: 'Documental / Periodístico', promptSuffix: 'Authentic documentary photography, natural available light, candid unposed realism, photojournalistic composition, genuine emotion, minimal post-processing, honest street reportage.' },
        { id: 'retrato-estudio', name: 'Retrato de Estudio', promptSuffix: 'Professional studio portrait photography, softbox key lighting, seamless background, crisp catchlights in the eyes, flawless skin rendering, high-end commercial photography.' },
        { id: 'moda-editorial', name: 'Moda Editorial', promptSuffix: 'High-fashion editorial photography, magazine cover aesthetic, dramatic poses, avant-garde styling, studio strobes, premium retouched look, Vogue-style glamour.' },
        { id: 'naturaleza', name: 'Naturaleza Salvaje', promptSuffix: 'Award-winning nature photography, National Geographic style, stunning golden hour light, tack-sharp wildlife and landscape detail, breathtaking composition.' },
        { id: 'analogica', name: 'Película Analógica', promptSuffix: 'Authentic 35mm analog film photography, Kodak Portra color palette, natural film grain, soft halation, nostalgic photochemical look, classic film camera.' },
        { id: 'bn-clasico', name: 'Blanco y Negro Clásico', promptSuffix: 'Timeless black and white photography, masterful tonal range, deep blacks and soft highlights, fine-art monochrome, Ansel Adams style.' },
        { id: 'polaroid', name: 'Instantánea Polaroid', promptSuffix: 'Vintage instant camera photo, Polaroid aesthetic, faded pastel tones, slight vignetting, authentic retro snapshot with the classic white frame.' },
        { id: 'street', name: 'Street Photography', promptSuffix: 'Captivating street photography, candid urban moments, decisive-moment composition, natural shadows and light, gritty authentic city atmosphere.' },
        { id: 'aerea', name: 'Aérea / Drone', promptSuffix: 'Breathtaking aerial drone photography, top-down perspective, stunning landscape patterns, crisp detail from above, golden hour light.' },
        { id: 'macro', name: 'Macro Fotografía', promptSuffix: 'Extreme macro photography, incredible fine detail, tiny world perspective, beautiful creamy bokeh, sharp focus on delicate textures.' },
        { id: 'sci-fi-cine', name: 'Sci-Fi Cinematográfico', promptSuffix: 'Epic sci-fi cinematic still, futuristic production design, atmospheric volumetric lighting, holographic accents, anamorphic lens flares, blockbuster VFX quality.' },
        { id: 'epico', name: 'Épico / Blockbuster', promptSuffix: 'Epic cinematic blockbuster still, grand scale, sweeping vistas, dramatic storm clouds, hero lighting, breathtaking visual effects, IMAX quality.' },
        { id: 'terror-cine', name: 'Terror Cinematográfico', promptSuffix: 'Atmospheric horror film still, eerie low-key lighting, creeping fog and deep shadows, unsettling composition, dark moody color palette, psychological tension.' },
        { id: 'western', name: 'Western Clásico', promptSuffix: 'Classic western film aesthetic, dusty frontier landscapes, warm sepia tones, dramatic desert light, rugged authentic atmosphere, golden hour cowboy cinematography.' }
    ]
};

const ASPECT_RATIOS = [
    { id: AspectRatio.SQUARE, name: '1:1', icon: <Square size={18} /> },
    { id: AspectRatio.PORTRAIT, name: '3:4', icon: <RectangleVertical size={18} /> },
    { id: AspectRatio.WIDE, name: '16:9', icon: <Monitor size={18} /> },
    { id: AspectRatio.TALL, name: '9:16', icon: <Smartphone size={18} /> },
    { id: AspectRatio.ULTRAWIDE, name: '21:9', icon: <Smartphone size={18} /> },
];

// Resolución de salida (lado largo). Valores admitidos por el contrato canónico
// (ag_image_size): 512, 1024, 2048 y 4096. OpenAI aplica su presupuesto de
// píxeles (mínimo 1 MP, tope 4 MP), así que 512 acaba en 1 MP y 4096 en el tope.
const RESOLUTIONS = [512, 1024, 2048, 4096];

// Cantidad de imágenes por generación. El proxy devuelve una imagen por
// llamada, así que N imágenes son N generaciones consecutivas.
const IMAGE_COUNTS = [1, 2, 3, 4];

// Upscaler: lado largo real de salida. 2K/4K/8K son ampliaciones locales de alta
// calidad (remuestreo progresivo + enfoque); no añaden detalle que no exista en
// el origen, pero el archivo resultante sí tiene esas dimensiones.
const UPSCALE_TARGETS = [
    { id: 2048, label: '2K', longEdge: 2048 },
    { id: 3840, label: '4K', longEdge: 3840 },
    { id: 7680, label: '8K', longEdge: 7680 }
];

// Etiqueta de resolución para la tarjeta y el lightbox. Tolera el valor
// heredado '1K' de las imágenes guardadas antes de existir este selector.
const SIZE_LABELS = { 2048: '2K', 3840: '4K', 4096: '4K', 7680: '8K' };
const getSizeLabel = (size) => {
    const value = String(size === undefined || size === null ? '' : size).trim();
    if (value === '') return '—';
    return SIZE_LABELS[value] || (/^\d+$/.test(value) ? `${value}px` : value);
};

// ── Mejorador de prompt ──────────────────────────────────────────────
// Un único botón («Mejorar prompt») pide a la IA 4 propuestas fieles al texto
// del usuario. Las propuestas quedan visibles y reutilizables (también después
// de generar) para poder compararlas, editarlas y volver a generar.
// En Editar son ángulos de edición de la imagen; en Generar, estilos de
// redacción del prompt.
const FIDELITY_RULES = [
    'REGLA DE FIDELIDAD (obligatoria):',
    '1. Antes de escribir, extrae del texto del usuario los elementos intocables: número de personas, sexo de cada persona (hombre/mujer/niño/niña...), edad aparente, ropa, acción, entorno o lugar concreto, objetos, colores, época y cualquier texto legible.',
    '2. Las 4 variantes conservan EXACTAMENTE esos elementos. Prohibido cambiar el sexo de una persona, el número de personas, el tipo de escenario (una ciudad no se convierte en campo, bosque, playa o desierto), la acción principal ni los objetos clave.',
    '3. No inventes personas, animales, edificios ni objetos que sustituyan a los del usuario. Solo añade detalles que no contradigan: luz, hora, clima, composición, cámara, materiales, textura y profundidad.',
    '4. Si el usuario no concreta algo, elige la opción más neutra y coherente; no la sustituyas por un estereotipo.',
    '5. No inventes texto dentro de la imagen salvo que el usuario lo pida.'
].join('\n');

const TEXT_PROMPT_SYSTEM = [
    'Eres un director creativo experto en prompts para generación de imágenes (OpenAI image 2).',
    'Tu tarea: reescribir la idea del usuario en 4 variantes de prompt en ESPAÑOL.',
    FIDELITY_RULES,
    'Si se adjunta una imagen de referencia, respeta también su sujeto, identidad, composición y colores.',
    'ESTILO: las 4 variantes deben ser creativas y claramente distintas entre sí, pero igual de fieles al contenido:',
    '- Descriptiva: escena completa, rica en detalles visuales.',
    '- Cinematográfica: luz y composición de cine, sin cambiar el contenido.',
    '- Artística: tratamiento pictórico o ilustrado, sin cambiar el contenido.',
    '- Minimalista: esencial y directa, sin cambiar el contenido.',
    'FORMATO: 1 o 2 frases por variante (máximo 55 palabras), sin comillas, sin markdown y sin explicaciones.',
    'Devuelve SOLO un JSON válido: [{"type":"Descriptiva","text":"..."},{"type":"Cinematográfica","text":"..."},{"type":"Artística","text":"..."},{"type":"Minimalista","text":"..."}]'
].join('\n');

const REMIX_PROMPT_SYSTEM = [
    'Eres un editor profesional de imágenes con IA.',
    'Analiza la imagen adjunta y escribe 4 instrucciones de edición en ESPAÑOL.',
    'REGLA DE FIDELIDAD: conserva el sujeto, su identidad y sus rasgos, la ropa, el número de personas, la composición y el escenario principal; no inventes personajes ni cambies el contenido. Cada propuesta modifica solo el aspecto que le toca.',
    'Las 4 propuestas deben ser concretas, visuales y aplicables:',
    '- Iluminación: dirección, calidad y temperatura de la luz, sombras y atmósfera.',
    '- Fondo: escenario y profundidad coherentes con el sujeto.',
    '- Detalles: texturas, materiales, acabados y pequeños elementos.',
    '- Calidad: nitidez, definición, rango dinámico y acabado profesional.',
    'FORMATO: una sola frase por propuesta (máximo 45 palabras), sin comillas, sin markdown y sin explicaciones.',
    'Devuelve SOLO un JSON válido: [{"type":"Iluminación","text":"..."},{"type":"Fondo","text":"..."},{"type":"Detalles","text":"..."},{"type":"Calidad","text":"..."}]'
].join('\n');

const PROMPT_VARIANT_CONFIG = {
    remix: {
        buttonLabel: 'Mejorar instrucción',
        panelLabel: 'Propuestas de edición',
        itemLabel: 'Edición',
        types: ['Iluminación', 'Fondo', 'Detalles', 'Calidad'],
        system: REMIX_PROMPT_SYSTEM
    },
    'text-to-image': {
        buttonLabel: 'Mejorar prompt',
        panelLabel: 'Prompts mejorados',
        itemLabel: 'Prompt',
        types: ['Descriptiva', 'Cinematográfica', 'Artística', 'Minimalista'],
        system: TEXT_PROMPT_SYSTEM
    }
};

const getPromptVariantConfig = (mode) => PROMPT_VARIANT_CONFIG[mode] || PROMPT_VARIANT_CONFIG.remix;

// Sufijos de respaldo: si una propuesta de la IA contradice el texto del
// usuario, se recompone a partir de su idea original para no perder fidelidad.
const VARIANT_REPAIR_SUFFIX = {
    'Descriptiva': ', escena completa y detallada, composición cuidada, iluminación natural, colores coherentes y alto nivel de detalle',
    'Cinematográfica': ', iluminación cinematográfica, plano de cine, profundidad de campo, paleta de color cuidada y acabado fílmico',
    'Artística': ', estilo pictórico con textura de pintura, trazo expresivo y atmósfera artística',
    'Minimalista': ', composición minimalista, elementos esenciales, fondo limpio y líneas claras',
    'Iluminación': ', con iluminación direccional suave, sombras naturales y una atmósfera coherente',
    'Fondo': ', con un fondo más profundo, materiales definidos y coherente con el sujeto',
    'Detalles': ', con texturas y materiales cuidados y pequeños detalles nítidos',
    'Calidad': ', con nitidez alta, definición limpia y acabado profesional'
};

const VARIANT_REPAIR_EDIT = {
    'Iluminación': 'Mejora la iluminación con luz direccional suave, sombras naturales y una atmósfera coherente, manteniendo el sujeto y la composición.',
    'Fondo': 'Mejora el fondo con mayor profundidad y materiales definidos, manteniendo el sujeto y la composición.',
    'Detalles': 'Realza texturas, materiales y pequeños detalles con un acabado realista, manteniendo el sujeto y la composición.',
    'Calidad': 'Mejora la nitidez, la definición y el rango dinámico con un acabado profesional, manteniendo el sujeto y la composición.'
};

const normalizeFidelityText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const fidelityTokens = (value) => {
    const found = normalizeFidelityText(value).match(/[a-z0-9]+/g);
    return new Set(found || []);
};

const FIDELITY_TERMS = {
    male: ['hombre', 'chico', 'nino', 'senor', 'caballero', 'anciano', 'abuelo', 'padre', 'hermano', 'hijo', 'tio', 'sobrino', 'esposo', 'marido', 'novio', 'muchacho', 'chaval', 'varon', 'rey', 'principe', 'duque', 'emperador', 'monje', 'vaquero', 'guerrero', 'nieto'],
    female: ['mujer', 'chica', 'nina', 'senora', 'dama', 'anciana', 'abuela', 'madre', 'hermana', 'hija', 'tia', 'sobrina', 'esposa', 'novia', 'muchacha', 'reina', 'princesa', 'duquesa', 'emperatriz', 'monja', 'vaquera', 'guerrera', 'nieta', 'bailarina', 'actriz'],
    city: ['ciudad', 'urbano', 'urbana', 'rascacielos', 'avenida', 'calle', 'calles', 'semaforo', 'semaforos', 'edificio', 'edificios', 'metro', 'autobus', 'autobuses', 'taxi', 'taxis', 'asfalto', 'trafico', 'plaza', 'plazas'],
    nature: ['campo', 'bosque', 'bosques', 'selva', 'desierto', 'playa', 'montana', 'montanas', 'pradera', 'aldea', 'granja', 'valle', 'rio', 'lago', 'isla', 'jungla', 'sabana', 'acantilado', 'acantilados'],
    pluralPeople: ['dos personas', 'tres personas', 'cuatro personas', 'varios hombres', 'varias mujeres', 'dos hombres', 'dos mujeres', 'tres hombres', 'tres mujeres', 'dos ninos', 'tres ninos', 'dos chicos', 'dos chicas', 'una pareja', 'multitud', 'grupo de personas']
};

const hasFidelityTerm = (haystack, tokens, terms) => terms.some((term) => (
    term.indexOf(' ') === -1 ? tokens.has(term) : haystack.indexOf(term) !== -1
));

// Detecta propuestas que contradicen datos esenciales del texto del usuario:
// sexo del sujeto, tipo de escenario y número de personas.
const findFidelityConflicts = (basePrompt, variants) => {
    const base = normalizeFidelityText(basePrompt);
    if (!base.trim()) return [];
    const baseTokens = fidelityTokens(base);
    const maleBase = hasFidelityTerm(base, baseTokens, FIDELITY_TERMS.male);
    const femaleBase = hasFidelityTerm(base, baseTokens, FIDELITY_TERMS.female);
    const cityBase = hasFidelityTerm(base, baseTokens, FIDELITY_TERMS.city);
    const natureBase = hasFidelityTerm(base, baseTokens, FIDELITY_TERMS.nature);
    const pluralBase = hasFidelityTerm(base, baseTokens, FIDELITY_TERMS.pluralPeople);
    const singularBase = /\b(un|una)\b/.test(base) && !pluralBase;
    const conflicts = [];
    variants.forEach((variant, index) => {
        const text = normalizeFidelityText(variant.text);
        const tokens = fidelityTokens(text);
        const maleText = hasFidelityTerm(text, tokens, FIDELITY_TERMS.male);
        const femaleText = hasFidelityTerm(text, tokens, FIDELITY_TERMS.female);
        const cityText = hasFidelityTerm(text, tokens, FIDELITY_TERMS.city);
        const natureText = hasFidelityTerm(text, tokens, FIDELITY_TERMS.nature);
        const pluralText = hasFidelityTerm(text, tokens, FIDELITY_TERMS.pluralPeople);
        if (maleBase && !femaleBase && femaleText && !maleText) {
            conflicts.push({ index, reason: 'cambia un sujeto masculino por uno femenino' });
        }
        if (femaleBase && !maleBase && maleText && !femaleText) {
            conflicts.push({ index, reason: 'cambia un sujeto femenino por uno masculino' });
        }
        if (cityBase && !natureBase && natureText && !cityText) {
            conflicts.push({ index, reason: 'cambia una ciudad por un entorno natural' });
        }
        if (natureBase && !cityBase && cityText && !natureText) {
            conflicts.push({ index, reason: 'cambia un entorno natural por una ciudad' });
        }
        if (singularBase && pluralText) {
            conflicts.push({ index, reason: 'cambia el número de personas del texto original' });
        }
    });
    return conflicts;
};

const buildRepairedVariant = (type, basePrompt, mode) => {
    const base = String(basePrompt || '').trim().replace(/[.\s]+$/, '');
    if (mode === 'remix') {
        return base
            ? `${base}${VARIANT_REPAIR_SUFFIX[type] || ''}.`
            : (VARIANT_REPAIR_EDIT[type] || VARIANT_REPAIR_EDIT['Calidad']);
    }
    const suffix = VARIANT_REPAIR_SUFFIX[type] || VARIANT_REPAIR_SUFFIX['Descriptiva'];
    return base
        ? `${base}${suffix}.`
        : `Imagen fiel a la referencia adjunta${suffix}.`;
};

const cleanPromptVariantItems = (list) => {
    if (!Array.isArray(list)) return [];
    return list
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item, index) => ({
            type: String(item.type || `Opción ${index + 1}`).trim(),
            text: cleanPromptText(item.text)
        }))
        .filter((item) => item.text && !/^\s*[\[{]/.test(item.text) && !/"type"\s*:/.test(item.text))
        .slice(0, 4);
};

const parsePromptVariants = (raw) => {
    let text = String(raw || '').trim();
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();

    const candidates = [];
    const open = text.indexOf('[');
    const close = text.lastIndexOf(']');
    if (open !== -1 && close > open) candidates.push(text.slice(open, close + 1));
    candidates.push(text);
    // El modelo a veces devuelve los 4 objetos sueltos, sin corchetes:
    // {"type":...},{"type":...},... → se envuelven en una lista para parsearlos.
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) candidates.push(`[${text.slice(firstBrace, lastBrace + 1)}]`);

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.variants) ? parsed.variants : null);
            const items = cleanPromptVariantItems(list);
            if (items.length) return items;
        } catch (e) { /* probamos el siguiente formato */ }
    }

    // Extrae objetos JSON equilibrados aunque vengan rodeados de texto.
    const objects = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                objects.push(text.slice(start, i + 1));
                start = -1;
            }
            if (depth < 0) depth = 0;
        }
    }
    if (objects.length) {
        const parsedObjects = [];
        objects.forEach((object) => {
            try { parsedObjects.push(JSON.parse(object)); } catch (e) { /* objeto incompleto */ }
        });
        const items = cleanPromptVariantItems(parsedObjects);
        if (items.length) return items;
    }

    // Último recurso: líneas "Descriptiva: ..." (nunca JSON crudo).
    const items = [];
    text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || /^\s*[\[{]/.test(trimmed)) return;
        const match = trimmed.match(/^(?:\d+\s*[.)-]\s*)?(?:\*\*)?([^:*]{2,40})(?:\*\*)?\s*:\s*(.+)$/);
        if (match && match[2].trim().length > 15) {
            const value = cleanPromptText(match[2]);
            if (value && !/"type"\s*:/.test(value) && !/^\s*[\[{]/.test(value)) {
                items.push({ type: match[1].trim(), text: value });
            }
        }
    });
    return items.slice(0, 4);
};

// Garantiza 4 propuestas con los tipos canónicos del modo. Si el modelo
// devuelve menos, rellena con una variante fiel derivada de la idea original.
const normalizePromptVariants = (raw, types, basePrompt, mode) => {
    const items = Array.isArray(raw) ? raw.slice(0, 4) : [];
    const used = new Set();
    const out = [];
    items.forEach((item, index) => {
        const normalized = normalizeFidelityText(item.type);
        const canonical = types.find((type) => normalizeFidelityText(type) === normalized);
        const type = (canonical && !used.has(canonical))
            ? canonical
            : (types.find((candidate) => !used.has(candidate)) || types[index] || `Opción ${index + 1}`);
        used.add(type);
        out.push({ type, text: String(item.text || '').trim() });
    });
    types.forEach((type) => {
        if (out.length >= 4 || used.has(type)) return;
        used.add(type);
        out.push({ type, text: buildRepairedVariant(type, basePrompt, mode) });
    });
    return out.slice(0, 4).filter((item) => item.text && !/^\s*[\[{]/.test(item.text) && !/"type"\s*:/.test(item.text));
};


// El contrato canónico solo traduce 'resolution' a tamaño real en los modelos
// OpenAI (size en píxeles). Gemini y Qwen fijan 1K internamente, así que el
// selector se desactiva con ellos para no dar una falsa sensación de control.
const supportsResolution = (modelId) => /^openai-/.test(String(modelId || ''));

// ── Google Flow: cola del PC (apps/flow_studio/flow_queue.php) ──
// Los modelos `flow-nano-banana-*` NO pasan por proxy.php: se encolan en el PC
// del worker y se consulta el estado hasta que el resultado está listo. Son
// gratis (no gastan clave) y por eso el conector mantiene la conexión viva.
const FLOW_MODEL_NAMES = {
    'flow-nano-banana-2': 'Nano Banana 2',
    'flow-nano-banana-pro': 'Nano Banana Pro',
    'flow-nano-banana-2-lite': 'Nano Banana 2 Lite'
};
const isFlowModel = (modelId) => Object.prototype.hasOwnProperty.call(FLOW_MODEL_NAMES, String(modelId || ''));
// Flow solo admite 1:1, 4:3, 3:4, 16:9 y 9:16: el 21:9 de la app cae a 16:9.
const flowRatioFor = (aspectRatio) => {
    const ratio = String(aspectRatio || '1:1');
    if (['1:1', '4:3', '3:4', '16:9', '9:16'].indexOf(ratio) !== -1) return ratio;
    if (ratio === '21:9') return '16:9';
    return '1:1';
};
const getFlowClient = () => (typeof window !== 'undefined' ? window.FlowClient : null);

const generateImageWithFlow = async (params) => {
    const client = getFlowClient();
    if (!client) throw new Error('El conector de Flow no se ha cargado. Recarga la página.');
    const modelId = window.selectedModel || 'flow-nano-banana-2';
    const refs = (params.sourceImages || []).filter(Boolean).slice(0, 2);
    const prompt = String(params.prompt || '').trim().slice(0, 1150);
    if (!prompt) throw new Error('Escribe una instrucción para generar con Flow.');
    const ratio = flowRatioFor(params.aspectRatio);
    const onStatus = typeof params.onStatus === 'function' ? params.onStatus : () => {};

    // Si el PC está apagado el trabajo se queda en cola: se avisa y se espera,
    // porque la cola se procesa sola en cuanto el worker vuelve a conectarse.
    if (client.getStatus().worker === false) {
        onStatus('Flow sin conexión: el trabajo esperará en cola…');
        client.ping();
    } else {
        onStatus('Flow: enviando la solicitud…');
    }

    const requested = await client.request({
        prompt,
        ratio,
        model: FLOW_MODEL_NAMES[modelId],
        count: 1,
        refs
    });
    const jobId = requested && requested.ids && requested.ids[0];
    if (!jobId) throw new Error('La cola de Flow no devolvió ningún trabajo.');

    onStatus('Flow: en cola…');
    const job = await client.waitJob(jobId, {
        onProgress: (phase) => onStatus(phase === 'running' ? 'Flow: generando en el PC…' : 'Flow: en cola…')
    });
    onStatus('Flow: descargando el resultado…');
    return client.imageToDataUrl(client.QUEUE_DIR + job.url);
};

// ── VIAJE EN EL TIEMPO: 15 eras históricas ──
// Cada era aporta un sufijo de transformación (personaje + entorno + vestimenta)
// que se inyecta en el prompt manteniendo los rasgos faciales de la persona.
const HISTORICAL_ERAS = [
    { id: '', shortName: 'Sin Era', name: '⏳ Viaje en el Tiempo', era: '', promptSuffix: '' },
    { id: 'prehistory', shortName: 'Prehistoria', name: 'Prehistoria · 20.000 a.C.', era: '20,000 a.C.', promptSuffix: 'Show this person as a primitive hunter-gatherer in a prehistoric landscape, dressed in furs and hide clothing with bone jewelry, standing near a cave entrance with ancient cave paintings and a flickering fire, preserving their exact facial features and identity.' },
    { id: 'ancient-egypt', shortName: 'Antiguo Egipto', name: 'Antiguo Egipto · 1.350 a.C.', era: '1,350 a.C.', promptSuffix: 'Show this person as a majestic Pharaoh or high-ranking Egyptian noble in the court of Akhenaten, wearing golden ornaments and white linen robes, with the Great Pyramids visible through a stone window, preserving their exact facial features and identity.' },
    { id: 'classical-greece', shortName: 'Grecia Clásica', name: 'Grecia Clásica · 450 a.C.', era: '450 a.C.', promptSuffix: 'Show this person as a Greek philosopher or citizen in the Agora of Athens, wearing a white chiton and laurel wreath, with marble columns of the Parthenon in the background under a bright Mediterranean sun, preserving their exact facial features and identity.' },
    { id: 'roman-empire', shortName: 'Imperio Romano', name: 'Imperio Romano · 100 d.C.', era: '100 d.C.', promptSuffix: 'Show this person as a high-ranking Roman Centurion or a noble Senator, wearing a red tunic and ornate bronze armor or a purple-bordered toga, with the bustling Roman Forum or the Colosseum behind, preserving their exact facial features and identity.' },
    { id: 'viking-age', shortName: 'Era Vikinga', name: 'Era Vikinga · 900 d.C.', era: '900 d.C.', promptSuffix: 'Show this person as a fierce Viking warrior or shield-maiden, wearing fur-lined leather armor with braided hair and an iron helmet, standing on a rocky fjord with a longship in the misty waters, preserving their exact facial features and identity.' },
    { id: 'medieval', shortName: 'Edad Media', name: 'Edad Media · 1.200 d.C.', era: '1,200 d.C.', promptSuffix: 'Show this person as a brave knight in shining plate armor or a noble lady in a medieval castle hall, with tapestries on stone walls, torches flickering, and a tournament field visible outside, preserving their exact facial features and identity.' },
    { id: 'feudal-japan', shortName: 'Japón Feudal', name: 'Japón Feudal · 1.600 d.C.', era: '1,600 d.C.', promptSuffix: 'Show this person as a noble Samurai in traditional lacquered armor or a graceful figure in a silk kimono, with a katana at the waist and cherry blossoms falling in a Zen garden with a pagoda, preserving their exact facial features and identity.' },
    { id: 'renaissance', shortName: 'Renacimiento', name: 'Renacimiento · 1.500 d.C.', era: '1,500 d.C.', promptSuffix: 'Show this person as a wealthy Renaissance merchant or artist in a studio filled with canvases and scientific instruments, wearing rich velvet clothing and ornate collars, with a view of Florence cathedral, preserving their exact facial features and identity.' },
    { id: 'piracy-age', shortName: 'Era de la Piratería', name: 'Era de la Piratería · 1.720 d.C.', era: '1,720 d.C.', promptSuffix: 'Show this person as a legendary pirate captain on the deck of a galleon, wearing a tricorne hat and long coat with weathered skin, holding a telescope with a tropical island and turquoise sea behind, preserving their exact facial features and identity.' },
    { id: 'industrial-era', shortName: 'Era Industrial', name: 'Era Industrial · 1.850 d.C.', era: '1,850 d.C.', promptSuffix: 'Show this person as a Victorian inventor or factory owner in London, wearing a top hat and waistcoat with a pocket watch, with steam-powered machinery and brick chimneys in a foggy industrial city, preserving their exact facial features and identity.' },
    { id: 'wild-west', shortName: 'Lejano Oeste', name: 'Lejano Oeste · 1.880 d.C.', era: '1,880 d.C.', promptSuffix: 'Show this person as a legendary gunslinger or pioneer in a dusty frontier town, wearing a leather duster and cowboy hat with rugged boots, standing in front of a wooden saloon with a desert sunset, preserving their exact facial features and identity.' },
    { id: 'roaring-twenties', shortName: 'Los Locos Años 20', name: 'Los Locos Años 20 · 1.925 d.C.', era: '1,925 d.C.', promptSuffix: 'Show this person as a glamorous socialite or dapper gentleman in a smoky jazz club, wearing a sequined flapper dress or pinstripe suit, with Art Deco interiors and a live band in the background, preserving their exact facial features and identity.' },
    { id: 'cold-war', shortName: 'Guerra Fría', name: 'Guerra Fría · 1.965 d.C.', era: '1,965 d.C.', promptSuffix: 'Show this person as a mysterious secret agent or a scientist in a high-tech control room, wearing a trench coat or lab coat, with analog computers, reel-to-reel tapes, and a rocket launch visible on a screen, preserving their exact facial features and identity.' },
    { id: 'cyberpunk', shortName: 'Futuro Neón', name: 'Futuro Neón · 2.099 d.C.', era: '2,099 d.C.', promptSuffix: 'Show this person as a high-tech street samurai or netrunner in a rain-slicked neon city, with cybernetic implants, a glowing visor, and a futuristic jacket, with massive holographic advertisements, preserving their exact facial features and identity.' },
    { id: 'galactic-empire', shortName: 'Imperio Galáctico', name: 'Imperio Galáctico · 3.500 d.C.', era: '3,500 d.C.', promptSuffix: 'Show this person as a high-ranking galactic officer or starship pilot, wearing a sleek futuristic uniform, with glowing data pads, standing on the bridge of a massive spaceship overlooking a nebula, preserving their exact facial features and identity.' }
];

// --- HISTORIAL PERSISTENTE (HistoryManager canónico: servidor history.php) ---
// El servidor es la fuente de verdad: carga, guarda, elimina y limpia.
let historyInstance = null;
const getHistory = () => {
    if (!historyInstance && typeof window.HistoryManager !== 'undefined') {
        historyInstance = new window.HistoryManager('editar_generar');
    }
    return historyInstance;
};

const loadHistoryFromDb = async (mode) => {
    try {
        const history = getHistory();
        if (!history) return [];
        const all = await history.load();
        return all
            .filter(item => ((item.data && item.data.mode) || 'remix') === mode)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(item => ({
                id: item.id,
                url: item.imageUrl || '',
                prompt: (item.data && item.data.prompt) || '',
                style: item.data && item.data.style,
                era: item.data && item.data.era,
                aspectRatio: (item.data && item.data.aspectRatio) || '1:1',
                model: item.model || (item.data && item.data.model) || 'desconocido',
                size: (item.data && item.data.size) || '1K',
                width: (item.data && item.data.width) || null,
                height: (item.data && item.data.height) || null,
                upscaled: !!(item.data && item.data.upscaled),
                mode: (item.data && item.data.mode) || 'remix',
                createdAt: item.createdAt
            }));
    } catch (e) { console.warn('Error cargando historial:', e); return []; }
};

const saveHistoryItemToDb = async (item) => {
    const history = getHistory();
    if (!history) return;
    await history.save({
        id: item.id,
        type: 'image',
        model: item.model || 'desconocido',
        data: {
            prompt: item.prompt,
            style: item.style,
            era: item.era,
            aspectRatio: item.aspectRatio,
            model: item.model,
            mode: item.mode,
            size: item.size,
            width: item.width || null,
            height: item.height || null,
            upscaled: !!item.upscaled
        },
        imageData: item.url,
        createdAt: new Date(item.createdAt || Date.now()).toISOString()
    });
};

const deleteHistoryItemFromDb = async (id) => {
    const history = getHistory();
    if (!history) return;
    await history.delete(id);
};

const clearHistoryFromDb = async (mode) => {
    const history = getHistory();
    if (!history) return;
    const all = await history.load();
    for (const item of all) {
        if (((item.data && item.data.mode) || 'remix') === mode) {
            await history.delete(item.id);
        }
    }
};

// --- SERVICES CORREGIDOS ---
const PROXY_URL = './proxy.php';

// Textos de popup por modelo (kit canónico dibujo_lineas_copia)
window.MODEL_TOOLTIP_TEXTS = {
    'openai-medium': 'Fondo transparente, Muy rápido',
    'openai-high': 'Fondo transparente',
    'openai-xhigh': 'Precisión en edición, Consistencia (Rostros y Cara).',
    'openai-max-flare': 'Más barato que Sunburst',
    'openai-max-sunburst': 'Precisión en edición, Consistencia (Rostros y Cara).',
    'openai-image-2-low': 'OpenAI image 2 (gpt-image-2) en calidad baja. La opción más rápida y económica; menos detalle.',
    'openai-image-2': 'OpenAI image 2 (gpt-image-2) en calidad media. Modelo base, rápido y económico.',
    'openai-image-2-high': 'OpenAI image 2 (gpt-image-2) en calidad alta. Más detalle y coste superior a MEDIUM.',
    'gemini-2': 'Gemini 2.5 Flash Image: edición rápida y económica.',
    'gemini-flash': 'Texto en imágenes, Rápido.',
    'gemini-pro': 'Máxima calidad, Perfecto para texto',
    'qwen-pro': 'Texto nítido 10px y 12 idiomas, Layouts densos, El más barato, Seed reproducible',
    'flow-nano-banana-2': 'Flow · Nano Banana 2 · gratis en el PC. Usa tu imagen como referencia y no gasta clave de API.',
    'flow-nano-banana-pro': 'Flow · Nano Banana Pro · más detalle y consistencia, algo más lento. Gratis en el PC.',
    'flow-nano-banana-2-lite': 'Flow · Nano Banana 2 Lite · el más rápido de los tres. Gratis en el PC.'
};

const callProxy = async (model, contents, config = {}, promptText = '') => {
    // Garantizamos que el objeto enviado siempre lleve parametro 'prompt'
    const payload = { 
        model: (window.selectedModel || model), 
        prompt: promptText, 
        contents, 
        ...config 
    };
    // qwen-pro tarda más que el timeout de nginx (~55s): el proxy guarda el
    // resultado en qwen_cache/ y responde 'processing' hasta que termina.
    const slowModel = payload.model === 'qwen-pro';
    const maxAttempts = slowModel ? 36 : 1;
    let lastError = 'Sin respuesta del modelo.';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const raw = await response.text();
            let json = null;
            try { json = JSON.parse(raw); } catch (e) {}
            if (json && json.status === 'processing') {
                lastError = 'Generando...';
            } else if (response.ok) {
                return json;
            } else {
                lastError = `Error ${response.status}: ${raw}`;
                if (!slowModel || response.status < 500) throw new Error(lastError);
            }
        } catch (e) {
            if (!slowModel) throw e;
            lastError = (e && e.message) || lastError;
        }
        if (attempt < maxAttempts - 1) await new Promise(res => setTimeout(res, 5000));
    }
    throw new Error(lastError);
};

// Limpia la respuesta del modelo: bloques markdown, comillas y etiquetas.
const cleanPromptText = (raw) => {
    let text = String(raw || '').trim();
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
    text = text.replace(/^(prompt|instrucci[oó]n)\s*:\s*/i, '').trim();
    text = text.replace(/^["“'«]+/, '').replace(/["”'»]+$/, '').trim();
    return text;
};

// Petición al mejorador (OpenRouter vía proxy): devuelve las 4 propuestas ya
// parseadas. `correction` se usa solo en la ronda de reparación de fidelidad.
const requestPromptVariants = async ({ basePrompt, config, imageBase64, correction }) => {
    const correctionText = correction
        ? `\n\nCORRECCIÓN OBLIGATORIA: ${correction}\nVuelve a escribir las 4 variantes corrigiendo esos fallos y sin añadir otros.`
        : '';
    const userPrompt = correction
        ? `IDEA ORIGINAL: ${basePrompt}\nCorrige las variantes anteriores manteniendo la idea original.`
        : (basePrompt || 'Analiza la imagen adjunta y propón las mejores variantes.');
    const result = await callProxy('', [], {
        action: 'text',
        system: `${config.system}${correctionText}`,
        model: 'xiaomi/mimo-v2.6-pro',
        temperature: correction ? 0.4 : 0.6,
        max_tokens: 2000,
        ...(imageBase64 ? { imagen: imageBase64 } : {})
    }, userPrompt);
    if (!result?.success || !result?.text) {
        throw new Error(result?.error?.message || 'No se pudo mejorar el prompt.');
    }
    return parsePromptVariants(result.text);
};

const enhancePromptVariants = async ({ basePrompt, mode, imageBase64 }) => {
    const config = getPromptVariantConfig(mode);
    const variants = normalizePromptVariants(
        await requestPromptVariants({ basePrompt, config, imageBase64 }),
        config.types,
        basePrompt,
        mode
    );
    if (!variants.length) {
        throw new Error('El mejorador devolvió una respuesta vacía. Inténtalo de nuevo.');
    }
    const conflicts = findFidelityConflicts(basePrompt, variants);
    if (!conflicts.length) return variants;
    // Una sola ronda de reparación: el modelo reescribe las 4 variantes
    // corrigiendo la pérdida de fidelidad detectada. Si aun así no se corrige,
    // se recompone la propuesta desde la idea original del usuario.
    try {
        const repaired = normalizePromptVariants(
            await requestPromptVariants({
                basePrompt,
                config,
                imageBase64,
                correction: conflicts.map((conflict) => `La propuesta ${conflict.index + 1} ${conflict.reason}.`).join(' ')
            }),
            config.types,
            basePrompt,
            mode
        );
        const still = findFidelityConflicts(basePrompt, repaired);
        if (!still.length) return repaired;
        return repaired.map((variant, index) => (
            still.some((conflict) => conflict.index === index)
                ? { ...variant, text: buildRepairedVariant(variant.type, basePrompt, mode) }
                : variant
        ));
    } catch (error) {
        console.warn('No se pudo reparar la fidelidad de las propuestas:', error);
        return variants.map((variant, index) => (
            conflicts.some((conflict) => conflict.index === index)
                ? { ...variant, text: buildRepairedVariant(variant.type, basePrompt, mode) }
                : variant
        ));
    }
};

const generateImage = async (params) => {
    let basePrompt = (params.prompt || '').trim();
    const styleSuffix = (params.styleSuffix || '').trim();
    const fullStylePrompt = `${basePrompt} ${styleSuffix}`.trim();
    // 'reference' = la imagen acompaña a la instrucción de texto (modo Generar).
    // Cualquier otro valor conserva la transformación completa del modo Editar.
    const asReference = params.sourceRole === 'reference';
    // Editar con imagen de referencia: la primera imagen es la base que se
    // transforma; las demás solo guían estilo, sujeto o colores.
    const asTransformReference = params.sourceRole === 'transform-reference';
    // Referencias admitidas: una o varias imágenes (el proxy canónico acepta hasta 8).
    // Se mantiene 'sourceImage' por compatibilidad con las llamadas de una sola imagen.
    const sourceImages = (Array.isArray(params.sourceImages)
        ? params.sourceImages
        : (params.sourceImage ? [params.sourceImage] : [])).filter(Boolean);
    const manySources = sourceImages.length > 1;

    let finalPrompt = '';
    if (sourceImages.length > 0) {
        const sizeInfo = `Adjust the aspect ratio to ${params.aspectRatio}.`;
        if (fullStylePrompt) {
            finalPrompt = asReference
                ? (manySources
                    ? `${sizeInfo} Use the ${sourceImages.length} attached images as visual references (subjects, identity, composition, colors and style), combining what each one contributes. Create a new complete, high-quality image that follows this instruction: ${fullStylePrompt}. Fill the ${params.aspectRatio} format perfectly.`
                    : `${sizeInfo} Use the attached image as visual reference (subject, identity, composition, colors and style). Create a new complete, high-quality image that follows this instruction: ${fullStylePrompt}. Fill the ${params.aspectRatio} format perfectly.`)
                : (asTransformReference
                    ? `${sizeInfo} Use the FIRST attached image as the base to edit. Edit it following this instruction: ${fullStylePrompt}. Use the remaining attached image(s) only as a visual reference for subject, identity, style, colors and materials, without copying their composition. Keep the base image's main subject coherent. Ensure the output is a complete, high-quality image that fills the ${params.aspectRatio} format perfectly.`
                    : (manySources
                        ? `${sizeInfo} TRANSFORM these ${sourceImages.length} images, merging them into one, into the following style and content: ${fullStylePrompt}. Ensure the output is a complete, high-quality image that fills the ${params.aspectRatio} format perfectly.`
                        : `${sizeInfo} TRANSFORM this entire image into the following style and content: ${fullStylePrompt}. Ensure the output is a complete, high-quality image that fills the ${params.aspectRatio} format perfectly.`));
        } else {
            finalPrompt = asReference
                ? (manySources
                    ? `${sizeInfo} Combine the ${sourceImages.length} attached images into a single, complete and natural image, keeping their subjects, identity, colors and style. The result must fill the ${params.aspectRatio} format perfectly.`
                    : `${sizeInfo} Improve and complete the attached image keeping its original subject, identity, colors and style. The result must be a complete, natural image that fills the ${params.aspectRatio} format perfectly.`)
                : (asTransformReference
                    ? `${sizeInfo} Improve and complete the FIRST attached image keeping its original subject and composition, using the remaining attached image(s) as a visual reference for style, colors and details. The result must be a complete, natural image that fills the ${params.aspectRatio} format perfectly.`
                    : `${sizeInfo} Fill any empty areas seamlessly maintaining the original style and context of the image. The result must be a complete, natural image.`);
        }
    } else {
        finalPrompt = fullStylePrompt || 'A beautiful high-quality image';
    }

    // Modelos de Google Flow: se generan en el PC del worker, no por proxy.php.
    if (isFlowModel(window.selectedModel)) {
        return generateImageWithFlow({
            prompt: finalPrompt || basePrompt,
            aspectRatio: params.aspectRatio,
            sourceImages,
            onStatus: params.onStatus
        });
    }

    const parts = [{ text: finalPrompt }];
    sourceImages.forEach((sourceImage) => {
        const base64Data = sourceImage.split(',')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
    });
    const contents = [{ parts }];
    const config = {
        aspectRatio: params.aspectRatio,
        resolution: params.resolution || 1024,
        generationConfig: {
            imageConfig: {
                aspectRatio: params.aspectRatio
            }
        }
    };

    // Pasamos 'finalPrompt' como parámetro explícito
    const result = await callProxy(window.selectedModel || 'openai-image-2-low', contents, config, finalPrompt);
    if (!result?.success || !result?.imageUrl) {
        throw new Error(result?.error?.message || "No se pudo generar la imagen");
    }
    return result.imageUrl;
};

const editImageConversation = async (params) => {
    // Con Flow la edición es una generación con la imagen como referencia.
    if (isFlowModel(window.selectedModel)) {
        return generateImageWithFlow({
            prompt: params.instruction,
            aspectRatio: params.aspectRatio,
            sourceImages: [params.originalImage],
            onStatus: params.onStatus
        });
    }
    const base64Data = params.originalImage.split(',')[1];
    const contents = [{
        parts: [
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            { text: params.instruction }
        ]
    }];
    const config = { aspectRatio: params.aspectRatio, resolution: params.resolution || 1024, generationConfig: { imageConfig: { aspectRatio: params.aspectRatio } } };
    const result = await callProxy(window.selectedModel || 'openai-image-2-low', contents, config);
    if (!result?.success || !result?.imageUrl) {
        throw new Error(result?.error?.message || "Error en la edición conversacional");
    }
    return result.imageUrl;
};

// --- COMPONENTS ---
const ApiKeyChecker = ({ children }) => <>{children}</>;

const LoadingOverlay = ({ status = '', title = 'IA generando lo solicitado...' }) => (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
        <div className="spinner-triple">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
        </div>
        <p className="loading-text">{title}</p>
        <div className="progress-panel">
            <div className="progress-bar-track">
                <div className="progress-bar-fill" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div className="secondary-status">{status || 'Procesando solicitud...'}</div>
        </div>
    </div>
);

// ── Estado de la conexión con el PC de Flow ──
// El conector (flow-client.20261028.js) mantiene el latido siempre vivo, también
// en segundo plano y tras un corte; aquí solo se pinta su estado y se ofrece
// reintentar cuando el PC aparece desconectado.
const useFlowStatus = () => {
    const [flow, setFlow] = useState(() => {
        const client = getFlowClient();
        return client ? client.getStatus() : { status: 'checking', worker: null, pending: 0, error: '' };
    });
    useEffect(() => {
        const client = getFlowClient();
        if (!client) return undefined;
        client.start();
        return client.subscribe(setFlow);
    }, []);
    return flow;
};

const FlowStatusPill = ({ flow }) => {
    const status = (flow && flow.status) || 'checking';
    const pending = Number(flow && flow.pending) || 0;
    const retry = () => {
        const client = getFlowClient();
        if (client) client.ping();
    };
    const label = status === 'online'
        ? (pending > 0 ? `Flow conectado · ${pending} en cola` : 'Flow conectado')
        : (status === 'offline' ? 'Flow sin conexión' : 'Conectando con Flow…');
    const title = status === 'online'
        ? 'El PC de Flow responde. Los modelos FLOW se generan ahí, sin gastar clave de API.'
        : (status === 'offline'
            ? 'El PC de Flow no responde. Enciéndelo: los trabajos quedan en cola y se generan al conectar.'
            : 'Comprobando la conexión con el PC de Flow…');
    return (
        <div className={`flow-status is-${status}`} title={title}>
            <span className="flow-status-dot" aria-hidden="true" />
            <span className="flow-status-text" role="status" aria-live="polite">{label}</span>
            {status === 'offline' && (
                <button type="button" className="flow-retry" onClick={retry}>Reintentar</button>
            )}
        </div>
    );
};

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
                className={`ar-effect w-full p-4 text-[11px] outline-none cursor-pointer text-left flex items-center justify-between rounded-xl ${isOpen || !isPlaceholder ? 'active' : 'opacity-60'}`}
            >
                <span>{selectedOption.name}</span>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                className={`dropdown-option ${opt.id === value ? 'active' : ''}`}
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
    const [copied, setCopied] = useState(false);
    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `gemini-studio-${image.id}.jpg`;
        link.click();
    };

    const handleCopyPrompt = (e) => {
        e.stopPropagation();
        const text = image.prompt || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
            }).catch(() => {});
        } else {
            // Fallback para contextos sin Clipboard API
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (err) {}
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        }
    };

    return (
        <div onClick={() => onClick && onClick(image)} className="group relative glass rounded-[2.5rem] overflow-hidden flex flex-col glass-hover cursor-zoom-in border-white/10 shadow-2xl">
            <div className="absolute top-4 left-4 z-10">
                <div className="px-3 py-1 glass rounded-full text-[9px] uppercase text-white/90 border-white/5 backdrop-blur-md btn-canon">
                    {image.era && image.era.shortName && image.era.shortName !== 'Sin Era' ? `${image.era.shortName} | ` : ''}{image.style ? image.style.name : 'Estilo'} | {image.aspectRatio} | {getSizeLabel(image.size)} | {getModelLabel(image.model)}
                </div>
            </div>
            <div className="relative aspect-square bg-slate-950 overflow-hidden flex items-center justify-center">
                <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />

                <div className="history-card-actions absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-start justify-center pt-8 backdrop-blur-[2px] z-20">
                    <div className="flex items-center justify-center gap-3 w-full px-2">
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

                        <button
                            type="button"
                            data-accion="eliminar-historial"
                            onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                            title="Eliminar del historial"
                            aria-label="Eliminar esta imagen del historial"
                            className="flex flex-col items-center gap-1.5 group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-lg"
                        >
                            <div className="w-9 h-9 rounded-full bg-red-900/40 border border-red-500/50 flex items-center justify-center group-hover/btn:bg-red-500/40 group-hover/btn:scale-110 transition-all shadow-lg">
                                <Trash2 className="text-red-400" size={16} />
                            </div>
                            <span className="btn-canon text-[8px] text-red-300">Quitar</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-900/80 backdrop-blur-md flex flex-col gap-1 border-t border-white/5">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight italic flex-1">
                        {image.prompt}
                    </p>
                    <button
                        onClick={handleCopyPrompt}
                        title="Copiar prompt"
                        aria-label="Copiar prompt al portapapeles"
                        className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase transition-all border ${copied ? 'text-green-400 border-green-500/40 bg-green-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/25'}`}
                    >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                </div>
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
            <h1 className="splash-title">Diseña como un Pro</h1>
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
                <p className="card-desc">Genera desde texto o combinando una imagen de referencia con tu instrucción.</p>
            </button>
        </div>
    </div>
);


// --- APP MAIN ---
const App = () => {
    const [view, setView] = useState('splash');
    const [mode, setMode] = useState('remix');
    const [prompt, setPrompt] = useState('');
    // El campo de prompt está siempre visible y editable. «Mejorar prompt» pide
    // 4 propuestas fieles a la idea; se quedan visibles y reutilizables (también
    // después de generar) para poder comparar y seguir editando.
    const [promptVariants, setPromptVariants] = useState([]);
    const [activeVariant, setActiveVariant] = useState(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [promptError, setPromptError] = useState(null);
    const [selectedStyle, setSelectedStyle] = useState(STYLE_GROUPS.fotografia[1]);
    const [selectedEra, setSelectedEra] = useState(HISTORICAL_ERAS[0]);
    const [selectedAR, setSelectedAR] = useState(AspectRatio.SQUARE);
    const [selectedRes, setSelectedRes] = useState(1024);
    // Cuántas imágenes genera cada pulsación (1-4). Cada una es una generación
    // independiente y se guarda como entrada propia del historial.
    const [imageCount, setImageCount] = useState(1);
    const [images, setImages] = useState([]);
    const [remixSource, setRemixSource] = useState(null);
    // Imagen de referencia opcional del modo Editar: no se transforma, guía la
    // edición de la imagen base (estilo, sujeto, colores o materiales).
    const [remixRef, setRemixRef] = useState(null);
    // Imagen de referencia opcional del modo Generar: permite usar un prompt de
    // texto junto a una imagen (imagen + instrucción), igual que al editar.
    const [genSource, setGenSource] = useState(null);
    // Segunda imagen de referencia opcional: el prompt combina las dos imágenes
    // (por ejemplo sujeto + prenda u objeto) en una sola generación.
    const [genSource2, setGenSource2] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [lastUpscale, setLastUpscale] = useState(null);
    // Última imagen producida en esta sesión (edición o ampliación). El upscaler
    // la prefiere sobre el historial; si aún no hay resultado, usa la imagen subida.
    const [lastResultId, setLastResultId] = useState(null);
    const [editImage, setEditImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [error, setError] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
  // Modelo por defecto de esta app: OpenAI image 2 (gpt-image-2) en calidad baja.
  // El grupo IMAGE 2 va de menor a mayor: LOW, MEDIUM, HIGH.
  const [selectedModel, setSelectedModel] = useState('openai-image-2-low');

  // Sincronizar modelo con variable global (accesible desde callProxy)
  useEffect(() => { window.selectedModel = selectedModel; }, [selectedModel]);

  // Conexión con el PC de Flow: se comprueba al arrancar y se mantiene viva.
  const flowState = useFlowStatus();

    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');

    const fileInputRef = useRef(null);
    // Entrada de archivo propia de la segunda imagen de referencia (modo Generar).
    const fileInput2Ref = useRef(null);
    // Entrada de archivo de la imagen de referencia del modo Editar.
    const fileInputEditRef = useRef(null);
    // Textarea del prompt: recibe el foco al revelarse tras elegir un enfoque.
    const promptRef = useRef(null);
    // Contenedor del historial con scroll propio: dos filas visibles.
    const historyScrollRef = useRef(null);

    // Alto del historial = dos filas de tarjetas. A partir de la tercera fila el
    // panel hace scroll en su interior en vez de estirar la página entera.
    // Se mide en el navegador porque el alto de fila depende del ancho de columna
    // (1, 2 o 3 columnas segun el breakpoint) y del pie de cada tarjeta.
    const syncHistoryHeight = () => {
        const box = historyScrollRef.current;
        if (!box) return;
        const grid = box.firstElementChild;
        const firstCard = grid && grid.firstElementChild;
        if (!firstCard) return;
        const gap = parseFloat(window.getComputedStyle(grid).rowGap) || 40;
        const cardHeight = firstCard.getBoundingClientRect().height;
        if (!cardHeight) return;
        const dosFilas = Math.ceil(cardHeight * 2 + gap);
        const next = dosFilas + 'px';
        if (box.style.maxHeight !== next) box.style.maxHeight = next;
    };

    useLayoutEffect(() => {
        const box = historyScrollRef.current;
        if (!box) return undefined;
        const firstCard = box.firstElementChild && box.firstElementChild.firstElementChild;
        let rafId = 0;
        // La medida se escribe FUERA del ciclo de notificacion del observador: si se
        // cambia el layout dentro del callback, Chrome emite "ResizeObserver loop
        // completed with undelivered notifications" y el onerror global de la pagina
        // sustituye la interfaz por la pantalla de error.
        const medirDiferido = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => { rafId = 0; syncHistoryHeight(); });
        };
        // Primera medida + re-medida cuando Tailwind, la tipografia o un cambio de
        // breakpoint alteran el alto real de la tarjeta.
        syncHistoryHeight();
        let observer = null;
        if (firstCard && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(medirDiferido);
            observer.observe(firstCard);
        }
        const temporizadores = [120, 600, 1500].map(ms => setTimeout(medirDiferido, ms));
        const alCargarFuentes = () => medirDiferido();
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(alCargarFuentes).catch(() => {});
            if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', alCargarFuentes);
        }
        return () => {
            if (observer) observer.disconnect();
            if (rafId) cancelAnimationFrame(rafId);
            temporizadores.forEach(clearTimeout);
            if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', alCargarFuentes);
        };
    }, [images]);

    useEffect(() => {
        let frame = 0;
        const onResize = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(syncHistoryHeight);
        };
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', onResize);
        };
    }, []);

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
        // Al cambiar de modo se limpia el prompt para que la edición y la generación no se mezclen.
        setPrompt('');
        setEditInstruction('');
        setPromptVariants([]);
        setActiveVariant(null);
        setIsEnhancing(false);
        setPromptError(null);
        setLastUpscale(null);
        setLastResultId(null);
        // Cada modo conserva su propia imagen: al entrar en uno se libera la del otro.
        if (m === 'text-to-image') { setRemixSource(null); setRemixRef(null); }
        if (m === 'remix') { setGenSource(null); setGenSource2(null); }
        setError(null);
    };

    // La imagen subida pertenece al modo activo (base al Editar, referencias al Generar).
    // slot: 'base' o 'refedit' (Editar), 'ref1' o 'ref2' (Generar).
    const handleFileUpload = (e, slot = 'base') => {
        const file = e.target.files[0];
        if (!file) return;
        const applySource = (value) => {
            if (mode === 'remix') {
                if (slot === 'refedit') setRemixRef(value);
                else setRemixSource(value);
            } else if (slot === 'ref2') setGenSource2(value);
            else setGenSource(value);
        };
        // El formato de salida se deduce solo de la PRIMERA imagen del modo: una
        // segunda referencia (prenda, objeto, estilo) no debe cambiar el lienzo.
        const isFirstSource = mode === 'remix'
            ? (slot !== 'refedit' && !remixSource)
            : (slot === 'ref2' ? !genSource : !genSource2);
        const reader = new FileReader();
        reader.onload = (f) => {
            const img = new Image();
            img.onload = () => {
                if (isFirstSource) setSelectedAR(getClosestAspectRatio(img.width, img.height));
                // Una base nueva pasa a ser el objetivo del upscaler hasta que se genere.
                if (mode === 'remix' && slot !== 'refedit') setLastResultId(null);
                applySource(f.target.result);
                // Cambiar de imagen invalida las propuestas generadas para la anterior.
                setPromptVariants([]);
                setActiveVariant(null);
            };
            img.src = f.target.result;
        };
        reader.readAsDataURL(file);
        // Permite volver a elegir el mismo archivo despues de quitarlo.
        e.target.value = '';
    };

    // Limpia la imagen de un campo concreto: 'base' o 'refedit' (Editar), 'ref1' o 'ref2' (Generar).
    const clearSource = (slot = 'base') => (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (mode === 'remix') {
            if (slot === 'refedit') setRemixRef(null);
            else setRemixSource(null);
        } else if (slot === 'ref2') setGenSource2(null);
        else setGenSource(null);
        setPromptVariants([]);
        setActiveVariant(null);
    };

    // Imagen activa del modo: en Editar es la base, en Generar la referencia principal
    // (con la segunda como respaldo si solo se subio esa).
    const activeSource = mode === 'remix' ? remixSource : (genSource || genSource2);

    // Objetivo del upscaler: el último resultado de esta sesión; si aún no hay,
    // la imagen subida; y si tampoco, la última del historial del modo.
    const lastResult = images.find(img => img.id === lastResultId) || null;
    const upscaleSource = remixSource
        ? ((lastResult && lastResult.url) || remixSource)
        : ((images[0] && images[0].url) || genSource || genSource2 || null);

    // Pide a la IA 4 propuestas para el prompt actual. No rellena el campo: el
    // usuario elige una y la edita. Las propuestas se conservan al generar la
    // imagen para poder compararlas y volver a usarlas.
    const handleEnhance = async () => {
        if (mode === 'remix' && !remixSource) {
            setPromptError("Sube una imagen antes de mejorar la instrucción.");
            return;
        }
        if (mode === 'text-to-image' && !prompt.trim() && !genSource && !genSource2) {
            setPromptError("Escribe tu idea o sube una imagen de referencia antes de mejorar el prompt.");
            return;
        }
        setIsEnhancing(true);
        setPromptError(null);
        try {
            // Con imagen (base o referencia) se analiza con visión; la segunda
            // referencia del modo Generar sigue viajando en la generación.
            const compressed = activeSource ? await resizeImage(activeSource, 1024, 0.85) : '';
            const variants = await enhancePromptVariants({
                basePrompt: prompt.trim(),
                mode,
                imageBase64: compressed ? compressed.split(',')[1] : ''
            });
            setPromptVariants(variants);
            setActiveVariant(null);
        } catch (err) {
            console.error(err);
            setPromptError(err.message || "No se pudo mejorar el prompt.");
        } finally {
            setIsEnhancing(false);
        }
    };

    // Vuelca una propuesta en el campo para editarla o generar con ella.
    const applyPromptVariant = (index) => {
        const variant = promptVariants[index];
        if (!variant) return;
        setPrompt(variant.text);
        setActiveVariant(index);
        setPromptError(null);
        setTimeout(() => {
            const field = promptRef.current;
            if (!field) return;
            field.focus();
            try { field.setSelectionRange(field.value.length, field.value.length); } catch (e) { /* ignorado */ }
        }, 30);
    };

    // Amplía la imagen activa a 2K, 4K u 8K reales y la guarda como nueva entrada
    // del historial, conservando el prompt de la imagen de origen.
    const handleUpscale = async (target) => {
        if (!upscaleSource) {
            setError("Genera o sube una imagen antes de ampliarla.");
            return;
        }
        setIsUpscaling(true);
        setError(null);
        setProgress(0);
        setProgressStatus(`Preparando ampliación a ${target.label}...`);
        try {
            const result = await upscaleDataUrl(upscaleSource, target.longEdge, (value, status) => {
                setProgress(value);
                setProgressStatus(status);
            });
            const base = images[0] || null;
            const item = {
                id: 'up_' + Math.random().toString(36).substring(2, 9),
                url: result.dataUrl,
                prompt: (base && base.prompt) || prompt.trim() || 'Imagen ampliada',
                style: (base && base.style) || selectedStyle,
                era: (base && base.era) || selectedEra,
                aspectRatio: (base && base.aspectRatio) || selectedAR,
                model: 'upscaler',
                size: Math.max(result.width, result.height),
                width: result.width,
                height: result.height,
                upscaled: true,
                mode: mode,
                createdAt: Date.now()
            };
            setProgress(90);
            setProgressStatus('Guardando ampliación...');
            try {
                await saveHistoryItemToDb(item);
            } catch (saveError) {
                console.warn('No se pudo guardar la ampliación:', saveError);
                setError('La imagen se amplió, pero no se pudo guardar en el historial.');
            }
            setImages(prev => [item, ...prev]);
            setLastResultId(item.id);
            setLastUpscale(target.id);
        } catch (err) {
            console.error(err);
            setError(err.message || "No se pudo ampliar la imagen.");
        } finally {
            setIsUpscaling(false);
            setTimeout(() => { setProgress(0); setProgressStatus(''); }, 400);
        }
    };

    const handleGenerate = async (finalPrompt = prompt) => {
        const effectivePrompt = (typeof finalPrompt === 'string' ? finalPrompt : prompt).trim();
        
        if (mode === 'text-to-image' && !effectivePrompt && !genSource && !genSource2) {
            setError("Escribe una descripción o sube una imagen de referencia antes de generar.");
            return;
        }
        if (mode === 'remix' && !remixSource) {
            setError("Sube una imagen para poder editarla.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setPromptError(null);
        setProgress(0);
        setProgressStatus('Preparando...');
        try {
            const eraSuffix = (selectedEra && selectedEra.promptSuffix || '').trim();
            const styleSuffix = `${eraSuffix} ${(selectedStyle.promptSuffix || '').trim()}`.trim();
            // Imagenes del modo: base obligatoria al Editar (con su referencia
            // opcional), hasta dos referencias al Generar.
            let finalSources = (mode === 'remix'
                ? [remixSource, remixRef]
                : [genSource, genSource2]).filter(Boolean);
            const sourceRole = mode === 'remix'
                ? (remixRef ? 'transform-reference' : 'transform')
                : 'reference';

            finalSources = await Promise.all(finalSources.map(img => resizeImage(img, 1024, 0.85)));

            setProgress(10);
            const total = Math.max(1, Math.min(4, Number(imageCount) || 1));
            const created = [];
            let failure = null;
            for (let index = 0; index < total; index++) {
                setProgressStatus(total > 1
                    ? `Generando imagen ${index + 1} de ${total}...`
                    : 'Generando imagen...');
                try {
                    const imageUrl = await generateImage({
                        prompt: effectivePrompt,
                        styleSuffix,
                        aspectRatio: selectedAR,
                        resolution: selectedRes,
                        sourceImages: finalSources,
                        sourceRole: sourceRole,
                        onStatus: setProgressStatus
                    });

                    setProgressStatus(total > 1
                        ? `Guardando imagen ${index + 1} de ${total}...`
                        : 'Guardando...');

                    const newImage = {
                        id: Math.random().toString(36).substring(7),
                        url: imageUrl,
                        prompt: effectivePrompt || (mode === 'remix' ? 'Edición de imagen' : 'Generación desde imagen de referencia'),
                        style: selectedStyle,
                        era: selectedEra,
                        aspectRatio: selectedAR,
                        model: selectedModel,
                        size: selectedRes,
                        mode: mode,
                        createdAt: Date.now()
                    };

                    await saveHistoryItemToDb(newImage);
                    created.push(newImage);
                    setProgress(10 + Math.round(((index + 1) / total) * 85));
                } catch (err) {
                    failure = err;
                    break;
                }
            }

            if (created.length > 0) {
                // La última generada es la más reciente: primera en la rejilla.
                setImages(prev => [...created.slice().reverse(), ...prev]);
                setLastResultId(created[created.length - 1].id);
            }
            if (failure) {
                const detail = failure.message || "Error de generación";
                setError(created.length > 0
                    ? `Se generaron ${created.length} de ${total} imágenes. ${detail}`
                    : detail);
            }

            setProgress(100);
        } catch (err) {
            setError(err.message || "Error de generación");
        } finally {
            setTimeout(() => { setIsGenerating(false); setProgress(0); setProgressStatus(''); }, 400);
            // El prompt se conserva para poder reutilizarlo en la siguiente generación.
            setSelectedStyle(STYLE_GROUPS.ilustracion[0]);
            setSelectedEra(HISTORICAL_ERAS[0]);
            setSelectedAR(AspectRatio.SQUARE);
        }
    };

    const handleDelete = async (id) => {
        // El botón de papelera está siempre a la vista: se confirma antes de borrar
        // en el servidor, que es la fuente de verdad del historial.
        if (!window.confirm('¿Eliminar esta imagen del historial? No se puede deshacer.')) return;
        try {
            await deleteHistoryItemFromDb(id);
            setImages(prev => prev.filter(img => img.id !== id));
            setError(null);
        } catch (e) {
            console.warn('Error eliminando del historial:', e);
            setError('No se pudo eliminar la imagen del historial. Inténtalo de nuevo.');
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar el historial de este modo?')) return;
        await clearHistoryFromDb(mode);
        setImages([]);
    };

    const handleRegenerate = (img) => {
        setPrompt(img.prompt);
        setActiveVariant(null);
        setPromptVariants([]);
        if (img.style) setSelectedStyle(img.style);
        if (img.era) setSelectedEra(img.era);
        setSelectedAR(img.aspectRatio);
        if (img.model && img.model !== 'upscaler') setSelectedModel(img.model);
        if (RESOLUTIONS.includes(Number(img.size))) setSelectedRes(Number(img.size));
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
                aspectRatio: editImage.aspectRatio,
                resolution: selectedRes,
                onStatus: setProgressStatus
            });
            const updatedImage = { ...editImage, id: Math.random().toString(36).substring(7), url: updatedUrl, mode: mode, model: selectedModel, size: selectedRes, createdAt: Date.now() };
            await saveHistoryItemToDb(updatedImage);
            setImages([updatedImage, ...images]);
            setEditImage(null);
        } catch (err) { setError("Error de edición"); } finally { setIsGenerating(false); }
    };

    const isGenerateDisabled = isGenerating || isUpscaling || (mode === 'text-to-image' && !prompt.trim() && !genSource && !genSource2) || (mode === 'remix' && !remixSource);
    // El mejorador necesita texto o imagen: con imagen propone las variantes
    // analizándola.
    const canEnhance = !!prompt.trim() || !!activeSource;
    const promptConfig = getPromptVariantConfig(mode);
    const resolutionApplies = supportsResolution(selectedModel);

    return (
        <ApiKeyChecker>
            {(isGenerating || isUpscaling) && (
                <LoadingOverlay
                    status={progressStatus}
                    title={isUpscaling ? 'Ampliando imagen…' : 'IA generando lo solicitado...'}
                />
            )}
            <div className="min-h-screen custom-scrollbar overflow-y-auto">
                {view === 'splash' ? (
                    <Splash onSelect={handleStart} />
                ) : (
                    <div className="flex flex-col lg:flex-row min-h-screen">
                        <aside className="lg:w-[440px] glass border-r border-white/5 lg:sticky lg:top-0 lg:h-screen overflow-y-auto p-10 space-y-10 custom-scrollbar flex flex-col z-20">
                            <div className="flex flex-col items-start gap-2 shrink-0">
    <h1 onClick={() => setView('splash')} className="aside-title flex items-center gap-3 cursor-pointer">
        <Wand2 className="text-cyan-400" size={28} />
        {mode === 'remix' ? 'Editar Imagen' : 'Generar Imágenes'}
    </h1>
    <FlowStatusPill flow={flowState} />
</div>
                            <button
                                onClick={() => setView('splash')}
                                className="ar-effect self-start -mt-[10px] mb-2 px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5"
                                title="Volver al inicio"
                            >
                                ← Volver
                            </button>
                            {/* Imagen base del modo Editar (obligatoria) y su referencia opcional. */}
                            {mode === 'remix' && (
                                <div className="space-y-4 animate-in">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="btn-canon text-[11px] text-cyan-400">Imagen a Editar</span>
                                        {remixSource && (
                                            <button
                                                type="button"
                                                onClick={clearSource('base')}
                                                className="ar-effect px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5"
                                                title="Quitar imagen"
                                            >
                                                <X size={12} /> Quitar
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        aria-label={remixSource ? 'Cambiar la imagen a editar' : 'Subir la imagen a editar'}
                                        className="w-full relative group cursor-pointer border-2 border-dashed border-cyan-500/30 rounded-[2.5rem] overflow-hidden aspect-video flex items-center justify-center bg-slate-900/40 hover:border-cyan-400 focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 transition-all"
                                    >
                                        {remixSource ? (
                                            <img src={remixSource} alt="Imagen original que se va a editar" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-cyan-400 flex flex-col items-center gap-2">
                                                <Upload size={24} />
                                                <span className="btn-canon text-[10px]">Sube Imagen</span>
                                            </span>
                                        )}
                                    </button>

                                    {/* Referencia opcional: no se transforma, guía la edición de la base. */}
                                    <div className="space-y-2">
                                        <span className="btn-canon text-[10px] text-cyan-400">Imagen de Referencia (Opcional)</span>
                                        <div className="edit-ref-card">
                                            <button
                                                type="button"
                                                onClick={() => fileInputEditRef.current?.click()}
                                                aria-label={remixRef ? 'Cambiar la imagen de referencia de la edición' : 'Subir una imagen de referencia para la edición'}
                                                className="edit-ref-main"
                                            >
                                                <span className="edit-ref-thumb">
                                                    {remixRef
                                                        ? <img src={remixRef} alt="Imagen de referencia para la edición" />
                                                        : <Upload size={18} />}
                                                </span>
                                                <span className="edit-ref-copy">
                                                    <span className="edit-ref-title">{remixRef ? 'Referencia cargada' : 'Añadir referencia'}</span>
                                                    <span className="model-quality-hint">
                                                        {remixRef
                                                            ? 'Guía el estilo, el sujeto o los colores.'
                                                            : 'Opcional: estilo, sujeto o colores.'}
                                                    </span>
                                                </span>
                                            </button>
                                            {remixRef && (
                                                <button
                                                    type="button"
                                                    onClick={clearSource('refedit')}
                                                    className="ar-effect edit-ref-remove"
                                                    title="Quitar imagen de referencia"
                                                    aria-label="Quitar imagen de referencia"
                                                >
                                                    <X size={11} /> Quitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                            <input type="file" ref={fileInput2Ref} onChange={(e) => handleFileUpload(e, 'ref2')} className="hidden" accept="image/*" />
                            <input type="file" ref={fileInputEditRef} onChange={(e) => handleFileUpload(e, 'refedit')} className="hidden" accept="image/*" />

                            <div className="space-y-3" aria-busy={isEnhancing}>
                                <label htmlFor="prompt-input" className="btn-canon text-[11px] text-cyan-400">
                                    {mode === 'remix' ? 'Especifica los detalles a editar' : 'Describe tu imagen'}
                                </label>

                                <textarea
                                    id="prompt-input"
                                    ref={promptRef}
                                    value={prompt}
                                    onChange={(e) => {
                                        setPrompt(e.target.value);
                                        if (activeVariant !== null && promptVariants[activeVariant] && promptVariants[activeVariant].text !== e.target.value) {
                                            setActiveVariant(null);
                                        }
                                    }}
                                    placeholder={mode === 'remix' ? 'Detalla los cambios que quieres aplicar...' : 'Detalla lo que deseas ver en tu imagen...'}
                                    className="w-full h-48 bg-black/20 border border-white/5 rounded-3xl p-6 text-sm outline-none resize-none custom-scrollbar focus:border-cyan-400 placeholder:text-cyan-400 transition-all shadow-inner"
                                />

                                <button
                                    type="button"
                                    onClick={handleEnhance}
                                    disabled={isEnhancing || isUpscaling || !canEnhance}
                                    aria-busy={isEnhancing}
                                    className="structured-enhance-button w-full"
                                >
                                    {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                    {isEnhancing ? 'PROCESANDO...' : promptConfig.buttonLabel}
                                </button>

                                {promptError && (
                                    <p className="prompt-error" role="alert">{promptError}</p>
                                )}

                                {promptVariants.length > 0 && (
                                    <div className="prompt-variants" role="group" aria-label={promptConfig.panelLabel}>
                                        {promptVariants.map((variant, index) => (
                                            <button
                                                key={`${variant.type}-${index}`}
                                                type="button"
                                                onClick={() => applyPromptVariant(index)}
                                                aria-pressed={activeVariant === index}
                                                className={`prompt-variant ${activeVariant === index ? 'active' : ''}`}
                                            >
                                                <span className="prompt-variant-head">
                                                    <span className="prompt-variant-label">{promptConfig.itemLabel} {index + 1}</span>
                                                    <span className="prompt-variant-type">{variant.type}</span>
                                                </span>
                                                <span className="prompt-variant-text">{variant.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="sr-only" aria-live="polite">
                                    {isEnhancing
                                        ? 'Generando propuestas de prompt.'
                                        : (promptVariants.length > 0 ? `${promptVariants.length} propuestas disponibles. Elige una para editarla en el campo.` : '')}
                                </div>
                            </div>

                            {/* Upscaler del modo Editar: 2K/4K/8K reales a partir de la última imagen. */}
                            {mode === 'remix' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="btn-canon text-[11px] text-cyan-400">Upscaler</span>
                                        {upscaleSource && (
                                            <img src={upscaleSource} alt="Imagen que se va a ampliar" className="upscale-thumb" />
                                        )}
                                    </div>
                                    <div className="model-toggle-group" role="group" aria-label="Seleccionar resolución de ampliación">
                                        {UPSCALE_TARGETS.map((target) => (
                                            <button
                                                key={target.label}
                                                type="button"
                                                onClick={() => handleUpscale(target)}
                                                disabled={isUpscaling || isGenerating || !upscaleSource}
                                                aria-pressed={lastUpscale === target.id}
                                                className={`model-toggle ${lastUpscale === target.id ? 'active' : ''}`}
                                                title={`Ampliar a ${target.label} (${target.longEdge} px de lado largo)`}
                                            >
                                                {target.label}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="model-quality-hint upscale-hint">
                                        {upscaleSource
                                            ? '2K / 4K / 8K reales · 8K = 7680 px de lado largo. No añade detalle nuevo.'
                                            : 'Genera o sube una imagen para ampliarla.'}
                                    </span>
                                </div>
                            )}

                            {/* Imagenes de referencia del modo Generar (opcionales): van despues del
                                texto, que es la instruccion principal del prompt. Con dos imagenes
                                el prompt las combina en una sola generacion. */}
                            {mode === 'text-to-image' && (
                                <div className="space-y-4 animate-in">
                                    <span className="btn-canon text-[11px] text-cyan-400">Imágenes de Referencia (Opcional)</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Referencia 1 */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="btn-canon text-[10px] text-cyan-400">Referencia 1</span>
                                                {genSource && (
                                                    <button
                                                        type="button"
                                                        onClick={clearSource('ref1')}
                                                        className="ar-effect px-2 py-1 text-[10px] font-medium rounded-lg flex items-center gap-1"
                                                        title="Quitar imagen de referencia 1"
                                                        aria-label="Quitar imagen de referencia 1"
                                                    >
                                                        <X size={11} /> Quitar
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                aria-label={genSource ? 'Cambiar la imagen de referencia 1' : 'Subir la imagen de referencia 1'}
                                                className="w-full relative group cursor-pointer border-2 border-dashed border-cyan-500/30 rounded-3xl overflow-hidden aspect-square flex items-center justify-center bg-slate-900/40 hover:border-cyan-400 focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 transition-all"
                                            >
                                                {genSource ? (
                                                    <img src={genSource} alt="Imagen de referencia 1 cargada" className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-cyan-400 flex flex-col items-center gap-2">
                                                        <Upload size={20} />
                                                        <span className="btn-canon text-[10px]">Sube Imagen</span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>

                                        {/* Referencia 2 */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="btn-canon text-[10px] text-cyan-400">Referencia 2</span>
                                                {genSource2 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearSource('ref2')}
                                                        className="ar-effect px-2 py-1 text-[10px] font-medium rounded-lg flex items-center gap-1"
                                                        title="Quitar imagen de referencia 2"
                                                        aria-label="Quitar imagen de referencia 2"
                                                    >
                                                        <X size={11} /> Quitar
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInput2Ref.current?.click()}
                                                aria-label={genSource2 ? 'Cambiar la imagen de referencia 2' : 'Subir la imagen de referencia 2'}
                                                className="w-full relative group cursor-pointer border-2 border-dashed border-cyan-500/30 rounded-3xl overflow-hidden aspect-square flex items-center justify-center bg-slate-900/40 hover:border-cyan-400 focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 transition-all"
                                            >
                                                {genSource2 ? (
                                                    <img src={genSource2} alt="Imagen de referencia 2 cargada" className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-cyan-400 flex flex-col items-center gap-2">
                                                        <Upload size={20} />
                                                        <span className="btn-canon text-[10px]">Sube Imagen</span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <span className="model-quality-hint">
                                        {genSource && genSource2
                                            ? 'Se combinarán las dos referencias con tu instrucción de texto.'
                                            : (genSource || genSource2
                                                ? 'Se usará como referencia junto a tu instrucción de texto.'
                                                : 'Opcional: sin imágenes se genera solo desde el texto.')}
                                    </span>
                                </div>
                            )}

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
                                    <CustomSelect
                                        options={STYLE_GROUPS.fotografia}
                                        value={STYLE_GROUPS.fotografia.some(s => s.id === selectedStyle.id) ? selectedStyle.id : ''}
                                        onChange={(id) => id ? setSelectedStyle(STYLE_GROUPS.fotografia.find(s => s.id === id)) : setSelectedStyle({ id: '', name: 'Original', promptSuffix: '' })}
                                    />
                                    <CustomSelect
                                        options={HISTORICAL_ERAS}
                                        value={HISTORICAL_ERAS.some(e => e.id === (selectedEra && selectedEra.id)) ? (selectedEra && selectedEra.id) : ''}
                                        onChange={(id) => setSelectedEra(HISTORICAL_ERAS.find(e => e.id === id) || HISTORICAL_ERAS[0])}
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
                                {isFlowModel(selectedModel) && (
                                    <span className="model-quality-hint">
                                        Flow admite 1:1, 4:3, 3:4, 16:9 y 9:16 · el 21:9 se genera en 16:9
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="btn-canon text-[11px] text-cyan-400">Resolución</label>
                                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Seleccionar resolución">
                                    {RESOLUTIONS.map((res) => (
                                        <button
                                            key={res}
                                            type="button"
                                            onClick={() => setSelectedRes(res)}
                                            disabled={!resolutionApplies}
                                            aria-pressed={selectedRes === res}
                                            className={`aspect-ratio-button ${selectedRes === res ? 'active' : ''} disabled:opacity-30 disabled:cursor-not-allowed`}
                                        >
                                            <div className="flex items-center justify-center"><LayoutGrid size={18} /></div>
                                            <span className="btn-canon text-[9px]">{res}</span>
                                        </button>
                                    ))}
                                </div>
                                <span className="model-quality-hint">
                                    {resolutionApplies
                                        ? 'Lado largo · OpenAI ajusta a 1-4 MP'
                                        : (isFlowModel(selectedModel) ? 'No aplica: Flow genera a su resolución nativa (~1K)' : 'No aplica: Gemini y Qwen fijan 1K')}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <label className="btn-canon text-[11px] text-cyan-400">Cantidad de Imágenes</label>
                                <div className="model-toggle-group count-group" role="group" aria-label="Seleccionar cantidad de imágenes">
                                    {IMAGE_COUNTS.map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setImageCount(count)}
                                            disabled={isGenerating}
                                            aria-pressed={imageCount === count}
                                            className={`model-toggle ${imageCount === count ? 'active' : ''}`}
                                            title={count === 1 ? 'Generar 1 imagen' : `Generar ${count} imágenes`}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                                <span className="model-quality-hint count-hint">
                                    {imageCount === 1 ? '1 imagen por generación' : `${imageCount} imágenes · una generación por imagen`}
                                </span>
                            </div>

                            {/* ── Selector de Modelo IA (canonico hoola) ── */}
                            <div className="model-selector">
                              <span className="model-selector-label">Modelo IA</span>
                              <div className="model-provider-layout" role="group" aria-label="Seleccionar modelo">
                                {[
                                  [{ provider: 'OPENAI 2.5', models: [{ id: 'openai-medium', name: 'MEDIUM' }, { id: 'openai-high', name: 'HIGH' }, { id: 'openai-xhigh', name: 'XHIGH' }, { id: 'openai-max-flare', name: 'MAX FLARE' }, { id: 'openai-max-sunburst', name: 'MAX SUNBURST' }] }],
                                  [
                                    { provider: 'GEMINI', models: [{ id: 'gemini-2', name: 'GEMINI 2' }, { id: 'gemini-flash', name: '3.1 FLASH' }, { id: 'gemini-pro', name: '3 PRO' }] },
                                    { provider: 'QWEN', models: [{ id: 'qwen-pro', name: 'QWEN 3 PRO' }] },
                                    { provider: 'IMAGE 2', models: [{ id: 'openai-image-2-low', name: 'LOW' }, { id: 'openai-image-2', name: 'MEDIUM' }, { id: 'openai-image-2-high', name: 'HIGH' }] }
                                  ],
                                  [
                                    { provider: 'FLOW', models: [{ id: 'flow-nano-banana-2', name: 'NANO BANANA 2' }, { id: 'flow-nano-banana-pro', name: 'NANO BANANA PRO' }, { id: 'flow-nano-banana-2-lite', name: 'NANO BANANA 2 LITE' }] }
                                  ]
                                ].map((row, rowIndex) => (
                                  <div className="model-provider-row" key={rowIndex}>
                                    {row.map(group => (
                                      <div className="model-provider-column" key={group.provider}>
                                        <span className="model-provider-title btn-canon">{group.provider}</span>
                                        {group.provider === 'OPENAI 2.5' && <span className="model-quality-hint">De Menor a Mayor Calidad</span>}
                                        <div className="model-toggle-group">
                                          {group.models.map(m => (
                                            <button
                                              type="button"
                                              key={m.id}
                                              onClick={() => setSelectedModel(m.id)}
                                              className={`model-toggle ${selectedModel === m.id ? 'active' : ''}`}
                                              aria-pressed={selectedModel === m.id}
                                              aria-describedby="model-tooltip"
                                              data-model={m.id}
                                              data-tooltip={window.MODEL_TOOLTIP_TEXTS[m.id] || ''}
                                            >{m.name}</button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
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
                                    <div
                                        ref={historyScrollRef}
                                        className="history-scroll custom-scrollbar"
                                        tabIndex={0}
                                        role="region"
                                        aria-label="Historial de imágenes"
                                    >
                                        <div className="history-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                            {images.map((img) => (
                                                <ImageCard key={img.id} image={img} onDelete={handleDelete} onRegenerate={handleRegenerate} onEdit={handleOpenEdit} onClick={setLightboxImage} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </main>

                        {lightboxImage && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-8 cursor-zoom-out" onClick={() => setLightboxImage(null)}>
                                <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center gap-8">
                                    <img src={lightboxImage.url} className="max-w-full max-h-[85vh] object-contain rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5" />
                                    <div className="glass px-8 py-4 rounded-full flex gap-10 text-[11px] text-gray-400 uppercase btn-canon" onClick={(e) => e.stopPropagation()}>
                                        {lightboxImage.era && lightboxImage.era.shortName && lightboxImage.era.shortName !== 'Sin Era' ? <span className="text-cyan-400">{lightboxImage.era.shortName}</span> : null}
                                        <span className="text-cyan-400">{lightboxImage.aspectRatio}</span>
                                        <span className="text-cyan-400">{getModelLabel(lightboxImage.model)}</span>
                                        <span>RES: {getSizeLabel(lightboxImage.size)}{lightboxImage.width ? ` · ${lightboxImage.width}×${lightboxImage.height}` : ''}</span>
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

// Tooltip de modelos (popup hover) — delegación global (funciona con re-renders de React)
(function initModelTooltip() {
    const tooltip = document.getElementById('model-tooltip');
    if (!tooltip) return;
    const TOOLTIP_GAP = 10;
    const hide = () => {
        tooltip.classList.remove('visible', 'tip-above', 'tip-below');
        tooltip.setAttribute('aria-hidden', 'true');
        tooltip.textContent = '';
    };
    const show = (btn) => {
        const text = (btn.getAttribute('data-tooltip') || '').trim();
        if (!text) { hide(); return; }
        tooltip.textContent = text;
        tooltip.classList.remove('tip-above', 'tip-below');
        tooltip.classList.add('visible');
        tooltip.setAttribute('aria-hidden', 'false');
        const rect = btn.getBoundingClientRect();
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        let left = rect.left + rect.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        let top = rect.top - th - TOOLTIP_GAP;
        if (top < 8) { top = rect.bottom + TOOLTIP_GAP; tooltip.classList.add('tip-below'); }
        else { tooltip.classList.add('tip-above'); }
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    };
    document.addEventListener('mouseover', (e) => { const b = e.target.closest('.model-toggle'); if (b) show(b); });
    document.addEventListener('mouseout', (e) => { const b = e.target.closest('.model-toggle'); if (b) hide(); });
    document.addEventListener('focusin', (e) => { const b = e.target.closest('.model-toggle'); if (b) show(b); });
    document.addEventListener('focusout', (e) => { const b = e.target.closest('.model-toggle'); if (b) hide(); });
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
})();
