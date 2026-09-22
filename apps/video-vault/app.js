/* ================================================================
   VIDEO VAULT — Catálogo de prompts reales para generar vídeos con IA
   ================================================================ */

const VIDEO_COMMANDS = [
  // ── RUNWAY GEN-4 ──
  { id: 'r01', cat: 'runway', name: 'Movimiento de cámara 360°', title: 'Órbita alrededor del sujeto', tool: 'Runway Gen-4', desc: 'Travelling circular alrededor de un sujeto u objeto, manteniéndolo centrado mientras el fondo se desplaza.', prompt: 'A cinematic drone shot orbiting 360 degrees around a [subject], smooth camera movement, the background rotates behind the subject, 4k, high detail, natural lighting, slow rotation.', example: 'Una bailarina girando, la cámara orbita a su alrededor mostrando el escenario completo' },
  { id: 'r02', cat: 'runway', name: 'Cámara lenta cinemática', title: 'Slow motion fluido', tool: 'Runway Gen-4', desc: 'Movimiento a cámara superlenta con fluidez y detalle, como en producciones cinematográficas.', prompt: 'Slow motion cinematography, 120fps equivalent, smooth fluid movement, [subject] moves gracefully through frame, every detail visible, cinematic lighting, shallow depth of field, film grain.', example: 'Una copa de vino cayendo al suelo, el líquido se derrama en cámara superlenta' },
  { id: 'r03', cat: 'runway', name: 'Zoom dramático', title: 'Zoom in/out con intención', tool: 'Runway Gen-4', desc: 'Zoom lento y dramático que acerca o aleja la atención del sujeto principal.', prompt: 'Dramatic slow zoom in on [subject], the camera pushes in steadily, increasing tension, cinematic composition, shallow depth of field, ambient lighting, 4k resolution.', example: 'Zoom lento al rostro de una persona que está a punto de decir algo importante' },
  { id: 'r04', cat: 'runway', name: 'Time-lapse atmosférico', title: 'Aceleración del tiempo', tool: 'Runway Gen-4', desc: 'Time-lapse con transiciones suaves, mostrando el paso del tiempo de forma natural.', prompt: 'Timelapse of [scene], clouds moving fast across the sky, changing light conditions, people walking quickly, sun rising and setting, smooth transition between day and night, cinematic color grading.', example: 'Atardecer en la playa: el sol se pone rápido, las nubes se mueven, las luces se encienden' },
  { id: 'r05', cat: 'runway', name: 'Travelling lateral', title: 'Seguimiento lateral', tool: 'Runway Gen-4', desc: 'La cámara se desplaza lateralmente siguiendo a un sujeto en movimiento.', prompt: 'Tracking shot moving left to right parallel to [subject], smooth camera movement, subject in focus with motion blur on background, cinematic composition, natural lighting.', example: 'Una persona caminando por una calle comercial, la cámara la sigue de lado al mismo ritmo' },
  { id: 'r06', cat: 'runway', name: 'De día a noche', title: 'Transición día/noche', tool: 'Runway Gen-4', desc: 'Transición fluida donde la escena pasa de día a noche iluminada.', prompt: 'Seamless transition from day to night, [scene] gradually darkens, street lamps turn on one by one, windows light up, sky changes from blue to orange to dark blue with stars, cinematic timelapse.', example: 'Una calle cualquiera que pasa del mediodía a la noche estrellada en 3 segundos' },

  // ── KLING AI ──
  { id: 'k01', cat: 'kling', name: 'Cámara en mano (cinema verité)', title: 'Estilo documental', tool: 'Kling AI', desc: 'Movimiento orgánico de cámara al hombro, con micro-vibraciones naturales que dan realismo.', prompt: 'Handheld camera style, natural micro-movements, documentary feel, [subject] in frame, slight camera shake, realistic motion blur, available lighting, natural colors.', example: 'Una entrevista documental con cámara al hombro, movimiento orgánico y real' },
  { id: 'k02', cat: 'kling', name: 'Física realista', title: 'Objetos con física real', tool: 'Kling AI', desc: 'Simulación realista de física en objetos: gravedad, colisiones, líquidos.', prompt: 'Realistic physics simulation, [object] falling and bouncing naturally, gravity affects movement, realistic collisions, liquid splashing with surface tension, cloth simulation with natural draping.', example: 'Una manzana cayendo de una mesa y rodando por el suelo con física real' },
  { id: 'k03', cat: 'kling', name: 'Agua y fluidos', title: 'Comportamiento de líquidos', tool: 'Kling AI', desc: 'Simulación detallada de agua, líquidos y fluidos con física precisa.', prompt: 'Fluid simulation, water flowing naturally, splashes with droplets, surface ripples, liquid pouring from container, realistic viscosity and surface tension, slow motion detail.', example: 'Agua cayendo de una jarra a un vaso, con salpicaduras y ondas realistas' },
  { id: 'k04', cat: 'kling', name: 'Desprendimiento textura', title: 'De textura a objeto', tool: 'Kling AI', desc: 'Una textura o patrón 2D cobra volumen y se convierte en un objeto 3D.', prompt: '2D texture transforming into 3D object, [pattern/texture] gains depth and volume, emerges from flat surface, realistic shadows and light interaction, smooth metamorphosis.', example: 'Un patrón de cuadros en una pared que cobra volumen y se convierte en un cubo 3D' },

  // ── PIKA 2.0 ──
  { id: 'p01', cat: 'pika', name: 'Efecto plastilina', title: 'Stop-motion claymation', tool: 'Pika 2.0', desc: 'Estilo de animación en plastilina con movimiento entrecortado característico.', prompt: 'Claymation style stop-motion animation, slightly jerky movement, visible fingerprints on surfaces, plasticine texture, warm lighting, handmade aesthetic, frame-by-frame feel.', example: 'Figuras de plastilina caminando con el característico movimiento a trompicones' },
  { id: 'p02', cat: 'pika', name: 'Estilo acuarela animada', title: 'Acuarela en movimiento', tool: 'Pika 2.0', desc: 'Animación con estética de acuarela, los colores fluyen como pintura húmeda.', prompt: 'Watercolor painting come to life, colors bleeding and flowing like wet paint on paper, soft edges, pigment textures visible, gentle movement, artistic style, hand-painted feel.', example: 'Un paisaje marino donde el agua se mueve como acuarela fresca sobre papel' },
  { id: 'p03', cat: 'pika', name: 'Efecto boceto animado', title: 'Dibujo a lápiz que cobra vida', tool: 'Pika 2.0', desc: 'Un boceto a lápiz empieza a moverse, manteniendo la textura del grafito.', prompt: 'Pencil sketch animation, hand-drawn lines visible, graphite texture, [subject] moves while maintaining sketch aesthetic, rough edges, monochrome or subtle color, artistic transition.', example: 'Un retrato boceto a lápiz que sonríe y parpadea manteniendo el estilo de dibujo' },
  { id: 'p04', cat: 'pika', name: 'Pixel art animado', title: 'Estilo retro 8-bit', tool: 'Pika 2.0', desc: 'Animación en estilo pixel art con resolución baja, como un videojuego clásico.', prompt: 'Pixel art animation, 8-bit style, low resolution grid visible, [subject] moving with pixel-perfect animation, retro video game aesthetic, limited color palette, chiptune vibe.', example: 'Un personaje pixelado de videojuego clásico caminando por un bosque 8-bit' },
  { id: 'p05', cat: 'pika', name: 'Efecto VHS retro', title: 'Cinta de vídeo antigua', tool: 'Pika 2.0', desc: 'Estilo de vídeo grabado en VHS con líneas de barrido y colores degradados.', prompt: 'Retro VHS tape effect, scanlines, chromatic aberration, tracking distortion, color bleeding, grainy texture, timestamp overlay, 80s/90s handheld camcorder aesthetic.', example: 'Un recuerdo de los 90: colores desgastados, líneas de barrido, fecha grabada en la esquina' },

  // ── LUMA DREAM MACHINE ──
  { id: 'l01', cat: 'luma', name: 'Elevación de cámara (drone)', title: 'Drone rising', tool: 'Luma Dream Machine', desc: 'La cámara se eleva desde el suelo revelando la escena completa como un drone.', prompt: 'Drone camera rising from ground level to bird\'s eye view, revealing the full landscape, smooth ascent, wide angle perspective, natural sunlight, cinematic composition.', example: 'Desde el suelo subiendo hasta ver toda la ciudad desde arriba como un drone' },
  { id: 'l02', cat: 'luma', name: 'Vuelo a través de escena', title: 'Fly-through', tool: 'Luma Dream Machine', desc: 'La cámara vuela a través de un espacio, recorriendo el escenario en primera persona.', prompt: 'First person fly-through of [scene], camera moving forward through the space, discovering details progressively, immersive perspective, smooth motion, realistic depth.', example: 'Volando a baja altura entre callejones de una ciudad antigua' },
  { id: 'l03', cat: 'luma', name: 'Transición de fundido', title: 'Cross-dissolve', tool: 'Luma Dream Machine', desc: 'Transición suave donde una escena se desvanece mientras aparece la siguiente.', prompt: 'Crossfade transition between two scenes, first image fades out while second fades in, smooth 2-second overlap, matching composition between scenes, seamless blend.', example: 'Una persona mayor que se desvanece y deja ver la misma persona de joven' },
  { id: 'l04', cat: 'luma', name: 'Efecto espejo líquido', title: 'Reflejo ondulado', tool: 'Luma Dream Machine', desc: 'Una superficie reflectante aparece bajo el sujeto, con ondas sutiles en el reflejo.', prompt: 'Mirror reflection on water surface beneath [subject], perfect reflection with subtle ripples, the reflection distorts slightly with movement, natural water texture, ambient lighting.', example: 'Bailarín sobre un charco que refleja su silueta con ondas sutiles' },

  // ── MINIMAX / HAILUO ──
  { id: 'm01', cat: 'minimax', name: 'Efecto morphing', title: 'Transformación de un objeto en otro', tool: 'Minimax / Hailuo', desc: 'Un objeto se transforma fluidamente en otro mediante morphing continuo.', prompt: 'Seamless morphing transformation, [object A] gradually transforms into [object B], smooth shape interpolation, texture blends between forms, organic transition, no cuts.', example: 'Un coche deportivo que se transforma en un tigre mientras corre' },
  { id: 'm02', cat: 'minimax', name: 'Desmontaje de objeto', title: 'Teardown en el aire', tool: 'Minimax / Hailuo', desc: 'Un objeto se desmonta pieza a pieza, con los componentes flotando en el espacio.', prompt: 'Object teardown effect, [object] disassembles into individual components, parts float apart in slow motion, mechanical parts separate cleanly, technical aesthetic, detailed textures.', example: 'Un reloj de pulsera que se desmonta: engranajes, ejes y piezas flotando separadamente' },
  { id: 'm03', cat: 'minimax', name: 'Partículas y explosión', title: 'Efecto partículas', tool: 'Minimax / Hailuo', desc: 'Un objeto estalla en miles de partículas que se dispersan en todas direcciones.', prompt: 'Particle explosion effect, [object] bursts into thousands of particles, particles scatter in all directions, glowing fragments, slow motion, dramatic lighting, cinematic impact.', example: 'Una escultura de cristal que explota en mil fragmentos brillantes' },
  { id: 'm04', cat: 'minimax', name: 'Crecimiento orgánico', title: 'Flor creciendo en segundos', tool: 'Minimax / Hailuo', desc: 'Crecimiento acelerado de un elemento orgánico: planta, flor, cristal.', prompt: 'Time-lapse growth of [organic subject], from seed to full bloom, roots spreading underground, stem reaching upward, leaves unfurling, flowers opening, detailed textures, natural lighting.', example: 'Una rosa que crece desde semilla hasta flor abierta en 5 segundos' },

  // ── GEMINI 2.0 ──
  { id: 'g01', cat: 'gemini', name: 'Revelación con luz', title: 'Light reveal', tool: 'Gemini 2.0', desc: 'Un rayo de luz revela gradualmente el sujeto, iluminándolo desde la oscuridad.', prompt: 'A beam of light slowly sweeps across a dark scene, gradually revealing the subject. Light reveals details one by one. Dramatic shadows. Cinematic atmosphere.', example: 'Un objeto en una habitación oscura que se ilumina lentamente como con un reflector' },
  { id: 'g02', cat: 'gemini', name: 'Efecto levitación', title: 'Levitación natural', tool: 'Gemini 2.0', desc: 'Un sujeto levita suavemente desafiando la gravedad, con ropa y pelo flotando.', prompt: 'A person floats slowly upward in a room. Clothing and hair drift naturally as if underwater. Soft, dreamlike floating motion. Warm ambient lighting. Peaceful expression.', example: 'Una persona en su salón flotando suavemente hacia el techo' },
  { id: 'g03', cat: 'gemini', name: 'Cambio de estación', title: 'Primavera a invierno', tool: 'Gemini 2.0', desc: 'Un paisaje cambia de estación con transición fluida: hojas que caen, nieve que cubre.', prompt: 'A landscape smoothly transitions from spring to winter. Green leaves turn yellow, orange, red and fall. Snow begins to fall and covers the ground. Temperature feels colder. Smooth morph.', example: 'Un árbol que pasa de verde primaveral a otoño y luego a nevado en 4 segundos' },
  { id: 'g04', cat: 'gemini', name: 'Miniatura (tilt-shift)', title: 'Efecto maqueta', tool: 'Gemini 2.0', desc: 'Una escena real parece una maqueta en miniatura con desenfoque tilt-shift.', prompt: 'Tilt-shift miniature effect. A real city scene looks like a tiny model. Selective blur at top and bottom. Bright, oversaturated colors. Objects appear small like toys. Playful perspective.', example: 'Una ciudad real que parece un set de trenes en miniatura' },

  // ── STABLE VIDEO DIFFUSION ──
  { id: 's01', cat: 'svd', name: 'Imagen a vídeo', title: 'Animar una foto fija', tool: 'Stable Video Diff.', desc: 'Convierte una imagen fija en un vídeo corto con movimiento sutil y fluido.', prompt: 'Animate this image with subtle motion. [Subject] moves naturally and slowly. Background has gentle ambient movement. Smooth transitions. Photorealistic style. No distortion.', example: 'Una foto de un paisaje que cobra vida con nubes moviéndose lentamente' },
  { id: 's02', cat: 'svd', name: 'Bucle infinito (loop)', title: 'Loop perfecto', tool: 'Stable Video Diff.', desc: 'Genera un vídeo en bucle infinito donde el final vuelve al principio sin costura.', prompt: 'Seamless looping video. The end of the animation transitions perfectly back to the start without visible seam. Continuous motion loop. Smooth infinite playback. No jump cuts.', example: 'Una noria girando eternamente, el final enlaza perfectamente con el principio' },
  { id: 's03', cat: 'svd', name: 'Cámara lenta extrema', title: 'Movimiento ultralento', tool: 'Stable Video Diff.', desc: 'Movimiento extremadamente lento que revela detalles imperceptibles a velocidad normal.', prompt: 'Extreme slow motion, 240fps equivalent. [Subject] moves almost imperceptibly slow. Every micro-detail visible. Liquid movements, floating particles. Hypnotic, meditative pace.', example: 'Una pluma cayendo en cámara superlenta, cada fibra se mueve individualmente' },
];

const CATEGORIES = [
  { id: 'runway', name: 'Runway Gen-4', emoji: '🎬', desc: 'Fotorrealismo cinematográfico' },
  { id: 'kling', name: 'Kling AI', emoji: '🎯', desc: 'Física realista y simulación' },
  { id: 'pika', name: 'Pika 2.0', emoji: '🎨', desc: 'Estilos artísticos y animación' },
  { id: 'luma', name: 'Luma Dream Machine', emoji: '🚀', desc: 'Vuelos de cámara y transiciones' },
  { id: 'minimax', name: 'Minimax / Hailuo', emoji: '💫', desc: 'Efectos y morphing' },
  { id: 'gemini', name: 'Gemini 2.0', emoji: '🔮', desc: 'Efectos visuales con IA de Google' },
  { id: 'svd', name: 'Stable Video Diff.', emoji: '📷', desc: 'Imagen a vídeo y bucles' },
];

// ── STATE ──
let activeFilter = null;
let searchTerm = '';

const grid = document.getElementById('commands-grid');
const filtersEl = document.getElementById('filters');
const searchInput = document.getElementById('search-input');
const totalCmd = document.getElementById('total-commands');
const totalCat = document.getElementById('total-categories');
const sectionTitle = document.getElementById('section-title');
const sectionCount = document.getElementById('section-count');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const themeToggle = document.getElementById('themeToggle');

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  totalCmd.textContent = VIDEO_COMMANDS.length;
  totalCat.textContent = CATEGORIES.length;

  renderFilters();
  renderGrid(VIDEO_COMMANDS);
  updateSectionTitle();

  const saved = localStorage.getItem('videoVaultTheme');
  if (saved === 'light') document.body.classList.add('light');
  themeToggle.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('videoVaultTheme', isLight ? 'light' : 'dark');
  });

  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
});

// ── FILTERS ──
function renderFilters() {
  filtersEl.innerHTML = '';
  const all = document.createElement('button');
  all.className = `chip${activeFilter === null ? ' active' : ''}`;
  all.textContent = '🎬 Todas las herramientas';
  all.addEventListener('click', () => { activeFilter = null; applyFilters(); });
  filtersEl.appendChild(all);

  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `chip${activeFilter === cat.id ? ' active' : ''}`;
    btn.textContent = `${cat.emoji} ${cat.name}`;
    btn.addEventListener('click', () => { activeFilter = cat.id; applyFilters(); });
    filtersEl.appendChild(btn);
  });
}

function applyFilters() {
  let filtered = VIDEO_COMMANDS;

  if (activeFilter) {
    filtered = filtered.filter(c => c.cat === activeFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchTerm) ||
      c.title.toLowerCase().includes(searchTerm) ||
      c.desc.toLowerCase().includes(searchTerm) ||
      c.tool.toLowerCase().includes(searchTerm)
    );
  }

  renderGrid(filtered);
  updateSectionTitle();
  updateFilterChips();
}

function updateFilterChips() {
  const chips = filtersEl.querySelectorAll('.chip');
  chips.forEach((chip, i) => {
    chip.classList.remove('active');
    if (i === 0 && activeFilter === null) chip.classList.add('active');
    else if (i > 0 && CATEGORIES[i-1]?.id === activeFilter) chip.classList.add('active');
  });
}

function updateSectionTitle() {
  if (activeFilter) {
    const cat = CATEGORIES.find(c => c.id === activeFilter);
    sectionTitle.textContent = cat ? `${cat.emoji} ${cat.name}` : 'Comandos';
  } else if (searchTerm) {
    sectionTitle.textContent = '🔍 Resultados';
  } else {
    sectionTitle.textContent = '🎬 Todos los prompts de vídeo';
  }
  const visible = grid.querySelectorAll('.story-card').length;
  sectionCount.textContent = visible;
}

// ── RENDER GRID ──
function renderGrid(commands) {
  if (commands.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="big">🔍</div><p>No se encontraron prompts</p></div>`;
    sectionCount.textContent = '0';
    return;
  }

  grid.innerHTML = commands.map(cmd => {
    const cat = CATEGORIES.find(c => c.id === cmd.cat);
    const color = `var(--${cmd.cat === 'runway' ? 'accent' : cmd.cat === 'kling' ? 'accent-2' : cmd.cat === 'pika' ? 'cyan' : cmd.cat === 'luma' ? 'teal-1' : cmd.cat === 'minimax' ? 'teal-2' : cmd.cat === 'gemini' ? 'teal-3' : 'accent'})`;
    return `
      <div class="story-card" data-id="${cmd.id}" onclick="openModal('${cmd.id}')">
        <div class="badges">
          <span class="badge default">${cat ? cat.emoji + ' ' + cmd.tool : cmd.tool}</span>
        </div>
        <button class="copy-btn" onclick="event.stopPropagation(); copyText(this, '${cmd.prompt.replace(/'/g, "\\'")}')" title="Copiar prompt">
          📋 Copiar
        </button>
        <div class="cmd-name" style="font-size:1.1rem">${cmd.name}</div>
        <div class="cmd-desc">${cmd.desc}</div>
        <div class="cmd-prompt-preview">${cmd.prompt}</div>
        <div class="meta">
          <span>🎯 ${cmd.example}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── MODAL ──
function openModal(id) {
  const cmd = VIDEO_COMMANDS.find(c => c.id === id);
  if (!cmd) return;

  const cat = CATEGORIES.find(c => c.id === cmd.cat);

  modalBody.innerHTML = `
    <div class="cmd-badge badge default" style="font-size:0.85rem;margin-bottom:10px">${cat ? cat.emoji + ' ' + cmd.tool : cmd.tool}</div>
    <div class="cmd-name-big" style="font-size:1.5rem">${cmd.name}</div>
    <div class="cmd-title-big" style="font-size:1rem;color:var(--text-dim);margin-bottom:16px">${cmd.title}</div>
    <div class="cmd-desc-full">${cmd.desc}</div>
    <label style="font-size:0.78rem;color:var(--text-faint);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px;">Prompt completo (copiar y pegar en la herramienta):</label>
    <div class="cmd-prompt-full">${cmd.prompt}</div>
    <button class="cmd-copy-btn" id="modal-copy-btn">📋 Copiar prompt</button>
    ${cmd.example ? `<div class="cmd-example"><b>💡 Ejemplo de uso:</b> ${cmd.example}</div>` : ''}
  `;

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const copyBtn = document.getElementById('modal-copy-btn');
  if (copyBtn) {
    copyBtn.onclick = () => copyText(copyBtn, cmd.prompt);
  }
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── COPY ──
async function copyText(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = '✅ Copiado';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = btn.id === 'modal-copy-btn' ? '📋 Copiar prompt' : '📋 Copiar'; btn.classList.remove('copied'); }, 2000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✅ Copiado';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = btn.id === 'modal-copy-btn' ? '📋 Copiar prompt' : '📋 Copiar'; btn.classList.remove('copied'); }, 2000);
  }
}

window.openModal = openModal;
window.copyText = copyText;