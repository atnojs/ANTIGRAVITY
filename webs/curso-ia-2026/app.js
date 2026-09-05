document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menu-button');
  const mobileNav = document.getElementById('mobile-nav');
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('.day-panel')];
  const goalFields = ['context', 'objective', 'deliverables', 'limits', 'done'];
  const placeholders = {
    context: '[Describe la situación y añade las fuentes disponibles]',
    objective: '[Define el resultado que necesitas]',
    deliverables: '[Enumera archivos, formatos o resultados]',
    limits: '[Indica qué puede hacer y qué requiere aprobación]',
    done: '[Explica cómo verificarás que está completo]'
  };

  document.querySelectorAll('[data-scroll-to]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: 'smooth' }));
  });

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.textContent = isOpen ? '☰' : '×';
    menuButton.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');
    mobileNav.hidden = isOpen;
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuButton.textContent = '☰';
    menuButton.setAttribute('aria-expanded', 'false');
  }));

  function selectDay(dayId, moveFocus = false) {
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === dayId;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    panels.forEach(panel => {
      const selected = panel.id === dayId;
      panel.hidden = !selected;
      panel.classList.toggle('active', selected);
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDay(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + offset + tabs.length) % tabs.length];
      selectDay(next.dataset.tab, true);
    });
  });
  document.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => {
    selectDay(button.dataset.day);
    document.getElementById('ruta').scrollIntoView({ behavior: 'smooth' });
  }));

  function renderPrompt() {
    const values = Object.fromEntries(goalFields.map(key => [key, document.getElementById(`goal-${key}`).value.trim()]));
    document.getElementById('prompt-output').textContent = `CONTEXTO Y FUENTES\n${values.context || placeholders.context}\n\nOBJETIVO\n${values.objective || placeholders.objective}\n\nENTREGABLES\n${values.deliverables || placeholders.deliverables}\n\nLÍMITES DE AUTONOMÍA\n${values.limits || placeholders.limits}\n\nCONDICIÓN DE TERMINADO\n${values.done || placeholders.done}`;
  }
  goalFields.forEach(key => document.getElementById(`goal-${key}`).addEventListener('input', renderPrompt));
  renderPrompt();
  document.getElementById('copy-prompt').addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(document.getElementById('prompt-output').textContent);
      button.textContent = 'Copiado ✓';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('prompt-output'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      button.textContent = 'Seleccionado';
    }
    setTimeout(() => { button.textContent = 'Copiar'; }, 1800);
  });

  let activeCategory = 'Todos';
  const search = document.getElementById('case-search');
  const cards = [...document.querySelectorAll('.case-card')];
  function filterCases() {
    const term = search.value.trim().toLocaleLowerCase('es');
    let visible = 0;
    cards.forEach(card => {
      const matchesCategory = activeCategory === 'Todos' || card.dataset.category === activeCategory;
      const matchesSearch = card.dataset.search.toLocaleLowerCase('es').includes(term) || card.textContent.toLocaleLowerCase('es').includes(term);
      card.hidden = !(matchesCategory && matchesSearch);
      if (!card.hidden) visible += 1;
    });
    document.getElementById('empty-state').hidden = visible !== 0;
  }
  search.addEventListener('input', filterCases);
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
    filterCases();
  }));

  const checks = [false, false, false, false, false];
  const checkButtons = [...document.querySelectorAll('[data-check]')];
  const saveStatus = document.getElementById('save-status');
  let history = null;
  function renderProgress() {
    const completed = checks.filter(Boolean).length;
    const percentage = Math.round(completed / checks.length * 100);
    document.getElementById('progress-value').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.querySelector('.progress-track').setAttribute('aria-valuenow', String(percentage));
    document.getElementById('progress-copy').textContent = `${completed} de ${checks.length} controles completados`;
    checkButtons.forEach((button, index) => {
      button.classList.toggle('done', checks[index]);
      button.querySelector('span').textContent = checks[index] ? '✓' : '○';
      button.setAttribute('aria-pressed', String(checks[index]));
    });
  }
  async function saveProgress() {
    if (!history) return;
    saveStatus.textContent = 'Guardando progreso…';
    try {
      await history.save({ id: 'curso_ia_2026_progress', type: 'checklist', data: { checks: [...checks] } });
      saveStatus.textContent = 'Progreso guardado en el servidor.';
    } catch (error) {
      saveStatus.textContent = 'No se pudo guardar. Inténtalo de nuevo.';
    }
  }
  checkButtons.forEach(button => button.addEventListener('click', async () => {
    const index = Number(button.dataset.check);
    checks[index] = !checks[index];
    renderProgress();
    await saveProgress();
  }));
  renderProgress();
  if (window.HistoryManager) {
    history = new window.HistoryManager('curso_ia_2026');
    history.load().then(items => {
      const saved = items.find(item => item.id === 'curso_ia_2026_progress');
      if (saved?.data?.checks && Array.isArray(saved.data.checks)) {
        saved.data.checks.slice(0, checks.length).forEach((value, index) => { checks[index] = Boolean(value); });
        renderProgress();
      }
    }).catch(() => { saveStatus.textContent = 'El progreso se guardará cuando el servidor esté disponible.'; });
  }
});
