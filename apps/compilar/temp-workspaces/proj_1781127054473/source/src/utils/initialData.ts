/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, Collection, Prompt } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-coding',
    name: 'Desarrollo y Código',
    icon: 'Code',
    color: 'bg-indigo-500',
  },
  {
    id: 'cat-images',
    name: 'Imágenes y Midjourney',
    icon: 'Image',
    color: 'bg-emerald-500',
  },
  {
    id: 'cat-marketing',
    name: 'Ventas y Copywriting',
    icon: 'Megaphone',
    color: 'bg-rose-500',
  },
  {
    id: 'cat-creative',
    name: 'Redacción Creativa',
    icon: 'Sparkles',
    color: 'bg-amber-500',
  },
];

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'coll-midjourney',
    name: 'Midjourney v6 Premium',
    description: 'Estilos fotorrealistas y directivas de iluminación avanzada.',
    icon: 'Camera',
  },
  {
    id: 'coll-startup',
    name: 'Kit de Lanzamiento de Startups',
    description: 'Redacción de valor, emails de captación y copiado para páginas web.',
    icon: 'Rocket',
  },
  {
    id: 'coll-productivity',
    name: 'Super Productividad',
    description: 'Prompts estructurados para automatizar tareas, resumir hilos y programar sprints.',
    icon: 'Cpu',
  },
];

export const INITIAL_PROMPTS: Prompt[] = [
  {
    id: 'prompt-fotorrealismo',
    title: 'Retrato Cinematográfico Ultra-Realista',
    content: 'A close-up photographic portrait of [SUBJECT] standing in [ENVIRONMENT]. Captured with a [CAMERA_LENS] lens, highly detailed, photorealistic skin textures, pores, and fine hairs. Under a dramatic [LIGHTING_STYLE] lighting style, warm golden highlights and deep cinematic shadows. Shot on Hasselblad 100c, 8k resolution, photorealistic, Unreal Engine 5 render feel, award-winning composition --ar 16:9 --style raw --v 6.0',
    description: 'Genera retratos espectaculares en Midjourney con detalles faciales perfectos y luces de estudio profesionales.',
    categoryId: 'cat-images',
    collectionId: 'coll-midjourney',
    isFavorite: true,
    isTrash: false,
    tags: ['Midjourney', 'Fotorrealismo', 'Retrato', 'Fotografía'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24h ago
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2h ago
    imageUrl: '', // Can be a custom gradient if none provided
    variables: ['SUBJECT', 'ENVIRONMENT', 'CAMERA_LENS', 'LIGHTING_STYLE'],
    versions: [
      {
        id: 'v1',
        content: 'A detailed photographic portrait of [SUBJECT] in [ENVIRONMENT] with cinematic lighting. Hasselblad, 8k.',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        note: 'Versión inicial básica',
      },
      {
        id: 'v2',
        content: 'A close-up photographic portrait of [SUBJECT] standing in [ENVIRONMENT]. Captured with a [CAMERA_LENS] lens, highly detailed, photorealistic skin textures, pores, and fine hairs. Under a dramatic [LIGHTING_STYLE] lighting style, warm golden highlights and deep cinematic shadows. Shot on Hasselblad 100c, 8k resolution, photorealistic, Unreal Engine 5 render feel, award-winning composition --ar 16:9 --style raw --v 6.0',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        note: 'Se añadieron parámetros estables de Midjourney v6 y relación de aspecto --ar 16:9',
      }
    ],
  },
  {
    id: 'prompt-react-gen',
    title: 'Generador Profesional de Componentes React',
    content: 'Act as an elite frontend software architect specializing in React 19, TypeScript, and Tailwind CSS. Design a highly performance-optimized, clean component named {{COMPONENT_NAME}} that handles: {{PROPS_DESCRIPTION}}.\n\nEnsure strict conformance to the following specifications:\n- Write fully typed TypeScript props, interfaces, and event handlers.\n- Structure CSS styling purely using Tailwind CSS utility classes in a pristine and highly polished design layout.\n- Integrate appropriate Lucide React icons for all visual controls.\n- Write modular sub-components if required to avoid monolithic files. Avoid unnecessary state re-renders.\n- Output a single self-contained react code block, well-commented with explanations of the architectural choices.',
    description: 'Arquitectura limpia de TypeScript para componentes estilizados modularizados.',
    categoryId: 'cat-coding',
    collectionId: 'coll-startup',
    isFavorite: true,
    isTrash: false,
    tags: ['React', 'TypeScript', 'TailwindCSS', 'CleanCode'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    imageUrl: '',
    variables: ['COMPONENT_NAME', 'PROPS_DESCRIPTION'],
    versions: [
      {
        id: 'v1',
        content: 'Create a React component named {{COMPONENT_NAME}} with typescript support that does {{PROPS_DESCRIPTION}} and uses Tailwind CSS.',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        note: 'Primera iteración',
      },
      {
        id: 'v2',
        content: 'Act as an elite frontend software architect specializing in React 19, TypeScript, and Tailwind CSS. Design a highly performance-optimized, clean component named {{COMPONENT_NAME}} that handles: {{PROPS_DESCRIPTION}}.\n\nEnsure strict conformance to the following specifications:\n- Write fully typed TypeScript props, interfaces, and event handlers.\n- Structure CSS styling purely using Tailwind CSS utility classes in a pristine and highly polished design layout.\n- Integrate appropriate Lucide React icons for all visual controls.\n- Write modular sub-components if required to avoid monolithic files. Avoid unnecessary state re-renders.\n- Output a single self-contained react code block, well-commented with explanations of the architectural choices.',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        note: 'Se agregó soporte estricto para React 19, diseño de buenas prácticas de modulación y Lucide Icons.',
      }
    ],
  },
  {
    id: 'prompt-hero-copy',
    title: 'Estructuración de Sección Hero de Altas Conversiones',
    content: 'Write a compelling, Conversion-Rate-Optimized (CRO) copywriting package for a landing page hero section. The product is named {PRODUCT_NAME}, tailored specifically for {TARGET_AUDIENCE}. The core value it delivers is: {UNIQUE_VALUE_PROPOSITION}.\n\nPlease output:\n1. A punchy Headline (under 10 words) highlighting the ultimate transformation.\n2. A Subheadline (under 25 words) grounding the feature set and removing skepticism.\n3. Two clear Call-to-Action (CTA) button copy texts (Primary and secondary fallback).\n4. A 3-bullet list of social-proof triggers or guarantees that would build immediate trust.\n\nStyle guidelines: Tone must be authoritative yet incredibly welcoming, empathetic, and clear. Avoid generic corporate buzzwords.',
    description: 'Copywriting enfocado en métricas de conversión con jerarquía visual de contenidos.',
    categoryId: 'cat-marketing',
    collectionId: 'coll-startup',
    isFavorite: false,
    isTrash: false,
    tags: ['Copywriting', 'CRO', 'LandingPage', 'Conversión'],
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    imageUrl: '',
    variables: ['PRODUCT_NAME', 'TARGET_AUDIENCE', 'UNIQUE_VALUE_PROPOSITION'],
    versions: [
      {
        id: 'v1',
        content: 'Write a compelling corporate tagline for {PRODUCT_NAME} addressing {TARGET_AUDIENCE} regarding {UNIQUE_VALUE_PROPOSITION}.',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        note: 'Esquema inicial de copy',
      }
    ],
  },
  {
    id: 'prompt-persona-creator',
    title: 'Creador de Arquetipos y Personajes Complejos',
    content: 'Generate a fictional character dossier named [CHARACTER_NAME] conforming to the literary archetype of [ARCHETYPE]. Their main personality flaws and strengths are: [FLAWS_AND_STRENGTHS].\n\nStructure the profile with:\n- Physical Description & Aesthetic Moodboard (brief keywords).\n- Psychological Profile: Core motivation, underlying fear, and secret agenda.\n- Key Dialect Patterns: Three distinctive catchphrases or speaking habits.\n- Arc of Transformation: How do their flaws trigger conflict in a standard narrative structure, and how can they overcome them?',
    description: 'Perfecto para novelistas, diseñadores de videojuegos y creadores de contenido que buscan tramas profundas.',
    categoryId: 'cat-creative',
    collectionId: 'coll-productivity',
    isFavorite: false,
    isTrash: false,
    tags: ['Narrativa', 'Escritura', 'Gaming', 'Ficción'],
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    imageUrl: '',
    variables: ['CHARACTER_NAME', 'ARCHETYPE', 'FLAWS_AND_STRENGTHS'],
    versions: [
      {
        id: 'v1',
        content: 'Generate a fictional character dossier named [CHARACTER_NAME] conforming to the literary archetype of [ARCHETYPE]. Their main personality flaws and strengths are: [FLAWS_AND_STRENGTHS].',
        createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
        note: 'Esquema inicial literario',
      }
    ],
  }
];
