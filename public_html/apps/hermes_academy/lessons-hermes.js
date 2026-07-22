/**
 * Hermes Academy — Datos de lecciones en español.
 * Basado en la documentación oficial de hermes-agent.nousresearch.com/docs
 */
const LESSONS_HERMES = [
  {
    "id": "l1",
    "level": 1,
    "title": "¿Qué es Hermes Agent?",
    "icon": "🚀",
    "desc": "Hermes Agent es un agente de IA autónomo con un bucle de aprendizaje cerrado: crea skills desde la experiencia, las mejora durante el uso y construye un modelo cada vez más profundo de quién eres.",
    "paragraphs": [
      "Hermes Agent es un agente de IA autónomo construido por Nous Research, el laboratorio detrás de los modelos Hermes, Nomos y Psyche. No es un copiloto de código atado a un IDE ni un wrapper de chatbot. Vive donde lo pongas: un VPS de 5$, un clúster de GPUs o infraestructura serverless que no cuesta casi nada cuando está inactiva.",
      "El único agente con un bucle de aprendizaje cerrado: crea skills desde la experiencia, las mejora durante el uso, se auto-nudgea para persistir conocimiento y construye un modelo cada vez más profundo de quién eres a través de las sesiones.",
      "Funciona con Nous Portal, OpenRouter, OpenAI o cualquier endpoint compatible. Ofrece 6 backends de terminal (local, Docker, SSH, Daytona, Singularity, Modal), 20+ plataformas de mensajería, cron integrado, delegación de subagentes, skills compatibles con agentskills.io y soporte MCP.",
      "El camino más rápido: instala con el Desktop installer, ejecuta hermes setup --portal (una suscripción cubre modelo + Tool Gateway: búsqueda web, imágenes, TTS, navegador) y empieza a chatear."
    ],
    "tips": [
      "El camino más rápido para tener un agente funcionando: después de instalar, ejecuta hermes setup --portal. Un OAuth cubre un modelo más las cuatro herramientas del Tool Gateway.",
      "Hermes Agent se vuelve más capaz cuanto más tiempo funciona: no es una herramienta estática, aprende y mejora con el uso."
    ],
    "commands": [
      "hermes setup --portal",
      "hermes model",
      "hermes tools",
      "hermes gateway setup",
      "hermes config set",
      "hermes config get",
      "hermes desktop",
      "hermes --version"
    ]
  },
  {
    "id": "l2",
    "level": 1,
    "title": "Instalación",
    "icon": "💿",
    "desc": "Instala Hermes Agent en menos de 2 minutos en Windows, macOS, Linux, WSL2 o Android (Termux).",
    "paragraphs": [
      "Para ver la matriz completa de plataformas soportadas (sistemas operativos, métodos de distribución y funciones específicas), consulta la página de Soporte de Plataformas en la documentación oficial.",
      "Para instalar fácilmente las aplicaciones de línea de comandos y escritorio, descarga el instalador de Hermes Desktop desde la web oficial y ejecútalo. Es la forma recomendada en Windows y macOS.",
      "Si solo necesitas la línea de comandos sin el escritorio, ejecuta: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash (Linux/macOS/WSL2/Android) o en PowerShell de Windows: iex (irm https://hermes-agent.nousresearch.com/install.ps1).",
      "El instalador se encarga de todo automáticamente: Python, Node.js, ripgrep, ffmpeg, clona el repositorio, crea el entorno virtual y configura el comando global hermes. Al terminar, ejecuta source ~/.bashrc y escribe hermes para empezar."
    ],
    "tips": [],
    "commands": [
      "hermes",
      "hermes setup",
      "hermes setup --portal",
      "hermes model",
      "hermes tools",
      "hermes gateway setup",
      "hermes config set",
      "hermes config get",
      "hermes desktop",
      "hermes doctor",
      "hermes update",
      "hermes config check",
      "hermes config migrate",
      "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
    ]
  },
  {
    "id": "l3",
    "level": 1,
    "title": "Quickstart — Primeros Pasos",
    "icon": "⚡",
    "desc": "Tu primera conversación con Hermes y las funciones clave que debes probar.",
    "paragraphs": [
      "Esta guía te lleva de cero a tener un Hermes funcionando y sobreviviendo al uso real. Instala, elige un proveedor, verifica un chat funcional y aprende exactamente qué hacer cuando algo se rompa.",
      "El tutorial más rápido: instala Hermes (Desktop o CLI), ejecuta hermes setup --portal para autenticarte con Nous Portal (cubre modelo + herramientas), y empieza a chatear inmediatamente. Desde la primera conversación puedes pedirle que busque en la web, genere imágenes o lea archivos.",
      "Si tu proveedor no funciona, usa hermes model para cambiar. Si una herramienta falla, hermes tools te muestra qué está activo. Para diagnóstico completo: hermes doctor. Y si todo falla, hermes setup te permite reconfigurar desde cero.",
      "Funciones clave que deberías probar en tu primera sesión: pídele que busque algo en internet, que lea un archivo de tu disco, que recuerde un dato importante sobre ti (memoria), y que ejecute un comando simple en la terminal."
    ],
    "tips": [
      "Después de instalar, simplemente escribe hermes en la terminal y empieza a chatear. No necesitas configuración adicional para una conversación básica."
    ],
    "commands": [
      "hermes",
      "hermes setup --portal",
      "hermes model",
      "hermes tools",
      "hermes doctor",
      "hermes setup",
      "hermes config set OPENROUTER_API_KEY tu_clave"
    ]
  },
  {
    "id": "l4",
    "level": 1,
    "title": "Ruta de Aprendizaje",
    "icon": "🗺️",
    "desc": "Encuentra la documentación adecuada según tu nivel de experiencia y caso de uso.",
    "paragraphs": [
      "Esta página te ayuda a encontrar la documentación correcta según tu nivel de experiencia y lo que quieres lograr con Hermes. No hace falta leer todo: empieza por lo que coincida con tu perfil.",
      "Si eres nuevo en Hermes Agent, empieza por la Guía de Instalación y el Quickstart. En 10 minutos tendrás el agente funcionando y habrás tenido tu primera conversación.",
      "Si ya lo tienes instalado pero quieres sacarle más partido, explora la sección de Configuración para personalizar proveedores, modelos, herramientas y plataformas de mensajería. Luego sumérgete en Skills, Memoria y Archivos de Contexto.",
      "Para usuarios avanzados: domina MCP para conectar herramientas externas, Delegación para trabajo paralelo con subagentes, Cron para automatizaciones programadas y el API Server para exponer Hermes como servicio REST."
    ],
    "tips": [
      "No necesitas leer toda la documentación de una vez. Escoge tu nivel y caso de uso, y profundiza solo en las secciones relevantes para ti.",
      "La documentación oficial está organizada por niveles: Instalación → Primeros Pasos → Guía de Usuario → Funcionalidades → Referencia."
    ],
    "commands": []
  },
  {
    "id": "l5",
    "level": 1,
    "title": "Resumen de Funcionalidades",
    "icon": "🧩",
    "desc": "Panorama general de todas las capacidades de Hermes: herramientas, automatización, medios, integraciones y personalización.",
    "paragraphs": [
      "Hermes Agent incluye más de 60 herramientas integradas organizadas en toolsets: terminal, archivos, búsqueda web, navegador, generación de imágenes, TTS (texto a voz), memoria, skills, delegación, cron y mucho más.",
      "El núcleo del agente incluye: bucle cerrado de aprendizaje (crea y mejora skills automáticamente), memoria persistente entre sesiones, archivos de contexto por proyecto (AGENTS.md, CLAUDE.md), personalidad configurable (SOUL.md) y sistema de perfiles múltiples.",
      "Automatización: trabajos cron con entrega a cualquier plataforma de mensajería, pipelines de datos sin intervención manual y delegación de tareas a subagentes que trabajan en paralelo.",
      "Medios y web: búsqueda web con extracción inteligente de contenido, navegador headless para interactuar con páginas, generación de imágenes vía DALL·E/FLUX, texto a voz en múltiples voces, y modo de voz completo en CLI y mensajería."
    ],
    "tips": [],
    "commands": [
      "hermes tools",
      "hermes config set",
      "hermes setup --portal"
    ]
  },
  {
    "id": "l6",
    "level": 2,
    "title": "Configuración",
    "icon": "⚙️",
    "desc": "Domina el archivo config.yaml, las variables de entorno, la precedencia de configuración y la estructura de directorios.",
    "paragraphs": [
      "La configuración de Hermes se almacena en ~/.hermes/config.yaml. Puedes editarlo directamente o usar los comandos hermes config set/get. El archivo usa formato YAML y controla proveedores, modelos, herramientas, plataformas de mensajería, voz, cron y prácticamente todos los aspectos del agente.",
      "La precedencia de configuración es: variables de entorno > archivo config.yaml > valores por defecto. Esto significa que puedes sobrescribir cualquier valor del YAML exportando una variable de entorno, útil para secretos y despliegues en la nube.",
      "La estructura de directorios principal es: ~/.hermes/config.yaml (configuración), ~/.hermes/skills/ (skills personalizadas), ~/.hermes/profiles/<nombre>/ (perfiles múltiples), ~/.hermes/sessions/ (historial de conversaciones).",
      "Puedes gestionar la configuración con: hermes config get para ver valores, hermes config set clave valor para cambiar, hermes config check para validar, y hermes config migrate para actualizar desde versiones anteriores."
    ],
    "tips": [
      "Usa hermes config check después de editar config.yaml manualmente para validar que la sintaxis es correcta.",
      "Para secretos (claves API), usa variables de entorno en ~/.hermes/.env en lugar de escribirlas directamente en config.yaml. Así evitas filtrarlas sin querer."
    ],
    "commands": [
      "hermes config get",
      "hermes config set",
      "hermes config check",
      "hermes config migrate",
      "hermes config set OPENROUTER_API_KEY tu_clave",
      "hermes model",
      "hermes tools"
    ]
  },
  {
    "id": "l7",
    "level": 2,
    "title": "Proveedores de IA",
    "icon": "🔌",
    "desc": "Conecta OpenRouter, OpenAI, Anthropic, Google, DeepSeek, xAI y proveedores self-hosted. Aprende sobre enrutamiento de modelos.",
    "paragraphs": [
      "Hermes Agent soporta múltiples proveedores de inferencia: OpenRouter (300+ modelos en un solo endpoint), OpenAI, Anthropic, Google (Gemini), DeepSeek, xAI (Grok), y cualquier endpoint compatible con la API de OpenAI.",
      "OpenRouter es el proveedor recomendado por su flexibilidad: acceso a cientos de modelos, enrutamiento automático al más barato disponible, y soporte para modelos privados. Configúralo con hermes config set OPENROUTER_API_KEY tu_clave.",
      "Para proveedores self-hosted (Ollama, vLLM, LM Studio, etc.), configura un custom provider en config.yaml apuntando a tu endpoint local. Ideal para modelos locales sin coste de API y máxima privacidad.",
      "Nous Portal unifica modelo + herramientas en una sola suscripción: incluye acceso a modelos premium y al Tool Gateway (búsqueda web, imágenes, TTS, navegador). Configúralo con hermes setup --portal."
    ],
    "tips": [
      "OpenRouter te permite cambiar de modelo sin cambiar de proveedor. Prueba distintos modelos para encontrar el mejor equilibrio calidad/precio para tu caso de uso.",
      "Si tu presupuesto es ajustado, configura modelos auxiliares (aux_models) en OpenRouter para tareas ligeras y reserva el modelo principal para tareas complejas."
    ],
    "commands": [
      "hermes model",
      "hermes setup --portal",
      "hermes config set OPENROUTER_API_KEY tu_clave",
      "hermes config set OPENAI_API_KEY tu_clave",
      "hermes config set ANTHROPIC_API_KEY tu_clave"
    ]
  },
  {
    "id": "l8",
    "level": 2,
    "title": "Sistema de Skills",
    "icon": "📚",
    "desc": "La memoria procedimental de Hermes: crea, carga, mejora y comparte skills reutilizables. Formato SKILL.md y agentskills.io.",
    "paragraphs": [
      "Las skills son la memoria procedimental de Hermes. Son archivos markdown con instrucciones que el agente carga cuando detecta que una tarea coincide con la descripción de la skill. Se crean desde la experiencia, se mejoran durante el uso y se comparten a través de agentskills.io.",
      "Cada skill es un archivo SKILL.md con frontmatter YAML (nombre, descripción, tags) y cuerpo en markdown con instrucciones paso a paso. Cuando una skill está cargada, Hermes ve sus instrucciones como parte de su sistema de prompts.",
      "Hermes puede crear skills automáticamente cuando completa una tarea compleja (5+ tool calls, errores superados, flujo de trabajo descubierto). También puedes cargarlas manualmente desde agentskills.io o desde archivos locales con /learn.",
      "Las skills soportan carga progresiva: primero se carga la descripción y triggers, luego el contenido completo solo si la tarea coincide. Esto ahorra tokens de contexto cuando tienes muchas skills instaladas."
    ],
    "tips": [
      "Después de completar una tarea compleja con Hermes, pregúntale si quiere guardar el flujo como skill. Las skills mejoran con cada uso.",
      "Visita agentskills.io para descubrir skills creadas por la comunidad. Hay skills para desarrollo web, análisis de datos, automatización y mucho más."
    ],
    "commands": [
      "hermes skill view nombre_skill",
      "hermes skill list",
      "/learn url_o_archivo"
    ]
  },
  {
    "id": "l9",
    "level": 2,
    "title": "Herramientas y Toolsets",
    "icon": "🔧",
    "desc": "Más de 60 herramientas integradas. Aprende a configurar toolsets por perfil y a usar backends de terminal.",
    "paragraphs": [
      "Hermes Agent incluye más de 60 herramientas integradas organizadas en toolsets: terminal, archivos, web, navegador, imágenes, TTS, memoria, skills, delegación, cron, y muchas más. Cada toolset agrupa herramientas relacionadas que puedes activar o desactivar por perfil.",
      "Los toolsets se configuran en config.yaml bajo la clave toolsets. Puedes definir toolsets globales y luego sobrescribirlos por perfil. Usa hermes tools para ver y gestionar qué herramientas están activas.",
      "El backend de terminal determina dónde se ejecutan los comandos. Hermes soporta 6 backends: local (tu máquina), Docker (contenedor aislado), SSH (servidor remoto), Daytona (entornos efímeros), Singularity (HPC) y Modal (serverless).",
      "La gestión de procesos en segundo plano permite lanzar servidores, tests largos o builds sin bloquear la conversación. Usa process(action='list') para ver procesos activos, process(action='poll') para ver progreso y process(action='kill') para terminarlos."
    ],
    "tips": [
      "Desactiva los toolsets que no uses para ahorrar tokens de contexto. Cada toolset cargado consume tokens del system prompt.",
      "Para desarrollo web, activa terminal + file + browser. Para análisis de datos, terminal + file. Para automatización, cron + web + terminal."
    ],
    "commands": [
      "hermes tools",
      "hermes config set toolsets terminal,file,web"
    ]
  },
  {
    "id": "l10",
    "level": 2,
    "title": "Sistema de Memoria",
    "icon": "🧠",
    "desc": "Memoria persistente que crece entre sesiones. Guarda datos del usuario y notas propias con el sistema de dos objetivos.",
    "paragraphs": [
      "Hermes tiene un sistema de memoria persistente que sobrevive entre sesiones. La memoria se inyecta en cada turno de conversación, permitiendo al agente recordar preferencias, datos personales, contexto del entorno y convenciones de trabajo sin que tengas que repetirlas.",
      "La memoria usa dos objetivos (targets): 'user' para información sobre ti (nombre, preferencias, estilo, datos personales) y 'memory' para notas del agente (entorno, convenciones, lecciones aprendidas, peculiaridades de herramientas).",
      "Qué guardar: preferencias del usuario, correcciones recurrentes, datos del entorno estables. Qué NO guardar: progreso de tareas, resultados completados, números de PR, commits SHAs, o cualquier cosa que quede obsoleta en una semana.",
      "Hermes se auto-nudgea para persistir conocimiento importante. Si detecta que has corregido algo varias veces o has mencionado un dato relevante, te sugerirá guardarlo en memoria. También puedes pedirle explícitamente que recuerde algo."
    ],
    "tips": [
      "La memoria más valiosa es la que evita que tengas que corregir o recordarle algo al agente en sesiones futuras. Prioriza preferencias y correcciones sobre datos de procedimiento.",
      "Revisa y limpia la memoria periódicamente. Con el tiempo puede acumularse información obsoleta que consume tokens sin aportar valor."
    ],
    "commands": []
  },
  {
    "id": "l11",
    "level": 2,
    "title": "Archivos de Contexto",
    "icon": "📄",
    "desc": "AGENTS.md, CLAUDE.md y .cursorrules: cómo dar contexto permanente a cada conversación en un proyecto.",
    "paragraphs": [
      "Los archivos de contexto se cargan automáticamente al iniciar una conversación en un directorio de proyecto. Definen reglas, convenciones, estructura del proyecto, dependencias, estilos de código y cualquier información que el agente deba conocer para trabajar en ese proyecto.",
      "Hermes soporta múltiples formatos de archivos de contexto: AGENTS.md (formato universal), CLAUDE.md (compatible con Claude Code), .cursorrules (compatible con Cursor IDE) y .hermesrules (específico de Hermes). También puede leer instrucciones desde el bloque de sistema en los prompts.",
      "Estos archivos definen la arquitectura del proyecto, las reglas de codificación, las convenciones de estilo, las dependencias disponibles y cualquier restricción específica. El agente los consulta antes de hacer cualquier cambio en el código.",
      "Mejor práctica: mantén los archivos de contexto actualizados y concisos. Incluye solo información que cambie el comportamiento del agente. Evita documentación genérica que ya está disponible en las skills o en la memoria."
    ],
    "tips": [
      "Crea un AGENTS.md en la raíz de cada proyecto con al menos: lenguaje, framework, convenciones de estilo, comandos de build/test, y restricciones específicas del proyecto.",
      "Los archivos de contexto son acumulativos: Hermes carga el primer archivo que encuentra subiendo desde el directorio actual hasta la raíz del proyecto."
    ],
    "commands": []
  },
  {
    "id": "l12",
    "level": 2,
    "title": "Personalidad (SOUL.md)",
    "icon": "🎭",
    "desc": "Define la voz y comportamiento por defecto de Hermes con un archivo SOUL.md global.",
    "paragraphs": [
      "SOUL.md es el archivo que define la personalidad base de Hermes Agent. Se encuentra en ~/.hermes/SOUL.md y establece el tono, estilo de comunicación, nivel de formalidad, uso de emojis, verbosidad y cualquier directriz de comportamiento que quieras que el agente siga en todas las conversaciones.",
      "El contenido de SOUL.md se inyecta al principio del system prompt en cada conversación. Puedes definir quién es Hermes, cómo debe dirigirse a ti, qué estilo de respuestas prefieres (concisas, detalladas, técnicas, divulgativas), y cualquier restricción de comportamiento.",
      "Un buen SOUL.md incluye: descripción del tono deseado, preferencias de formato (listas, párrafos, código inline), uso de jerga técnica, idioma por defecto, y reglas de cortesía o formalidad. Evita instrucciones genéricas como 'eres el mejor experto del mundo'.",
      "Puedes editar SOUL.md en cualquier momento y los cambios se aplican en la siguiente conversación. No necesitas reiniciar Hermes. También puedes tener SOUL.md específicos por perfil."
    ],
    "tips": [
      "Empieza con un SOUL.md mínimo y ve refinándolo según veas cómo responde el agente. Es más fácil añadir directrices que corregir un SOUL.md sobrecargado.",
      "Si usas varios perfiles (trabajo, personal, proyectos), crea un SOUL.md distinto para cada uno que refleje el contexto y tono adecuado."
    ],
    "commands": []
  },
  {
    "id": "l13",
    "level": 2,
    "title": "Seguridad",
    "icon": "🔒",
    "desc": "Control de comandos peligrosos, autorización de usuarios, aislamiento con contenedores y seguridad en la pasarela de mensajería.",
    "paragraphs": [
      "Hermes incluye múltiples capas de seguridad para ejecutar comandos de forma controlada. La aprobación de comandos peligrosos te pide confirmación antes de ejecutar operaciones destructivas. Puedes configurar qué comandos requieren aprobación y cuáles se ejecutan automáticamente.",
      "La seguridad de archivos protege contra escrituras accidentales: Hermes no sobrescribe archivos sin confirmación y advierte cuando una operación afecta a archivos fuera del directorio de trabajo esperado.",
      "La autorización de usuarios en la pasarela de mensajería permite controlar quién puede hablar con el agente desde Telegram, Discord y otras plataformas. Puedes restringir por ID de usuario, rol o servidor.",
      "Para entornos sensibles, Hermes soporta aislamiento con contenedores: el backend Docker ejecuta comandos en un contenedor efímero que se destruye al terminar, y Daytona/Modal proporcionan entornos serverless completamente aislados."
    ],
    "tips": [
      "En producción, usa siempre el backend Docker o SSH para aislar los comandos del sistema anfitrión.",
      "Configura la aprobación de comandos en config.yaml según tu tolerancia al riesgo. En entornos de desarrollo puedes ser más permisivo; en producción, más restrictivo."
    ],
    "commands": [
      "hermes config set command_approval true",
      "hermes config set docker_backend true"
    ]
  },
  {
    "id": "l14",
    "level": 2,
    "title": "Búsqueda Web",
    "icon": "🌐",
    "desc": "Busca en la web, extrae contenido de páginas y procesa resultados con IA.",
    "paragraphs": [
      "Hermes puede buscar en internet usando múltiples backends: Google (a través del Tool Gateway de Nous Portal), Brave Search, SearXNG (self-hosted) y Tavily. Cada backend tiene sus ventajas: Google para resultados completos, Brave para privacidad, SearXNG para self-hosting gratuito.",
      "La herramienta web_extract permite extraer el contenido textual de cualquier URL. Hermes procesa páginas largas por fragmentos, extrayendo solo el contenido relevante y descartando navegación, anuncios y elementos no informativos.",
      "La configuración es sencilla: con Nous Portal, la búsqueda web viene incluida sin configuración adicional. Para otros backends, configura la clave API correspondiente (BRAVE_API_KEY, SEARXNG_URL, etc.) en config.yaml o variables de entorno.",
      "La búsqueda web se integra con el resto de herramientas: el agente puede buscar información, extraerla de páginas, analizarla, y luego guardarla en archivos o usarla para tomar decisiones."
    ],
    "tips": [
      "Nous Portal incluye búsqueda web sin coste adicional ni configuración. Es la opción más sencilla si ya tienes la suscripción.",
      "Para búsquedas que necesiten información muy actualizada, la búsqueda web es mejor que depender del conocimiento del modelo, que tiene fecha de corte."
    ],
    "commands": [
      "hermes config set BRAVE_API_KEY tu_clave",
      "hermes setup --portal"
    ]
  },
  {
    "id": "l15",
    "level": 2,
    "title": "Navegador",
    "icon": "🖥️",
    "desc": "Controla un navegador headless para interactuar con webs, hacer clics, rellenar formularios y grabar sesiones.",
    "paragraphs": [
      "Hermes incluye un navegador headless completo basado en Playwright/Puppeteer. Permite navegar a URLs, hacer clic en elementos, rellenar formularios, hacer scroll, tomar capturas de pantalla, inspeccionar el DOM y extraer datos estructurados de páginas web dinámicas.",
      "Las herramientas del navegador incluyen: browser_navigate (ir a una URL), browser_click (clic en elemento), browser_type (escribir texto), browser_snapshot (obtener estructura de la página), browser_vision (captura de pantalla para análisis visual) y browser_console (leer consola JS).",
      "La configuración requiere el Tool Gateway de Nous Portal o un backend de navegador propio. Con Portal, el navegador se ejecuta en la nube sin consumir recursos locales. También puedes ejecutarlo localmente con Playwright instalado.",
      "Casos de uso prácticos: probar aplicaciones web que estás desarrollando, extraer datos de sitios que requieren JavaScript, automatizar formularios, verificar despliegues y hacer QA visual de interfaces."
    ],
    "tips": [
      "Usa browser_snapshot primero para obtener los refs de los elementos interactivos, luego browser_click(ref='@e5') para interactuar con ellos.",
      "El navegador es ideal para probar tus propias apps desplegadas en Hostinger u otros servidores. Puedes automatizar tests visuales y funcionales."
    ],
    "commands": [
      "hermes setup --portal"
    ]
  },
  {
    "id": "l16",
    "level": 3,
    "title": "MCP (Model Context Protocol)",
    "icon": "🔌",
    "desc": "Conecta servidores MCP para extender las capacidades de Hermes con herramientas externas de forma segura.",
    "paragraphs": [
      "MCP (Model Context Protocol) es un estándar abierto que permite a Hermes conectarse a servidores externos que proporcionan herramientas adicionales. Con MCP puedes darle a Hermes acceso a bases de datos, APIs, sistemas de archivos remotos, servicios cloud y cualquier recurso que exponga un servidor MCP.",
      "Hermes actúa como cliente MCP: se conecta a uno o varios servidores, descubre sus herramientas disponibles, y las pone a disposición del agente como si fueran herramientas nativas. El agente decide cuándo usar cada herramienta según la tarea.",
      "El catálogo de Hermes incluye servidores MCP pre-aprobados que puedes instalar con un solo comando (hermes mcp install). También puedes conectar tus propios servidores MCP configurándolos en config.yaml bajo la clave mcp.servers.",
      "Hay dos tipos de servidores MCP: stdio (procesos locales que se comunican por entrada/salida estándar) y HTTP (servidores remotos accesibles vía red). Los servidores stdio son más seguros porque no exponen puertos de red."
    ],
    "tips": [
      "Empieza con los servidores MCP del catálogo oficial. Están probados y mantenidos por la comunidad de Hermes.",
      "Para entornos de producción, prefiere servidores MCP stdio sobre HTTP. No requieren exponer puertos y son más fáciles de asegurar."
    ],
    "commands": [
      "hermes mcp install",
      "hermes mcp list",
      "hermes mcp remove"
    ]
  },
  {
    "id": "l17",
    "level": 3,
    "title": "Delegación (Subagentes)",
    "icon": "👥",
    "desc": "Genera subagentes aislados para trabajo paralelo: tareas individuales o lotes de hasta 3 agentes simultáneos.",
    "paragraphs": [
      "La delegación permite a Hermes generar subagentes independientes que trabajan en paralelo en tareas separadas. Cada subagente tiene su propio contexto aislado, terminal y herramientas, y solo devuelve el resultado final al agente principal.",
      "Hay dos modos de delegación: tarea única (proporcionas un goal y contexto) y lote paralelo (hasta 3 tareas simultáneas que se ejecutan a la vez). El modo batch es ideal para dividir trabajo independiente: investigar A y B al mismo tiempo, revisar código y documentación en paralelo.",
      "Los subagentes no tienen acceso a tu conversación principal: debes pasarles toda la información relevante en el campo context. Tampoco pueden pedir aclaraciones (no tienen acceso a la herramienta clarify). Esto los hace ideales para trabajo autónomo que no requiere interacción.",
      "Cuándo usar delegación: tareas que requieren razonamiento intensivo (debugging, code review), trabajos que inundarían tu contexto principal, y flujos de trabajo paralelos independientes. Cuándo NO usarla: tareas mecánicas simples o trabajos que requieren interacción con el usuario."
    ],
    "tips": [
      "Para tareas largas (tests, builds), considera usar terminal en background con notify_on_complete en lugar de delegación. Los subagentes no sobreviven si cierras la sesión.",
      "Pasa información específica en el campo context: rutas de archivos, mensajes de error, restricciones. Cuanto más contexto, mejor será el resultado del subagente."
    ],
    "commands": []
  },
  {
    "id": "l18",
    "level": 3,
    "title": "Tareas Programadas (Cron)",
    "icon": "⏰",
    "desc": "Automatiza tareas recurrentes: monitores, informes, pipelines de datos. Sintaxis cron completa y entrega a cualquier plataforma.",
    "paragraphs": [
      "El sistema de cron integrado de Hermes te permite programar tareas recurrentes que se ejecutan automáticamente. Puedes crear trabajos que se disparen cada N minutos, cada hora, diariamente, o con expresión cron clásica (0 9 * * * para las 9 AM cada día).",
      "Cada trabajo cron se configura con un prompt autónomo (el agente no tendrá contexto de tu conversación), skills opcionales que cargar antes de ejecutar, un horario (schedule), y una plataforma de entrega (deliver) para recibir los resultados en Telegram, Discord, etc.",
      "Los trabajos pueden ser de dos tipos: con agente (LLM-driven, el prompt se procesa con IA) o sin agente (script puro, la salida se entrega tal cual). El tipo sin agente es ideal para watchdogs y monitores simples que no necesitan razonamiento.",
      "Los trabajos cron se pueden encadenar con context_from: el trabajo B recibe la salida del trabajo A como contexto. Esto permite construir pipelines de datos donde cada etapa procesa el resultado de la anterior."
    ],
    "tips": [
      "Usa deliver='telegram' o deliver='discord' para recibir los resultados de tus crons donde realmente los vas a ver.",
      "Cada job de cron se ejecuta en una sesión fresca sin contexto de conversaciones anteriores. Asegúrate de que el prompt sea autónomo y contenga toda la información necesaria."
    ],
    "commands": [
      "hermes cron list",
      "hermes cron create",
      "hermes cron run",
      "hermes cron remove",
      "hermes cron pause"
    ]
  },
  {
    "id": "l19",
    "level": 3,
    "title": "Automatización con Cron",
    "icon": "🤖",
    "desc": "Patrones prácticos: monitor de cambios web, informes semanales, watchdog de repositorios y pipelines de datos.",
    "paragraphs": [
      "Esta guía recoge patrones prácticos de automatización con el sistema de cron de Hermes. Cada patrón es una receta lista para copiar, adaptar y poner en producción en minutos.",
      "Patrón 1 — Monitor de cambios web: un script que visita una URL cada hora, extrae el contenido, lo compara con la versión anterior, y te avisa por Telegram si hay cambios. Ideal para seguir ofertas, noticias o cambios en documentación.",
      "Patrón 2 — Informe semanal: cada lunes a las 8 AM, Hermes recopila las tareas completadas, las ordena por proyecto, y te envía un resumen formateado a Discord. Usa context_from para alimentar datos de otros crons.",
      "Patrón 3 — Watchdog de repositorios GitHub: un script que comprueba nuevos issues/PRs en tus repos, los clasifica por prioridad, y te notifica solo los que requieren atención inmediata."
    ],
    "tips": [
      "Empieza con un patrón simple (monitor de cambios) y ve añadiendo complejidad. No intentes construir una pipeline compleja desde cero.",
      "Separa la recolección de datos del procesamiento usando context_from. Así si una etapa falla, las demás pueden seguir funcionando."
    ],
    "commands": [
      "hermes cron create",
      "hermes cron run",
      "hermes cron list"
    ]
  },
  {
    "id": "l20",
    "level": 3,
    "title": "Nous Portal",
    "icon": "☁️",
    "desc": "Una suscripción cubre 300+ modelos más Tool Gateway (búsqueda, imágenes, TTS, navegador). Configuración en un comando.",
    "paragraphs": [
      "Nous Portal es el servicio de suscripción oficial de Nous Research para Hermes Agent. Una única suscripción mensual cubre: acceso a 300+ modelos de IA a través de OpenRouter, más el Tool Gateway completo (búsqueda web, generación de imágenes, texto a voz y navegador cloud).",
      "La configuración no puede ser más sencilla: ejecuta hermes setup --portal, inicia sesión con OAuth, y en un minuto tienes todo listo. Sin hacer malabares con 5 claves API diferentes de 5 proveedores distintos.",
      "La suscripción incluye acceso a modelos premium como Claude, GPT-4, Gemini, Llama y modelos especializados. Puedes cambiar de modelo en cualquier momento sin cambiar de proveedor ni de configuración.",
      "El Tool Gateway incluido unifica herramientas que normalmente requerirían suscripciones separadas: búsqueda web (Google), generación de imágenes (DALL·E/FLUX), síntesis de voz (múltiples voces) y navegador cloud (Playwright)."
    ],
    "tips": [
      "Si usas Hermes a diario, la suscripción a Portal se amortiza rápido al evitar tener que contratar y configurar 4-5 servicios distintos.",
      "Con Portal puedes usar el navegador cloud sin instalar Playwright ni preocuparte por los recursos de tu máquina local."
    ],
    "commands": [
      "hermes setup --portal",
      "hermes model"
    ]
  },
  {
    "id": "l21",
    "level": 3,
    "title": "Tool Gateway",
    "icon": "🌉",
    "desc": "Acceso unificado a búsqueda web, generación de imágenes, TTS y navegador cloud mediante el Portal de Nous.",
    "paragraphs": [
      "El Tool Gateway de Nous Portal proporciona cuatro herramientas cloud unificadas bajo una misma suscripción: búsqueda web (Google), generación de imágenes (DALL·E/FLUX), texto a voz (múltiples voces y proveedores) y navegador cloud (Playwright headless).",
      "La gran ventaja es la simplicidad: activas las 4 herramientas con un solo OAuth. No necesitas crear cuentas de desarrollador en Google, OpenAI, ElevenLabs ni proveedores de navegadores cloud. Todo funciona desde el minuto uno.",
      "Puedes mezclar y combinar: usa el modelo que quieras (OpenAI, Anthropic, etc.) con las herramientas del Gateway. No estás atado a un ecosistema cerrado. El Gateway funciona como un complemento independiente del proveedor de modelos.",
      "La elegibilidad es simple: cualquier suscriptor de Nous Portal tiene acceso completo al Tool Gateway. No hay límites de uso abusivos ni costes ocultos por herramienta."
    ],
    "tips": [
      "El Tool Gateway es la forma más rápida de tener búsqueda web, imágenes, TTS y navegador funcionando sin configuración adicional.",
      "Incluso si usas OpenRouter para los modelos, puedes beneficiarte del Tool Gateway de Portal para las herramientas."
    ],
    "commands": [
      "hermes setup --portal"
    ]
  },
  {
    "id": "l22",
    "level": 3,
    "title": "API Server",
    "icon": "🔗",
    "desc": "Expón Hermes como API REST: chat, ejecución de tareas, gestión de sesiones y trabajos programados.",
    "paragraphs": [
      "El API Server de Hermes te permite exponer tu agente como un servicio REST completo. Cualquier aplicación puede enviar prompts y recibir respuestas de Hermes a través de endpoints HTTP estándar, con todas las capacidades del agente (herramientas, memoria, skills) disponibles.",
      "Endpoints principales: POST /v1/chat/completions (compatible con formato OpenAI), POST /runs (ejecución de tareas en segundo plano), GET /runs/{id} (consultar estado), y endpoints para gestionar sesiones, mensajes y trabajos programados.",
      "El API Server es un runtime completo de agente, no un simple proxy LLM. Para cada petición, Hermes crea un AIAgent en el servidor que ejecuta herramientas reales, accede a archivos, busca en la web y usa memoria. Las herramientas se ejecutan donde corre el servidor API.",
      "Casos de uso: integración con Open WebUI y otros frontends, automatización desde scripts y CI/CD, construcción de aplicaciones que usan Hermes como backend de IA, y exposición de tu agente a equipos sin acceso directo a la CLI."
    ],
    "tips": [
      "El API Server es ideal para integrar Hermes con Open WebUI: obtienes una interfaz web pulida apuntando a tu agente con todas sus capacidades.",
      "En producción, protege el API Server con HTTPS y autenticación. No lo expongas a internet sin cifrado."
    ],
    "commands": [
      "hermes server start",
      "hermes server stop",
      "hermes config set api_server.enabled true"
    ]
  },
  {
    "id": "l23",
    "level": 3,
    "title": "Subscription Proxy",
    "icon": "🔄",
    "desc": "Comparte tu suscripción del Portal de Nous con otras herramientas y clientes OpenAI-compatibles.",
    "paragraphs": [
      "El Subscription Proxy te permite compartir tu suscripción de Nous Portal con otras herramientas que hablan el protocolo de la API de OpenAI. Ejecutas un proxy local que traduce peticiones OpenAI-compatibles a llamadas autenticadas contra Portal.",
      "Esto significa que puedes usar herramientas como Open WebUI, OpenViking, Aider, Continue.dev, Cline, y cualquier cliente que soporte OpenAI API, todas aprovechando tu suscripción de Portal sin necesidad de claves API adicionales.",
      "El proxy se ejecuta localmente (localhost) y enruta las peticiones a Portal. Soporta streaming, selección de modelo, y respeta los límites y permisos de tu suscripción. Es transparente para las herramientas que lo usan: solo cambia el endpoint.",
      "La configuración es sencilla: activa el proxy en config.yaml, apunta tus herramientas a http://localhost:XXXX/v1, y todas las llamadas usarán automáticamente tu suscripción de Portal."
    ],
    "tips": [
      "El Subscription Proxy es la pieza que permite usar Hermes como backend único para todo tu ecosistema de herramientas de IA.",
      "Combínalo con el API Server para tener tanto una API propia de Hermes como una API OpenAI-compatible desde la misma instancia."
    ],
    "commands": [
      "hermes config set subscription_proxy.enabled true",
      "hermes proxy start"
    ]
  },
  {
    "id": "l24",
    "level": 3,
    "title": "Web Dashboard",
    "icon": "📊",
    "desc": "Interfaz web para gestionar Hermes: múltiples perfiles, monitoreo en tiempo real y control remoto.",
    "paragraphs": [
      "El Web Dashboard es una interfaz web completa para gestionar tu instancia de Hermes. Accesible desde cualquier navegador, te permite monitorizar el estado del agente, cambiar entre perfiles, ver sesiones activas, gestionar skills y consultar logs en tiempo real.",
      "Con el Dashboard puedes gestionar múltiples perfiles desde una misma interfaz. Cada perfil tiene su propio conjunto de skills, configuración, memoria y sesiones. Ideal para separar contextos de trabajo, proyectos personales y experimentos.",
      "La página principal muestra un resumen del estado del agente: modelo activo, herramientas cargadas, plataformas de mensajería conectadas, crons programados y uso de recursos. Todo actualizado en tiempo real.",
      "El acceso se protege con autenticación: puedes configurar credenciales locales o integrar con OAuth. El Dashboard está diseñado para funcionar tanto en localhost como en un servidor remoto accesible vía HTTPS."
    ],
    "tips": [
      "El Dashboard es especialmente útil cuando ejecutas Hermes en un servidor remoto y quieres monitorizarlo sin SSH.",
      "Usa los perfiles del Dashboard para mantener separados tus proyectos sin contaminar la memoria ni las skills entre ellos."
    ],
    "commands": [
      "hermes dashboard",
      "hermes config set dashboard.enabled true"
    ]
  },
  {
    "id": "l25",
    "level": 3,
    "title": "Plataformas de Mensajería",
    "icon": "💬",
    "desc": "Conecta Hermes a Telegram, Discord, Slack, WhatsApp, Signal, Email, SMS y 15+ plataformas más.",
    "paragraphs": [
      "Chatea con Hermes desde Telegram, Discord, Slack, WhatsApp, Signal, SMS, Email, Home Assistant, Mattermost, Matrix, DingTalk, Feishu/Lark, WeCom, Weixin, BlueBubbles (iMessage), QQ, Yuanbao, Microsoft Teams, LINE, ntfy o tu navegador. La pasarela (gateway) es un único proceso en segundo plano que conecta todas tus plataformas configuradas.",
      "Los bots necesitan tanto un proveedor de modelo como proveedores de herramientas (TTS, web). Una suscripción a Nous Portal los incluye todos. La pasarela maneja sesiones, ejecuta trabajos cron y entrega mensajes de voz.",
      "Para la funcionalidad completa de voz — incluyendo modo micrófono en CLI, respuestas habladas en mensajería y conversaciones en canales de voz de Discord — consulta Voice Mode en la documentación oficial.",
      "Todas las plataformas se configuran con hermes gateway setup, que ofrece un asistente interactivo para cada una. Algunas requieren claves API, otras usan WebSockets o long-polling, y varias no necesitan URL pública."
    ],
    "tips": [
      "Con una suscripción a Nous Portal, cubres tanto el modelo de IA como las herramientas (búsqueda web, generación de imágenes, TTS, navegador). La configuración se hace con un solo comando: hermes setup --portal.",
      "Telegram es la plataforma más sencilla para empezar: solo necesitas un token de @BotFather y es completamente gratis."
    ],
    "commands": [
      "hermes gateway setup",
      "hermes gateway setup --telegram",
      "hermes gateway setup --discord",
      "hermes gateway setup --whatsapp",
      "hermes gateway setup --signal",
      "hermes gateway setup --slack",
      "hermes gateway --status",
      "hermes gateway --restart"
    ]
  },
  {
    "id": "l26",
    "level": 3,
    "title": "Referencia CLI",
    "icon": "📋",
    "desc": "Referencia completa de todos los comandos CLI: chat, model, gateway, skills, config, cron, tools y más.",
    "paragraphs": [
      "La CLI de Hermes es la puerta de entrada principal al agente. El comando hermes sin argumentos inicia una sesión de chat interactiva. Con subcomandos, controlas todos los aspectos del agente desde la terminal.",
      "Comandos principales: hermes (chat interactivo), hermes model (gestionar proveedores y modelos), hermes config (leer y escribir configuración), hermes tools (gestionar herramientas activas), hermes gateway (plataformas de mensajería), hermes skill (gestionar skills), hermes cron (tareas programadas), hermes setup (asistente de configuración).",
      "Comandos de diagnóstico: hermes doctor (diagnóstico completo del sistema), hermes config check (validar sintaxis de configuración), hermes config get (ver valores actuales), hermes --version (versión instalada), hermes update (actualizar a la última versión).",
      "Comandos avanzados: hermes server (API Server), hermes dashboard (Web Dashboard), hermes mcp (gestión MCP), hermes proxy (Subscription Proxy), hermes desktop (lanzar app de escritorio)."
    ],
    "tips": [
      "Usa hermes <comando> --help para ver todas las opciones disponibles de cada subcomando.",
      "La CLI está diseñada para ser autodocumentada: si no recuerdas un comando, escribe hermes help o hermes --help para ver la lista completa."
    ],
    "commands": [
      "hermes",
      "hermes --help",
      "hermes --version",
      "hermes model",
      "hermes config get",
      "hermes config set",
      "hermes tools",
      "hermes gateway setup",
      "hermes skill list",
      "hermes cron list",
      "hermes doctor",
      "hermes update",
      "hermes setup",
      "hermes server start",
      "hermes dashboard"
    ]
  },
  {
    "id": "l27",
    "level": 3,
    "title": "FAQ y Solución de Problemas",
    "icon": "❓",
    "desc": "Preguntas frecuentes, resolución de problemas comunes, gestión de perfiles y patrones de trabajo.",
    "paragraphs": [
      "Esta sección recopila las preguntas más frecuentes y soluciones a problemas comunes al usar Hermes Agent. Desde errores de instalación hasta configuraciones avanzadas, pasando por gestión de perfiles y patrones de trabajo recomendados.",
      "Problemas frecuentes con proveedores: error de autenticación (verifica tu API key con hermes config get), timeout (el modelo tarda demasiado, prueba con un modelo más rápido), rate limiting (has excedido los límites de tu plan, espera o actualiza).",
      "Problemas frecuentes con herramientas: una herramienta no aparece (verifica que el toolset esté activo con hermes tools), fallos de ejecución (comprueba permisos y dependencias), comandos bloqueados (revisa la configuración de seguridad y aprobación de comandos).",
      "Perfiles: puedes crear perfiles múltiples para separar contextos de trabajo (hermes profiles create nombre). Cada perfil tiene su propia configuración, skills, memoria y sesiones independientes. Ideal para separar trabajo, proyectos personales y experimentación."
    ],
    "tips": [
      "Antes de pedir ayuda, ejecuta hermes doctor. Te dará un diagnóstico completo que resuelve el 80% de los problemas comunes.",
      "Si algo no funciona como esperas, prueba a cambiar de modelo. Muchos problemas de razonamiento se resuelven cambiando a un modelo más potente para esa tarea concreta."
    ],
    "commands": [
      "hermes doctor",
      "hermes config get",
      "hermes profiles list",
      "hermes profiles create",
      "hermes update",
      "hermes --version"
    ]
  }
];

const GLOSSARY_HERMES = [
  {
    "command": "hermes setup --portal",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes model",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes tools",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes gateway setup",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes config set",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes config get",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes desktop",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes --version",
    "lesson": "l1",
    "lessonTitle": "¿Qué es Hermes Agent?"
  },
  {
    "command": "hermes setup",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes doctor",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes update",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config check",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config migrate",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config set OPENROUTER_API_KEY tu_clave",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes config set OPENAI_API_KEY tu_clave",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes config set ANTHROPIC_API_KEY tu_clave",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes skill view nombre_skill",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skill list",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "/learn url_o_archivo",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes config set toolsets terminal,file,web",
    "lesson": "l9",
    "lessonTitle": "Herramientas y Toolsets"
  },
  {
    "command": "hermes config set command_approval true",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes config set docker_backend true",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes config set BRAVE_API_KEY tu_clave",
    "lesson": "l14",
    "lessonTitle": "Búsqueda Web"
  },
  {
    "command": "hermes mcp install",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp list",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp remove",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes cron list",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron create",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron run",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron remove",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron pause",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes server start",
    "lesson": "l22",
    "lessonTitle": "API Server"
  },
  {
    "command": "hermes server stop",
    "lesson": "l22",
    "lessonTitle": "API Server"
  },
  {
    "command": "hermes config set api_server.enabled true",
    "lesson": "l22",
    "lessonTitle": "API Server"
  },
  {
    "command": "hermes config set subscription_proxy.enabled true",
    "lesson": "l23",
    "lessonTitle": "Subscription Proxy"
  },
  {
    "command": "hermes proxy start",
    "lesson": "l23",
    "lessonTitle": "Subscription Proxy"
  },
  {
    "command": "hermes dashboard",
    "lesson": "l24",
    "lessonTitle": "Web Dashboard"
  },
  {
    "command": "hermes config set dashboard.enabled true",
    "lesson": "l24",
    "lessonTitle": "Web Dashboard"
  },
  {
    "command": "hermes gateway setup --telegram",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes gateway setup --discord",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes gateway setup --whatsapp",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes gateway setup --signal",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes gateway setup --slack",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes gateway --status",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes gateway --restart",
    "lesson": "l25",
    "lessonTitle": "Plataformas de Mensajería"
  },
  {
    "command": "hermes --help",
    "lesson": "l26",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "hermes profiles list",
    "lesson": "l27",
    "lessonTitle": "FAQ y Solución de Problemas"
  },
  {
    "command": "hermes profiles create",
    "lesson": "l27",
    "lessonTitle": "FAQ y Solución de Problemas"
  }
];

const LEVELS = [
  { id: 1, name: 'Principiante', icon: '🌱', desc: 'Fundamentos: instalación, primeros pasos y conceptos básicos' },
  { id: 2, name: 'Intermedio', icon: '⚡', desc: 'Configuración, providers, skills, herramientas y seguridad' },
  { id: 3, name: 'Avanzado', icon: '🚀', desc: 'MCP, delegación, cron, API, dashboard y despliegues' }
];
