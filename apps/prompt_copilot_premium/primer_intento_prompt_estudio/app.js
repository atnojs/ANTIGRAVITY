(() => {
  'use strict';

  const history = new HistoryManager('prompt_studio_premium');
  const state = {
    items: [],
    currentRecord: null,
    isGenerating: false
  };

  const elements = {
    form: document.getElementById('promptForm'),
    request: document.getElementById('userRequest'),
    requestError: document.getElementById('requestError'),
    inputHint: document.getElementById('inputHint'),
    charCounter: document.getElementById('charCounter'),
    targetTool: document.getElementById('targetTool'),
    depth: document.getElementById('depth'),
    outputMode: document.getElementById('outputMode'),
    qualityModel: document.getElementById('qualityModel'),
    audience: document.getElementById('audience'),
    desiredFormat: document.getElementById('desiredFormat'),
    constraints: document.getElementById('constraints'),
    context: document.getElementById('context'),
    referenceFile: document.getElementById('referenceFile'),
    generateBtn: document.getElementById('generateBtn'),
    newPromptBtn: document.getElementById('newPromptBtn'),
    resultPanel: document.getElementById('resultPanel'),
    finalPrompt: document.getElementById('finalPrompt'),
    resultMeta: document.getElementById('resultMeta'),
    qualityScore: document.getElementById('qualityScore'),
    scoreLabel: document.getElementById('scoreLabel'),
    scoreRing: document.getElementById('scoreRing'),
    metricsGrid: document.getElementById('metricsGrid'),
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
    openHelpBtn: document.getElementById('openHelpBtn'),
    overlay: document.getElementById('aiOverlay'),
    overlayStatus: document.getElementById('overlayStatus'),
    toastRegion: document.getElementById('toastRegion')
  };

  const modeLabels = {
    copilot: 'Método Copiloto',
    improver: 'Mejorador profesional'
  };

  const metricLabels = {
    claridad: 'Claridad',
    contexto: 'Contexto',
    restricciones: 'Restricciones',
    formato: 'Formato',
    verificacion: 'Verificación'
  };

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID().replaceAll('-', '');
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }

  function selectedMode() {
    return document.querySelector('input[name="mode"]:checked')?.value || 'auto';
  }

  function updateModeCards() {
    document.querySelectorAll('.mode-card').forEach((card) => {
      const input = card.querySelector('input');
      card.classList.toggle('is-selected', Boolean(input?.checked));
    });

    const mode = selectedMode();
    const content = {
      auto: {
        hint: 'Escríbelo como lo explicarías a otra persona. La app decidirá qué skill debe utilizar.',
        placeholder: 'Ejemplo: Quiero una app sencilla para organizar pedidos de camisetas personalizadas y enviar el resumen por WhatsApp.'
      },
      copilot: {
        hint: 'Describe tu idea, aunque todavía esté incompleta. Método Copiloto la convertirá en una petición profesional.',
        placeholder: 'Ejemplo: Quiero crear una herramienta para gestionar las reservas de un pequeño negocio.'
      },
      improver: {
        hint: 'Pega el prompt que ya utilizas. El Mejorador conservará su intención y corregirá estructura, precisión y formato.',
        placeholder: 'Pega aquí el prompt que quieres mejorar...'
      }
    }[mode];

    elements.inputHint.textContent = content.hint;
    elements.request.placeholder = content.placeholder;
  }

  function updateCounter() {
    elements.charCounter.textContent = `${elements.request.value.length.toLocaleString('es-ES')} / 12.000`;
  }

  function setBusy(isBusy, status = 'Procesando solicitud...') {
    state.isGenerating = isBusy;
    elements.generateBtn.disabled = isBusy;
    elements.newPromptBtn.disabled = isBusy;
    elements.overlayStatus.textContent = status;
    elements.overlay.hidden = !isBusy;
    document.body.style.overflow = isBusy ? 'hidden' : '';
    elements.form.setAttribute('aria-busy', String(isBusy));
  }

  function toast(message, type = 'success') {
    const node = document.createElement('div');
    node.className = `toast${type === 'error' ? ' is-error' : ''}`;
    node.textContent = message;
    elements.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 3800);
  }

  function textList(container, items, emptyMessage) {
    container.replaceChildren();
    if (!Array.isArray(items) || items.length === 0) {
      const paragraph = document.createElement('p');
      paragraph.textContent = emptyMessage;
      container.appendChild(paragraph);
      return;
    }

    const list = document.createElement('ul');
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  function scoreLabel(score) {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Muy bueno';
    if (score >= 70) return 'Bueno';
    if (score >= 55) return 'Mejorable';
    return 'Incompleto';
  }

  function renderMetrics(metrics = {}) {
    elements.metricsGrid.replaceChildren();
    Object.entries(metricLabels).forEach(([key, label]) => {
      const value = Math.max(0, Math.min(100, Number(metrics[key]) || 0));
      const card = document.createElement('article');
      card.className = 'metric-card';
      card.style.setProperty('--metric-value', `${value}%`);

      const header = document.createElement('header');
      const name = document.createElement('span');
      const score = document.createElement('strong');
      name.textContent = label;
      score.textContent = String(value);
      header.append(name, score);

      const track = document.createElement('div');
      track.className = 'metric-track';
      const fill = document.createElement('span');
      track.appendChild(fill);

      card.append(header, track);
      elements.metricsGrid.appendChild(card);
    });
  }

  function activateTab(paneId) {
    document.querySelectorAll('.tab-button').forEach((button) => {
      const active = button.dataset.tab === paneId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('.tab-pane').forEach((pane) => {
      const active = pane.id === paneId;
      pane.classList.toggle('is-active', active);
      pane.hidden = !active;
    });
  }

  function renderResult(record, scroll = true) {
    state.currentRecord = record;
    elements.resultPanel.hidden = false;
    elements.finalPrompt.value = record.prompt || '';

    const resolvedModel = record.meta?.resolvedModel ? ` · Modelo: ${record.meta.resolvedModel}` : '';
    elements.resultMeta.textContent = `${modeLabels[record.mode] || 'Modo profesional'}${resolvedModel}`;

    const score = Math.max(0, Math.min(100, Number(record.score) || 0));
    elements.qualityScore.textContent = String(score);
    elements.scoreLabel.textContent = scoreLabel(score);
    elements.scoreRing.style.setProperty('--score-angle', `${score * 3.6}deg`);

    renderMetrics(record.metrics);
    textList(elements.changesContent, record.changes, 'El modelo no añadió una explicación separada de los cambios.');
    textList(elements.assumptionsContent, record.assumptions, 'No se han utilizado supuestos relevantes.');
    textList(elements.validationContent, record.validation, 'No se añadieron comprobaciones específicas para este prompt.');
    activateTab('promptPane');
    elements.resultStatus.textContent = '';

    if (scroll) {
      elements.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function itemMatches(item, query) {
    if (!query) return true;
    const haystack = `${item.title || ''} ${item.original || ''} ${item.prompt || ''}`.toLocaleLowerCase('es');
    return haystack.includes(query);
  }

  function renderHistory() {
    const query = elements.historySearch.value.trim().toLocaleLowerCase('es');
    const filtered = state.items.filter((item) => itemMatches(item, query));
    elements.historyList.replaceChildren();
    elements.historyEmpty.hidden = filtered.length > 0;

    filtered.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'history-item';
      article.setAttribute('role', 'listitem');

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'history-open';
      openButton.dataset.id = item.id;

      const title = document.createElement('strong');
      title.textContent = item.title || 'Prompt profesional';
      const snippet = document.createElement('span');
      snippet.textContent = item.original || item.prompt || '';
      const meta = document.createElement('small');
      const date = item.updatedAt || item.createdAt;
      const formatted = date ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)) : '';
      meta.textContent = `${modeLabels[item.mode] || 'Prompt'} · ${item.score || 0}/100${formatted ? ` · ${formatted}` : ''}`;
      openButton.append(title, snippet, meta);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'history-delete';
      deleteButton.dataset.id = item.id;
      deleteButton.setAttribute('aria-label', `Eliminar ${item.title || 'prompt'}`);
      deleteButton.textContent = '×';

      article.append(openButton, deleteButton);
      elements.historyList.appendChild(article);
    });
  }

  async function loadHistory() {
    elements.historyStatus.textContent = 'Cargando historial...';
    try {
      state.items = await history.load();
      renderHistory();
      elements.historyStatus.textContent = state.items.length ? `${state.items.length} prompts guardados` : '';
    } catch (error) {
      elements.historyStatus.textContent = error.message;
      toast('No se pudo cargar el historial del servidor.', 'error');
    }
  }

  function formPayload() {
    return {
      action: 'generate',
      mode: selectedMode(),
      userRequest: elements.request.value.trim(),
      targetTool: elements.targetTool.value,
      depth: elements.depth.value,
      outputMode: elements.outputMode.value,
      qualityModel: elements.qualityModel.value,
      audience: elements.audience.value.trim(),
      desiredFormat: elements.desiredFormat.value.trim(),
      constraints: elements.constraints.value.trim(),
      context: elements.context.value.trim()
    };
  }

  function validateRequest(payload) {
    elements.requestError.textContent = '';
    if (payload.userRequest.length < 10) {
      elements.requestError.textContent = 'Escribe al menos 10 caracteres para explicar lo que necesitas.';
      elements.request.focus();
      return false;
    }
    return true;
  }

  async function generatePrompt(event) {
    event.preventDefault();
    if (state.isGenerating) return;

    const payload = formPayload();
    if (!validateRequest(payload)) return;

    setBusy(true, 'Aplicando la skill adecuada...');
    elements.resultStatus.textContent = '';

    try {
      const response = await fetch('proxy.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('El servidor devolvió una respuesta no válida.');
      }

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
        mode: result.detected_mode || data.meta?.detected_mode || 'copilot',
        score: result.score || 0,
        metrics: result.metrics || {},
        changes: result.changes || [],
        assumptions: result.assumptions || [],
        validation: result.validation || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meta: {
          targetTool: payload.targetTool,
          resolvedModel: data.meta?.resolved_model || data.meta?.requested_model || ''
        }
      };

      renderResult(record, false);

      try {
        await history.save(record);
        state.items = history.items;
        renderHistory();
        elements.resultStatus.textContent = 'Resultado guardado correctamente en el historial del servidor.';
      } catch (historyError) {
        elements.resultStatus.textContent = `El prompt se generó, pero no se guardó: ${historyError.message}`;
        toast('El prompt se generó, pero el historial no pudo guardarse.', 'error');
      }

      elements.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Prompt premium creado correctamente.');
    } catch (error) {
      elements.requestError.textContent = error.message;
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveEditedPrompt() {
    if (!state.currentRecord) return;
    const prompt = elements.finalPrompt.value.trim();
    if (!prompt) {
      toast('No se puede guardar un prompt vacío.', 'error');
      return;
    }

    const updated = {
      ...state.currentRecord,
      prompt,
      updatedAt: new Date().toISOString()
    };

    elements.saveEditedBtn.disabled = true;
    elements.resultStatus.textContent = 'Guardando cambios...';
    try {
      await history.save(updated);
      state.items = history.items;
      state.currentRecord = updated;
      renderHistory();
      elements.resultStatus.textContent = 'Cambios guardados correctamente.';
      toast('Cambios guardados.');
    } catch (error) {
      elements.resultStatus.textContent = `No se pudo guardar: ${error.message}`;
      toast(error.message, 'error');
    } finally {
      elements.saveEditedBtn.disabled = false;
    }
  }

  async function copyPrompt() {
    const text = elements.finalPrompt.value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('Prompt copiado al portapapeles.');
    } catch {
      elements.finalPrompt.select();
      document.execCommand('copy');
      toast('Prompt copiado al portapapeles.');
    }
  }

  function downloadPrompt() {
    if (!state.currentRecord) return;
    const record = state.currentRecord;
    const sections = [
      `# ${record.title || 'Prompt profesional'}`,
      '',
      '## Prompt final',
      '',
      elements.finalPrompt.value.trim(),
    ];

    if (record.changes?.length) {
      sections.push('', '## Mejoras aplicadas', '', ...record.changes.map((item) => `- ${item}`));
    }
    if (record.assumptions?.length) {
      sections.push('', '## Supuestos y pendientes', '', ...record.assumptions.map((item) => `- ${item}`));
    }
    if (record.validation?.length) {
      sections.push('', '## Validación', '', ...record.validation.map((item) => `- ${item}`));
    }

    const blob = new Blob([sections.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (record.title || 'prompt-profesional')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    link.href = url;
    link.download = `${safeName || 'prompt-profesional'}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetWorkspace() {
    if (state.isGenerating) return;
    elements.form.reset();
    document.querySelector('input[name="mode"][value="auto"]').checked = true;
    updateModeCards();
    updateCounter();
    elements.requestError.textContent = '';
    elements.resultPanel.hidden = true;
    elements.finalPrompt.value = '';
    state.currentRecord = null;
    elements.request.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function importReferenceFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      elements.referenceFile.value = '';
      toast('El archivo supera el límite de 1 MB.', 'error');
      return;
    }

    const allowed = ['text/plain', 'text/markdown', 'application/json', 'text/csv', ''];
    if (!allowed.includes(file.type)) {
      elements.referenceFile.value = '';
      toast('Solo se admiten archivos TXT, MD, JSON o CSV.', 'error');
      return;
    }

    try {
      const content = await file.text();
      const prefix = elements.context.value.trim() ? `${elements.context.value.trim()}\n\n` : '';
      elements.context.value = `${prefix}CONTENIDO IMPORTADO DE ${file.name}:\n${content}`.slice(0, 5000);
      toast('Archivo importado como contexto adicional.');
    } catch {
      toast('No se pudo leer el archivo seleccionado.', 'error');
    }
  }

  async function deleteHistoryItem(id) {
    try {
      await history.delete(id);
      state.items = history.items;
      renderHistory();
      if (state.currentRecord?.id === id) {
        elements.resultPanel.hidden = true;
        state.currentRecord = null;
      }
      toast('Prompt eliminado del historial.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function clearHistory() {
    if (!state.items.length) return;
    const confirmed = window.confirm('¿Quieres eliminar todo el historial? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      await history.clear();
      state.items = [];
      renderHistory();
      elements.resultPanel.hidden = true;
      state.currentRecord = null;
      elements.historyStatus.textContent = '';
      toast('Historial eliminado.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function checkService() {
    try {
      const response = await fetch('proxy.php', { cache: 'no-store' });
      if (!response.ok) {
        let errorMsg = 'El servidor no está disponible.';
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        toast(`Error del servidor: ${errorMsg}`, 'error');
        return;
      }
      const data = await response.json();
      if (data.ok && !data.configured) {
        elements.requestError.textContent = data.message || 'Falta configurar la clave R de OpenRouter en el servidor.';
        toast(data.message || 'API no configurada. Revisa config.php o la variable R en el servidor.', 'error');
      } else if (!data.ok) {
        toast(data.error || 'El servidor devolvió un error inesperado.', 'error');
      }
    } catch {
      toast('No se pudo contactar con proxy.php. ¿Está la app servida desde un servidor con PHP?', 'error');
    }
  }

  function bindEvents() {
    document.querySelectorAll('input[name="mode"]').forEach((input) => {
      input.addEventListener('change', updateModeCards);
    });

    document.querySelectorAll('.example-chip').forEach((button) => {
      button.addEventListener('click', () => {
        elements.request.value = button.dataset.example || '';
        updateCounter();
        elements.request.focus();
      });
    });

    document.querySelectorAll('.tab-button').forEach((button) => {
      button.addEventListener('click', () => activateTab(button.dataset.tab));
    });

    elements.form.addEventListener('submit', generatePrompt);
    elements.request.addEventListener('input', updateCounter);
    elements.newPromptBtn.addEventListener('click', resetWorkspace);
    elements.copyPromptBtn.addEventListener('click', copyPrompt);
    elements.downloadPromptBtn.addEventListener('click', downloadPrompt);
    elements.saveEditedBtn.addEventListener('click', saveEditedPrompt);
    elements.historySearch.addEventListener('input', renderHistory);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    elements.referenceFile.addEventListener('change', () => importReferenceFile(elements.referenceFile.files?.[0]));
    elements.openHelpBtn.addEventListener('click', () => elements.helpDialog.showModal());

    elements.historyList.addEventListener('click', (event) => {
      const openButton = event.target.closest('.history-open');
      const deleteButton = event.target.closest('.history-delete');
      if (openButton) {
        const item = state.items.find((candidate) => candidate.id === openButton.dataset.id);
        if (item) renderResult(item);
      }
      if (deleteButton) {
        deleteHistoryItem(deleteButton.dataset.id);
      }
    });
  }

  async function init() {
    bindEvents();
    updateModeCards();
    updateCounter();
    await Promise.allSettled([loadHistory(), checkService()]);
  }

  init();
})();
