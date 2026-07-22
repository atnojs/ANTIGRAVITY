/**
 * Academia de Agentes IA — app.js v4
 * Flujo: elegir plataforma → ver lecciones.
 * Soporte multi-agente con carga robusta de datos.
 */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== DOM REFS =====
  const platformSelect = $('#platform-select');
  const mainContent = $('#main-content');
  const lessonView = $('#lesson-view');
  const lessonsGrid = $('#lessons-grid');
  const searchInput = $('#search-input');
  const searchResults = $('#search-results');
  const levelToggles = $('#level-toggles');
  const progressBar = $('#progress-bar');
  const progressCount = $('#progress-count');
  const progressPercent = $('#progress-percent');
  const glossaryPanel = $('#glossary-panel');
  const glossaryToggleBtn = $('#glossary-toggle-btn');
  const backBtn = $('#back-btn');
  const changePlatformBtn = $('#change-platform-btn');
  const platformHeaderTitle = $('#platform-header-title');
  const lessonDetailContent = $('#lesson-detail-content');
  const loadingOverlay = $('#loading-overlay');

  // ===== STATE =====
  let currentPlatform = null;
  let currentLevel = 'all';
  let completedLessons = {};
  let historyManager = null;
  let glossaryVisible = false;

  // ===== DATA ACCESS (robusto) =====
  function getPlatformData() {
    if (!currentPlatform) return [];
    const cfg = PLATFORMS[currentPlatform];
    if (!cfg) return [];
    const data = window[cfg.dataVar];
    if (!Array.isArray(data)) {
      console.warn('[Academia] No se encontraron datos para', currentPlatform, 'var:', cfg.dataVar);
      return [];
    }
    return data;
  }

  function getGlossaryData() {
    if (!currentPlatform) return [];
    const cfg = PLATFORMS[currentPlatform];
    if (!cfg) return [];
    const data = window[cfg.glossaryVar];
    return Array.isArray(data) ? data : [];
  }

  function getCompletedKey() {
    return currentPlatform ? currentPlatform + '_completed' : '';
  }

  // ===== INIT =====
  function init() {
    // Mostrar solo los botones de plataforma al inicio
    platformSelect.classList.remove('hidden');
    mainContent.classList.add('hidden');
    lessonView.classList.add('hidden');

    try {
      historyManager = new HistoryManager('academia_agentes');
      loadProgress().then(() => {
        hideLoading();
      });
    } catch (err) {
      console.error('[Academia] Init error:', err);
      hideLoading();
    }
    bindEvents();
  }

  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      loadingOverlay.style.display = 'none';
    }
  }

  // ===== PROGRESS PERSISTENCE =====
  async function loadProgress() {
    try {
      await historyManager.load();
      const items = historyManager.getAll();
      for (const item of items) {
        if (item.type === 'academia_progress' && item.data) {
          for (const [key, ids] of Object.entries(item.data)) {
            if (!completedLessons[key]) completedLessons[key] = new Set();
            ids.forEach(id => completedLessons[key].add(id));
          }
        }
      }
    } catch (e) {
      console.warn('[Academia] Could not load progress:', e.message);
      try {
        const saved = localStorage.getItem('academia_progress');
        if (saved) {
          const data = JSON.parse(saved);
          for (const [key, ids] of Object.entries(data)) {
            completedLessons[key] = new Set(ids);
          }
        }
      } catch (_) {}
    }
  }

  async function saveProgress() {
    const data = {};
    for (const [key, ids] of Object.entries(completedLessons)) {
      data[key] = Array.from(ids);
    }
    try {
      await historyManager.save({
        type: 'academia_progress',
        data: data,
        id: 'academia_progress_main'
      });
    } catch (e) {
      console.warn('[Academia] Could not save to server:', e.message);
    }
    try {
      localStorage.setItem('academia_progress', JSON.stringify(data));
    } catch (_) {}
  }

  function isCompleted(lessonId) {
    const key = getCompletedKey();
    return completedLessons[key] ? completedLessons[key].has(lessonId) : false;
  }

  function getCompletedCount() {
    const key = getCompletedKey();
    return completedLessons[key] ? completedLessons[key].size : 0;
  }

  function toggleComplete(lessonId) {
    const key = getCompletedKey();
    if (!key) return;
    if (!completedLessons[key]) completedLessons[key] = new Set();
    if (completedLessons[key].has(lessonId)) {
      completedLessons[key].delete(lessonId);
    } else {
      completedLessons[key].add(lessonId);
    }
    saveProgress();
    updateProgressUI();
    refreshLessonCards();
  }

  // ===== PROGRESS UI =====
  function updateProgressUI() {
    const lessons = getPlatformData();
    const total = lessons.length;
    const done = getCompletedCount();
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressCount.textContent = `${done} / ${total} completadas`;
    progressPercent.textContent = `${pct}%`;
    progressBar.style.width = `${pct}%`;
  }

  function refreshLessonCards() {
    $$('.lesson-card').forEach(card => {
      const id = card.dataset.lessonId;
      if (isCompleted(id)) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
    });
    if (!lessonView.classList.contains('hidden')) {
      const currentId = lessonView.dataset.currentLesson;
      if (currentId) renderLessonDetail(currentId);
    }
  }

  // ===== PLATFORM SELECTION =====
  function selectPlatform(platform) {
    currentPlatform = platform;
    currentLevel = 'all';
    searchInput.value = '';
    searchResults.classList.add('hidden');
    glossaryPanel.classList.add('hidden');
    glossaryVisible = false;
    glossaryToggleBtn.textContent = '📋 Glosario de Comandos';

    // Update header
    const cfg = PLATFORMS[platform];
    platformHeaderTitle.textContent = (cfg ? cfg.icon + ' ' + cfg.name : platform);

    // Reset level toggles
    $$('.level-toggle').forEach(b => {
      b.classList.toggle('active', b.dataset.level === 'all');
    });

    // Switch views
    platformSelect.classList.add('hidden');
    mainContent.classList.remove('hidden');
    lessonView.classList.add('hidden');

    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToPlatformSelect() {
    currentPlatform = null;
    platformSelect.classList.remove('hidden');
    mainContent.classList.add('hidden');
    lessonView.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== FILTER LESSONS =====
  function getFilteredLessons() {
    const query = searchInput.value.trim().toLowerCase();
    let lessons = getPlatformData();

    if (currentLevel !== 'all') {
      const lvl = parseInt(currentLevel);
      lessons = lessons.filter(l => l.level === lvl);
    }

    if (query.length > 0) {
      lessons = lessons.filter(l => {
        const haystack = [
          l.title, l.desc,
          ...(l.paragraphs || []),
          ...(l.commands || []),
          ...(l.tips || [])
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    return lessons;
  }

  // ===== RENDER =====
  function renderAll() {
    const lessons = getPlatformData();
    if (lessons.length === 0) {
      lessonsGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem 1rem">
          <h2 class="empty-title">Sin lecciones disponibles</h2>
          <p class="empty-subtitle">Estamos cargando el contenido. Si el problema persiste, recarga la página.</p>
        </div>`;
      progressCount.textContent = '0 / 0 completadas';
      progressPercent.textContent = '0%';
      progressBar.style.width = '0%';
      return;
    }
    renderLessons();
    updateProgressUI();
  }

  function renderLessons() {
    const lessons = getFilteredLessons();

    if (lessons.length === 0) {
      lessonsGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem 1rem">
          <h2 class="empty-title">Sin resultados</h2>
          <p class="empty-subtitle">Prueba con otros términos de búsqueda o cambia el nivel.</p>
        </div>`;
      return;
    }

    lessonsGrid.innerHTML = lessons.map(l => {
      const done = isCompleted(l.id);
      const levelNames = ['', 'Principiante', 'Intermedio', 'Avanzado'];
      return `
        <div class="lesson-card${done ? ' completed' : ''}"
             data-lesson-id="${l.id}"
             onclick="window._haOpenLesson('${l.id}')">
          <div class="lesson-card-check">✓</div>
          <div class="lesson-card-header">
            <span class="lesson-icon">${l.icon || '📖'}</span>
            <span class="lesson-id">Nivel ${l.level} · ${levelNames[l.level]}</span>
          </div>
          <div class="lesson-card-title">${l.title}</div>
          <div class="lesson-card-desc">${l.desc}</div>
        </div>`;
    }).join('');
  }

  // ===== LESSON DETAIL =====
  window._haOpenLesson = function (lessonId) {
    renderLessonDetail(lessonId);
    mainContent.classList.add('hidden');
    lessonView.classList.remove('hidden');
    lessonView.dataset.currentLesson = lessonId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function renderLessonDetail(lessonId) {
    const lessons = getPlatformData();
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const done = isCompleted(lessonId);
    const levelNames = ['', 'Principiante', 'Intermedio', 'Avanzado'];
    const levelName = levelNames[lesson.level] || '';

    let html = `
      <div class="lesson-detail-header">
        <div class="lesson-detail-level">${lesson.icon || ''} Nivel ${lesson.level} — ${levelName}</div>
        <h1 class="lesson-detail-title">${lesson.title}</h1>
      </div>
      <div class="lesson-detail-section">
        <h3>📖 Teoría</h3>
        <p>${lesson.desc}</p>
        ${(lesson.paragraphs || []).map(p => `<p>${p}</p>`).join('')}
      </div>`;

    if (lesson.tips && lesson.tips.length > 0) {
      html += `
      <div class="lesson-detail-section">
        <h3>💡 Consejos</h3>
        ${lesson.tips.map(t => `<div class="lesson-tip">${t}</div>`).join('')}
      </div>`;
    }

    if (lesson.commands && lesson.commands.length > 0) {
      html += `
      <div class="lesson-detail-section">
        <h3>⚡ Comandos y Ejemplos</h3>
        ${lesson.commands.map(c => `<div class="lesson-code">$ ${c}</div>`).join('')}
      </div>`;
    }

    const cfg = PLATFORMS[currentPlatform];
    html += `
      <div class="lesson-detail-section">
        <h3>✏️ Ejercicio Práctico</h3>
        <p>${generateExercise(lesson)}</p>
      </div>
      <button class="complete-btn${done ? ' done' : ''}" onclick="window._haToggleComplete('${lessonId}')">
        ${done ? '✓ Completada' : '☐ Marcar como completada'}
      </button>`;

    lessonDetailContent.innerHTML = html;
  }

  window._haToggleComplete = function (lessonId) {
    toggleComplete(lessonId);
    renderLessonDetail(lessonId);
  };

  function generateExercise(lesson) {
    const cfg = PLATFORMS[currentPlatform];
    const name = cfg ? cfg.name : 'esta plataforma';
    if (lesson.commands && lesson.commands.length > 0) {
      return `Prueba al menos 3 de los comandos mostrados arriba en tu terminal. Experimenta con las opciones y flags que aparecen en la documentación oficial de ${name}.`;
    }
    return `Lee el contenido de esta lección y explora la documentación oficial de ${name} para profundizar en el tema. Intenta aplicar al menos un concepto en tu flujo de trabajo.`;
  }

  // ===== SEARCH =====
  function doSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 2) {
      searchResults.classList.add('hidden');
      renderLessons();
      return;
    }

    const lessons = getPlatformData();
    const results = [];
    for (const lesson of lessons) {
      const haystack = [
        lesson.title, lesson.desc,
        ...(lesson.paragraphs || []),
        ...(lesson.commands || []),
        ...(lesson.tips || [])
      ].join(' ').toLowerCase();
      if (haystack.includes(query)) {
        let context = '';
        for (const p of (lesson.paragraphs || [])) {
          const idx = p.toLowerCase().indexOf(query);
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(p.length, idx + query.length + 60);
            context = (start > 0 ? '...' : '') + p.substring(start, end) + (end < p.length ? '...' : '');
            break;
          }
        }
        if (!context && lesson.commands) {
          for (const c of lesson.commands) {
            if (c.toLowerCase().includes(query)) { context = c; break; }
          }
        }
        results.push({ lesson, context: context || lesson.desc });
      }
    }

    if (results.length === 0) {
      searchResults.classList.remove('hidden');
      searchResults.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--muted)">No se encontraron resultados para "<strong>${escapeHtml(query)}</strong>".</div>`;
      lessonsGrid.innerHTML = '';
      return;
    }

    searchResults.classList.remove('hidden');
    searchResults.innerHTML = results.map(r => `
      <div class="search-result-item" onclick="window._haOpenLesson('${r.lesson.id}')">
        <div class="search-result-title">${r.lesson.icon || ''} ${r.lesson.title}</div>
        <div class="search-result-context">${escapeHtml(r.context)}</div>
      </div>`).join('');
    renderLessons();
  }

  // ===== GLOSSARY =====
  function toggleGlossary() {
    glossaryVisible = !glossaryVisible;
    if (glossaryVisible) {
      renderGlossary();
      glossaryPanel.classList.remove('hidden');
      glossaryToggleBtn.textContent = '📋 Ocultar Glosario';
    } else {
      glossaryPanel.classList.add('hidden');
      glossaryToggleBtn.textContent = '📋 Glosario de Comandos';
    }
  }

  function renderGlossary(filterText) {
    let items = getGlossaryData();
    if (filterText) {
      const q = filterText.toLowerCase();
      items = items.filter(g => g.command.toLowerCase().includes(q) || g.lessonTitle.toLowerCase().includes(q));
    }
    const cfg = PLATFORMS[currentPlatform];
    const name = cfg ? cfg.name : '';

    glossaryPanel.innerHTML = `
      <h2>📋 Glosario — ${name}</h2>
      <div class="glossary-search">
        <input type="text" id="glossary-filter" placeholder="Filtrar comandos..." value="${escapeHtml(filterText || '')}" />
      </div>
      <div class="glossary-list">
        ${items.length === 0 ? '<p style="color:var(--muted);text-align:center;padding:1rem">Esta plataforma no tiene comandos en el glosario.</p>' : ''}
        ${items.slice(0, 80).map(g => `
          <div class="glossary-item">
            <span class="glossary-cmd">${escapeHtml(g.command)}</span>
            <span class="glossary-ref" onclick="window._haOpenLesson('${g.lesson}')">→ ${escapeHtml(g.lessonTitle)}</span>
          </div>`).join('')}
        ${items.length > 80 ? `<p style="color:var(--faint);text-align:center;padding:0.5rem">Mostrando 80 de ${items.length} comandos.</p>` : ''}
      </div>`;

    const filterInput = $('#glossary-filter');
    if (filterInput) {
      filterInput.addEventListener('input', () => renderGlossary(filterInput.value));
    }
  }

  // ===== NAVIGATION =====
  function goBackToLessons() {
    lessonView.classList.add('hidden');
    mainContent.classList.remove('hidden');
    searchResults.classList.add('hidden');
    searchInput.value = '';
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== EVENTS =====
  function bindEvents() {
    // Platform cards
    $('#platform-cards').addEventListener('click', (e) => {
      const card = e.target.closest('.platform-card');
      if (!card) return;
      selectPlatform(card.dataset.platform);
    });

    // Change platform button
    changePlatformBtn.addEventListener('click', goToPlatformSelect);

    // Level toggles
    levelToggles.addEventListener('click', (e) => {
      const btn = e.target.closest('.level-toggle');
      if (!btn) return;
      $$('.level-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLevel = btn.dataset.level;
      searchResults.classList.add('hidden');
      renderLessons();
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(doSearch, 250);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchResults.classList.add('hidden');
        renderLessons();
      }
    });

    // Glossary toggle
    glossaryToggleBtn.addEventListener('click', toggleGlossary);

    // Back from lesson detail
    backBtn.addEventListener('click', goBackToLessons);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lessonView.classList.contains('hidden')) {
        goBackToLessons();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // ===== UTILS =====
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== BOOT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__academia_loaded = true;
  window.__academia_domready = true;
})();
