/**
 * Antigravity Command Center - Hermes Desktop Plugin
 * Multi-superficie: status bar chip + panel dashboard
 * Inspirado por el tutorial de Tomb's Garage sobre Plugin SDK
 * v2 - Con backend Python para git status y health checks
 */

import { atom, cn, computed, haptic, host, useValue,
         StatusDot, Badge, Button, ScrollArea, Separator,
         GlyphSpinner, EmptyState, ErrorState,
         relativeTime, fmtDateTime
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
    healthAtom.set(data.ok ? 'ok' : 'error')
  } catch (e) {
    healthAtom.set('offline')
  }
  lastCheckAtom.set(Date.now())
}

async function fetchGitStatus() {
  if (!pluginCtx) return
  try {
    const resp = await pluginCtx.rest('/git-status')
    const data = await resp.json()
    if (data.ok) {
      gitAtom.set(data)
    }
  } catch (e) {
    gitAtom.set(null)
  }
  lastGitAtom.set(Date.now())
}

// ── Status bar chip ──
function StatusChip() {
  const h = useValue(healthAtom)
  const last = useValue(lastCheckAtom)

  return jsx('button', {
    className: cn(
      'inline-flex h-full items-center gap-1.5 px-1.5 text-[0.6875rem] transition-colors',
      'text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-foreground'
    ),
    type: 'button',
    title: last ? 'Antigravity - chequeado ' + relativeTime(last) : 'Antigravity Command',
    onClick: () => {
      haptic('tap')
      checkHealth()
      fetchGitStatus()
    },
    children: jsxs('span', {
      className: 'inline-flex items-center gap-1',
      children: [
        jsx(StatusDot, { color: healthColor(h), size: 'small' }),
        'AG'
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

// ── Dashboard pane ──
function Dashboard() {
  const h = useValue(healthAtom)
  const git = useValue(gitAtom)
  const last = useValue(lastCheckAtom)
  const lastGit = useValue(lastGitAtom)

  return jsxs('div', {
    className: 'flex h-full flex-col bg-(--ui-bg) text-sm',
    children: [
      // Header
      jsx('div', {
        className: 'flex items-center justify-between px-3 py-2 border-b border-(--ui-stroke-secondary)',
        children: jsxs('div', {
          className: 'flex items-center gap-2',
          children: [
            jsx('span', {
              className: 'font-semibold text-(--ui-text-primary)',
              children: 'Antigravity Command'
            }),
            jsx(StatusDot, { color: healthColor(h), size: 'small' })
          ]
        })
      }),

      jsx(ScrollArea, {
        className: 'flex-1',
        children: jsxs('div', {
          className: 'flex flex-col gap-3 p-3',
          children: [

            // ── Deployment section ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', {
                  className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider',
                  children: 'Despliegue Hostinger'
                }),
                jsx('div', {
                  className: 'flex items-center gap-2 px-2.5 py-2 rounded border border-(--ui-stroke-secondary)',
                  children: jsxs('div', {
                    className: 'flex items-center gap-2',
                    children: [
                      jsx(StatusDot, { color: healthColor(h), size: 'small' }),
                      jsx('span', {
                        className: 'text-xs text-(--ui-text-secondary)',
                        children: healthLabel(h)
                      })
                    ]
                  })
                }),
                last ? jsx('div', {
                  className: 'text-[0.65rem] text-(--ui-text-quaternary)',
                  children: 'Chequeado ' + relativeTime(last)
                }) : null
              ]
            }),

            jsx(Separator, {}),

            // ── Git section ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', {
                  className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider',
                  children: 'Git'
                }),
                git ? jsxs('div', {
                  className: 'flex flex-col gap-1 text-xs',
                  children: [
                    jsx('div', {
                      className: 'text-(--ui-text-secondary)',
                      children: 'Rama: ' + git.branch
                    }),
                    jsx('div', {
                      className: 'text-(--ui-text-tertiary) truncate',
                      children: git.commit ? git.commit.slice(0, 60) : 'sin commits'
                    }),
                    git.author ? jsx('div', {
                      className: 'text-[0.65rem] text-(--ui-text-quaternary)',
                      children: git.author + ' - ' + (git.relative_date || '')
                    }) : null,
                    git.dirty ? jsx(Badge, {
                      variant: 'warning',
                      children: git.uncommitted + ' cambios sin commit'
                    }) : jsx(Badge, {
                      variant: 'success',
                      children: 'Todo limpio'
                    })
                  ]
                }) : jsx('div', {
                  className: 'flex items-center gap-2 text-xs text-(--ui-text-quaternary) italic',
                  children: jsxs('span', {
                    children: [
                      jsx(GlyphSpinner, { size: 'small' }),
                      ' Cargando estado git...'
                    ]
                  })
                }),
                lastGit ? jsx('div', {
                  className: 'text-[0.65rem] text-(--ui-text-quaternary)',
                  children: 'Actualizado ' + relativeTime(lastGit)
                }) : null
              ]
            }),

            jsx(Separator, {}),

            // ── Quick actions ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', {
                  className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider',
                  children: 'Acciones rapidas'
                }),
                jsxs('div', {
                  className: 'flex flex-col gap-1',
                  children: [
                    jsx(ActionBtn, {
                      label: 'Abrir Outfit',
                      url: 'https://atnojs.es/apps/outfit'
                    }),
                    jsx(ActionBtn, {
                      label: 'Abrir Imagenes IA',
                      url: 'https://atnojs.es/apps/imagenes_ia/editar_copia'
                    }),
                    jsx(ActionBtn, {
                      label: 'Refrescar Estado',
                      action: () => { checkHealth(); fetchGitStatus(); }
                    })
                  ]
                })
              ]
            }),

            jsx(Separator, {}),

            // ── Environment ──
            jsxs('div', {
              className: 'flex flex-col gap-1.5',
              children: [
                jsx('div', {
                  className: 'text-xs font-medium text-(--ui-text-tertiary) uppercase tracking-wider',
                  children: 'Entorno'
                }),
                jsxs('div', {
                  className: 'flex flex-col gap-0.5 text-xs text-(--ui-text-secondary)',
                  children: [
                    jsx('div', {
                      children: 'Perfil: ' + host.state.profile.get()
                    }),
                    jsx('div', {
                      children: 'Gateway: ' + host.state.gateway.get()
                    }),
                    jsx('div', {
                      children: 'Modelo: ' + host.state.model.get()
                    })
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

export default {
  id: ID,
  name: 'Antigravity Command',

  register(ctx) {
    // Store ctx for API calls
    pluginCtx = ctx

    // Status bar chip (right side, order 100)
    ctx.register({
      id: 'status',
      area: 'statusBar.right',
      order: 100,
      render: jsx(StatusChip, {})
    })

    // Dashboard pane (right sidebar, 300px)
    ctx.register({
      id: 'dashboard',
      area: 'panes',
      title: 'Antigravity',
      data: { placement: 'right', width: '300px' },
      render: jsx(Dashboard, {})
    })

    // Initial fetch
    checkHealth()
    fetchGitStatus()

    // Periodic refresh: health cada 5 min, git cada 2 min
    healthTimer = setInterval(checkHealth, 5 * 60 * 1000)
    gitTimer = setInterval(fetchGitStatus, 2 * 60 * 1000)

    // Cleanup on unload
    return () => {
      if (healthTimer) clearInterval(healthTimer)
      if (gitTimer) clearInterval(gitTimer)
      pluginCtx = null
    }
  }
}
