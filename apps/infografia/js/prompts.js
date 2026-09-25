// ============================================================
// PROMPTS: Plantillas de prompt por estilo y audiencia
// ============================================================

const AUDIENCE_PROMPTS = {
  niños: {
    prefix: 'Create a fun children\'s infographic for kids aged 7-10. Use VERY SIMPLE language, large playful text, bright colors, and friendly cartoon-style illustrations. Make it engaging and easy to understand.',
    suffix: 'Keep text minimal and very large. Use emojis and simple icons. Make it feel like a children\'s educational poster. NO small text, NO complex words.',
    aspect: 'portrait'
  },
  mayores: {
    prefix: 'Create an infographic designed for elderly people (65+ years). Use EXTREMELY HIGH CONTRAST, very LARGE FONT (minimum 18pt), simple universal icons, and clear uncluttered layout. Prioritize readability above all.',
    suffix: 'MAXIMUM ACCESSIBILITY: bold fonts, high contrast colors, no decorative fluff, no tiny details, generous white space, very clear visual hierarchy. Think senior-friendly medical pamphlet.',
    aspect: 'landscape'
  },
  adultos: {
    prefix: 'Create a professional infographic for general adult audience. Balanced design, clear hierarchy, appropriate for the content type. Use standard readability and professional visual language.',
    suffix: 'Well-structured layout, clean typography, appropriate data visualization. Suitable for social media sharing or professional presentation.',
    aspect: 'landscape'
  }
};

const LAYOUT_PROMPTS = {
  'crayon-kids': 'Arrange as a playful scattered layout with each section in a different crayon color. Hand-drawn borders around each section.',
  'cuento-magico': 'Storybook page layout with a large illustration area and floating text boxes. Soft vignette borders.',
  'lego-brick': 'Grid layout where each information block is a LEGO brick. Stack them in columns. Bricks connect visually.',
  'pixel-adventure': 'Grid-based retro layout, 8-bit style borders. Each section is a game level area. Pixel font for headers.',
  'globos-arcoiris': 'Vertical layout connected by rainbow bands. Each section floats like a balloon. Cloud separators between sections.',
  'sticker-album': 'Scrapbook page layout. Each section looks like a sticker placed on a notebook page. Slightly rotated for organic feel.',
  'mono-doodle': 'Notebook page layout. Sections divided by hand-drawn wavy lines. Doodle accents in corners.',
  'comic-bubble': 'Comic strip panel layout. 3-4 panels arranged in comic book grid. Speech bubbles for key facts.',
  'play-doh': 'Organic flowing layout with puffy cloud-like section dividers. 3D extruded text. Playful curved paths.',
  'finger-paint': 'Messy artistic layout. Sections separated by colorful handprint smudges. Organic freeform section shapes.',

  'senior-clear': 'Ultra-clean single column vertical layout. Very generous spacing between sections. Large bordered boxes for each point.',
  'gran-diario': 'Two-column newspaper layout. Large headline at top. Articles in clear serif columns. Date and edition line.',
  'senal-vial': 'Signage-style layout. Each section is a different traffic sign shape. Universal symbol on each. Bold borders.',
  'medico-claro': 'Clean clinical layout. White background with colored header bars. Rounded rectangular sections. Medical cross icon.',
  'instructivo': 'Step-by-step vertical sequence. Numbered steps 1-2-3 with simple line illustrations. Minimal text per step.',
  'pizarra-blanca': 'Whiteboard frame layout. Sections divided by marker-drawn underlines. Handwritten-style headings. Simple diagram boxes.',
  'papel-periodico': 'Classic newspaper broadsheet layout. Masthead at top. Columns with clear section headers. Old-style typography.',
  'gobierno-claro': 'Official document layout. Letterhead style top. Clear section numbers. Form-like structured boxes. Official seal.',
  'alta-vista': 'Dark background with high contrast bright elements. Very thick borders. Sections clearly separated by bright lines.',
  'calendario': 'Calendar grid layout. Each section is a calendar page or large date card. Month-view inspired organization.',

  'boardroom': 'Clean corporate layout with subtle geometric dividers. Section headers in gold accent. Professional margins and alignment.',
  'consulting-dark': 'Dark theme with card-based sections. Clean data widgets. Thin accent lines separating topics. Premium feel.',
  'startup-pitch': 'Modern broken-grid layout. Asymmetric sections. Gradient header band. Bold numbers. CTA-style elements.',
  'annual-report': 'Elegant multi-column layout. Financial-report style headers. Decorative thin gold rules between sections.',
  'dashboard-pro': 'Dashboard widget layout. Each metric in its own card. KPI indicators. Clean modern data UI.',
  'legal-blueprint': 'Formal legal document layout. Left margin annotations. Section numbering system. Official stamp elements.',
  'newsletter': 'Email-width centered layout. Horizontal bands with alternating backgrounds. Clear visual hierarchy from top to bottom.',
  'corporate-memphis': 'Flat vector layout with geometric shapes as section backgrounds. Abstract figure illustrations. Bold color blocks.',
  'slide-deck': 'Single slide layout. Clean header. Bullet point body. Page number footer. Presentation proportions.',
  'brand-guide': 'Modular grid layout with color swatches and typography samples. Clean white space. Design system format.',

  'watercolor-story': 'Soft organic layout with flowing watercolor washes as section backgrounds. Gentle curved section dividers.',
  'handmade-craft': 'Collage layout with layered paper-texture sections. Torn edges effect. Mixed media aesthetic.',
  'cyberpunk-neon': 'Dark futuristic layout. Neon frame borders. Grid line background. Glowing section headers. Holographic tabs.',
  'origami-fold': 'Geometric folded layout. Each section is an origami shape. Angled dividers. Paper fold shadows.',
  'chalkboard': 'Blackboard layout. Sections divided by chalk-drawn borders. Erased smudge effects. Chalk dust accents.',
  'aged-academia': 'Vintage manuscript layout. Ornate decorative borders. Illuminated initial caps. Aged paper texture background.',
  'ukiyo-e': 'Japanese woodblock layout. Vertical sections with natural motifs. Wave and cloud decorative elements. Sumi-e brush accents.',
  'bauhaus-grid': 'Strict geometric grid. Primary color blocks. Sans-serif extreme minimal. Constructivist composition.',
  'morandi-soft': 'Soft tonal layout with muted color sections. Gentle rounded boxes. Minimal decorative elements. Sophisticated calm.',
  'knolling-flat': 'Flat-lay top-down layout. Items arranged at perfect right angles. Symmetrical composition. Shadow perspective.',

  'lab-report': 'Scientific layout with graph paper grid background. Data tables. Chart areas. Technical headers. Measurement units.',
  'blueprint': 'Blueprint grid layout. White technical diagrams on blue. Dimension lines. Technical annotations. Drafting stamps.',
  'subway-map': 'Transit map layout. Colored lines connecting stations (data points). Route map aesthetic. Legend box.',
  'isometric-tech': 'Isometric 3D layout. Tilted planes for each section. 30-degree angle perspective. Technical diagram elements.',
  'periodic-table': 'Periodic table grid layout. Category-colored cells. Element card styling. Scientific classification.',
  'scientific-paper': 'Two-column academic layout. Abstract header. Figure placements with captions. Reference section. Journal format.',
  'flowchart-sys': 'Flowchart layout with connected nodes. Decision diamonds. Process rectangles. Directional arrows. System architecture.',
  'heatmap-data': 'Data matrix layout. Color density gradients. Grid of values. Statistical data visualization. Analytics style.',
  'timeline-history': 'Horizontal timeline layout. Milestone nodes on a central line. Era bands. Date annotations. Historical progression.',
  'infographic-map': 'Map-based layout. Central geographic area with data overlays. Legend. Region color coding. Location pins.'
};

function buildPrompt(styleId, audience, title, content) {
  const style = STYLES.find(s => s.id === styleId);
  const aud = AUDIENCE_PROMPTS[audience] || AUDIENCE_PROMPTS.adultos;
  const layout = LAYOUT_PROMPTS[styleId] || 'Clean organized layout with clear sections.';

  return `${aud.prefix}

STYLE: ${style.prompt}

LAYOUT: ${layout}

CONTENT:
Title: ${title}
Content: ${content}

IMPORTANT:
- Create a COMPLETE infographic as a single image
- All text must be readable and integrated into the design
- Use the specified style consistently throughout
- ${aud.suffix}
- RESPECT THE ASPECT RATIO.`;
}
