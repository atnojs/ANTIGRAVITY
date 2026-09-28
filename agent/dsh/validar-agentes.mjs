/**
 * Valida los agentes generados ejecutando el MISMO descubrimiento que usa
 * DeepSeek Harness en produccion.
 *
 * No reimplementa la comprobacion de salud: importa `discoverPresets` del
 * paquete real del harness y escanea las mismas raices que escanea el roster
 * (la raiz de fabrica y la raiz de usuario). Un preset cuya composicion no
 * carga aparece con `broken`, que es exactamente lo que mostraria la GUI.
 *
 * Uso:  node validar-agentes.mjs
 */
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'

const PERFILES = 'C:/Users/atnojs/.dsh/profiles/node_modules'
const FABRICA = 'E:/herramientas/deepseek-harness/apps/cli/config/agent-presets'
const RAIZ_USUARIO = join(process.env.USERPROFILE ?? '', '.dsh', '.agent-presets')
const SKILLS_ROOT = 'E:/ANTIGRAVITY/.claude/skills'

const { discoverPresets } = await import(
  pathToFileURL(join(PERFILES, '@deepseek-ai/dsh-agent-presets/lib/index.js')).href
)

const encontrados = await discoverPresets([
  { path: FABRICA, trust: 'system' },
  { path: RAIZ_USUARIO, trust: 'user' },
])

console.log('RAICES')
console.log(`  fabrica : ${FABRICA}`)
console.log(`  usuario : ${RAIZ_USUARIO}`)
console.log('')
console.log('PRESETS DESCUBIERTOS')
console.log('  orden  id                    confianza  nombre')

let rotos = 0
for (const p of encontrados) {
  const orden = String(p.order ?? '-').padStart(5)
  const id = p.id.padEnd(21)
  const conf = (p.trust ?? '?').padEnd(10)
  const nombre = p.name ?? '(sin nombre)'
  console.log(`  ${orden}  ${id} ${conf} ${nombre}`)
  if (p.broken) {
    rotos++
    console.log(`         ROTO: ${p.broken}`)
  }
}

const mios = encontrados.filter(p => p.trust === 'user')
console.log('')
console.log(`Agentes de usuario : ${mios.length}`)
console.log(`Presets rotos      : ${rotos}`)

// La persona debe diferir de la de fabrica: si no, el agente no es un agente.
const PLANTILLA_PERSONA = 'You are a coding agent powered by the {{model}} model.'
console.log('')
console.log('COMPROBACIONES POR AGENTE')
let sinMeta = 0
for (const p of mios) {
  const texto = await readFile(p.path, 'utf8')
  const tienePersonaPropia = !texto.includes(PLANTILLA_PERSONA)
  const tieneSkills = texto.includes('customSkillDirs')
  // El harness degrada en silencio un preset.yml ilegible: el preset sigue
  // montando pero pierde nombre y orden. Por eso se comprueba aparte.
  const meta = p.name !== undefined && p.order !== undefined
  if (!meta) sinMeta++
  const marca = tienePersonaPropia && tieneSkills && meta ? 'ok' : 'REVISAR'
  console.log(`  [${marca}] ${p.id.padEnd(21)} persona_propia=${tienePersonaPropia} skills=${tieneSkills} metadatos=${meta}`)
}
if (sinMeta > 0) {
  console.log('')
  console.log(`ATENCION: ${sinMeta} preset(s) sin nombre/orden. Revisa preset.yml:`)
  console.log('  un ":" dentro de un valor sin comillas rompe el YAML y se pierde en silencio.')
  console.log('  Cita siempre los valores:  description: \'Texto: con dos puntos.\'')
}

// Un agente sin skills utiles no aporta nada: comprobamos la raiz expuesta.
console.log('')
console.log('SKILLS EXPUESTAS A LOS AGENTES')
const entradas = await readdir(SKILLS_ROOT, { withFileTypes: true })
let validas = 0
for (const e of entradas) {
  if (!e.isDirectory()) continue
  try {
    const bruto = await readFile(join(SKILLS_ROOT, e.name, 'SKILL.md'), 'utf8')
    const nombre = /^name:\s*(.+)$/m.exec(bruto)?.[1]?.trim()
    const descripcion = /^description:\s*(.+)$/m.exec(bruto)?.[1]?.trim()
    if (!nombre || !descripcion) { console.log(`  [aviso] ${e.name}: frontmatter incompleto`); continue }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nombre)) { console.log(`  [aviso] ${e.name}: name no es kebab-case -> ${nombre}`); continue }
    validas++
  } catch {
    console.log(`  [aviso] ${e.name}: sin SKILL.md`)
  }
}
console.log(`  Skills validas: ${validas}`)
