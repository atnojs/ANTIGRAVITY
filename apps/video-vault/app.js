/* ================================================================
   VIDEO VAULT — Catálogo de comandos de vídeo para IA
   ================================================================ */

const VIDEO_COMMANDS = [
  // ── MOVIMIENTO DE CÁMARA ──
  { id: 'c01', cat: 'mov', name: '/orbit360', title: 'Órbita 360°', desc: 'La cámara da una vuelta completa alrededor del sujeto, creando un efecto cinemático envolvente.', prompt: 'Camera orbits 360 degrees around the subject in a smooth circular motion, maintaining focus on the center.', example: 'Producto girando sobre su eje como en un comercial' },
  { id: 'c02', cat: 'mov', name: '/dronerise', title: 'Elevación de dron', desc: 'La cámara se eleva como un dron revelando gradualmente el escenario completo.', prompt: 'Drone-style camera rising upward, slowly revealing the full scene from bottom to top.', example: 'Una casa vista desde el jardín que sube hasta mostrar todo el vecindario' },
  { id: 'c03', cat: 'mov', name: '/cranedown', title: 'Grúa descendente', desc: 'La cámara desciende en picado controlado, como una grúa de cine, para revelar el sujeto desde arriba.', prompt: 'Cinematic crane shot, camera smoothly descending from above to reveal the subject at ground level.', example: 'Vista aérea de una ciudad que baja hasta una persona en la calle' },
  { id: 'c04', cat: 'mov', name: '/dollyzoom', title: 'Dolly Zoom (Vertigo)', desc: 'Efecto Vertigo: la cámara se acerca mientras el zoom se aleja (o viceversa), distorsionando la perspectiva.', prompt: 'Dolly zoom effect: camera moves forward while zooming out, creating a disorienting perspective distortion. The background stretches while the subject stays the same size.', example: 'Pasillo que parece alargarse mientras la persona al fondo no se mueve' },
  { id: 'c05', cat: 'mov', name: '/followcam', title: 'Cámara en seguimiento', desc: 'La cámara sigue a un sujeto en movimiento, manteniéndolo centrado en el encuadre.', prompt: 'Tracking shot: camera follows the moving subject smoothly, keeping them centered in frame as they move through the environment.', example: 'Alguien caminando por la calle, la cámara lo sigue de lado' },

  // ── TRANSICIONES ──
  { id: 't01', cat: 'trans', name: '/morph', title: 'Morph / Transformación', desc: 'Transición fluida donde un objeto se transforma en otro mediante deformación continua.', prompt: 'Seamless morph transition: the first object gradually deforms and transforms into the second object over 3 seconds, with smooth vertex interpolation.', example: 'Un coche que se convierte en un tigre corriendo' },
  { id: 't02', cat: 'trans', name: '/wipe', title: 'Cortinilla', desc: 'Transición con una línea que barre la pantalla revelando la nueva escena.', prompt: 'Wipe transition: a moving edge sweeps across the frame, revealing the next scene behind it. Clean horizontal or diagonal edge.', example: 'De playa a montaña, una línea horizontal desplaza la imagen anterior' },
  { id: 't03', cat: 'trans', name: '/dissolve', title: 'Disolución', desc: 'Transición suave donde la primera imagen se desvanece mientras la segunda aparece.', prompt: 'Cross dissolve: first image fades out while second image fades in simultaneously, with a smooth 2-second overlap.', example: 'Foto antigua que se desvanece y deja ver la misma escena en la actualidad' },
  { id: 't04', cat: 'trans', name: '/glitch', title: 'Glitch / Fallo digital', desc: 'Transición con fallos digitales, artefactos y distorsión de píxeles entre escenas.', prompt: 'Digital glitch transition: pixelation, RGB splitting, screen tearing, and digital artifacts disrupt the first scene before resolving into the second.', example: 'Escena de ciudad que se rompe en píxeles y se recompone en un paisaje' },

  // ── ILUMINACIÓN ──
  { id: 'l01', cat: 'light', name: '/lightreveal', title: 'Revelación con luz', desc: 'La luz revela gradualmente el objeto, iluminándolo desde la oscuridad.', prompt: 'Light reveal: a beam of light slowly sweeps across the scene from left to right, illuminating the subject gradually out of darkness.', example: 'Una escultura oscura que se ilumina como con un reflector móvil' },
  { id: 'l02', cat: 'light', name: '/godrays', title: 'Rayos divinos', desc: 'Rayos de luz volumétricos que atraviesan nubes/ventanas, creando atmósfera dramática.', prompt: 'Volumetric god rays: shafts of warm sunlight piercing through clouds or windows, with visible dust particles, creating dramatic atmospheric lighting.', example: 'Sol entrando por una ventana con polvo visible en el aire' },
  { id: 'l03', cat: 'light', name: '/neonpulse', title: 'Neón pulsante', desc: 'Iluminación de neón que pulsa rítmicamente, ideal para escenas nocturnas o cyberpunk.', prompt: 'Pulsing neon lighting: the scene is lit by neon lights that rhythmically pulse and shift color, with reflections on wet surfaces. Cyberpunk atmosphere.', example: 'Calle mojada con neón azul y rosa que late al ritmo de la música' },
  { id: 'l04', cat: 'light', name: '/silhouette', title: 'Silueta al contraluz', desc: 'El sujeto aparece en silueta oscura contra una fuente de luz brillante al fondo.', prompt: 'Dramatic backlight silhouette: strong light source behind the subject, rendering them as a dark silhouette with rim lighting on edges.', example: 'Dos personas besándose al atardecer, solo sus siluetas contra el sol' },

  // ── TIEMPO ──
  { id: 'tm01', cat: 'time', name: '/timelapse', title: 'Time-lapse', desc: 'Aceleración del tiempo, mostrando el paso de horas/días en segundos.', prompt: 'Timelapse: accelerated passage of time, showing the scene changing over hours in seconds. Fast-moving clouds, shifting shadows, people moving quickly.', example: 'Amanecer en la ciudad: el sol sale, las nubes se mueven rápido, las luces se encienden' },
  { id: 'tm02', cat: 'time', name: '/slowmo', title: 'Cámara lenta', desc: 'Ralentización del movimiento para apreciar cada detalle, como en escenas de acción.', prompt: 'Slow motion: extreme slow-motion effect at 120fps, every detail of movement is visible and fluid. 4x slower than real time.', example: 'Una gota de agua cayendo, estallando en cámara superlenta' },
  { id: 'tm03', cat: 'time', name: '/reverse', title: 'Reproducción inversa', desc: 'La escena se reproduce hacia atrás, como rebobinando la realidad.', prompt: 'Reverse playback: the entire scene plays backwards. Water flows upward, objects reassemble, time flows in reverse. Smooth backward motion.', example: 'Una taza rota que se reconstruye sola y salta a la mesa' },
  { id: 'tm04', cat: 'time', name: '/bullet', title: 'Tiempo bala (Matrix)', desc: 'Efecto Matrix: el tiempo se congela mientras la cámara orbita alrededor del sujeto.', prompt: 'Bullet time effect: time appears frozen while the camera rapidly orbits around the subject. Inspired by Matrix. Everything is still except the camera movement.', example: 'Una patada voladora congelada, la cámara gira alrededor' },

  // ── ESTILO Y EFECTOS ──
  { id: 's01', cat: 'style', name: '/teardown', title: 'Desmontaje', desc: 'El objeto se desmonta pieza por pieza, separando sus componentes ante la cámara.', prompt: 'Teardown effect: the object disassembles into its component parts, each piece floating apart from the others in a controlled manner.', example: 'Un reloj que se desmonta: engranajes y piezas flotando separadamente' },
  { id: 's02', cat: 'style', name: '/claymation', title: 'Claymation / Stop-motion', desc: 'Animación en estilo plastilina, con movimientos entrecortados característicos del stop-motion.', prompt: 'Claymation style: the animation looks like stop-motion clay animation, with slightly jerky frame-by-frame movement. Plasticine textures and visible fingerprints.', example: 'Figura de plastilina caminando con el típico movimiento de stop-motion' },
  { id: 's03', cat: 'style', name: '/watercolor', title: 'Acuarela viva', desc: 'La imagen se transforma en una acuarela donde los colores fluyen y se mezclan como pintura húmeda.', prompt: 'Living watercolor effect: the scene turns into a watercolor painting where colors flow and bleed into each other like wet paint on paper. Soft edges, pigment textures.', example: 'Paisaje que fluye como acuarela fresca, colores mezclándose' },
  { id: 's04', cat: 'style', name: '/vhs', title: 'Efecto VHS / Retro', desc: 'Estilo vídeo antiguo con líneas de barrido, cromado degradado y estática.', prompt: 'Retro VHS effect: scanlines, chroma bleeding, tracking distortion, color degradation, and static noise. Looks like an old VHS tape recording from the 80s.', example: 'Recuerdo de los 90 con textura VHS, líneas y colores degradados' },
  { id: 's05', cat: 'style', name: '/levitate', title: 'Levitación', desc: 'El sujeto flota y levita suavemente, desafiando la gravedad.', prompt: 'Levitation effect: the subject slowly floats upward, defying gravity. Clothing and hair float naturally as if underwater. Smooth, dreamlike floating motion.', example: 'Una persona flotando en su sala de estar, con la ropa ondeando suavemente' },
  { id: 's06', cat: 'style', name: '/pixelate', title: 'Pixelado progresivo', desc: 'La imagen se pixela progresivamente, como un mosaico que revela o esconde detalles.', prompt: 'Progressive pixelation: the scene transitions through increasing levels of pixelation, from detailed to heavily pixelated mosaic, or vice versa.', example: 'Foto de rostro que se pixela hasta ser irreconocible como en los documentales' },

  // ── COMPOSICIÓN ──
  { id: 'cm01', cat: 'comp', name: '/split', title: 'Pantalla dividida', desc: 'La escena se divide en múltiples paneles mostrando diferentes ángulos simultáneamente.', prompt: 'Split screen: the frame divides into multiple panels, each showing a different angle or scene simultaneously. Clean borders between panels.', example: 'Llamada de Zoom creativa: 4 paneles mostrando a la misma persona desde 4 ángulos' },
  { id: 'cm02', cat: 'comp', name: '/zoomout', title: 'Zoom out cósmico', desc: 'Zoom out extremo que revela el contexto completo, desde el detalle hasta el macro.', prompt: 'Cosmic zoom out: extreme pull-back from microscopic detail to cosmic scale. From a leaf to the forest to the planet to the solar system in one continuous shot.', example: 'De una hormiga en una hoja... al bosque... al planeta... al sistema solar' },
  { id: 'cm03', cat: 'comp', name: '/clone', title: 'Clonación', desc: 'Múltiples copias del mismo sujeto aparecen en escena, interactuando entre sí.', prompt: 'Clone effect: multiple identical copies of the same subject appear in the frame simultaneously, each one doing something different. Perfect synchronization.', example: 'Una persona tocando la guitarra, otra cantando y otra bailando — la misma persona las tres' },
  { id: 'cm04', cat: 'comp', name: '/reflection', title: 'Reflejo', desc: 'Superficie reflectante aparece bajo el sujeto, duplicándolo como un espejo.', prompt: 'Mirror reflection: a reflective surface appears beneath the subject, creating a perfect mirror image. The reflection ripples and distorts naturally.', example: 'Bailarín sobre un lago helado, su reflejo perfecto en el hielo' },
  { id: 'cm05', cat: 'comp', name: '/portal', title: 'Portal dimensional', desc: 'Se abre un portal que conecta dos escenas, pudiendo la cámara atravesarlo.', prompt: 'Dimensional portal: a glowing portal opens in mid-air, revealing a completely different scene on the other side. The camera smoothly passes through the portal.', example: 'De una habitación a una playa tropical a través de un portal brillante' },
];

const CATEGORIES = [
  { id: 'mov', name: 'Movimiento', emoji: '🎥', badge: 'cat-mov' },
  { id: 'trans', name: 'Transiciones', emoji: '🔄', badge: 'cat-trans' },
  { id: 'light', name: 'Iluminación', emoji: '💡', badge: 'cat-light' },
  { id: 'time', name: 'Tiempo', emoji: '⏱️', badge: 'cat-time' },
  { id: 'style', name: 'Estilo', emoji: '🎨', badge: 'cat-style' },
  { id: 'comp', name: 'Composición', emoji: '🎬', badge: 'cat-comp' },
];

// ── STATE ──
let activeFilter = null;
let searchTerm = '';
let editMode = false;
let videoData = {}; // { commandId: base64DataURL }

// Load saved videos from localStorage
try {
  const saved = localStorage.getItem('videoVaultVideos');
  if (saved) videoData = JSON.parse(saved);
} catch(e) {}

const STORAGE_KEY = 'videoVaultVideos';
function saveVideos() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(videoData)); } catch(e) {
    // localStorage full, warn user
    alert('No se pudo guardar el vídeo. El archivo es demasiado grande para el almacenamiento local.');
  }
}

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

  // Edit mode toggle
  const editBtn = document.getElementById('edit-toggle-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      editMode = !editMode;
      editBtn.classList.toggle('active', editMode);
      editBtn.textContent = editMode ? '✏️ Edición activa' : '✏️ Modo edición';
      applyFilters();
    });
  }
});

// ── FILTERS ──
function renderFilters() {
  filtersEl.innerHTML = '';
  const all = document.createElement('button');
  all.className = `chip${activeFilter === null ? ' active' : ''}`;
  all.textContent = '🎬 Todos';
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
      c.desc.toLowerCase().includes(searchTerm)
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
    sectionTitle.textContent = '🎬 Todos los comandos';
  }
  const visible = grid.querySelectorAll('.story-card').length;
  sectionCount.textContent = visible;
}

// ── RENDER GRID ──
function renderGrid(commands) {
  if (commands.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="big">🔍</div><p>No se encontraron comandos</p></div>`;
    sectionCount.textContent = '0';
    return;
  }

  grid.innerHTML = commands.map(cmd => {
    const cat = CATEGORIES.find(c => c.id === cmd.cat);
    const badge = cat ? cat.badge : 'default';
    const hasVideo = !!videoData[cmd.id];
    return `
      <div class="story-card edit-mode-card" data-id="${cmd.id}" onclick="openModal('${cmd.id}')">
        <div class="badges">
          <span class="badge ${badge}">${cat ? cat.emoji + ' ' + cat.name : cmd.cat}</span>
        </div>
        <button class="copy-btn" onclick="event.stopPropagation(); copyText(this, '${cmd.name.replace(/'/g, "\\'")}')" title="Copiar comando">
          📋 Copiar
        </button>
        <div class="cmd-name">${cmd.name}</div>
        <div class="cmd-title">${cmd.title}</div>
        <div class="cmd-desc">${cmd.desc}</div>
        <div class="cmd-prompt-preview">${cmd.prompt}</div>
        <div class="meta">
          <span>🎯 ${cmd.example}</span>
        </div>
        <div class="video-actions${editMode ? ' show' : ''}">
          <input type="file" accept="video/*" id="vid-input-${cmd.id}" style="display:none" onchange="event.stopPropagation();handleVideoUpload('${cmd.id}', this)" />
          <label for="vid-input-${cmd.id}" class="vid-btn ${hasVideo ? 'has-video' : ''}" onclick="event.stopPropagation();">
            ${hasVideo ? '🎬 Vídeo subido' : '📹 Subir vídeo'}
          </label>
          ${hasVideo ? `<button class="vid-btn danger" onclick="event.stopPropagation();deleteVideo('${cmd.id}')">🗑️ Eliminar</button>` : ''}
        </div>
        ${hasVideo ? `<div class="video-preview show"><video src="${videoData[cmd.id]}" controls></video></div>` : `<div class="video-preview" id="vid-preview-${cmd.id}"></div>`}
      </div>
    `;
  }).join('');
}

// ── MODAL ──
function openModal(id) {
  const cmd = VIDEO_COMMANDS.find(c => c.id === id);
  if (!cmd) return;

  const cat = CATEGORIES.find(c => c.id === cmd.cat);
  const badge = cat ? cat.badge : 'default';

  modalBody.innerHTML = `
    <div class="cmd-badge badge ${badge}" style="font-size:0.85rem;margin-bottom:10px">${cat ? cat.emoji + ' ' + cat.name : cmd.cat}</div>
    <div class="cmd-name-big">${cmd.name}</div>
    <div class="cmd-title-big" style="font-size:1rem;color:var(--text-dim);margin-bottom:16px">${cmd.title}</div>
    <div class="cmd-desc-full">${cmd.desc}</div>
    <label style="font-size:0.78rem;color:var(--text-faint);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px;">Prompt para Gemini (selecciona generar vídeo):</label>
    <div class="cmd-prompt-full">${cmd.prompt}</div>
    <button class="cmd-copy-btn" id="modal-copy-btn">📋 Copiar prompt</button>
    ${cmd.example ? `<div class="cmd-example"><b>💡 Ejemplo:</b> ${cmd.example}</div>` : ''}
    <div class="cmd-example" style="margin-top:8px;background:rgba(0,208,208,0.08);border-color:rgba(0,208,208,0.25);color:var(--text-dim)">
      <b>⚡ Cómo usar:</b> Pega el prompt en Gemini y asegúrate de seleccionar la opción de generar <b>vídeo</b> (no imagen).
    </div>
  `;

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const copyBtn = document.getElementById('modal-copy-btn');
  if (copyBtn) copyBtn.onclick = () => copyText(copyBtn, cmd.prompt);
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

// ── VIDEO UPLOAD / DELETE ──
window.handleVideoUpload = function(id, input) {
  const file = input.files?.[0];
  if (!file) return;

  // Check file size (max 50MB for localStorage)
  if (file.size > 50 * 1024 * 1024) {
    alert('El vídeo es demasiado grande. Máximo 50MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    videoData[id] = e.target.result;
    saveVideos();
    applyFilters(); // Re-render to show preview
  };
  reader.readAsDataURL(file);
};

window.deleteVideo = function(id) {
  if (!confirm('¿Eliminar este vídeo de muestra?')) return;
  delete videoData[id];
  saveVideos();
  applyFilters();
};