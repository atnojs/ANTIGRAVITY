/* ==========================================================================
   Agenda personal · atnojs.es
   Vanilla JS sin frameworks. Estado en memoria + API PHP con sesión y CSRF.
   ========================================================================== */
(() => {
  'use strict';

  const DAY_START = 7;
  const DAY_END = 22;
  const TOTAL_MIN = (DAY_END - DAY_START) * 60;
  const AUDIO_POLL_MS = 1500;
  const AUDIO_POLL_MAX_MS = 90000;
  const TABS = ['hoy', 'calendario', 'tareas', 'notas'];
  const PRIORITY_LABEL = { 1: 'Baja', 2: 'Media', 3: 'Alta' };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const ICONS = {
    mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M9 21h6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    tasks: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m7.5 12 2.6 2.6 6-6.2"/>',
    notes: '<path d="M5 3.5h9.5L20 9v11.5H5z"/><path d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h4.5"/>',
    home: '<path d="M3 11.2 12 4l9 7.2M5.5 9.8V20h13V9.8M9.5 20v-5.5h5V20"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3z"/><path d="m13.5 6.5 3 3"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5"/>',
    archive: '<rect x="3.5" y="4" width="17" height="5" rx="1.5"/><path d="M5 9v10.5h14V9M10 13h4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
    left: '<path d="M14.5 6 8.5 12l6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    spark: '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.2l-1.8-5.6L4.5 10.8 10.2 9z"/>',
    inbox: '<path d="M4 5.5h16v13H4z"/><path d="M4 13h4.5l1.5 2.5h4L15.5 13H20"/>',
    flag: '<path d="M6 21V4.5h11l-2 4 2 4H6"/>',
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    wave: '<path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 12h0"/>'
  };

  const ico = (name, cls = '') =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICONS[name] || ''}</svg>`;

  const state = {
    csrf: '',
    events: [],
    tasks: [],
    notes: [],
    audios: [],
    meta: { today: '', now: '', tz: 'Atlantic/Canary', stt_configured: false },
    tab: 'hoy',
    calMode: '',
    calDate: '',
    taskFilter: 'pending',
    noteSearch: '',
    showArchived: false,
    autoOpened: new Set(),
    pollTimers: new Map(),
    realtime: false,
    lastLoad: 0,
    confirmCallback: null
  };

  const els = {};

  /* ------------------------------------------------------------------ */
  /* Utilidades de fecha                                                */
  /* ------------------------------------------------------------------ */

  const pad = (value) => String(value).padStart(2, '0');
  const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseISO = (iso) => {
    const [year, month, day] = String(iso).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };
  const todayISO = () => isoDate(new Date());
  const addDays = (iso, days) => {
    const date = parseISO(iso);
    date.setDate(date.getDate() + days);
    return isoDate(date);
  };
  const startOfWeek = (iso) => {
    const date = parseISO(iso);
    const dow = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dow);
    return isoDate(date);
  };
  const timeToMin = (time) => {
    const [hours, minutes] = String(time || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const minToTime = (minutes) => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
    return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
  };
  const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');
  const fmtLong = (iso) => capitalize(
    new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseISO(iso))
  );
  const fmtMedium = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(parseISO(iso));
  const fmtMonthYear = (iso) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(parseISO(iso));
  const fmtTime = (time) => String(time || '').slice(0, 5);
  const fmtDateTime = (isoDateTime) => {
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const sameDay = isoDate(date) === todayISO();
    return sameDay
      ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date)
      : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };
  const fmtDuration = (ms) => {
    const total = Math.max(0, Math.round((ms || 0) / 1000));
    return `${Math.floor(total / 60)}:${pad(total % 60)}`;
  };
  const relDay = (iso) => {
    const today = todayISO();
    if (!iso) return 'Sin fecha';
    if (iso === today) return 'Hoy';
    if (iso === addDays(today, 1)) return 'Mañana';
    if (iso === addDays(today, -1)) return 'Ayer';
    return fmtMedium(iso);
  };
  const norm = (text) => String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  /* ------------------------------------------------------------------ */
  /* API                                                                */
  /* ------------------------------------------------------------------ */

  function applyState(payload) {
    if (payload.state) {
      state.events = payload.state.events || [];
      state.tasks = payload.state.tasks || [];
      state.notes = payload.state.notes || [];
      state.audios = payload.state.audios || [];
    }
    if (payload.meta) {
      state.meta = payload.meta;
    }
  }

  async function parseResponse(response) {
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error('El servidor devolvió una respuesta no válida.');
    }
    if (response.status === 401) {
      showLogin();
      throw new Error('La sesión ha caducado. Vuelve a entrar.');
    }
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || 'No se pudo completar la operación.');
    }
    applyState(payload);
    return payload;
  }

  async function apiGet(action, params = {}) {
    const query = new URLSearchParams({ action, ...params });
    const response = await fetch(`api.php?${query.toString()}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    return parseResponse(response);
  }

  async function apiPost(action, data = {}) {
    const response = await fetch('api.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': state.csrf,
        Accept: 'application/json'
      },
      body: JSON.stringify({ action, ...data })
    });
    return parseResponse(response);
  }

  async function authStatus() {
    const response = await fetch('auth.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    return response.json();
  }

  async function authLogin(password) {
    const response = await fetch('auth.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action: 'login', password })
    });
    return parseResponse(response);
  }

  async function authLogout() {
    try {
      await fetch('auth.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (error) {
      /* da igual: la sesión local se limpia de todas formas */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Toast y diálogos                                                   */
  /* ------------------------------------------------------------------ */

  let toastTimer = 0;
  function toast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.classList.toggle('is-error', !!isError);
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function confirmAction(message, callback, options = {}) {
    state.confirmCallback = callback;
    els.confirmText.textContent = message;
    els.confirmOk.textContent = options.okLabel || 'Borrar';
    openDialog(els.confirmDialog);
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = !!busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  /* ------------------------------------------------------------------ */
  /* Vistas                                                             */
  /* ------------------------------------------------------------------ */

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function audioForNote(noteId) {
    return state.audios.find((audio) => Number(audio.note_id) === Number(noteId)) || null;
  }

  function audioAvailable(audio) {
    return !!audio && !audio.deleted_at;
  }

  function pendingTasks() {
    return state.tasks.filter((task) => task.status !== 'done');
  }

  function overdueTasks() {
    const today = todayISO();
    return pendingTasks().filter((task) => task.due_date && task.due_date < today);
  }

  function sortTasks(list) {
    const today = todayISO();
    return [...list].sort((a, b) => {
      if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      const dueA = a.due_date || '';
      const dueB = b.due_date || '';
      if (dueA && dueB && dueA !== dueB) return dueA < dueB ? -1 : 1;
      if (dueA && !dueB) return -1;
      if (!dueA && dueB) return 1;
      const overdueDiff = Number(!!(a.due_date && a.due_date < today)) - Number(!!(b.due_date && b.due_date < today));
      if (overdueDiff !== 0) return -overdueDiff;
      if ((a.priority || 2) !== (b.priority || 2)) return (b.priority || 2) - (a.priority || 2);
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });
  }

  function eventRowHTML(event) {
    return `
      <button type="button" class="event-row" data-action="edit-event" data-id="${event.id}">
        <span class="event-bar bar-${Number(event.color) || 0}" aria-hidden="true"></span>
        <span class="event-time">${event.all_day
          ? '<span class="all-day-pill">Todo el día</span>'
          : `${esc(fmtTime(event.start))}<br>${esc(fmtTime(event.end))}`}</span>
        <span class="event-main">
          <span class="event-title">${esc(event.title)}</span>
          ${event.description ? `<span class="event-desc">${esc(event.description)}</span>` : ''}
        </span>
      </button>`;
  }

  function taskRowHTML(task, options = {}) {
    const done = task.status === 'done';
    const today = todayISO();
    const overdue = !done && task.due_date && task.due_date < today;
    const dueToday = !done && task.due_date === today;
    return `
      <div class="task-row${done ? ' done' : ''}" data-task-row="${task.id}">
        <button type="button" class="task-check" data-action="task-toggle" data-id="${task.id}"
          aria-label="${done ? 'Marcar como pendiente' : 'Marcar como completada'}: ${esc(task.title)}"
          aria-pressed="${done}">${ico('check')}</button>
        <div class="task-main">
          <div class="task-title">${esc(task.title)}</div>
          <div class="task-meta">
            <span class="priority priority-${task.priority || 2}">${PRIORITY_LABEL[task.priority || 2]}</span>
            ${task.due_date ? `<span class="due${overdue ? ' is-overdue' : dueToday ? ' is-today' : ''}">${ico('clock')}${esc(relDay(task.due_date))}</span>` : ''}
            ${task.notes ? `<span class="muted">${esc(task.notes.slice(0, 70))}${task.notes.length > 70 ? '…' : ''}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          ${!done ? `<button type="button" class="icon-btn small" data-action="task-postpone" data-id="${task.id}" aria-label="Posponer un día: ${esc(task.title)}" title="Posponer un día">${ico('clock')}</button>` : ''}
          <button type="button" class="icon-btn small" data-action="edit-task" data-id="${task.id}" aria-label="Editar tarea: ${esc(task.title)}" title="Editar">${ico('edit')}</button>
          <button type="button" class="icon-btn small" data-action="delete-task" data-id="${task.id}" aria-label="Borrar tarea: ${esc(task.title)}" title="Borrar">${ico('trash')}</button>
        </div>
      </div>`;
  }

  function emptyHTML(icon, text, action, label) {
    return `<div class="empty">${ico(icon)}<p>${esc(text)}</p>${action ? `<button type="button" class="btn btn-secondary" data-action="${action}">${esc(label)}</button>` : ''}</div>`;
  }

  function viewHoy() {
    const today = todayISO();
    const events = state.events
      .filter((event) => event.date === today)
      .sort((a, b) => Number(b.all_day) - Number(a.all_day) || timeToMin(a.start) - timeToMin(b.start));
    const tasks = sortTasks(pendingTasks().filter((task) => !task.due_date || task.due_date <= today)).slice(0, 6);
    const inbox = state.notes
      .filter((note) => note.status !== 'archived')
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(0, 3);
    const tomorrowEvents = state.events.filter((event) => event.date === addDays(today, 1));
    const nowMin = (() => {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    })();
    const nextEvent = events.find((event) => !event.all_day && timeToMin(event.end) >= nowMin) || null;

    return `
      <section class="today-hero" aria-labelledby="todayHeading">
        <div>
          <h2 id="todayHeading">${greeting()}</h2>
          <p class="day-date">${esc(fmtLong(today))} · ${parseISO(today).getFullYear()}</p>
        </div>
        ${nextEvent ? `
          <div class="next-event">
            <div>
              <div class="label">Próxima cita</div>
              <div class="time">${esc(fmtTime(nextEvent.start))}</div>
            </div>
            <div>
              <div class="event-title">${esc(nextEvent.title)}</div>
              ${nextEvent.description ? `<div class="event-desc">${esc(nextEvent.description)}</div>` : ''}
            </div>
          </div>` : ''}
      </section>

      <div class="dashboard-grid">
        <div class="dashboard-col">
          <section class="panel" aria-labelledby="todayEventsTitle">
            <div class="panel-head">
              <h2 id="todayEventsTitle">Citas de hoy <span class="panel-count">${events.length}</span></h2>
              <button type="button" class="link-btn" data-action="new-event">Añadir</button>
            </div>
            <div class="panel-body">
              ${events.length ? events.map(eventRowHTML).join('') : emptyHTML('calendar', 'No hay citas para hoy. El calendario está libre.', 'new-event', 'Añadir cita')}
            </div>
          </section>

          <section class="panel" aria-labelledby="todayTasksTitle">
            <div class="panel-head">
              <h2 id="todayTasksTitle">Tareas <span class="panel-count">${tasks.length}</span></h2>
              <button type="button" class="link-btn" data-action="open-tab" data-tab-target="tareas">Ver todas</button>
            </div>
            <div class="panel-body">
              ${tasks.length ? `<div class="task-list">${tasks.map((task) => taskRowHTML(task)).join('')}</div>` : emptyHTML('tasks', 'Nada pendiente por aquí. Buena señal.', 'new-task', 'Añadir tarea')}
            </div>
          </section>
        </div>

        <div class="dashboard-col">
          <section class="panel" aria-labelledby="todayInboxTitle">
            <div class="panel-head">
              <h2 id="todayInboxTitle">Inbox <span class="panel-count">${inbox.length}</span></h2>
              <button type="button" class="link-btn" data-action="open-tab" data-tab-target="notas">Ver notas</button>
            </div>
            <div class="panel-body">
              ${inbox.length ? inbox.map((note) => `
                <button type="button" class="event-row" data-action="edit-note" data-id="${note.id}">
                  <span class="event-main">
                    <span class="event-title">${esc(note.title)}</span>
                    <span class="event-desc">${esc((note.body || '').slice(0, 90))}${(note.body || '').length > 90 ? '…' : ''}</span>
                  </span>
                </button>`).join('') : emptyHTML('notes', 'Tu inbox está vacío. Suelta aquí una idea o graba una nota.', 'new-note', 'Escribir nota')}
            </div>
          </section>

          <section class="panel" aria-labelledby="tomorrowTitle">
            <div class="panel-head">
              <h2 id="tomorrowTitle">Mañana <span class="panel-count">${tomorrowEvents.length}</span></h2>
              <button type="button" class="link-btn" data-action="new-event">Añadir</button>
            </div>
            <div class="panel-body">
              ${tomorrowEvents.length ? tomorrowEvents
                .sort((a, b) => timeToMin(a.start) - timeToMin(b.start))
                .map((event) => `
                  <div class="event-row" role="presentation">
                    <span class="event-bar bar-${Number(event.color) || 0}" aria-hidden="true"></span>
                    <span class="event-time">${event.all_day ? 'Día' : esc(fmtTime(event.start))}</span>
                    <span class="event-main"><span class="event-title">${esc(event.title)}</span></span>
                  </div>`).join('')
                : `<p class="muted small" style="padding: 4px 10px 10px">Sin citas previstas.</p>`}
            </div>
          </section>
        </div>
      </div>`;
  }

  function eventLayout(events) {
    const prepared = events
      .filter((event) => !event.all_day && event.start)
      .map((event) => {
        const start = Math.max(DAY_START * 60, Math.min(DAY_END * 60, timeToMin(event.start)));
        const end = Math.max(start + 15, Math.min(DAY_END * 60, timeToMin(event.end || event.start)));
        return { event, start, end };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const groups = [];
    let current = [];
    let currentEnd = -1;
    for (const item of prepared) {
      if (current.length && item.start >= currentEnd) {
        groups.push(current);
        current = [];
        currentEnd = -1;
      }
      current.push(item);
      currentEnd = Math.max(currentEnd, item.end);
    }
    if (current.length) groups.push(current);

    const positioned = [];
    for (const group of groups) {
      const laneEnds = [];
      for (const item of group) {
        let lane = laneEnds.findIndex((end) => item.start >= end);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(0);
        }
        laneEnds[lane] = item.end;
        item.lane = lane;
      }
      const lanes = Math.max(1, laneEnds.length);
      for (const item of group) {
        positioned.push({ ...item, lanes });
      }
    }
    return positioned;
  }

  function viewCalendario() {
    const mode = state.calMode || 'week';
    const anchor = state.calDate || todayISO();
    const days = mode === 'week'
      ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index))
      : [anchor];
    const from = days[0];
    const to = days[days.length - 1];
    const rangeLabel = mode === 'week'
      ? (from.slice(0, 7) === to.slice(0, 7)
        ? `${parseISO(from).getDate()} – ${parseISO(to).getDate()} ${fmtMonthYear(from)}`
        : `${fmtMedium(from)} – ${fmtMedium(to)} ${parseISO(to).getFullYear()}`)
      : `${fmtLong(anchor)}`;
    const events = state.events.filter((event) => event.date >= from && event.date <= to);
    const allDayByDay = {};
    for (const event of events.filter((item) => item.all_day)) {
      (allDayByDay[event.date] = allDayByDay[event.date] || []).push(event);
    }
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const head = `
      <div class="cal-head" role="row">
        <div aria-hidden="true"></div>
        ${days.map((date) => {
          const dateEvents = allDayByDay[date] || [];
          return `
            <div class="cal-head-day${date === todayISO() ? ' today' : ''}">
              <div class="dow">${esc(new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(parseISO(date)))}</div>
              <div class="dom">${parseISO(date).getDate()}</div>
              ${dateEvents.length ? `<div class="allday-strip">${dateEvents.map((event) => `<button type="button" class="allday-chip" data-action="edit-event" data-id="${event.id}">${esc(event.title)}</button>`).join('')}</div>` : ''}
            </div>`;
        }).join('')}
      </div>`;

    const times = Array.from({ length: DAY_END - DAY_START }, (_, index) => {
      const hour = DAY_START + index;
      return `<div class="cal-time-label">${pad(hour)}:00</div>`;
    }).join('');

    const columns = days.map((date) => {
      const dayEvents = eventLayout(events.filter((event) => event.date === date));
      const isToday = date === todayISO();
      const nowLine = isToday && nowMinutes >= DAY_START * 60 && nowMinutes <= DAY_END * 60
        ? `<div class="now-line" style="top:${((nowMinutes - DAY_START * 60) / TOTAL_MIN) * 100}%"></div>`
        : '';
      const blocks = dayEvents.map(({ event, start, end, lane, lanes }) => {
        const top = ((start - DAY_START * 60) / TOTAL_MIN) * 100;
        const height = Math.max(2.6, ((end - start) / TOTAL_MIN) * 100);
        const width = 100 / lanes;
        const left = lane * width;
        return `
          <button type="button" class="cal-event color-${Number(event.color) || 0}"
            style="top:${top}%;height:${height}%;left:calc(${left}% + 3px);width:calc(${width}% - 6px)"
            data-action="edit-event" data-id="${event.id}"
            aria-label="${esc(event.title)}, ${esc(fmtTime(event.start))} a ${esc(fmtTime(event.end))}">
            <span class="ce-time">${esc(fmtTime(event.start))}</span>
            <span class="ce-title">${esc(event.title)}</span>
          </button>`;
      }).join('');
      return `<div class="cal-day-col${isToday ? ' today' : ''}" data-date="${date}" aria-label="${esc(fmtLong(date))}">${nowLine}${blocks}</div>`;
    }).join('');

    return `
      <div class="cal-toolbar">
        <div class="cal-nav">
          <button type="button" class="icon-btn" data-action="cal-prev" aria-label="Periodo anterior">${ico('left')}</button>
          <button type="button" class="btn btn-ghost" data-action="cal-today">Hoy</button>
          <button type="button" class="icon-btn" data-action="cal-next" aria-label="Periodo siguiente">${ico('right')}</button>
          <span class="cal-range" aria-live="polite">${esc(rangeLabel)}</span>
        </div>
        <div class="seg" role="group" aria-label="Vista del calendario">
          <button type="button" data-action="cal-mode" data-mode="day" aria-pressed="${mode === 'day'}">Día</button>
          <button type="button" data-action="cal-mode" data-mode="week" aria-pressed="${mode === 'week'}">Semana</button>
        </div>
      </div>
      <section class="calendar panel${mode === 'day' ? ' is-day' : ''}" aria-label="Calendario ${mode === 'day' ? 'diario' : 'semanal'}">
        <div class="cal-scroll">
          ${head}
          <div class="cal-body">
            <div class="cal-times" aria-hidden="true">${times}</div>
            ${columns}
          </div>
        </div>
      </section>
      <div class="cal-legend" aria-hidden="true">
        <span><span class="legend-dot bar-0"></span> Cian</span>
        <span><span class="legend-dot bar-1"></span> Verde</span>
        <span><span class="legend-dot bar-2"></span> Ámbar</span>
        <span><span class="legend-dot bar-3"></span> Violeta</span>
        <span><span class="legend-dot bar-4"></span> Rosa</span>
        <span class="muted">Toca un hueco libre para crear una cita</span>
      </div>`;
  }

  function viewTareas() {
    const filter = state.taskFilter;
    const today = todayISO();
    const all = sortTasks(state.tasks);
    const pending = all.filter((task) => task.status !== 'done');
    const done = all.filter((task) => task.status === 'done');
    const overdue = pending.filter((task) => task.due_date && task.due_date < today);
    const dueToday = pending.filter((task) => task.due_date === today);
    const upcoming = pending.filter((task) => task.due_date && task.due_date > today);
    const someday = pending.filter((task) => !task.due_date);

    const buildGroup = (title, list, extraClass = '') => list.length
      ? `<section class="task-group"><h3 class="task-group-title ${extraClass}">${esc(title)} <span class="panel-count">${list.length}</span></h3><div class="task-list">${list.map((task) => taskRowHTML(task)).join('')}</div></section>`
      : '';

    let groups = '';
    if (filter === 'done') {
      groups = done.length
        ? `<section class="task-group"><h3 class="task-group-title">Completadas <span class="panel-count">${done.length}</span></h3><div class="task-list">${done.map((task) => taskRowHTML(task)).join('')}</div></section>`
        : emptyHTML('tasks', 'Todavía no has completado ninguna tarea.', 'new-task', 'Añadir tarea');
    } else if (filter === 'today') {
      groups = buildGroup('Atrasadas', overdue, 'is-overdue') + buildGroup('Para hoy', dueToday);
      if (!groups) groups = emptyHTML('spark', 'Nada para hoy ni atrasado. Todo en orden.', 'new-task', 'Añadir tarea');
    } else if (filter === 'all') {
      groups = buildGroup('Pendientes', pending) + buildGroup('Completadas', done);
      if (!groups) groups = emptyHTML('tasks', 'No hay tareas todavía.', 'new-task', 'Añadir tarea');
    } else {
      groups = buildGroup('Atrasadas', overdue, 'is-overdue')
        + buildGroup('Para hoy', dueToday)
        + buildGroup('Próximas', upcoming)
        + buildGroup('Sin fecha', someday);
      if (!groups) groups = emptyHTML('tasks', 'Nada pendiente. Disfruta del hueco.', 'new-task', 'Añadir tarea');
    }

    const filters = [
      ['pending', 'Pendientes'],
      ['today', 'Hoy'],
      ['done', 'Completadas'],
      ['all', 'Todas']
    ];

    return `
      <div class="task-toolbar">
        <div class="filter-chips" role="group" aria-label="Filtrar tareas">
          ${filters.map(([key, label]) => `<button type="button" class="chip" data-action="filter-tasks" data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`).join('')}
        </div>
        <p class="muted small">${pending.length} pendiente${pending.length === 1 ? '' : 's'}${overdue.length ? ` · ${overdue.length} atrasada${overdue.length === 1 ? '' : 's'}` : ''}</p>
      </div>
      ${groups}`;
  }

  function noteCardHTML(note) {
    const audio = audioForNote(note.id);
    const processing = !!audio && (audio.status === 'uploaded' || audio.status === 'transcribing');
    const failed = !!audio && audio.status === 'failed';
    const needsReview = !!audio && audio.status === 'transcribed' && !audio.reviewed;
    const showPlayer = !!audio && !processing && audioAvailable(audio);
    const snippet = (note.body || '').slice(0, 240);
    let body = '';
    if (processing) {
      body = `<div class="transcribing"><span class="mini-spinner" aria-hidden="true"></span> Transcribiendo audio…</div>`;
    } else if (failed) {
      body = `<p class="failed-box">${esc(audio.last_error || 'No se pudo transcribir el audio.')}</p>
        <div class="note-actions">
          <button type="button" class="link-btn" data-action="retry-audio" data-id="${audio.id}">Reintentar</button>
          <button type="button" class="link-btn" data-action="edit-note" data-id="${note.id}">Escribir a mano</button>
        </div>`;
    } else if (snippet) {
      body = `<p class="note-snippet">${esc(snippet)}${(note.body || '').length > 240 ? '…' : ''}</p>`;
    } else {
      body = `<p class="note-snippet muted">Sin texto todavía.</p>`;
    }

    return `
      <article class="note-card" aria-labelledby="noteTitle-${note.id}">
        <div class="note-head">
          <button type="button" class="link-title link-btn note-title" id="noteTitle-${note.id}" data-action="edit-note" data-id="${note.id}">${esc(note.title)}</button>
          <span class="note-badge${audio ? '' : ' badge-text'}">${audio ? 'Voz' : 'Texto'}</span>
        </div>
        ${body}
        ${showPlayer ? `<div class="note-audio"><audio controls preload="none" src="audio.php?id=${audio.id}"></audio></div>` : ''}
        ${needsReview ? `<div><button type="button" class="btn btn-secondary" data-action="review-audio" data-id="${audio.id}">${ico('spark')} Revisar transcripción</button></div>` : ''}
        <div class="note-foot">
          <span class="note-date">${esc(fmtDateTime(note.updated_at || note.created_at))}${audio && audio.duration_ms ? ` · ${fmtDuration(audio.duration_ms)}` : ''}</span>
          <div class="note-actions">
            ${audio && !processing ? `<button type="button" class="icon-btn small" data-action="edit-note" data-id="${note.id}" aria-label="Editar nota: ${esc(note.title)}" title="Editar">${ico('edit')}</button>` : ''}
            <button type="button" class="icon-btn small" data-action="archive-note" data-id="${note.id}" aria-label="Archivar nota: ${esc(note.title)}" title="${note.status === 'archived' ? 'Desarchivar' : 'Archivar'}">${ico('archive')}</button>
            <button type="button" class="icon-btn small" data-action="delete-note" data-id="${note.id}" aria-label="Borrar nota: ${esc(note.title)}" title="Borrar">${ico('trash')}</button>
          </div>
        </div>
      </article>`;
  }

  function filteredNotes() {
    const query = norm(state.noteSearch.trim());
    return state.notes
      .filter((note) => (state.showArchived ? note.status === 'archived' : note.status !== 'archived'))
      .filter((note) => {
        if (!query) return true;
        return norm(note.title).includes(query) || norm(note.body).includes(query);
      })
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  }

  function notesResultsHTML() {
    const notes = filteredNotes();
    if (!notes.length) {
      return state.noteSearch.trim()
        ? emptyHTML('search', 'No hay notas que coincidan con la búsqueda.', null, '')
        : emptyHTML('inbox', 'Tu inbox está vacío. Escribe una nota rápida o graba audio.', 'new-note', 'Escribir nota');
    }
    return `<div class="notes-list" id="notesList">${notes.map(noteCardHTML).join('')}</div>`;
  }

  function viewNotas() {
    const archivedCount = state.notes.filter((note) => note.status === 'archived').length;
    return `
      <div class="notes-toolbar">
        <div class="search-box">
          ${ico('search')}
          <label class="visually-hidden" for="noteSearch" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Buscar en notas</label>
          <input id="noteSearch" type="search" placeholder="Buscar en notas y transcripciones…" autocomplete="off" value="${esc(state.noteSearch)}">
          <button type="button" class="search-clear" id="noteSearchClear" aria-label="Limpiar búsqueda"${state.noteSearch ? '' : ' hidden'}>${ico('close')}</button>
        </div>
        <button type="button" class="chip" data-action="toggle-archived" aria-pressed="${state.showArchived}">
          ${state.showArchived ? 'Ver inbox' : `Ver archivadas (${archivedCount})`}
        </button>
      </div>

      <section class="quick-note panel" aria-labelledby="quickNoteTitle">
        <h2 id="quickNoteTitle" class="eyebrow" style="margin-bottom:8px">Nota rápida</h2>
        <label for="quickNoteBody" class="visually-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Escribe una nota rápida</label>
        <textarea id="quickNoteBody" placeholder="Escribe una idea, un recordatorio, algo que no quieres olvidar…" rows="2"></textarea>
        <div class="quick-note-foot">
          <span class="hint">Ctrl + Enter para guardar · el micrófono graba y transcribe</span>
          <button type="button" class="btn btn-primary" id="quickNoteSave">Guardar nota</button>
        </div>
      </section>

      <h2 class="visually-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${state.showArchived ? 'Notas archivadas' : 'Bandeja de entrada'}</h2>
      <div id="notesResults" aria-live="polite">${notesResultsHTML()}</div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /* Render principal                                                    */
  /* ------------------------------------------------------------------ */

  const VIEW_TITLES = {
    hoy: 'Hoy',
    calendario: 'Calendario',
    tareas: 'Tareas',
    notas: 'Notas'
  };

  function subtitleForTab() {
    const today = todayISO();
    if (state.tab === 'hoy') return fmtLong(today);
    if (state.tab === 'tareas') {
      const pending = pendingTasks().length;
      const overdue = overdueTasks().length;
      return `${pending} pendiente${pending === 1 ? '' : 's'}${overdue ? ` · ${overdue} atrasada${overdue === 1 ? '' : 's'}` : ''}`;
    }
    if (state.tab === 'notas') {
      const inbox = state.notes.filter((note) => note.status !== 'archived').length;
      return `${inbox} en la bandeja · búsqueda instantánea`;
    }
    if (state.tab === 'calendario') {
      return state.calMode === 'day' ? 'Vista diaria' : 'Vista semanal';
    }
    return '';
  }

  function render(options = {}) {
    const scrollY = window.scrollY;
    const active = document.activeElement;
    const activeId = active && active.id ? active.id : '';
    const selection = active && typeof active.selectionStart === 'number'
      ? [active.selectionStart, active.selectionEnd]
      : null;

    $$('.rail-item[data-tab]').forEach((button) => {
      if (button.dataset.tab === state.tab) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    els.viewTitle.textContent = VIEW_TITLES[state.tab] || 'Agenda';
    els.viewSubtitle.textContent = subtitleForTab();
    document.title = `${VIEW_TITLES[state.tab] || 'Agenda'} · Agenda personal`;

    const addLabels = {
      hoy: 'Nueva cita',
      calendario: 'Nueva cita',
      tareas: 'Nueva tarea',
      notas: 'Nueva nota'
    };
    els.contextAddLabel.textContent = addLabels[state.tab] || 'Nuevo';
    els.contextAddBtn.setAttribute('aria-label', addLabels[state.tab] || 'Nuevo');

    if (state.tab === 'hoy') els.mainView.innerHTML = viewHoy();
    else if (state.tab === 'calendario') els.mainView.innerHTML = viewCalendario();
    else if (state.tab === 'tareas') els.mainView.innerHTML = viewTareas();
    else els.mainView.innerHTML = viewNotas();

    bindViewEvents();

    if (options.preserveFocus && activeId) {
      const restored = document.getElementById(activeId);
      if (restored) {
        restored.focus({ preventScroll: true });
        if (selection && typeof restored.setSelectionRange === 'function') {
          try {
            restored.setSelectionRange(selection[0], selection[1]);
          } catch (error) {
            /* algunos tipos de input no soportan selección */
          }
        }
      }
      window.scrollTo(0, scrollY);
    }

    resumePolling();
  }

  function rerenderNotesResults() {
    const container = $('#notesResults');
    if (container) container.innerHTML = notesResultsHTML();
    const clear = $('#noteSearchClear');
    if (clear) clear.hidden = !state.noteSearch;
  }

  function refreshState() {
    if (!state.csrf) return;
    apiGet('state')
      .then(() => {
        state.lastLoad = Date.now();
        render({ preserveFocus: true });
      })
      .catch(() => { /* si falla, se reintenta al volver a la pestaña */ });
  }

  /* ------------------------------------------------------------------ */
  /* Eventos de las vistas                                               */
  /* ------------------------------------------------------------------ */

  function bindViewEvents() {
    const search = $('#noteSearch');
    if (search) {
      search.addEventListener('input', () => {
        state.noteSearch = search.value;
        rerenderNotesResults();
      });
      search.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          search.value = '';
          state.noteSearch = '';
          rerenderNotesResults();
        }
      });
    }
    const clear = $('#noteSearchClear');
    if (clear) {
      clear.addEventListener('click', () => {
        state.noteSearch = '';
        const input = $('#noteSearch');
        if (input) {
          input.value = '';
          input.focus();
        }
        rerenderNotesResults();
      });
    }
    const quickBody = $('#quickNoteBody');
    const quickSave = $('#quickNoteSave');
    if (quickBody && quickSave) {
      quickBody.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          saveQuickNote();
        }
      });
      quickSave.addEventListener('click', saveQuickNote);
    }
  }

  async function saveQuickNote() {
    const body = ($('#quickNoteBody') || {}).value || '';
    if (!body.trim()) {
      toast('Escribe algo antes de guardar.', true);
      return;
    }
    const button = $('#quickNoteSave');
    setBusy(button, true);
    try {
      await apiPost('note_save', { body });
      const textarea = $('#quickNoteBody');
      if (textarea) textarea.value = '';
      toast('Nota guardada en el inbox.');
      render({ preserveFocus: true });
    } catch (error) {
      toast(error.message, true);
    } finally {
      setBusy(button, false);
    }
  }

  function onMainClick(event) {
    const dayColumn = event.target.closest('.cal-day-col');
    const actionTarget = event.target.closest('[data-action]');

    if (!actionTarget) {
      if (dayColumn && state.tab === 'calendario') {
        const rect = dayColumn.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        const minutes = DAY_START * 60 + ratio * TOTAL_MIN;
        const rounded = Math.round(minutes / 15) * 15;
        openEventDialog(null, { date: dayColumn.dataset.date, start: minToTime(rounded), end: minToTime(rounded + 60) });
      }
      return;
    }

    const action = actionTarget.dataset.action;
    const id = Number(actionTarget.dataset.id || 0);

    switch (action) {
      case 'new-event':
        openEventDialog(null, state.tab === 'calendario' ? { date: state.calDate || todayISO() } : {});
        break;
      case 'new-task':
        openTaskDialog(null);
        break;
      case 'new-note':
        openNoteDialog(null);
        break;
      case 'open-tab':
        setTab(actionTarget.dataset.tabTarget || 'hoy');
        break;
      case 'edit-event':
        openEventDialog(id);
        break;
      case 'edit-task':
        openTaskDialog(id);
        break;
      case 'edit-note':
        openNoteDialog(id);
        break;
      case 'task-toggle':
        toggleTask(id);
        break;
      case 'task-postpone':
        postponeTask(id);
        break;
      case 'delete-task':
        confirmAction('¿Seguro que quieres borrar esta tarea?', () => deleteTask(id));
        break;
      case 'filter-tasks':
        state.taskFilter = actionTarget.dataset.filter || 'pending';
        render();
        break;
      case 'archive-note':
        archiveNote(id);
        break;
      case 'delete-note':
        confirmAction('¿Seguro que quieres borrar esta nota? Si tiene audio, también se borrará la grabación.', () => deleteNote(id));
        break;
      case 'review-audio':
        openReviewDialog(id);
        break;
      case 'retry-audio':
        retryAudio(id);
        break;
      case 'toggle-archived':
        state.showArchived = !state.showArchived;
        state.noteSearch = '';
        render();
        break;
      case 'cal-prev':
        state.calDate = addDays(state.calDate || todayISO(), state.calMode === 'day' ? -1 : -7);
        render();
        break;
      case 'cal-next':
        state.calDate = addDays(state.calDate || todayISO(), state.calMode === 'day' ? 1 : 7);
        render();
        break;
      case 'cal-today':
        state.calDate = todayISO();
        render();
        break;
      case 'cal-mode':
        state.calMode = actionTarget.dataset.mode === 'day' ? 'day' : 'week';
        render();
        break;
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Citas                                                               */
  /* ------------------------------------------------------------------ */

  function openEventDialog(id, prefill = {}) {
    const event = id ? state.events.find((item) => Number(item.id) === Number(id)) : null;
    els.eventForm.reset();
    els.eventId.value = event ? event.id : '';
    els.eventTitle.textContent = event ? 'Editar cita' : 'Nueva cita';
    els.eventName.value = event ? event.title : '';
    els.eventDate.value = event ? event.date : (prefill.date || todayISO());
    els.eventStart.value = event ? event.start : (prefill.start || '09:00');
    els.eventEnd.value = event ? event.end : (prefill.end || '10:00');
    els.eventDescription.value = event ? (event.description || '') : '';
    els.eventColor.value = String(event ? (event.color || 0) : 0);
    els.eventAllDay.checked = !!event && !!event.all_day;
    els.eventDelete.hidden = !event;
    els.eventError.textContent = '';
    syncEventAllDay();
    openDialog(els.eventDialog);
    window.setTimeout(() => els.eventName.focus(), 40);
  }

  function syncEventAllDay() {
    const allDay = els.eventAllDay.checked;
    els.eventStart.disabled = allDay;
    els.eventEnd.disabled = allDay;
    els.eventStart.required = !allDay;
    els.eventEnd.required = false;
  }

  async function submitEvent(event) {
    event.preventDefault();
    els.eventError.textContent = '';
    const allDay = els.eventAllDay.checked;
    const payload = {
      id: Number(els.eventId.value || 0),
      title: els.eventName.value.trim(),
      date: els.eventDate.value,
      start: allDay ? '' : els.eventStart.value,
      end: allDay ? '' : els.eventEnd.value,
      all_day: allDay,
      description: els.eventDescription.value,
      color: Number(els.eventColor.value || 0)
    };
    if (!payload.title) {
      els.eventError.textContent = 'El título es obligatorio.';
      els.eventName.focus();
      return;
    }
    if (!payload.date) {
      els.eventError.textContent = 'La fecha es obligatoria.';
      els.eventDate.focus();
      return;
    }
    if (!allDay && !payload.start) {
      els.eventError.textContent = 'Indica la hora de inicio.';
      els.eventStart.focus();
      return;
    }
    const submitButton = els.eventForm.querySelector('button[type="submit"]');
    setBusy(submitButton, true);
    try {
      await apiPost('event_save', payload);
      closeDialog(els.eventDialog);
      toast(payload.id ? 'Cita actualizada.' : 'Cita creada.');
      render();
    } catch (error) {
      els.eventError.textContent = error.message;
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function deleteEvent() {
    const id = Number(els.eventId.value || 0);
    if (!id) return;
    try {
      await apiPost('event_delete', { id });
      closeDialog(els.eventDialog);
      toast('Cita borrada.');
      render();
    } catch (error) {
      els.eventError.textContent = error.message;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Tareas                                                              */
  /* ------------------------------------------------------------------ */

  function openTaskDialog(id) {
    const task = id ? state.tasks.find((item) => Number(item.id) === Number(id)) : null;
    els.taskForm.reset();
    els.taskId.value = task ? task.id : '';
    els.taskTitle.textContent = task ? 'Editar tarea' : 'Nueva tarea';
    els.taskName.value = task ? task.title : '';
    els.taskDue.value = task ? (task.due_date || '') : '';
    els.taskPriority.value = String(task ? (task.priority || 2) : 2);
    els.taskNotes.value = task ? (task.notes || '') : '';
    els.taskDelete.hidden = !task;
    els.taskError.textContent = '';
    openDialog(els.taskDialog);
    window.setTimeout(() => els.taskName.focus(), 40);
  }

  async function submitTask(event) {
    event.preventDefault();
    els.taskError.textContent = '';
    const payload = {
      id: Number(els.taskId.value || 0),
      title: els.taskName.value.trim(),
      due_date: els.taskDue.value,
      priority: Number(els.taskPriority.value || 2),
      notes: els.taskNotes.value
    };
    if (!payload.title) {
      els.taskError.textContent = 'El título es obligatorio.';
      els.taskName.focus();
      return;
    }
    const submitButton = els.taskForm.querySelector('button[type="submit"]');
    setBusy(submitButton, true);
    try {
      await apiPost('task_save', payload);
      closeDialog(els.taskDialog);
      toast(payload.id ? 'Tarea actualizada.' : 'Tarea creada.');
      render();
    } catch (error) {
      els.taskError.textContent = error.message;
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function toggleTask(id) {
    try {
      await apiPost('task_toggle', { id });
      render();
    } catch (error) {
      toast(error.message, true);
    }
  }

  async function postponeTask(id) {
    try {
      await apiPost('task_postpone', { id });
      toast('Tarea pospuesta un día.');
      render();
    } catch (error) {
      toast(error.message, true);
    }
  }

  async function deleteTask(id) {
    try {
      await apiPost('task_delete', { id });
      toast('Tarea borrada.');
      render();
    } catch (error) {
      toast(error.message, true);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Notas                                                               */
  /* ------------------------------------------------------------------ */

  function openNoteDialog(id) {
    const note = id ? state.notes.find((item) => Number(item.id) === Number(id)) : null;
    const audio = note ? audioForNote(note.id) : null;
    els.noteForm.reset();
    els.noteId.value = note ? note.id : '';
    els.noteKicker.textContent = audio ? 'Nota de voz' : 'Nota';
    els.noteTitle.textContent = note ? 'Editar nota' : 'Nueva nota';
    els.noteName.value = note ? note.title : '';
    els.noteBody.value = note ? note.body : '';
    els.noteDelete.hidden = !note;
    els.noteError.textContent = '';
    openDialog(els.noteDialog);
    window.setTimeout(() => els.noteBody.focus(), 40);
  }

  async function submitNote(event) {
    event.preventDefault();
    els.noteError.textContent = '';
    const payload = {
      id: Number(els.noteId.value || 0),
      title: els.noteName.value,
      body: els.noteBody.value
    };
    if (!payload.body.trim()) {
      els.noteError.textContent = 'La nota no puede estar vacía.';
      els.noteBody.focus();
      return;
    }
    const submitButton = els.noteForm.querySelector('button[type="submit"]');
    setBusy(submitButton, true);
    try {
      await apiPost('note_save', payload);
      closeDialog(els.noteDialog);
      toast(payload.id ? 'Nota actualizada.' : 'Nota creada.');
      render();
    } catch (error) {
      els.noteError.textContent = error.message;
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function archiveNote(id) {
    try {
      await apiPost('note_archive', { id });
      render();
    } catch (error) {
      toast(error.message, true);
    }
  }

  async function deleteNote(id) {
    try {
      await apiPost('note_delete', { id });
      toast('Nota borrada.');
      render();
    } catch (error) {
      toast(error.message, true);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Audio: grabación                                                    */
  /* ------------------------------------------------------------------ */

  const rec = {
    stream: null,
    recorder: null,
    chunks: [],
    audioContext: null,
    analyser: null,
    raf: 0,
    timer: 0,
    autoStop: 0,
    startedAt: 0,
    mime: 'audio/webm'
  };

  function drawWaveform() {
    if (!rec.analyser || !els.recCanvas) return;
    const canvas = els.recCanvas;
    const context = canvas.getContext('2d');
    const bufferLength = rec.analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    const width = canvas.width;
    const height = canvas.height;

    const loop = () => {
      rec.raf = window.requestAnimationFrame(loop);
      rec.analyser.getByteFrequencyData(data);
      context.clearRect(0, 0, width, height);
      const bars = 72;
      const step = Math.max(1, Math.floor(bufferLength / bars));
      const barWidth = width / bars;
      for (let index = 0; index < bars; index += 1) {
        let sum = 0;
        for (let inner = 0; inner < step; inner += 1) {
          sum += data[index * step + inner] || 0;
        }
        const value = sum / step / 255;
        const barHeight = Math.max(3, value * height * 0.92);
        const x = index * barWidth;
        const y = (height - barHeight) / 2;
        const gradient = context.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, 'rgba(0, 208, 208, 0.95)');
        gradient.addColorStop(1, 'rgba(38, 198, 38, 0.75)');
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect ? context.roundRect(x + 1, y, Math.max(2, barWidth - 2), barHeight, 2) : context.rect(x + 1, y, Math.max(2, barWidth - 2), barHeight);
        context.fill();
      }
    };
    loop();
  }

  function updateRecTimer() {
    const elapsed = Date.now() - rec.startedAt;
    els.recTimer.textContent = `${pad(Math.floor(elapsed / 60000))}:${pad(Math.floor((elapsed % 60000) / 1000))}`;
  }

  async function startRecording() {
    if (rec.recorder && rec.recorder.state === 'recording') return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      toast('Este navegador no permite grabar audio. Prueba con Chrome o Safari actualizado.', true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mime = candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || '';
      const options = mime ? { mimeType: mime } : {};
      try {
        options.audioBitsPerSecond = 32000;
      } catch (error) {
        /* opción no soportada */
      }
      const recorder = new MediaRecorder(stream, options);
      rec.stream = stream;
      rec.recorder = recorder;
      rec.chunks = [];
      rec.startedAt = Date.now();
      rec.mime = recorder.mimeType || mime || 'audio/webm';

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) rec.chunks.push(event.data);
      };
      recorder.onstop = async () => {
        window.clearInterval(rec.timer);
        stopWaveform();
        closeDialog(els.recDialog);
        els.micBtn.classList.remove('is-recording');
        const duration = Date.now() - rec.startedAt;
        const chunks = rec.chunks.slice();
        cleanupRecorder();
        if (rec.cancelled) {
          rec.cancelled = false;
          return;
        }
        if (duration < 800 || !chunks.length) {
          toast('Grabación demasiado corta. Prueba a hablar un poco más.', true);
          return;
        }
        const blobType = (rec.mime || 'audio/webm').split(';')[0];
        const extension = blobType.includes('mp4') ? 'm4a' : blobType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunks, { type: blobType });
        await uploadAudio(blob, duration, `nota-${Date.now()}.${extension}`);
      };

      recorder.start(250);
      setupWaveform(stream);
      els.micBtn.classList.add('is-recording');
      els.recTimer.textContent = '00:00';
      updateRecTimer();
      rec.timer = window.setInterval(updateRecTimer, 200);
      rec.autoStop = window.setTimeout(() => stopRecording(false), 5 * 60 * 1000);
      openDialog(els.recDialog);
    } catch (error) {
      toast(`No se pudo acceder al micrófono. ${error.message || 'Revisa los permisos del navegador.'}`, true);
    }
  }

  function setupWaveform(stream) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      rec.audioContext = new AudioContextClass();
      rec.analyser = rec.audioContext.createAnalyser();
      rec.analyser.fftSize = 256;
      const source = rec.audioContext.createMediaStreamSource(stream);
      source.connect(rec.analyser);
      drawWaveform();
    } catch (error) {
      /* sin waveform, la grabación sigue funcionando */
    }
  }

  function stopWaveform() {
    if (rec.raf) window.cancelAnimationFrame(rec.raf);
    rec.raf = 0;
  }

  function cleanupRecorder() {
    window.clearTimeout(rec.autoStop);
    window.clearInterval(rec.timer);
    stopWaveform();
    if (rec.stream) {
      rec.stream.getTracks().forEach((track) => track.stop());
    }
    if (rec.audioContext) {
      rec.audioContext.close().catch(() => {});
    }
    rec.stream = null;
    rec.recorder = null;
    rec.audioContext = null;
    rec.analyser = null;
  }

  function stopRecording(cancelled) {
    if (!rec.recorder) {
      closeDialog(els.recDialog);
      return;
    }
    rec.cancelled = !!cancelled;
    if (rec.recorder.state === 'recording') {
      try {
        rec.recorder.stop();
      } catch (error) {
        cleanupRecorder();
        closeDialog(els.recDialog);
      }
    }
  }

  async function uploadAudio(blob, durationMs, filename) {
    toast('Subiendo audio…');
    const formData = new FormData();
    formData.append('action', 'audio_upload');
    formData.append('audio', blob, filename);
    formData.append('duration_ms', String(Math.round(durationMs)));
    try {
      const response = await fetch('api.php?action=audio_upload', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': state.csrf, Accept: 'application/json' },
        body: formData
      });
      const payload = await response.json();
      if (response.status === 401) {
        showLogin();
        return;
      }
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'No se pudo subir el audio.');
      }
      applyState(payload);
      state.tab = 'notas';
      if (location.hash !== '#notas') history.replaceState(null, '', '#notas');
      render();
      toast('Audio guardado. Transcribiendo…');
      pollAudio(payload.audio_id);
    } catch (error) {
      toast(error.message, true);
    }
  }

  async function retryAudio(id) {
    try {
      await apiPost('audio_retry', { id });
      toast('Reintentando la transcripción…');
      render();
      pollAudio(id);
    } catch (error) {
      toast(error.message, true);
    }
  }

  async function pollAudio(id) {
    if (state.pollTimers.has(id)) return;
    const token = { cancelled: false };
    state.pollTimers.set(id, token);
    const started = Date.now();
    while (!token.cancelled && Date.now() - started < AUDIO_POLL_MAX_MS) {
      await sleep(AUDIO_POLL_MS);
      if (token.cancelled) break;
      try {
        const payload = await apiGet('audio_status', { id });
        const audio = payload.audio;
        if (state.tab === 'notas' || state.tab === 'hoy') render({ preserveFocus: true });
        if (audio.status === 'transcribed') {
          state.pollTimers.delete(id);
          if (!state.autoOpened.has(id)) {
            state.autoOpened.add(id);
            state.autoOpened.add(Number(id));
            state.tab = 'notas';
            history.replaceState(null, '', '#notas');
            render();
            openReviewDialog(id);
          }
          toast('Transcripción lista.');
          return;
        }
        if (audio.status === 'failed') {
          state.pollTimers.delete(id);
          toast(audio.last_error || 'No se pudo transcribir el audio.', true);
          return;
        }
      } catch (error) {
        /* reintento silencioso hasta agotar el tiempo */
      }
    }
    state.pollTimers.delete(id);
  }

  function resumePolling() {
    state.audios
      .filter((audio) => audio.status === 'uploaded' || audio.status === 'transcribing')
      .forEach((audio) => pollAudio(audio.id));
  }

  /* ------------------------------------------------------------------ */
  /* Audio: revisión de la transcripción                                 */
  /* ------------------------------------------------------------------ */

  const review = {
    audioId: 0,
    noteId: 0,
    type: 'note',
    suggestion: null
  };

  function openReviewDialog(audioId) {
    const audio = state.audios.find((item) => Number(item.id) === Number(audioId));
    if (!audio) return;
    const note = state.notes.find((item) => Number(item.id) === Number(audio.note_id));
    if (!note) return;
    review.audioId = Number(audio.id);
    review.noteId = Number(note.id);
    review.suggestion = audio.suggestion || null;
    const suggestion = audio.suggestion || {};
    review.type = ['event', 'task', 'note'].includes(suggestion.type) ? suggestion.type : 'note';

    els.reviewAudio.innerHTML = audioAvailable(audio)
      ? `<audio controls preload="metadata" src="audio.php?id=${audio.id}"></audio>`
      : `<p class="muted small">La grabación ya se purgó por retención; la transcripción se conserva.</p>`;
    els.reviewMeta.textContent = `${fmtDuration(audio.duration_ms || 0)} · ${audio.model ? `transcrito con ${audio.model}` : 'transcripción automática'}`;
    els.reviewText.value = note.body || audio.transcript_raw || '';
    els.reviewReason.textContent = suggestion.reason
      ? `Sugerencia automática: ${suggestion.reason}`
      : 'Clasificación automática no disponible; elige tú el tipo.';
    els.reviewError.textContent = '';
    setReviewType(review.type, suggestion);
    openDialog(els.reviewDialog);
    window.setTimeout(() => els.reviewText.focus(), 40);
  }

  function setReviewType(type, suggestion = null) {
    review.type = type;
    $$('.suggestion .chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.reviewType === type));
    });
    const info = suggestion || review.suggestion || {};
    const title = info.title || '';
    let fields = `
      <div class="field">
        <label for="reviewName">Título</label>
        <input id="reviewName" type="text" maxlength="200" value="${esc(title)}">
      </div>`;
    if (type === 'event') {
      const date = info.date || todayISO();
      const start = info.start || '09:00';
      const end = info.end || '10:00';
      fields += `
        <div class="form-grid-3">
          <div class="field">
            <label for="reviewDate">Fecha</label>
            <input id="reviewDate" type="date" value="${esc(date)}">
          </div>
          <div class="field">
            <label for="reviewStart">Inicio</label>
            <input id="reviewStart" type="time" value="${esc(start)}">
          </div>
          <div class="field">
            <label for="reviewEnd">Fin</label>
            <input id="reviewEnd" type="time" value="${esc(end)}">
          </div>
        </div>`;
    } else if (type === 'task') {
      const due = info.due_date || info.date || '';
      fields += `
        <div class="form-grid-2">
          <div class="field">
            <label for="reviewDue">Fecha límite</label>
            <input id="reviewDue" type="date" value="${esc(due)}">
          </div>
          <div class="field">
            <label for="reviewPriority">Prioridad</label>
            <select id="reviewPriority">
              <option value="1"${(info.priority || 2) === 1 ? ' selected' : ''}>Baja</option>
              <option value="2"${(info.priority || 2) === 2 ? ' selected' : ''}>Media</option>
              <option value="3"${(info.priority || 2) === 3 ? ' selected' : ''}>Alta</option>
            </select>
          </div>
        </div>`;
    }
    els.reviewFields.innerHTML = fields;
  }

  async function submitReview(event) {
    event.preventDefault();
    els.reviewError.textContent = '';
    const body = els.reviewText.value.trim();
    if (!body) {
      els.reviewError.textContent = 'La transcripción no puede quedar vacía.';
      els.reviewText.focus();
      return;
    }
    const title = ($('#reviewName') || {}).value || '';
    const payload = {
      note_id: review.noteId,
      type: review.type,
      title,
      body
    };
    if (review.type === 'event') {
      payload.date = ($('#reviewDate') || {}).value || '';
      payload.start = ($('#reviewStart') || {}).value || '';
      payload.end = ($('#reviewEnd') || {}).value || '';
    } else if (review.type === 'task') {
      payload.due_date = ($('#reviewDue') || {}).value || '';
      payload.priority = Number(($('#reviewPriority') || {}).value || 2);
    }
    const submitButton = els.reviewSave;
    setBusy(submitButton, true);
    try {
      await apiPost('convert', payload);
      closeDialog(els.reviewDialog);
      if (review.type === 'event') toast('Cita creada desde la nota de voz.');
      else if (review.type === 'task') toast('Tarea creada desde la nota de voz.');
      else toast('Nota guardada en el inbox.');
      render();
    } catch (error) {
      els.reviewError.textContent = error.message;
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function discardReview() {
    const body = els.reviewText.value.trim();
    try {
      if (body) {
        await apiPost('note_save', {
          id: review.noteId,
          body,
          title: ($('#reviewName') || {}).value || ''
        });
      }
      await apiPost('audio_reviewed', { id: review.audioId });
      closeDialog(els.reviewDialog);
      toast('Se ha quedado como nota.');
      render();
    } catch (error) {
      els.reviewError.textContent = error.message;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Navegación y sesión                                                 */
  /* ------------------------------------------------------------------ */

  function setTab(tab) {
    if (!TABS.includes(tab)) tab = 'hoy';
    state.tab = tab;
    if (location.hash !== `#${tab}`) {
      history.replaceState(null, '', `#${tab}`);
    }
    render();
  }

  function navigateFromHash() {
    const hash = (location.hash || '').replace('#', '');
    if (TABS.includes(hash)) state.tab = hash;
  }

  function showLogin() {
    state.csrf = '';
    els.appView.hidden = true;
    els.loginView.hidden = false;
    els.bootOverlay.hidden = true;
    const password = $('#loginPassword');
    if (password) password.value = '';
    window.setTimeout(() => password && password.focus(), 50);
  }

  function showApp() {
    els.loginView.hidden = true;
    els.appView.hidden = false;
    els.bootOverlay.hidden = true;
  }

  async function loadSession() {
    const status = await authStatus();
    if (!status.auth) {
      showLogin();
      return false;
    }
    state.csrf = status.csrf;
    const payload = await apiGet('state');
    state.lastLoad = Date.now();
    if (!state.calDate) state.calDate = todayISO();
    if (!state.calMode) {
      state.calMode = window.matchMedia('(max-width: 860px)').matches ? 'day' : 'week';
    }
    showApp();
    navigateFromHash();
    render();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                            */
  /* ------------------------------------------------------------------ */

  function cacheElements() {
    els.bootOverlay = $('#bootOverlay');
    els.loginView = $('#loginView');
    els.loginForm = $('#loginForm');
    els.loginPassword = $('#loginPassword');
    els.loginError = $('#loginError');
    els.loginSubmit = $('#loginSubmit');
    els.appView = $('#appView');
    els.mainView = $('#mainView');
    els.viewTitle = $('#viewTitle');
    els.viewSubtitle = $('#viewSubtitle');
    els.contextAddBtn = $('#contextAddBtn');
    els.contextAddLabel = $('#contextAddLabel');
    els.toast = $('#toast');
    els.micBtn = $('#micBtn');
    els.recDialog = $('#recDialog');
    els.recTimer = $('#recTimer');
    els.recCanvas = $('#recCanvas');
    els.recStop = $('#recStop');
    els.recCancel = $('#recCancel');
    els.reviewDialog = $('#reviewDialog');
    els.reviewForm = $('#reviewForm');
    els.reviewAudio = $('#reviewAudio');
    els.reviewMeta = $('#reviewMeta');
    els.reviewText = $('#reviewText');
    els.reviewReason = $('#reviewReason');
    els.reviewFields = $('#reviewFields');
    els.reviewError = $('#reviewError');
    els.reviewSave = $('#reviewSave');
    els.reviewDiscard = $('#reviewDiscard');
    els.eventDialog = $('#eventDialog');
    els.eventForm = $('#eventForm');
    els.eventId = $('#eventId');
    els.eventTitle = $('#eventTitle');
    els.eventName = $('#eventName');
    els.eventDate = $('#eventDate');
    els.eventStart = $('#eventStart');
    els.eventEnd = $('#eventEnd');
    els.eventDescription = $('#eventDescription');
    els.eventColor = $('#eventColor');
    els.eventAllDay = $('#eventAllDay');
    els.eventDelete = $('#eventDelete');
    els.eventError = $('#eventError');
    els.taskDialog = $('#taskDialog');
    els.taskForm = $('#taskForm');
    els.taskId = $('#taskId');
    els.taskTitle = $('#taskTitle');
    els.taskName = $('#taskName');
    els.taskDue = $('#taskDue');
    els.taskPriority = $('#taskPriority');
    els.taskNotes = $('#taskNotes');
    els.taskDelete = $('#taskDelete');
    els.taskError = $('#taskError');
    els.noteDialog = $('#noteDialog');
    els.noteForm = $('#noteForm');
    els.noteId = $('#noteId');
    els.noteKicker = $('#noteKicker');
    els.noteTitle = $('#noteTitle');
    els.noteName = $('#noteName');
    els.noteBody = $('#noteBody');
    els.noteDelete = $('#noteDelete');
    els.noteError = $('#noteError');
    els.confirmDialog = $('#confirmDialog');
    els.confirmText = $('#confirmText');
    els.confirmOk = $('#confirmOk');
    els.confirmCancel = $('#confirmCancel');
  }

  function bindGlobalEvents() {
    $$('.rail-item[data-tab]').forEach((button) => {
      button.addEventListener('click', () => setTab(button.dataset.tab));
    });

    els.contextAddBtn.addEventListener('click', () => {
      if (state.tab === 'tareas') openTaskDialog(null);
      else if (state.tab === 'notas') openNoteDialog(null);
      else openEventDialog(null, state.tab === 'calendario' ? { date: state.calDate || todayISO() } : {});
    });

    els.micBtn.addEventListener('click', startRecording);
    els.recStop.addEventListener('click', () => stopRecording(false));
    els.recCancel.addEventListener('click', () => stopRecording(true));
    els.recDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      stopRecording(true);
    });

    els.mainView.addEventListener('click', onMainClick);

    $('#logoutBtn').addEventListener('click', logout);
    $('#logoutBtnMobile').addEventListener('click', logout);

    els.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      els.loginError.textContent = '';
      const password = els.loginPassword.value;
      if (!password) {
        els.loginError.textContent = 'Escribe la contraseña.';
        return;
      }
      setBusy(els.loginSubmit, true);
      try {
        const payload = await authLogin(password);
        state.csrf = payload.csrf;
        await loadSession();
      } catch (error) {
        els.loginError.textContent = error.message || 'No se pudo iniciar sesión.';
      } finally {
        setBusy(els.loginSubmit, false);
      }
    });

    els.eventForm.addEventListener('submit', submitEvent);
    els.taskForm.addEventListener('submit', submitTask);
    els.noteForm.addEventListener('submit', submitNote);
    els.reviewForm.addEventListener('submit', submitReview);
    els.reviewDiscard.addEventListener('click', discardReview);
    els.eventAllDay.addEventListener('change', syncEventAllDay);
    els.eventDelete.addEventListener('click', () => {
      confirmAction('¿Borrar esta cita?', deleteEvent);
    });
    els.taskDelete.addEventListener('click', () => {
      const id = Number(els.taskId.value || 0);
      if (id) confirmAction('¿Borrar esta tarea?', () => deleteTask(id));
    });
    els.noteDelete.addEventListener('click', () => {
      const id = Number(els.noteId.value || 0);
      if (id) confirmAction('¿Borrar esta nota? Si tiene audio, también se borrará la grabación.', () => deleteNote(id));
    });

    $$('.suggestion .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.reviewType || 'note';
        setReviewType(type);
      });
    });

    els.confirmCancel.addEventListener('click', () => closeDialog(els.confirmDialog));
    els.confirmOk.addEventListener('click', () => {
      const callback = state.confirmCallback;
      state.confirmCallback = null;
      closeDialog(els.confirmDialog);
      if (typeof callback === 'function') callback();
    });
    els.confirmDialog.addEventListener('cancel', () => {
      state.confirmCallback = null;
    });

    $$('dialog [data-close]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(button.closest('dialog')));
    });

    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog || dialog === els.recDialog) return;
        closeDialog(dialog);
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = (location.hash || '').replace('#', '');
      if (TABS.includes(hash) && hash !== state.tab) {
        state.tab = hash;
        render();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.csrf && Date.now() - state.lastLoad > 15000) {
        refreshState();
      }
    });

    window.addEventListener('resize', () => {
      if (!state.realtime) {
        state.realtime = true;
        window.requestAnimationFrame(() => {
          state.realtime = false;
          if (state.tab === 'calendario') render();
        });
      }
    }, { passive: true });
  }

  async function logout() {
    await authLogout();
    state.events = [];
    state.tasks = [];
    state.notes = [];
    state.audios = [];
    state.autoOpened.clear();
    state.pollTimers.clear();
    showLogin();
    history.replaceState(null, '', location.pathname);
  }

  async function init() {
    cacheElements();
    bindGlobalEvents();
    try {
      await loadSession();
    } catch (error) {
      if (/sesión|sesion/i.test(error.message || '')) {
        showLogin();
      } else {
        showLogin();
        els.loginError.textContent = error.message || 'No se pudo cargar la agenda.';
      }
    } finally {
      els.bootOverlay.hidden = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
