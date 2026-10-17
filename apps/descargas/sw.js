/* Service worker de la app de descargas.
   Objetivo doble: que la app se pueda INSTALAR en el movil y que abra aunque no
   haya red (la cola se actualizara sola cuando vuelva).
   Nunca intercepta POST ni la API: eso tiene que ir siempre a la red. */

const CACHE = 'descargas-v2';
const CARCASA = [
  './',
  './index.html',
  './manifest.json',
  './icono-pwa-192.png',
  './icono-pwa-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CARCASA)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => Promise.all(
      claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // La API y el historial siempre a la red.
  if (url.pathname.endsWith('.php')) return;

  // Recursos de la app: red primero y, si falla, lo guardado.
  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(peticion, copia)).catch(() => {});
        }
        return respuesta;
      })
      .catch(() => caches.match(peticion).then((guardada) => guardada || caches.match('./index.html')))
  );
});