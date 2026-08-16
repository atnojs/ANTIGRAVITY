(() => {
  'use strict';

  const history = new HistoryManager('prompt_copilot_premium');
  const state = {
    items: [],
    currentRecord: null,
    isGenerating: false,
    detectedMode: 'copilot',
    selectedTaskType: 'auto'
  };

  // ── DOM refs ──
  const E = {
    landingPanel: document.getElementById('landingPanel'),
    landingCopilot: document.getElementById('landingCopilot'),
    landingImprover: document.getElementById('landingImprover'),
    inputPanel: document.getElementById('inputPanel'),
    detectionBadge: document.getElementById('detectionBadge'),
    detectionText: document.getElementById('detectionText'),
    switchModeBtn: document.getElementById('switchModeBtn'),
    stepEyebrow: document.getElementById('stepEyebrow'),
    inputTitle: document.getElementById('inputTitle'),
    inputHint: document.getElementById('inputHint'),
    requestLabel: document.getElementById('requestLabel'),
    userRequest: document.getElementById('userRequest'),
    requestError: document.getElementById('requestError'),
    charCounter: document.getElementById('charCounter'),
    taskTypeRow: document.getElementById('taskTypeRow'),
    quickExamples: document.getElementById('quickExamples'),
    targetTool: document.getElementById('targetTool'),
    depth: document.getElementById('depth'),
    audience: document.getElementById('audience'),
    desiredFormat: document.getElementById('desiredFormat'),
    constraints: document.getElementById('constraints'),
    context: document.getElementById('context'),
    referenceFile: document.getElementById('referenceFile'),
    generateBtn: document.getElementById('generateBtn'),
    generateBtnText: document.getElementById('generateBtnText'),
    promptForm: document.getElementById('promptForm'),
    resultPanel: document.getElementById('resultPanel'),
    finalPrompt: document.getElementById('finalPrompt'),
    resultMeta: document.getElementById('resultMeta'),
    qualityScore: document.getElementById('qualityScore'),
    scoreLabel: document.getElementById('scoreLabel'),
    scoreRing: document.getElementById('scoreRing'),
    metricsGrid: document.getElementById('metricsGrid'),
    comparisonPanel: document.getElementById('comparisonPanel'),
    originalContent: document.getElementById('originalContent'),
    improvedContent: document.getElementById('improvedContent'),
    changesContent: document.getElementById('changesContent'),
    assumptionsContent: document.getElementById('assumptionsContent'),
    validationContent: document.getElementById('validationContent'),
    copyPromptBtn: document.getElementById('copyPromptBtn'),
    downloadPromptBtn: document.getElementById('downloadPromptBtn'),
    saveEditedBtn: document.getElementById('saveEditedBtn'),
    resultStatus: document.getElementById('resultStatus'),
    historySearch: document.getElementById('historySearch'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    historyStatus: document.getElementById('historyStatus'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    helpDialog: document.getElementById('helpDialog'),
    helpBtn: document.getElementById('helpBtn'),
    resetBtn: document.getElementById('resetBtn'),
    overlay: document.getElementById('aiOverlay'),
    overlayStatus: document.getElementById('overlayStatus'),
    toastRegion: document.getElementById('toastRegion'),
  };

  const modeLabels = { copilot: 'Copiloto (crear desde cero)', improver: 'Mejorador profesional' };
  const metricLabels = {
    claridad: 'Claridad', contexto: 'Contexto', restricciones: 'Restricciones',
    formato: 'Formato', verificacion: 'Verificación'
  };

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID().replaceAll('-', '');
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }

  function updateCounter() {
    E.charCounter.textContent = `${E.userRequest.value.length.toLocaleString('es-ES')} / 12.000`;
  }

  function setBusy(isBusy, status = 'Procesando solicitud...') {
    state.isGenerating = isBusy;
    E.generateBtn.disabled = isBusy;
    E.overlayStatus.textContent = status;
    E.overlay.hidden = !isBusy;
    document.body.style.overflow = isBusy ? 'hidden' : '';
    E.promptForm.setAttribute('aria-busy', String(isBusy));
  }

  function toast(message, type = 'success') {
    const node = document.createElement('div');
    node.className = `toast${type === 'error' ? ' is-error' : ''}`;
    node.textContent = message;
    E.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 3800);
  }

  function emptyList(container, msg) {
    container.replaceChildren();
    const p = document.createElement('p');
    p.textContent = msg;
    container.appendChild(p);
  }

  function textList(container, items, emptyMessage) {
    container.replaceChildren();
    if (!Array.isArray(items) || items.length === 0) {
      emptyList(container, emptyMessage);
      return;
    }
    const ul = document.createElement('ul');
    items.forEach((item) => { const li = document.createElement('li'); li.textContent = item; ul.appendChild(li); });
    container.appendChild(ul);
  }

  function scoreLabel(score) {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Muy bueno';
    if (score >= 70) return 'Bueno';
    if (score >= 55) return 'Mejorable';
    return 'Incompleto';
  }

  function renderMetrics(metrics = {}) {
    E.metricsGrid.replaceChildren();
    Object.entries(metricLabels).forEach(([key, label]) => {
      const value = Math.max(0, Math.min(100, Number(metrics[key]) || 0));
      const card = document.createElement('article');
      card.className = 'metric-card';
      card.style.setProperty('--metric-value', `${value}%`);
      const hdr = document.createElement('header');
      const nm = document.createElement('span');
      const sc = document.createElement('strong');
      nm.textContent = label;
      sc.textContent = String(value);
      hdr.append(nm, sc);
      const track = document.createElement('div');
      track.className = 'metric-track';
      const fill = document.createElement('span');
      track.appendChild(fill);
      card.append(hdr, track);
      E.metricsGrid.appendChild(card);
    });
  }

  function activateTab(paneId) {
    document.querySelectorAll('.tab-button').forEach((b) => {
      const on = b.dataset.tab === paneId;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.tab-pane').forEach((p) => {
      const on = p.id === paneId;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
  }

  function renderResult(record, scroll = true) {
    state.currentRecord = record;
    E.resultPanel.hidden = false;
    E.finalPrompt.value = record.prompt || '';
    E.comparisonPanel.hidden = true;

    const model = record.meta?.resolvedModel ? ` · Modelo: ${record.meta.resolvedModel}` : '';
    E.resultMeta.textContent = `${modeLabels[record.mode] || 'Modo profesional'}${model}`;

    const score = Math.max(0, Math.min(100, Number(record.score) || 0));
    E.qualityScore.textContent = String(score);
    E.scoreLabel.textContent = scoreLabel(score);
    E.scoreRing.style.setProperty('--score-angle', `${score * 3.6}deg`);

    renderMetrics(record.metrics);

    // Comparison in improver mode
    if (record.mode === 'improver' && record.original) {
      E.comparisonPanel.hidden = false;
      E.originalContent.textContent = record.original;
      E.improvedContent.textContent = record.prompt;
    }

    textList(E.changesContent, record.changes, 'El modelo no detalló los cambios aplicados.');
    textList(E.assumptionsContent, record.assumptions, 'No se utilizaron supuestos relevantes.');
    textList(E.validationContent, record.validation, 'No se añadieron comprobaciones específicas.');
    activateTab('promptPane');
    E.resultStatus.textContent = '';

    if (scroll) E.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── HISTORY ──
  function itemMatches(item, q) {
    if (!q) return true;
    const h = `${item.title || ''} ${item.original || ''} ${item.prompt || ''}`.toLocaleLowerCase('es');
    return h.includes(q);
  }

  function renderHistory() {
    const q = E.historySearch.value.trim().toLocaleLowerCase('es');
    const filtered = state.items.filter((i) => itemMatches(i, q));
    E.historyList.replaceChildren();
    E.historyEmpty.hidden = filtered.length > 0;

    filtered.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'history-item';
      article.setAttribute('role', 'listitem');
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'history-open';
      openBtn.dataset.id = item.id;
      const t = document.createElement('strong');
      t.textContent = item.title || 'Prompt profesional';
      const sn = document.createElement('span');
      sn.textContent = item.original || item.prompt || '';
      const mt = document.createElement('small');
      const date = item.updatedAt || item.createdAt;
      const fmt = date ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)) : '';
      mt.textContent = `${modeLabels[item.mode] || 'Prompt'} · ${item.score || 0}/100${fmt ? ` · ${fmt}` : ''}`;
      openBtn.append(t, sn, mt);
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'history-delete';
      delBtn.dataset.id = item.id;
      delBtn.setAttribute('aria-label', `Eliminar ${item.title || 'prompt'}`);
      delBtn.textContent = '×';
      article.append(openBtn, delBtn);
      E.historyList.appendChild(article);
    });
  }

  async function loadHistory() {
    E.historyStatus.textContent = 'Cargando historial...';
    try {
      state.items = await history.load();
      renderHistory();
      E.historyStatus.textContent = state.items.length ? `${state.items.length} prompts guardados` : '';
    } catch (err) {
      E.historyStatus.textContent = err.message;
      toast('No se pudo cargar el historial del servidor.', 'error');
    }
  }

  // ── MODE MANAGEMENT ──
  function detectFromText(text) {
    if (!text.trim()) return 'copilot';
    const lower = text.toLocaleLowerCase('es');
    const improverSignals = [
      'mejora este prompt', 'mejorar este prompt', 'optimiza este prompt',
      'corrige este prompt', 'reescribe este prompt', 'profesionaliza este prompt',
      'haz más claro este prompt', 'revisa este prompt', 'prompt actual:', 'prompt final',
      'prompt optimizado'
    ];
    for (const s of improverSignals) {
      if (lower.includes(s)) return 'improver';
    }
    const hasBulletSections = /(^|\n)\s*[-#*]\s+/.test(text);
    const bracketSectionCount = (text.match(/(^|\n)\s*\[[^\]\n]{2,60}\]\s*:/g) || []).length;
    const hasBracketSections = bracketSectionCount >= 2;
    const hasPromptHeadings = /(^|\n)\s*(objetivo|contexto|requisitos|restricciones|formato|criterios de aceptación|prompt final)\s*:/i.test(text);
    const looksStructured = text.split('\n').length >= 5 && (hasBulletSections || hasBracketSections || hasPromptHeadings);
    return looksStructured ? 'improver' : 'copilot';
  }

  function applyMode(mode) {
    state.detectedMode = mode;
    const isImprover = mode === 'improver';

    // Detection badge
    E.detectionBadge.hidden = false;
    E.detectionText.textContent = isImprover ? 'Detectado: Mejorador' : 'Detectado: Copiloto';
    E.switchModeBtn.textContent = isImprover ? 'Cambiar a Copiloto' : 'Cambiar a Mejorador';

    // Labels
    E.stepEyebrow.textContent = 'Paso 1';
    E.inputTitle.textContent = isImprover ? 'Pega el prompt que quieres mejorar' : 'Cuéntame qué necesitas';
    E.inputHint.textContent = isImprover
      ? 'Pega aquí tu prompt actual. El Mejorador conservará tu intención y optimizará estructura, precisión y formato.'
      : 'Escríbelo como se lo explicarías a un compañero. No necesitas saber de inteligencia artificial.';
    E.requestLabel.textContent = isImprover ? 'Tu prompt actual' : 'Tu idea';
    E.userRequest.placeholder = isImprover
      ? 'Pega aquí el prompt que quieres mejorar...'
      : 'Ejemplo: Quiero una app sencilla para organizar pedidos de camisetas personalizadas y enviar el resumen por WhatsApp.';

    // Generate button
    E.generateBtnText.textContent = isImprover ? 'Mejorar prompt' : 'Crear prompt premium';

    // Task type row hidden in improver mode
    E.taskTypeRow.hidden = isImprover;

    // Change examples based on mode
    updateExamples(isImprover);
  }

  function updateExamples(isImprover) {
    E.quickExamples.replaceChildren();
    const examples = isImprover
      ? [
          { label: 'Prompt de imagen', text: 'Mejora este prompt: crea una imagen publicitaria de una sudadera personalizada con aspecto profesional.' },
          { label: 'Prompt técnico', text: 'Mejora este prompt: actúa como un desarrollador sénior. Revisa este código y sugiere mejoras de rendimiento y seguridad. El código es: [pegar código].' },
          { label: 'Email marketing', text: 'Mejora este prompt: redacta un email para clientes anunciando el lanzamiento de una nueva colección de verano, tono cercano pero profesional, con un descuento del 15% por tiempo limitado.' },
          { label: 'Investigación', text: 'Mejora este prompt: investiga sobre energías renovables en 2026 y compáralas con datos de 2020. Cita fuentes y separa hechos de opiniones.' },
        ]
      : [
          { label: 'App de pedidos', text: 'Quiero crear una app sencilla para organizar pedidos de productos personalizados, con clientes, estado del pedido, importes y envío del resumen por WhatsApp.' },
          { label: 'Investigación', text: 'Necesito investigar qué modelo de inteligencia artificial es más barato para analizar imágenes y devolver un JSON fiable.' },
          { label: 'Asistente legal', text: 'Configura un asistente que me ayude a revisar contratos de alquiler, señalando cláusulas abusivas y explicando cada punto en lenguaje claro.' },
          { label: 'Email marketing', text: 'Redacta un email para clientes anunciando el lanzamiento de una nueva colección de verano, tono cercano pero profesional, con un descuento del 15% por tiempo limitado.' },
        ];

    examples.forEach((ex) => {
      const btn = document.createElement('button');
      btn.className = 'example-chip';
      btn.type = 'button';
      btn.dataset.example = ex.text;
      btn.textContent = ex.label;
      btn.addEventListener('click', () => {
        E.userRequest.value = ex.text;
        updateCounter();
        E.userRequest.focus();
      });
      E.quickExamples.appendChild(btn);
    });
  }

  function switchMode() {
    const newMode = state.detectedMode === 'improver' ? 'copilot' : 'improver';
    applyMode(newMode);
  }

  function selectMode(mode) {
    // From landing: hide landing, show input
    E.landingPanel.hidden = true;
    E.inputPanel.hidden = false;
    applyMode(mode);
    E.userRequest.focus();
  }

  // ── TASK TYPE CHIPS ──
  function selectTaskType(type) {
    state.selectedTaskType = type;
    document.querySelectorAll('.task-chip').forEach((chip) => {
      const on = chip.dataset.type === type;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-checked', String(on));
    });
  }

  // ── FORM PAYLOAD ──
  function formPayload() {
    return {
      action: 'generate',
      mode: state.detectedMode,
      taskType: state.selectedTaskType,
      userRequest: E.userRequest.value.trim(),
      targetTool: E.targetTool.value,
      depth: E.depth.value,
      audience: E.audience.value.trim(),
      desiredFormat: E.desiredFormat.value.trim(),
      constraints: E.constraints.value.trim(),
      context: E.context.value.trim(),
    };
  }

  function validateRequest(payload) {
    E.requestError.textContent = '';
    if (payload.userRequest.length < 10) {
      E.requestError.textContent = 'Escribe al menos 10 caracteres para explicar lo que necesitas.';
      E.userRequest.focus();
      return false;
    }
    return true;
  }

  // ── GENERATE ──
  async function generatePrompt(event) {
    event.preventDefault();
    if (state.isGenerating) return;

    const payload = formPayload();
    if (!validateRequest(payload)) return;

    setBusy(true, state.detectedMode === 'improver' ? 'Aplicando el Mejorador...' : 'Aplicando el Método Copiloto...');
    E.resultStatus.textContent = '';

    try {
      const response = await fetch('proxy.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(payload),
      });

      let data;
      try { data = await response.json(); }
      catch { throw new Error('El servidor devolvió una respuesta no válida.'); }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo generar el prompt.');
      }

      setBusy(true, 'Guardando el resultado...');
      const result = data.result;
      const record = {
        id: createId(),
        title: result.title || 'Prompt profesional',
        original: payload.userRequest,
        prompt: result.prompt_final || '',
        mode: result.detected_mode || state.detectedMode,
        score: result.score || 0,
        metrics: result.metrics || {},
        changes: result.changes || [],
        assumptions: result.assumptions || [],
        validation: result.validation || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meta: {
          taskType: payload.taskType,
          targetTool: payload.targetTool,
          resolvedModel: data.meta?.resolved_model || '',
        }
      };

      renderResult(record, false);

      try {
        await history.save(record);
        state.items = history.items;
        renderHistory();
        E.resultStatus.textContent = 'Resultado guardado correctamente en el historial del servidor.';
      } catch (histErr) {
        E.resultStatus.textContent = `El prompt se generó, pero no se guardó: ${histErr.message}`;
        toast('Prompt generado pero el historial no pudo guardarse.', 'error');
      }

      E.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(state.detectedMode === 'improver' ? 'Prompt mejorado correctamente.' : 'Prompt premium creado correctamente.');
    } catch (err) {
      E.requestError.textContent = err.message;
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // ── SAVE EDITED ──
  async function saveEditedPrompt() {
    if (!state.currentRecord) return;
    const prompt = E.finalPrompt.value.trim();
    if (!prompt) { toast('No se puede guardar un prompt vacío.', 'error'); return; }
    const updated = { ...state.currentRecord, prompt, updatedAt: new Date().toISOString() };
    E.saveEditedBtn.disabled = true;
    E.resultStatus.textContent = 'Guardando cambios...';
    try {
      await history.save(updated);
      state.items = history.items;
      state.currentRecord = updated;
      renderHistory();
      E.resultStatus.textContent = 'Cambios guardados correctamente.';
      toast('Cambios guardados.');
    } catch (err) {
      E.resultStatus.textContent = `No se pudo guardar: ${err.message}`;
      toast(err.message, 'error');
    } finally {
      E.saveEditedBtn.disabled = false;
    }
  }

  // ── COPY / DOWNLOAD ──
  async function copyPrompt() {
    const text = E.finalPrompt.value.trim();
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast('Prompt copiado al portapapeles.'); }
    catch { E.finalPrompt.select(); document.execCommand('copy'); toast('Prompt copiado al portapapeles.'); }
  }

  function downloadPrompt() {
    if (!state.currentRecord) return;
    const rec = state.currentRecord;
    const sects = [`# ${rec.title || 'Prompt profesional'}`, '', '## Prompt final', '', E.finalPrompt.value.trim()];
    if (rec.changes?.length) sects.push('', '## Mejoras aplicadas', '', ...rec.changes.map((c) => `- ${c}`));
    if (rec.assumptions?.length) sects.push('', '## Supuestos y pendientes', '', ...rec.assumptions.map((a) => `- ${a}`));
    if (rec.validation?.length) sects.push('', '## Validación', '', ...rec.validation.map((v) => `- ${v}`));
    const blob = new Blob([sects.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (rec.title || 'prompt-profesional').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    a.href = url; a.download = `${safe || 'prompt-profesional'}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ── RESET ──
  function resetWorkspace() {
    if (state.isGenerating) return;
    E.userRequest.value = '';
    updateCounter();
    E.requestError.textContent = '';
    E.resultPanel.hidden = true;
    E.finalPrompt.value = '';
    state.currentRecord = null;
    E.comparisonPanel.hidden = true;

    // Show landing again
    E.landingPanel.hidden = false;
    E.inputPanel.hidden = true;
    E.detectionBadge.hidden = true;

    // Reset task type
    selectTaskType('auto');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── FILE IMPORT ──
  async function importReferenceFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) { E.referenceFile.value = ''; toast('El archivo supera el límite de 1 MB.', 'error'); return; }
    const allowed = ['text/plain', 'text/markdown', 'application/json', 'text/csv', ''];
    if (!allowed.includes(file.type)) { E.referenceFile.value = ''; toast('Solo TXT, MD, JSON o CSV.', 'error'); return; }
    try {
      const content = await file.text();
      const prefix = E.context.value.trim() ? `${E.context.value.trim()}\n\n` : '';
      E.context.value = `${prefix}CONTENIDO IMPORTADO DE ${file.name}:\n${content}`.slice(0, 5000);
      toast('Archivo importado como contexto adicional.');
    } catch { toast('No se pudo leer el archivo.', 'error'); }
  }

  // ── HISTORY: load item back into editor for rework ──
  function loadHistoryItem(item) {
    // Populate the textarea with the original request
    E.userRequest.value = item.original || '';
    updateCounter();

    // Set the mode to match the saved item
    const mode = item.mode || state.detectedMode;
    selectMode(mode);

    // Show result panel with the saved prompt
    renderResult(item, false);

    // Focus the textarea so user can start editing immediately
    E.userRequest.focus();

    toast('Prompt cargado. Puedes editarlo y volver a generar.');
  }

  // ── HISTORY ITEM DELETE ──
  async function deleteHistoryItem(id) {
    try {
      await history.delete(id);
      state.items = history.items;
      renderHistory();
      if (state.currentRecord?.id === id) { E.resultPanel.hidden = true; state.currentRecord = null; }
      toast('Prompt eliminado del historial.');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function clearHistory() {
    if (!state.items.length) return;
    if (!window.confirm('¿Quieres eliminar todo el historial? Esta acción no se puede deshacer.')) return;
    try {
      await history.clear();
      state.items = [];
      renderHistory();
      E.resultPanel.hidden = true;
      state.currentRecord = null;
      E.historyStatus.textContent = '';
      toast('Historial eliminado.');
    } catch (err) { toast(err.message, 'error'); }
  }

  // ── HEALTH CHECK ──
  async function checkService() {
    try {
      const resp = await fetch('proxy.php', { cache: 'no-store' });
      if (!resp.ok) {
        let msg = 'El servidor no está disponible.';
        try { const d = await resp.json(); msg = d.error || msg; } catch {}
        toast(`Error del servidor: ${msg}`, 'error');
        return;
      }
      const data = await resp.json();
      if (data.ok && !data.configured) {
        E.requestError.textContent = data.message || 'Falta configurar la clave R de OpenRouter en el servidor.';
        toast(data.message || 'API no configurada.', 'error');
      } else if (!data.ok) {
        toast(data.error || 'Error inesperado del servidor.', 'error');
      }
    } catch {
      toast('No se pudo contactar con proxy.php. ¿Está la app servida desde un servidor con PHP?', 'error');
    }
  }

  // ── BIND EVENTS ──
  function bindEvents() {
    // Landing
    E.landingCopilot.addEventListener('click', () => selectMode('copilot'));
    E.landingImprover.addEventListener('click', () => selectMode('improver'));

    // Switch mode button
    E.switchModeBtn.addEventListener('click', switchMode);

    // Task type chips
    document.querySelectorAll('.task-chip').forEach((chip) => {
      chip.addEventListener('click', () => selectTaskType(chip.dataset.type));
    });

    // Auto-detect on input blur (only if landing hasn't been used yet)
    E.userRequest.addEventListener('input', () => {
      updateCounter();
      // Auto-detect while typing if in auto mode
      const detected = detectFromText(E.userRequest.value);
      if (detected !== state.detectedMode) {
        applyMode(detected);
      }
    });

    // Tabs
    document.querySelectorAll('.tab-button').forEach((b) => {
      b.addEventListener('click', () => activateTab(b.dataset.tab));
    });

    // Form
    E.promptForm.addEventListener('submit', generatePrompt);
    E.copyPromptBtn.addEventListener('click', copyPrompt);
    E.downloadPromptBtn.addEventListener('click', downloadPrompt);
    E.saveEditedBtn.addEventListener('click', saveEditedPrompt);
    E.resetBtn.addEventListener('click', resetWorkspace);
    E.historySearch.addEventListener('input', renderHistory);
    E.clearHistoryBtn.addEventListener('click', clearHistory);
    E.referenceFile.addEventListener('change', () => importReferenceFile(E.referenceFile.files?.[0]));
    E.helpBtn.addEventListener('click', () => E.helpDialog.showModal());

    // History list delegation — click loads item into editor for rework
    E.historyList.addEventListener('click', (e) => {
      const openBtn = e.target.closest('.history-open');
      const delBtn = e.target.closest('.history-delete');
      if (openBtn) {
        const item = state.items.find((c) => c.id === openBtn.dataset.id);
        if (item) loadHistoryItem(item);
      }
      if (delBtn) deleteHistoryItem(delBtn.dataset.id);
    });
  }

  // ── INIT ──
  async function init() {
    bindEvents();
    updateCounter();
    selectTaskType('auto');
    await Promise.allSettled([loadHistory(), checkService()]);
  }

  init();
})();
