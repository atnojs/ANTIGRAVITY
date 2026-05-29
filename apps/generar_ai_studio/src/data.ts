import { VisualStyle, AspectRatioOption, GeneratedImage } from "./types";

export const VISUAL_STYLES: VisualStyle[] = [
  {
    id: "photorealistic",
    name: "Fotorrealista",
    thumbnail: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Calidad DSLR con iluminación natural orgánica, maestría en resolución de 8k"
  },
  {
    id: "cinematic",
    name: "Cinematográfico",
    thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Destellos anamórficos, atmósfera de niebla profunda, escala narrativa épica"
  },
  {
    id: "3d commercial",
    name: "Comercial 3D",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Renders pulidos de Octane, productos de plástico, arcilla y vidrio vibrantes"
  },
  {
    id: "anime",
    name: "Anime",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Fondos de acuarela de estudio, trazos digitales nítidos y futuristas"
  },
  {
    id: "minimalist logo",
    name: "Logotipo Minimalista",
    thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Formas matemáticas limpias, marca vectorial, simplicidad de alta gama"
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    thumbnail: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Corredores de tecnología cargados de neón, pantallas holográficas, calles mojadas"
  },
  {
    id: "editorial fashion",
    name: "Moda Editorial",
    thumbnail: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Prendas estilizadas de alta costura, poses dramáticas y poses de moda"
  },
  {
    id: "watercolor",
    name: "Acuarela Artística",
    thumbnail: "https://images.unsplash.com/photo-1579161901243-7f67e8e51ac2?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Manchas de acuarela fluida, bordes suaves, transparencias etéreas y lavados de color"
  },
  {
    id: "oil-painting",
    name: "Pintura al Óleo",
    thumbnail: "https://images.unsplash.com/photo-1578926281977-8bce40a28f76?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Pinceladas texturizadas, empastes gruesos, claroscuro clásico, profundidad de galería"
  },
  {
    id: "pixel-art",
    name: "Pixel Art",
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Estética retro 8-bit/16-bit, cuadrícula visible, paletas limitadas, encanto nostálgico"
  },
  {
    id: "pencil-sketch",
    name: "Boceto a Lápiz",
    thumbnail: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Trazos de grafito expresivos, sombreado cruzado, textura de papel, estudio artístico"
  },
  {
    id: "pop-art",
    name: "Arte Pop",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Colores saturados, patrones de semitonos, estética cómic, estilo Warhol vibrante"
  },
  {
    id: "steampunk",
    name: "Steampunk",
    thumbnail: "https://images.unsplash.com/photo-1599664146284-a074fe4cf7ea?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Latón pulido, engranajes victorianos, vapor y relojería, ciencia ficción retrospectiva"
  },
  {
    id: "surrealism",
    name: "Surrealismo",
    thumbnail: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=240&h=240&q=80",
    description: "Paisajes oníricos imposibles, escalas distorsionadas, relojes derretidos, lógica de sueños"
  }
];

export const ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: "1:1",
    label: "1:1 Cuadrado",
    subLabel: "Publicaciones estándar, avatares de perfil",
    ratio: "aspect-square",
    displayRatio: "1:1",
    icon: "Square"
  },
  {
    id: "16:9",
    label: "16:9 Cinematográfico (YouTube)",
    subLabel: "Video de pantalla ancha, fondo de pantalla de escritorio",
    ratio: "aspect-video",
    displayRatio: "16:9",
    icon: "Tv"
  },
  {
    id: "9:16",
    label: "9:16 Vertical (Reels)",
    subLabel: "Tamaños de pantalla móvil, historias de IG",
    ratio: "aspect-[9/16]",
    displayRatio: "9:16",
    icon: "Smartphone"
  },
  {
    id: "4:5",
    label: "4:5 Retrato",
    subLabel: "Feed estándar, diseño de alta altura",
    ratio: "aspect-[4/5]",
    displayRatio: "4:5",
    icon: "Image"
  }
];

export const INITIAL_GALLERY_IMAGES: GeneratedImage[] = [
  {
    id: "init-1",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    prompt: "Escultura abstracta fluida en 3D, capas de vidrio coloridas con iluminación ambiental suave y formas de arcilla, presentación corporativa minimalista, renderizado visual prístino",
    style: "Comercial 3D",
    aspectRatio: "1:1",
    seed: 4892019384,
    steps: 50,
    cfgScale: 7.5,
    sampler: "DPM++ 2M SDE Karras",
    generationTime: "1.12s",
    description: "Simulación física fluida que muestra dispersión cromática dentro de formas de vidrio en capas.",
    tags: ["Render 3D", "Vibrante", "Efecto Vidrio", "Abstracto"],
    createdAt: "2026-05-27T18:00:00Z"
  },
  {
    id: "init-2",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    prompt: "Personaje de anime futurista mirando hacia una avenida de Tokio empapada de neón, visor con pantalla holográfica, texturas de pintura dinámica de alto contraste, púrpuras y rosas profundos",
    style: "Anime",
    aspectRatio: "9:16",
    seed: 2210495811,
    steps: 60,
    cfgScale: 8.0,
    sampler: "DPM++ 2M SDE Karras",
    generationTime: "1.42s",
    description: "Paisaje de anime que resalta carteles de neón refractados en prendas de vinilo mojadas.",
    tags: ["Cyberpunk", "Vocaloid", "Studio Ghibli", "Fondo Móvil"],
    createdAt: "2026-05-27T18:30:00Z"
  },
  {
    id: "init-3",
    url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80",
    prompt: "Cresta brumosa cinematográfica con dramática retroiluminación cálida que se dispersa a través del bosque de pinos, plano panorámica extremo, profundidad atmosférica, filmado con Arri Alexa",
    style: "Cinematográfico",
    aspectRatio: "16:9",
    seed: 9811029312,
    steps: 45,
    cfgScale: 7.0,
    sampler: "Euler Ancestral",
    generationTime: "0.95s",
    description: "Paisaje atmosférico con capas profundas de niebla que crean relaciones de profundidad cinematográficas.",
    tags: ["Paisaje", "Brumoso", "Cine", "Amanecer"],
    createdAt: "2026-05-27T19:00:00Z"
  },
  {
    id: "init-4",
    url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
    prompt: "Look de alta costura vanguardista en modelo profesional, posado dramático lateral con sombras suaves, caída dinámica de tela de alto contraste, fotografía de moda editorial de lujo",
    style: "Moda Editorial",
    aspectRatio: "4:5",
    seed: 3340129845,
    steps: 55,
    cfgScale: 7.5,
    sampler: "DPM++ 2M SDE Karras",
    generationTime: "1.29s",
    description: "Look de alta costura que destaca los pliegues de lino estructurales y posados dramáticos.",
    tags: ["Alta Costura", "Vogue", "Retrato Modelo", "Modos Estudio"],
    createdAt: "2026-05-27T19:40:00Z"
  },
  {
    id: "init-5",
    url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80",
    prompt: "Primer plano extremo macro del retrato del sistema de lentes de una cámara profesional, engranajes de latón brillantes, elementos internos que analizan puntos de luz microscópicos, realismo puro profunda 8k",
    style: "Fotorrealista",
    aspectRatio: "1:1",
    seed: 7759283912,
    steps: 50,
    cfgScale: 6.5,
    sampler: "Euler Ancestral",
    generationTime: "1.15s",
    description: "Captura fotográfica macro de equipamiento de hardware premium altamente denso.",
    tags: ["Macro de Lente", "Hasselblad", "Realismo", "Mecánico"],
    createdAt: "2026-05-27T20:10:00Z"
  },
  {
    id: "init-6",
    url: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=1200&q=80",
    prompt: "Imponentes megaestructuras cyberpunk que brillan con hologramas corporativos de neón, vista aérea panorámica, diseño denso de ciberciudad, iluminación clave dramática, fotorrealista octane 8k",
    style: "Cyberpunk",
    aspectRatio: "16:9",
    seed: 6659102834,
    steps: 50,
    cfgScale: 7.8,
    sampler: "DPM++ 2M SDE Karras",
    generationTime: "1.34s",
    description: "Línea de horizonte corporativa del futuro envuelta por emisiones de neón y columnas de niebla densa.",
    tags: ["Ciberciudad", "Neón", "Metrópolis", "Render de Octane"],
    createdAt: "2026-05-27T20:45:00Z"
  }
];
