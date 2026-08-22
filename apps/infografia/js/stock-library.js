/* Biblioteca de stock, personalización visual y selección previa a la IA. */
const FolioStock = {
  family: 'all',
  selectedTemplateId: null,

  init() {
    this.updateCount();
    ['finish','palette','typeface','density'].forEach(id => {
      const field = document.getElementById(`visual-${id}`);
      if (field) field.addEventListener('change', () => App.saveDraft());
    });
  },

  updateCount() {
    document.querySelectorAll('[data-stock-count]').forEach(node => { node.textContent = String(STOCK_TEMPLATES.length); });
  },

  getSettings() {
    return {
      finish: document.getElementById('visual-finish')?.value || 'clean',
      palette: document.getElementById('visual-palette')?.value || 'template',
      typeface: document.getElementById('visual-typeface')?.value || 'editorial',
      density: document.getElementById('visual-density')?.value || 'balanced'
    };
  },

  setSettings(settings = {}) {
    Object.entries(settings).forEach(([key,value]) => {
      const field = document.getElementById(`visual-${key}`);
      if (field && [...field.options].some(option => option.value === value)) field.value = value;
    });
  },

  resolveStyle(style) {
    const settings = this.getSettings();
    const resolved = { ...style };
    resolved._design = settings;
    const palettes = {
      vibrant:['#241f43','#ff625b','#ffc857','#2ec4b6','#f7f3e8'],
      pastel:['#f4eadf','#d9999b','#9fc5c1','#e6c57a','#514d55'],
      dark:['#101622','#f5f7ff','#52d6c8','#ffb657','#8e78ff'],
      contrast:['#050505','#ffffff','#ffe600','#00d6ff','#ff4057'],
      earth:['#eee2c8','#65513d','#b96f4d','#6c8b6c','#d3ac61']
    };
    const palette = palettes[settings.palette];
    if (palette) [resolved._c1,resolved._c2,resolved._c3,resolved._c4,resolved._c5] = palette;
    return resolved;
  },

  promptDescription() {
    const settings = this.getSettings();
    const labels = {
      finish:{clean:'limpio y vectorial',illustrated:'ilustrado con metáforas visuales',doodle:'dibujado a mano',collage:'collage editorial',threeD:'volúmenes 3D suaves'},
      palette:{template:'paleta de la plantilla',vibrant:'colores vibrantes',pastel:'tonos pastel',dark:'modo oscuro',contrast:'alto contraste',earth:'tonos tierra'},
      typeface:{editorial:'tipografía editorial',geometric:'tipografía geométrica',friendly:'tipografía amable y redondeada',technical:'tipografía técnica'},
      density:{airy:'muy sintético y con aire',balanced:'densidad equilibrada',detailed:'detallado pero escaneable'}
    };
    return [labels.finish[settings.finish],labels.palette[settings.palette],labels.typeface[settings.typeface],labels.density[settings.density]].filter(Boolean).join(', ');
  },

  font(role = 'body') {
    const typeface = this.getSettings().typeface;
    const fonts = {
      editorial:{heading:'Fraunces, Georgia, serif',body:'DM Sans, Arial, sans-serif',mono:'DM Mono, monospace'},
      geometric:{heading:'DM Sans, Arial, sans-serif',body:'DM Sans, Arial, sans-serif',mono:'DM Mono, monospace'},
      friendly:{heading:'Trebuchet MS, Arial, sans-serif',body:'Trebuchet MS, Arial, sans-serif',mono:'DM Mono, monospace'},
      technical:{heading:'DM Mono, Consolas, monospace',body:'DM Mono, Consolas, monospace',mono:'DM Mono, Consolas, monospace'}
    };
    return (fonts[typeface] || fonts.editorial)[role];
  },

  open() {
    this.family = 'all';
    document.getElementById('template-search').value = '';
    this.renderFilters();
    this.render();
    document.getElementById('templates-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('templates-modal').hidden = true;
    document.body.style.overflow = '';
  },

  renderFilters() {
    const families = [{id:'all',name:'Todas'}, ...TEMPLATE_FAMILIES];
    document.getElementById('template-family-filters').innerHTML = families.map(family =>
      `<button class="library-filter ${this.family === family.id ? 'active' : ''}" type="button" onclick="FolioStock.filter('${family.id}')">${family.name}</button>`
    ).join('');
  },

  filter(family) {
    this.family = family;
    this.renderFilters();
    this.render();
  },

  render() {
    const query = document.getElementById('template-search')?.value.toLowerCase().trim() || '';
    const visible = STOCK_TEMPLATES.filter(template =>
      (this.family === 'all' || template.family === this.family) &&
      (!query || `${template.name} ${template.category} ${template.familyName}`.toLowerCase().includes(query))
    );
    document.getElementById('template-visible-count').textContent = String(visible.length);
    document.getElementById('stock-templates-grid').innerHTML = visible.map(template => this.card(template)).join('');
  },

  card(template) {
    const family = TEMPLATE_FAMILIES.find(item => item.id === template.family);
    const colors = family.colors;
    const blocks = Array.from({length:4},(_,index) => `<i style="--i:${index}"></i>`).join('');
    return `<article class="stock-card stock-${template.family} ${template.id === this.selectedTemplateId ? 'selected' : ''}">
      <button type="button" class="stock-select" onclick="FolioStock.select('${template.id}')">
        <span class="stock-preview stock-v${template.variant}" style="--p:${colors[0]};--ink:${colors[1]};--accent:${colors[2]}">
          <b>${this.escape(template.data.titulo)}</b><small>${this.escape(template.format)}</small><em class="stock-motif">${family.icon}</em><span class="stock-blocks">${blocks}</span>
        </span>
        <span class="stock-copy"><strong>${this.escape(template.name)}</strong><small>${this.escape(template.familyName)} · ${this.escape(template.category)}</small></span>
      </button>
      <button type="button" class="stock-preview-button" onclick="FolioStock.preview('${template.id}')">Vista previa</button>
    </article>`;
  },

  select(id) {
    const template = STOCK_TEMPLATES.find(item => item.id === id);
    if (!template) return;
    this.selectedTemplateId = id;
    App.selectedFormat = template.format;
    App.selectedStyleId = template.styleId;
    const style = App.getStyle(template.styleId);
    const folderMap = {infantil:'expressive',senior:'calm',corporativo:'system',artistico:'editorial',tecnico:'system'};
    App.activeFolder = STYLE_DETAILS[template.styleId]?.folder || folderMap[style.cat] || 'system';
    const folder = FOLDERS.find(item => item.id === App.activeFolder);
    if (folder && !folder.styles.includes(template.styleId)) folder.styles = [template.styleId,...folder.styles].slice(0,4);
    document.getElementById('topic').value = template.topic;
    document.getElementById('source').value = '';
    App.renderFormats();
    App.renderFolders();
    App.renderStyles();
    App.updateTopicCount();
    App.saveDraft();
    this.close();
    document.getElementById('builder').scrollIntoView({behavior:'smooth'});
    App.showToast(`${template.name} lista para personalizar.`);
  },

  preview(id) {
    const template = STOCK_TEMPLATES.find(item => item.id === id);
    if (!template) return;
    this.selectedTemplateId = id;
    const old = App.lastInfographic;
    const settings = this.getSettings();
    const style = this.resolveStyle(App.getStyle(template.styleId));
    App.lastInfographic = {data:JSON.parse(JSON.stringify(template.data)),style,styleId:template.styleId,format:template.format,aspect:'vertical',sourceLabel:'PLANTILLA EDITABLE',templateId:id,design:settings,projectId:`preview_${id}`};
    FolioOperational.renderResult();
    document.getElementById('result-subtitle').textContent = 'Vista previa · no consume IA';
    App.lastInfographic._previewOnly = true;
    App.lastInfographic._previous = old;
  },

  decorateBackground(c, settings = this.getSettings()) {
    const {ctx,width,height,accent,accent2,text} = c;
    ctx.save();
    if (settings.finish === 'doodle') {
      ctx.strokeStyle = App.withAlpha(text,.14); ctx.lineWidth = 2;
      for(let i=0;i<18;i++){ctx.beginPath();ctx.moveTo((i*97)%width,(i*61)%height);ctx.quadraticCurveTo((i*43)%width,height/2,(i*137)%width,(i*83)%height);ctx.stroke();}
    } else if (settings.finish === 'collage') {
      ctx.globalAlpha=.12; for(let i=0;i<9;i++){ctx.fillStyle=i%2?accent:accent2;ctx.save();ctx.translate((i*127)%width,(i*173)%height);ctx.rotate((i-4)*.11);ctx.fillRect(-55,-28,110,56);ctx.restore();}
    } else if (settings.finish === 'illustrated') {
      ctx.globalAlpha=.16; for(let i=0;i<12;i++){ctx.fillStyle=i%2?accent:accent2;ctx.beginPath();ctx.arc((i*113)%width,(i*149)%height,18+(i%3)*12,0,Math.PI*2);ctx.fill();}
    } else if (settings.finish === 'threeD') {
      const glow=ctx.createRadialGradient(width*.8,height*.2,0,width*.8,height*.2,width*.45);glow.addColorStop(0,App.withAlpha(accent,.3));glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    }
    ctx.restore();
  },

  escape(value) { return String(value || '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[character]); }
};

App.openTemplates = () => FolioStock.open();
App.closeTemplates = () => FolioStock.close();
App.renderTemplates = () => FolioStock.render();
document.addEventListener('DOMContentLoaded', () => FolioStock.init());
