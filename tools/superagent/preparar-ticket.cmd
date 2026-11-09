@echo off
rem ---------------------------------------------------------------------------
rem  preparar-ticket.cmd — crea el checkout aislado de un ticket del superagente.
rem
rem  Lo llama dsh-superagent como "prepare command" (panel: Execution -> Prepare).
rem  Variables que pone el host en cada ticket:
rem    DSH_SUPERAGENT_TICKET        id del ticket
rem    DSH_SUPERAGENT_NAME          nombre corto de la rama
rem    DSH_SUPERAGENT_DIR           directorio donde crear el worktree
rem    DSH_SUPERAGENT_GITHUB_PR_HEAD  solo en tickets de PR: head del PR
rem  Overrides opcionales (instalacion en otra ruta o pruebas):
rem    SA_CLONE   clone local del repo     (por defecto E:\_superagent\repo)
rem    SA_REMOTE  remoto git               (por defecto https://github.com/atnojs/ANTIGRAVITY.git)
rem
rem  Sale 0 si el worktree queda creado; 1 con el motivo por stderr si no.
rem ---------------------------------------------------------------------------
setlocal EnableExtensions

set "CLONE=%SA_CLONE%"
if "%CLONE%"=="" set "CLONE=E:\_superagent\repo"
set "REMOTE=%SA_REMOTE%"
if "%REMOTE%"=="" set "REMOTE=https://github.com/atnojs/ANTIGRAVITY.git"

if "%DSH_SUPERAGENT_TICKET%"=="" (echo preparar-ticket: falta DSH_SUPERAGENT_TICKET 1>&2 & exit /b 1)
if "%DSH_SUPERAGENT_NAME%"=="" (echo preparar-ticket: falta DSH_SUPERAGENT_NAME 1>&2 & exit /b 1)
if "%DSH_SUPERAGENT_DIR%"=="" (echo preparar-ticket: falta DSH_SUPERAGENT_DIR 1>&2 & exit /b 1)
if not exist "%CLONE%\.git" (echo preparar-ticket: no hay clone en "%CLONE%" 1>&2 & exit /b 1)

rem Base: el head del PR si el ticket viene de un PR; si no, la rama de despliegue
rem de este repo (main). Ojo: `HEAD` no vale como ref remoto (git falla con
rem "couldn't find remote ref HEAD").
set "BASE=%DSH_SUPERAGENT_GITHUB_PR_HEAD%"
if not "%BASE%"=="" goto base_lista
set "BASE=main"
:base_lista

git -C "%CLONE%" fetch --no-tags "%REMOTE%" "%BASE%:refs/superagent/%DSH_SUPERAGENT_TICKET%"
if errorlevel 1 (echo preparar-ticket: fallo el fetch de "%BASE%" 1>&2 & exit /b 1)

git -C "%CLONE%" worktree add -b "agent/%DSH_SUPERAGENT_NAME%" "%DSH_SUPERAGENT_DIR%" "refs/superagent/%DSH_SUPERAGENT_TICKET%"
if errorlevel 1 (
  echo preparar-ticket: fallo el worktree en "%DSH_SUPERAGENT_DIR%" 1>&2
  echo   Si es un reintento, quedan restos del intento anterior. Limpiar: 1>&2
  echo     git -C "%CLONE%" worktree prune 1>&2
  echo     git -C "%CLONE%" branch -D "agent/%DSH_SUPERAGENT_NAME%" 1>&2
  exit /b 1
)

exit /b 0
