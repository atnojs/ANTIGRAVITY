// ============================================================
// 10 EFECTOS DE MOVIMIENTO - Controlador
// ============================================================

const ANIMATIONS = [
  {
    id: 'reveal-progresivo',
    name: 'Revelar Progresivo',
    emoji: '🎬',
    desc: 'Se dibuja de arriba a abajo',
    cssClass: 'anim-reveal-progresivo',
    wrapper: false
  },
  {
    id: 'zoom-suave',
    name: 'Zoom Suave',
    emoji: '🔍',
    desc: 'Acercamiento lento continuo',
    cssClass: 'anim-zoom-suave',
    wrapper: false
  },
  {
    id: 'pan-deslizante',
    name: 'Pan Deslizante',
    emoji: '↔️',
    desc: 'Se desplaza horizontalmente',
    cssClass: 'anim-pan-deslizante',
    wrapper: true
  },
  {
    id: 'destello-secciones',
    name: 'Destello Secciones',
    emoji: '✨',
    desc: 'Cada sección aparece en secuencia',
    cssClass: 'anim-destello-secciones',
    wrapper: false
  },
  {
    id: 'respiracion',
    name: 'Respiración Sutil',
    emoji: '🫁',
    desc: 'La infografía "respira" suavemente',
    cssClass: 'anim-respiracion',
    wrapper: false
  },
  {
    id: 'ken-burns',
    name: 'Ken Burns',
    emoji: '🎥',
    desc: 'Zoom + paneo documental',
    cssClass: 'anim-ken-burns',
    wrapper: false
  },
  {
    id: 'particulas',
    name: 'Partículas Flotantes',
    emoji: '🌟',
    desc: 'Elementos decorativos flotan sobre ella',
    cssClass: 'anim-particulas',
    wrapper: false
  },
  {
    id: 'resaltado-narrativo',
    name: 'Resaltado Narrativo',
    emoji: '🔦',
    desc: 'Cada punto se ilumina en secuencia',
    cssClass: 'anim-resaltado-narrativo',
    wrapper: false
  },
  {
    id: 'maquina-escribir',
    name: 'Máquina Escribir',
    emoji: '⌨️',
    desc: 'Texto aparece letra por letra',
    cssClass: 'anim-maquina-escribir',
    wrapper: false
  },
  {
    id: 'caleidoscopio',
    name: 'Caleidoscopio',
    emoji: '🔄',
    desc: 'Entrada con efecto espejo',
    cssClass: 'anim-caleidoscopio',
    wrapper: false
  }
];

const AnimController = {
  selectedAnimId: null,
  currentImg: null,
  isPlaying: true,

  renderGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ANIMATIONS.map(anim => `
      <div class="anim-card" data-anim-id="${anim.id}" onclick="AnimController.select('${anim.id}')">
        <div class="anim-emoji">${anim.emoji}</div>
        <div class="anim-name">${anim.name}</div>
        <div class="anim-desc">${anim.desc}</div>
      </div>
    `).join('');
  },

  select(animId) {
    this.selectedAnimId = animId;

    // Update UI
    document.querySelectorAll('.anim-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.animId === animId);
    });

    // Apply to preview image
    this.applyToImage(animId);
  },

  applyToImage(animId) {
    const img = document.getElementById('preview-img');
    if (!img) return;

    // Remove all animation classes
    const animClasses = ANIMATIONS.map(a => a.cssClass);
    img.classList.remove(...animClasses);
    img.style.animation = '';
    img.style.clipPath = '';
    img.style.transform = '';

    const anim = ANIMATIONS.find(a => a.id === animId);
    if (!anim) return;

    // Re-trigger animation by removing then adding class
    void img.offsetWidth; // force reflow

    if (anim.wrapper) {
      // Wrapper animations need the parent container adjusted
      const wrapper = img.closest('.animated-wrapper');
      if (wrapper) {
        wrapper.style.width = animId === 'pan-deslizante' ? '115%' : '100%';
        wrapper.style.maxWidth = animId === 'pan-deslizante' ? 'none' : '100%';
      }
    }

    img.classList.add(anim.cssClass);
    this.isPlaying = true;
  },

  stop() {
    const img = document.getElementById('preview-img');
    if (!img) return;
    img.classList.add('anim-paused');
    this.isPlaying = false;
  },

  play() {
    const img = document.getElementById('preview-img');
    if (!img) return;
    img.classList.remove('anim-paused');
    this.isPlaying = true;
  },

  reset() {
    this.selectedAnimId = null;
    const img = document.getElementById('preview-img');
    if (!img) return;
    const animClasses = ANIMATIONS.map(a => a.cssClass);
    img.classList.remove(...animClasses, 'anim-paused');
    img.style.animation = '';
    img.style.clipPath = '';
    img.style.transform = '';
  }
};
