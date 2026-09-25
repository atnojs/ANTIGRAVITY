/* Flujo de referencia visual: búsqueda externa, importación local y análisis con visión. */
const FolioReference = {
  imageData: '',
  fileName: '',
  schema: null,
  maxBytes: 10 * 1024 * 1024,

  init() {
    const input = document.getElementById('reference-file');
    const zone = document.getElementById('reference-dropzone');
    if (!input || !zone) return;
    input.addEventListener('change', event => this.loadFile(event.target.files?.[0]));
    ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, event => {
      event.preventDefault();
      zone.classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach(name => zone.addEventListener(name, event => {
      event.preventDefault();
      zone.classList.remove('dragging');
    }));
    zone.addEventListener('drop', event => this.loadFile(event.dataTransfer?.files?.[0]));
    document.addEventListener('paste', event => {
      const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'));
      if (item) this.loadFile(item.getAsFile());
    });
  },

  search() {
    const topic = document.getElementById('topic')?.value.trim();
    const query = topic ? `${topic.split(/[.!?]/)[0]} infografía` : 'infografías creativas ejemplos';
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
    App.showToast('Google Imágenes abierto. Después pega, arrastra o sube aquí la referencia elegida.');
  },

  loadFile(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      App.showToast('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > this.maxBytes) {
      App.showToast('La referencia supera 10 MB. Usa una imagen más ligera.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.imageData = String(reader.result || '');
      this.fileName = file.name || 'Imagen pegada';
      this.schema = null;
      this.render();
      App.saveDraft();
    };
    reader.onerror = () => App.showToast('No se pudo leer esa imagen.');
    reader.readAsDataURL(file);
  },

  async analyze() {
    if (!this.imageData) return;
    const button = document.getElementById('analyze-reference-button');
    button.disabled = true;
    button.innerHTML = '<span class="button-spark">✦</span> Analizando composición…';
    document.getElementById('reference-state').textContent = 'Analizando…';
    try {
      this.schema = await API.analyzeReference(this.imageData);
      this.render();
      App.saveDraft();
      App.showToast('Diseño analizado. Ya puedes generar tu infografía.');
    } catch (error) {
      console.error('[Folio] No se pudo analizar la referencia:', error);
      document.getElementById('reference-state').textContent = 'Error de análisis';
      App.showToast(error.message || 'No se pudo analizar la referencia.');
    } finally {
      button.disabled = false;
      button.innerHTML = '<span class="button-spark">✦</span> Analizar de nuevo';
    }
  },

  clear() {
    this.imageData = '';
    this.fileName = '';
    this.schema = null;
    const input = document.getElementById('reference-file');
    if (input) input.value = '';
    this.render();
    App.saveDraft();
  },

  render() {
    const hasImage = Boolean(this.imageData);
    const hasSchema = Boolean(this.schema);
    document.getElementById('reference-empty').hidden = hasImage;
    document.getElementById('reference-preview-wrap').hidden = !hasImage;
    document.getElementById('reference-actions').hidden = !hasImage;
    document.getElementById('reference-result').hidden = !hasSchema;
    document.getElementById('reference-state').textContent = hasSchema ? 'Diseño analizado' : hasImage ? 'Referencia cargada' : 'Sin referencia';
    if (hasImage) {
      document.getElementById('reference-preview').src = this.imageData;
      document.getElementById('reference-file-name').textContent = this.fileName;
      document.getElementById('reference-analysis-label').textContent = hasSchema ? 'Estructura lista para aplicar' : 'Pulsa Analizar diseño';
    }
    if (hasSchema) {
      document.getElementById('reference-layout').textContent = this.layoutLabel(this.schema.layout);
      document.getElementById('reference-summary').textContent = this.schema.summary || 'Composición, color y jerarquía visual detectados.';
      const palette = this.schema.palette || {};
      document.getElementById('reference-palette').innerHTML = ['background', 'primary', 'secondary', 'accent', 'text']
        .map(key => palette[key]).filter(Boolean)
        .map(color => `<i style="background:${this.safeColor(color)}" title="${this.safeColor(color)}"></i>`).join('');
    }
  },

  layoutLabel(layout) {
    return ({ split: 'Comparativa dividida', radial: 'Mapa radial', timeline: 'Cronología visual', process: 'Proceso ilustrado', dashboard: 'Panel de datos', editorial: 'Composición editorial', poster: 'Póster visual', grid: 'Retícula modular', comparison: 'Comparación visual', map: 'Mapa conceptual' })[layout] || 'Composición personalizada';
  },

  safeColor(color) {
    return /^#[0-9a-f]{6}$/i.test(String(color)) ? color : '#f76a4f';
  }
};

document.addEventListener('DOMContentLoaded', () => FolioReference.init());
