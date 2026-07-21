/**
 * Hermes Academy — Datos de lecciones extraídos de la documentación oficial.
 * Generado automáticamente desde hermes-agent.nousresearch.com/docs
 */
const LESSONS_DATA = [
  {
    "id": "l1",
    "level": 1,
    "title": "¿Qué es Hermes Agent?",
    "icon": "🚀",
    "src": "website/docs/index.mdx",
    "desc": "Hermes Agent es un agente de IA autónomo con un bucle de aprendizaje cerrado: crea skills desde la experiencia, las mejora durante el uso y construye un modelo cada vez más profundo de quién eres.",
    "paragraphs": [
      "Hermes Agent es un agente de IA autónomo construido por Nous Research — el laboratorio detrás de los modelos Hermes, Nomos y Psyche. No es un copiloto de código atado a un IDE ni un wrapper de chatbot. Vive donde lo pongas: un VPS de $5, un clúster de GPUs, o infraestructura serverless que no cuesta casi nada cuando está inactiva.",
      "El único agente con un bucle de aprendizaje cerrado: crea skills desde la experiencia, las mejora durante el uso, se auto-nudgea para persistir conocimiento y construye un modelo cada vez más profundo de quién eres a través de las sesiones.",
      "Funciona con Nous Portal, OpenRouter, OpenAI, o cualquier endpoint compatible. Ofrece 6 backends de terminal (local, Docker, SSH, Daytona, Singularity, Modal), 20+ plataformas de mensajería, cron integrado, delegación de subagentes, skills compatibles con agentskills.io, y soporte MCP.",
      "El camino más rápido: instala con el Desktop installer, ejecuta hermes setup --portal (una suscripción cubre modelo + Tool Gateway: búsqueda web, imágenes, TTS, navegador), y empieza a chatear."
    ],
    "tips": [
      "El camino más rápido para tener un agente funcionando: después de instalar, ejecuta hermes setup --portal. Un OAuth cubre un modelo más las cuatro herramientas del Tool Gateway.",
      "Hermes Agent se vuelve más capaz cuanto más tiempo funciona — no es una herramienta estática, aprende y mejora con el uso."
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
    ],
    "size": 5000
  },
  {
    "id": "l2",
    "level": 1,
    "title": "Instalación",
    "icon": "💿",
    "src": "website/docs/getting-started/installation.md",
    "desc": "Instala Hermes Agent en menos de 2 minutos en Windows, macOS, Linux, WSL2 o Android (Termux).",
    "paragraphs": [
      "For the full platform support matrix (which OSes, distribution methods, and",
      "platform-gated features are supported), see Platform Support.",
      "To easily install the command-line and desktop applications, download the Hermes Desktop installer from our website and run it.",
      "If you want to install & run Hermes Desktop after a command-line only install, simply run"
    ],
    "tips": [],
    "commands": [
      "hermes             # Start chatting!",
      "hermes config check",
      "hermes config get     # Inspect individual config values",
      "hermes config migrate",
      "hermes config set     # Set individual config values",
      "hermes config set OPENROUTER_API_KEY your_key",
      "hermes desktop",
      "hermes doctor",
      "hermes gateway setup  # Set up messaging platforms",
      "hermes model",
      "hermes model          # Choose your LLM provider and model",
      "hermes setup          # Or run the full setup wizard to configure everything at once",
      "hermes setup --portal",
      "hermes tools          # Configure which tools are enabled",
      "hermes update"
    ],
    "size": 8462
  },
  {
    "id": "l3",
    "level": 1,
    "title": "Quickstart — Primeros Pasos",
    "icon": "⚡",
    "src": "website/docs/getting-started/quickstart.md",
    "desc": "Tu primera conversación con Hermes y las funciones clave que debes probar.",
    "paragraphs": [
      "This guide gets you from zero to a working Hermes setup that survives real use. Install, choose a provider, verify a working chat, and know exactly what to do when something breaks.",
      "Onchain AI Garage put together a Masterclass walkthrough of installation, setup, and basic commands — a good companion to this page if you'd rather follow along on video. For more, see the full Hermes Agent Tutorials & Use Cases playlist.",
      "style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}",
      "title=\"Hermes Agent Masterclass: Installation, Setup, Basic Commands\""
    ],
    "tips": [
      "You can switch providers at any time with hermes model — no lock-in. For a full list of all supported providers and setup details, see AI Providers."
    ],
    "commands": [
      "hermes            # classic CLI",
      "hermes --continue",
      "hermes --continue    # Resume the most recent session",
      "hermes --tui",
      "hermes --tui      # modern TUI (recommended)",
      "hermes -c            # Short form",
      "hermes config set OPENROUTER_API_KEY sk-or-...",
      "hermes config set model anthropic/claude-opus-4.6",
      "hermes config set terminal.backend docker",
      "hermes config set terminal.backend docker    # Docker isolation",
      "hermes config set terminal.backend ssh       # Remote server",
      "hermes doctor",
      "hermes gateway",
      "hermes gateway setup",
      "hermes gateway setup    # Interactive platform configuration"
    ],
    "size": 18518
  },
  {
    "id": "l4",
    "level": 1,
    "title": "Ruta de Aprendizaje",
    "icon": "🗺️",
    "src": "website/docs/getting-started/learning-path.md",
    "desc": "Encuentra la documentación adecuada según tu nivel de experiencia y caso de uso.",
    "paragraphs": [
      "Hermes Agent can do a lot — CLI assistant, Telegram/Discord bot, task automation, RL training, and more. This page helps you figure out where to start and what to read based on your experience level and what you're trying to accomplish.",
      "If you haven't installed Hermes Agent yet, begin with the Installation guide and then run through the Quickstart. Everything below assumes you have a working installation.",
      "First-time users almost always want hermes setup --portal — one OAuth covers a model plus the four Tool Gateway tools (search/image/TTS/browser). See Nous Portal.",
      "- Know your level? Jump to the experience-level table and follow the reading order for your tier."
    ],
    "tips": [
      "Pass files directly into your conversation with context files. Hermes Agent can read, edit, and run code in your projects.",
      "Cron jobs let Hermes Agent run tasks on a schedule — daily summaries, periodic checks, automated reports — without you being present.",
      "For most custom tool creation, start with plugins. The Adding Tools\npage is for built-in Hermes core development, not the usual user/custom-tool path.",
      "RL training works best when you already understand the basics of how Hermes Agent handles conversations and tool calls. Run through the Beginner path first if you're new.",
      "You don't need to read everything. Pick the path that matches your goal, follow the links in order, and you'll be productive quickly. You can always come back to this page to find your next step."
    ],
    "commands": [
      "hermes setup --portal"
    ],
    "size": 8363
  },
  {
    "id": "l5",
    "level": 1,
    "title": "Resumen de Funcionalidades",
    "icon": "🧩",
    "src": "website/docs/user-guide/features/overview.md",
    "desc": "Panorama general de todas las capacidades de Hermes: herramientas, automatización, medios, integraciones y personalización.",
    "paragraphs": [
      "Hermes Agent includes a rich set of capabilities that extend far beyond basic chat. From persistent memory and file-aware context to browser automation and voice conversations, these features work together to make Hermes a powerful autonomous assistant.",
      "hermes setup --portal covers a model provider plus all four Tool Gateway tools (web search, image generation, TTS, browser) in one command. See Nous Portal.",
      "- Tools & Toolsets — Tools are functions that extend the agent's capabilities. They're organized into logical toolsets that can be enabled or disabled per platform, covering web search, terminal execution, file editing, memory, delegation, and more.",
      "- Skills System — On-demand knowledge documents the agent can load when needed. Skills follow a progressive disclosure pattern to minimize token usage and are compatible with the agentskills.io open standard."
    ],
    "tips": [],
    "commands": [
      "hermes plugins",
      "hermes setup --portal",
      "hermes tools"
    ],
    "size": 7025
  },
  {
    "id": "l6",
    "level": 2,
    "title": "Configuración",
    "icon": "⚙️",
    "src": "website/docs/user-guide/configuration.md",
    "desc": "Domina el archivo config.yaml, las variables de entorno, la precedencia de configuración y la estructura de directorios.",
    "paragraphs": [
      "All settings are stored in the ~/.hermes/ directory for easy access.",
      "Run hermes setup --portal — one OAuth gets you a model provider and all four Tool Gateway tools without hand-editing YAML. Portal subscribers also get 10% off token-billed providers. See Nous Portal.",
      "The hermes config set command automatically routes values to the right file — API keys are saved to .env, everything else to config.yaml.",
      "Settings are resolved in this order (highest priority first):"
    ],
    "tips": [
      "The hermes config set command automatically routes values to the right file — API keys are saved to .env, everything else to config.yaml.",
      "Each auxiliary task has a configurable timeout (in seconds). Defaults: vision 120s, web_extract 360s, approval 30s, compression 120s. Increase these if you use slow local models for auxiliary tasks. Vision also has a separate download_timeout (default 30s) for the HTTP image download — increase this",
      "If you use Codex OAuth as your main model provider, vision works automatically — no extra configuration needed. Codex is included in the auto-detection chain for vision.",
      "Run hermes config to see your current auxiliary model settings. Overrides only show up when they differ from the defaults."
    ],
    "commands": [
      "hermes auth",
      "hermes chat --model anthropic/claude-sonnet-4",
      "hermes config",
      "hermes config migrate",
      "hermes config set",
      "hermes config set terminal.backend local",
      "hermes config show",
      "hermes cron edit",
      "hermes doctor",
      "hermes kanban specify <id>",
      "hermes model",
      "hermes plugins",
      "hermes sessions rename",
      "hermes setup --portal",
      "hermes tools"
    ],
    "size": 122785
  },
  {
    "id": "l7",
    "level": 2,
    "title": "Proveedores de IA",
    "icon": "🔌",
    "src": "website/docs/integrations/providers.md",
    "desc": "Conecta OpenRouter, OpenAI, Anthropic, Google, DeepSeek, xAI y proveedores self-hosted. Aprende sobre enrutamiento de modelos.",
    "paragraphs": [
      "This page covers setting up inference providers for Hermes Agent — from cloud APIs like OpenRouter and Anthropic, to self-hosted endpoints like Ollama and vLLM, to advanced routing and fallback configurations. You need at least one provider configured to use Hermes.",
      "You need at least one way to connect to an LLM. Use hermes model to switch providers and models interactively, or configure directly:",
      "For the official API-key path, see the dedicated Google Gemini guide.",
      "In the model: config section, you can use either default: or model: as the key name for your model ID. Both model: { default: my-model } and model: { model: my-model } work identically."
    ],
    "tips": [
      "/model custom (bare, no model name) queries your endpoint's /models API and auto-selects the model if exactly one is loaded. Useful for local servers running a single model.",
      "List available models with ollama list. Pull any model from the Ollama library with ollama pull <model>. Ollama handles GPU offloading automatically — no configuration needed for most setups.",
      "vLLM supports human-readable sizes: --max-model-len 64k (lowercase k = 1000, uppercase K = 1024).",
      "Download GGUF models from Hugging Face. Q4_K_M quantization offers the best balance of quality vs. memory usage.",
      "You can switch between providers at any time with hermes model — no restart required. Your conversation history, memory, and skills carry over regardless of which provider you use.",
      "Fallback is configured exclusively through config.yaml — or interactively via hermes fallback. For full details on when it triggers, how the chain advances, and how it interacts with auxiliary tasks and delegation, see Fallback Providers."
    ],
    "commands": [
      "hermes auth add anthropic --type oauth",
      "hermes auth add openai-codex",
      "hermes auth add xai-oauth",
      "hermes chat",
      "hermes chat --provider anthropic",
      "hermes chat --provider anthropic  # reads Claude Code credential files automatically",
      "hermes chat --provider anthropic --model claude-sonnet-4-6",
      "hermes doctor",
      "hermes fallback",
      "hermes migrate xai",
      "hermes model",
      "hermes model              # existing install — pick \"Nous Portal\" from the list",
      "hermes portal info",
      "hermes portal info        # inspect login + routing at any time",
      "hermes setup"
    ],
    "size": 71233
  },
  {
    "id": "l8",
    "level": 2,
    "title": "Sistema de Skills",
    "icon": "📚",
    "src": "website/docs/user-guide/features/skills.md",
    "desc": "La memoria procedimental de Hermes: crea, carga, mejora y comparte skills reutilizables. Formato SKILL.md y agentskills.io.",
    "paragraphs": [
      "Skills are on-demand knowledge documents the agent can load when needed. They follow a progressive disclosure pattern to minimize token usage and are compatible with the agentskills.io open standard.",
      "All skills live in ~/.hermes/skills/ — the primary directory and source of truth. On fresh install, bundled skills are copied from the repo. Hub-installed and agent-created skills also go here. The agent can modify or delete any skill.",
      "You can also point Hermes at external skill directories — additional folders scanned alongside the local one. See External Skill Directories below.",
      "- Official Optional Skills Catalog"
    ],
    "tips": [
      "The patch action is preferred for updates — it's more token-efficient than edit because only the changed text appears in the tool call."
    ],
    "commands": [
      "hermes -p coder skills reset <name>",
      "hermes bundles list",
      "hermes chat --toolsets skills -q \"Show me the axolotl skill\"",
      "hermes chat --toolsets skills -q \"What skills do you have?\"",
      "hermes config migrate",
      "hermes config show",
      "hermes profile create research --no-skills",
      "hermes setup",
      "hermes skills inspect ...",
      "hermes skills opt-in",
      "hermes skills opt-in --sync      # undo: remove the marker and re-seed now",
      "hermes skills opt-out",
      "hermes skills opt-out            # stop future seeding — nothing on disk is touched",
      "hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)",
      "hermes skills reset"
    ],
    "size": 42038
  },
  {
    "id": "l9",
    "level": 2,
    "title": "Herramientas y Toolsets",
    "icon": "🔧",
    "src": "website/docs/user-guide/features/tools.md",
    "desc": "Más de 60 herramientas integradas. Aprende a configurar toolsets por perfil y a usar backends de terminal.",
    "paragraphs": [
      "Tools are functions that extend the agent's capabilities. They're organized into logical toolsets that can be enabled or disabled per platform.",
      "Hermes ships with a broad built-in tool registry covering web search, browser automation, terminal execution, file editing, memory, delegation, scheduled tasks, Home Assistant, and more.",
      "Honcho cross-session memory is available as a memory provider plugin (plugins/memory/honcho/), not as a built-in toolset. See Plugins for installation.",
      "For the authoritative code-derived registry, see Built-in Tools Reference and Toolsets Reference."
    ],
    "tips": [],
    "commands": [
      "hermes chat --toolsets \"web,terminal\"",
      "hermes model",
      "hermes send",
      "hermes tools"
    ],
    "size": 7677
  },
  {
    "id": "l10",
    "level": 2,
    "title": "Sistema de Memoria",
    "icon": "🧠",
    "src": "website/docs/user-guide/features/memory.md",
    "desc": "Memoria persistente que crece entre sesiones. Guarda datos del usuario y notas propias con el sistema de dos objetivos.",
    "paragraphs": [
      "Hermes Agent has bounded, curated memory that persists across sessions. This lets it remember your preferences, your projects, your environment, and things it has learned.",
      "Both are stored in ~/.hermes/memories/ and are injected into the system prompt as a frozen snapshot at session start. The agent manages its own memory via the memory tool — it can add, replace, or remove entries.",
      "Character limits keep memory focused. Memory does not auto-compact: when a",
      "write would exceed the limit, the memory tool returns an error instead of"
    ],
    "tips": [],
    "commands": [],
    "size": 15253
  },
  {
    "id": "l11",
    "level": 2,
    "title": "Archivos de Contexto",
    "icon": "📄",
    "src": "website/docs/user-guide/features/context-files.md",
    "desc": "AGENTS.md, CLAUDE.md y .cursorrules: cómo dar contexto permanente a cada conversación en un proyecto.",
    "paragraphs": [
      "Hermes Agent automatically discovers and loads context files that shape how it behaves. Some are project-local and discovered from your working directory. SOUL.md is now global to the Hermes instance and is loaded from HERMES_HOME only.",
      "Only one project context type is loaded per session (first match wins): .hermes.md → AGENTS.md → CLAUDE.md → .cursorrules. SOUL.md is always loaded independently as the agent identity (slot #1).",
      "AGENTS.md is the primary project context file. It tells the agent how your project is structured, what conventions to follow, and any special instructions.",
      "At session start, Hermes loads the AGENTS.md from your working directory into the system prompt. As the agent navigates into subdirectories during the session (via read_file, terminal, search_files, etc.), it progressively discovers context files in those directories and injects them into the conversation at the moment they become relevant."
    ],
    "tips": [],
    "commands": [],
    "size": 9019
  },
  {
    "id": "l12",
    "level": 2,
    "title": "Personalidad (SOUL.md)",
    "icon": "🎭",
    "src": "website/docs/user-guide/features/personality.md",
    "desc": "Define la voz y comportamiento por defecto de Hermes con un archivo SOUL.md global.",
    "paragraphs": [
      "Hermes Agent's personality is fully customizable. SOUL.md is the primary identity — it's the first thing in the system prompt and defines who the agent is.",
      "- SOUL.md — a durable persona file that lives in HERMES_HOME and serves as the agent's identity (slot #1 in the system prompt)",
      "- built-in or custom /personality presets — session-level system-prompt overlays",
      "If you want to change who Hermes is — or replace it with an entirely different agent persona — edit SOUL.md."
    ],
    "tips": [],
    "commands": [],
    "size": 8152
  },
  {
    "id": "l13",
    "level": 2,
    "title": "Seguridad",
    "icon": "🔒",
    "src": "website/docs/user-guide/security.md",
    "desc": "Control de comandos peligrosos, autorización de usuarios, aislamiento con contenedores y seguridad en la pasarela de mensajería.",
    "paragraphs": [
      "Hermes Agent is designed with a defense-in-depth security model. This page covers every security boundary — from command approval to container isolation to user authorization on messaging platforms.",
      "1. User authorization — who can talk to the agent (allowlists, DM pairing)",
      "2. Dangerous command approval — human-in-the-loop for destructive operations",
      "3. File write safety — denylist and optional write sandbox for write_file/patch"
    ],
    "tips": [
      "Use hermes config edit to review or remove patterns from your permanent allowlist.",
      "For production gateway deployments, use docker, modal, or daytona backend to isolate agent commands from your host system. This eliminates the need for dangerous command approval entirely."
    ],
    "commands": [
      "hermes --yolo",
      "hermes chat --yolo",
      "hermes config edit",
      "hermes cron",
      "hermes doctor",
      "hermes pairing approve <platform> <code>",
      "hermes tools",
      "hermes update"
    ],
    "size": 38543
  },
  {
    "id": "l14",
    "level": 2,
    "title": "Búsqueda Web",
    "icon": "🌐",
    "src": "website/docs/user-guide/features/web-search.md",
    "desc": "Busca en la web, extrae contenido de páginas y procesa resultados con IA.",
    "paragraphs": [
      "Hermes Agent includes two model-callable web tools backed by multiple providers:",
      "- web_search — search the web and return ranked results",
      "- web_extract — fetch and extract readable content from one or more URLs",
      "Both are configured through a single backend selection. Providers are chosen via hermes tools or set directly in config.yaml."
    ],
    "tips": [],
    "commands": [
      "hermes auth add xai-oauth",
      "hermes model",
      "hermes setup",
      "hermes setup --portal",
      "hermes tools"
    ],
    "size": 15520
  },
  {
    "id": "l15",
    "level": 2,
    "title": "Navegador",
    "icon": "🖥️",
    "src": "website/docs/user-guide/features/browser.md",
    "desc": "Controla un navegador headless para interactuar con webs, hacer clics, rellenar formularios y grabar sesiones.",
    "paragraphs": [
      "Hermes Agent includes a full browser automation toolset with multiple backend options:",
      "- Browserbase cloud mode via Browserbase for managed cloud browsers and anti-bot tooling",
      "- Browser Use cloud mode via Browser Use as an alternative cloud browser provider",
      "- Firecrawl cloud mode via Firecrawl for cloud browsers with built-in scraping"
    ],
    "tips": [
      "To start a Chromium-family browser manually with CDP enabled, use a dedicated user-data-dir so the debug port actually comes up even if the browser is already running with your normal profile:\n\n``bash\n# Linux — Brave\nbrave-browser \\\n  --remote-debugging-port=9222 \\\n  --user-data-dir=$HOME/.hermes/ch",
      "For simple information retrieval, prefer web_search or web_extract — they are faster and cheaper. Use browser tools when you need to interact with a page (click buttons, fill forms, handle dynamic content)."
    ],
    "commands": [
      "hermes chat",
      "hermes config set toolsets '[\"hermes-cli\", \"browser\"]'",
      "hermes model",
      "hermes setup --portal",
      "hermes setup tools",
      "hermes setup tools → Browser Automation",
      "hermes tools"
    ],
    "size": 32363
  },
  {
    "id": "l16",
    "level": 3,
    "title": "MCP (Model Context Protocol)",
    "icon": "🔌",
    "src": "website/docs/user-guide/features/mcp.md",
    "desc": "Conecta servidores MCP para extender las capacidades de Hermes con herramientas externas de forma segura.",
    "paragraphs": [
      "MCP lets Hermes Agent connect to external tool servers so the agent can use tools that live outside Hermes itself — GitHub, databases, file systems, browser stacks, internal APIs, and more.",
      "If you have ever wanted Hermes to use a tool that already exists somewhere else, MCP is usually the cleanest way to do it.",
      "- Access to external tool ecosystems without writing a native Hermes tool first",
      "- Local stdio servers and remote HTTP MCP servers in the same config"
    ],
    "tips": [],
    "commands": [
      "hermes auth <provider>",
      "hermes mcp add",
      "hermes mcp add my-codex --preset codex",
      "hermes mcp configure <name>",
      "hermes mcp install <name>",
      "hermes mcp login",
      "hermes mcp login <server>",
      "hermes mcp login googledrive",
      "hermes mcp serve",
      "hermes send",
      "hermes update"
    ],
    "size": 30154
  },
  {
    "id": "l17",
    "level": 3,
    "title": "Delegación (Subagentes)",
    "icon": "👥",
    "src": "website/docs/user-guide/features/delegation.md",
    "desc": "Genera subagentes aislados para trabajo paralelo: tareas individuales o lotes de hasta 3 agentes simultáneos.",
    "paragraphs": [
      "The delegate_task tool spawns child AIAgent instances with isolated context, inherited tool access, and their own terminal sessions. Each child gets a fresh conversation and works independently — only its final summary enters the parent's context.",
      "Top-level model calls run in the background automatically. Hermes returns a handle immediately so the conversation can continue, then posts the result back as a new message. An orchestrator subagent waits for its own workers so it can synthesize their results before returning.",
      "Up to 3 concurrent subagents by default (configurable, no hard ceiling):",
      "Subagents start with a completely fresh conversation. They have zero knowledge of the parent's conversation history, prior tool calls, or anything discussed before delegation. The subagent's only context comes from the goal and context fields the parent agent populates when it calls delegate_task."
    ],
    "tips": [
      "The agent handles delegation automatically based on the task complexity. You don't need to explicitly ask it to delegate — it will do so when it makes sense."
    ],
    "commands": [],
    "size": 18023
  },
  {
    "id": "l18",
    "level": 3,
    "title": "Tareas Programadas (Cron)",
    "icon": "⏰",
    "src": "website/docs/user-guide/features/cron.md",
    "desc": "Automatiza tareas recurrentes: monitores, informes, pipelines de datos. Sintaxis cron completa y entrega a cualquier plataforma.",
    "paragraphs": [
      "Schedule tasks to run automatically with natural language or cron expressions. Hermes exposes cron management through a single cronjob tool with action-style operations instead of separate schedule/list/remove tools.",
      "- deliver results back to the origin chat, local files, or configured platform targets",
      "- run in fresh agent sessions with the normal static tool list",
      "- run in no-agent mode — a script on a schedule, its stdout delivered verbatim, zero LLM involvement (see the no-agent mode section below)"
    ],
    "tips": [
      "At creation, an unpinned job (one you don't give an explicit provider/model) follows the global default selected by hermes model — and Hermes snapshots that provider and model on the job. If the global default later changes, the job fails closed: it skips the run, makes no inference call, and sends ",
      "Hermes's own ~/.hermes/state.db is an internal schema that changes between releases. Don't query it from a pre-run gate — point at your own database or feed instead.",
      "Ask the agent to manage jobs through the cronjob tool, hermes cron edit, or /cron — not by patching jobs.json directly. Direct edits can fail silently when file write safety blocks the path (for example when HERMES_WRITE_SAFE_ROOT is set), and the file-mutation verifier footer is the authoritative s"
    ],
    "commands": [
      "hermes cron create \"every 1h\" \"Summarize new feed items\" --skill blogwatcher",
      "hermes cron create \"every 1h\" \"Use both skills and combine the result\" \\",
      "hermes cron create \"every 2h\" \"Check server status\"",
      "hermes cron edit",
      "hermes cron runs [job-id] --limit 20",
      "hermes model",
      "hermes setup --portal",
      "hermes tools"
    ],
    "size": 32622
  },
  {
    "id": "l19",
    "level": 3,
    "title": "Automatización con Cron",
    "icon": "🤖",
    "src": "website/docs/guides/automate-with-cron.md",
    "desc": "Patrones prácticos: monitor de cambios web, informes semanales, watchdog de repositorios y pipelines de datos.",
    "paragraphs": [
      "The daily briefing bot tutorial covers the basics. This guide goes further — five real-world automation patterns you can adapt for your own workflows.",
      "For the full feature reference, see Scheduled Tasks (Cron).",
      "Cron jobs run in fresh agent sessions with no memory of your current chat. Prompts must be completely self-contained — include everything the agent needs to know.",
      "- Recurring watchdog where the script already produces the exact message (memory alerts, disk alerts, heartbeats): use script-only cron jobs. Same scheduler, no LLM. You can ask Hermes to set one up for you in chat — the cronjob tool knows when to pick no_agent=True and writes the script for you."
    ],
    "tips": [],
    "commands": [
      "hermes send"
    ],
    "size": 10388
  },
  {
    "id": "l20",
    "level": 3,
    "title": "Nous Portal",
    "icon": "☁️",
    "src": "website/docs/integrations/nous-portal.md",
    "desc": "Una suscripción cubre 300+ modelos más Tool Gateway (búsqueda, imágenes, TTS, navegador). Configuración en un comando.",
    "paragraphs": [
      "Nous Portal is Nous Research's unified subscription gateway and the recommended way to run Hermes Agent. One OAuth login replaces the juggling act of separate accounts, API keys, and billing relationships across every model lab, search API, image generator, and browser provider you'd otherwise need to wire up by hand.",
      "If you only have time to set up one thing, set up this. The fastest path:",
      "That single command runs the Portal OAuth, lets you pick a Nous model, sets Nous as your inference provider in config.yaml, and turns on the Tool Gateway. You're ready to hermes chat immediately after.",
      "Don't have a subscription yet? portal.nousresearch.com/manage-subscription — sign up, then come back and run the command above."
    ],
    "tips": [],
    "commands": [
      "hermes auth add nous",
      "hermes auth add nous --type oauth",
      "hermes chat",
      "hermes model",
      "hermes portal",
      "hermes portal            # log in to Nous Portal + set it up (one-shot onboarding)",
      "hermes portal info",
      "hermes portal info       # login status, subscription info, model + gateway routing",
      "hermes portal open",
      "hermes portal open       # open the subscription management page in your browser",
      "hermes portal status     # alias for `portal info`",
      "hermes portal tools      # detailed Tool Gateway catalog with per-tool routing",
      "hermes setup --portal",
      "hermes tools"
    ],
    "size": 13745
  },
  {
    "id": "l21",
    "level": 3,
    "title": "Tool Gateway",
    "icon": "🌉",
    "src": "website/docs/user-guide/features/tool-gateway.md",
    "desc": "Acceso unificado a búsqueda web, generación de imágenes, TTS y navegador cloud mediante el Portal de Nous.",
    "paragraphs": [
      "The Tool Gateway is included with every paid Nous Portal subscription. It routes Hermes' tool calls — web search, image generation, text-to-speech, and cloud browser automation — through infrastructure Nous already runs, so you don't have to sign up with Firecrawl, FAL, OpenAI, Browser Use, or anyone else just to make your agent useful.",
      "All four are pay-as-you-use billed against your Nous subscription. Use any combination — run the gateway for web and images while keeping your own ElevenLabs key for TTS, or route everything through Nous.",
      "Building an agent that can actually *do things* means stitching together 5+ API subscriptions — each with their own signup, rate limits, billing, and quirks. The gateway collapses that into one account:",
      "- One signup. No Firecrawl, FAL, Browser Use, or OpenAI audio accounts to manage."
    ],
    "tips": [],
    "commands": [
      "hermes model",
      "hermes portal info",
      "hermes portal info        # Portal auth + Tool Gateway routing summary",
      "hermes portal tools       # Gateway catalog with current routing per tool",
      "hermes setup --portal",
      "hermes setup --portal     # Fresh install: Nous OAuth + set Nous as provider + turn on the Tool Gateway in one go",
      "hermes setup terminal",
      "hermes status             # Full system status (Tool Gateway is one section)",
      "hermes tools",
      "hermes tools              # Enable the gateway per-tool — pick \"Nous Subscription\" for any tool you want",
      "hermes tools          # Interactive picker for each tool category"
    ],
    "size": 9478
  },
  {
    "id": "l22",
    "level": 3,
    "title": "API Server",
    "icon": "🔗",
    "src": "website/docs/user-guide/features/api-server.md",
    "desc": "Expón Hermes como API REST: chat, ejecución de tareas, gestión de sesiones y trabajos programados.",
    "paragraphs": [
      "The API server exposes hermes-agent as an OpenAI-compatible HTTP endpoint. Any frontend that speaks the OpenAI format — Open WebUI, LobeChat, LibreChat, NextChat, ChatBox, and hundreds more — can connect to hermes-agent and use it as a backend.",
      "Your agent handles requests with its full toolset (terminal, file operations, web search, memory, skills) and returns the final response. When streaming, tool progress indicators appear inline so frontends can show what the agent is doing.",
      "Hermes itself needs a configured provider and tool backends for the API server to be useful. A Nous Portal subscription handles both — 300+ models plus web/image/TTS/browser via the Tool Gateway. Run hermes setup --portal once before starting the API server and frontends like Open WebUI or LobeChat get a fully tool-equipped backend.",
      "Point any OpenAI-compatible client at http://localhost:8642/v1:"
    ],
    "tips": [],
    "commands": [
      "hermes cron",
      "hermes gateway",
      "hermes setup --portal"
    ],
    "size": 21106
  },
  {
    "id": "l23",
    "level": 3,
    "title": "Subscription Proxy",
    "icon": "🔄",
    "src": "website/docs/user-guide/features/subscription-proxy.md",
    "desc": "Comparte tu suscripción del Portal de Nous con otras herramientas y clientes OpenAI-compatibles.",
    "paragraphs": [
      "The subscription proxy is a local HTTP server that lets external apps —",
      "OpenViking, Karakeep, Open WebUI, anything that speaks OpenAI-compatible",
      "chat completions — use your Hermes-managed provider subscription as their",
      "LLM endpoint. The proxy attaches the right credentials (refreshing them"
    ],
    "tips": [],
    "commands": [
      "hermes portal",
      "hermes proxy providers",
      "hermes proxy start",
      "hermes proxy status"
    ],
    "size": 6063
  },
  {
    "id": "l24",
    "level": 3,
    "title": "Web Dashboard",
    "icon": "📊",
    "src": "website/docs/user-guide/features/web-dashboard.md",
    "desc": "Interfaz web para gestionar Hermes: múltiples perfiles, monitoreo en tiempo real y control remoto.",
    "paragraphs": [
      "The web dashboard is a browser-based UI for managing your Hermes Agent installation. Instead of editing YAML files or running CLI commands, you can configure settings, manage API keys, and monitor sessions from a clean web interface.",
      "Hosted-mode auth uses Nous Portal OAuth; if you also want the dashboard to talk to a real backend, hermes setup --portal wires up the model and tool gateway too. See Nous Portal.",
      "This starts a local web server and opens http://127.0.0.1:9119 in your browser. The dashboard runs entirely on your machine — no data leaves localhost.",
      "The dashboard is a machine-level management surface: one server manages"
    ],
    "tips": [
      "Hosted-mode auth uses Nous Portal OAuth; if you also want the dashboard to talk to a real backend, hermes setup --portal wires up the model and tool gateway too. See Nous Portal.",
      "Config changes take effect on the next agent session or gateway restart. The web dashboard edits the same config.yaml file that hermes config set and the gateway read from."
    ],
    "commands": [
      "hermes --tui",
      "hermes -p <name> gateway …",
      "hermes config set",
      "hermes curator",
      "hermes dashboard",
      "hermes dashboard --host 0.0.0.0",
      "hermes dashboard --no-open",
      "hermes dashboard --port 8080",
      "hermes dashboard register",
      "hermes mcp",
      "hermes mcp catalog",
      "hermes mcp install",
      "hermes pairing",
      "hermes portal",
      "hermes profile use"
    ],
    "size": 69285
  },
  {
    "id": "l25",
    "level": 3,
    "title": "Plataformas de Mensajería",
    "icon": "💬",
    "src": "website/docs/user-guide/messaging/index.md",
    "desc": "Conecta Hermes a Telegram, Discord, Slack, WhatsApp, Signal, Email, SMS y 15+ plataformas más.",
    "paragraphs": [
      "Chatea con Hermes desde Telegram, Discord, Slack, WhatsApp, Signal, SMS, Email, Home Assistant, Mattermost, Matrix, DingTalk, Feishu/Lark, WeCom, Weixin, BlueBubbles (iMessage), QQ, Yuanbao, Microsoft Teams, LINE, ntfy, o tu navegador. La pasarela (gateway) es un único proceso en segundo plano que conecta todas tus plataformas configuradas.",
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
    ],
    "size": 3500
  },
  {
    "id": "l26",
    "level": 3,
    "title": "Referencia CLI",
    "icon": "📋",
    "src": "website/docs/reference/cli-commands.md",
    "desc": "Referencia completa de todos los comandos CLI: chat, model, gateway, skills, config, cron, tools y más.",
    "paragraphs": [
      "This page covers the terminal commands you run from your shell.",
      "For in-chat slash commands, see Slash Commands Reference.",
      "For programmatic callers (shell scripts, CI, cron, parent processes piping in a prompt), hermes -z is the purest one-shot entry point: single prompt in, final response text out, nothing else on stdout or stderr. No banner, no spinner, no tool previews, no Session: line — just the agent's final reply as plain text.",
      "Same agent, same tools, same skills — just strips every interactive / cosmetic layer. If you need tool output in the transcript too, use hermes chat -q instead; -z is explicitly for \"I only want the final answer\"."
    ],
    "tips": [
      "hermes dump is specifically designed for sharing. For interactive diagnostics, use hermes doctor. For a visual overview, use hermes status.",
      "The skills index and tool schemas scale with how many skills and tools you have\nenabled. To shrink the prompt, disable unused toolsets (hermes tools) or\nuninstall skills you don't need (hermes skills). Context files (AGENTS.md,\n.cursorrules) in your current directory also count toward the total."
    ],
    "commands": [
      "hermes --help",
      "hermes -p work chat -q \"Hello from work profile\"",
      "hermes -z",
      "hermes -z \"What's the capital of France?\"",
      "hermes -z \"…\" --provider openrouter --model openai/gpt-5.5",
      "hermes -z <prompt>",
      "hermes <provider>",
      "hermes [global-options] <command> [subcommand/options]",
      "hermes acp",
      "hermes auth",
      "hermes auth                                              # Interactive wizard",
      "hermes auth add anthropic --type oauth                   # Add OAuth credential",
      "hermes auth add openrouter --api-key sk-or-v1-xxx        # Add API key",
      "hermes auth list                                         # Show all pools",
      "hermes auth list openrouter                              # Show specific provider"
    ],
    "size": 84026
  },
  {
    "id": "l27",
    "level": 3,
    "title": "FAQ y Solución de Problemas",
    "icon": "❓",
    "src": "website/docs/reference/faq.md",
    "desc": "Preguntas frecuentes, resolución de problemas comunes, gestión de perfiles y patrones de trabajo.",
    "paragraphs": [
      "Quick answers and fixes for the most common questions and issues.",
      "Hermes Agent works with any OpenAI-compatible API. Supported providers include:",
      "- OpenRouter — access hundreds of models through one API key (recommended for flexibility)",
      "- Nous Portal — Nous Research's subscription gateway — 300+ models plus web/image/TTS/browser through one OAuth login (recommended for newcomers)"
    ],
    "tips": [
      "The installer adds ~/.local/bin to your PATH. If you use a non-standard shell config, add export PATH=\"$HOME/.local/bin:$PATH\" manually.",
      "This is working as intended — Hermes never silently runs destructive commands. The approval prompt shows you exactly what will execute.",
      "Use /compress regularly during long sessions. It summarizes the conversation history and reduces token usage significantly while preserving context.",
      "Skills with very long descriptions are truncated to 40 characters in the Telegram menu to stay within payload size limits. If skills aren't appearing, it may be a total payload size issue rather than the 100 command count limit — disabling unused skills helps with both.",
      "hermes backup produces a consistent snapshot even while Hermes is actively running. The restored archive excludes machine-local runtime files like gateway.pid and cron.pid."
    ],
    "commands": [
      "hermes --version",
      "hermes auth add anthropic",
      "hermes backup",
      "hermes chat",
      "hermes chat --model openrouter/meta-llama/llama-3.1-8b-instruct",
      "hermes chat --provider <alternative>",
      "hermes chat -t \"terminal\"",
      "hermes gateway install",
      "hermes gateway restart",
      "hermes gateway setup",
      "hermes gateway start",
      "hermes model",
      "hermes profile create newname --clone-all",
      "hermes profile export",
      "hermes setup"
    ],
    "size": 32219
  }
];

const GLOSSARY_DATA = [
  {
    "command": "hermes             # Start chatting!",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config check",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config get     # Inspect individual config values",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config migrate",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config set     # Set individual config values",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes config set OPENROUTER_API_KEY your_key",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes desktop",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes doctor",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes gateway setup  # Set up messaging platforms",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes model",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes model          # Choose your LLM provider and model",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes setup          # Or run the full setup wizard to configure everything at once",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes setup --portal",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes tools          # Configure which tools are enabled",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes update",
    "lesson": "l2",
    "lessonTitle": "Instalación"
  },
  {
    "command": "hermes            # classic CLI",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes --continue",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes --continue    # Resume the most recent session",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes --tui",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes --tui      # modern TUI (recommended)",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes -c            # Short form",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes config set OPENROUTER_API_KEY sk-or-...",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes config set model anthropic/claude-opus-4.6",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes config set terminal.backend docker",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes config set terminal.backend docker    # Docker isolation",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes config set terminal.backend ssh       # Remote server",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes gateway",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes gateway setup",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes gateway setup    # Interactive platform configuration",
    "lesson": "l3",
    "lessonTitle": "Quickstart — Primeros Pasos"
  },
  {
    "command": "hermes plugins",
    "lesson": "l5",
    "lessonTitle": "Resumen de Funcionalidades"
  },
  {
    "command": "hermes tools",
    "lesson": "l5",
    "lessonTitle": "Resumen de Funcionalidades"
  },
  {
    "command": "hermes auth",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes chat --model anthropic/claude-sonnet-4",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes config",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes config set",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes config set terminal.backend local",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes config show",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes cron edit",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes kanban specify <id>",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes sessions rename",
    "lesson": "l6",
    "lessonTitle": "Configuración"
  },
  {
    "command": "hermes auth add anthropic --type oauth",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes auth add openai-codex",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes auth add xai-oauth",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes chat",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes chat --provider anthropic",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes chat --provider anthropic  # reads Claude Code credential files automatically",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes chat --provider anthropic --model claude-sonnet-4-6",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes fallback",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes migrate xai",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes model              # existing install — pick \"Nous Portal\" from the list",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes portal info",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes portal info        # inspect login + routing at any time",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes setup",
    "lesson": "l7",
    "lessonTitle": "Proveedores de IA"
  },
  {
    "command": "hermes -p coder skills reset <name>",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes bundles list",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes chat --toolsets skills -q \"Show me the axolotl skill\"",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes chat --toolsets skills -q \"What skills do you have?\"",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes profile create research --no-skills",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills inspect ...",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills opt-in",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills opt-in --sync      # undo: remove the marker and re-seed now",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills opt-out",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills opt-out            # stop future seeding — nothing on disk is touched",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes skills reset",
    "lesson": "l8",
    "lessonTitle": "Sistema de Skills"
  },
  {
    "command": "hermes chat --toolsets \"web,terminal\"",
    "lesson": "l9",
    "lessonTitle": "Herramientas y Toolsets"
  },
  {
    "command": "hermes send",
    "lesson": "l9",
    "lessonTitle": "Herramientas y Toolsets"
  },
  {
    "command": "hermes --yolo",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes chat --yolo",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes config edit",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes cron",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes pairing approve <platform> <code>",
    "lesson": "l13",
    "lessonTitle": "Seguridad"
  },
  {
    "command": "hermes config set toolsets '[\"hermes-cli\", \"browser\"]'",
    "lesson": "l15",
    "lessonTitle": "Navegador"
  },
  {
    "command": "hermes setup tools",
    "lesson": "l15",
    "lessonTitle": "Navegador"
  },
  {
    "command": "hermes setup tools → Browser Automation",
    "lesson": "l15",
    "lessonTitle": "Navegador"
  },
  {
    "command": "hermes auth <provider>",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp add",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp add my-codex --preset codex",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp configure <name>",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp install <name>",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp login",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp login <server>",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp login googledrive",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes mcp serve",
    "lesson": "l16",
    "lessonTitle": "MCP (Model Context Protocol)"
  },
  {
    "command": "hermes cron create \"every 1h\" \"Summarize new feed items\" --skill blogwatcher",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron create \"every 1h\" \"Use both skills and combine the result\" \\",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron create \"every 2h\" \"Check server status\"",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes cron runs [job-id] --limit 20",
    "lesson": "l18",
    "lessonTitle": "Tareas Programadas (Cron)"
  },
  {
    "command": "hermes auth add nous",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes auth add nous --type oauth",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal            # log in to Nous Portal + set it up (one-shot onboarding)",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal info       # login status, subscription info, model + gateway routing",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal open",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal open       # open the subscription management page in your browser",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal status     # alias for `portal info`",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal tools      # detailed Tool Gateway catalog with per-tool routing",
    "lesson": "l20",
    "lessonTitle": "Nous Portal"
  },
  {
    "command": "hermes portal info        # Portal auth + Tool Gateway routing summary",
    "lesson": "l21",
    "lessonTitle": "Tool Gateway"
  },
  {
    "command": "hermes portal tools       # Gateway catalog with current routing per tool",
    "lesson": "l21",
    "lessonTitle": "Tool Gateway"
  },
  {
    "command": "hermes setup --portal     # Fresh install: Nous OAuth + set Nous as provider + turn on the Tool Gateway in one go",
    "lesson": "l21",
    "lessonTitle": "Tool Gateway"
  }
];

const LEVELS = [
  { id: 1, name: 'Principiante', icon: '🌱', desc: 'Fundamentos: instalación, primeros pasos y conceptos básicos' },
  { id: 2, name: 'Intermedio', icon: '⚡', desc: 'Configuración, providers, skills, herramientas y seguridad' },
  { id: 3, name: 'Avanzado', icon: '🚀', desc: 'MCP, delegación, cron, API, dashboard y despliegues' }
];
