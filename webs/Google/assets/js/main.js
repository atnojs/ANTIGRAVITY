
// Simple router-like page loader for resource cards
async function loadResources({ targetId, filter = {} }) {
  const el = document.getElementById(targetId);
  if (!el) return;
  try {
    const res = await fetch('assets/data/resources.json');
    const data = await res.json();
    const items = data.resources.filter(item => {
      let ok = true;
      if (filter.level) ok = ok && item.levels.includes(filter.level);
      if (filter.topic) ok = ok && item.topics.includes(filter.topic);
      if (filter.type)  ok = ok && item.type === filter.type;
      return ok;
    });
    el.innerHTML = items.map(renderCard).join('');
  } catch (e) {
    el.innerHTML = '<p class="small">No se pudieron cargar los recursos.</p>';
  }
}

function renderCard(item) {
  const tags = item.tags.map(t => `<span class="badge">${t}</span>`).join(' ');
  return `
  <article class="card">
    <div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div class="meta mt-2">
        ${tags}
        <span class="badge ok">Oficial</span>
      </div>
    </div>
    <div class="actions">
      <a class="btn" href="${item.url}" target="_blank" rel="noopener">Abrir guía</a>
    </div>
  </article>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

// Search on index page
async function runSearch(query) {
  const res = await fetch('assets/data/resources.json');
  const data = await res.json();
  const q = query.trim().toLowerCase();
  const items = data.resources.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    r.tags.join(' ').toLowerCase().includes(q)
  );
  const grid = document.getElementById('search-results');
  if (!grid) return;
  grid.innerHTML = items.map(renderCard).join('');
}

// Theme toggle (optional enhancement)
(function themeInit(){
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.documentElement.style.setProperty('--bg','#f7fafc');
})();
