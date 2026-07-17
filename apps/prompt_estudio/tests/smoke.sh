#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

php -l "$ROOT/proxy.php"
php -l "$ROOT/history.php"
node --check "$ROOT/app.js"
node --check "$ROOT/history-manager.js"

for file in index.html app.css app.js proxy.php history.php history-manager.js; do
  test -s "$ROOT/$file"
done

grep -q "SKILL_METODO_COPILOTO.md" "$ROOT/proxy.php"
grep -q "SKILL_MEJORADOR_PROMPT.md" "$ROOT/proxy.php"
grep -q "new HistoryManager('prompt_studio_premium')" "$ROOT/app.js"
grep -q "IA generando lo solicitado" "$ROOT/index.html"

echo "Smoke test completado correctamente."
