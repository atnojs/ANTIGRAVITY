/**
 * Antigravity Command Center - Hermes Desktop Plugin
 * Multi-superficie: status bar chip + panel dashboard
 * Inspirado por el tutorial de Tomb's Garage sobre Plugin SDK
 * v3 - Contador de imagenes por modelo + aviso de despliegue fallido
 */

import { atom, cn, haptic, host, useValue,
         StatusDot, Badge, Button, ScrollArea, Separator,
         GlyphSpinner, EmptyState, ErrorState,
         relativeTime, fmtDateTime, useToast
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'antigravity-command'

// ── Module-level ctx reference (set in register) ──
let pluginCtx = null

// ── Reactive state ──
const healthAtom = atom('checking')
const gitAtom = atom(null)
const lastCheckAtom = atom(null)
const lastGitAtom = atom(null)
const statsAtom = atom(null)          // { total, models: [{model,label,count}] }
const lastStatsAtom = atom(null)
const deployAlertAtom = atom(false)   // true si el despliegue (proxy) esta caido

// Helpers
function healthColor(h) {
  if (h === 'ok') return 'green'
  if (h === 'error') return 'red'
  if (h === 'offline') return 'grey'
  return 'yellow'
}

function healthLabel(h) {
  if (h === 'ok') return 'Proxy saludable'
  if (h === 'error') return 'Proxy no responde'
  if (h === 'checking') return 'Verificando...'
  return 'Sin conexion'
}

// ── API calls via backend ──
async function checkHealth() {
  if (!pluginCtx) return
  healthAtom.set('checking')
  try {
    const resp = await pluginCtx.rest('/health')
    const data = await resp.json()
    const ok = data.ok === true
    healthAtom.set(ok ? 'ok' : 'error')
    deployAlertAtom.set(!ok)
    // Aviso desktop si el despliegue esta caido
    if (!ok) {
      try { host.notify({ kind: 'error', message: '⚠️ Despliegue Hostinger caído: el proxy FLUX no responde' }) } catch (e) {}
    }
  } catch (e) {
    healthAtom.set('offline')
    deployAlertAtom.set(true)
    try { host.notify({ kind: 'error', message: '⚠️ Sin conexión con el despliegue en Hostinger' }) } catch (e) {}
  }
  lastCheckAtom.set(Date.now())
}

async function fetchGitStatus() {
  if (!pluginCtx) return
  try {
    const resp = await pluginCtx.rest('/git-status')
    const data = await resp.json()
    if (data.ok) gitAtom.set(data)
  } catch (e) {
    gitAtom.set(null)
  }
  lastGitAtom.set(Date.now())
}

async function fetchImageStats() {
  if (!pluginCtx) return
  try {
    const resp = await pluginCtx.rest('/image-stats')
    const data = await resp.json()
    if (data.ok) statsAtom.set(data)
  } catch (e) {
    statsAtom.set(null)
  }
  lastStatsAtom.set(Date.now())
}

// ── Status bar chip ──
function StatusChip() {
  const h = useValue(healthAtom)
  const last = useValue(lastCheckAtom)
  const alert = useValue(deployAlertAtom)

  return jsx('button', {
    className: cn(
      'inline-flex h-full items-center gap-1.5 px-1.5 text-[0.6875rem] transition-colors',
      'text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-foreground'
    ),
    type: 'button',
    title: last ? 'Antigravity - chequeado ' + relativeTime(last) : 'Antigravity Command',
    onClick: () => {
      haptic('tap')
      checkHealth(); fetchGitStatus(); fetchImageStats()
    },
    children: jsxs('span', {
      className: 'inline-flex items-center gap-1',
      children: [
        jsx(StatusDot, { color: healthColor(h), size: 'small' }),
        alert ? '⚠' : 'AG'
      ]
    })
  })
}

// ── Action button helper ──
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

// ── Image model stats section ──
function ImageStats() {
  const stats = useValue(statsAtom)
  const last = useValue(lastStatsAtom)

  if (!stats) {
    return jsx('div', {
      className: 'flex items-center gap-2 text-xs text-(--ui-text-quaternary) italic',
      children: jsxs('span', { children: [jsx(GlyphSpinner, { size: 'small' }), ' Cargando estadísticas...'] })
    })
  }

  if (stats.total === 0) {
    return jsx('div', {
      className: 'text-xs text-(--ui-text-quaternary) italic',
      children: 'Aún no hay generaciones registradas.'
    })
  }

  return jsxs('div', {
    className: 'flex flex-col gap-1.5',
    children: [
      jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          jsx('span', { className: 'text-(--ui-text-secondary)', children: 'Total: ' + stats.total }),
          last ? jsx('span', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: 'Actualizado ' + relativeTime(last) }) : null
        ]
      }),
      ...stats.models.map((m) =>
        jsxs('div', {
          className: 'flex items-center justify-between px-2 py-1 rounded bg-(--ui-bg-subtle)',
          children: [
            jsx('span', { className: 'text-xs text-(--ui-text-primary)', children: m.label }),
            jsx(Badge, { variant: 'info', children: String(m.count) })
          ]
        })
      )
    ]
  })
}

// ── Dashboard pane ──
function Dashboard() {
  const h = useValue(healthAtom)
  const git = useValue(gitAtom)
  const last = useValue(lastCheckAtom)
  const lastGit = useValue(lastGitAtom)
  const alert = useValue(deployAlertAtom)

  return jsxs('div', {
    className: 'flex h-full flex-col bg-(--ui-bg) text-sm',
    children: [
      // Header
      jsx('div', {
        className: 'flex items-center justify-between px-3 py-2 border-b border-(--ui-stroke-secondary)',
        children: jsxs('div', {
          className: 'flex items-center gap-2',
          children: [
            jsx('span', { className: 'font-semibold text-(--ui-text-primary)', children: 'Antigravity Command' }),
            jsx(StatusDot, { color: healthColor(h), size: 'small' })
          ]
        })
      }),

      // Aviso de despliegue caido
      alert ? jsx('div', {
        className: 'mx-3 mt-3 px-3 py-2 rounded border border-(--ui-danger) bg-(--ui-danger-subtle) text-(--ui-danger) text-xs flex items-center gap-2',
        children: jsxs('span', { children: ['⚠️ ', 'El despliegue en Hostinger no responde. Revisa el servidor.'] })
      }) : null,

      jsx(ScrollArea, {
        className: 'flex-1',
        children: jsxs('div', {
          className: 'flex flex-col gap-3 p-3',
          children: [

            // ── Deployment section ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider', children: 'Despliegue Hostinger' }),
                jsx('div', {
                  className: 'flex items-center gap-2 px-2.5 py-2 rounded border border-(--ui-stroke-secondary)',
                  children: jsxs('div', {
                    className: 'flex items-center gap-2',
                    children: [
                      jsx(StatusDot, { color: healthColor(h), size: 'small' }),
                      jsx('span', { className: 'text-xs text-(--ui-text-secondary)', children: healthLabel(h) })
                    ]
                  })
                }),
                last ? jsx('div', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: 'Chequeado ' + relativeTime(last) }) : null
              ]
            }),

            jsx(Separator, {}),

            // ── Imagenes por modelo ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider', children: 'Imágenes por modelo' }),
                jsx(ImageStats, {})
              ]
            }),

            jsx(Separator, {}),

            // ── Git section ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider', children: 'Git' }),
                git ? jsxs('div', {
                  className: 'flex flex-col gap-1 text-xs',
                  children: [
                    jsx('div', { className: 'text-(--ui-text-secondary)', children: 'Rama: ' + git.branch }),
                    jsx('div', { className: 'text-(--ui-text-tertiary) truncate', children: git.commit ? git.commit.slice(0, 60) : 'sin commits' }),
                    git.author ? jsx('div', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: git.author + ' - ' + (git.relative_date || '') }) : null,
                    git.dirty ? jsx(Badge, { variant: 'warning', children: git.uncommitted + ' cambios sin commit' }) : jsx(Badge, { variant: 'success', children: 'Todo limpio' })
                  ]
                }) : jsx('div', {
                  className: 'flex items-center gap-2 text-xs text-(--ui-text-quaternary) italic',
                  children: jsxs('span', { children: [jsx(GlyphSpinner, { size: 'small' }), ' Cargando estado git...'] })
                }),
                lastGit ? jsx('div', { className: 'text-[0.65rem] text-(--ui-text-quaternary)', children: 'Actualizado ' + relativeTime(lastGit) }) : null
              ]
            }),

            jsx(Separator, {}),

            // ── Quick actions ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider', children: 'Acciones rapidas' }),
                jsxs('div', {
                  className: 'flex flex-col gap-1',
                  children: [
                    jsx(ActionBtn, { label: 'Abrir Outfit', url: 'https://atnojs.es/apps/outfit' }),
                    jsx(ActionBtn, { label: 'Abrir Imagenes IA', url: 'https://atnojs.es/apps/imagenes_ia/editar_generar (COPIA)' }),
                    jsx(ActionBtn, { label: 'Refrescar Estado', action: () => { checkHealth(); fetchGitStatus(); fetchImageStats() } })
                  ]
                })
              ]
            }),

            jsx(Separator, {}),

            // ── Environment ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider', children: 'Entorno' }),
                jsxs('div', {
                  className: 'flex flex-col gap-0.5 text-xs text-(--ui-text-secondary)',
                  children: [
                    jsx('div', { children: 'Perfil: ' + host.state.profile.get() }),
                    jsx('div', { children: 'Gateway: ' + host.state.gateway.get() }),
                    jsx('div', { children: 'Modelo: ' + host.state.model.get() })
                  ]
                })
              ]
            })

          ]
        })
      })
    ]
  })
}

// ── Plugin export ──
let healthTimer = null
let gitTimer = null
let statsTimer = null

export default {
  id: ID,
  name: 'Antigravity Command',

  register(ctx) {
    pluginCtx = ctx

    ctx.register({ id: 'status', area: 'statusBar.right', order: 100, render: jsx(StatusChip, {}) })
    ctx.register({ id: 'dashboard', area: 'panes', title: 'Antigravity', data: { placement: 'right', width: '320px' }, render: jsx(Dashboard, {}) })

    checkHealth()
    fetchGitStatus()
    fetchImageStats()

    healthTimer = setInterval(checkHealth, 5 * 60 * 1000)
    gitTimer = setInterval(fetchGitStatus, 2 * 60 * 1000)
    statsTimer = setInterval(fetchImageStats, 5 * 60 * 1000)

    return () => {
      if (healthTimer) clearInterval(healthTimer)
      if (gitTimer) clearInterval(gitTimer)
      if (statsTimer) clearInterval(statsTimer)
      pluginCtx = null
    }
  }
}
