/* app.js — Analista de URL (harness DSH / ANTIGRAVITY)
   Motor determinista: no llama a ningún modelo ni gasta cuota.
   Clasifica la URL, lee metadatos públicos, deduce la intención y cruza señales
   con un catálogo de aprovechamientos y con los precedentes reales de las
   sesiones de 2026-10-17 a 2026-11-23. */
'use strict';

/* ───────────────────────── 1. Superficies del harness ───────────────────────── */

const SUPERFICIES = {
  skill: { etiqueta: 'Skill', detalle: 'skills/SKILL_*.md' },
  indice: { etiqueta: 'Índice', detalle: 'skills/INDEX.md' },
  perfil: { etiqueta: 'Perfil DSH', detalle: '~/.dsh/profiles/<x>/cordis.patch.yml' },
  proveedor: { etiqueta: 'Proveedor', detalle: 'cordis.patch.yml · providers' },
  mcp: { etiqueta: 'MCP', detalle: 'cordis.patch.yml · mcp servers' },
  subagente: { etiqueta: 'Subagente', detalle: 'verificador independiente' },
  cron: { etiqueta: 'Tarea programada', detalle: 'schedule_create' },
  herramienta: { etiqueta: 'Herramienta', detalle: 'tools/' },
  regla: { etiqueta: 'Regla', detalle: 'AGENTS.md' },
  app: { etiqueta: 'App', detalle: 'apps/' },
  nada: { etiqueta: 'Descartar', detalle: 'documentar el motivo' }
};

/* ───────────────────────── 2. Precedentes reales ───────────────────────── */

const PRECEDENTES = [
  {
    id: 'winux',
    fecha: '2026-10-17',
    url: 'https://youtu.be/3-mwREsdKfQ',
    dominio: 'youtu.be',
    titulo: 'Winux 11 LTSC: «ejecuta .exe de forma nativa»',
    tipo: 'video',
    veredicto: 'no',
    texto: 'Se pidió saber si con eso se puede instalar «cualquier .exe». Respuesta: no. Wine no es un emulador, y el propio vídeo se desdice en el minuto 19:09. El transcript no lo pudo bajar el agente: lo pegaste tú, 18.654 caracteres.',
    claves: ['exe', 'wine', 'linux', 'iso', 'instalar']
  },
  {
    id: 'indice-skills',
    fecha: '2026-11-09',
    url: 'https://www.youtube.com/watch?v=_fgcYcSA7oo',
    dominio: 'youtube.com',
    titulo: 'Tutorial de flujo de trabajo · se quedó en el índice de skills',
    tipo: 'video',
    veredicto: 'parcial',
    texto: 'Se creó skills/INDEX.md (27 fichas, ~360 KB que ya no hay que leer enteros). El panel que proponía el vídeo ya existía en Hermes: portarlo habría sido duplicar. El transcript sí se consiguió, por la API interna con cliente ANDROID, tras 15 llamadas.',
    claves: ['skill', 'index', 'panel', 'flujo', 'hermes']
  },
  {
    id: 'flow-queue',
    fecha: '2026-11-09',
    url: 'https://www.youtube.com/watch?v=VJ1CMfatVg8',
    dominio: 'youtube.com',
    titulo: 'Tutorial aplicado a la cola de Flow Studio',
    tipo: 'video',
    veredicto: 'si',
    texto: 'El vídeo abrió el trabajo; el valor lo puso la verificación: tres verificadores Goldfish destaparon seis hallazgos, uno bloqueante (la cola reencolaba trabajos vivos). Dos commits y gate de 94,0 a 97,8.',
    claves: ['flow', 'cola', 'queue', 'worker', 'verificacion']
  },
  {
    id: 'superagent',
    fecha: '2026-11-09',
    url: 'https://youtu.be/kurwaru1K6Q',
    dominio: 'youtu.be',
    titulo: 'Superagente del tutorial, instalado de verdad',
    tipo: 'video',
    veredicto: 'si',
    texto: 'Cuatro rondas de REWORK antes del PASS: 81,9, 89,1, 93,5 y 94,6. Quedó perfil superagent, plugin compilado y runbook. Lo único que no puede hacer el agente: crear la cuenta de GitHub.',
    claves: ['superagente', 'superagent', 'agente', 'flujo', 'instalar']
  },
  {
    id: 'arenalm',
    fecha: '2026-11-07',
    url: 'https://www.youtube.com/watch?v=NHy92C_jLf4',
    dominio: 'youtube.com',
    titulo: '«Cuenta ilimitada» de ArenaLM',
    tipo: 'video',
    veredicto: 'parcial',
    texto: 'La cuenta no se puede crear desde aquí (captcha y correo). Se entregó tools/crear/crear.ps1 con PASS 92,3. Dato útil: Pollinations pasó de dar imágenes a devolver 402 «requiere pago» a las pocas peticiones.',
    claves: ['gratis', 'ilimitado', 'cuenta', 'api', 'modelo', 'imagen']
  },
  {
    id: 'modelos-gratis',
    fecha: '2026-11-23',
    url: 'https://www.youtube.com/watch?v=lUwVJXBfTHM',
    dominio: 'youtube.com',
    titulo: 'Modelos gratuitos por API (coarena)',
    tipo: 'video',
    veredicto: 'si',
    texto: 'Se creó un perfil DSH aparte, coarena, en read-only y sin danger-full-access, y se comprobó con --dump-config. El cliente WEB de YouTube devolvió UNPLAYABLE: sólo dio el título. 51 llamadas de herramienta en total.',
    claves: ['modelo', 'gratis', 'api', 'proveedor', 'perfil', 'harness']
  },
  {
    id: 'openbot',
    fecha: '2026-11-22',
    url: 'https://www.youtube.com/watch?v=gLYfzZ53jOU',
    dominio: 'youtube.com',
    titulo: 'OpenBot: agente de IA gratis',
    tipo: 'video',
    veredicto: 'no',
    texto: 'Descartado. El acceso remoto pedía Tailscale, un MSI con UAC que esta sesión no puede aceptar, y el agente ya estaba accesible por LAN. 51 llamadas para acabar en «no», y el diálogo de UAC quedó vivo.',
    claves: ['openbot', 'agente', 'instalar', 'exe', 'remoto', 'tunnel']
  },
  {
    id: 'wine-seguridad',
    fecha: '2026-11-03',
    url: 'https://www.youtube.com/watch?v=LI9w-NuYq0k',
    dominio: 'youtube.com',
    titulo: '«¿Puedo usar esta URL instalando .exe?»',
    tipo: 'video',
    veredicto: 'parcial',
    texto: 'No era una pregunta sobre el vídeo sino sobre el software: acabó en comparativa Zorin/Mint y en cómo montar RDP desde la cama. La URL era el disparador, no el tema.',
    claves: ['exe', 'instalar', 'zorin', 'mint', 'rdp', 'linux']
  },
  {
    id: 'smartv',
    fecha: '2026-11-05',
    url: 'https://www.youtube.com/watch?v=-HJ8Ad8Rpvo',
    dominio: 'youtube.com',
    titulo: 'Configurar la smart TV con un vídeo',
    tipo: 'video',
    veredicto: 'si',
    texto: 'Acabó en trabajo real sobre la caja X98K: 17 paquetes desactivados con pm disable-user, launcher nuevo y documentación con los comandos para deshacerlo. El vídeo fue el mapa, no el resultado.',
    claves: ['tv', 'android', 'router', 'hardware']
  },
  {
    id: 'filee',
    fecha: '2026-11-20',
    url: 'https://filee.sh/es/',
    dominio: 'filee.sh',
    titulo: 'Clonar una app open source con React',
    tipo: 'web',
    veredicto: 'si',
    texto: 'Caso de replicar: la URL no aportaba conocimiento, aportaba un producto que copiar. Lo caro no fue entenderla, fue rehacerla con el stack de casa.',
    claves: ['react', 'open source', 'clonar', 'replicar', 'app']
  }
];

/* ───────────────────────── 3. Señales ───────────────────────── */

const SENALES = [
  { id: 'video', nombre: 'Vídeo', re: /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)/i },
  { id: 'repo', nombre: 'Repositorio', re: /(github\.com|gitlab\.com|codeberg\.org|bitbucket\.org)/i },
  { id: 'open_source', nombre: 'Código abierto', re: /\b(open[\s-]?source|c[oó]digo abierto|github|licencia mit|apache 2|gpl)\b/i },
  { id: 'modelo_ia', nombre: 'Modelo de IA', re: /\b(llm|modelo|gpt|claude|gemini|qwen|deepseek|llama|mistral|flux|nano banana|veo|sora)\b/i },
  { id: 'api', nombre: 'API', re: /\b(api|endpoint|sdk|rest|token|clave api|api key|base url)\b/i },
  { id: 'mcp', nombre: 'MCP', re: /\b(mcp|model context protocol|servidor mcp)\b/i },
  { id: 'gratis', nombre: 'Gratis', re: /\b(gratis|free|sin coste|sin tarjeta|ilimitad[oa]|open source)\b/i },
  { id: 'pago', nombre: 'De pago', re: /(\$|€|usd|eur|precio|suscripci[oó]n|de pago|plan pro|facturaci[oó]n)/i },
  { id: 'instalador', nombre: 'Instalador', re: /(\.exe|\.msi|\.iso|\.dmg|instalador|installer|wine|setup\.exe)/i },
  { id: 'automatizacion', nombre: 'Automatización', re: /\b(n8n|zapier|make\.com|cron|automatizar|automatizaci[oó]n|workflow|flujo de trabajo)\b/i },
  { id: 'agente', nombre: 'Agente', re: /\b(agente|agent|subagente|multiagente|orquestador)\b/i },
  { id: 'seguridad', nombre: 'Seguridad', re: /\b(seguridad|privacidad|malware|riesgo|vulnerab|filtraci[oó]n|tracking)\b/i },
  { id: 'hardware', nombre: 'Hardware', re: /\b(tv|router|placa|procesador|disco|android|box|caja|ssd|ram)\b/i },
  { id: 'diseno', nombre: 'Diseño', re: /\b(dise[ñn]o|ui|ux|css|figma|plantilla|tipograf[ií]a|landing)\b/i },
  { id: 'local', nombre: 'Local / offline', re: /\b(local|offline|ollama|self[\s-]?hosted|en tu pc|sin nube)\b/i },
  { id: 'texto', nombre: 'Texto / escritura', re: /\b(prompt|redactar|escribir|texto|copy|guion|resumen)\b/i },
  { id: 'imagen', nombre: 'Imagen', re: /\b(imagen|foto|png|jpg|render|ilustraci[oó]n|image)\b/i }
];

/* ───────────────────────── 4. Aprovechamientos ───────────────────────── */

const APROVECHAMIENTOS = [
  {
    id: 'ficha-skill',
    titulo: 'Convertirlo en ficha de skill reutilizable',
    superficie: 'skill',
    paso: 'Escribir skills/SKILL_<tema>.md con el procedimiento exacto y el criterio de parada, y añadirlo a skills/INDEX.md para no tener que leer los 360 KB.',
    impacto: 'alto', esfuerzo: '2-3 h',
    aplica: (c) => c.sig.has('automatizacion') || c.sig.has('agente') || c.intencion.id === 'implementar',
    porQue: 'El harness ya tiene 28 fichas: lo que se repite dos veces, va a ficha.'
  },
  {
    id: 'perfil-aislado',
    titulo: 'Probarlo en un perfil DSH aparte, no en el de trabajo',
    superficie: 'perfil',
    paso: 'Crear ~/.dsh/profiles/<nombre> clonado de web, con defaultPreset read-only, approval: ask y sin danger-full-access; validar con dsh <nombre> --dump-config.',
    impacto: 'alto', esfuerzo: '30-45 min',
    aplica: (c) => c.sig.has('modelo_ia') || c.sig.has('api') || c.intencion.id === 'modelo',
    porQue: 'Es lo que se hizo con coarena: el perfil de trabajo no se toca hasta saber si el proveedor cumple.'
  },
  {
    id: 'proveedor',
    titulo: 'Añadir el proveedor sólo si el catálogo y el precio son comprobables',
    superficie: 'proveedor',
    paso: 'Pedir /v1/models sin clave, verificar el precio en su página y anotar el límite diario. Si no hay catálogo público, no entra.',
    impacto: 'medio', esfuerzo: '1 h',
    aplica: (c) => c.sig.has('modelo_ia') && (c.sig.has('api') || c.sig.has('pago')),
    porQue: 'En la sesión de coarena el catálogo se pudo leer sin clave; en otros proveedores no hubo forma de verificarlo.'
  },
  {
    id: 'mcp',
    titulo: 'Enchufarlo como servidor MCP',
    superficie: 'mcp',
    paso: 'Añadir el bloque de servidores MCP al cordis.patch.yml del perfil, con comando, argumentos y variables de entorno; reiniciar y comprobar que las herramientas aparecen.',
    impacto: 'alto', esfuerzo: '45-90 min',
    aplica: (c) => c.sig.has('mcp'),
    porQue: 'Un MCP suma herramientas al harness sin escribir código de agente.'
  },
  {
    id: 'verificador',
    titulo: 'Ponerle un verificador independiente antes de dar nada por bueno',
    superficie: 'subagente',
    paso: 'Lanzar un subagente con contexto limpio que reproduzca el flujo y puntúe; sin PASS de 90 o más no se entrega (autocalidad-90).',
    impacto: 'alto', esfuerzo: '10-20 min por ronda',
    aplica: (c) => c.intencion.id === 'implementar' || c.sig.has('agente'),
    porQue: 'En la cola de Flow los verificadores encontraron el bloqueante que el autor no vio.'
  },
  {
    id: 'herramienta',
    titulo: 'Dejarlo como herramienta de una orden en tools/',
    superficie: 'herramienta',
    paso: 'Script con estado, caso principal, caso de error y salida a disco; documentado en su LEEME.md y con PASS del verificador.',
    impacto: 'medio', esfuerzo: '2-4 h',
    aplica: (c) => c.intencion.id === 'implementar' && (c.sig.has('api') || c.sig.has('texto') || c.sig.has('imagen')),
    porQue: 'crear.ps1 salió de un tutorial de «cuenta ilimitada» y acabó siendo la vía gratis de código e imagen.'
  },
  {
    id: 'cron',
    titulo: 'Vigilar la fuente con una tarea programada',
    superficie: 'cron',
    paso: 'Crear una tarea programada semanal que revise si el repositorio o la doc cambió y avise sólo cuando haya algo distinto.',
    impacto: 'bajo', esfuerzo: '20 min',
    aplica: (c) => c.sig.has('repo') || (c.sig.has('api') && c.intencion.id === 'modelo'),
    porQue: 'Útil sólo si la fuente caduca rápido; para un tutorial de hace dos años es ruido.'
  },
  {
    id: 'regla',
    titulo: 'Fijarlo como regla permanente en AGENTS.md',
    superficie: 'regla',
    paso: 'Añadirlo a la sección de reglas fijas con la fecha y el motivo, y comprobar que no contradice ninguna regla anterior.',
    impacto: 'medio', esfuerzo: '15 min',
    aplica: (c) => c.sig.has('seguridad') || c.intencion.id === 'instalar',
    porQue: 'Las reglas fijas del usuario ya nacieron así: de un encargo puntual que se repitió.'
  },
  {
    id: 'replicar-app',
    titulo: 'Rehacer sólo lo imprescindible con el stack de casa',
    superficie: 'app',
    paso: 'Listar las tres funciones que de verdad usas, y rehacerlas en apps/<nombre>/ con HTML, PHP y JS vanilla. Nada de arrastrar el framework del original.',
    impacto: 'alto', esfuerzo: '1-3 días',
    aplica: (c) => c.intencion.id === 'replicar',
    porQue: 'En filee.sh lo caro no fue entender la app, fue rehacerla: el stack ajeno se paga en cada cambio.'
  },
  {
    id: 'prueba-aislada',
    titulo: 'Probarlo primero en un sitio desechable, con vuelta atrás escrita',
    superficie: 'herramienta',
    paso: 'Antes de tocar el equipo de trabajo: máquina virtual o perfil aparte, copia del estado y los comandos exactos para deshacerlo, escritos antes de empezar.',
    impacto: 'alto', esfuerzo: '30-60 min',
    aplica: (c) => c.intencion.id === 'instalar',
    porQue: 'El intento de Tailscale acabó con un UAC elevado que esta sesión no podía cerrar: se planifica antes, no después.'
  },
  {
    id: 'descartar',
    titulo: 'Documentar el descarte y no volver a evaluarlo',
    superficie: 'nada',
    paso: 'Anotar en el historial de esta app y en la bitácora: qué se probó, qué falló y con qué evidencia. Así la próxima sesión no repite las 51 llamadas.',
    impacto: 'alto', esfuerzo: '10 min',
    aplica: (c) => c.veredicto.total < 45,
    porQue: 'Descartar con motivo es el resultado más rentable cuando la URL no aporta.'
  }
];

/* ───────────────────────── 5. Mejoras del harness ───────────────────────── */

const MEJORAS = [
  {
    id: 'leer-url',
    titulo: 'Una herramienta leer_url: transcripción de vídeo y texto legible de página',
    delta: 'doce llamadas menos y una intervención tuya menos por vídeo',
    evidencia: 'Cinco sesiones analizaron vídeos. En la de Winux tuviste que pegar 18.654 caracteres de subtítulos porque no había forma de bajarlos. En la de _fgcYcSA7oo hicieron falta 15 llamadas hasta dar con la API interna con cliente ANDROID (es-ES: 39.181 caracteres). El cliente WEB devuelve UNPLAYABLE.',
    aplica: (c) => c.sig.has('video')
  },
  {
    id: 'no-leible',
    titulo: 'Decir «esta fuente no se puede leer» en la primera llamada',
    delta: 'corta en un intento lo que hoy cuesta ocho',
    evidencia: 'youtubetotranscript.com devolvió 403, el timedtext directo devolvió 200 vacío y el player WEB devolvió UNPLAYABLE. Se descubrió probando, no leyendo un aviso.',
    aplica: (c) => c.sig.has('video') || c.sig.has('pago')
  },
  {
    id: 'contrato',
    titulo: 'Un contrato de salida fijo para «examina esta URL»',
    delta: 'dos rondas de reencuadre menos por análisis',
    evidencia: 'Cada sesión inventó su formato. En la de OpenBot se gastaron 51 llamadas antes de concluir «no», y la pregunta real («¿me sirve para el harness?») apareció a mitad de la conversación.',
    aplica: () => true
  },
  {
    id: 'precedentes',
    titulo: 'Memoria de precedentes entre sesiones',
    delta: 'evita repetir investigaciones de cincuenta llamadas',
    evidencia: 'OpenBot se evaluó dos veces (22 y 23 de noviembre) y se intentó instalar Tailscale para un caso que terminó descartado. Sin memoria, la segunda sesión empieza de cero.',
    aplica: () => true
  },
  {
    id: 'presupuesto',
    titulo: 'Presupuesto de llamadas por análisis, con corte y reporte',
    delta: 'techo duro en vez de cincuenta y una llamadas',
    evidencia: 'OpenBot: 51 llamadas de herramienta. _fgcYcSA7oo: más de 20. Un tope de 8 con informe de lo que faltó es más útil que un análisis que se come la sesión.',
    aplica: () => true
  },
  {
    id: 'duplicado',
    titulo: 'Comprobar si ya existe en Hermes o ANTIGRAVITY antes de portar nada',
    delta: 'evita construir lo que ya está',
    evidencia: 'El panel del vídeo de _fgcYcSA7oo ya existía como plugins/antigravity-command. Se detectó después de redactar el plan de portarlo.',
    aplica: (c) => c.sig.has('agente') || c.sig.has('automatizacion') || c.intencion.id === 'replicar'
  },
  {
    id: 'coste',
    titulo: 'Coste y cuota como campo obligatorio del informe',
    delta: 'evita descubrir el 402 con la app ya montada',
    evidencia: 'Pollinations dio 402 a las pocas peticiones; Flow gasta 10 puntos por clip y 50 al día, con dos huecos de cola; coarena anunciaba 5 dólares al día. Ninguno de esos datos estaba en la pregunta inicial.',
    aplica: (c) => c.sig.has('api') || c.sig.has('pago') || c.sig.has('gratis')
  },
  {
    id: 'promesa',
    titulo: 'Separar «lo que promete» de «lo que cumple», con minuto',
    delta: 'convierte una opinión en un dato',
    evidencia: 'Winux promete .exe nativo en 0:26 y se desdice en 19:09. La respuesta útil no fue «es marketing» sino la tabla de qué .exe funciona y cuál no.',
    aplica: (c) => c.sig.has('video')
  }
];

/* ───────────────────────── 6. Clasificación de la URL ───────────────────────── */

function parsearUrl(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) return { error: 'Escribe una URL.' };
  const conEsquema = /^https?:\/\//i.test(limpio) ? limpio : 'https://' + limpio;
  let u;
  try { u = new URL(conEsquema); } catch { return { error: 'Esa URL no se puede leer. Revisa que no falte nada.' }; }
  if (!/^https?:$/.test(u.protocol)) return { error: 'Sólo se pueden analizar enlaces http o https.' };
  if (!u.hostname.includes('.')) return { error: 'Al dominio le falta algo: por ejemplo youtube.com.' };

  const host = u.hostname.replace(/^www\./, '');
  const params = u.searchParams;
  const rastro = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'si', 'pp', 'feature', 'ref'];
  const rastroPresente = rastro.filter((p) => params.has(p));

  let tipo = 'web';
  let platforma = host;
  let videoId = '';
  let repo = '';

  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)m\.youtube\.com$/.test(host)) {
    tipo = 'video';
    videoId = params.get('v') || (host === 'youtu.be' ? u.pathname.slice(1) : '');
    if (!videoId && u.pathname.startsWith('/shorts/')) videoId = u.pathname.split('/')[2] || '';
    platforma = 'YouTube';
  } else if (/vimeo\.com$/.test(host)) {
    tipo = 'video';
    videoId = u.pathname.split('/').filter(Boolean).pop() || '';
    platforma = 'Vimeo';
  } else if (/(^|\.)github\.com$/.test(host)) {
    const partes = u.pathname.split('/').filter(Boolean);
    repo = partes.length >= 2 ? partes[0] + '/' + partes[1] : '';
    tipo = /\/blob\/|\/tree\//.test(u.pathname) ? 'codigo' : 'repo';
    platforma = 'GitHub';
  } else if (/gitlab\.com$|codeberg\.org$/.test(host)) {
    tipo = 'repo';
    platforma = host.split('.').slice(-2).join('.');
  } else if (/\.pdf$/i.test(u.pathname)) {
    tipo = 'pdf';
  } else if (/(docs?|documentation|manual|guia|guide|readme)\./i.test(host) || /\/(docs?|documentation|manual|guia|guide)\//i.test(u.pathname)) {
    tipo = 'docs';
  } else if (/(tienda|shop|store|amazon|aliexpress|pccomponentes)/i.test(host)) {
    tipo = 'tienda';
  }

  return {
    url: u.href,
    host,
    tipo,
    platforma: platforma === host ? host : platforma,
    videoId,
    repo,
    rastro: rastroPresente,
    path: u.pathname
  };
}

/* ───────────────────────── 7. Señales del texto ───────────────────────── */

function detectarSenales(info, texto) {
  const heno = [info.url || '', info.path || '', texto || ''].join(' \n ');
  const encontradas = new Set();
  const detalle = [];
  for (const s of SENALES) {
    if (s.re.test(heno)) {
      encontradas.add(s.id);
      detalle.push(s);
    }
  }
  if (info.tipo === 'video') encontradas.add('video');
  if (info.tipo === 'repo' || info.tipo === 'codigo') encontradas.add('repo');
  return { set: encontradas, lista: detalle };
}

/* ───────────────────────── 8. Intención ───────────────────────── */

const INTENCIONES = {
  implementar: {
    etiqueta: 'Implementar en el flujo',
    pregunta: '¿Qué de esto nos falta y cómo se enchufa al harness?'
  },
  modelo: {
    etiqueta: 'Modelo o proveedor',
    pregunta: '¿Este modelo o proveedor nos sirve de verdad, a qué precio y con qué límites?'
  },
  replicar: {
    etiqueta: 'Replicar la app',
    pregunta: '¿Qué hace esta app, qué merece la pena copiar y cuánto cuesta rehacerla?'
  },
  instalar: {
    etiqueta: '¿Se puede instalar?',
    pregunta: '¿Es seguro y posible instalarlo en mis equipos, y qué se rompe si lo hago?'
  },
  interes: {
    etiqueta: '¿Nos interesa?',
    pregunta: '¿Esto aporta algo a lo que ya tenemos o es ruido?'
  }
};

function deducirIntencion(info, sig, texto, forzada) {
  if (forzada && forzada !== 'auto' && INTENCIONES[forzada]) {
    return { id: forzada, ...INTENCIONES[forzada], motivos: ['Lo has elegido tú.'] };
  }
  const puntos = { implementar: 0, modelo: 0, replicar: 0, instalar: 0, interes: 0 };
  const motivos = { implementar: [], modelo: [], replicar: [], instalar: [], interes: [] };
  const subir = (k, n, motivo) => { puntos[k] += n; if (motivo) motivos[k].push(motivo); };

  if (info.tipo === 'video') {
    subir('implementar', 4, 'Es un vídeo: casi siempre vienes a ver qué se saca de él.');
    if (sig.has('agente') || sig.has('automatizacion')) subir('implementar', 2, 'Habla de agentes o de automatizar.');
  }
  if (info.tipo === 'repo' || info.tipo === 'codigo') {
    subir('replicar', 3, 'Es un repositorio: lo natural es mirar si se copia o se usa.');
    subir('implementar', 2, 'Un repo también puede entrar como herramienta.');
  }
  if (info.tipo === 'docs') subir('modelo', 2, 'Es documentación: suele venir de un proveedor del que quieres datos.');
  if (sig.has('modelo_ia')) subir('modelo', 5, 'Nombra modelos de IA.');
  if (sig.has('api')) subir('modelo', 2, 'Habla de API y de claves.');
  if (sig.has('gratis') && sig.has('modelo_ia')) subir('modelo', 2, 'El gancho es «gratis» con modelo: la pregunta real es el límite.');
  if (sig.has('instalador')) subir('instalar', 5, 'Hay instaladores de por medio.');
  if (sig.has('hardware')) subir('instalar', 2, 'Toca hardware o dispositivos.');
  if (sig.has('open_source')) subir('replicar', 2, 'Es código abierto.');
  if (sig.has('pago')) subir('interes', 1, 'Hay precio: toca decidir si compensa.');
  if (texto && texto.length > 400) subir('implementar', 1, 'Has pegado texto: hay materia para decidir.');

  if (Object.values(puntos).every((n) => n === 0)) {
    return { id: 'interes', ...INTENCIONES.interes, motivos: ['Sin señales: mejor decidir si interesa antes de invertir.'] };
  }

  const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
  const ganadora = orden[0][0];
  return {
    id: ganadora,
    ...INTENCIONES[ganadora],
    motivos: motivos[ganadora].slice(0, 3),
    alternativas: orden.slice(1).filter((o) => o[1] > 0).map((o) => INTENCIONES[o[0]].etiqueta)
  };
}

/* ───────────────────────── 9. Metadatos públicos ───────────────────────── */

async function conTiempo(promesa, ms) {
  let reloj;
  const espera = new Promise((_, rej) => { reloj = setTimeout(() => rej(new Error('sin respuesta')), ms); });
  try { return await Promise.race([promesa, espera]); } finally { clearTimeout(reloj); }
}

async function metadatos(info, aviso) {
  const meta = { titulo: '', autor: '', licencia: '', estrellas: '', actualizado: '', fuente: 'no consultado' };
  const sinProxy = location.protocol === 'file:';

  const contar = (m, fuente) => {
    if (!m) return false;
    meta.titulo = m.titulo || '';
    meta.autor = m.autor || '';
    meta.licencia = m.licencia || '';
    meta.estrellas = m.estrellas || '';
    meta.actualizado = m.actualizado || '';
    meta.fuente = fuente || m.fuente || 'el proxy del servidor';
    return Boolean(meta.titulo);
  };

  /* El proxy es el camino bueno en producción (la CSP del hosting bloquea lo externo).
     Si no contesta, se intenta directo: sirve para probar en local con file://. */
  const porProxy = async (query) => {
    if (sinProxy) return null;
    try {
      const r = await conTiempo(fetch('proxy.php?action=meta&' + query), 9000);
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.success ? j.meta : null;
    } catch { return null; }
  };

  try {
    if (info.tipo === 'video' && info.videoId) {
      aviso('Leyendo título y autor del vídeo...');
      const porServidor = await porProxy('tipo=video&id=' + encodeURIComponent(info.videoId));
      if (porServidor) { contar(porServidor, 'oEmbed de YouTube'); return meta; }
      if (!sinProxy) throw new Error('el proxy no devolvió los metadatos');
      const r = await conTiempo(fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + info.videoId) + '&format=json'), 8000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      contar({ titulo: j.title, autor: j.author_name }, 'el oEmbed público de YouTube');
      return meta;
    }

    if (info.repo) {
      aviso('Leyendo el repositorio en GitHub...');
      const porServidor = await porProxy('tipo=repo&repo=' + encodeURIComponent(info.repo));
      if (porServidor) { contar(porServidor, 'la API pública de GitHub'); return meta; }
      if (!sinProxy) throw new Error('el proxy no devolvió los metadatos');
      const r = await conTiempo(fetch('https://api.github.com/repos/' + info.repo, { headers: { Accept: 'application/vnd.github+json' } }), 8000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      contar({
        titulo: j.full_name,
        autor: j.owner ? j.owner.login : '',
        licencia: j.license && j.license.spdx_id ? j.license.spdx_id : (j.license ? 'declarada' : 'sin licencia declarada'),
        estrellas: typeof j.stargazers_count === 'number' ? String(j.stargazers_count) : '',
        actualizado: (j.pushed_at || '').slice(0, 10)
      }, 'la API pública de GitHub');
      return meta;
    }

    meta.fuente = 'nada: esa página no se puede leer desde el navegador';
  } catch (e) {
    meta.fuente = 'sin respuesta (' + e.message + ')';
  }
  return meta;
}

/* ───────────────────────── 10. Puntuación y veredicto ───────────────────────── */

function calcularVeredicto(info, sig, intencion, precedentes) {
  const partes = [{ texto: 'base', valor: 40 }];
  const sumar = (texto, valor) => partes.push({ texto, valor });
  if (sig.has('open_source')) sumar('código abierto', 10);
  if (sig.has('repo')) sumar('repositorio', 6);
  if (sig.has('api')) sumar('API documentada', 8);
  if (sig.has('mcp')) sumar('MCP', 9);
  if (sig.has('modelo_ia')) sumar('modelo', 5);
  if (info.tipo === 'docs') sumar('documentación', 6);
  if (info.tipo === 'video') sumar('vídeo-tutorial', 4);
  if (sig.has('pago')) sumar('coste declarado', -7);
  if (sig.has('instalador')) sumar('instalador', -9);
  if (sig.has('hardware')) sumar('hardware', -6);
  if (sig.has('seguridad')) sumar('tema sensible', -4);

  if (precedentes.some((p) => p.veredicto === 'si')) sumar('precedente que sí sirvió', 8);
  if (precedentes.some((p) => p.veredicto === 'no')) sumar('precedente que se descartó', -14);

  let total = partes.reduce((n, p) => n + p.valor, 0);
  total = Math.max(5, Math.min(97, total));
  const etiqueta = total >= 70 ? 'Nos sirve' : total >= 45 ? 'Sirve a medias' : 'Es ruido';
  const clase = total >= 70 ? '' : total >= 45 ? 'es-parcial' : 'es-ruido';
  const motivo = total >= 70
    ? 'Hay materia concreta que se puede enchufar al harness sin inventar nada.'
    : total >= 45
      ? 'Hay algo aprovechable, pero el coste o el riesgo se comen parte del beneficio. Léelo antes de mover ficha.'
      : 'Poco que rascar: o duplica lo que ya hay, o el precio y el riesgo superan lo que aporta.';
  return { total, etiqueta, clase, motivo, partes };
}

/* ───────────────────────── 11. Datos a tener en cuenta ───────────────────────── */

function quitarRastro(url) {
  try {
    const u = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'si', 'pp', 'feature', 'ref']
      .forEach((p) => u.searchParams.delete(p));
    return u.href;
  } catch { return url; }
}

function construirDatos(info, meta, sig, texto, precedentes) {
  const filas = [];
  const anadir = (clave, valor, tono) => filas.push({ clave, valor, tono: tono || '' });
  const t = texto || '';

  anadir('Fuente', info.platforma + ' · ' + info.host);
  anadir('Tipo de enlace', {
    video: 'Vídeo', repo: 'Repositorio', codigo: 'Código en un repositorio', docs: 'Documentación',
    pdf: 'PDF', tienda: 'Tienda', web: 'Página web'
  }[info.tipo] || 'Página web');

  if (meta.titulo) anadir('Título', meta.titulo);
  if (meta.autor) anadir('Autor', meta.autor);
  if (meta.licencia) anadir('Licencia', meta.licencia, /sin licencia/i.test(meta.licencia) ? 'duda' : 'bueno');
  if (meta.estrellas) anadir('Estrellas', meta.estrellas + ' en GitHub');
  if (meta.actualizado) anadir('Último push', meta.actualizado);
  if (info.videoId) anadir('ID del vídeo', info.videoId);

  const coste = sig.has('gratis') && sig.has('pago') ? 'dice ser gratis y también menciona precio'
    : sig.has('gratis') ? 'se presenta como gratis'
      : sig.has('pago') ? 'tiene coste declarado'
        : 'no declarado';
  anadir('Coste', coste, coste === 'no declarado' ? '' : coste === 'se presenta como gratis' ? 'duda' : 'malo');

  const requisitos = [];
  if (/\bdocker\b/i.test(t)) requisitos.push('Docker');
  if (/\bnode(\.js)?\b/i.test(t)) requisitos.push('Node');
  if (/\bpython\b/i.test(t)) requisitos.push('Python');
  if (/\bwindows\b/i.test(t)) requisitos.push('Windows');
  if (/\blinux\b/i.test(t)) requisitos.push('Linux');
  if (/\bcuenta\b|\bsign[\s-]?up\b|\bregistro\b/i.test(t)) requisitos.push('crear cuenta');
  if (/\btarjeta\b|\bcard\b/i.test(t)) requisitos.push('tarjeta');
  anadir('Requisitos que menciona', requisitos.length ? requisitos.join(', ') : 'ninguno detectado en el texto', requisitos.length ? 'duda' : '');

  const riesgo = [];
  if (sig.has('instalador')) riesgo.push('instalador');
  if (info.rastro.length) riesgo.push('lleva rastreadores en la URL');
  if (sig.has('pago') && !sig.has('gratis')) riesgo.push('coste');
  anadir('Riesgo', riesgo.length ? riesgo.join(', ') : 'ninguno evidente', riesgo.length ? 'malo' : 'bueno');

  anadir('Caducidad',
    info.tipo === 'video' ? 'los tutoriales envejecen: mira la fecha antes de fiarte'
      : sig.has('modelo_ia') ? 'catálogo de modelos: cambia cada pocas semanas'
        : info.tipo === 'repo' ? 'usa la fecha del último push como termómetro'
          : 'sin fecha fiable');

  if (precedentes.length) {
    anadir('Precedente', precedentes.map((p) => p.fecha + ': ' + (p.veredicto === 'si' ? 'sirvió' : p.veredicto === 'no' ? 'descartado' : 'a medias')).join(' · '), 'duda');
  }
  if (info.rastro.length) anadir('Enlace limpio', quitarRastro(info.url), 'bueno');

  return filas;
}

/* ───────────────────────── 12. Implementaciones y mejoras ───────────────────────── */

function construirPlan(ctx) {
  const esRuido = ctx.veredicto.total < 45;
  const orden = { alto: 3, medio: 2, bajo: 1 };
  const elegidas = APROVECHAMIENTOS.filter((a) => {
    if (a.id === 'descartar') return esRuido;
    try { return a.aplica(ctx); } catch { return false; }
  });
  const plan = elegidas
    .filter((a) => a.id !== 'descartar')
    .sort((a, b) => orden[b.impacto] - orden[a.impacto])
    .slice(0, esRuido ? 1 : 4);
  if (!esRuido && plan.length < 2) plan.push(APROVECHAMIENTOS.find((a) => a.id === 'verificador'));
  if (esRuido) plan.push(APROVECHAMIENTOS.find((a) => a.id === 'descartar'));
  if (!plan.length) plan.push(APROVECHAMIENTOS.find((a) => a.id === 'verificador'));
  return plan.filter(Boolean);
}

function construirMejoras(ctx) {
  return MEJORAS.filter((m) => {
    try { return m.aplica(ctx); } catch { return false; }
  }).slice(0, 4);
}

/* ───────────────────────── 13. Precedentes que encajan ───────────────────────── */

function buscarPrecedentes(info, texto) {
  const heno = ((texto || '') + ' ' + info.url).toLowerCase();
  const genericas = new Set(['app', 'flujo', 'api', 'gratis', 'instalar', 'modelo', 'agente', 'video', 'imagen', 'texto', 'exe', 'linux', 'iso']);
  const puntuados = [];
  for (const p of PRECEDENTES) {
    let puntos = 0;
    let especificas = 0;
    for (const k of new Set(p.claves)) {
      if (heno.includes(k)) {
        if (genericas.has(k)) puntos += 0.5;
        else { puntos += 1; especificas += 1; }
      }
    }
    if (p.dominio === info.host) puntos += 3;
    if (p.tipo === info.tipo) puntos += 0.5;
    if (especificas >= 1 || puntos >= 2) puntuados.push({ p, puntos });
  }
  puntuados.sort((a, b) => b.puntos - a.puntos);
  return puntuados.slice(0, 3).map((x) => x.p);
}

/* ───────────────────────── 14. Encargo para DSH ───────────────────────── */

function construirEncargo(ctx, plan) {
  const l = [];
  l.push('Examina esta URL y dame un veredicto de aprovechamiento para nuestro harness.');
  l.push('');
  l.push('URL: ' + ctx.info.url);
  l.push('Intención detectada: ' + ctx.intencion.etiqueta + ' — ' + ctx.intencion.pregunta);
  if (ctx.meta.titulo) l.push('Título: ' + ctx.meta.titulo + (ctx.meta.autor ? ' · ' + ctx.meta.autor : ''));
  l.push('');
  l.push('Antes de concluir, comprueba:');
  l.push('1. Si la fuente se puede leer de verdad (vídeo: subtítulos; web: texto principal). Si no se puede, dilo en la primera respuesta y no insistas más de dos intentos.');
  l.push('2. Si lo que propone YA existe en Hermes, en ANTIGRAVITY o en el propio DSH. Si existe, el veredicto es descartar y decir dónde está.');
  l.push('3. El coste real y la cuota, aunque la URL diga que es gratis.');
  l.push('');
  l.push('Devuelve exactamente estas cinco secciones, en este orden:');
  l.push('1) VEREDICTO: sirve, sirve a medias o ruido, con el motivo en una frase.');
  l.push('2) DATOS A TENER EN CUENTA: coste, licencia, requisitos, riesgo, caducidad y qué promete frente a qué cumple (con minuto o cita).');
  l.push('3) QUÉ SE PUEDE IMPLEMENTAR: como máximo cuatro cosas; cada una con superficie (skill, perfil, MCP, herramienta, regla, app), esfuerzo e impacto.');
  l.push('4) QUÉ MEJORARÍA DEL HARNESS: qué cambia en el flujo si esto entra, con la evidencia que lo sostiene.');
  l.push('5) SIGUIENTE PASO: una sola acción concreta, y qué se descarta.');
  l.push('');
  l.push('Reglas: presupuesto de ocho llamadas de herramienta (si te pasas, corta y reporta lo que falta); no inventes datos que no puedas citar; lo no verificado se declara como no verificado; nada de propuestas que dupliquen lo que ya tenemos.');
  if (plan.length) {
    l.push('');
    l.push('Pistas que ya he sacado por mi cuenta (no las repitas sin comprobarlas): ' + plan.map((p) => p.titulo.toLowerCase()).join('; ') + '.');
  }
  return l.join('\n');
}

/* ───────────────────────── 15. Análisis completo ───────────────────────── */

async function analizar(urlCruda, intencionForzada, texto, aviso) {
  const avisar = typeof aviso === 'function' ? aviso : () => {};
  const info = parsearUrl(urlCruda);
  if (info.error) throw new Error(info.error);

  avisar('Clasificando el enlace...');
  const senales = detectarSenales(info, texto);
  const intencion = deducirIntencion(info, senales.set, texto, intencionForzada);

  avisar('Buscando precedentes en nuestro historial...');
  const precedentes = buscarPrecedentes(info, texto);

  const meta = await metadatos(info, avisar);

  const veredicto = calcularVeredicto(info, senales.set, intencion, precedentes);
  const ctx = { info, meta, sig: senales.set, sigLista: senales.lista, texto, intencion, veredicto, precedentes, plan: [], mejoras: [] };
  ctx.datos = construirDatos(info, meta, senales.set, texto, precedentes);
  ctx.plan = construirPlan(ctx);
  ctx.mejoras = construirMejoras(ctx);
  ctx.encargo = construirEncargo(ctx, ctx.plan);
  ctx.vacio = veredicto.total < 45;
  ctx.siguiente = ctx.vacio
    ? 'Descartarlo y anotar por qué. Si vuelve a aparecer, el historial de esta app ya tiene la respuesta.'
    : ctx.plan.length
      ? ctx.plan[0].paso
      : 'Leer la fuente con calma antes de tocar nada.';
  return ctx;
}

/* ───────────────────────── 16. Render ───────────────────────── */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function acortar(s, n) {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function renderizar(ctx) {
  const r = document.getElementById('resultado');
  const partes = [];

  partes.push(`
    <section class="veredicto" aria-label="Veredicto">
      <div class="veredicto-izq">
        <p class="veredicto-etiqueta">Veredicto</p>
        <p class="veredicto-valor ${ctx.veredicto.clase}">${esc(ctx.veredicto.etiqueta)}</p>
        <p class="veredicto-motivo">${esc(ctx.veredicto.motivo)}</p>
        <p style="margin-top:.55rem"><span class="url-chip" title="${esc(ctx.info.url)}"><span class="dominio">${esc(ctx.info.host)}</span> ${esc(acortar(ctx.info.url, 78))}</span></p>
      </div>
      <div class="veredicto-der">
        <p class="puntuacion">${ctx.veredicto.total}<small>/100</small></p>
        <p class="desglose">${ctx.veredicto.partes.map((p) => esc(p.texto) + ' ' + (p.valor > 0 ? '+' : '') + p.valor).join(' · ')}</p>
      </div>
    </section>`);

  partes.push(`
    <section class="tarjeta">
      <h2 class="section-title">Lo que quieres de esta URL</h2>
      <p><strong style="color:var(--acc)">${esc(ctx.intencion.etiqueta)}</strong> — ${esc(ctx.intencion.pregunta)}</p>
      <p class="ayuda">${ctx.intencion.motivos.map(esc).join(' · ') || 'Sin señales claras.'}</p>
      ${ctx.intencion.alternativas && ctx.intencion.alternativas.length ? `<p class="ayuda">También encajaría como: ${ctx.intencion.alternativas.map(esc).join(' o ')}.</p>` : ''}
    </section>`);

  partes.push(`
    <section class="tarjeta">
      <h2 class="section-title">Datos a tener en cuenta</h2>
      <div class="grid-datos">
        ${ctx.datos.map((d) => `
          <div class="dato">
            <p class="dato-clave">${esc(d.clave)}</p>
            <p class="dato-valor ${esc(d.tono)}">${esc(d.valor)}</p>
          </div>`).join('')}
      </div>
      <p class="ayuda">Metadatos leídos con ${esc(ctx.meta.fuente)}. Lo que falta es porque el navegador no puede leerlo: si pegas el texto, se afina.</p>
    </section>`);

  if (ctx.plan.length) {
    partes.push(`
      <section class="tarjeta">
        <h2 class="section-title">Qué se puede implementar en nuestro harness</h2>
        <div class="implementaciones">
          ${ctx.plan.map((p, i) => `
            <div class="impl">
              <span class="impl-num" aria-hidden="true">${i + 1}</span>
              <div class="impl-cuerpo">
                <p class="impl-titulo">${esc(p.titulo)}</p>
                <p class="impl-paso">${esc(p.paso)}</p>
                <div class="impl-meta">
                  <span class="etiqueta superficie">${esc(SUPERFICIES[p.superficie].etiqueta)}</span>
                  <span class="etiqueta">${esc(SUPERFICIES[p.superficie].detalle)}</span>
                  <span class="etiqueta impacto-${p.impacto}">impacto ${esc(p.impacto)}</span>
                  <span class="etiqueta">${esc(p.esfuerzo)}</span>
                </div>
              </div>
              <div class="impl-lado">${esc(p.porQue)}</div>
            </div>`).join('')}
        </div>
      </section>`);
  }

  if (ctx.mejoras.length) {
    partes.push(`
      <section class="tarjeta">
        <h2 class="section-title">Qué mejoraría del harness</h2>
        <ul class="mejoras">
          ${ctx.mejoras.map((m) => `
            <li>
              <div class="mejora-cab">
                <span class="mejora-titulo">${esc(m.titulo)}</span>
                <span class="mejora-delta">${esc(m.delta)}</span>
              </div>
              <p class="mejora-evidencia">${esc(m.evidencia)}</p>
            </li>`).join('')}
        </ul>
      </section>`);
  }

  partes.push(`
    <section class="tarjeta">
      <h2 class="section-title">Precedentes</h2>
      ${ctx.precedentes.length
        ? ctx.precedentes.map((p) => `
          <div class="precedente">
            <div class="precedente-cab">
              <span class="precedente-titulo">${esc(p.titulo)}</span>
              <span class="precedente-veredicto" style="color:${p.veredicto === 'si' ? 'var(--ok)' : p.veredicto === 'no' ? 'var(--danger)' : 'var(--warn)'}">${p.veredicto === 'si' ? 'sirvió' : p.veredicto === 'no' ? 'se descartó' : 'a medias'}</span>
              <span class="precedente-fecha">${esc(p.fecha)}</span>
            </div>
            <p class="precedente-texto">${esc(p.texto)}</p>
          </div>`).join('')
        : '<p class="ayuda">Ningún caso anterior se parece a este. Si lo trabajas, guárdalo: la próxima vez el análisis empieza con ventaja.</p>'}
    </section>`);

  partes.push(`
    <section class="tarjeta">
      <h2 class="section-title">Siguiente paso</h2>
      <p class="siguiente"><span class="num">→</span> ${esc(ctx.siguiente)}</p>
      <div class="acciones">
        <button type="button" class="btn-copiar" id="copiar-encargo">Copiar el encargo para DSH</button>
        <button type="button" class="btn-secundario" id="copiar-informe">Copiar el informe</button>
        <button type="button" class="btn-secundario" id="descargar-informe">Descargar .md</button>
      </div>
      <details style="margin-top:.9rem">
        <summary>Ver el encargo que se copia</summary>
        <div class="prompt-box"><pre id="encargo-texto">${esc(ctx.encargo)}</pre></div>
      </details>
    </section>`);

  r.innerHTML = partes.join('');
  r.hidden = false;
  r.setAttribute('aria-busy', 'false');

  document.getElementById('copiar-encargo').addEventListener('click', (e) => copiar(ctx.encargo, e.currentTarget, 'Encargo copiado'));
  document.getElementById('copiar-informe').addEventListener('click', (e) => copiar(informeTexto(ctx), e.currentTarget, 'Informe copiado'));
  document.getElementById('descargar-informe').addEventListener('click', () => descargar(ctx));
}

function informeTexto(ctx) {
  const l = [];
  l.push('# ' + (ctx.meta.titulo || ctx.info.host));
  l.push('');
  l.push('- URL: ' + ctx.info.url);
  l.push('- Veredicto: ' + ctx.veredicto.etiqueta + ' (' + ctx.veredicto.total + '/100)');
  l.push('- Intención: ' + ctx.intencion.etiqueta);
  l.push('');
  l.push('## Datos a tener en cuenta');
  ctx.datos.forEach((d) => l.push('- **' + d.clave + '**: ' + d.valor));
  l.push('');
  l.push('## Qué se puede implementar');
  ctx.plan.forEach((p, i) => l.push((i + 1) + '. ' + p.titulo + ' — [' + SUPERFICIES[p.superficie].etiqueta + ', impacto ' + p.impacto + ', ' + p.esfuerzo + '] ' + p.paso));
  l.push('');
  l.push('## Qué mejoraría del harness');
  ctx.mejoras.forEach((m) => l.push('- ' + m.titulo + ' (' + m.delta + '): ' + m.evidencia));
  l.push('');
  l.push('## Precedentes');
  ctx.precedentes.forEach((p) => l.push('- ' + p.fecha + ' · ' + p.titulo + ': ' + p.texto));
  l.push('');
  l.push('## Siguiente paso');
  l.push(ctx.siguiente);
  return l.join('\n');
}

async function copiar(texto, boton, okTexto) {
  try {
    await navigator.clipboard.writeText(texto);
    const antes = boton.textContent;
    boton.textContent = okTexto || 'Copiado';
    boton.classList.add('copiado');
    setTimeout(() => { boton.textContent = antes; boton.classList.remove('copiado'); }, 1800);
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); boton.textContent = 'Copiado'; } catch { boton.textContent = 'No se pudo copiar'; }
    document.body.removeChild(area);
  }
}

function descargar(ctx) {
  const nombre = 'analisis-' + ctx.info.host.replace(/[^a-z0-9.-]/gi, '_') + '-' + new Date().toISOString().slice(0, 10) + '.md';
  const blob = new Blob([informeTexto(ctx)], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ───────────────────────── 17. Historial ───────────────────────── */

const APP = 'analista_url';
const LOCAL_KEY = 'analista_url_historial_v1';
let historial = null;

class HistorialLocal {
  constructor() {
    this.history = [];
    this.listeners = new Set();
  }
  _leer() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
  }
  _guardar(items) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, 40))); } catch { /* cuota llena */ }
  }
  _notificar() { this.listeners.forEach((f) => { try { f(); } catch { /* noop */ } }); }
  onChange(f) { this.listeners.add(f); }
  getAll() { return this.history.slice(); }
  async load() { this.history = this._leer(); this._notificar(); return this.getAll(); }
  async save(entry) {
    const item = {
      id: entry.id || 'h_' + Date.now(),
      type: entry.type || 'analisis',
      data: entry.data,
      createdAt: entry.createdAt || new Date().toISOString()
    };
    this.history = this.history.filter((i) => i.id !== item.id);
    this.history.unshift(item);
    this._guardar(this.history);
    this._notificar();
    return item;
  }
  async delete(id) {
    this.history = this.history.filter((i) => i.id !== id);
    this._guardar(this.history);
    this._notificar();
  }
  async clear() {
    this.history = [];
    this._guardar([]);
    this._notificar();
  }
}

function resumenParaHistorial(ctx) {
  return {
    url: ctx.info.url,
    host: ctx.info.host,
    tipo: ctx.info.tipo,
    titulo: ctx.meta.titulo || '',
    veredicto: ctx.veredicto.etiqueta,
    score: ctx.veredicto.total,
    intencion: ctx.intencion.etiqueta,
    fecha: new Date().toISOString(),
    datos: ctx.datos,
    plan: ctx.plan.map((p) => ({ titulo: p.titulo, superficie: p.superficie, impacto: p.impacto, esfuerzo: p.esfuerzo, paso: p.paso, porQue: p.porQue })),
    mejoras: ctx.mejoras.map((m) => ({ titulo: m.titulo, delta: m.delta, evidencia: m.evidencia })),
    precedentes: ctx.precedentes.map((p) => ({ fecha: p.fecha, titulo: p.titulo, veredicto: p.veredicto, texto: p.texto })),
    siguiente: ctx.siguiente,
    encargo: ctx.encargo,
    metaFuente: ctx.meta.fuente
  };
}

function renderHistorial() {
  const grid = document.getElementById('history-grid');
  const titulo = document.getElementById('history-title');
  const vacio = document.getElementById('history-empty');
  const limpiar = document.getElementById('history-clear-btn');
  const items = historial ? historial.getAll() : [];

  if (!items.length) {
    grid.innerHTML = '';
    titulo.style.display = 'none';
    limpiar.style.display = 'none';
    if (vacio) vacio.style.display = 'block';
    return;
  }
  if (vacio) vacio.style.display = 'none';
  titulo.style.display = 'block';
  limpiar.style.display = 'block';
  grid.innerHTML = items.map((it) => {
    const d = it.data || {};
    const fecha = new Date(it.createdAt || d.fecha || Date.now()).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<div class="history-item">
      <button type="button" class="cargar" data-id="${esc(it.id)}" title="${esc(d.url || '')}">
        <span class="history-host">${esc(d.host || 'enlace')}</span>
        <span class="history-tipo">${esc(d.tipo || '')} · ${esc(d.veredicto || '')}</span>
        <span class="history-fecha">${esc(fecha)}</span>
      </button>
      <span class="history-score">${esc(d.score != null ? d.score : '')}</span>
      <button type="button" class="btn-square" data-borrar="${esc(it.id)}" aria-label="Eliminar este análisis">✕</button>
    </div>`;
  }).join('');
}

async function guardarEnHistorial(ctx) {
  if (!historial) return;
  try {
    await historial.save({
      id: 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      type: 'analisis',
      data: resumenParaHistorial(ctx),
      createdAt: new Date().toISOString()
    });
    renderHistorial();
  } catch (e) {
    console.warn('No se pudo guardar en el historial:', e);
  }
}

/* ───────────────────────── 18. Interfaz ───────────────────────── */

function aviso(texto) {
  const el = document.getElementById('overlay-status');
  if (el) el.textContent = texto;
}

function mostrarOverlay(si) {
  const el = document.getElementById('overlay');
  if (!el) return;
  el.classList.toggle('hidden', !si);
  document.body.style.overflow = si ? 'hidden' : '';
}

let intencionElegida = 'auto';

function reabrir(d) {
  const r = document.getElementById('resultado');
  const datos = Array.isArray(d.datos) ? d.datos : [];
  const plan = Array.isArray(d.plan) ? d.plan : [];
  const mejoras = Array.isArray(d.mejoras) ? d.mejoras : [];
  const precedentes = Array.isArray(d.precedentes) ? d.precedentes : [];
  r.innerHTML = `
    <section class="veredicto">
      <div class="veredicto-izq">
        <p class="veredicto-etiqueta">Análisis guardado</p>
        <p class="veredicto-valor">${esc(d.veredicto || '')}</p>
        <p class="veredicto-motivo">${esc(d.intencion || '')}</p>
        <p style="margin-top:.55rem"><span class="url-chip"><span class="dominio">${esc(d.host || '')}</span> ${esc(acortar(d.url || '', 78))}</span></p>
      </div>
      <div class="veredicto-der"><p class="puntuacion">${esc(d.score != null ? d.score : '')}<small>/100</small></p></div>
    </section>
    <section class="tarjeta">
      <h2 class="section-title">Datos a tener en cuenta</h2>
      <div class="grid-datos">
        ${datos.map((x) => `<div class="dato"><p class="dato-clave">${esc(x.clave)}</p><p class="dato-valor ${esc(x.tono || '')}">${esc(x.valor)}</p></div>`).join('')}
      </div>
    </section>
    ${plan.length ? `<section class="tarjeta"><h2 class="section-title">Qué se puede implementar en nuestro harness</h2>
      <div class="implementaciones">${plan.map((p, i) => `<div class="impl"><span class="impl-num">${i + 1}</span><div class="impl-cuerpo"><p class="impl-titulo">${esc(p.titulo)}</p><p class="impl-paso">${esc(p.paso)}</p><div class="impl-meta"><span class="etiqueta superficie">${esc((SUPERFICIES[p.superficie] || {}).etiqueta || p.superficie)}</span><span class="etiqueta impacto-${esc(p.impacto)}">impacto ${esc(p.impacto)}</span><span class="etiqueta">${esc(p.esfuerzo)}</span></div></div><div class="impl-lado">${esc(p.porQue || '')}</div></div>`).join('')}</div></section>` : ''}
    ${mejoras.length ? `<section class="tarjeta"><h2 class="section-title">Qué mejoraría del harness</h2>
      <ul class="mejoras">${mejoras.map((m) => `<li><div class="mejora-cab"><span class="mejora-titulo">${esc(m.titulo)}</span><span class="mejora-delta">${esc(m.delta)}</span></div><p class="mejora-evidencia">${esc(m.evidencia)}</p></li>`).join('')}</ul></section>` : ''}
    ${precedentes.length ? `<section class="tarjeta"><h2 class="section-title">Precedentes</h2>${precedentes.map((p) => `<div class="precedente"><div class="precedente-cab"><span class="precedente-titulo">${esc(p.titulo)}</span><span class="precedente-fecha">${esc(p.fecha)}</span></div><p class="precedente-texto">${esc(p.texto)}</p></div>`).join('')}</section>` : ''}
    <section class="tarjeta"><h2 class="section-title">Siguiente paso</h2><p class="siguiente"><span class="num">→</span> ${esc(d.siguiente || '')}</p>
      <details style="margin-top:.9rem"><summary>Ver el encargo que se copió</summary><div class="prompt-box"><pre>${esc(d.encargo || '')}</pre></div></details>
    </section>`;
  r.hidden = false;
}

function arrancar() {
  const form = document.getElementById('analizar-form');
  const inputUrl = document.getElementById('url-input');
  const inputTexto = document.getElementById('contexto-input');
  const infoTexto = document.getElementById('contexto-info');
  const error = document.getElementById('form-error');
  const boton = document.getElementById('analizar-btn');
  const etiquetaBoton = document.getElementById('analizar-btn-label');

  document.querySelectorAll('.intent-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.intent-chip').forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      intencionElegida = chip.dataset.intent;
    });
  });

  document.querySelectorAll('.ejemplo').forEach((b) => {
    b.addEventListener('click', () => {
      inputUrl.value = b.dataset.url;
      inputUrl.focus();
    });
  });

  inputTexto.addEventListener('input', () => {
    const t = inputTexto.value;
    const info = parsearUrl(inputUrl.value) || { url: '', path: '', tipo: 'web' };
    const sig = detectarSenales(info, t);
    infoTexto.textContent = t.length.toLocaleString('es-ES') + ' caracteres · ' + sig.lista.length + ' señales detectadas';
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    error.hidden = true;

    const url = inputUrl.value.trim();
    if (!url) {
      error.textContent = 'Escribe una URL para analizar.';
      error.hidden = false;
      inputUrl.focus();
      return;
    }

    boton.disabled = true;
    etiquetaBoton.textContent = 'Analizando...';
    mostrarOverlay(true);
    aviso('Leyendo el enlace...');

    try {
      const ctx = await analizar(url, intencionElegida, inputTexto.value.trim(), aviso);
      renderizar(ctx);
      await guardarEnHistorial(ctx);
      document.getElementById('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      error.textContent = e.message || 'No se pudo analizar la URL.';
      error.hidden = false;
    } finally {
      mostrarOverlay(false);
      boton.disabled = false;
      etiquetaBoton.textContent = 'Analizar';
    }
  });

  document.getElementById('history-grid').addEventListener('click', async (ev) => {
    const borrar = ev.target.closest('[data-borrar]');
    if (borrar) {
      ev.stopPropagation();
      if (confirm('¿Eliminar este análisis del historial?')) {
        try { await historial.delete(borrar.dataset.borrar); } catch (e) { console.warn(e); }
        renderHistorial();
      }
      return;
    }
    const cargar = ev.target.closest('.cargar');
    if (cargar && historial) {
      const item = historial.getAll().find((i) => i.id === cargar.dataset.cargar || i.id === cargar.dataset.id);
      if (!item || !item.data) return;
      inputUrl.value = item.data.url || '';
      reabrir(item.data);
      document.getElementById('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  document.getElementById('history-clear-btn').addEventListener('click', async () => {
    if (confirm('¿Eliminar todo el historial de análisis?')) {
      try { await historial.clear(); } catch (e) { console.warn(e); }
      renderHistorial();
    }
  });

  const esArchivo = location.protocol === 'file:';
  const usarServidor = !esArchivo && typeof HistoryManager === 'function';
  historial = usarServidor ? new HistoryManager(APP) : new HistorialLocal();
  historial.onChange(renderHistorial);

  (async () => {
    try {
      await historial.load();
    } catch (e) {
      console.warn('Historial del servidor no disponible, se usa el local:', e);
      historial = new HistorialLocal();
      historial.onChange(renderHistorial);
      await historial.load();
    }
    renderHistorial();
  })();
}

document.addEventListener('DOMContentLoaded', arrancar);
