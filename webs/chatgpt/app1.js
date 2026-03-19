/* 
  Router mínimo por data-route. 
  Guarda última ruta en localStorage para persistencia. 
  Actualiza una barra de progreso simple (marcamos vistas visitadas).
*/

const ROUTES = ["basico","pro","plantillas"];
const visited = new Set(JSON.parse(localStorage.getItem("visited_routes") || "[]"));

function showRoute(route){
  ROUTES.forEach(r=>{
    const view = document.querySelector(`#view-${r}`);
    if(!view) return;
    view.hidden = r !== route;
  });
  // Marcar visitado y persistir
  visited.add(route);
  localStorage.setItem("visited_routes", JSON.stringify(Array.from(visited)));
  updateProgress();
  localStorage.setItem("last_route", route);
}

function updateProgress(){
  // Progreso simple: nº de vistas visitadas / total
  const pct = Math.round((visited.size / ROUTES.length) * 100);
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  if(fill) fill.style.width = `${pct}%`;
  if(label) label.textContent = `Progreso: ${pct}%`;
}

function initNav(){
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const route = btn.dataset.route;
      showRoute(route);
    });
  });
}

function init(){
  initNav();
  // Recuperar la última ruta o abrir Básico
  const last = localStorage.getItem("last_route") || "basico";
  showRoute(ROUTES.includes(last) ? last : "basico");
}

document.addEventListener("DOMContentLoaded", init);
