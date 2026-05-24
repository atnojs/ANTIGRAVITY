#!/bin/bash
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
