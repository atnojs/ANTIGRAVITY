// DATOS DE PLANTILLAS DIDÁCTICAS PREDETERMINADAS
const TEMPLATES_DATA = {
  process: {
    badge: "PROCESO PASO A PASO",
    title: "Las 4 Fases del Aprendizaje Activo",
    subtitle: "Cómo transformar la información en conocimiento aplicado y duradero",
    source: "Didáctica Contemporánea • 2026",
    items: [
      { icon: "1", title: "Exploración Inicial", desc: "Activación de conocimientos previos y formulación de preguntas detonantes." },
      { icon: "2", title: "Comprensión Teórica", desc: "Asimilación de conceptos clave mediante analogías visuales y esquemas." },
      { icon: "3", title: "Práctica Guiada", desc: "Resolución de casos y aplicación de habilidades en un entorno simulado." },
      { icon: "4", title: "Transferencia Real", desc: "Creación de proyectos propios y autoevaluación reflexiva." }
    ]
  },
  proscons: {
    badge: "ANÁLISIS COMPARATIVO",
    title: "Enfoque Tradicional vs. Aprendizaje Activo",
    subtitle: "Evaluación objetiva de metodologías educativas contemporáneas",
    source: "Informe de Innovación Pedagógica • 2026",
    pros: [
      "Mayor retención a largo plazo mediante la práctica",
      "Desarrollo de pensamiento crítico y autonomía",
      "Alta motivación y participación colaborativa"
    ],
    cons: [
      "Requiere mayor preparación previa de materiales",
      "Curva de adaptación inicial para los estudiantes",
      "Evaluación más compleja y multifactorial"
    ]
  },
  pyramid: {
    badge: "JERARQUÍA DIDÁCTICA",
    title: "Taxonomía del Pensamiento Crítico",
    subtitle: "Niveles cognitivos desde la asimilación básica hasta la creatividad",
    source: "Adaptación de la Taxonomía Cognitiva • 2026",
    items: [
      { title: "Crear & Sintetizar", desc: "Diseñar, construir e idear soluciones nuevas", width: "50%" },
      { title: "Evaluar & Juzgar", desc: "Criticar, debatir y fundamentar decisiones", width: "65%" },
      { title: "Analizar & Comparar", desc: "Desglosar conceptos y encontrar relaciones", width: "80%" },
      { title: "Comprender & Recordar", desc: "Explicar ideas y recuperar información clave", width: "95%" }
    ]
  },
  cycle: {
    badge: "CICLO CONTINUO",
    title: "Bucle del Método Científico",
    subtitle: "Iteración sistemática para el descubrimiento y validación de hipótesis",
    source: "Fundamentos del Método Experimental • 2026",
    items: [
      { icon: "🔍", title: "Observación", desc: "Identificación de fenómenos y patrones de interés." },
      { icon: "💡", title: "Hipótesis", desc: "Formulación de explicaciones lógicas tentativas." },
      { icon: "🧪", title: "Experimentación", desc: "Pruebas controladas y recolección rigurosa de datos." },
      { icon: "📢", title: "Conclusión", desc: "Análisis de resultados y comunicación de hallazgos." }
    ]
  },
  stats: {
    badge: "PANEL DE IMPACTO",
    title: "Efectividad del Aprendizaje Visual",
    subtitle: "Datos científicos sobre la asimilación de contenidos con soporte infográfico",
    source: "Estudios de Psicología Cognitiva • 2026",
    items: [
      { val: "60k+", title: "Velocidad de Procesamiento", desc: "El cerebro procesa estímulos visuales miles de veces más rápido que texto plano." },
      { val: "65%", title: "Retención a 3 Días", desc: "Retención promedio frente al 10-20% del formato puramente auditivo." },
      { val: "89%", title: "Engagement del Estudiante", desc: "Mayor atención reportada en lecciones con diagramas interactivos." }
    ]
  }
};

// ESTADO GLOBAL
let currentTemplate = 'process';
let currentZoom = 1;
let currentData = JSON.parse(JSON.stringify(TEMPLATES_DATA[currentTemplate]));

// ELEMENTOS DOM
const infographicCanvas = document.getElementById('infographicCanvas');
const canvasBody = document.getElementById('canvasBody');
const canvasBadge = document.getElementById('canvasBadge');
const canvasTitle = document.getElementById('canvasTitle');
const canvasSubtitle = document.getElementById('canvasSubtitle');
const canvasSource = document.getElementById('canvasSource');

const inputTitle = document.getElementById('inputTitle');
const inputSubtitle = document.getElementById('inputSubtitle');
const inputSource = document.getElementById('inputSource');
const elementsList = document.getElementById('elementsList');
const addItemBtn = document.getElementById('addItemBtn');

const formatSelect = document.getElementById('formatSelect');
const themeSelect = document.getElementById('themeSelect');
const exportBtn = document.getElementById('exportBtn');
const copyHtmlBtn = document.getElementById('copyHtmlBtn');

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomLevel = document.getElementById('zoomLevel');

// INICIALIZACIÓN
function init() {
  bindEvents();
  loadTemplate(currentTemplate);
}

function bindEvents() {
  // Cambio de plantillas
  document.querySelectorAll('.tpl-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const tpl = card.dataset.template;
      loadTemplate(tpl);
    });
  });

  // Sincronización de inputs laterales con el lienzo
  inputTitle.addEventListener('input', e => {
    currentData.title = e.target.value;
    canvasTitle.innerText = e.target.value;
  });

  inputSubtitle.addEventListener('input', e => {
    currentData.subtitle = e.target.value;
    canvasSubtitle.innerText = e.target.value;
  });

  inputSource.addEventListener('input', e => {
    currentData.source = e.target.value;
    canvasSource.innerText = e.target.value;
  });

  // Edición directa en el lienzo (contenteditable) hacia el estado
  canvasTitle.addEventListener('input', e => {
    currentData.title = e.target.innerText;
    inputTitle.value = e.target.innerText;
  });

  canvasSubtitle.addEventListener('input', e => {
    currentData.subtitle = e.target.innerText;
    inputSubtitle.value = e.target.innerText;
  });

  canvasSource.addEventListener('input', e => {
    currentData.source = e.target.innerText;
    inputSource.value = e.target.innerText;
  });

  // Formato y temas
  formatSelect.addEventListener('change', e => {
    infographicCanvas.className = `infographic-container format-${e.target.value}`;
  });

  themeSelect.addEventListener('change', e => {
    document.body.className = e.target.value;
  });

  // Zoom
  zoomInBtn.addEventListener('click', () => adjustZoom(0.1));
  zoomOutBtn.addEventListener('click', () => adjustZoom(-0.1));

  // Botón agregar elemento
  addItemBtn.addEventListener('click', () => {
    if (currentTemplate === 'process') {
      const nextNum = (currentData.items.length + 1).toString();
      currentData.items.push({ icon: nextNum, title: "Nueva Etapa", desc: "Descripción detallada del paso didáctico." });
    } else if (currentTemplate === 'proscons') {
      currentData.pros.push("Nuevo beneficio o argumento favorable");
    } else if (currentTemplate === 'pyramid') {
      currentData.items.push({ title: "Nuevo Nivel", desc: "Descripción del nivel cognitivo", width: "90%" });
    } else if (currentTemplate === 'cycle') {
      currentData.items.push({ icon: "📌", title: "Nueva Fase", desc: "Acción iterativa del bucle." });
    } else if (currentTemplate === 'stats') {
      currentData.items.push({ val: "100%", title: "Nueva Métrica", desc: "Impacto didáctico medido." });
    }
    renderCanvas();
    renderSidebarItems();
  });

  // Exportar PNG
  exportBtn.addEventListener('click', exportAsPng);

  // Copiar Código
  copyHtmlBtn.addEventListener('click', copyCanvasCode);
}

function adjustZoom(delta) {
  currentZoom = Math.max(0.5, Math.min(1.5, currentZoom + delta));
  infographicCanvas.style.transform = `scale(${currentZoom})`;
  infographicCanvas.style.transformOrigin = 'top center';
  zoomLevel.innerText = `${Math.round(currentZoom * 100)}%`;
}

function loadTemplate(tplName) {
  currentTemplate = tplName;
  currentData = JSON.parse(JSON.stringify(TEMPLATES_DATA[tplName]));

  inputTitle.value = currentData.title;
  inputSubtitle.value = currentData.subtitle;
  inputSource.value = currentData.source;

  canvasBadge.innerText = currentData.badge;
  canvasTitle.innerText = currentData.title;
  canvasSubtitle.innerText = currentData.subtitle;
  canvasSource.innerText = currentData.source;

  renderCanvas();
  renderSidebarItems();
}

// RENDERIZADO DEL LIENZO SEGÚN TIPO
function renderCanvas() {
  canvasBody.className = `info-body layout-${currentTemplate}`;
  canvasBody.innerHTML = '';

  if (currentTemplate === 'process') {
    currentData.items.forEach((item, index) => {
      const step = document.createElement('div');
      step.className = 'process-step';
      step.innerHTML = `
        <div class="step-circle">${item.icon || (index + 1)}</div>
        <div class="step-content">
          <div class="step-title" contenteditable="true" data-index="${index}">${item.title}</div>
          <div class="step-desc" contenteditable="true" data-index="${index}">${item.desc}</div>
        </div>
      `;
      // Listener para contenteditable
      step.querySelector('.step-title').addEventListener('input', e => {
        currentData.items[index].title = e.target.innerText;
        renderSidebarItems();
      });
      step.querySelector('.step-desc').addEventListener('input', e => {
        currentData.items[index].desc = e.target.innerText;
        renderSidebarItems();
      });
      canvasBody.appendChild(step);
    });
  } else if (currentTemplate === 'proscons') {
    const prosCol = document.createElement('div');
    prosCol.className = 'side-column side-pros';
    prosCol.innerHTML = `<div class="side-header"><span>✓</span> Ventajas Clave</div>`;

    currentData.pros.forEach((pro, index) => {
      const item = document.createElement('div');
      item.className = 'side-item';
      item.innerHTML = `<span>•</span> <div contenteditable="true">${pro}</div>`;
      item.querySelector('div').addEventListener('input', e => {
        currentData.pros[index] = e.target.innerText;
        renderSidebarItems();
      });
      prosCol.appendChild(item);
    });

    const consCol = document.createElement('div');
    consCol.className = 'side-column side-cons';
    consCol.innerHTML = `<div class="side-header"><span>✕</span> Desafíos / Contras</div>`;

    currentData.cons.forEach((con, index) => {
      const item = document.createElement('div');
      item.className = 'side-item';
      item.innerHTML = `<span>•</span> <div contenteditable="true">${con}</div>`;
      item.querySelector('div').addEventListener('input', e => {
        currentData.cons[index] = e.target.innerText;
        renderSidebarItems();
      });
      consCol.appendChild(item);
    });

    canvasBody.appendChild(prosCol);
    canvasBody.appendChild(consCol);
  } else if (currentTemplate === 'pyramid') {
    currentData.items.forEach((item, index) => {
      const tier = document.createElement('div');
      tier.className = 'pyramid-tier';
      tier.style.width = item.width || `${50 + index * 15}%`;
      tier.innerHTML = `
        <div class="tier-title" contenteditable="true">${item.title}</div>
        <div class="tier-desc" contenteditable="true">${item.desc}</div>
      `;
      tier.querySelector('.tier-title').addEventListener('input', e => {
        currentData.items[index].title = e.target.innerText;
        renderSidebarItems();
      });
      tier.querySelector('.tier-desc').addEventListener('input', e => {
        currentData.items[index].desc = e.target.innerText;
        renderSidebarItems();
      });
      canvasBody.appendChild(tier);
    });
  } else if (currentTemplate === 'cycle') {
    currentData.items.forEach((item, index) => {
      const node = document.createElement('div');
      node.className = 'cycle-node';
      node.innerHTML = `
        <div class="cycle-badge"><span>${item.icon || '✦'}</span> Etapa ${index + 1}</div>
        <div class="cycle-title" contenteditable="true">${item.title}</div>
        <div class="cycle-desc" contenteditable="true">${item.desc}</div>
      `;
      node.querySelector('.cycle-title').addEventListener('input', e => {
        currentData.items[index].title = e.target.innerText;
        renderSidebarItems();
      });
      node.querySelector('.cycle-desc').addEventListener('input', e => {
        currentData.items[index].desc = e.target.innerText;
        renderSidebarItems();
      });
      canvasBody.appendChild(node);
    });
  } else if (currentTemplate === 'stats') {
    currentData.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="stat-val" contenteditable="true">${item.val}</div>
        <div class="stat-title" contenteditable="true">${item.title}</div>
        <div class="stat-desc" contenteditable="true">${item.desc}</div>
      `;
      card.querySelector('.stat-val').addEventListener('input', e => {
        currentData.items[index].val = e.target.innerText;
        renderSidebarItems();
      });
      card.querySelector('.stat-title').addEventListener('input', e => {
        currentData.items[index].title = e.target.innerText;
        renderSidebarItems();
      });
      card.querySelector('.stat-desc').addEventListener('input', e => {
        currentData.items[index].desc = e.target.innerText;
        renderSidebarItems();
      });
      canvasBody.appendChild(card);
    });
  }
}

// RENDERIZADO DEL PANEL LATERAL DE EDICIÓN
function renderSidebarItems() {
  elementsList.innerHTML = '';

  if (currentTemplate === 'proscons') {
    // Lista de Pros
    currentData.pros.forEach((pro, idx) => {
      const box = document.createElement('div');
      box.className = 'element-edit-box';
      box.innerHTML = `
        <div class="element-edit-header">
          <span class="element-num" style="color:#10b981;">Ventaja #${idx + 1}</span>
          <button class="btn-del" title="Eliminar">🗑️</button>
        </div>
        <textarea class="edit-text">${pro}</textarea>
      `;
      box.querySelector('.edit-text').addEventListener('input', e => {
        currentData.pros[idx] = e.target.value;
        renderCanvas();
      });
      box.querySelector('.btn-del').addEventListener('click', () => {
        currentData.pros.splice(idx, 1);
        renderCanvas();
        renderSidebarItems();
      });
      elementsList.appendChild(box);
    });

    // Lista de Contras
    currentData.cons.forEach((con, idx) => {
      const box = document.createElement('div');
      box.className = 'element-edit-box';
      box.innerHTML = `
        <div class="element-edit-header">
          <span class="element-num" style="color:#ef4444;">Desafío #${idx + 1}</span>
          <button class="btn-del" title="Eliminar">🗑️</button>
        </div>
        <textarea class="edit-text">${con}</textarea>
      `;
      box.querySelector('.edit-text').addEventListener('input', e => {
        currentData.cons[idx] = e.target.value;
        renderCanvas();
      });
      box.querySelector('.btn-del').addEventListener('click', () => {
        currentData.cons.splice(idx, 1);
        renderCanvas();
        renderSidebarItems();
      });
      elementsList.appendChild(box);
    });
    return;
  }

  // Para plantillas basadas en items
  currentData.items.forEach((item, idx) => {
    const box = document.createElement('div');
    box.className = 'element-edit-box';
    box.innerHTML = `
      <div class="element-edit-header">
        <span class="element-num">Elemento #${idx + 1}</span>
        <button class="btn-del" title="Eliminar">🗑️</button>
      </div>
      ${item.val !== undefined ? `<input type="text" class="edit-val" placeholder="Cifra / Valor" value="${item.val}" />` : ''}
      <input type="text" class="edit-title" placeholder="Título" value="${item.title || ''}" />
      <textarea class="edit-desc" placeholder="Descripción">${item.desc || ''}</textarea>
    `;

    if (item.val !== undefined) {
      box.querySelector('.edit-val').addEventListener('input', e => {
        item.val = e.target.value;
        renderCanvas();
      });
    }

    box.querySelector('.edit-title').addEventListener('input', e => {
      item.title = e.target.value;
      renderCanvas();
    });

    box.querySelector('.edit-desc').addEventListener('input', e => {
      item.desc = e.target.value;
      renderCanvas();
    });

    box.querySelector('.btn-del').addEventListener('click', () => {
      currentData.items.splice(idx, 1);
      renderCanvas();
      renderSidebarItems();
    });

    elementsList.appendChild(box);
  });
}

// EXPORTACIÓN A PNG
async function exportAsPng() {
  exportBtn.disabled = true;
  exportBtn.innerHTML = '<span>⏳</span> Generando...';

  // Guardar zoom previo y resetear a 1 para captura nítida
  const prevTransform = infographicCanvas.style.transform;
  infographicCanvas.style.transform = 'none';

  try {
    const canvas = await html2canvas(infographicCanvas, {
      scale: 2, // 2x para resolución retina
      useCORS: true,
      backgroundColor: null
    });

    const link = document.createElement('a');
    link.download = `infografia-${currentTemplate}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('Error al generar la imagen: ' + err.message);
  } finally {
    infographicCanvas.style.transform = prevTransform;
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<span>📸</span> Descargar PNG';
  }
}

// COPIAR CÓDIGO HTML
function copyCanvasCode() {
  const code = infographicCanvas.outerHTML;
  navigator.clipboard.writeText(code).then(() => {
    const origText = copyHtmlBtn.innerHTML;
    copyHtmlBtn.innerHTML = '<span>✓</span> ¡Copiado!';
    setTimeout(() => {
      copyHtmlBtn.innerHTML = origText;
    }, 2000);
  }).catch(() => {
    alert('No se pudo copiar automáticamente.');
  });
}

// Arrancar app al cargar
document.addEventListener('DOMContentLoaded', init);
