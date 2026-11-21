// Pruebas de la API de apps/descargas (se ejecutan contra una copia local con\n// auth.php de prueba; ver tools/pruebas/LEEME-descargas.md).\n//   API_BASE=http://127.0.0.1:4305 node descargas-api-test.mjs\n// Pruebas de comportamiento de la API de Descargas (copia local de pruebas).
// Siembra la cola al empezar, así se puede repetir las veces que haga falta.
import fs from 'node:fs';

const BASE = process.env.API_BASE || 'http://127.0.0.1:4303';
const API = BASE + '/api.php';
const AUTH = BASE + '/auth.php';
const DIR = 'E:/ANTIGRAVITY/.tmp-build/descargas-test';
const cfg = JSON.parse(fs.readFileSync('E:/ANTIGRAVITY/.private/descargas-worker.json', 'utf8'));

function trabajo(id, status, orden, title, extra = {}) {
  return {
    id, url: 'https://www.youtube.com/watch?v=' + id, mode: 'audio', quality: 'best', format: 'mp3',
    fuente: 'youtube', playlist: false, origen: 'fuera', subir: true, status, percent: 0,
    speed: '', eta: '', stage: '', title, item_index: 0, item_count: 0, items: [], error: '',
    cancel_requested: false, pause_requested: false, attempts: 1,
    created_at: '2026-11-21T14:00:00+00:00', updated_at: '2026-11-21T14:01:00+00:00',
    started_at: '', finished_at: '', orden, limit_rate: '',
    ...extra,
  };
}

function sembrar() {
  const ahora = new Date().toISOString();
  const jobs = [
    trabajo('j_run01', 'running', 1, 'Clase de guitarra', { percent: 42.5, speed: '3.21MiB/s', eta: '00:35', stage: 'descargando', started_at: ahora, updated_at: ahora, created_at: ahora, item_index: 1, item_count: 2 }),
    trabajo('j_q0001', 'queued', 2, 'Podcast número 12'),
    trabajo('j_q0002', 'queued', 3, 'Directo del sábado', { mode: 'video', format: 'mp4', quality: '1080' }),
    trabajo('j_paus1', 'paused', 4, 'Documental del mar', { percent: 12, stage: 'en pausa' }),
    trabajo('j_done1', 'done', 0, 'Charla completa', { percent: 100, stage: 'completado', finished_at: '2026-11-21T13:55:00+00:00', items: [{ id: 'i_aaa1', title: 'charla.mp3', filename: 'charla.mp3', bytes: 5242880, ext: 'mp3', duration: 125, file: 'data/files/x', local: false, ruta_local: 'D:\\Descargas Y, I y T\\charla.mp3', subir_pedido: false }] }),
    trabajo('j_err01', 'error', 0, 'Vídeo privado', { error: 'El vídeo no está disponible: puede ser privado, estar borrado o restringido por país. || yt-dlp código 1: ERROR: Private video', error_pista: 'El vídeo no está disponible: puede ser privado, estar borrado o restringido por país.', error_clase: 'nodisponible', log_tail: '[youtube] xyz: Downloading webpage', comando: 'D:\\Vídeos\\ytdownloader\\yt-dlp.exe --newline https://www.youtube.com/watch?v=xyz' }),
    trabajo('j_err02', 'error', 0, 'Necesita iniciar sesión', { error: 'YouTube exige comprobar que no eres un robot. Necesita cookies. || Sign in to confirm you are not a bot', error_pista: 'YouTube exige comprobar que no eres un robot. Necesita cookies: exporta las del navegador a un cookies.txt.', error_clase: 'login', log_tail: 'ERROR: Sign in to confirm you are not a bot', comando: 'D:\\Vídeos\\ytdownloader\\yt-dlp.exe --newline ...' }),
    trabajo('j_err03', 'error', 0, 'Enlace de una web nueva', { error: 'Esa dirección no es de una web que yt-dlp sepa descargar. || Unsupported URL: https://ejemplo.com/video', error_pista: 'Esa dirección no es de una web que yt-dlp sepa descargar.', error_clase: 'actualizar', log_tail: 'ERROR: Unsupported URL: https://ejemplo.com/video', comando: 'D:\\Vídeos\\ytdownloader\\yt-dlp.exe --newline https://ejemplo.com/video' }),
  ];
  fs.writeFileSync(DIR + '/data/queue.json', JSON.stringify({ jobs, paused: false }, null, 1), 'utf8');
}

const fallos = [];
function ok(nombre, cond, extra = '') {
  console.log((cond ? 'OK   ' : 'FALLO') + '  ' + nombre + (extra ? '  -> ' + extra : ''));
  if (!cond) fallos.push(nombre);
}

async function api(accion, cuerpo = {}, worker = false, cookie = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (worker) headers['X-Worker-Token'] = cfg.token;
  const r = await fetch(API + '?action=' + accion, { method: 'POST', headers, body: JSON.stringify(cuerpo) });
  try { return await r.json(); } catch { return {}; }
}

sembrar();
const rAuth = await fetch(AUTH);
const cookie = (rAuth.headers.get('set-cookie') || '').split(';')[0];
const a = await rAuth.json();
ok('auth.php da sesion', a.success === true && a.auth === true);

const pide = (accion, cuerpo, worker) => api(accion, cuerpo, worker, cookie);
const lista = () => pide('list', {});
const ordenCola = (jobs) => jobs.filter((j) => j.status === 'queued').sort((x, y) => x.orden - y.orden).map((j) => j.id).join(',');

let l = await lista();
ok('list devuelve 8 trabajos', l.success === true && l.jobs.length === 8, 'jobs=' + (l.jobs || []).length);
ok('list trae pausado=false', l.pausado === false);
ok('cola inicial ordenada', ordenCola(l.jobs) === 'j_q0001,j_q0002', ordenCola(l.jobs));
ok('fallo clasificado con pista y registro', (() => { const e = l.jobs.find((j) => j.error_clase === 'login'); return !!e && !!e.error_pista && !!e.log_tail && !!e.comando; })());

let r = await pide('move', { job_id: 'j_q0002', dir: 'up' });
l = await lista();
ok('move up cambia el orden', r.success === true && r.movido === true && ordenCola(l.jobs) === 'j_q0002,j_q0001', ordenCola(l.jobs));
r = await pide('move', { job_id: 'j_q0002', dir: 'up' });
ok('mover el primero hacia arriba no hace nada', r.success === true && r.movido === false);

r = await pide('pause', { job_id: 'j_q0001' });
l = await lista();
ok('pausar una descarga en cola la deja en pausa', r.success === true && l.jobs.find((j) => j.id === 'j_q0001').status === 'paused');
r = await pide('resume', { job_id: 'j_q0001' });
ok('reanudar la devuelve a la cola', r.success === true && (await lista()).jobs.find((j) => j.id === 'j_q0001').status === 'queued');

r = await pide('pause', { job_id: 'j_run01' });
l = await lista();
const run = l.jobs.find((j) => j.id === 'j_run01');
ok('pausar una descarga en curso pide parar', r.success === true && run.pause_requested === true && run.stage.includes('pausando'), JSON.stringify({ pr: run.pause_requested, st: run.stage }));

r = await pide('pause_all');
l = await lista();
ok('pause_all marca la cola en pausa', r.success === true && l.pausado === true);
ok('pause_all deja la cola sin "queued"', l.jobs.filter((j) => j.status === 'queued').length === 0);
r = await pide('resume_all');
l = await lista();
ok('resume_all devuelve la cola a en cola', r.success === true && l.pausado === false && l.jobs.some((j) => j.status === 'queued'));

r = await pide('update_tool', { tool: 'ytdlp' });
ok('update_tool acepta la peticion', r.success === true, JSON.stringify(r));
let nextW = await pide('next', {}, true);
ok('el worker recibe la herramienta', nextW.herramienta === 'ytdlp', String(nextW.herramienta));
await api('tool_result', { tool: 'ytdlp', ok: true, message: 'actualizado' }, true);
const st = await pide('tool_status');
ok('tool_status devuelve hecho', st.estado === 'hecha' && st.ok === true && st.mensaje === 'actualizado', JSON.stringify(st));

const idSonda = (await pide('probe', { url: 'https://www.youtube.com/watch?v=prueba123' })).id;
ok('probe crea una sonda', String(idSonda || '').startsWith('s_'), idSonda);
let est = await pide('probe_status', { id: idSonda });
ok('la sonda empieza pendiente', est.estado === 'pendiente', est.estado);
nextW = await pide('next', {}, true);
ok('el worker recibe la sonda', Array.isArray(nextW.sondas) && nextW.sondas.some((s) => s.id === idSonda), JSON.stringify(nextW.sondas));
await api('sonda_result', { id: idSonda, ok: true, info: { title: 'Video de prueba', channel: 'Canal', duration: 205, heights: [1080, 720], playlist: false } }, true);
est = await pide('probe_status', { id: idSonda });
ok('la sonda queda lista con datos', est.estado === 'listo' && est.info.title === 'Video de prueba' && est.info.heights[0] === 1080, JSON.stringify(est.info));

r = await pide('add', { url: 'https://www.youtube.com/watch?v=nuevo1', mode: 'audio', format: 'mp3', limit_rate: '2', title: 'Titulo ya conocido' });
l = await lista();
const nuevo = l.jobs.find((j) => j.id === (r.job && r.job.id));
ok('add guarda limite y titulo', !!nuevo && nuevo.limit_rate === '2' && nuevo.title === 'Titulo ya conocido', JSON.stringify(nuevo && { l: nuevo.limit_rate, t: nuevo.title }));
ok('add asigna orden', !!nuevo && Number(nuevo.orden) > 0, String(nuevo && nuevo.orden));

r = await pide('clear_finished');
l = await lista();
ok('clear_finished quita terminadas y fallos', r.success === true && r.limpiados === 4 && l.jobs.length === 5, 'limpiados=' + r.limpiados + ' quedan=' + l.jobs.length);

console.log(fallos.length ? ('FALLOS: ' + fallos.join(' | ')) : 'TODO OK');
process.exit(fallos.length ? 1 : 0);