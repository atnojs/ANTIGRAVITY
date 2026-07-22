/**
 * Hermes Academy — Configuración de plataformas.
 */
const PLATFORMS = {
  hermes: {
    id: 'hermes',
    name: 'Hermes Agent',
    icon: '🧠',
    desc: 'Agente autónomo de Nous Research con bucle de aprendizaje cerrado, skills auto-mejorables y memoria persistente.',
    color: '#00D0D0',
    url: 'https://hermes-agent.nousresearch.com/docs',
    dataVar: 'LESSONS_HERMES',
    glossaryVar: 'GLOSSARY_HERMES'
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    icon: '🤖',
    desc: 'Agente de IA de OpenAI con CLI, IDE integrado, proyectos, hooks, MCP y automatizaciones.',
    color: '#10a37f',
    url: 'https://learn.chatgpt.com/docs',
    dataVar: 'LESSONS_CODEX',
    glossaryVar: 'GLOSSARY_CODEX'
  },
  claude: {
    id: 'claude',
    name: 'Claude Code',
    icon: '💎',
    desc: 'Agente de codificación de Anthropic con memoria, skills, subagentes, MCP, hooks y tareas programadas.',
    color: '#d97706',
    url: 'https://code.claude.com/docs',
    dataVar: 'LESSONS_CLAUDE',
    glossaryVar: 'GLOSSARY_CLAUDE'
  },
  antigravity: {
    id: 'antigravity',
    name: 'Antigravity',
    icon: '🌌',
    desc: 'Entorno de desarrollo de Google con editor integrado, proyectos, artifacts, skills, MCP y sidecars.',
    color: '#4285f4',
    url: 'https://antigravity.google/docs',
    dataVar: 'LESSONS_ANTIGRAVITY',
    glossaryVar: 'GLOSSARY_ANTIGRAVITY'
  }
};

const LEVELS = [
  { id: 1, name: 'Principiante', icon: '🌱', desc: 'Fundamentos: instalación, primeros pasos y conceptos básicos' },
  { id: 2, name: 'Intermedio', icon: '⚡', desc: 'Configuración, herramientas, seguridad y flujos de trabajo' },
  { id: 3, name: 'Avanzado', icon: '🚀', desc: 'MCP, delegación, hooks, cron, API y despliegues' }
];
