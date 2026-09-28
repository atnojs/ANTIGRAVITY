#!/bin/bash
# --- DEPENDENCIA: CLI de Google Workspace ---
# gws es el CLI que escribe en la hoja de cálculo. Si no está instalado en esta
# máquina, el registro se omite en silencio (exit 0) para no ensuciar la salida
# de cada commit con "gws: command not found". En cuanto gws esté disponible,
# el registro se reanuda solo, sin tocar nada más.
if ! command -v gws >/dev/null 2>&1; then
  exit 0
fi

# --- CONFIGURACIÓN ---
SPREADSHEET_ID="18dOT6MAfSF4E6z5jysIbIWxLB3LdZOvIbP6oQhPCtfM"

# Permitir que git funcione a través del límite del sistema de archivos
export GIT_DISCOVERY_ACROSS_FILESYSTEM=1

FECHA=$(date +'%d/%m/%Y')
HORA=$(date +'%H:%M:%S')
COMMIT_MSG=$(git log -1 --pretty=%B | tr -d '\n')
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# --- EJECUCIÓN ---
gws sheets +append --spreadsheet "$SPREADSHEET_ID" --json-values "[[\"$FECHA\", \"$HORA\", \"$COMMIT_MSG\", \"$BRANCH\"]]"
