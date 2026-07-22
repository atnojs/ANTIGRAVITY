var LESSONS_ANTIGRAVITY = [
  {
    "id": "ag1",
    "level": 1,
    "title": "¿Qué es Antigravity?",
    "icon": "🌌",
    "desc": "Entorno de desarrollo de Google con editor integrado, proyectos, artifacts, skills, MCP y sidecars.",
    "paragraphs": [
      "Antigravity es el entorno de desarrollo integrado de Google para construir aplicaciones con IA. Combina un editor de código cloud, gestión de proyectos, integración con modelos de Google (Gemini) y herramientas de desarrollo en una plataforma unificada.",
      "Antigravity te permite crear aplicaciones completas — frontend, backend, bases de datos, APIs — desde el navegador, sin configurar entornos locales. Todo se ejecuta en la nube de Google con acceso a los modelos Gemini.",
      "El flujo de trabajo es: creas un proyecto, escribes código (o se lo pides a la IA), ejecutas y pruebas en el mismo entorno, y despliegas cuando esté listo. Sin instalar dependencias, sin configurar Docker, sin pelearte con versiones de Node."
    ],
    "tips": [
      "El overview oficial está en antigravity.google/docs/overview?app=antigravity — explora la documentación completa después de esta lección.",
      "Antigravity brilla especialmente en prototipado rápido y aplicaciones full-stack con IA integrada."
    ],
    "commands": []
  },
  {
    "id": "ag2",
    "level": 1,
    "title": "Walkthrough — Primeros Pasos",
    "icon": "🚶",
    "desc": "Crea tu primer proyecto en Antigravity y aprende el flujo de trabajo básico.",
    "paragraphs": [
      "El walkthrough oficial te guía por la creación de tu primera app en Antigravity: crear un proyecto, usar el editor, ejecutar código, y desplegar. Es la forma más rápida de familiarizarte con el entorno.",
      "El editor de Antigravity es un IDE completo en el navegador: soporte para múltiples lenguajes (Python, JavaScript, TypeScript, Go, Java), resaltado de sintaxis, autocompletado con IA, y terminal integrada.",
      "El flujo típico: File > New Project, eliges plantilla o empiezas desde cero, escribes código con ayuda de la IA, ejecutas con Run, y despliegas con Deploy. Todo desde la misma interfaz."
    ],
    "tips": [
      "Completa el walkthrough oficial antes de empezar tu propio proyecto. En 10 minutos entenderás el flujo completo.",
      "Usa las plantillas (templates) para empezar rápido con stacks comunes: React+Node, Python+FastAPI, Next.js, etc."
    ],
    "commands": []
  },
  {
    "id": "ag3",
    "level": 1,
    "title": "Funcionalidades Principales",
    "icon": "🧩",
    "desc": "Panorama de todas las capacidades de Antigravity: editor, IA, proyectos, base de datos, despliegue.",
    "paragraphs": [
      "Antigravity integra: editor de código cloud con IA, terminal virtual, gestor de dependencias automático, base de datos integrada (Firebase/Firestore), autenticación de usuarios, hosting, y despliegue continuo.",
      "La IA de Antigravity (basada en Gemini) puede: escribir código desde descripciones en lenguaje natural, explicar código existente, detectar y corregir bugs, generar tests, y optimizar rendimiento.",
      "El sistema de artifacts permite generar y visualizar resultados de IA: imágenes, gráficos, visualizaciones de datos, documentos y componentes interactivos. Los artifacts persisten en el proyecto y pueden compartirse."
    ],
    "tips": [
      "La integración con Firebase significa que puedes tener base de datos, autenticación y hosting sin salir de Antigravity ni configurar servicios externos.",
      "Usa la IA para generar código boilerplate:宁可 pedirle que 'cree un endpoint REST para usuarios con CRUD' que escribirlo manualmente."
    ],
    "commands": []
  },
  {
    "id": "ag4",
    "level": 1,
    "title": "Editor",
    "icon": "✏️",
    "desc": "Domina el editor integrado: lenguajes, atajos, terminal y personalización.",
    "paragraphs": [
      "El editor de Antigravity es un IDE completo basado en Code OSS (la base open-source de VS Code). Soporta todos los lenguajes principales, extensiones, temas, y atajos de teclado familiares.",
      "La terminal integrada te permite ejecutar comandos directamente en el entorno cloud: instalar dependencias, ejecutar scripts, gestionar git, y desplegar. Todo sin salir del navegador.",
      "El editor incluye integración con GitHub: clona repos, crea ramas, haz commits y push directamente desde la interfaz. También soporta live share para colaborar en tiempo real."
    ],
    "tips": [
      "Si vienes de VS Code, el editor de Antigravity te resultará familiar. La mayoría de atajos y extensiones funcionan igual.",
      "Configura el editor a tu gusto: temas, fuentes, extensiones. La configuración se guarda en tu perfil y viaja contigo entre proyectos."
    ],
    "commands": []
  },
  {
    "id": "ag5",
    "level": 2,
    "title": "Proyectos",
    "icon": "📁",
    "desc": "Organiza tu trabajo con proyectos independientes, cada uno con su configuración y recursos.",
    "paragraphs": [
      "Cada proyecto en Antigravity es un espacio de trabajo autocontenido con su propio código, dependencias, base de datos, configuración y despliegue. Los proyectos no comparten estado y pueden tener stacks tecnológicos completamente diferentes.",
      "Al crear un proyecto, eliges: nombre, stack tecnológico (plantilla o personalizado), visibilidad (privado/público), y región de despliegue. Puedes cambiar cualquier configuración después.",
      "Los proyectos incluyen control de versiones con git integrado, historial de despliegues, logs en tiempo real, y monitorización de uso. Todo desde el dashboard del proyecto."
    ],
    "tips": [
      "Usa un proyecto por aplicación. No mezcles apps diferentes en el mismo proyecto aunque compartan código.",
      "Los proyectos públicos son ideales para portfolios, demos y compartir código con la comunidad."
    ],
    "commands": []
  },
  {
    "id": "ag6",
    "level": 2,
    "title": "Configuración y Settings",
    "icon": "⚙️",
    "desc": "Personaliza Antigravity: modelo de IA, permisos, región, notificaciones y más.",
    "paragraphs": [
      "La configuración de Antigravity cubre: modelo de IA por defecto (Gemini Flash, Pro, Ultra), permisos de acceso al proyecto, región de despliegue, notificaciones, límites de uso, y preferencias de editor.",
      "Puedes configurar el comportamiento de la IA: temperatura, máximo de tokens, modo de respuesta (concisa vs detallada), y si debe ejecutar código automáticamente o pedir confirmación.",
      "La configuración se gestiona desde el panel de Settings, accesible desde tu perfil. Los cambios se aplican inmediatamente a todos tus proyectos."
    ],
    "tips": [
      "Para tareas de desarrollo, Gemini Flash es rápido y barato. Para análisis complejo y code review, usa Gemini Pro o Ultra.",
      "Configura notificaciones para despliegues y errores. Así sabrás al instante si algo falla en producción."
    ],
    "commands": []
  },
  {
    "id": "ag7",
    "level": 2,
    "title": "Permisos y Seguridad",
    "icon": "🔒",
    "desc": "Controla el acceso a tus proyectos y lo que la IA puede hacer.",
    "paragraphs": [
      "Antigravity te permite controlar quién accede a tus proyectos: propietario, editor, visor. Puedes invitar colaboradores por email y definir sus permisos. Los proyectos privados solo son accesibles para quienes invites.",
      "La seguridad de la IA incluye: aprobación manual de ejecución de comandos, restricción de acceso a archivos sensibles, y sandboxing automático de código generado. Puedes configurar el nivel de autonomía que prefieras.",
      "Todos los datos se cifran en tránsito y en reposo. Antigravity cumple con los estándares de seguridad de Google Cloud."
    ],
    "tips": [
      "Para proyectos en producción, usa permisos de visor para stakeholders que solo necesitan ver, no editar.",
      "Revisa periódicamente quién tiene acceso a tus proyectos. Elimina colaboradores que ya no participan."
    ],
    "commands": []
  },
  {
    "id": "ag8",
    "level": 2,
    "title": "Planes y Límites",
    "icon": "💳",
    "desc": "Conoce los diferentes planes de Antigravity y sus límites de uso.",
    "paragraphs": [
      "Antigravity ofrece varios planes: gratuito (para prototipado y aprendizaje), Pro (para desarrollo profesional), y Enterprise (para equipos grandes con necesidades de seguridad avanzadas).",
      "El plan gratuito incluye: editor completo, IA con límite de uso diario, base de datos pequeña, y hosting básico. El plan Pro añade: más uso de IA, bases de datos más grandes, dominios personalizados y soporte prioritario.",
      "Los límites incluyen: tokens de IA por día, almacenamiento, ancho de banda, número de proyectos, y tiempo de ejecución. Puedes monitorizar tu uso desde el dashboard."
    ],
    "tips": [
      "Empieza con el plan gratuito. Si necesitas más, el salto a Pro es inmediato y no pierdes ningún dato.",
      "Monitoriza tu uso de IA desde el dashboard para evitar sorpresas. Los límites se reinician diariamente."
    ],
    "commands": []
  },
  {
    "id": "ag9",
    "level": 3,
    "title": "Artifacts",
    "icon": "🎨",
    "desc": "Genera y visualiza resultados de IA: imágenes, gráficos, documentos y componentes interactivos.",
    "paragraphs": [
      "Los artifacts son el sistema de Antigravity para visualizar resultados generados por IA. Cuando la IA produce una imagen, un gráfico, un documento HTML o un componente React, Antigravity lo renderiza automáticamente en un panel lateral.",
      "Tipos de artifacts soportados: imágenes (PNG, SVG), HTML/CSS/JS interactivo, gráficos (Plotly, Chart.js), documentos (Markdown, PDF), y componentes de UI. Cada artifact es interactivo y puede descargarse o compartirse.",
      "Los artifacts son la característica diferencial de Antigravity: convierten las respuestas de la IA de texto plano a experiencias visuales e interactivas sin configuración adicional."
    ],
    "tips": [
      "Pide a la IA que genere artifacts para visualizar datos complejos: 'crea un gráfico de barras con las ventas del último trimestre'.",
      "Los artifacts HTML/CSS/JS son ideales para prototipos de UI: la IA genera el código y Antigravity lo renderiza instantáneamente."
    ],
    "commands": []
  },
  {
    "id": "ag10",
    "level": 3,
    "title": "Navegador Integrado",
    "icon": "🖥️",
    "desc": "Prueba tus aplicaciones web directamente en Antigravity con el navegador integrado.",
    "paragraphs": [
      "Antigravity incluye un navegador integrado que te permite previsualizar tus aplicaciones web en tiempo real mientras las desarrollas. Similar a un navegador normal pero embebido en el IDE.",
      "El navegador soporta: recarga automática al guardar cambios, vista responsive (móvil, tablet, escritorio), consola de desarrollador, e inspección de elementos. Ideal para desarrollo frontend y testing.",
      "Puedes compartir la URL de previsualización con colaboradores para que vean tu app en desarrollo sin necesidad de desplegar. Perfecto para demos y revisiones de diseño."
    ],
    "tips": [
      "Usa el navegador integrado para probar cambios de CSS y responsive design en tiempo real sin salir del editor.",
      "La recarga automática ahorra tiempo: cada vez que guardas un archivo, el navegador se actualiza solo."
    ],
    "commands": []
  },
  {
    "id": "ag11",
    "level": 3,
    "title": "Skills en Antigravity",
    "icon": "📚",
    "desc": "Crea y usa skills para automatizar tareas comunes en tus proyectos.",
    "paragraphs": [
      "Las skills de Antigravity son instrucciones reutilizables que automatizan flujos de trabajo. Similares a las skills de Hermes y Claude Code, pero integradas en el ecosistema de Google.",
      "Puedes crear skills para: despliegues automatizados, generación de documentación, testing, formateo de código, migraciones de base de datos, y cualquier tarea repetitiva de tu flujo de desarrollo.",
      "Las skills se almacenan en tu proyecto (.antigravity/skills/) y se comparten entre colaboradores. La IA las carga automáticamente cuando la tarea coincide con la descripción de la skill."
    ],
    "tips": [
      "Crea una skill para el flujo de despliegue de tu proyecto: build + test + deploy. Así cada despliegue es consistente y sin errores humanos.",
      "Comparte skills con tu equipo para estandarizar flujos de trabajo. Así todos los desarrolladores siguen las mismas prácticas."
    ],
    "commands": []
  },
  {
    "id": "ag12",
    "level": 3,
    "title": "MCP en Antigravity",
    "icon": "🔌",
    "desc": "Extiende Antigravity conectándolo a servidores MCP externos.",
    "paragraphs": [
      "Antigravity soporta el protocolo MCP para conectar herramientas externas: bases de datos, APIs de terceros, servicios cloud, y herramientas personalizadas. Los servidores MCP se configuran en .antigravity/mcp.json.",
      "La integración MCP permite: consultar bases de datos externas, interactuar con APIs de Google Cloud, acceder a servicios de terceros (Stripe, SendGrid, etc.), y usar herramientas especializadas.",
      "Antigravity gestiona la seguridad de MCP: los servidores se ejecutan en sandbox, las credenciales se almacenan cifradas, y puedes filtrar qué herramientas específicas están disponibles para cada proyecto."
    ],
    "tips": [
      "Empieza con el servidor MCP de Google Cloud para acceder a tus recursos cloud directamente desde Antigravity.",
      "Para APIs de terceros, crea un servidor MCP personalizado que encapsule la autenticación y exponga solo los endpoints necesarios."
    ],
    "commands": []
  },
  {
    "id": "ag13",
    "level": 3,
    "title": "Subagentes",
    "icon": "👥",
    "desc": "Divide el trabajo entre subagentes especializados que operan en paralelo.",
    "paragraphs": [
      "Antigravity soporta subagentes para dividir tareas complejas. Puedes lanzar múltiples agentes que trabajan simultáneamente en diferentes partes de tu proyecto: uno en el frontend, otro en el backend, un tercero en tests.",
      "Los subagentes se configuran en .antigravity/agents.yaml: defines nombre, especialidad, herramientas disponibles, y límites. Cada subagente opera en un contexto aislado con acceso controlado a los recursos del proyecto.",
      "La delegación es ideal para: desarrollar features que abarcan múltiples capas (UI + API + DB), ejecutar tests y análisis en paralelo, o explorar diferentes implementaciones para comparar resultados."
    ],
    "tips": [
      "Define subagentes con responsabilidades claras y sin solapamiento de archivos para evitar conflictos de edición.",
      "Usa subagentes para tareas que son naturalmente paralelizables, no para tareas con dependencias secuenciales estrictas."
    ],
    "commands": []
  },
  {
    "id": "ag14",
    "level": 3,
    "title": "Hooks",
    "icon": "🪝",
    "desc": "Automatiza acciones con hooks en eventos clave del ciclo de desarrollo.",
    "paragraphs": [
      "Los hooks de Antigravity permiten ejecutar acciones automáticas en momentos clave: antes de desplegar, después de un commit, al abrir un PR, o al completar una tarea de IA.",
      "Tipos de hooks disponibles: pre-deploy (validaciones antes de desplegar), post-commit (tests y linting), on-pr-open (revisión automática), y custom hooks definidos por el usuario.",
      "Los hooks se configuran en .antigravity/hooks.yaml y pueden ejecutar comandos de shell, scripts de Python, o llamadas a APIs externas. Son la base para pipelines de CI/CD dentro de Antigravity."
    ],
    "tips": [
      "El hook más valioso para empezar: pre-deploy que ejecuta todos los tests. Así nunca despliegas código roto.",
      "Los hooks pueden notificar a Slack, Discord o email cuando se completa una acción importante."
    ],
    "commands": []
  },
  {
    "id": "ag15",
    "level": 3,
    "title": "Sidecars",
    "icon": "🚗",
    "desc": "Ejecuta servicios auxiliares junto a tu aplicación principal.",
    "paragraphs": [
      "Los sidecars en Antigravity son servicios auxiliares que se ejecutan junto a tu aplicación: bases de datos, colas de mensajes, caches, proxies, o cualquier servicio que tu app necesite.",
      "Cada sidecar se configura con: imagen Docker, puertos, variables de entorno, volúmenes, y límites de recursos. Antigravity los orquesta automáticamente: inicia, detiene y escala según necesidad.",
      "Los sidecars son ideales para: añadir PostgreSQL a tu app Node, Redis para caché, RabbitMQ para colas, o Nginx como proxy inverso. Todo gestionado sin salir de Antigravity."
    ],
    "tips": [
      "Usa sidecars en lugar de servicios cloud externos durante el desarrollo. Es más rápido y no necesitas cuentas adicionales.",
      "Para producción, considera migrar los sidecars a servicios gestionados de Google Cloud para mayor escalabilidad y disponibilidad."
    ],
    "commands": []
  },
  {
    "id": "ag16",
    "level": 3,
    "title": "FAQ y Solución de Problemas",
    "icon": "❓",
    "desc": "Respuestas a dudas frecuentes y solución de errores comunes.",
    "paragraphs": [
      "Problemas frecuentes: error de autenticación (verifica tu cuenta de Google), límite de tokens excedido (espera al reset diario o actualiza a Pro), dependencias no encontradas (añádelas en requirements.txt o package.json).",
      "Si la IA genera código incorrecto: sé más específico en tu prompt, incluye ejemplos de lo que esperas, menciona la versión del lenguaje/framework, y divide la tarea en pasos más pequeños.",
      "Para problemas de rendimiento: verifica que no tengas sidecars innecesarios consumiendo recursos, optimiza las consultas a base de datos, y considera actualizar al plan Pro para más recursos."
    ],
    "tips": [
      "Antes de contactar soporte, revisa la documentación oficial de la funcionalidad que está fallando. El 90% de las dudas están respondidas allí.",
      "La comunidad de Antigravity en Discord es muy activa. Si tienes un problema, probablemente alguien ya lo resolvió."
    ],
    "commands": []
  }
];

var GLOSSARY_ANTIGRAVITY = [];