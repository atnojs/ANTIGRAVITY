/* Capa operativa de Folio: IA segura, historial, edición y layouts por formato. */
const FolioOperational = {
  history: null,
  projects: [],
  storageMode: 'local',
  styleFilter: 'all',
  saving: false,

  async init() {
    await this.initHistory();
    await this.updateApiStatus();
    this.updateProjectCount();
    const editorButton = document.querySelector('[onclick="App.openEditor()"]');
    if (editorButton) {
      editorButton.setAttribute('onclick', 'App.openImageEditor()');
      editorButton.textContent = 'Editar en Editor de Imágenes ↗';
    }
  },

  getClientId() {
    let id = localStorage.getItem('folio-client-id');
    if (!id) {
      const random = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now()}${Math.random().toString(36).slice(2)}`;
      id = random.slice(0, 32);
      localStorage.setItem('folio-client-id', id);
    }
    return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  },

  getLocalKey() {
    return `folio-projects-${this.getClientId()}`;
  },

  async initHistory() {
    if (typeof HistoryManager !== 'undefined') {
      try {
        this.history = new HistoryManager(`folio_${this.getClientId()}`);
        this.projects = await this.history.load();
        this.storageMode = 'server';
        this.history.onChange(items => {
          this.projects = items;
          this.updateProjectCount();
          if (!document.getElementById('projects-modal').hidden) this.renderProjects();
        });
        return;
      } catch (error) {
        console.warn('[Folio] Historial del servidor no disponible:', error.message);
      }
    }
    this.storageMode = 'local';
    this.projects = this.loadLocalProjects();
  },

  loadLocalProjects() {
    try {
      const items = JSON.parse(localStorage.getItem(this.getLocalKey()) || '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },

  saveLocalProjects() {
    const compact = this.projects.slice(0, 30).map(item => ({
      id: item.id,
      type: 'infographic',
      model: item.model,
      createdAt: item.createdAt,
      data: item.data
    }));
    localStorage.setItem(this.getLocalKey(), JSON.stringify(compact));
  },

  async updateApiStatus() {
    const key = localStorage.getItem('folio-api-key') || '';
    const health = typeof API !== 'undefined' && API.health
      ? await API.health()
      : { available: false, configured: false };
    const status = document.getElementById('sidebar-model-status');
    const dot = document.querySelector('.status-dot');
    const copy = document.getElementById('model-connection-copy');

    if (health.configured) {
      if (status) status.textContent = 'IA del servidor lista';
      if (dot) dot.style.background = '#6bc69d';
      if (copy) copy.textContent = 'La IA del servidor está configurada y lista. No necesitas introducir una clave personal.';
      App.proxyReady = true;
    } else if (key) {
      if (status) status.textContent = 'OpenRouter conectado';
      if (dot) dot.style.background = '#f3ca70';
      if (copy) copy.textContent = 'El servidor no tiene una clave configurada. Folio utilizará la clave de OpenRouter guardada en este navegador.';
      App.proxyReady = false;
    } else {
      if (status) status.textContent = 'Modo demo listo';
      if (dot) dot.style.background = '#9aa3a4';
      if (copy) copy.textContent = 'El servidor todavía no tiene OpenRouter configurado. Puedes añadir tu clave o continuar con el generador local.';
      App.proxyReady = false;
    }
    return health;
  },

  extractAllowedNumbers(text) {
    return (String(text).match(/\b\d+(?:[.,]\d+)?\s*%?/g) || []).map(value => value.replace(/\s/g, ''));
  },

  removeUnsupportedNumbers(text, allowed) {
    return String(text || '').replace(/\b\d+(?:[.,]\d+)?\s*%?/g, match => {
      const normalized = match.replace(/\s/g, '');
      return allowed.includes(normalized) ? match : '';
    }).replace(/\s{2,}/g, ' ').trim();
  },

  sanitizeInfographic(data, topic, source) {
    const allowed = this.extractAllowedNumbers(`${topic} ${source}`);
    const sections = Array.isArray(data.sections) ? data.sections.slice(0, 6) : [];
    const cleanSections = sections.map((section, index) => ({
      titulo: String(section.titulo || `Sección ${index + 1}`).slice(0, 40),
      icono: String(section.icono || ['✦', '↗', '◷', '→'][index % 4]).slice(0, 4),
      dato_destacado: this.removeUnsupportedNumbers(section.dato_destacado || '', allowed).slice(0, 20),
      puntos: (Array.isArray(section.puntos) ? section.puntos : [])
        .slice(0, 4)
        .map(point => this.removeUnsupportedNumbers(point, allowed).slice(0, 150))
        .filter(Boolean)
    }));

    return {
      titulo: String(data.titulo || topic.split(/[.!?]/)[0] || 'Una idea en foco').slice(0, 100),
      subtitulo: String(data.subtitulo || 'Una síntesis visual para entenderlo mejor').slice(0, 160),
      sections: cleanSections.length ? cleanSections : this.makeLocalData(topic).sections,
      fuente: String(source || '').slice(0, 180)
    };
  },

  makeLocalData(topic) {
    const title = topic.split(/[.!?]/)[0].trim().slice(0, 80) || 'Una idea en foco';
    const sentences = topic.split(/[.!?\n]+/).map(item => item.trim()).filter(Boolean);
    const source = document.getElementById('source')?.value.trim() || '';
    const sectionNames = {
      statistical: ['Dato principal', 'Qué cambia', 'El contexto', 'Conclusión'],
      comparison: ['Primera opción', 'Segunda opción', 'En común', 'Decisión'],
      process: ['Empieza', 'Continúa', 'Comprueba', 'Termina'],
      timeline: ['Origen', 'Evolución', 'Cambio', 'Actualidad'],
      geographic: ['Localización', 'Diferencias', 'Contexto', 'Conclusión'],
      informational: ['La idea', 'Lo esencial', 'Un ejemplo', 'La clave']
    }[App.selectedFormat] || ['La idea', 'Lo esencial', 'La clave'];

    const base = sentences.length
      ? sentences
      : ['Información aportada por el usuario'];

    return {
      titulo: title,
      subtitulo: 'Una síntesis visual basada en el contenido aportado',
      fuente: source,
      sections: sectionNames.map((name, index) => {
        const point = base[index % base.length];
        const number = (point.match(/\b\d+(?:[.,]\d+)?\s*%?/g) || [])[0] || '';
        return {
          titulo: name,
          icono: ['✦', '↗', '◷', '→'][index % 4],
          dato_destacado: number,
          puntos: [point.slice(0, 140)]
        };
      })
    };
  },

  async generate() {
    const topicField = document.getElementById('topic');
    const topic = topicField.value.trim();
    if (!topic) {
      App.showToast('Cuéntame primero qué quieres explicar.');
      topicField.focus();
      return;
    }

    const button = document.getElementById('generate-button');
    const apiKey = localStorage.getItem('folio-api-key') || '';
    const source = document.getElementById('source').value.trim();
    const audience = document.getElementById('audience').value;
    const channel = document.getElementById('channel').value;
    const title = topic.split(/[.!?]/)[0].trim().slice(0, 90);
    if (typeof FolioReference !== 'undefined' && FolioReference.imageData && !FolioReference.schema) {
      await FolioReference.analyze();
      if (!FolioReference.schema) return;
    }
    const referenceSchema = typeof FolioReference !== 'undefined' ? FolioReference.schema : null;
    const baseStyle = App.getStyle();
    const palette = referenceSchema?.palette || {};
    const style = { ...baseStyle, _c1: palette.background || baseStyle._c1, _c2: palette.accent || palette.primary || baseStyle._c2, _c3: palette.secondary || baseStyle._c3, _c4: palette.primary || baseStyle._c4, _c5: palette.text || baseStyle._c5 };
    let data = null;
    let sourceLabel = 'BOCETO LOCAL';

    button.disabled = true;
    button.innerHTML = '<span class="button-spark">✦</span> Ordenando tu historia…';

    try {
      data = await API.generate(App.selectedStyleId, audience, title, topic, apiKey, {
        format: App.selectedFormat,
        source,
        channel,
        visualDirection: referenceSchema?.summary || '',
        referenceSchema
      });
      sourceLabel = 'GENERADO CON IA';
    } catch (error) {
      console.warn('[Folio] Generación IA no disponible:', error.message);
      data = this.makeLocalData(topic);
      App.showToast('He creado un boceto local. Conecta OpenRouter para una redacción más elaborada.');
    }

    data = this.sanitizeInfographic(data, topic, source);
    App.lastInfographic = {
      data,
      style,
      styleId: App.selectedStyleId,
      sourceLabel,
      format: App.selectedFormat,
      aspect: document.querySelector('input[name="aspect"]:checked')?.value || 'vertical',
      referenceSchema,
      topic,
      projectId: `folio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };

    this.renderResult();
    await this.saveCurrentProject();
    button.disabled = false;
    button.innerHTML = '<span class="button-spark">✦</span> Generar infografía <span class="arrow">→</span>';
  },

  renderResult() {
    const item = App.lastInfographic;
    if (!item) return;
    const detail = App.getDetail(item.styleId || App.selectedStyleId);
    const format = FORMAT_OPTIONS.find(option => option.id === item.format) || FORMAT_OPTIONS[5];
    document.getElementById('result-style').textContent = detail.name;
    document.getElementById('result-style-note').textContent = detail.description;
    document.getElementById('result-format').textContent = format.name;
    document.getElementById('result-format-note').textContent = App.formatNote(item.format);
    document.getElementById('canvas-badge').textContent = item.sourceLabel;
    document.getElementById('result-tip').textContent = item.data.fuente
      ? 'La fuente está incorporada. Comprueba fecha y enlace antes de publicar.'
      : 'Añade una fuente cuando comuniques datos o afirmaciones verificables.';
    document.getElementById('result-subtitle').textContent = 'Guardando en Mis proyectos…';
    this.drawCanvas(item.data, item.style, item.format);
    document.getElementById('result-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  },

  canvasFont(role) {
    const type = App.lastInfographic?.referenceSchema?.typography?.[role === 'heading' ? 'title' : 'body'];
    if (type === 'serif' || type === 'display' || type === 'handwritten') return 'Fraunces, Georgia, serif';
    if (type === 'mono') return 'DM Mono, monospace';
    return role === 'heading' ? 'Fraunces, Georgia, serif' : role === 'mono' ? 'DM Mono, monospace' : 'DM Sans, Arial, sans-serif';
  },

  sectionLimit(aspect, maximum = 6) {
    const density = App.lastInfographic?.referenceSchema?.composition?.density || 'balanced';
    if (density === 'airy') return 3;
    if (density === 'detailed' && aspect === 'vertical') return maximum;
    return Math.min(4, maximum);
  },

  setupCanvas(style) {
    const canvas = document.getElementById('result-canvas');
    const aspect = document.querySelector('input[name="aspect"]:checked')?.value || App.lastInfographic?.aspect || 'vertical';
    const width = aspect === 'vertical' ? 720 : 960;
    const height = aspect === 'vertical' ? 900 : aspect === 'square' ? 760 : 640;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const bg = style._c1 || '#1d252b';
    const accent = style._c2 || '#f76a4f';
    const accent2 = style._c3 || '#f3ca70';
    const text = App.isLight(bg) ? '#1d252b' : '#fffefa';
    const muted = App.isLight(bg) ? 'rgba(29,37,43,.66)' : 'rgba(255,254,250,.7)';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, App.withAlpha(accent, .18));
    gradient.addColorStop(1, App.withAlpha(accent2, .2));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const illustrationMode = App.lastInfographic?.referenceSchema?.shapes?.illustration;
    if (illustrationMode && illustrationMode !== 'none') {
      for (let index = 0; index < 7; index += 1) {
        const x = (index * 173 + 41) % width;
        const y = (index * 227 + 96) % height;
        const radius = 28 + (index % 3) * 19;
        ctx.fillStyle = App.withAlpha(index % 2 ? accent : accent2, .075);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return { canvas, ctx, width, height, aspect, bg, accent, accent2, text, muted };
  },

  drawCanvas(data, style, format) {
    const c = this.setupCanvas(style);
    const schemaLayout = App.lastInfographic?.referenceSchema?.layout;
    const layoutFormat = ({ split:'comparison', comparison:'comparison', timeline:'timeline', process:'process', dashboard:'statistical', radial:'informational', editorial:'informational', poster:'informational', grid:'informational', map:'geographic' })[schemaLayout] || format;
    const { ctx, width, height, aspect, accent, accent2, text, muted } = c;
    const margin = aspect === 'vertical' ? 48 : 56;
    ctx.fillStyle = accent;
    ctx.fillRect(margin, 44, 48, 5);
    ctx.fillStyle = muted;
    ctx.font = `500 12px ${this.canvasFont('mono')}`;
    ctx.fillText(`FOLIO / ${String(format || 'RESUMEN').toUpperCase()}`, margin, 76);
    ctx.fillStyle = text;
    ctx.font = `700 ${aspect === 'vertical' ? 38 : 42}px ${this.canvasFont('heading')}`;
    App.drawWrapped(ctx, data.titulo, margin, 128, width - margin * 2, 44, 2);
    ctx.fillStyle = muted;
    ctx.font = `400 15px ${this.canvasFont('body')}`;
    App.drawWrapped(ctx, data.subtitulo || '', margin, 220, width - margin * 2, 22, 2);

    const contentTop = 278;
    if (schemaLayout === 'radial' || schemaLayout === 'map') this.drawRadial(c, data.sections, contentTop);
    else if (layoutFormat === 'timeline' || layoutFormat === 'process') this.drawSequence(c, data.sections, contentTop, layoutFormat === 'process');
    else if (layoutFormat === 'comparison') this.drawComparison(c, data.sections, contentTop);
    else if (layoutFormat === 'statistical') this.drawStatistics(c, data.sections, contentTop);
    else this.drawCards(c, data.sections, contentTop);

    ctx.fillStyle = muted;
    ctx.font = `400 10px ${this.canvasFont('mono')}`;
    ctx.fillText(data.fuente ? `FUENTE · ${data.fuente.slice(0, 76)}` : 'SIN FUENTE APORTADA', margin, height - 34);
    ctx.fillStyle = accent;
    ctx.fillRect(width - margin - 30, height - 42, 30, 2);
  },

  drawCards(c, sections, top) {
    const { ctx, width, height, aspect, text, muted, accent, accent2 } = c;
    const margin = aspect === 'vertical' ? 48 : 56;
    const gap = 14;
    const columns = aspect === 'vertical' ? 1 : 2;
    const cardW = (width - margin * 2 - gap * (columns - 1)) / columns;
    const limit = this.sectionLimit(aspect);
    const rows = Math.ceil(Math.min(sections.length, limit) / columns);
    const cardH = Math.min(122, (height - top - 80 - gap * (rows - 1)) / rows);
    sections.slice(0, limit).forEach((section, index) => {
      const x = margin + (index % columns) * (cardW + gap);
      const y = top + Math.floor(index / columns) * (cardH + gap);
      this.drawInfoCard(ctx, section, x, y, cardW, cardH, index, text, muted, accent, accent2);
    });
  },

  drawRadial(c, sections, top) {
    const { ctx, width, height, aspect, text, muted, accent, accent2, bg } = c;
    const items = sections.slice(0, Math.min(6, this.sectionLimit(aspect, 6)));
    const centerX = width / 2;
    const centerY = top + (height - top - 80) / 2;
    const radiusX = aspect === 'vertical' ? 205 : 300;
    const radiusY = aspect === 'vertical' ? 185 : 125;
    const nodeW = aspect === 'vertical' ? 150 : 170;
    const nodeH = 88;

    items.forEach((section, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(items.length, 1);
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      ctx.strokeStyle = App.withAlpha(index % 2 ? accent2 : accent, .55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo((centerX + x) / 2 + Math.sin(angle) * 24, (centerY + y) / 2 - Math.cos(angle) * 24, x, y);
      ctx.stroke();
    });

    ctx.fillStyle = App.withAlpha(accent, .2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 63, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = App.isLight(accent) ? '#1d252b' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `700 35px ${this.canvasFont('body')}`;
    ctx.fillText('✦', centerX, centerY + 12);

    items.forEach((section, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(items.length, 1);
      const cx = centerX + Math.cos(angle) * radiusX;
      const cy = centerY + Math.sin(angle) * radiusY;
      const x = Math.max(24, Math.min(width - nodeW - 24, cx - nodeW / 2));
      const y = Math.max(top - 8, Math.min(height - nodeH - 55, cy - nodeH / 2));
      ctx.fillStyle = App.withAlpha(App.isLight(bg) ? '#ffffff' : '#000000', .22);
      ctx.beginPath();
      ctx.roundRect(x, y, nodeW, nodeH, 18);
      ctx.fill();
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.beginPath();
      ctx.arc(x + 25, y + 27, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = App.isLight(index % 2 ? accent2 : accent) ? '#1d252b' : '#ffffff';
      ctx.font = `700 15px ${this.canvasFont('body')}`;
      ctx.textAlign = 'center';
      ctx.fillText(section.icono || '✦', x + 25, y + 32);
      ctx.textAlign = 'left';
      ctx.fillStyle = text;
      ctx.font = `700 14px ${this.canvasFont('heading')}`;
      App.drawWrapped(ctx, section.titulo, x + 47, y + 25, nodeW - 57, 16, 2);
      ctx.fillStyle = muted;
      ctx.font = `400 9px ${this.canvasFont('body')}`;
      App.drawWrapped(ctx, section.puntos?.[0] || '', x + 14, y + 58, nodeW - 28, 12, 2);
    });
    ctx.textAlign = 'left';
  },

  drawStatistics(c, sections, top) {
    const { ctx, width, height, aspect, text, muted, accent, accent2 } = c;
    const margin = aspect === 'vertical' ? 48 : 56;
    const gap = 14;
    const columns = 2;
    const limit = this.sectionLimit(aspect);
    const cardW = (width - margin * 2 - gap) / 2;
    const rows = Math.ceil(Math.min(sections.length, limit) / columns);
    const cardH = Math.min(170, (height - top - 94 - gap * (rows - 1)) / rows);
    sections.slice(0, limit).forEach((section, index) => {
      const x = margin + (index % 2) * (cardW + gap);
      const y = top + Math.floor(index / 2) * (cardH + gap);
      ctx.fillStyle = App.withAlpha('#ffffff', .11);
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.fillRect(x, y, cardW, 5);
      ctx.fillStyle = section.dato_destacado ? (index % 2 ? accent2 : accent) : muted;
      ctx.font = `700 ${section.dato_destacado ? 34 : 20}px ${this.canvasFont('body')}`;
      ctx.fillText(section.dato_destacado || section.icono || '✦', x + 18, y + 48);
      ctx.fillStyle = text;
      ctx.font = `700 17px ${this.canvasFont('heading')}`;
      ctx.fillText(section.titulo.slice(0, 28), x + 18, y + 78);
      ctx.fillStyle = muted;
      ctx.font = `400 11px ${this.canvasFont('body')}`;
      App.drawWrapped(ctx, section.puntos?.[0] || '', x + 18, y + 104, cardW - 36, 16, 3);
    });
  },

  drawSequence(c, sections, top, numbered) {
    const { ctx, width, height, aspect, text, muted, accent, accent2, bg } = c;
    const margin = aspect === 'vertical' ? 48 : 56;
    const items = sections.slice(0, this.sectionLimit(aspect));
    const lineX = margin + 23;
    const available = height - top - 94;
    const itemH = available / Math.max(items.length, 1);
    ctx.strokeStyle = App.withAlpha(accent, .55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lineX, top + 18);
    ctx.lineTo(lineX, top + available - 18);
    ctx.stroke();
    items.forEach((section, index) => {
      const y = top + index * itemH;
      ctx.fillStyle = accent2;
      ctx.beginPath();
      ctx.arc(lineX, y + 24, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = App.isLight(accent2) ? '#1d252b' : '#fff';
      ctx.font = `700 12px ${this.canvasFont('body')}`;
      ctx.textAlign = 'center';
      ctx.fillText(numbered ? String(index + 1) : (section.icono || '•'), lineX, y + 28);
      ctx.textAlign = 'left';
      ctx.fillStyle = App.withAlpha('#ffffff', .1);
      ctx.fillRect(lineX + 30, y, width - margin - lineX - 30, Math.max(72, itemH - 12));
      ctx.fillStyle = text;
      ctx.font = `700 18px ${this.canvasFont('heading')}`;
      ctx.fillText(section.titulo.slice(0, 30), lineX + 47, y + 29);
      ctx.fillStyle = muted;
      ctx.font = `400 11px ${this.canvasFont('body')}`;
      App.drawWrapped(ctx, section.puntos?.[0] || '', lineX + 47, y + 53, width - margin - lineX - 68, 16, 2);
      if (section.dato_destacado) {
        ctx.fillStyle = accent;
        ctx.font = `700 16px ${this.canvasFont('body')}`;
        ctx.textAlign = 'right';
        ctx.fillText(section.dato_destacado, width - margin - 14, y + 29);
        ctx.textAlign = 'left';
      }
    });
  },

  drawComparison(c, sections, top) {
    const { ctx, width, height, aspect, text, muted, accent, accent2 } = c;
    const margin = aspect === 'vertical' ? 42 : 56;
    const gap = 14;
    const colW = (width - margin * 2 - gap) / 2;
    const cardH = height - top - 88;
    [0, 1].forEach(col => {
      const x = margin + col * (colW + gap);
      ctx.fillStyle = App.withAlpha('#ffffff', .11);
      ctx.fillRect(x, top, colW, cardH);
      ctx.fillStyle = col ? accent2 : accent;
      ctx.fillRect(x, top, colW, 7);
      const primary = sections[col] || sections[0] || { titulo: '', puntos: [] };
      ctx.fillStyle = text;
      ctx.font = `700 ${aspect === 'vertical' ? 19 : 23}px ${this.canvasFont('heading')}`;
      App.drawWrapped(ctx, primary.titulo, x + 18, top + 45, colW - 36, 27, 2);
      ctx.fillStyle = col ? accent2 : accent;
      ctx.font = `700 25px ${this.canvasFont('body')}`;
      if (primary.dato_destacado) ctx.fillText(primary.dato_destacado, x + 18, top + 102);
      ctx.fillStyle = muted;
      ctx.font = `400 12px ${this.canvasFont('body')}`;
      const points = [...(primary.puntos || []), ...(sections[col + 2]?.puntos || [])].slice(0, 4);
      points.forEach((point, index) => App.drawWrapped(ctx, `• ${point}`, x + 18, top + 140 + index * 58, colW - 36, 17, 3));
    });
  },

  drawInfoCard(ctx, section, x, y, w, h, index, text, muted, accent, accent2) {
    const compact = h < 96;
    ctx.fillStyle = App.withAlpha('#ffffff', .1);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = index % 2 ? accent2 : accent;
    ctx.fillRect(x, y, 5, h);
    ctx.fillStyle = index % 2 ? accent2 : accent;
    ctx.beginPath();
    ctx.arc(x + 25, y + (compact ? 22 : 27), compact ? 11 : 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = App.isLight(index % 2 ? accent2 : accent) ? '#1d252b' : '#ffffff';
    ctx.font = `700 ${compact ? 10 : 12}px ${this.canvasFont('body')}`;
    ctx.textAlign = 'center';
    ctx.fillText(section.icono || '✦', x + 25, y + (compact ? 26 : 31));
    ctx.textAlign = 'left';
    ctx.fillStyle = text;
    ctx.font = `700 ${compact ? 14 : 17}px ${this.canvasFont('heading')}`;
    ctx.fillText(section.titulo.slice(0, compact ? 24 : 28), x + 46, y + (compact ? 26 : 31));
    if (section.dato_destacado) {
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.font = `700 ${compact ? 16 : 22}px ${this.canvasFont('body')}`;
      ctx.textAlign = 'right';
      ctx.fillText(section.dato_destacado, x + w - 16, y + (compact ? 24 : 29));
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = muted;
    ctx.font = `400 ${compact ? 9 : 11}px ${this.canvasFont('body')}`;
    App.drawWrapped(ctx, section.puntos?.[0] || '', x + 18, y + (compact ? 45 : 59), w - 36, compact ? 12 : 16, compact ? 2 : 3);
  },

  async saveCurrentProject() {
    const item = App.lastInfographic;
    if (!item || this.saving) return;
    this.saving = true;
    const payload = {
      infographic: item.data,
      styleId: item.styleId || App.selectedStyleId,
      format: item.format,
      aspect: item.aspect,
      referenceSchema: item.referenceSchema || null,
      sourceLabel: item.sourceLabel,
      topic: item.topic || document.getElementById('topic').value,
      audience: document.getElementById('audience').value,
      channel: document.getElementById('channel').value
    };
    const entry = {
      id: item.projectId,
      type: 'infographic',
      model: item.sourceLabel === 'GENERADO CON IA' ? 'openrouter' : 'local',
      data: payload,
      imageData: document.getElementById('result-canvas').toDataURL('image/png'),
      createdAt: item.createdAt || new Date().toISOString()
    };

    try {
      if (this.storageMode === 'server' && this.history) {
        await this.history.save(entry);
      } else {
        const localEntry = { ...entry };
        delete localEntry.imageData;
        this.projects = this.projects.filter(project => project.id !== entry.id);
        this.projects.unshift(localEntry);
        this.saveLocalProjects();
        this.updateProjectCount();
      }
      document.getElementById('result-subtitle').textContent = this.storageMode === 'server'
        ? 'Guardada en Mis proyectos.'
        : 'Guardada en este navegador.';
    } catch (error) {
      console.warn('[Folio] No se pudo guardar en el servidor:', error.message);
      this.storageMode = 'local';
      const localEntry = { ...entry };
      delete localEntry.imageData;
      this.projects = this.projects.filter(project => project.id !== entry.id);
      this.projects.unshift(localEntry);
      this.saveLocalProjects();
      this.updateProjectCount();
      document.getElementById('result-subtitle').textContent = 'Guardada en este navegador.';
    } finally {
      this.saving = false;
    }
  },

  updateProjectCount() {
    const count = document.getElementById('projects-count');
    if (count) count.textContent = String(this.projects.length);
  },

  openProjects() {
    this.renderProjects();
    document.getElementById('projects-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  },

  closeProjects() {
    document.getElementById('projects-modal').hidden = true;
    document.body.style.overflow = '';
  },

  projectPayload(project) {
    return project?.data?.infographic ? project.data : project?.data || null;
  },

  renderProjects() {
    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('projects-empty');
    empty.hidden = this.projects.length > 0;
    grid.innerHTML = this.projects.map(project => {
      const payload = this.projectPayload(project) || {};
      const infographic = payload.infographic || {};
      const style = App.getStyle(payload.styleId || 'dashboard-pro');
      const date = new Date(project.createdAt || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      const preview = project.imageUrl
        ? `<img src="${this.escape(project.imageUrl)}" alt="">`
        : `<div class="project-swatch" style="background:linear-gradient(135deg,${style._c1},${style._c3})"><span>${this.escape(infographic.titulo || 'Infografía')}</span></div>`;
      return `<article class="project-card"><button class="project-open" type="button" onclick="App.openProject('${this.escape(project.id)}')">${preview}<span class="project-meta"><strong>${this.escape(infographic.titulo || 'Infografía sin título')}</strong><small>${date} · ${this.escape(payload.format || 'resumen')}</small></span></button><div class="project-actions"><button class="project-download" type="button" onclick="App.downloadProject('${this.escape(project.id)}')">Descargar PNG ↓</button><button class="project-delete project-delete-inline" type="button" aria-label="Eliminar proyecto" onclick="App.deleteProject('${this.escape(project.id)}')">×</button></div></article>`;
    }).join('');
  },

  downloadProject(id) {
    const project = this.projects.find(item => item.id === id);
    const payload = this.projectPayload(project);
    if (!payload?.infographic) return;
    const previousItem = App.lastInfographic;
    const style = App.getStyle(payload.styleId || 'dashboard-pro');
    App.lastInfographic = { ...(App.lastInfographic || {}), referenceSchema: payload.referenceSchema || null };
    const radio = document.querySelector(`input[name="aspect"][value="${payload.aspect || 'vertical'}"]`);
    const previousAspect = document.querySelector('input[name="aspect"]:checked')?.value || 'vertical';
    if (radio) radio.checked = true;
    this.drawCanvas(payload.infographic, style, payload.format || 'informational');
    const link = document.createElement('a');
    link.download = `folio-${String(payload.infographic.titulo || 'infografia').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,'-').replace(/^-|-$/g,'')}.png`;
    link.href = document.getElementById('result-canvas').toDataURL('image/png');
    link.click();
    const previousRadio = document.querySelector(`input[name="aspect"][value="${previousAspect}"]`);
    if (previousRadio) previousRadio.checked = true;
    App.lastInfographic = previousItem;
    App.showToast('Infografía descargada desde Mis proyectos.');
  },

  openProject(id) {
    const project = this.projects.find(item => item.id === id);
    const payload = this.projectPayload(project);
    if (!project || !payload?.infographic) return;
    const styleId = payload.styleId || 'dashboard-pro';
    App.selectedStyleId = styleId;
    App.selectedFormat = payload.format || 'informational';
    const detail = STYLE_DETAILS[styleId];
    const styleCategory = App.getStyle(styleId).cat;
    const folderMap = { infantil:'expressive', senior:'calm', corporativo:'system', artistico:'editorial', tecnico:'system' };
    App.activeFolder = detail?.folder || folderMap[styleCategory] || App.activeFolder;
    const radio = document.querySelector(`input[name="aspect"][value="${payload.aspect || 'vertical'}"]`);
    if (radio) radio.checked = true;
    document.getElementById('topic').value = payload.topic || '';
    document.getElementById('source').value = payload.infographic.fuente || '';
    if (payload.audience) document.getElementById('audience').value = payload.audience;
    if (payload.channel) document.getElementById('channel').value = payload.channel;
    if (typeof FolioReference !== 'undefined') FolioReference.schema = payload.referenceSchema || null;
    const resolvedStyle = App.getStyle(styleId);
    App.lastInfographic = {
      data: payload.infographic,
      style: resolvedStyle,
      styleId,
      format: payload.format || 'informational',
      aspect: payload.aspect || 'vertical',
      referenceSchema: payload.referenceSchema || null,
      sourceLabel: payload.sourceLabel || 'PROYECTO GUARDADO',
      topic: payload.topic || '',
      projectId: project.id,
      createdAt: project.createdAt
    };
    App.renderFormats();
    if (typeof FolioReference !== 'undefined') FolioReference.render();
    this.closeProjects();
    this.renderResult();
    document.getElementById('result-subtitle').textContent = 'Proyecto recuperado.';
  },

  async deleteProject(id) {
    if (!confirm('¿Eliminar esta infografía del historial?')) return;
    try {
      if (this.storageMode === 'server' && this.history) await this.history.delete(id);
      else {
        this.projects = this.projects.filter(item => item.id !== id);
        this.saveLocalProjects();
        this.updateProjectCount();
        this.renderProjects();
      }
    } catch (error) {
      App.showToast(`No se pudo eliminar: ${error.message}`);
    }
  },

  async clearProjects() {
    if (!this.projects.length || !confirm('¿Vaciar todo el historial de Folio?')) return;
    try {
      if (this.storageMode === 'server' && this.history) await this.history.clear();
      else {
        this.projects = [];
        this.saveLocalProjects();
        this.updateProjectCount();
        this.renderProjects();
      }
    } catch (error) {
      App.showToast(`No se pudo vaciar el historial: ${error.message}`);
    }
  },

  openImageEditor() {
    const canvas = document.getElementById('result-canvas');
    if (!canvas || !App.lastInfographic) return;
    try {
      localStorage.setItem('antigravity-image-handoff', JSON.stringify({
        source: 'folio',
        title: App.lastInfographic.data?.titulo || 'Infografía Folio',
        dataUrl: canvas.toDataURL('image/png'),
        createdAt: Date.now()
      }));
      window.location.href = '/apps/editar_imagen/?handoff=folio';
    } catch (error) {
      App.showToast('La imagen es demasiado grande para abrirla directamente. Descárgala y súbela al editor.');
    }
  },

  escape(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
  }
};

App.generate = () => FolioOperational.generate();
App.makeLocalData = topic => FolioOperational.makeLocalData(topic);
App.renderResult = () => FolioOperational.renderResult();
App.drawCanvas = (data, style, format) => FolioOperational.drawCanvas(data, style, format);
App.updateApiStatus = () => FolioOperational.updateApiStatus();
App.openProjects = () => FolioOperational.openProjects();
App.closeProjects = () => FolioOperational.closeProjects();
App.openProject = id => FolioOperational.openProject(id);
App.downloadProject = id => FolioOperational.downloadProject(id);
App.deleteProject = id => FolioOperational.deleteProject(id);
App.clearProjects = () => FolioOperational.clearProjects();
App.openImageEditor = () => FolioOperational.openImageEditor();
App.openEditor = () => FolioOperational.openImageEditor();

document.addEventListener('DOMContentLoaded', () => FolioOperational.init());
