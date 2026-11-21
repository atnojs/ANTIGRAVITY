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
    capaCompartir: $('#capaCompartir'),
    compartirArchivo: $('#compartirArchivo'),
    compartirOpciones: $('#compartirOpciones'),
    compartirNota: $('#compartirNota'),
    cerrarCompartir: $('#cerrarCompartir'),
    capaVista: $('#capaVista'),
    vistaTitulo: $('#vistaTitulo'),
    vistaCuerpo: $('#vistaCuerpo'),
    vistaCompartir: $('#vistaCompartir'),
    vistaDescargar: $('#vistaDescargar'),
    cerrarVista: $('#cerrarVista'),
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
    compartir:
      '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><circle cx="15" cy="5" r="2.2" stroke="currentColor" stroke-width="1.7"/><circle cx="5" cy="10" r="2.2" stroke="currentColor" stroke-width="1.7"/><circle cx="15" cy="15" r="2.2" stroke="currentColor" stroke-width="1.7"/><path d="m7 9 5.8-3M7 11l5.8 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M3.5 16.5 4.6 13A6.5 6.5 0 1 1 7 15.4l-3.5 1.1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.2 7.4c.3 2 2 3.7 4 4 .6.1 1-.3 1-.9v-.4l-1.5-.6-.6.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.6-.6-1.5h-.4c-.6 0-1 .4-.9 1Z" fill="currentColor"/></svg>',
    correo:
      '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="m3.5 6 6.5 4.5L16.5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    enlace:
      '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M8.5 11.5 11.5 8.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 13.5 5.8 14.7a3 3 0 0 1-4.2-4.2L5 7.1a3 3 0 0 1 4.2 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" transform="translate(2 0)"/><path d="M13 6.5l1.2-1.2a3 3 0 0 1 4.2 4.2L15 12.9a3 3 0 0 1-4.2 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" transform="translate(-2 0)"/></svg>',
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

  const TEXTO_EXT = new Set(
    'txt md markdown csv tsv json log xml yml yaml ini conf js mjs cjs ts tsx jsx css scss py php rb go rs java c h cpp sh bat ps1 sql html htm svg srt vtt env'.split(
      ' ',
    ),
  );

  function extensionDe(nombre) {
    const punto = nombre.lastIndexOf('.');
    return punto > 0 ? nombre.slice(punto + 1).toLowerCase() : '';
  }

  function urlDescarga(nombre) {
    return `/api/download?name=${encodeURIComponent(nombre)}`;
  }

  function urlInline(nombre) {
    return `${urlDescarga(nombre)}&inline=1`;
  }

  let capaAbierta = null;
  let focoPrevio = null;

  function abrirCapa(capa) {
    if (capaAbierta && capaAbierta !== capa) cerrarCapa(capaAbierta, false);
    focoPrevio = document.activeElement;
    capa.hidden = false;
    document.body.classList.add('sin-scroll');
    capaAbierta = capa;
  }

  function cerrarCapa(capa, restaurarFoco = true) {
    if (!capa || capa.hidden) return;
    capa.hidden = true;
    capaAbierta = null;
    document.body.classList.remove('sin-scroll');
    if (restaurarFoco && focoPrevio && typeof focoPrevio.focus === 'function') focoPrevio.focus();
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      const temporal = document.createElement('textarea');
      temporal.value = texto;
      temporal.setAttribute('readonly', '');
      temporal.style.position = 'fixed';
      temporal.style.opacity = '0';
      document.body.append(temporal);
      temporal.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      temporal.remove();
      return ok;
    }
  }

  function enlaceCompleto(nombre) {
    return new URL(urlDescarga(nombre), window.location.origin).href;
  }

  function puedeCompartirArchivos() {
    try {
      if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
      const prueba = new File([new Blob(['x'])], 'prueba.txt', { type: 'text/plain' });
      return navigator.canShare({ files: [prueba] });
    } catch {
      return false;
    }
  }

  function crearOpcion({ etiqueta, icono, href, accion, descargar, destacada = false }) {
    const nodo = document.createElement(href ? 'a' : 'button');
    nodo.className = `opcion${destacada ? ' opcion--destacada' : ''}`;
    if (href) {
      nodo.href = href;
      if (descargar) nodo.download = descargar;
      else {
        nodo.target = '_blank';
        nodo.rel = 'noopener';
      }
    } else {
      nodo.type = 'button';
    }
    const cajaIcono = document.createElement('span');
    cajaIcono.className = 'opcion__icono';
    cajaIcono.innerHTML = icono;
    const texto = document.createElement('span');
    texto.textContent = etiqueta;
    nodo.append(cajaIcono, texto);
    if (accion) {
      nodo.addEventListener('click', async (evento) => {
        evento.preventDefault();
        try {
          await accion();
        } catch {
          mostrarAviso('No se pudo completar la acción', true);
        }
      });
    }
    return nodo;
  }

  async function compartirNativo(file) {
    if (!puedeCompartirArchivos()) return;
    const respuesta = await fetch(urlDescarga(file.name), { cache: 'no-store' });
    if (!respuesta.ok) throw new Error('No se pudo leer el archivo');
    const blob = await respuesta.blob();
    const archivo = new File([blob], file.name, { type: blob.type || 'application/octet-stream' });
    if (!navigator.canShare({ files: [archivo] })) throw new Error('El sistema no acepta este archivo');
    await navigator.share({ files: [archivo], title: file.name });
    cerrarCapa(el.capaCompartir);
  }

  function abrirCompartir(file) {
    if (!el.capaVista.hidden) cerrarCapa(el.capaVista, false);
    const enlace = enlaceCompleto(file.name);
    const texto = `${file.name}\n${enlace}`;
    const nativo = puedeCompartirArchivos();

    el.compartirArchivo.textContent = `${file.name} · ${bytes(file.size)}`;
    el.compartirOpciones.textContent = '';

    if (nativo) {
      el.compartirOpciones.append(
        crearOpcion({
          etiqueta: 'Compartir archivo con otra app…',
          icono: ICONOS.compartir,
          accion: () => compartirNativo(file),
          destacada: true,
        }),
      );
    }

    el.compartirOpciones.append(
      crearOpcion({
        etiqueta: 'WhatsApp',
        icono: ICONOS.whatsapp,
        href: `https://wa.me/?text=${encodeURIComponent(texto)}`,
      }),
      crearOpcion({
        etiqueta: 'Gmail',
        icono: ICONOS.correo,
        href: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(file.name)}&body=${encodeURIComponent(texto)}`,
      }),
      crearOpcion({
        etiqueta: 'Correo electrónico',
        icono: ICONOS.correo,
        href: `mailto:?subject=${encodeURIComponent(file.name)}&body=${encodeURIComponent(texto)}`,
      }),
      crearOpcion({
        etiqueta: 'Copiar enlace',
        icono: ICONOS.enlace,
        accion: async () => {
          const ok = await copiarTexto(enlace);
          mostrarAviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace', !ok);
          if (ok) cerrarCapa(el.capaCompartir);
        },
      }),
      crearOpcion({
        etiqueta: 'Descargar archivo',
        icono: ICONOS.descargar,
        href: urlDescarga(file.name),
        descargar: file.name,
      }),
    );

    el.compartirNota.textContent = nativo
      ? 'Se abrirá el menú de tu móvil para elegir WhatsApp, Gmail u otra app.'
      : 'WhatsApp y Gmail comparten un enlace que solo abre el archivo dentro de tu Wi-Fi. Para enviar el archivo en sí, descárgalo y compártelo desde la app de Archivos o Fotos.';

    abrirCapa(el.capaCompartir);
    el.cerrarCompartir.focus();
  }

  function mostrarVacioEnVista(file) {
    el.vistaCuerpo.textContent = '';
    const caja = document.createElement('div');
    caja.className = 'visor__vacio';
    const icono = document.createElement('span');
    icono.className = 'archivo__icono';
    icono.innerHTML = ICONOS[file.kind] ?? ICONOS.file;
    const titulo = document.createElement('strong');
    titulo.textContent = 'No hay vista previa para este formato';
    const detalle = document.createElement('p');
    detalle.textContent = `${file.name} · ${bytes(file.size)}. Descárgalo o compártelo para abrirlo con la app adecuada.`;
    caja.append(icono, titulo, detalle);
    el.vistaCuerpo.append(caja);
  }

  function abrirVista(file) {
    el.vistaTitulo.textContent = file.name;
    el.vistaCuerpo.textContent = '';
    el.vistaDescargar.href = urlDescarga(file.name);
    el.vistaDescargar.download = file.name;
    el.vistaCompartir.onclick = () => {
      cerrarCapa(el.capaVista, false);
      abrirCompartir(file);
    };

    const ext = extensionDe(file.name);
    if (file.kind === 'image') {
      const imagen = document.createElement('img');
      imagen.alt = file.name;
      imagen.src = urlInline(file.name);
      imagen.addEventListener('error', () => mostrarVacioEnVista(file));
      el.vistaCuerpo.append(imagen);
    } else if (file.kind === 'video') {
      const video = document.createElement('video');
      video.src = urlInline(file.name);
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      el.vistaCuerpo.append(video);
    } else if (file.kind === 'audio') {
      const audio = document.createElement('audio');
      audio.src = urlInline(file.name);
      audio.controls = true;
      el.vistaCuerpo.append(audio);
    } else if (ext === 'pdf') {
      const marco = document.createElement('iframe');
      marco.src = urlInline(file.name);
      marco.title = `Vista previa de ${file.name}`;
      el.vistaCuerpo.append(marco);
    } else if (TEXTO_EXT.has(ext)) {
      const texto = document.createElement('pre');
      texto.className = 'visor__texto';
      texto.textContent = 'Cargando…';
      el.vistaCuerpo.append(texto);
      fetch(urlDescarga(file.name), { headers: { Range: 'bytes=0-262143' }, cache: 'no-store' })
        .then((respuesta) => respuesta.text())
        .then((contenido) => {
          texto.textContent = contenido || '(archivo vacío)';
          if (file.size > 262_144) {
            const nota = document.createElement('p');
            nota.className = 'visor__nota';
            nota.textContent = 'Mostrando los primeros 256 KB. Descarga el archivo para verlo entero.';
            el.vistaCuerpo.append(nota);
          }
        })
        .catch(() => mostrarVacioEnVista(file));
    } else {
      mostrarVacioEnVista(file);
    }

    abrirCapa(el.capaVista);
    el.cerrarVista.focus();
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
    enlace.title = `Ver ${file.name}`;
    enlace.href = urlInline(file.name);
    enlace.addEventListener('click', (evento) => {
      evento.preventDefault();
      abrirVista(file);
    });
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
    if (file.lastDownload) {
      const descarga = document.createElement('span');
      descarga.className = 'archivo__descarga';
      descarga.textContent = `Descargado ${tiempoRelativo(file.lastDownload)}`;
      meta.append(descarga);
    }
    cuerpo.append(meta);
    li.append(cuerpo);

    const acciones = document.createElement('div');
    acciones.className = 'archivo__acciones';

    const compartir = document.createElement('button');
    compartir.type = 'button';
    compartir.className = 'accion accion--compartir';
    compartir.title = `Compartir ${file.name}`;
    compartir.setAttribute('aria-label', `Compartir ${file.name}`);
    compartir.innerHTML = ICONOS.compartir;
    compartir.addEventListener('click', () => abrirCompartir(file));

    const descargar = document.createElement('a');
    descargar.className = 'accion accion--descargar';
    descargar.href = urlDescarga(file.name);
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

    acciones.append(compartir, descargar, borrar);
    li.append(acciones);

    // Al descargar (o abrir la vista previa) se refresca la lista para que el
    // archivo recién descargado suba al primer puesto.
    li.addEventListener('click', (evento) => {
      if (evento.target.closest('a')) window.setTimeout(cargarArchivos, 1500);
    });
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
      const ok = await copiarTexto(estado.url);
      mostrarAviso(ok ? 'Enlace copiado' : 'Copia la dirección a mano', !ok);
    });

    for (const boton of [el.cerrarCompartir, el.cerrarVista]) {
      boton.addEventListener('click', () => cerrarCapa(boton.closest('.capa')));
    }

    for (const capa of [el.capaCompartir, el.capaVista]) {
      capa.addEventListener('click', (evento) => {
        if (evento.target === capa) cerrarCapa(capa);
      });
    }

    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && capaAbierta) {
        evento.preventDefault();
        cerrarCapa(capaAbierta);
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
