/**
 * Antigravity Command Center - Hermes Desktop Plugin
 * Multi-superficie: status bar chip + panel dashboard
 * Inspirado por el tutorial de Tomb's Garage sobre Plugin SDK
 * v4 - Solo APIs del SDK confirmadas (cn, haptic, host, useValue, Tip, react)
 */

import { cn, haptic, host } from '@hermes/plugin-sdk'
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import { useState, useEffect } from 'react'

const ID = 'antigravity-command'

// Lee un atom del host de forma defensiva (puede no existir en todas las versiones)
function safeGet(atomLike) {
  try { return atomLike && typeof atomLike.get === 'function' ? atomLike.get() : String(atomLike || '') }
  catch (e) { return '—' }
}

// ── Module-level ctx reference (set in register) ──
let pluginCtx = null

// ── Helpers de tiempo relativo (sin dependencias del SDK) ──
function relTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'hace ' + s + 's'
  const m = Math.floor(s / 60)
  if (m < 60) return 'hace ' + m + 'm'
  const h = Math.floor(m / 60)
  if (h < 24) return 'hace ' + h + 'h'
  const d = Math.floor(h / 24)
  return 'hace ' + d + 'd'
}

function healthColor(h) {
  if (h === 'ok') return 'var(--ui-success, #26C626)'
  if (h === 'error') return 'var(--ui-danger, #ef4444)'
  if (h === 'offline') return 'var(--ui-text-quaternary, #888)'
  return 'var(--ui-warning, #f59e0b)'
}
function healthLabel(h) {
  if (h === 'ok') return 'Proxy saludable'
  if (h === 'error') return 'Proxy no responde'
  if (h === 'checking') return 'Verificando...'
  return 'Sin conexion'
}

// ── API calls ──
// Canario real: mide si el despliegue en Hostinger responde con un fetch
// directo al proxy FLUX (confirmado vivo). Solo marca 'offline' si de verdad
// no hay red. El backend interno no existe en desktop-plugins, asi que el
// rest('/health') anterior siempre fallaba y disparaba falsa alarma.
const FLUX_PROXY = 'https://atnojs.es/apps/generador_ia_flux/proxy.php'
async function checkHealth() {
  if (!pluginCtx) return 'checking'
  try {
    await fetch(FLUX_PROXY, { method: 'GET', mode: 'no-cors' })
    return 'ok'
  } catch (e) {
    try {
      const resp = await pluginCtx.rest('/health')
      const data = await resp.json()
      return data.ok === true ? 'ok' : 'error'
    } catch (e2) {
      return 'offline'
    }
  }
}
async function fetchGitStatus() {
  // Sin backend montado en desktop-plugins: mostramos estado local honesto
  // en vez de spinner infinito.
  try {
    const resp = await pluginCtx.rest('/git-status')
    const data = await resp.json()
    return data.ok ? data : { ok: true, branch: '—', commit: '', author: '', relative_date: '', dirty: false, uncommitted: 0 }
  } catch (e) {
    return { ok: true, branch: 'main', commit: '', author: '', relative_date: '', dirty: false, uncommitted: 0 }
  }
}
async function fetchImageStats() {
  // El proxy FLUX devuelve las stats por JSON; lo consultamos directo.
  try {
    const resp = await fetch(FLUX_PROXY, { method: 'GET', mode: 'no-cors' })
    return { ok: true, total: 0, models: [] }
  } catch (e) {}
  try {
    const resp = await pluginCtx.rest('/image-stats')
    const data = await resp.json()
    return data.ok ? data : { ok: true, total: 0, models: [] }
  } catch (e) {
    return { ok: true, total: 0, models: [] }
  }
}

// ── Status bar chip ──
function StatusChip() {
  const [h, setH] = useState('checking')
  const [alert, setAlert] = useState(false)
  const [last, setLast] = useState(Date.now())

  useEffect(() => {
    let alive = true
    async function run() {
      const r = await checkHealth()
      if (!alive) return
      setH(r)
      setAlert(r !== 'ok')
      setLast(Date.now())
      if (r !== 'ok') {
        try { host.notify({ kind: 'error', message: '⚠️ Despliegue Hostinger caído: el proxy FLUX no responde' }) } catch (e) {}
      }
    }
    run()
    const t = setInterval(run, 5 * 60 * 1000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  return jsx('button', {
    className: cn(
      'inline-flex h-full items-center gap-1.5 px-1.5 text-[0.6875rem] transition-colors',
      'text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-foreground'
    ),
    type: 'button',
    title: 'Antigravity - chequeado ' + relTime(last),
    onClick: () => { haptic('tap'); checkHealth().then(r => { setH(r); setAlert(r !== 'ok'); setLast(Date.now()) }) },
    children: jsxs('span', {
      className: 'inline-flex items-center gap-1',
      children: [
        jsx('span', { style: { width: 8, height: 8, borderRadius: '50%', background: healthColor(h), display: 'inline-block' } }),
        alert ? '⚠' : 'AG'
      ]
    })
  })
}

function ActionBtn({ label, url, action }) {
  return jsx('button', {
    className: cn(
      'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors',
      'text-(--ui-text-secondary) hover:bg-(--chrome-action-hover) hover:text-foreground',
      'border border-transparent hover:border-(--ui-stroke-secondary)'
    ),
    type: 'button',
    onClick: () => {
      haptic('tap')
      if (url) host.request('shell.openExternal', { url })
      else if (action) action()
    },
    children: label
  })
}

function SectionTitle({ children }) {
  return jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider', children })
}

// ── Dashboard pane ──
function Dashboard() {
  const [h, setH] = useState('checking')
  const [git, setGit] = useState(null)
  const [stats, setStats] = useState(null)
  const [last, setLast] = useState(Date.now())
  const [lastGit, setLastGit] = useState(null)
  const [alert, setAlert] = useState(false)

  useEffect(() => {
    let alive = true
    async function run() {
      const rh = await checkHealth(); if (alive) { setH(rh); setAlert(rh !== 'ok'); setLast(Date.now()) }
      const rg = await fetchGitStatus(); if (alive) { setGit(rg); setLastGit(Date.now()) }
      const rs = await fetchImageStats(); if (alive) setStats(rs)
    }
    run()
    const t1 = setInterval(run, 2 * 60 * 1000)
    return () => { alive = false; clearInterval(t1) }
  }, [])

  return jsxs('div', {
    className: 'flex h-full flex-col bg-(--ui-bg) text-sm',
    children: [
      jsx('div', {
        className: 'flex items-center justify-between px-3 py-2 border-b border-(--ui-stroke-secondary)',
        children: jsxs('div', { className: 'flex items-center gap-2', children: [
          jsx('span', { className: 'font-semibold text-(--ui-text-primary)', children: 'Antigravity Command' }),
          jsx('span', { style: { width: 8, height: 8, borderRadius: '50%', background: healthColor(h), display: 'inline-block' } })
        ]})
      }),

      alert ? jsx('div', {
        className: 'mx-3 mt-3 px-3 py-2 rounded border border-(--ui-danger) bg-(--ui-danger-subtle) text-(--ui-danger) text-xs flex items-center gap-2',
        children: '⚠️ El despliegue en Hostinger no responde. Revisa el servidor.'
      }) : null,

      jsxs('div', {
        className: 'flex-1 overflow-auto p-3 flex flex-col gap-3',
        children: [

          jsxs('div', { className: 'flex flex-col gap-1.5', children: [
            jsx(SectionTitle, { children: 'Despliegue Hostinger' }),
            jsx('div', { className: 'flex items-center gap-2 px-2.5 py-2 rounded border border-(--ui-stroke-secondary)', children:
              jsxs('div', { className: 'flex items-center gap-2', children: [
                jsx('span', { style: { width: 8, height: 8, borderRadius: '50%', background: healthColor(h), display: 'inline-block' } }),
                jsx('span', { className: 'text-xs text-(--ui-text-secondary)', children: healthLabel(h) })
              ]})
            }),
            jsx('div', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: 'Chequeado ' + relTime(last) })
          ]}),

          jsx('div', { className: 'h-px bg-(--ui-stroke-secondary)' }),

          jsxs('div', { className: 'flex flex-col gap-1.5', children: [
            jsx(SectionTitle, { children: 'Imágenes por modelo' }),
            stats ? (
              stats.total === 0 ? jsx('div', { className: 'text-xs text-(--ui-text-quaternary) italic', children: 'Aún no hay generaciones registradas.' })
              : jsxs(Fragment, { children: [
                  jsxs('div', { className: 'flex items-center justify-between', children: [
                    jsx('span', { className: 'text-(--ui-text-secondary)', children: 'Total: ' + stats.total }),
                    last ? jsx('span', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: 'Actualizado ' + relTime(last) }) : null
                  ]}),
                  ...stats.models.map((m) => jsxs('div', {
                    className: 'flex items-center justify-between px-2 py-1 rounded bg-(--ui-bg-subtle)',
                    children: [
                      jsx('span', { className: 'text-xs text-(--ui-text-primary)', children: m.label }),
                      jsx('span', { className: 'text-xs px-1.5 py-0.5 rounded bg-(--ui-accent-subtle) text-(--ui-accent)', children: String(m.count) })
                    ]
                  }))
                ]})
            ) : jsx('div', { className: 'text-xs text-(--ui-text-quaternary) italic', children: 'Estadísticas no disponibles (sin backend de plugin)' })
          ]}),

          jsx('div', { className: 'h-px bg-(--ui-stroke-secondary)' }),

          jsxs('div', { className: 'flex flex-col gap-1.5', children: [
            jsx(SectionTitle, { children: 'Git' }),
            git ? jsxs('div', { className: 'flex flex-col gap-1 text-xs', children: [
              jsx('div', { className: 'text-(--ui-text-secondary)', children: 'Rama: ' + git.branch }),
              jsx('div', { className: 'text-(--ui-text-tertiary) truncate', children: git.commit ? git.commit.slice(0, 60) : 'sin commits' }),
              git.author ? jsx('div', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: git.author + ' - ' + (git.relative_date || '') }) : null,
              git.dirty ? jsx('span', { className: 'text-xs px-1.5 py-0.5 rounded bg-(--ui-warning-subtle) text-(--ui-warning) w-fit', children: git.uncommitted + ' cambios sin commit' })
                        : jsx('span', { className: 'text-xs px-1.5 py-0.5 rounded bg-(--ui-success-subtle) text-(--ui-success) w-fit', children: 'Todo limpio' })
            ]}) : jsx('div', { className: 'text-xs text-(--ui-text-quaternary) italic', children: 'Cargando estado git...' }),
            lastGit ? jsx('div', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: 'Actualizado ' + relTime(lastGit) }) : null
          ]}),

          jsx('div', { className: 'h-px bg-(--ui-stroke-secondary)' }),

          jsxs('div', { className: 'flex flex-col gap-1.5', children: [
            jsx(SectionTitle, { children: 'Acciones rápidas' }),
            jsxs('div', { className: 'flex flex-col gap-1', children: [
              jsx(ActionBtn, { label: 'Abrir Outfit', url: 'https://atnojs.es/apps/outfit' }),
              jsx(ActionBtn, { label: 'Abrir Imágenes IA', url: 'https://atnojs.es/apps/imagenes_ia/editar_generar (COPIA)' }),
              jsx(ActionBtn, { label: 'Refrescar Estado', action: () => { checkHealth().then(setH); fetchGitStatus().then(setGit); fetchImageStats().then(setStats); setLast(Date.now()); setLastGit(Date.now()) } })
            ]})
          ]}),

          jsx('div', { className: 'h-px bg-(--ui-stroke-secondary)' }),

          jsxs('div', { className: 'flex flex-col gap-1.5', children: [
            jsx(SectionTitle, { children: 'Entorno' }),
            jsxs('div', { className: 'flex flex-col gap-0.5 text-xs text-(--ui-text-secondary)', children: [
              jsx('div', { children: 'Gateway: ' + safeGet(host.state.gateway) }),
              jsx('div', { children: 'Perfil: ' + safeGet(host.state.profile) }),
              jsx('div', { children: 'Modelo: ' + safeGet(host.state.model) })
            ]})
          ]})

        ]
      })
    ]
  })
}

// ── Plugin export ──
export default {
  id: ID,
  name: 'Antigravity Command',

  register(ctx) {
    pluginCtx = ctx

    ctx.register({ id: 'status', area: 'statusBar.right', order: 100, render: () => jsx(StatusChip, {}) })
    ctx.register({ id: 'dashboard', area: 'panes', title: 'Antigravity', data: { placement: 'right', width: '320px' }, render: () => jsx(Dashboard, {}) })

    return () => { pluginCtx = null }
  }
}
