#!/usr/bin/env node
/**
 * Publica el build de Unified Studio en la carpeta pública de la app.
 *
 * Uso:
 *   npm run publish:app          # usa el dist/ ya compilado
 *   npm run publish:app -- --build   # compila con Vite y después publica
 *
 * Qué hace:
 *  1. Lee dist/index.dev.html (salida de Vite con assets ya hasheados).
 *  2. Copia el JS y el CSS a assets/app.<AAAAAMMDD-HHMM>.js|css (nombre versionado:
 *     la CDN de Hostinger cachea por RUTA, así que hay que renombrar al cambiar).
 *  3. Normaliza la ruta del proxy a "proxy.php" (relativa a la app). Si el bundle
 *     trae una ruta absoluta de otra app, se corrige aquí y se avisa.
 *  4. Reescribe index.html (página de producción) para que apunte a los assets nuevos.
 *
 * No borra los assets antiguos: los navegadores con index.html cacheado los siguen
 * pidiendo. Se limpian a mano cuando ya no queden HTML en caché.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(appDir, 'dist')
const distHtml = path.join(distDir, 'index.dev.html')
const prodHtmlPath = path.join(appDir, 'index.html')
const assetsDir = path.join(appDir, 'assets')
const PROXY_ABSOLUTA = '/apps/generar_editar/proxy.php'

const build = process.argv.includes('--build')

function stamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`
  )
}

function fail(msg) {
  console.error(`✖ ${msg}`)
  process.exit(1)
}

if (build) {
  console.log('▸ Compilando con Vite…')
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
    cwd: appDir,
    stdio: 'inherit',
  })
}

if (!fs.existsSync(distHtml)) fail('No existe dist/index.dev.html. Ejecuta `npm run build` o `npm run publish:app -- --build`.')

const html = fs.readFileSync(distHtml, 'utf8')
const jsMatch = html.match(/(?:\.\/|\/apps\/unified-app\/|\)?assets\/)assets\/index-[\w-]+\.js|assets\/index-[\w-]+\.js/)
const cssMatch = html.match(/assets\/index-[\w-]+\.css/)

// Fallback: la referencia siempre contiene "assets/index-<hash>.js|css".
const jsRef = (jsMatch && jsMatch[0].slice(jsMatch[0].indexOf('assets/'))) || (html.match(/assets\/index-[\w-]+\.js/) || [])[0]
const cssRef = (cssMatch && cssMatch[0]) || null
if (!jsRef) fail('No encuentro la referencia al JS compilado en dist/index.dev.html.')
if (!cssRef) fail('No encuentro la referencia al CSS compilado en dist/index.dev.html.')

const stampStr = stamp()
const jsName = `app.${stampStr}.js`
const cssName = `app.${stampStr}.css`

let js = fs.readFileSync(path.join(distDir, jsRef), 'utf8')
const css = fs.readFileSync(path.join(distDir, cssRef), 'utf8')

const usosProxy = js.split(PROXY_ABSOLUTA).length - 1
if (usosProxy > 0) {
  js = js.split(PROXY_ABSOLUTA).join('proxy.php')
  console.log(`▸ Ruta del proxy normalizada (${usosProxy} referencia/s): ${PROXY_ABSOLUTA} → proxy.php`)
}
const absolutasRestantes = js.match(/\/apps\/[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.(?:php|json)/g)
if (absolutasRestantes) {
  fail(`El bundle aún tiene rutas absolutas a otras apps: ${[...new Set(absolutasRestantes)].join(', ')}`)
}

fs.mkdirSync(assetsDir, { recursive: true })
fs.writeFileSync(path.join(assetsDir, jsName), js, 'utf8')
fs.writeFileSync(path.join(assetsDir, cssName), css, 'utf8')

let prod = fs.readFileSync(prodHtmlPath, 'utf8')
if (!/assets\/app\.[\w-]+\.js/.test(prod) || !/assets\/app\.[\w-]+\.css/.test(prod)) {
  fail('index.html no tiene las referencias versionadas a assets/app.<fecha>.js|css.')
}
const anteriorJs = (prod.match(/assets\/app\.[\w-]+\.js/) || [])[0]
const anteriorCss = (prod.match(/assets\/app\.[\w-]+\.css/) || [])[0]
prod = prod.replace(/assets\/app\.[\w-]+\.js/g, `assets/${jsName}`).replace(/assets\/app\.[\w-]+\.css/g, `assets/${cssName}`)
fs.writeFileSync(prodHtmlPath, prod, 'utf8')

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log('✔ Publicado:')
console.log(`  assets/${jsName}   (${kb(Buffer.byteLength(js))})   ← antes ${anteriorJs}`)
console.log(`  assets/${cssName}  (${kb(Buffer.byteLength(css))})  ← antes ${anteriorCss}`)
console.log('  index.html actualizado')
console.log('\nRecuerda: los assets antiguos NO se borran (caché de la CDN por ruta).')
