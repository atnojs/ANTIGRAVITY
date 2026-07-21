/**
 * Hermes Academy — app.js
 * Plataforma interactiva de aprendizaje de Hermes Agent.
 * Estilo Hoola/Relatos + persistencia de progreso vía HistoryManager.
 */

(function () {
  'use strict';

  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const splashScreen = $('#splash-screen');
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
  const lessonDetailContent = $('#lesson-detail-content');
  const loadingOverlay = $('#loading-overlay');

  // ===== STATE =====
  let currentLevel = 'all';
  let completedLessons = new Set();
  let historyManager = null;
  let glossaryVisible = false;

  // ===== INIT =====
  function init() {
    try {
      // Init history for progress persistence
      historyManager = new HistoryManager('hermes_academy');
      loadProgress().then(() => {
        renderAll();
        bindEvents();
        hideLoading();
      });
    } catch (err) {
      console.error('[Hermes Academy] Init error:', err);
      hideLoading();
      renderAll();
      bindEvents();
    }
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
      // Look for progress entries
      for (const item of items) {
        if (item.type === 'progress' && item.data && item.data.completed) {
          for (const id of item.data.completed) {
            completedLessons.add(id);
          }
        }
      }
    } catch (e) {
      console.warn('[Hermes Academy] Could not load progress:', e.message);
      // Fallback: try localStorage
      try {
        const saved = localStorage.getItem('ha_progress');
        if (saved) {
          const arr = JSON.parse(saved);
          arr.forEach(id => completedLessons.add(id));
        }
      } catch (_) {}
    }
  }

  async function saveProgress() {
    const completed = Array.from(completedLessons);
    // Save to server
    try {
      await historyManager.save({
        type: 'progress',
        data: { completed },
        id: 'progress_main'
      });
    } catch (e) {
      console.warn('[Hermes Academy] Could not save progress to server:', e.message);
    }
    // Always save to localStorage as fallback
    try {
      localStorage.setItem('ha_progress', JSON.stringify(completed));
    } catch (_) {}
  }

  function isCompleted(lessonId) {
    return completedLessons.has(lessonId);
  }

  function toggleComplete(lessonId) {
    if (completedLessons.has(lessonId)) {
      completedLessons.delete(lessonId);
    } else {
      completedLessons.add(lessonId);
    }
    saveProgress();
    updateProgressUI();
    refreshLessonCards();
  }

  // ===== PROGRESS UI =====
  function updateProgressUI() {
    const total = LESSONS_DATA.length;
    const done = completedLessons.size;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressCount.textContent = `${done} / ${total} completadas`;
    progressPercent.textContent = `${pct}%`;
    progressBar.style.width = `${pct}%`;
  }

  function refreshLessonCards() {
    // Update all lesson cards in the DOM
    $$('.lesson-card').forEach(card => {
      const id = card.dataset.lessonId;
      if (isCompleted(id)) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
    });
    // Also refresh detail view if visible
    if (!lessonView.classList.contains('hidden')) {
      const currentId = lessonView.dataset.currentLesson;
      if (currentId) renderLessonDetail(currentId);
    }
  }

  // ===== FILTER LESSONS =====
  function getFilteredLessons() {
    const query = searchInput.value.trim().toLowerCase();
    let lessons = LESSONS_DATA;

    // Filter by level
    if (currentLevel !== 'all') {
      const lvl = parseInt(currentLevel);
      lessons = lessons.filter(l => l.level === lvl);
    }

    // Filter by search query
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
        <div class="lesson-card${done ? ' completed' : ''}" data-lesson-id="${l.id}" onclick="window._haOpenLesson('${l.id}')">
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
    splashScreen.classList.add('hidden');
    lessonView.classList.remove('hidden');
    lessonView.dataset.currentLesson = lessonId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function renderLessonDetail(lessonId) {
    const lesson = LESSONS_DATA.find(l => l.id === lessonId);
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

    // Tips
    if (lesson.tips && lesson.tips.length > 0) {
      html += `
      <div class="lesson-detail-section">
        <h3>💡 Consejos</h3>
        ${lesson.tips.map(t => `<div class="lesson-tip">${t}</div>`).join('')}
      </div>`;
    }

    // Commands / Examples
    if (lesson.commands && lesson.commands.length > 0) {
      html += `
      <div class="lesson-detail-section">
        <h3>⚡ Comandos y Ejemplos</h3>
        ${lesson.commands.map(c => `<div class="lesson-code">$ ${c}</div>`).join('')}
      </div>`;
    }

    // Exercise
    html += `
      <div class="lesson-detail-section">
        <h3>✏️ Ejercicio Práctico</h3>
        <p>${generateExercise(lesson)}</p>
      </div>`;

    // Complete button
    html += `
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
    const exercises = {
      l1: 'Abre la documentación oficial de Hermes Agent en hermes-agent.nousresearch.com/docs y explora al menos 3 secciones del menú lateral. Anota qué funcionalidad te llama más la atención.',
      l2: 'Si aún no tienes Hermes instalado, sigue la guía de instalación para tu sistema operativo. Si ya lo tienes, ejecuta `hermes --version` y verifica la versión instalada.',
      l3: 'Abre Hermes y ten tu primera conversación. Pregúntale "¿qué herramientas tienes disponibles?" y "¿cómo puedo configurar un proveedor de IA?".',
    };
    if (exercises[lesson.id]) return exercises[lesson.id];

    if (lesson.commands && lesson.commands.length > 0) {
      return `Prueba al menos 3 de los comandos mostrados arriba en tu terminal. Experimenta con las opciones y flags que aparecen en la documentación.`;
    }

    return `Lee el contenido de esta lección y explora la documentación oficial en hermes-agent.nousresearch.com/docs para profundizar en el tema. Intenta aplicar al menos un concepto en tu configuración de Hermes.`;
  }

  // ===== SEARCH =====
  function doSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 2) {
      searchResults.classList.add('hidden');
      renderLessons();
      return;
    }

    // Search across all lessons
    const results = [];
    for (const lesson of LESSONS_DATA) {
      const haystack = [
        lesson.title, lesson.desc,
        ...(lesson.paragraphs || []),
        ...(lesson.commands || []),
        ...(lesson.tips || [])
      ].join(' ').toLowerCase();

      if (haystack.includes(query)) {
        // Find context snippet
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
            if (c.toLowerCase().includes(query)) {
              context = c;
              break;
            }
          }
        }
        results.push({ lesson, context: context || lesson.desc });
      }
    }

    if (results.length === 0) {
      searchResults.classList.remove('hidden');
      searchResults.innerHTML = `
        <div style="text-align:center;padding:1rem;color:var(--muted)">
          No se encontraron resultados para "<strong>${escapeHtml(query)}</strong>".
        </div>`;
      lessonsGrid.innerHTML = '';
      return;
    }

    searchResults.classList.remove('hidden');
    searchResults.innerHTML = results.map(r => `
      <div class="search-result-item" onclick="window._haOpenLesson('${r.lesson.id}')">
        <div class="search-result-title">${r.lesson.icon || ''} ${r.lesson.title}</div>
        <div class="search-result-context">${escapeHtml(r.context)}</div>
      </div>`).join('');

    // Also update grid
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
    let items = GLOSSARY_DATA || [];
    if (filterText) {
      const q = filterText.toLowerCase();
      items = items.filter(g =>
        g.command.toLowerCase().includes(q) ||
        g.lessonTitle.toLowerCase().includes(q)
      );
    }

    glossaryPanel.innerHTML = `
      <h2>📋 Glosario de Comandos CLI</h2>
      <div class="glossary-search">
        <input type="text" id="glossary-filter" placeholder="Filtrar comandos..." value="${escapeHtml(filterText || '')}" />
      </div>
      <div class="glossary-list">
        ${items.slice(0, 80).map(g => `
          <div class="glossary-item">
            <span class="glossary-cmd">${escapeHtml(g.command)}</span>
            <span class="glossary-ref" onclick="window._haOpenLesson('${g.lesson}')">→ ${escapeHtml(g.lessonTitle)}</span>
          </div>`).join('')}
        ${items.length === 0 ? '<p style="color:var(--muted);text-align:center;padding:1rem">Sin resultados.</p>' : ''}
        ${items.length > 80 ? `<p style="color:var(--faint);text-align:center;padding:0.5rem">Mostrando 80 de ${items.length} comandos. Usa el filtro para afinar.</p>` : ''}
      </div>`;

    // Bind glossary filter
    const filterInput = $('#glossary-filter');
    if (filterInput) {
      filterInput.addEventListener('input', () => {
        renderGlossary(filterInput.value);
      });
    }
  }

  // ===== NAVIGATION =====
  function goBack() {
    lessonView.classList.add('hidden');
    splashScreen.classList.remove('hidden');
    searchResults.classList.add('hidden');
    searchInput.value = '';
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== EVENTS =====
  function bindEvents() {
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

    // Back button
    backBtn.addEventListener('click', goBack);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lessonView.classList.contains('hidden')) {
        goBack();
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

  // Set global flag for diagnostics
  window.__hermes_academy_loaded = true;
  window.__hermes_academy_domready = true;
})();
