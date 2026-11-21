/* Movi Transfer — lógica de la página (sin dependencias externas). */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const nfBytes = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const fechaCorta = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });

  const estado = {
    info: null,
    files: [],
    query: '',
    subiendo: false,
    cola: [],
    url: '',
  };

  let firmaRender = '';
  let nombresPrevios = new Set();

  const el = {
    estado: $('#estado'),
    estadoTexto: $('#estadoTexto'),
    version: $('#version'),
    urlLan: $('#urlLan'),
    copiar: $('#copiar'),
    qr: $('#qr'),
    pistaRed: $('#pistaRed'),
    zona: $('#zona'),
    archivos: $('#archivos'),
    cola: $('#cola'),
    resumen: $('#resumen'),
    lista: $('#lista'),
    vacio: $('#vacio'),
    buscar: $('#buscar'),
    refrescar: $('#refrescar'),
    aviso: $('#aviso'),
    pieHost: $('#pieHost'),
    pieBandeja: $('#pieBandeja'),
  };

  const ICONOS = {
    image:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="2" stroke="currentColor" stroke-width="1.8"/><path d="m4 17 5-4 3 2.5 3-3 5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    video:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="m16 10 5-3v10l-5-3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    audio:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M9 18V7l10-2v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="16.5" cy="16" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>',
    file:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    descargar:
      '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    borrar:
      '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6.5 0 .7 9.1A1.5 1.5 0 0 0 7.7 16.5h4.6a1.5 1.5 0 0 0 1.5-1.4L14.5 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function mostrarAviso(texto, esError = false) {
    el.aviso.textContent = texto;
    el.aviso.classList.toggle('aviso--error', esError);
    el.aviso.classList.add('aviso--visible');
    window.clearTimeout(mostrarAviso._t);
    mostrarAviso._t = window.setTimeout(() => {
      el.aviso.classList.remove('aviso--visible');
    }, 3400);
  }

  function bytes(valor) {
    if (!Number.isFinite(valor) || valor < 0) return '—';
    if (valor < 1024) return `${valor} B`;
    const unidades = ['KB', 'MB', 'GB', 'TB'];
    let n = valor;
    let i = -1;
    do {
      n /= 1024;
      i += 1;
    } while (n >= 1024 && i < unidades.length - 1);
    return `${nfBytes.format(n)} ${unidades[i]}`;
  }

  function tiempoRelativo(ms) {
    const diff = ms - Date.now();
    const abs = Math.abs(diff);
    if (abs < 60_000) return 'hace un momento';
    if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
    if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
    if (abs < 604_800_000) return rtf.format(Math.round(diff / 86_400_000), 'day');
    return fechaCorta.format(new Date(ms));
  }

  function nombreBase(ruta) {
    return String(ruta ?? '').split(/[\\/]/).filter(Boolean).pop() ?? '';
  }

  async function api(ruta, opciones = {}) {
    const respuesta = await fetch(ruta, { cache: 'no-store', ...opciones });
    let datos = {};
    try {
      datos = await respuesta.json();
    } catch {
      datos = {};
    }
    if (!respuesta.ok) throw new Error(datos.error || `Error ${respuesta.status}`);
    return datos;
  }

  function pintarEstado(ok, texto) {
    el.estado.classList.toggle('estado--error', !ok);
    el.estadoTexto.textContent = texto;
  }

  function pintarQr(url) {
    el.qr.textContent = '';
    if (!url || typeof window.qrcode !== 'function') {
      const aviso = document.createElement('span');
      aviso.className = 'qr__cargando';
      aviso.textContent = 'No se pudo generar el QR. Escribe la dirección a mano.';
      el.qr.append(aviso);
      el.qr.classList.add('qr--error');
      return;
    }
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      el.qr.innerHTML = qr.createSvgTag({
        cellSize: 5,
        margin: 0,
        scalable: true,
        alt: { text: `Dirección para abrir Movi Transfer en el móvil: ${url}` },
      });
    } catch {
      el.qr.textContent = '';
      const aviso = document.createElement('span');
      aviso.className = 'qr__cargando';
      aviso.textContent = 'No se pudo generar el QR.';
      el.qr.append(aviso);
      el.qr.classList.add('qr--error');
    }
  }

  async function cargarEstado() {
    try {
      const info = await api('/api/state');
      estado.info = info;
      const url = `http://${info.ip}:${info.port}`;
      estado.url = url;
      el.urlLan.textContent = url;
      el.version.textContent = `v${info.version}`;
      el.pieHost.textContent = info.hostname;
      el.pieBandeja.textContent = info.inbox ? ` · Bandeja: ${nombreBase(info.inbox)}` : '';
      pintarEstado(true, 'Servidor activo');
      pintarQr(url);

      const partes = info.ip.split('.');
      if (partes.length === 4 && info.ip !== '127.0.0.1') {
        el.pistaRed.textContent = `Los dos equipos deben estar en la misma Wi-Fi (${partes.slice(0, 3).join('.')}.*).`;
        el.pistaRed.classList.remove('pista--aviso');
      } else {
        el.pistaRed.textContent = 'No se ha detectado una red local. Conecta el PC a la Wi-Fi y reinicia el servidor.';
        el.pistaRed.classList.add('pista--aviso');
      }
      return true;
    } catch {
      pintarEstado(false, 'Sin conexión con el servidor');
      el.pistaRed.textContent = 'El servidor no responde. Comprueba que «iniciar.cmd» sigue abierto en el PC.';
      el.pistaRed.classList.add('pista--aviso');
      return false;
    }
  }

  function crearIcono(kind) {
    const span = document.createElement('span');
    span.className = `archivo__icono archivo__icono--${kind}`;
    span.innerHTML = ICONOS[kind] ?? ICONOS.file;
    return span;
  }

  function crearFilaArchivo(file) {
    const li = document.createElement('li');
    li.className = 'archivo';

    li.append(crearIcono(file.kind));

    const cuerpo = document.createElement('div');
    cuerpo.className = 'archivo__cuerpo';

    const enlace = document.createElement('a');
    enlace.className = 'archivo__nombre';
    enlace.textContent = file.name;
    enlace.title = file.name;
    const esMedia = file.kind === 'image' || file.kind === 'video' || file.kind === 'audio';
    const url = `/api/download?name=${encodeURIComponent(file.name)}`;
    enlace.href = esMedia ? `${url}&inline=1` : url;
    if (esMedia) {
      enlace.target = '_blank';
      enlace.rel = 'noopener';
    } else {
      enlace.download = file.name;
    }
    cuerpo.append(enlace);

    const meta = document.createElement('p');
    meta.className = 'archivo__meta';
    const tamaño = document.createElement('span');
    tamaño.textContent = bytes(file.size);
    const fecha = document.createElement('span');
    fecha.textContent = tiempoRelativo(file.mtime);
    fecha.title = new Date(file.mtime).toLocaleString('es-ES');
    const tipo = document.createElement('span');
    tipo.textContent =
      file.kind === 'image' ? 'Imagen' : file.kind === 'video' ? 'Vídeo' : file.kind === 'audio' ? 'Audio' : 'Archivo';
    meta.append(tamaño, fecha, tipo);
    cuerpo.append(meta);
    li.append(cuerpo);

    const acciones = document.createElement('div');
    acciones.className = 'archivo__acciones';

    const descargar = document.createElement('a');
    descargar.className = 'accion';
    descargar.href = url;
    descargar.download = file.name;
    descargar.title = `Descargar ${file.name}`;
    descargar.setAttribute('aria-label', `Descargar ${file.name}`);
    descargar.innerHTML = ICONOS.descargar;

    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'accion accion--borrar';
    borrar.title = `Eliminar ${file.name}`;
    borrar.setAttribute('aria-label', `Eliminar ${file.name}`);
    borrar.innerHTML = ICONOS.borrar;
    borrar.addEventListener('click', () => eliminarArchivo(file.name));

    acciones.append(descargar, borrar);
    li.append(acciones);
    return li;
  }

  function firmaActual() {
    const lista = estado.files.map((file) => `${file.name}:${file.size}:${Math.round(file.mtime)}`).join('\u0001');
    return `${estado.query}\u0000${lista}`;
  }

  function pintarArchivos(force = false) {
    const firma = firmaActual();
    // El refresco periódico no repinta si no ha cambiado nada: así no se pierde
    // el foco del teclado ni se repite la animación de entrada cada 15 s.
    if (!force && firma === firmaRender) return;
    firmaRender = firma;

    const filtro = estado.query.trim().toLowerCase();
    const visibles = filtro
      ? estado.files.filter((file) => file.name.toLowerCase().includes(filtro))
      : estado.files;

    el.lista.textContent = '';
    for (const file of visibles) {
      const fila = crearFilaArchivo(file);
      if (!nombresPrevios.has(file.name)) fila.classList.add('archivo--nuevo');
      el.lista.append(fila);
    }
    nombresPrevios = new Set(estado.files.map((file) => file.name));

    const total = estado.files.reduce((suma, file) => suma + file.size, 0);
    const cuenta = estado.files.length;
    const filtroTxt = filtro ? ` · ${visibles.length} de ${cuenta}` : '';
    el.resumen.textContent =
      cuenta === 0
        ? 'Aún no hay archivos en la bandeja.'
        : `${cuenta} ${cuenta === 1 ? 'archivo' : 'archivos'} · ${bytes(total)}${filtroTxt}`;

    const vacio = visibles.length === 0;
    el.vacio.hidden = !vacio;
    if (vacio) {
      const titulo = $('.vacio__titulo', el.vacio);
      const texto = $('.vacio__texto', el.vacio);
      if (cuenta > 0) {
        titulo.textContent = 'Sin coincidencias';
        texto.textContent = 'Prueba con otro nombre o borra la búsqueda.';
      } else {
        titulo.textContent = 'La bandeja está vacía';
        texto.textContent = 'Envía el primer archivo desde el móvil o desde este PC.';
      }
    }
  }

  async function cargarArchivos() {
    try {
      const datos = await api('/api/files');
      estado.files = Array.isArray(datos.files) ? datos.files : [];
      pintarArchivos();
    } catch {
      pintarEstado(false, 'Sin conexión con el servidor');
    }
  }

  async function eliminarArchivo(nombre) {
    if (!window.confirm(`¿Eliminar «${nombre}» del PC?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      await api(`/api/files?name=${encodeURIComponent(nombre)}`, { method: 'DELETE' });
      estado.files = estado.files.filter((file) => file.name !== nombre);
      pintarArchivos();
      mostrarAviso('Archivo eliminado');
    } catch (error) {
      mostrarAviso(error.message || 'No se pudo eliminar', true);
    }
  }

  function filaSubida(file) {
    const li = document.createElement('li');
    li.className = 'cola__item';

    const linea = document.createElement('div');
    linea.className = 'cola__linea';

    const nombre = document.createElement('span');
    nombre.className = 'cola__nombre';
    nombre.textContent = file.name;
    nombre.title = file.name;

    const info = document.createElement('span');
    info.className = 'cola__estado';
    info.textContent = 'En cola';

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'cola__cancelar';
    cancelar.setAttribute('aria-label', `Cancelar la subida de ${file.name}`);
    cancelar.textContent = '✕';

    const progreso = document.createElement('div');
    progreso.className = 'progreso';
    progreso.setAttribute('role', 'progressbar');
    progreso.setAttribute('aria-valuemin', '0');
    progreso.setAttribute('aria-valuemax', '100');
    progreso.setAttribute('aria-valuenow', '0');
    progreso.setAttribute('aria-label', `Progreso de ${file.name}`);
    const barra = document.createElement('div');
    barra.className = 'progreso__barra';
    progreso.append(barra);

    linea.append(nombre, info, cancelar);
    li.append(linea, progreso);

    li._set = (texto, pct, barraPct = pct) => {
      const valor = Math.max(0, Math.min(100, pct));
      info.textContent = texto;
      barra.style.transform = `scaleX(${Math.max(0, Math.min(100, barraPct)) / 100})`;
      progreso.setAttribute('aria-valuenow', valor.toFixed(0));
    };
    li._fin = () => progreso.remove();
    return li;
  }

  function subirArchivo(file) {
    return new Promise((resolver) => {
      const fila = filaSubida(file);
      el.cola.append(fila);

      const xhr = new XMLHttpRequest();
      const inicio = performance.now();
      let cancelada = false;

      fila._cancelar = () => {
        cancelada = true;
        xhr.abort();
      };
      $('.cola__cancelar', fila).addEventListener('click', fila._cancelar);

      xhr.open('POST', `/api/upload?name=${encodeURIComponent(file.name)}`);
      xhr.responseType = 'json';

      xhr.upload.addEventListener('progress', (evento) => {
        if (!evento.lengthComputable) return;
        const pct = (evento.loaded / evento.total) * 100;
        const segundos = Math.max((performance.now() - inicio) / 1000, 0.001);
        const velocidad = evento.loaded / segundos;
        fila._set(`${pct.toFixed(0)} % · ${bytes(velocidad)}/s`, pct);
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          fila._set('Guardado ✓', 100);
          fila._fin();
          $('.cola__cancelar', fila).remove();
          window.setTimeout(() => fila.remove(), 1200);
          resolver(true);
        } else {
          const mensaje = xhr.response?.error || `Error ${xhr.status}`;
          fila._set(mensaje, 0);
          fila._fin();
          window.setTimeout(() => fila.remove(), 5200);
          mostrarAviso(`${file.name}: ${mensaje}`, true);
          resolver(false);
        }
      });

      xhr.addEventListener('error', () => {
        fila._set('Error de red', 0);
        fila._fin();
        window.setTimeout(() => fila.remove(), 5200);
        mostrarAviso(`${file.name}: error de red`, true);
        resolver(false);
      });

      xhr.addEventListener('abort', () => {
        fila.remove();
        if (cancelada) mostrarAviso(`${file.name}: subida cancelada`);
        resolver(false);
      });

      try {
        xhr.send(file);
      } catch {
        fila.remove();
        resolver(false);
      }
    });
  }

  async function procesarCola() {
    if (estado.subiendo) return;
    estado.subiendo = true;
    while (estado.cola.length > 0) {
      const file = estado.cola.shift();
      await subirArchivo(file);
      await cargarArchivos();
    }
    estado.subiendo = false;
  }

  function encolar(files) {
    const lista = Array.from(files ?? []).filter((file) => file && file.size >= 0);
    if (lista.length === 0) return;
    estado.cola.push(...lista);
    mostrarAviso(lista.length === 1 ? 'Subiendo 1 archivo…' : `Subiendo ${lista.length} archivos…`);
    procesarCola();
  }

  function conectarEventos() {
    el.zona.addEventListener('dragenter', (evento) => {
      evento.preventDefault();
      el.zona.classList.add('zona--arrastrando');
    });
    el.zona.addEventListener('dragover', (evento) => {
      evento.preventDefault();
      el.zona.classList.add('zona--arrastrando');
    });
    el.zona.addEventListener('dragleave', (evento) => {
      if (evento.relatedTarget && el.zona.contains(evento.relatedTarget)) return;
      el.zona.classList.remove('zona--arrastrando');
    });
    el.zona.addEventListener('drop', (evento) => {
      evento.preventDefault();
      el.zona.classList.remove('zona--arrastrando');
      encolar(evento.dataTransfer?.files);
    });

    el.archivos.addEventListener('change', () => {
      encolar(el.archivos.files);
      el.archivos.value = '';
    });

    // Evita que el navegador abra un archivo si se suelta fuera de la zona.
    window.addEventListener('dragover', (evento) => evento.preventDefault());
    window.addEventListener('drop', (evento) => evento.preventDefault());

    el.buscar.addEventListener('input', () => {
      estado.query = el.buscar.value;
      pintarArchivos();
    });

    el.refrescar.addEventListener('click', async () => {
      await cargarEstado();
      await cargarArchivos();
      mostrarAviso('Lista actualizada');
    });

    el.copiar.addEventListener('click', async () => {
      if (!estado.url) return;
      try {
        await navigator.clipboard.writeText(estado.url);
        mostrarAviso('Enlace copiado');
      } catch {
        const temporal = document.createElement('textarea');
        temporal.value = estado.url;
        temporal.setAttribute('readonly', '');
        temporal.style.position = 'fixed';
        temporal.style.opacity = '0';
        document.body.append(temporal);
        temporal.select();
        try {
          document.execCommand('copy');
          mostrarAviso('Enlace copiado');
        } catch {
          mostrarAviso('Copia la dirección a mano', true);
        }
        temporal.remove();
      }
    });

    window.addEventListener('beforeunload', (evento) => {
      if (!estado.subiendo && estado.cola.length === 0) return;
      evento.preventDefault();
      evento.returnValue = '';
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !estado.subiendo) cargarArchivos();
    });
  }

  async function iniciar() {
    conectarEventos();
    const ok = await cargarEstado();
    await cargarArchivos();
    if (ok) {
      window.setInterval(() => {
        if (document.visibilityState === 'visible' && !estado.subiendo) cargarArchivos();
      }, 15_000);
    }
  }

  iniciar();
})();
