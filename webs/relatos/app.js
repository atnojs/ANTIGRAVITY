/* App de la biblioteca de relatos — SPA con hash routing, sin dependencias. v3 */
(function () {
  "use strict";

  const DATA = (window.RELATOS_DATA || { relatos: [], tematicas: [] });
  const RELATOS = DATA.relatos;
  const TEMATICAS = DATA.tematicas;

  // Emojis y colores por temática
  const CAT_STYLE = {
    "primos":            { emoji: "👨‍👩‍👧", color: "#c9a227" },
    "cunados":           { emoji: "🏖️", color: "#e0483d" },
    "desconocidos":      { emoji: "🚆", color: "#4d96ff" },
    "trios-intercambio": { emoji: "🔥", color: "#ff6b9d" },
    "infidelidad":       { emoji: "💋", color: "#e0483d" },
    "vecinos":           { emoji: "🏠", color: "#38b000" },
    "oficina":           { emoji: "💼", color: "#9d4edd" },
    "ex-parejas":        { emoji: "💔", color: "#ff7b00" },
    "amigos":            { emoji: "🍷", color: "#c9184a" },
    "vacaciones":        { emoji: "✈️", color: "#00b4d8" },
    "gimnasio":          { emoji: "💪", color: "#f72585" },
    "profesor-alumna":   { emoji: "📚", color: "#7209b7" },
    "mudanza":           { emoji: "📦", color: "#f4a261" },
    "apagon":            { emoji: "🕯️", color: "#8d99ae" },
    "clases-de-baile":   { emoji: "💃", color: "#e63946" },
    "cita-a-ciegas":     { emoji: "🌹", color: "#d00000" },
    "reencuentro":       { emoji: "⏳", color: "#457b9d" },
    "casa-rural":        { emoji: "🌲", color: "#2d6a4f" },
    "lavanderia":        { emoji: "🧺", color: "#48cae4" },
    "taller-ceramica":   { emoji: "🏺", color: "#bc6c25" },
  };
  const catStyle = (slug) => CAT_STYLE[slug] || { emoji: "📖", color: "#c9a227" };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- Relatos leídos (persistencia en servidor vía HistoryManager) ----
  let readSet = new Set();
  let historyManager;

  const ALIAS_KEY = 'relatos-alias';

  function getAlias() {
    try { return localStorage.getItem(ALIAS_KEY) || ''; } catch (_) { return ''; }
  }

  function setAlias(alias) {
    try { localStorage.setItem(ALIAS_KEY, alias); } catch (_) {}
  }

  function clearAlias() {
    try { localStorage.removeItem(ALIAS_KEY); } catch (_) {}
  }

  function sanitizeAlias(raw) {
    return raw.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _-]/g, '').trim().slice(0, 30) || 'anonimo';
  }

  async function initHistory() {
    const alias = getAlias();
    if (!alias) return;
    historyManager = new HistoryManager('relatos-read-' + sanitizeAlias(alias));
    try {
      await historyManager.load();
      readSet.clear();
      const entries = historyManager.getAll();
      entries.forEach(function(entry) {
        if (entry.type === 'read' && entry.data && entry.data.storyId) {
          readSet.add(entry.data.storyId);
        }
      });
      // Migración única desde localStorage si el servidor está vacío
      if (readSet.size === 0) {
        try {
          const local = JSON.parse(localStorage.getItem('relatos-leidos') || '[]');
          if (local.length > 0) {
            for (const id of local) {
              readSet.add(id);
              await historyManager.save({ id: id, type: 'read', data: { storyId: id } });
            }
            localStorage.removeItem('relatos-leidos');
          }
        } catch (_) { /* ignorar errores de migración */ }
      }
    } catch (e) {
      console.warn('Servidor de historial no disponible:', e);
    }
  }

  function getRead() {
    return readSet;
  }

  async function markRead(id) {
    if (readSet.has(id)) return;
    readSet.add(id);
    if (historyManager) {
      try {
        await historyManager.save({ id: id, type: 'read', data: { storyId: id } });
      } catch (e) {
        console.warn('No se pudo guardar en el servidor:', e);
      }
    }
  }
  const CHECK_SVG = '<svg fill="none" viewBox="0 0 24 24" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>';

  // ---- Conteo de leídos por categoría ----
  function countReadInCategory(slug) {
    const read = getRead();
    return RELATOS.filter(function (r) { return r.tematica === slug && read.has(r.id); }).length;
  }
  function fmtReadLabel(total, read) {
    if (total === 0) return "Próximamente";
    var label = total + (total === 1 ? " relato" : " relatos");
    if (read > 0) label += " · " + read + (read === 1 ? " leído" : " leídos");
    if (read === total && total > 0) label += " ✓";
    return label;
  }

  // ---- Tarjeta de relato ----
  function storyCard(r) {
    const card = el("div", "story-card");
    const isRead = getRead().has(r.id);
    if (isRead) card.classList.add("read");
    card.onclick = () => { location.hash = "#/relato/" + r.id; };
    const regClass = r.registro === "Malote" ? "reg-malote" : "reg-literario";
    card.innerHTML = `
      ${isRead ? `<span class="read-mark">${CHECK_SVG}Leído</span>` : ""}
      <div class="badges">
        <span class="badge tem">${esc(r.tematicaLabel)}</span>
        <span class="badge ${regClass}">${esc(r.registro)}</span>
        <span class="badge fmt">${esc(r.formato)}</span>
      </div>
      <h3>${esc(r.title)}</h3>
      <div class="pers">${esc(r.personajes)}</div>
      <div class="meta">
        <span>⏱ ${r.minutes} min</span>
        <span>📝 ${r.words.toLocaleString("es")} palabras</span>
        ${r.narrador !== "—" ? `<span>🗣 ${esc(r.narrador)}</span>` : ""}
        ${r.fecha ? `<span>📅 ${esc(r.fecha)}</span>` : ""}
      </div>`;
    return card;
  }

  // ---- HOME ----
  function renderHome() {
    $("#stat-relatos").textContent = RELATOS.length;
    $("#stat-cats").textContent = TEMATICAS.filter((t) => t.count > 0).length;

    const grid = $("#catGrid");
    grid.innerHTML = "";
    TEMATICAS.forEach((t) => {
      const st = catStyle(t.slug);
      const c = el("div", "cat-card" + (t.count === 0 ? " empty" : ""));
      c.style.setProperty("--cat-color", st.color);
      const readCount = countReadInCategory(t.slug);
      c.innerHTML = `
        <div class="emoji">${st.emoji}</div>
        <h3>${esc(t.label)}</h3>
        <div class="n">${fmtReadLabel(t.count, readCount)}</div>`;
      if (t.count > 0) c.onclick = () => { location.hash = "#/cat/" + t.slug; };
      grid.appendChild(c);
    });

    const recent = $("#recentGrid");
    recent.innerHTML = "";
    // Ordenar por fecha (más recientes primero); fecha en formato DD/MM/YYYY
    const parseFecha = (f) => {
      if (!f) return 0;
      const m = String(f).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (!m) return 0;
      let y = parseInt(m[3], 10); if (y < 100) y += 2000;
      return new Date(y, parseInt(m[2],10)-1, parseInt(m[1],10)).getTime();
    };
    RELATOS.slice()
      .sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))
      .slice(0, 6)
      .forEach((r) => recent.appendChild(storyCard(r)));
  }

  // ---- LISTADO / CATEGORÍA ----
  let listState = { slug: null, reg: "todos", fmt: "todos" };

  function renderList(slug) {
    listState.slug = slug;
    const t = TEMATICAS.find((x) => x.slug === slug);
    $("#listTitle").textContent = t ? t.label : "Todos los relatos";

    // Filtros
    const f = $("#listFilters");
    f.innerHTML = "";
    const addChip = (label, group, value) => {
      const active = listState[group] === value;
      const chip = el("button", "chip" + (active ? " active" : ""), label);
      chip.onclick = () => { listState[group] = value; applyList(); };
      f.appendChild(chip);
    };
    addChip("Todos", "reg", "todos");
    addChip("Literario", "reg", "Literario");
    addChip("Malote", "reg", "Malote");
    f.appendChild(el("span", "sep"));
    addChip("Corto", "fmt", "todos");        // placeholder replaced below
    f.lastChild.textContent = "Cualquiera";
    f.lastChild.onclick = () => { listState.fmt = "todos"; applyList(); };
    addChip("Corto", "fmt", "Corto");
    addChip("Serie", "fmt", "Serie");

    applyList();
  }

  function applyList() {
    // refresca estado visual de chips
    renderChipsActive();
    const grid = $("#listGrid");
    grid.innerHTML = "";
    let items = RELATOS.filter((r) => r.tematica === listState.slug);
    if (listState.reg !== "todos") items = items.filter((r) => r.registro === listState.reg);
    if (listState.fmt !== "todos") items = items.filter((r) => r.formato === listState.fmt);

    $("#listCount").textContent = fmtReadLabel(items.length, items.filter(function (r) { return getRead().has(r.id); }).length);

    if (items.length === 0) {
      grid.appendChild(emptyState("Sin resultados con estos filtros."));
      return;
    }
    items.forEach((r) => grid.appendChild(storyCard(r)));
  }

  function renderChipsActive() {
    document.querySelectorAll("#listFilters .chip").forEach((chip) => {
      const txt = chip.textContent;
      let on = false;
      if (["Todos"].includes(txt) && listState.reg === "todos") on = true;
      if (txt === "Literario" && listState.reg === "Literario") on = true;
      if (txt === "Malote" && listState.reg === "Malote") on = true;
      if (txt === "Cualquiera" && listState.fmt === "todos") on = true;
      if (txt === "Corto" && listState.fmt === "Corto") on = true;
      if (txt === "Serie" && listState.fmt === "Serie") on = true;
      chip.classList.toggle("active", on);
    });
  }

  function emptyState(msg) {
    const e = el("div", "empty-state");
    e.innerHTML = `<div class="big">🔍</div><p>${esc(msg)}</p>`;
    return e;
  }

  // ---- BÚSQUEDA ----
  function renderSearch(q) {
    switchView("view-list");
    $("#listTitle").textContent = "Resultados: “" + q + "”";
    $("#listFilters").innerHTML = "";
    const grid = $("#listGrid");
    grid.innerHTML = "";
    const ql = q.toLowerCase();
    const items = RELATOS.filter((r) =>
      (r.title + " " + r.tematicaLabel + " " + r.personajes + " " + r.registro + " " + r.formato + " " + r.body)
        .toLowerCase().includes(ql)
    );
    $("#listCount").textContent = fmtReadLabel(items.length, items.filter(function (r) { return getRead().has(r.id); }).length);
    if (items.length === 0) { grid.appendChild(emptyState("No hay relatos que coincidan con tu búsqueda.")); return; }
    items.forEach((r) => grid.appendChild(storyCard(r)));
  }

  // ---- LECTOR ----
  function bodyToHtml(body) {
    const blocks = body.split(/\n\s*\n/);
    return blocks.map((b) => {
      const t = b.trim();
      if (t === "---" || /^\*+$/.test(t)) return '<hr>';
      // markdown básico: **negrita**, *cursiva*
      let html = esc(t)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
      return "<p>" + html + "</p>";
    }).join("\n");
  }

  function renderReader(id) {
    const r = RELATOS.find((x) => x.id === id);
    const c = $("#readerContent");
    if (!r) { c.innerHTML = ""; c.appendChild(emptyState("Relato no encontrado.")); return; }

    const regClass = r.registro === "Malote" ? "reg-malote" : "reg-literario";
    c.innerHTML = `
      <div class="reader-head">
        <div class="badges">
          <span class="badge tem">${esc(r.tematicaLabel)}</span>
          <span class="badge ${regClass}">${esc(r.registro)}</span>
          <span class="badge fmt">${esc(r.formatoFull || r.formato)}</span>
        </div>
        <h1>${esc(r.title)}</h1>
        <div class="fichaline"><b>Personajes:</b> ${esc(r.personajes)}</div>
        ${r.pov ? `<div class="fichaline"><b>Narración:</b> ${esc(r.pov)}</div>` : ""}
        <div class="reader-meta">
          <span>⏱ ${r.minutes} min de lectura</span>
          <span>📝 ${r.words.toLocaleString("es")} palabras</span>
          ${r.fecha ? `<span>📅 ${esc(r.fecha)}</span>` : ""}
        </div>
      </div>
      <div class="reader-toolbar">
        <span>Tamaño de letra</span>
        <button id="fontDown" aria-label="Reducir letra">A−</button>
        <button id="fontUp" aria-label="Aumentar letra">A+</button>
      </div>
      <div class="reader-body" id="readerBody">${bodyToHtml(r.body)}</div>
      <div class="read-action">
        <button class="btn-read" id="btnRead"></button>
      </div>`;

    // Control de tamaño de fuente
    $("#fontUp").onclick = () => changeFont(1);
    $("#fontDown").onclick = () => changeFont(-1);

    // Botón "marcar como leído" (solo al pulsarlo)
    renderReadButton(r.id);

    // Navegación de serie: mismos títulos base con -capN
    renderSeriesNav(r);
    window.scrollTo(0, 0);
  }

  const CHECK_SVG_BIG = '<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>';
  const CIRCLE_SVG = '<svg fill="none" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>';

  function renderReadButton(id) {
    const btn = $("#btnRead");
    if (!btn) return;
    const paint = () => {
      const done = getRead().has(id);
      btn.classList.toggle("done", done);
      btn.innerHTML = done
        ? CHECK_SVG_BIG + "Leído"
        : CIRCLE_SVG + "Marcar como leído";
    };
    btn.onclick = async () => {
      if (getRead().has(id)) return; // ya leído: no hace nada
      await markRead(id);
      paint();
    };
    paint();
  }

  function renderSeriesNav(r) {
    if (r.formato !== "Serie") return;
    const m = r.id.match(/^(.*?)(?:-cap(\d+))?$/);
    // Buscar relatos de la misma serie por prefijo del título base
    const base = r.id.replace(/-cap\d+$/, "");
    const serie = RELATOS.filter((x) => x.formato === "Serie" && x.id.replace(/-cap\d+$/, "") === base)
      .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }));
    if (serie.length < 2) return;
    const idx = serie.findIndex((x) => x.id === r.id);
    const prev = serie[idx - 1], next = serie[idx + 1];
    const nav = el("div", "series-nav");
    nav.innerHTML =
      (prev ? `<a href="#/relato/${prev.id}"><small>← Anterior</small><b>${esc(prev.title)}</b></a>` : `<span></span>`) +
      (next ? `<a class="next" href="#/relato/${next.id}"><small>Siguiente →</small><b>${esc(next.title)}</b></a>` : `<span></span>`);
    $("#readerBody").after(nav);
  }

  let fontStep = 0;
  function changeFont(d) {
    fontStep = Math.max(-2, Math.min(4, fontStep + d));
    const size = 1.15 + fontStep * 0.08;
    document.documentElement.style.setProperty("--read-size", size + "rem");
  }

  // ---- ROUTER ----
  function switchView(id) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    $("#" + id).classList.add("active");
  }

  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    if (!h) { switchView("view-home"); renderHome(); window.scrollTo(0, 0); return; }
    const parts = h.split("/");
    if (parts[0] === "cat" && parts[1]) {
      switchView("view-list");
      listState = { slug: parts[1], reg: "todos", fmt: "todos" };
      renderList(parts[1]);
      window.scrollTo(0, 0);
    } else if (parts[0] === "relato" && parts[1]) {
      switchView("view-reader");
      renderReader(parts.slice(1).join("/"));
    } else {
      switchView("view-home");
      renderHome();
    }
  }

  // ---- Búsqueda con debounce ----
  let searchTimer;
  function initSearch() {
    const input = $("#search");
    input.addEventListener("input", () => {
      clearTimeout(searchTimer);
      const q = input.value.trim();
      searchTimer = setTimeout(() => {
        if (q.length === 0) { location.hash = ""; return; }
        if (q.length >= 2) renderSearch(q);
      }, 180);
    });
  }

  // ---- Tema claro/oscuro ----
  function initTheme() {
    const saved = localStorage.getItem("relatos-theme");
    if (saved === "light") { document.body.classList.add("light"); $("#themeToggle").textContent = "☀️"; }
    $("#themeToggle").onclick = () => {
      document.body.classList.toggle("light");
      const light = document.body.classList.contains("light");
      $("#themeToggle").textContent = light ? "☀️" : "🌙";
      localStorage.setItem("relatos-theme", light ? "light" : "dark");
    };
  }

  // ---- Alias (selector de usuario) ----
  function showAliasOverlay() {
    const overlay = document.getElementById('aliasOverlay');
    if (overlay) overlay.classList.remove('hidden');
    const input = document.getElementById('aliasInput');
    if (input) { input.value = ''; setTimeout(function() { input.focus(); }, 100); }
  }

  function hideAliasOverlay() {
    const overlay = document.getElementById('aliasOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  async function handleAliasEnter() {
    const input = document.getElementById('aliasInput');
    const raw = (input && input.value) ? input.value : '';
    const alias = sanitizeAlias(raw);
    setAlias(alias);
    hideAliasOverlay();
    await initHistory();
    renderHome();
    window.scrollTo(0, 0);
  }

  function handleUserSwitch() {
    clearAlias();
    readSet.clear();
    if (historyManager) historyManager = null;
    switchView('view-home');
    showAliasOverlay();
  }

  async function startApp() {
    const alias = getAlias();
    if (alias) {
      hideAliasOverlay();
      await initHistory();
      route();
    } else {
      showAliasOverlay();
      switchView('view-home');
      renderHome();
    }
  }

  // ---- Init ----
  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", function() {
    initTheme();
    initSearch();

    // Wire alias UI
    const aliasEnter = document.getElementById('aliasEnter');
    if (aliasEnter) aliasEnter.addEventListener('click', handleAliasEnter);
    const aliasInput = document.getElementById('aliasInput');
    if (aliasInput) aliasInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleAliasEnter();
    });
    const userBtn = document.getElementById('userBtn');
    if (userBtn) userBtn.addEventListener('click', handleUserSwitch);

    startApp();
  });
})();
