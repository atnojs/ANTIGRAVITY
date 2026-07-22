const LESSONS_CODEX = [
  {
    "id": "cx1",
    "level": 1,
    "title": "¿Qué es Codex?",
    "icon": "🤖",
    "desc": "Codex es el agente de IA de OpenAI para desarrollo: CLI, IDE integrado, proyectos, hooks, MCP y automatizaciones.",
    "paragraphs": [
      "Codex es el agente de codificación de OpenAI, disponible como CLI y como extensión de VS Code. Te permite delegar tareas de programación complejas a una IA que entiende tu código base, ejecuta comandos, crea archivos y gestiona el ciclo completo de desarrollo.",
      "Codex funciona con los modelos de OpenAI (GPT-4o, GPT-5, o1) y puede operar en modo autónomo o con aprobación manual. Entiende el contexto de tu proyecto completo y puede realizar cambios en múltiples archivos simultáneamente.",
      "La versión CLI se instala con npm install -g @openai/codex y se ejecuta desde cualquier terminal. La versión IDE se integra directamente en VS Code como extensión, permitiéndote chatear con Codex sin salir del editor."
    ],
    "tips": [
      "El quickstart oficial está en learn.chatgpt.com/docs/quickstart — empieza por ahí para tener tu primera tarea completada en 5 minutos.",
      "Codex es más efectivo cuando le das tareas concretas y bien definidas. Evita peticiones vagas como 'arregla el bug' y prefiere 'el botón de login no funciona en Safari, el error es...'."
    ],
    "commands": [
      "npm install -g @openai/codex",
      "codex",
      "codex init",
      "codex 'add dark mode toggle to settings'",
      "codex --model gpt-5"
    ]
  },
  {
    "id": "cx2",
    "level": 1,
    "title": "Quickstart — Primeros Pasos",
    "icon": "⚡",
    "desc": "Instala Codex, autentícate y completa tu primera tarea en menos de 5 minutos.",
    "paragraphs": [
      "Instala Codex CLI con npm install -g @openai/codex. Luego ejecuta codex init para configurar la autenticación con tu cuenta de OpenAI. Puedes usar API key o OAuth.",
      "Tu primera tarea: navega a un proyecto existente y ejecuta codex 'explícame qué hace este proyecto'. Codex analizará la estructura de archivos, dependencias y código para darte un resumen completo.",
      "Para tareas de código: codex 'añade validación de email en el formulario de registro'. Codex leerá los archivos relevantes, hará los cambios necesarios y te mostrará un diff antes de aplicarlos."
    ],
    "tips": [],
    "commands": [
      "npm install -g @openai/codex",
      "codex init",
      "codex 'explícame este proyecto'",
      "codex 'arregla los tests rotos'",
      "codex --help"
    ]
  },
  {
    "id": "cx3",
    "level": 1,
    "title": "Prompting Efectivo",
    "icon": "💬",
    "desc": "Aprende a dar instrucciones precisas para obtener los mejores resultados de Codex.",
    "paragraphs": [
      "La calidad de los resultados de Codex depende directamente de la calidad de tus prompts. Un buen prompt es específico, incluye contexto relevante, especifica el formato de salida deseado y menciona restricciones.",
      "Estructura recomendada: 1) Objetivo claro (qué quieres lograr), 2) Contexto (archivos relevantes, tecnologías usadas), 3) Restricciones (qué no debe cambiar), 4) Formato esperado (diff, archivo completo, explicación).",
      "Para tareas complejas, divide el problema en pasos más pequeños. En lugar de 'construye un sistema de autenticación', pide primero 'crea el modelo de usuario', luego 'añade login con JWT', etc."
    ],
    "tips": [
      "Incluye fragmentos de código o referencias a archivos específicos en tu prompt para dar contexto preciso.",
      "Si Codex no acierta a la primera, itera: corrige el prompt con más detalles y vuelve a intentarlo. La iteración rápida es clave."
    ],
    "commands": []
  },
  {
    "id": "cx4",
    "level": 2,
    "title": "Codex CLI",
    "icon": "⌨️",
    "desc": "Domina la interfaz de línea de comandos: sesiones interactivas, flags, y modos de operación.",
    "paragraphs": [
      "La CLI de Codex ofrece una experiencia completa desde la terminal. El modo interactivo (codex sin argumentos) abre una sesión donde puedes encadenar múltiples tareas. El modo one-shot (codex 'tarea') ejecuta una sola instrucción y termina.",
      "Flags esenciales: --model (elegir modelo), --approval (modo de aprobación: auto, manual, diff), --context (archivos adicionales de contexto), --max-turns (límite de iteraciones).",
      "Codex CLI se integra con git: puede crear ramas, hacer commits y abrir PRs automáticamente. Usa codex 'crea una PR con estos cambios' para delegar todo el flujo de git."
    ],
    "tips": [
      "Usa el modo --approval diff para revisar cada cambio antes de aplicarlo. Es la configuración más segura para empezar.",
      "El flag --context te permite pasar archivos markdown con instrucciones detalladas del proyecto, similar a AGENTS.md en otros agentes."
    ],
    "commands": [
      "codex",
      "codex 'tarea'",
      "codex --model gpt-5",
      "codex --approval diff",
      "codex --context docs/ARCHITECTURE.md",
      "codex --max-turns 10"
    ]
  },
  {
    "id": "cx5",
    "level": 2,
    "title": "Codex IDE (VS Code)",
    "icon": "🖥️",
    "desc": "Integración nativa con VS Code: chatea, edita y revisa código sin salir del editor.",
    "paragraphs": [
      "La extensión de Codex para VS Code lleva toda la potencia del agente directamente al editor. Instálala desde el marketplace de VS Code, autentícate, y tendrás un panel de chat donde Codex ve tu código abierto y puede modificarlo.",
      "La extensión ofrece: chat en panel lateral, comandos inline (selecciona código → Codex lo mejora), navegación por diffs de cambios propuestos, y acceso a todo el contexto del workspace.",
      "La integración con el IDE permite flujos muy rápidos: selecciona una función, pide 'refactoriza esto para que sea más eficiente', revisa el diff, y aplica con un clic."
    ],
    "tips": [
      "La extensión de VS Code es ideal para tareas de edición y refactorización. Para tareas de infraestructura o multi-repo, la CLI suele ser más práctica."
    ],
    "commands": []
  },
  {
    "id": "cx6",
    "level": 2,
    "title": "Proyectos",
    "icon": "📁",
    "desc": "Organiza tu trabajo con proyectos: contextos aislados, reglas y configuraciones independientes.",
    "paragraphs": [
      "Los proyectos en Codex permiten definir contextos de trabajo independientes con sus propias reglas, archivos de contexto, modelos preferidos y configuraciones. Cada proyecto es autocontenido y no interfiere con otros.",
      "Al iniciar codex dentro de un directorio con codex.yaml, Codex carga automáticamente la configuración del proyecto. Esto incluye: modelo por defecto, reglas de seguridad, archivos de contexto adicionales, y hooks.",
      "Los proyectos son la base para trabajar en múltiples codebases sin contaminar configuraciones. Cada proyecto puede tener su propio AGENTS.md, reglas de linting, y preferencias de estilo."
    ],
    "tips": [
      "Crea un codex.yaml en la raíz de cada proyecto para definir reglas específicas. Es el equivalente a AGENTS.md/.cursorrules en otros agentes.",
      "Usa proyectos separados para el frontend y backend de una misma aplicación si tienen reglas y convenciones muy diferentes."
    ],
    "commands": [
      "codex init",
      "codex --project mi-proyecto"
    ]
  },
  {
    "id": "cx7",
    "level": 2,
    "title": "AGENTS.md y Reglas",
    "icon": "📄",
    "desc": "Define el comportamiento de Codex con archivos de configuración y reglas personalizadas.",
    "paragraphs": [
      "AGENTS.md es el archivo de configuración principal de Codex. Se coloca en la raíz del proyecto (o en .codex/AGENTS.md) y define reglas, convenciones, estilos de código, tecnologías usadas y restricciones que el agente debe seguir.",
      "Las reglas en codex.yaml permiten controlar aspectos de seguridad: qué comandos requieren aprobación, qué archivos están protegidos contra escritura, qué dependencias pueden instalarse automáticamente, y límites de uso de API.",
      "Puedes definir reglas globales en ~/.codex/config.yaml y reglas por proyecto en ./codex.yaml. Las reglas del proyecto sobrescriben las globales para ese directorio."
    ],
    "tips": [
      "Empieza con un AGENTS.md mínimo (lenguaje, framework, convenciones) y ve refinándolo según veas qué correcciones recurrente necesita Codex.",
      "Usa reglas de seguridad para proteger archivos de configuración, .env, y cualquier archivo con secretos contra modificaciones accidentales."
    ],
    "commands": []
  },
  {
    "id": "cx8",
    "level": 2,
    "title": "Memorias",
    "icon": "🧠",
    "desc": "Sistema de memoria persistente para que Codex recuerde preferencias y contexto entre sesiones.",
    "paragraphs": [
      "Codex tiene un sistema de memoria similar al de otros agentes: puede guardar preferencias, convenciones y datos importantes que persisten entre sesiones. Esto evita tener que repetir el mismo contexto en cada conversación.",
      "Las memorias se gestionan desde el chat o la CLI. Puedes pedir a Codex que 'recuerda que uso tabs en lugar de espacios' o 'recuerda que el puerto de desarrollo es el 3001'. Codex usará esa información en futuras sesiones.",
      "Qué guardar: preferencias de estilo, configuraciones del entorno, decisiones de arquitectura. Qué no guardar: progreso temporal de tareas, datos que cambian frecuentemente."
    ],
    "tips": [
      "Revisa y limpia las memorias periódicamente con codex memories list y codex memories delete.",
      "Si Codex comete el mismo error varias veces, dile explícitamente que lo recuerde para la próxima sesión."
    ],
    "commands": [
      "codex memories list",
      "codex memories add 'texto'",
      "codex memories delete <id>"
    ]
  },
  {
    "id": "cx9",
    "level": 2,
    "title": "Skills Personalizadas",
    "icon": "📚",
    "desc": "Crea skills reutilizables para automatizar flujos de trabajo repetitivos.",
    "paragraphs": [
      "Las skills de Codex son instrucciones reutilizables que automatizan tareas comunes. Puedes crearlas desde cero o generarlas a partir de conversaciones exitosas. Se almacenan como archivos markdown con frontmatter YAML.",
      "Crear una skill: escribe las instrucciones en un archivo .md con metadatos (nombre, descripción, tags, triggers) y colócalo en .codex/skills/. Codex cargará la skill automáticamente cuando la tarea coincida con su descripción.",
      "Las skills pueden incluir: pasos detallados, comandos a ejecutar, archivos a modificar, reglas de validación y criterios de aceptación. Son la forma más efectiva de estandarizar flujos de trabajo en un equipo."
    ],
    "tips": [
      "Después de completar una tarea compleja con éxito, pregúntale a Codex si puede convertir ese flujo en una skill para la próxima vez.",
      "Organiza las skills por categoría en subdirectorios: .codex/skills/testing/, .codex/skills/deployment/, etc."
    ],
    "commands": [
      "codex skills list",
      "codex skills create"
    ]
  },
  {
    "id": "cx10",
    "level": 3,
    "title": "Hooks",
    "icon": "🪝",
    "desc": "Automatiza acciones antes y después de las tareas de Codex con hooks configurables.",
    "paragraphs": [
      "Los hooks de Codex permiten ejecutar acciones automáticas antes (pre-hooks) y después (post-hooks) de cada tarea. Son scripts o comandos que se disparan en momentos específicos del flujo de trabajo.",
      "Ejemplos de pre-hooks: formatear código antes de cada commit, ejecutar linters, verificar que no hay secretos en el código. Post-hooks: ejecutar tests, desplegar a staging, notificar al equipo.",
      "Los hooks se configuran en codex.yaml y pueden ser comandos de shell, scripts de Python o cualquier ejecutable. Se heredan del directorio actual hacia arriba, permitiendo hooks globales y por proyecto."
    ],
    "tips": [
      "Empieza con un post-hook simple que ejecute los tests después de cada cambio. Es la red de seguridad más valiosa.",
      "Los hooks pueden fallar intencionadamente para bloquear operaciones peligrosas. Úsalos como guardrails de seguridad adicionales."
    ],
    "commands": []
  },
  {
    "id": "cx11",
    "level": 3,
    "title": "MCP en Codex",
    "icon": "🔌",
    "desc": "Conecta Codex a servidores MCP para extender sus capacidades con herramientas externas.",
    "paragraphs": [
      "Codex soporta el protocolo MCP (Model Context Protocol) para conectarse a servidores externos que proporcionan herramientas adicionales. Puedes conectar Codex a bases de datos, APIs, sistemas de archivos remotos y servicios cloud.",
      "La configuración MCP se define en codex.yaml bajo la clave mcp.servers. Cada servidor puede ser de tipo stdio (proceso local) o HTTP (remoto). Codex descubre automáticamente las herramientas disponibles.",
      "Casos de uso: conectar Codex a tu base de datos para que pueda consultar esquemas y datos, a tu infraestructura cloud para gestionar recursos, o a herramientas internas de tu empresa vía API."
    ],
    "tips": [
      "Empieza con servidores MCP del catálogo oficial de OpenAI. Están probados y mantenidos.",
      "Para entornos de producción, prefiere servidores stdio sobre HTTP: no exponen puertos de red."
    ],
    "commands": []
  },
  {
    "id": "cx12",
    "level": 3,
    "title": "Subagentes",
    "icon": "👥",
    "desc": "Divide tareas complejas generando subagentes que trabajan en paralelo.",
    "paragraphs": [
      "Codex puede generar subagentes independientes para trabajar en paralelo en diferentes partes de una tarea. Cada subagente tiene su propio contexto aislado y puede modificar archivos, ejecutar comandos y crear PRs.",
      "La delegación es ideal para: dividir una feature grande en componentes independientes (frontend + backend), ejecutar tests y análisis de código en paralelo, o investigar múltiples enfoques para un mismo problema.",
      "Los subagentes heredan la configuración del agente principal (modelo, reglas, hooks) pero operan en contextos aislados. Al terminar, devuelven sus resultados al agente principal que los integra."
    ],
    "tips": [
      "Para features grandes, divide el trabajo en componentes independientes que no compartan archivos. Así los subagentes no generan conflictos de merge."
    ],
    "commands": []
  },
  {
    "id": "cx13",
    "level": 3,
    "title": "Automatizaciones",
    "icon": "⏰",
    "desc": "Programa tareas recurrentes y flujos de trabajo automáticos.",
    "paragraphs": [
      "Codex permite programar tareas recurrentes como revisión de PRs, actualización de dependencias, generación de informes y despliegues programados. Las automatizaciones se configuran en codex.yaml.",
      "Puedes definir triggers basados en tiempo (cada lunes a las 9 AM), en eventos de git (al abrir una PR), o en webhooks externos. Codex ejecutará la tarea con el contexto definido y entregará los resultados donde configures.",
      "Las automatizaciones son ideales para: revisión automática de PRs con estándares de código, actualización semanal de dependencias con tests, generación de changelogs, y despliegues programados a staging."
    ],
    "tips": [
      "Empieza con una automatización simple como 'revisa las PRs abiertas cada mañana'. El feedback rápido te ayudará a refinar las reglas."
    ],
    "commands": [
      "codex automations list",
      "codex automations create"
    ]
  },
  {
    "id": "cx14",
    "level": 3,
    "title": "Code Review Automática",
    "icon": "✅",
    "desc": "Revisa PRs automáticamente con estándares configurables y sugerencias de mejora.",
    "paragraphs": [
      "Codex puede revisar pull requests automáticamente, analizando el diff, comprobando estándares de código, detectando bugs potenciales y sugiriendo mejoras. La revisión se configura con reglas personalizables.",
      "La revisión incluye: análisis de estilo (linting), detección de patrones inseguros, verificación de tests, comprobación de tipos, y sugerencias de optimización. Todo configurable según los estándares de tu equipo.",
      "Puedes ejecutar code review manualmente (codex review) o configurarla como automatización para que se ejecute en cada PR nueva. Codex publica sus comentarios directamente en la PR de GitHub/GitLab."
    ],
    "tips": [
      "Configura las reglas de revisión en .codex/review-rules.md para adaptar el análisis a las convenciones específicas de tu proyecto."
    ],
    "commands": [
      "codex review",
      "codex review --pr 42"
    ]
  },
  {
    "id": "cx15",
    "level": 3,
    "title": "Sandboxing y Seguridad",
    "icon": "🔒",
    "desc": "Ejecuta Codex en entornos aislados para máxima seguridad.",
    "paragraphs": [
      "Codex soporta ejecución en sandbox para aislar sus operaciones del sistema anfitrión. El sandboxing evita que Codex acceda a archivos fuera del proyecto, ejecute comandos peligrosos o instale dependencias maliciosas.",
      "La configuración de seguridad incluye: aprobación de comandos (manual, automática, o por diff), lista blanca/negra de comandos permitidos, restricción de acceso a archivos, y límites de recursos (CPU, memoria, red).",
      "El sandboxing es especialmente importante en CI/CD y entornos compartidos donde múltiples proyectos o usuarios ejecutan Codex en la misma máquina."
    ],
    "tips": [
      "En producción, ejecuta siempre Codex con --approval manual o --approval diff. Nunca uses modo automático en entornos sensibles.",
      "Define una lista blanca de comandos permitidos en codex.yaml para evitar ejecuciones accidentales de comandos destructivos."
    ],
    "commands": [
      "codex --approval diff",
      "codex --approval manual",
      "codex --sandbox"
    ]
  },
  {
    "id": "cx16",
    "level": 3,
    "title": "Resolución de Problemas",
    "icon": "❓",
    "desc": "Soluciones a errores comunes y diagnóstico de problemas con Codex.",
    "paragraphs": [
      "Problemas frecuentes con Codex: error de autenticación (verifica tu API key con codex whoami), timeout en tareas largas (aumenta --max-turns), cambios no deseados (revisa el diff antes de aplicar con --approval diff).",
      "Si Codex no entiende tu código base, asegúrate de tener un AGENTS.md en la raíz del proyecto describiendo la arquitectura, stack tecnológico y convenciones. Sin este archivo, Codex depende solo del análisis automático de código.",
      "Para depurar problemas de configuración, ejecuta codex doctor. Te dará un diagnóstico completo del entorno, dependencias, permisos y configuración."
    ],
    "tips": [
      "Antes de pedir ayuda, ejecuta codex doctor. Resuelve el 80% de los problemas de configuración.",
      "El archivo de logs de Codex está en ~/.codex/logs/. Contiene información detallada de cada sesión y es la primera fuente para diagnosticar comportamientos inesperados."
    ],
    "commands": [
      "codex doctor",
      "codex whoami",
      "codex --approval diff --max-turns 20"
    ]
  }
];

const GLOSSARY_CODEX = [
  {
    "command": "npm install -g @openai/codex",
    "lesson": "cx1",
    "lessonTitle": "¿Qué es Codex?"
  },
  {
    "command": "codex",
    "lesson": "cx1",
    "lessonTitle": "¿Qué es Codex?"
  },
  {
    "command": "codex init",
    "lesson": "cx1",
    "lessonTitle": "¿Qué es Codex?"
  },
  {
    "command": "codex 'add dark mode toggle to settings'",
    "lesson": "cx1",
    "lessonTitle": "¿Qué es Codex?"
  },
  {
    "command": "codex --model gpt-5",
    "lesson": "cx1",
    "lessonTitle": "¿Qué es Codex?"
  },
  {
    "command": "npm install -g @openai/codex",
    "lesson": "cx2",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "codex init",
    "lesson": "cx2",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "codex 'explícame este proyecto'",
    "lesson": "cx2",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "codex 'arregla los tests rotos'",
    "lesson": "cx2",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "codex --help",
    "lesson": "cx2",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "codex",
    "lesson": "cx4",
    "lessonTitle": "Codex CLI"
  },
  {
    "command": "codex 'tarea'",
    "lesson": "cx4",
    "lessonTitle": "Codex CLI"
  },
  {
    "command": "codex --model gpt-5",
    "lesson": "cx4",
    "lessonTitle": "Codex CLI"
  },
  {
    "command": "codex --approval diff",
    "lesson": "cx4",
    "lessonTitle": "Codex CLI"
  },
  {
    "command": "codex --context docs/ARCHITECTURE.md",
    "lesson": "cx4",
    "lessonTitle": "Codex CLI"
  },
  {
    "command": "codex --max-turns 10",
    "lesson": "cx4",
    "lessonTitle": "Codex CLI"
  },
  {
    "command": "codex init",
    "lesson": "cx6",
    "lessonTitle": "Proyectos"
  },
  {
    "command": "codex --project mi-proyecto",
    "lesson": "cx6",
    "lessonTitle": "Proyectos"
  },
  {
    "command": "codex memories list",
    "lesson": "cx8",
    "lessonTitle": "Memorias"
  },
  {
    "command": "codex memories add 'texto'",
    "lesson": "cx8",
    "lessonTitle": "Memorias"
  },
  {
    "command": "codex memories delete <id>",
    "lesson": "cx8",
    "lessonTitle": "Memorias"
  },
  {
    "command": "codex skills list",
    "lesson": "cx9",
    "lessonTitle": "Skills Personalizadas"
  },
  {
    "command": "codex skills create",
    "lesson": "cx9",
    "lessonTitle": "Skills Personalizadas"
  },
  {
    "command": "codex automations list",
    "lesson": "cx13",
    "lessonTitle": "Automatizaciones"
  },
  {
    "command": "codex automations create",
    "lesson": "cx13",
    "lessonTitle": "Automatizaciones"
  },
  {
    "command": "codex review",
    "lesson": "cx14",
    "lessonTitle": "Code Review Automática"
  },
  {
    "command": "codex review --pr 42",
    "lesson": "cx14",
    "lessonTitle": "Code Review Automática"
  },
  {
    "command": "codex --approval diff",
    "lesson": "cx15",
    "lessonTitle": "Sandboxing y Seguridad"
  },
  {
    "command": "codex --approval manual",
    "lesson": "cx15",
    "lessonTitle": "Sandboxing y Seguridad"
  },
  {
    "command": "codex --sandbox",
    "lesson": "cx15",
    "lessonTitle": "Sandboxing y Seguridad"
  },
  {
    "command": "codex doctor",
    "lesson": "cx16",
    "lessonTitle": "Resolución de Problemas"
  },
  {
    "command": "codex whoami",
    "lesson": "cx16",
    "lessonTitle": "Resolución de Problemas"
  },
  {
    "command": "codex --approval diff --max-turns 20",
    "lesson": "cx16",
    "lessonTitle": "Resolución de Problemas"
  }
];