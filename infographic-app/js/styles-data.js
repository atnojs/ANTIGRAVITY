// ============================================================
// INFÓGRAPHIC APP - 50 Estilos de Infografía
// ============================================================

const STYLES = [
  // ============ 🧒 INFANTIL / NIÑOS (7-10 años) ============
  {
    id: 'crayon-kids',
    name: 'Crayon Kids',
    category: 'infantil',
    emoji: '🖍️',
    audience: 'niños',
    desc: 'Trazos de crayón grueso, imperfectos, colores primarios sobre papel',
    colors: '#FF6B35,#FFD166,#06D6A0,#118AB2,#EF476F',
    prompt_extra: 'Children crayon drawing style, thick colored strokes, messy playful texture, primary colors, white paper background, child-friendly illustrations, large simple playful text'
  },
  {
    id: 'cuento-magico',
    name: 'Cuento Mágico',
    category: 'infantil',
    emoji: '📖',
    audience: 'niños',
    desc: 'Estilo libro infantil ilustrado, acuarela suave, personajes animales',
    colors: '#F8EDE3,#C9E4DE,#C6D8E6,#F2C6C6,#E8D5C4',
    prompt_extra: 'Storybook illustration style, soft watercolor textures, whimsical animal characters, gentle pastel colors, fairy tale atmosphere, rounded friendly shapes'
  },
  {
    id: 'lego-brick',
    name: 'Lego Build',
    category: 'infantil',
    emoji: '🧱',
    audience: 'niños',
    desc: 'Todo construido con piezas Lego, colores vibrantes, bloques 3D',
    colors: '#E3000F,#FFD100,#00A3D7,#00B159,#FF6B00',
    prompt_extra: 'LEGO brick construction style, everything made of colorful interlocking plastic blocks, 3D isometric view, bright toy colors, blocky geometric shapes'
  },
  {
    id: 'pixel-adventure',
    name: 'Pixel Adventure',
    category: 'infantil',
    emoji: '👾',
    audience: 'niños',
    desc: 'Estilo 8-bit / pixel art tipo videojuego retro',
    colors: '#2D1B69,#FF4365,#4BC0C0,#FFB347,#7B2D8E',
    prompt_extra: 'Retro 8-bit pixel art style, classic video game aesthetic, chunky pixels, limited color palette, game character elements, nostalgic Nintendo-like'
  },
  {
    id: 'globos-arcoiris',
    name: 'Globos Arcoíris',
    category: 'infantil',
    emoji: '🌈',
    audience: 'niños',
    desc: 'Fondo de arcoíris, nubes, globos, muy alegre y colorido',
    colors: '#FF0000,#FF7F00,#FFFF00,#00FF00,#0000FF,#8B00FF',
    prompt_extra: 'Rainbow themed infographic, hot air balloons, fluffy clouds, colorful gradient sky, joyful whimsical style, bright saturated colors, party atmosphere'
  },
  {
    id: 'sticker-album',
    name: 'Sticker Album',
    category: 'infantil',
    emoji: '🏷️',
    audience: 'niños',
    desc: 'Estilo álbum de pegatinas, bordes blancos recortados, brillo',
    colors: '#FF8C94,#FAD02C,#9DE0AD,#45B7D1,#FF69B4',
    prompt_extra: 'Sticker album style, cut-out sticker shapes with white borders, glossy shiny effect, collectible card aesthetic, scattered playful layout'
  },
  {
    id: 'mono-doodle',
    name: 'Mono Doodle',
    category: 'infantil',
    emoji: '✏️',
    audience: 'niños',
    desc: 'Garabatos monocromáticos tipo cuaderno, trazo suelto y divertido',
    colors: '#2C2C2C,#F5F5F0,#8B8B8B,#E0E0D8,#5C5C5C',
    prompt_extra: 'Monochrome doodle style, black pen on notebook paper, loose sketchy lines, hand-drawn feel, cross-hatching, imperfect organic shapes'
  },
  {
    id: 'comic-bubble',
    name: 'Comic Bubble',
    category: 'infantil',
    emoji: '💬',
    audience: 'niños',
    desc: 'Estilo cómic / viñetas con bocadillos de diálogo',
    colors: '#FFD700,#FF4500,#000000,#FFFFFF,#00BFFF',
    prompt_extra: 'Comic book style, panel frames with speech bubbles, Ben-Day dots effect, bold black outlines, superhero comic colors, action words with exclamations'
  },
  {
    id: 'play-doh',
    name: 'Play-Doh',
    category: 'infantil',
    emoji: '🟣',
    audience: 'niños',
    desc: 'Textura de plastilina, formas orgánicas abultadas, colores vivos',
    colors: '#FF1493,#FFD700,#32CD32,#00BFFF,#FF6347',
    prompt_extra: 'Play-Doh clay style, squishy puffy 3D shapes, plasticine texture, molded organic forms, bright saturated colors, tactile sculptural appearance'
  },
  {
    id: 'finger-paint',
    name: 'Finger Paint',
    category: 'infantil',
    emoji: '🎨',
    audience: 'niños',
    desc: 'Pintura de dedos, manchas coloridas, textura táctil',
    colors: '#E74C3C,#F39C12,#2ECC71,#3498DB,#9B59B6',
    prompt_extra: 'Finger painting style, smudged paint textures, handprint marks, messy colorful strokes, thick paint application, tactile child art look'
  },

  // ============ 👴 ADULTOS MAYORES ============
  {
    id: 'senior-clear',
    name: 'Senior Clear',
    category: 'senior',
    emoji: '👁️',
    audience: 'mayores',
    desc: 'Altísimo contraste, tipografía enorme, ultra-claro',
    colors: '#000000,#FFFFFF,#FFD700,#1A5276,#D4E6F1',
    prompt_extra: 'Ultra high contrast infographic for elderly, very large bold font minimum 24pt, black text on white background, simple universal icons, maximum readability, no visual noise, clear sections'
  },
  {
    id: 'gran-diario',
    name: 'Gran Diario',
    category: 'senior',
    emoji: '📰',
    audience: 'mayores',
    desc: 'Estilo periódico: columnas claras, titulares enormes',
    colors: '#F5F0E8,#2C2C2C,#A0522D,#8B4513,#E8DCC8',
    prompt_extra: 'Large print newspaper style, broadsheet layout, big headlines, serif font, columns of text, classic newsprint beige background, traditional and familiar'
  },
  {
    id: 'senal-vial',
    name: 'Señal Vial',
    category: 'senior',
    emoji: '🚦',
    audience: 'mayores',
    desc: 'Inspirado en señales de tráfico: pictogramas universales',
    colors: '#003399,#FFFFFF,#FF0000,#009900,#FFCC00',
    prompt_extra: 'Traffic sign style, universal pictograms, standard signal colors, very simple icons, high contrast, clear bold shapes, instructional clarity like road signs'
  },
  {
    id: 'medico-claro',
    name: 'Médico Claro',
    category: 'senior',
    emoji: '🏥',
    audience: 'mayores',
    desc: 'Limpio, sin distracciones, azul/verde suave, tipo consulta',
    colors: '#E8F4F8,#A8D5E2,#1B7A9E,#F5F5F5,#2C3E50',
    prompt_extra: 'Clean medical clinic style, calming light blue and soft green tones, no distractions, generous white space, large readable type, professional welcoming'
  },
  {
    id: 'instructivo',
    name: 'Instructivo',
    category: 'senior',
    emoji: '📋',
    audience: 'mayores',
    desc: 'Estilo manual de instrucciones: pasos numerados, dibujos línea',
    colors: '#FFFFFF,#333333,#E0E0E0,#1565C0,#FF6F00',
    prompt_extra: 'IKEA manual style, step-by-step numbered instructions, minimal line drawings, no unnecessary text, clear sequential visual guides, assembly diagram look'
  },
  {
    id: 'pizarra-blanca',
    name: 'Pizarra Blanca',
    category: 'senior',
    emoji: '⬜',
    audience: 'mayores',
    desc: 'Rotulador negro sobre fondo blanco, esquemas simples, claro',
    colors: '#FFFFFF,#000000,#E53935,#1E88E5,#43A047',
    prompt_extra: 'Whiteboard style, black marker on white board, hand-drawn diagrams, simple clear sketches, colored marker accents, easy to follow, classroom clarity'
  },
  {
    id: 'papel-periodico',
    name: 'Papel Periódico',
    category: 'senior',
    emoji: '📜',
    audience: 'mayores',
    desc: 'Vintage prensa escrita, sepia, tipografía serif grande',
    colors: '#F4E4C1,#8B6914,#3E2723,#D4A574,#6D4C41',
    prompt_extra: 'Vintage newspaper style, sepia tones, aged paper texture, large serif typography, classic print layout, nostalgic historical feel, warm cream colors'
  },
  {
    id: 'gobierno-claro',
    name: 'Gobierno Claro',
    category: 'senior',
    emoji: '🏛️',
    audience: 'mayores',
    desc: 'Estilo institucional: serio, colores planos, accesible',
    colors: '#0D47A1,#FFFFFF,#F9A825,#1565C0,#E3F2FD',
    prompt_extra: 'Official government document style, serious professional layout, flat clean colors, maximum accessibility standards, clear hierarchy, trustworthy institutional'
  },
  {
    id: 'alta-vista',
    name: 'Alta Vista',
    category: 'senior',
    emoji: '🔆',
    audience: 'mayores',
    desc: 'Modo oscuro con texto brillante, para baja visión',
    colors: '#000000,#FFFF00,#FFFFFF,#00FF00,#00BFFF',
    prompt_extra: 'High visibility dark mode, black background with bright yellow and white text, ultra high contrast for low vision, very large bold fonts, no small details'
  },
  {
    id: 'calendario',
    name: 'Calendario',
    category: 'senior',
    emoji: '📅',
    audience: 'mayores',
    desc: 'Estilo almanaque / hoja de calendario, fechas grandes',
    colors: '#F5F0E8,#B71C1C,#1B5E20,#FFFFFF,#333333',
    prompt_extra: 'Calendar/almanac style, large date numbers, simple grid layout, familiar monthly calendar format, easy to scan, traditional appointment book feel'
  },

  // ============ 👔 CORPORATIVO / PROFESIONAL ============
  {
    id: 'boardroom',
    name: 'Boardroom',
    category: 'corporativo',
    emoji: '🏢',
    audience: 'adultos',
    desc: 'Estilo sala de juntas: azul corporativo, minimal, elegante',
    colors: '#1B2A4A,#FFFFFF,#C5A55A,#2E5C8A,#E8ECF1',
    prompt_extra: 'Corporate boardroom style, navy blue and gold, clean elegant lines, professional minimal layout, refined typography, serious business tone'
  },
  {
    id: 'consulting-dark',
    name: 'Consulting Dark',
    category: 'corporativo',
    emoji: '📊',
    audience: 'adultos',
    desc: 'Estilo consultoría: fondo oscuro, charts blancos, preciso',
    colors: '#0D1117,#FFFFFF,#58A6FF,#3FB950,#D29922',
    prompt_extra: 'Management consulting dark mode, McKinsey-inspired dark background, white charts and graphs, premium data visualization, sophisticated analytical look'
  },
  {
    id: 'startup-pitch',
    name: 'Startup Pitch',
    category: 'corporativo',
    emoji: '🚀',
    audience: 'adultos',
    desc: 'Estilo pitch deck: gradientes vibrantes, bold, moderno',
    colors: '#6C63FF,#FF6584,#00C9A7,#FFC107,#2D3436',
    prompt_extra: 'Startup pitch deck style, modern gradients, bold typography, vibrant accent colors, innovative fresh look, investor-ready presentation aesthetic'
  },
  {
    id: 'annual-report',
    name: 'Annual Report',
    category: 'corporativo',
    emoji: '📈',
    audience: 'adultos',
    desc: 'Estilo memoria anual: elegante, dorado/azul marino',
    colors: '#0A1628,#C9A84C,#FFFFFF,#1B3A5C,#D4C8A0',
    prompt_extra: 'Annual report style, navy and gold, premium elegant layout, financial-grade data presentation, sophisticated typography, formal business document'
  },
  {
    id: 'dashboard-pro',
    name: 'Dashboard Pro',
    category: 'corporativo',
    emoji: '📉',
    audience: 'adultos',
    desc: 'Estilo panel KPIs: widgets, indicadores, métricas',
    colors: '#1E293B,#F8FAFC,#3B82F6,#10B981,#F59E0B',
    prompt_extra: 'Professional dashboard style, KPI widgets and metric cards, data visualization panels, clean modern UI, business intelligence dashboard aesthetic'
  },
  {
    id: 'legal-blueprint',
    name: 'Legal Blueprint',
    category: 'corporativo',
    emoji: '⚖️',
    audience: 'adultos',
    desc: 'Estilo documento legal: sellos, formal, serio',
    colors: '#F5F0E8,#2C2C2C,#8B0000,#D4C8A0,#4A4A4A',
    prompt_extra: 'Legal document style, formal layout with seals and stamps, parchment-like background, official authoritative tone, serif typeface, legal brief appearance'
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'corporativo',
    emoji: '✉️',
    audience: 'adultos',
    desc: 'Estilo newsletter email: franjas, CTA, limpio y directo',
    colors: '#FFFFFF,#2D3748,#3182CE,#ED8936,#F7FAFC',
    prompt_extra: 'Email newsletter style, horizontal content bands, clear call-to-action buttons, scannable layout, modern email design, clean dividers between sections'
  },
  {
    id: 'corporate-memphis',
    name: 'Corporate Memphis',
    category: 'corporativo',
    emoji: '🔷',
    audience: 'adultos',
    desc: 'Figuras geométricas planas, vibrante, moderno y alegre',
    colors: '#FF6B6B,#4ECDC4,#45B7D1,#96CEB4,#FFEAA7',
    prompt_extra: 'Corporate Memphis style, flat geometric vector shapes, colorful illustration style, simplified human figures, playful business aesthetic, modern flat design'
  },
  {
    id: 'slide-deck',
    name: 'Slide Deck',
    category: 'corporativo',
    emoji: '🖥️',
    audience: 'adultos',
    desc: 'Estilo presentación limpia: diapositivas con transiciones sutiles',
    colors: '#FFFFFF,#2D3748,#4A5568,#3182CE,#E2E8F0',
    prompt_extra: 'Presentation slide deck style, clean slide layout, subtle dividers, bullet points, professional presentation format, PowerPoint-inspired clean aesthetic'
  },
  {
    id: 'brand-guide',
    name: 'Brand Guide',
    category: 'corporativo',
    emoji: '🎯',
    audience: 'adultos',
    desc: 'Estilo guía de marca: muestras color, tipografías, clean',
    colors: '#FFFFFF,#1A1A1A,#E53935,#1E88E5,#F5F5F5',
    prompt_extra: 'Brand style guide style, color swatches, typography specimens, clean modular layout, design system documentation, professional brand identity look'
  },

  // ============ 🎨 ARTÍSTICO / CREATIVO ============
  {
    id: 'watercolor-story',
    name: 'Watercolor Story',
    category: 'artistico',
    emoji: '🖌️',
    audience: 'adultos',
    desc: 'Acuarela artesanal, manchas de color, poético y suave',
    colors: '#D4E6F1,#F5CBA7,#A9DFBF,#F1948A,#D2B4DE',
    prompt_extra: 'Watercolor painting style, soft paint bleeds and washes, transparent color layers, organic paint texture, artistic handmade feel, poetic gentle aesthetic'
  },
  {
    id: 'handmade-craft',
    name: 'Handmade Craft',
    category: 'artistico',
    emoji: '✂️',
    audience: 'adultos',
    desc: 'Papel recortado, collage, texturas artesanales',
    colors: '#F5F0E8,#E8D5C4,#C9A96E,#8B7D6B,#D4C8A0',
    prompt_extra: 'Paper cutout craft style, collage aesthetic, torn paper edges, layered paper textures, handmade artisanal feel, physical craft materials look'
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    category: 'artistico',
    emoji: '💜',
    audience: 'adultos',
    desc: 'Neón, violeta/cian, futurista, oscuro y vibrante',
    colors: '#0D0221,#FF2D95,#00FFF7,#7B2D8E,#FFD700',
    prompt_extra: 'Cyberpunk neon style, dark futuristic background, glowing neon pink and cyan, holographic effects, grid lines, futuristic dystopian aesthetic, vibrant glow'
  },
  {
    id: 'origami-fold',
    name: 'Origami Fold',
    category: 'artistico',
    emoji: '🦢',
    audience: 'adultos',
    desc: 'Papiroflexia geométrica, planos plegados, papel texturizado',
    colors: '#FFFFFF,#E8E0D0,#C62828,#1565C0,#F9A825',
    prompt_extra: 'Origami paper folding style, geometric folded planes, paper texture with fold lines, angular faceted shapes, Japanese paper craft aesthetic, clean folds'
  },
  {
    id: 'chalkboard',
    name: 'Chalkboard',
    category: 'artistico',
    emoji: '🧑‍🏫',
    audience: 'adultos',
    desc: 'Tiza sobre pizarra negra, estilo aula vintage',
    colors: '#2D4A3E,#FFFFFF,#F5E6CC,#E8C37D,#A0C4A8',
    prompt_extra: 'Chalkboard style, dark green or blackboard background, white and colored chalk text, chalk dust texture, hand-drawn look, classroom vintage feel'
  },
  {
    id: 'aged-academia',
    name: 'Aged Academia',
    category: 'artistico',
    emoji: '📜',
    audience: 'adultos',
    desc: 'Vintage científico, sepia, manuscrito antiguo, erudito',
    colors: '#E8D5B7,#8B7D6B,#3E2723,#B71C1C,#5D4037',
    prompt_extra: 'Aged academia style, vintage scientific manuscript, sepia toned parchment, hand-drawn scientific diagrams, antique map aesthetic, scholarly historical'
  },
  {
    id: 'ukiyo-e',
    name: 'Ukiyo-E',
    category: 'artistico',
    emoji: '🗾',
    audience: 'adultos',
    desc: 'Grabado japonés, ondas, colores planos naturales',
    colors: '#2E4057,#D4A574,#E8D5B7,#4A6FA5,#8B4513',
    prompt_extra: 'Japanese Ukiyo-e woodblock print style, Hokusai-inspired, flat natural colors, wave patterns, wood grain texture, traditional Japanese art aesthetic'
  },
  {
    id: 'bauhaus-grid',
    name: 'Bauhaus Grid',
    category: 'artistico',
    emoji: '🔴',
    audience: 'adultos',
    desc: 'Escuela Bauhaus: rojo, azul, amarillo, cuadrícula, geométrico',
    colors: '#E53935,#1E88E5,#FDD835,#212121,#FFFFFF',
    prompt_extra: 'Bauhaus design style, primary colors red blue yellow, geometric grid layout, constructivist composition, bold blocks of color, German design school aesthetic'
  },
  {
    id: 'morandi-soft',
    name: 'Morandi Soft',
    category: 'artistico',
    emoji: '🌸',
    audience: 'adultos',
    desc: 'Tonos Morandi apagados, suaves, estilo journal aesthetic',
    colors: '#D4C8B0,#B8A99A,#C4A882,#9E8B72,#E8DCC8',
    prompt_extra: 'Morandi color palette style, muted dusty tones, soft greyed colors, Italian painter aesthetic, subtle sophisticated palette, calm gentle visual harmony'
  },
  {
    id: 'knolling-flat',
    name: 'Knolling Flat',
    category: 'artistico',
    emoji: '🔧',
    audience: 'adultos',
    desc: 'Objetos organizados en plano, vista cenital, simétrico',
    colors: '#F5F5F0,#2C3E50,#E74C3C,#3498DB,#27AE60',
    prompt_extra: 'Knolling flat lay style, bird\'s eye view, organized objects arranged at right angles, symmetrical layout, neat tidy composition, every item visible clearly'
  },

  // ============ 📊 TÉCNICO / CIENTÍFICO ============
  {
    id: 'lab-report',
    name: 'Lab Report',
    category: 'tecnico',
    emoji: '🔬',
    audience: 'adultos',
    desc: 'Estilo laboratorio: fondo cuadriculado, datos precisos',
    colors: '#F0F4F8,#2D3748,#3182CE,#38A169,#DD6B20',
    prompt_extra: 'Laboratory report style, graph paper grid background, scientific data presentation, precise measurements, clean technical layout, research documentation'
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    category: 'tecnico',
    emoji: '📐',
    audience: 'adultos',
    desc: 'Plano ingenieril: azul profundo, líneas blancas, cotas',
    colors: '#1A3A5C,#FFFFFF,#4FC3F7,#FFD54F,#81C784',
    prompt_extra: 'Engineering blueprint style, deep blue background, white technical lines, measurement callouts, architectural drawing aesthetic, precise drafting look'
  },
  {
    id: 'subway-map',
    name: 'Subway Map',
    category: 'tecnico',
    emoji: '🚇',
    audience: 'adultos',
    desc: 'Diagrama tipo metro: líneas de colores, estaciones',
    colors: '#F5F5F0,#E53935,#1E88E5,#43A047,#FDD835,#8E24AA',
    prompt_extra: 'Subway map diagram style, colored transit lines with stations, route nodes and connections, schematic simplified geography, London tube map inspired'
  },
  {
    id: 'isometric-tech',
    name: 'Isometric Tech',
    category: 'tecnico',
    emoji: '📦',
    audience: 'adultos',
    desc: 'Isométrico 3D, perspectiva técnica, diagramas técnicos',
    colors: '#E8ECF1,#2C3E50,#3498DB,#2ECC71,#E74C3C',
    prompt_extra: 'Isometric technical style, 30-degree angle 3D perspective, technical diagrams, cube-based layout, exploded view elements, engineering illustration look'
  },
  {
    id: 'periodic-table',
    name: 'Periodic Table',
    category: 'tecnico',
    emoji: '🧪',
    audience: 'adultos',
    desc: 'Estilo tabla periódica: celdas, categorías coloreadas',
    colors: '#F0F4F8,#E74C3C,#3498DB,#2ECC71,#F39C12,#9B59B6',
    prompt_extra: 'Periodic table style, grid of categorized cells, color-coded groups, scientific classification layout, chemistry reference aesthetic, element card design'
  },
  {
    id: 'scientific-paper',
    name: 'Scientific Paper',
    category: 'tecnico',
    emoji: '📄',
    audience: 'adultos',
    desc: 'Estilo paper académico: dos columnas, figuras, citas',
    colors: '#FFFFFF,#333333,#1565C0,#2E7D32,#F5F5F5',
    prompt_extra: 'Academic paper style, two-column layout, scientific figures with captions, citation references, scholarly publication format, research journal aesthetic'
  },
  {
    id: 'flowchart-sys',
    name: 'Flowchart Sys',
    category: 'tecnico',
    emoji: '🔀',
    audience: 'adultos',
    desc: 'Diagrama de flujo técnico, conectores, decisiones',
    colors: '#F8FAFC,#0F172A,#3B82F6,#10B981,#F59E0B,#EF4444',
    prompt_extra: 'Flowchart diagram style, decision diamonds, process rectangles, arrow connectors, algorithmic logic, system architecture, clear sequential flow'
  },
  {
    id: 'heatmap-data',
    name: 'Heatmap Data',
    category: 'tecnico',
    emoji: '🌡️',
    audience: 'adultos',
    desc: 'Mapas de calor, densidad de datos, escalas cromáticas',
    colors: '#0D1117,#440154,#3B528B,#21918C,#5EC962,#FDE725',
    prompt_extra: 'Heatmap data visualization style, color density gradients, data matrix layout, viridis color scale, statistical data representation, analytics dashboard'
  },
  {
    id: 'timeline-history',
    name: 'Timeline History',
    category: 'tecnico',
    emoji: '⏳',
    audience: 'adultos',
    desc: 'Línea de tiempo histórica, fechas clave, hitos',
    colors: '#F5F0E8,#8B4513,#C9A96E,#2C3E50,#D4A574',
    prompt_extra: 'Historical timeline style, chronological progression, milestone markers, date annotations, horizontal time axis, historical document aesthetic'
  },
  {
    id: 'infographic-map',
    name: 'Infographic Map',
    category: 'tecnico',
    emoji: '🗺️',
    audience: 'adultos',
    desc: 'Mapa geográfico con datos superpuestos, regiones coloreadas',
    colors: '#E8F4F8,#2E86C1,#27AE60,#F39C12,#E74C3C,#F5F5F5',
    prompt_extra: 'Geographic infographic map style, colored regions, data overlays on map, location pins, choropleth coloring, cartographic data visualization'
  }
];
