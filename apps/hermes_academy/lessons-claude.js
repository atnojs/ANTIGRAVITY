var LESSONS_CLAUDE = [
  {
    "id": "cl1",
    "level": 1,
    "title": "¿Qué es Claude Code?",
    "icon": "💎",
    "desc": "Agente de codificación de Anthropic: memoria, skills, subagentes, MCP, hooks y tareas programadas.",
    "paragraphs": [
      "Claude Code es el agente de desarrollo de Anthropic, construido sobre los modelos Claude (Sonnet, Opus). Permite delegar tareas de programación complejas a una IA que entiende tu código base, ejecuta comandos, crea archivos y gestiona el ciclo completo de desarrollo.",
      "A diferencia de otros agentes, Claude Code está profundamente integrado con el ecosistema de Anthropic: usa Claude como motor de razonamiento, tiene acceso a herramientas especializadas, y soporta features avanzadas como checkpointing (puntos de restauración) y sandboxing integrado.",
      "Claude Code está disponible como CLI independiente, app de escritorio (Windows/Mac), y acceso web. Se integra con VS Code, JetBrains y cualquier editor que soporte terminal."
    ],
    "tips": [
      "El quickstart oficial está en code.claude.com/docs/en/quickstart — instala, autentícate y completa tu primera tarea en menos de 5 minutos.",
      "Claude Code funciona mejor con tareas bien definidas y contexto rico. Usa AGENTS.md o CLAUDE.md en tu proyecto para darle información permanente."
    ],
    "commands": [
      "claude",
      "claude 'tarea'",
      "claude --model claude-sonnet-4",
      "claude --help"
    ]
  },
  {
    "id": "cl2",
    "level": 1,
    "title": "Quickstart e Instalación",
    "icon": "⚡",
    "desc": "Instala Claude Code, configúralo y completa tu primera tarea.",
    "paragraphs": [
      "Instala Claude Code CLI: npm install -g @anthropic-ai/claude-code. Autentícate con tu API key de Anthropic (claude login) o configúrala en ~/.claude/config.yaml.",
      "Tu primera tarea: navega a un proyecto y ejecuta claude 'analiza este proyecto y dime qué hace'. Claude Code leerá la estructura, dependencias y código para darte un resumen. Luego pídele que 'añada tests para la función principal'.",
      "Claude Code funciona con modo de aprobación configurable: por defecto pide confirmación antes de ejecutar comandos o modificar archivos. Puedes ajustarlo en config.yaml según tu tolerancia al riesgo."
    ],
    "tips": [
      "Después de instalar, ejecuta claude setup para un asistente interactivo que configura el modelo, permisos y herramientas.",
      "Si ya usas la API de Anthropic, tu clave existente funciona con Claude Code sin configuración adicional."
    ],
    "commands": [
      "npm install -g @anthropic-ai/claude-code",
      "claude login",
      "claude setup",
      "claude 'analiza este proyecto'"
    ]
  },
  {
    "id": "cl3",
    "level": 1,
    "title": "Cómo Funciona Claude Code",
    "icon": "🔍",
    "desc": "Arquitectura interna: razonamiento, herramientas, contexto y flujo de ejecución.",
    "paragraphs": [
      "Claude Code opera en un bucle de razonamiento-acción: analiza tu petición, decide qué herramientas necesita (leer archivos, ejecutar comandos, buscar código), ejecuta las acciones, evalúa los resultados, y repite hasta completar la tarea.",
      "El contexto de Claude Code incluye: los archivos de tu proyecto (leídos bajo demanda), archivos de configuración (CLAUDE.md, AGENTS.md), reglas de seguridad, memoria persistente y skills cargadas. Todo esto forma el system prompt de cada tarea.",
      "Claude Code usa checkpointing: antes de cada cambio significativo, guarda el estado del proyecto. Si algo sale mal, puedes volver atrás con claude undo. Esto hace que experimentar sea seguro."
    ],
    "tips": [
      "Entender el bucle de razonamiento-acción te ayuda a escribir mejores prompts: sé específico sobre el resultado esperado y las restricciones.",
      "El checkpointing es automático. No necesitas hacer git commit antes de cada tarea; Claude Code ya protege tu código."
    ],
    "commands": [
      "claude undo"
    ]
  },
  {
    "id": "cl4",
    "level": 2,
    "title": "Buenas Prácticas",
    "icon": "⭐",
    "desc": "Consejos y patrones para sacar el máximo partido a Claude Code.",
    "paragraphs": [
      "Define un CLAUDE.md claro: incluye stack tecnológico, estructura del proyecto, convenciones de código, comandos de build/test, y restricciones. Este archivo es la fuente de verdad para Claude Code en tu proyecto.",
      "Divide las tareas grandes en pasos más pequeños. En lugar de 'construye la app completa', pide primero 'crea la estructura del proyecto', luego 'implementa el modelo de datos', y así sucesivamente.",
      "Itera rápido: si el resultado no es exactamente lo que esperabas, no reescribas todo el prompt. Añade contexto adicional, señala lo que no funcionó, y deja que Claude Code corrija sobre lo existente."
    ],
    "tips": [
      "Mantén tu CLAUDE.md actualizado. Si cambias de framework o añades una dependencia, actualiza el archivo para que Claude Code lo sepa.",
      "Usa el modo --verbose para ver exactamente qué está haciendo Claude Code en cada paso. Es la mejor forma de aprender y depurar."
    ],
    "commands": [
      "claude --verbose"
    ]
  },
  {
    "id": "cl5",
    "level": 2,
    "title": "Flujos de Trabajo Comunes",
    "icon": "🔄",
    "desc": "Patrones prácticos: debugging, refactoring, features nuevas, code review.",
    "paragraphs": [
      "Debugging: describe el bug, el comportamiento esperado y el real, y pide a Claude Code que investigue. Él leerá logs, trazará la ejecución y propondrá una corrección con explicación.",
      "Nueva feature: describe la funcionalidad deseada, los archivos donde debería implementarse, y cualquier restricción. Claude Code creará los archivos necesarios, modificará los existentes y ejecutará los tests.",
      "Refactoring: selecciona el código a mejorar y pide 'refactoriza esto para que sea más legible/eficiente'. Claude Code preservará el comportamiento mientras mejora la estructura interna. Code review: claude review analiza PRs automáticamente."
    ],
    "tips": [
      "Para debugging, incluye el mensaje de error exacto y los pasos para reproducirlo. Cuanto más preciso seas, más rápido encontrará Claude Code la solución.",
      "Para code review, configura las reglas en .claude/review-rules.md para adaptar el análisis a los estándares de tu equipo."
    ],
    "commands": [
      "claude review",
      "claude review --pr 23"
    ]
  },
  {
    "id": "cl6",
    "level": 2,
    "title": "Sistema de Memoria",
    "icon": "🧠",
    "desc": "Memoria persistente entre sesiones para recordar preferencias, convenciones y contexto del proyecto.",
    "paragraphs": [
      "Claude Code tiene un sistema de memoria que persiste entre sesiones. Puede recordar preferencias de estilo, decisiones de arquitectura, configuraciones del entorno, y cualquier información que le ayude a ser más efectivo en tu proyecto.",
      "La memoria se gestiona con comandos: claude memory add para guardar, claude memory list para ver, claude memory delete para eliminar. También puedes pedirle en lenguaje natural que 'recuerde' algo durante una conversación.",
      "Qué guardar en memoria: preferencias de código (tabs vs espacios), puertos y configuraciones, decisiones de diseño, APIs y endpoints frecuentes. Qué no guardar: progreso temporal de tareas, datos que caducan rápido."
    ],
    "tips": [
      "Revisa la memoria periódicamente. Es fácil acumular información obsoleta que confunde al agente en lugar de ayudarlo.",
      "Si Claude Code no recuerda algo que le dijiste en una sesión anterior, pídele explícitamente que lo guarde en memoria."
    ],
    "commands": [
      "claude memory add 'texto'",
      "claude memory list",
      "claude memory delete <id>"
    ]
  },
  {
    "id": "cl7",
    "level": 2,
    "title": "Resumen de Funcionalidades",
    "icon": "🧩",
    "desc": "Panorama general de todas las capacidades de Claude Code.",
    "paragraphs": [
      "Claude Code incluye: ejecución de comandos, lectura/escritura de archivos, búsqueda en el código base, navegación web, generación de imágenes, ejecución de tests, gestión de git, y acceso a APIs externas vía MCP.",
      "Herramientas de desarrollo: linting automático, formateo de código, ejecución de tests, generación de documentación, análisis de dependencias, y revisión de seguridad. Todo integrado en el flujo de trabajo.",
      "Funcionalidades avanzadas: subagentes para trabajo paralelo, hooks para automatizar flujos, tareas programadas, sandboxing, y checkpointing para deshacer cambios."
    ],
    "tips": [
      "Explora las funcionalidades gradualmente. Empieza con tareas simples de edición de código y ve incorporando features avanzadas según las necesites."
    ],
    "commands": [
      "claude tools",
      "claude --help"
    ]
  },
  {
    "id": "cl8",
    "level": 2,
    "title": "Skills",
    "icon": "📚",
    "desc": "Crea y gestiona skills reutilizables para automatizar flujos de trabajo repetitivos.",
    "paragraphs": [
      "Las skills de Claude Code son instrucciones reutilizables empaquetadas como archivos markdown con metadatos. Definen flujos de trabajo paso a paso para tareas comunes: despliegues, testing, generación de boilerplate, revisión de código, etc.",
      "Las skills se almacenan en .claude/skills/ y se cargan automáticamente cuando la tarea coincide con su descripción. Puedes crearlas manualmente o pedir a Claude Code que genere una skill a partir de una conversación exitosa.",
      "Cada skill incluye: nombre, descripción, triggers (cuándo debe activarse), pasos detallados, comandos, archivos involucrados y criterios de aceptación. Las skills son compartibles entre proyectos y equipos."
    ],
    "tips": [
      "Después de completar una tarea compleja, pide a Claude Code: 'guarda este flujo como skill para la próxima vez'. Así construyes tu biblioteca de automatizaciones.",
      "Organiza las skills por dominio: testing, deployment, database, frontend, etc. Usa subdirectorios dentro de .claude/skills/."
    ],
    "commands": [
      "claude skills list",
      "claude skills create"
    ]
  },
  {
    "id": "cl9",
    "level": 3,
    "title": "Subagentes",
    "icon": "👥",
    "desc": "Divide tareas complejas en subagentes que trabajan en paralelo.",
    "paragraphs": [
      "Claude Code puede generar subagentes que trabajan en paralelo en diferentes partes de una tarea. Cada subagente opera en un contexto aislado con su propia configuración y herramientas.",
      "Los subagentes son ideales para: desarrollar frontend y backend simultáneamente, ejecutar tests y linting en paralelo, investigar múltiples enfoques para un problema, o procesar múltiples archivos independientes.",
      "La configuración de subagentes se define en config.yaml: cuántos pueden ejecutarse en paralelo, qué herramientas tienen disponibles, y cómo se integran sus resultados en el flujo principal."
    ],
    "tips": [
      "Para evitar conflictos, asigna a cada subagente archivos o directorios que no se solapen con los de otros subagentes.",
      "Los subagentes son más efectivos para tareas independientes. Si las tareas tienen dependencias entre sí, ejecútalas secuencialmente."
    ],
    "commands": []
  },
  {
    "id": "cl10",
    "level": 3,
    "title": "MCP (Model Context Protocol)",
    "icon": "🔌",
    "desc": "Conecta Claude Code a servidores MCP para acceder a herramientas y datos externos.",
    "paragraphs": [
      "Claude Code soporta MCP para conectarse a servidores que proporcionan herramientas adicionales: bases de datos, APIs, sistemas de archivos, servicios cloud, etc. Cada servidor MCP expone herramientas que Claude Code puede usar como si fueran nativas.",
      "La configuración MCP se define en .claude/mcp.json o en config.yaml. Soporta servidores stdio (procesos locales) y HTTP (remotos). Los servidores se pueden filtrar para exponer solo herramientas específicas.",
      "Casos de uso: conectar Claude Code a PostgreSQL para consultar esquemas, a AWS para gestionar recursos, a herramientas internas de la empresa vía API REST, o a servidores MCP comunitarios de agentskills.io."
    ],
    "tips": [
      "Empieza con servidores MCP del catálogo oficial. Están validados por Anthropic y la comunidad.",
      "Para máxima seguridad, prefiere servidores stdio que no exponen puertos de red."
    ],
    "commands": [
      "claude mcp list",
      "claude mcp add"
    ]
  },
  {
    "id": "cl11",
    "level": 3,
    "title": "Hooks",
    "icon": "🪝",
    "desc": "Automatiza acciones con hooks que se ejecutan antes y después de las tareas.",
    "paragraphs": [
      "Los hooks de Claude Code permiten ejecutar scripts automáticamente en momentos específicos: antes de modificar archivos, después de ejecutar comandos, al iniciar o finalizar una sesión. Son la base para automatizar flujos de trabajo.",
      "Tipos de hooks: pre-task (antes de cada tarea), post-task (después), pre-command (antes de ejecutar un comando), post-file-write (después de modificar un archivo). Cada hook puede aprobar, rechazar o modificar la acción.",
      "Ejemplos prácticos: pre-commit hook que ejecuta linters, post-task hook que corre tests, pre-command hook que bloquea comandos peligrosos, post-file-write hook que formatea el archivo modificado."
    ],
    "tips": [
      "Empieza con un post-task hook simple que ejecute los tests. Es la red de seguridad más valiosa y fácil de configurar.",
      "Los hooks se heredan del directorio actual hacia arriba. Define hooks globales en ~/.claude/ y hooks de proyecto en .claude/."
    ],
    "commands": [
      "claude hooks list"
    ]
  },
  {
    "id": "cl12",
    "level": 3,
    "title": "Referencia CLI",
    "icon": "📋",
    "desc": "Todos los comandos y flags de la interfaz de línea de comandos.",
    "paragraphs": [
      "La CLI de Claude Code ofrece control total sobre el agente: claude (chat interactivo), claude 'tarea' (one-shot), claude --model (elegir modelo), claude config (gestión de configuración), claude memory (gestión de memoria).",
      "Comandos de gestión: claude setup (configuración inicial), claude login (autenticación), claude update (actualizar), claude doctor (diagnóstico), claude --version (versión).",
      "Flags importantes: --approval (modo de aprobación), --max-turns (límite de iteraciones), --context (archivos adicionales), --verbose (modo detallado), --sandbox (aislamiento)."
    ],
    "tips": [
      "Ejecuta claude --help para ver todas las opciones disponibles. La CLI está diseñada para ser autodocumentada.",
      "Usa --verbose cuando quieras entender exactamente qué está haciendo Claude Code en cada paso."
    ],
    "commands": [
      "claude",
      "claude --help",
      "claude --version",
      "claude setup",
      "claude login",
      "claude doctor",
      "claude update",
      "claude config",
      "claude --verbose",
      "claude --model claude-sonnet-4"
    ]
  },
  {
    "id": "cl13",
    "level": 3,
    "title": "Configuración y Settings",
    "icon": "⚙️",
    "desc": "Domina el archivo config.yaml: modelos, permisos, herramientas y personalización.",
    "paragraphs": [
      "La configuración de Claude Code se almacena en ~/.claude/config.yaml (global) y .claude/config.yaml (por proyecto). Controla el modelo por defecto, permisos, herramientas activas, hooks, MCP y personalización.",
      "Configuración esencial: model (modelo por defecto), approval_mode (manual, diff, auto), max_turns (límite de iteraciones), tools (herramientas activas), permissions (comandos permitidos/bloqueados).",
      "La precedencia es: variables de entorno > config.yaml del proyecto > config.yaml global > defaults. Usa variables de entorno para secretos (API keys)."
    ],
    "tips": [
      "Después de editar config.yaml manualmente, ejecuta claude config validate para verificar la sintaxis.",
      "Separa la configuración por proyecto usando .claude/config.yaml en cada repositorio."
    ],
    "commands": [
      "claude config",
      "claude config validate"
    ]
  },
  {
    "id": "cl14",
    "level": 3,
    "title": "Sesiones y Checkpointing",
    "icon": "💾",
    "desc": "Gestión de sesiones y puntos de restauración para trabajar sin miedo a perder cambios.",
    "paragraphs": [
      "Claude Code guarda automáticamente checkpoints antes de cada cambio significativo. Si algo sale mal, puedes volver atrás con claude undo y restaurar el estado anterior del proyecto.",
      "Las sesiones son persistentes: puedes retomar una conversación donde la dejaste, incluso días después. Cada sesión mantiene su propio contexto, historial y checkpoints independientes.",
      "El checkpointing es especialmente útil para: experimentar con refactors grandes, probar diferentes enfoques para un problema, o recuperar trabajo tras un cambio no deseado."
    ],
    "tips": [
      "Aunque Claude Code hace checkpointing, sigue siendo buena práctica hacer git commit antes de tareas muy grandes.",
      "Usa claude sessions list para ver tus sesiones activas y cambiar entre ellas."
    ],
    "commands": [
      "claude undo",
      "claude sessions list"
    ]
  },
  {
    "id": "cl15",
    "level": 3,
    "title": "Permisos y Seguridad",
    "icon": "🔒",
    "desc": "Controla qué puede hacer Claude Code: modos de aprobación, sandboxing y listas de control.",
    "paragraphs": [
      "Claude Code ofrece tres modos de aprobación: auto (ejecuta todo sin preguntar), manual (pide confirmación para cada acción), y diff (muestra los cambios antes de aplicarlos). El modo por defecto es manual.",
      "El sandboxing aísla a Claude Code del sistema anfitrión: no puede acceder a archivos fuera del proyecto, ejecutar comandos peligrosos ni acceder a la red sin permiso. Configurable en .claude/sandbox.yaml.",
      "Puedes definir listas blancas y negras de comandos permitidos, restricciones de acceso a archivos, y límites de recursos. Ideal para entornos de producción y CI/CD."
    ],
    "tips": [
      "En producción, usa siempre --approval manual o diff. El modo auto solo es seguro en entornos de desarrollo aislados.",
      "Define una whitelist de comandos permitidos para evitar ejecuciones accidentales de rm -rf, git push --force, etc."
    ],
    "commands": [
      "claude --approval manual",
      "claude --approval diff",
      "claude --sandbox"
    ]
  },
  {
    "id": "cl16",
    "level": 3,
    "title": "Tareas Programadas",
    "icon": "⏰",
    "desc": "Automatiza trabajo recurrente con tareas programadas en la app de escritorio.",
    "paragraphs": [
      "Claude Code Desktop permite programar tareas recurrentes: revisión diaria de PRs, actualización semanal de dependencias, generación de informes, despliegues programados. Las tareas se ejecutan aunque la app esté en segundo plano.",
      "Cada tarea programada tiene: un horario (cron), un prompt autónomo, skills opcionales a cargar, y una plataforma de entrega para los resultados (escritorio, email, Slack).",
      "Casos de uso: 'cada mañana a las 8, revisa las PRs abiertas y envíame un resumen', 'cada viernes a las 17, genera el changelog de la semana'."
    ],
    "tips": [
      "Las tareas programadas requieren que Claude Code Desktop esté ejecutándose. Para trabajos críticos, considera ejecutar Claude Code en un servidor.",
      "Empieza con tareas simples de notificación antes de configurar automatizaciones que modifiquen código automáticamente."
    ],
    "commands": []
  },
  {
    "id": "cl17",
    "level": 3,
    "title": "Claude Code en la Web",
    "icon": "🌐",
    "desc": "Accede a Claude Code desde cualquier navegador sin instalar nada.",
    "paragraphs": [
      "Claude Code está disponible como aplicación web en code.claude.com. Ofrece la misma funcionalidad que la CLI pero desde el navegador: edición de código, ejecución de comandos, gestión de proyectos y colaboración.",
      "La versión web es ideal para: trabajar desde dispositivos donde no puedes instalar software, colaborar con compañeros compartiendo sesiones, o hacer tareas rápidas sin abrir la terminal.",
      "La experiencia web incluye un editor de código integrado, terminal virtual, visor de diffs, y gestión de archivos. Todo desde el navegador, sin configuración local."
    ],
    "tips": [
      "La versión web es perfecta para code review rápido y tareas de documentación. Para desarrollo intensivo, la CLI sigue siendo más rápida.",
      "Puedes alternar entre CLI y web: las sesiones y configuraciones se sincronizan entre ambas."
    ],
    "commands": []
  },
  {
    "id": "cl18",
    "level": 3,
    "title": "Code Review",
    "icon": "✅",
    "desc": "Revisión automática de PRs con análisis de calidad, seguridad y estilo.",
    "paragraphs": [
      "Claude Code puede revisar pull requests automáticamente: analiza el diff, comprueba estándares, detecta bugs, evalúa la seguridad y sugiere mejoras. Publica los comentarios directamente en GitHub/GitLab.",
      "La revisión se configura en .claude/review-rules.md: defines qué aspectos revisar (estilo, seguridad, rendimiento, tests), el nivel de severidad, y si debe bloquear el merge en caso de problemas críticos.",
      "Puedes ejecutar code review manual (claude review --pr 42) o configurarla como tarea programada para que se ejecute automáticamente en cada PR nueva."
    ],
    "tips": [
      "Personaliza las reglas de revisión para tu stack. No es lo mismo revisar código Python que React o Go.",
      "Usa la revisión automática como complemento, no como sustituto de la revisión humana. Las dos perspectivas juntas son más efectivas."
    ],
    "commands": [
      "claude review",
      "claude review --pr 42"
    ]
  },
  {
    "id": "cl19",
    "level": 3,
    "title": "Costes",
    "icon": "💰",
    "desc": "Entiende y optimiza el coste de usar Claude Code con la API de Anthropic.",
    "paragraphs": [
      "Claude Code consume tokens de la API de Anthropic. El coste depende del modelo usado (Sonnet es más barato, Opus más caro), la longitud del contexto, las herramientas usadas y el número de turnos (iteraciones).",
      "Para optimizar costes: usa el modelo adecuado para cada tarea (Sonnet para tareas rutinarias, Opus para análisis complejo), limita max_turns, mantén el contexto limpio (sin archivos innecesarios), y aprovecha las skills para evitar repetir instrucciones largas.",
      "La CLI muestra el consumo de tokens al final de cada sesión. También puedes consultar el gasto acumulado en ~/.claude/usage.json."
    ],
    "tips": [
      "El modelo Claude Sonnet 4 ofrece la mejor relación calidad/precio para la mayoría de tareas de desarrollo. Reserva Opus para code review crítico y decisiones de arquitectura.",
      "Si tu coste mensual es elevado, revisa si estás usando max_turns demasiado altos o contexto innecesariamente grande."
    ],
    "commands": [
      "claude --model claude-sonnet-4",
      "claude --max-turns 10"
    ]
  },
  {
    "id": "cl20",
    "level": 3,
    "title": "Resolución de Problemas",
    "icon": "❓",
    "desc": "Diagnóstico y solución de errores comunes en Claude Code.",
    "paragraphs": [
      "Problemas frecuentes: error de autenticación (revisa tu API key en ~/.claude/config.yaml), comandos bloqueados (verifica la configuración de permisos), timeout en tareas largas (aumenta max_turns o simplifica la tarea).",
      "Para depurar: ejecuta claude doctor para un diagnóstico completo del sistema, revisa los logs en ~/.claude/logs/, y usa --verbose para ver exactamente qué está pasando en cada paso.",
      "Si Claude Code produce resultados incorrectos, verifica: ¿está tu CLAUDE.md actualizado? ¿el contexto incluye todos los archivos relevantes? ¿la descripción de la tarea es suficientemente específica?"
    ],
    "tips": [
      "El 80% de los problemas se resuelven con claude doctor y revisando CLAUDE.md. Haz estas dos comprobaciones antes de buscar ayuda.",
      "Si cambiaste de modelo y algo dejó de funcionar, vuelve al modelo anterior. Diferentes modelos tienen diferentes fortalezas."
    ],
    "commands": [
      "claude doctor",
      "claude --verbose"
    ]
  }
];

var GLOSSARY_CLAUDE = [
  {
    "command": "claude",
    "lesson": "cl1",
    "lessonTitle": "¿Qué es Claude Code?"
  },
  {
    "command": "claude 'tarea'",
    "lesson": "cl1",
    "lessonTitle": "¿Qué es Claude Code?"
  },
  {
    "command": "claude --model claude-sonnet-4",
    "lesson": "cl1",
    "lessonTitle": "¿Qué es Claude Code?"
  },
  {
    "command": "claude --help",
    "lesson": "cl1",
    "lessonTitle": "¿Qué es Claude Code?"
  },
  {
    "command": "npm install -g @anthropic-ai/claude-code",
    "lesson": "cl2",
    "lessonTitle": "Quickstart e Instalación"
  },
  {
    "command": "claude login",
    "lesson": "cl2",
    "lessonTitle": "Quickstart e Instalación"
  },
  {
    "command": "claude setup",
    "lesson": "cl2",
    "lessonTitle": "Quickstart e Instalación"
  },
  {
    "command": "claude 'analiza este proyecto'",
    "lesson": "cl2",
    "lessonTitle": "Quickstart e Instalación"
  },
  {
    "command": "claude undo",
    "lesson": "cl3",
    "lessonTitle": "Cómo Funciona Claude Code"
  },
  {
    "command": "claude --verbose",
    "lesson": "cl4",
    "lessonTitle": "Buenas Prácticas"
  },
  {
    "command": "claude review",
    "lesson": "cl5",
    "lessonTitle": "Flujos de Trabajo Comunes"
  },
  {
    "command": "claude review --pr 23",
    "lesson": "cl5",
    "lessonTitle": "Flujos de Trabajo Comunes"
  },
  {
    "command": "claude memory add 'texto'",
    "lesson": "cl6",
    "lessonTitle": "Sistema de Memoria"
  },
  {
    "command": "claude memory list",
    "lesson": "cl6",
    "lessonTitle": "Sistema de Memoria"
  },
  {
    "command": "claude memory delete <id>",
    "lesson": "cl6",
    "lessonTitle": "Sistema de Memoria"
  },
  {
    "command": "claude tools",
    "lesson": "cl7",
    "lessonTitle": "Resumen de Funcionalidades"
  },
  {
    "command": "claude --help",
    "lesson": "cl7",
    "lessonTitle": "Resumen de Funcionalidades"
  },
  {
    "command": "claude skills list",
    "lesson": "cl8",
    "lessonTitle": "Skills"
  },
  {
    "command": "claude skills create",
    "lesson": "cl8",
    "lessonTitle": "Skills"
  },
  {
    "command": "claude mcp list",
    "lesson": "cl10",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "claude mcp add",
    "lesson": "cl10",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "claude hooks list",
    "lesson": "cl11",
    "lessonTitle": "Hooks"
  },
  {
    "command": "claude",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude --help",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude --version",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude setup",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude login",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude doctor",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude update",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude config",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude --verbose",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude --model claude-sonnet-4",
    "lesson": "cl12",
    "lessonTitle": "Referencia CLI"
  },
  {
    "command": "claude config",
    "lesson": "cl13",
    "lessonTitle": "Configuración y Settings"
  },
  {
    "command": "claude config validate",
    "lesson": "cl13",
    "lessonTitle": "Configuración y Settings"
  },
  {
    "command": "claude undo",
    "lesson": "cl14",
    "lessonTitle": "Sesiones y Checkpointing"
  },
  {
    "command": "claude sessions list",
    "lesson": "cl14",
    "lessonTitle": "Sesiones y Checkpointing"
  },
  {
    "command": "claude --approval manual",
    "lesson": "cl15",
    "lessonTitle": "Permisos y Seguridad"
  },
  {
    "command": "claude --approval diff",
    "lesson": "cl15",
    "lessonTitle": "Permisos y Seguridad"
  },
  {
    "command": "claude --sandbox",
    "lesson": "cl15",
    "lessonTitle": "Permisos y Seguridad"
  },
  {
    "command": "claude review",
    "lesson": "cl18",
    "lessonTitle": "Code Review"
  },
  {
    "command": "claude review --pr 42",
    "lesson": "cl18",
    "lessonTitle": "Code Review"
  },
  {
    "command": "claude --model claude-sonnet-4",
    "lesson": "cl19",
    "lessonTitle": "Costes"
  },
  {
    "command": "claude --max-turns 10",
    "lesson": "cl19",
    "lessonTitle": "Costes"
  },
  {
    "command": "claude doctor",
    "lesson": "cl20",
    "lessonTitle": "Resolución de Problemas"
  },
  {
    "command": "claude --verbose",
    "lesson": "cl20",
    "lessonTitle": "Resolución de Problemas"
  }
];