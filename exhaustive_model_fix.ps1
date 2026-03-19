# Script de Corrección Exhaustiva de Modelos Gemini
# Este script busca CUALQUIER variante antigua de Gemini y la actualiza a la versión gratuita 3.1.

$NEW_MODEL = "gemini-3.1-flash-image-preview"

# Regex que captura variantes como gemini-1.5-pro, gemini-2.5-flash-image, gemini-3-pro, etc.
# Pero EXCLUYE el modelo de destino para no entrar en bucle o redundancia.
$OLD_MODELS_REGEX = "gemini-(1\.5|2\.0|2\.5|3|3\.0)-(pro|flash)(-[a-z0-9-]+)?"

$folders = Get-ChildItem -Path "e:\ANTIGRAVITY\apps", "e:\ANTIGRAVITY\webs" -Directory

foreach ($folder in $folders) {
    $path = $folder.FullName
    $files = Get-ChildItem -Path $path -Include *.js, *.php, *.html, *.tsx -Recurse
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match $OLD_MODELS_REGEX) {
            Write-Host "Corrigiendo modelos en: $($file.FullName)" -ForegroundColor Yellow
            # El reemplazo regex es global en el archivo
            $newContent = [regex]::Replace($content, $OLD_MODELS_REGEX, $NEW_MODEL)
            $newContent | Set-Content $file.FullName
        }
    }
}

Write-Host "¡Auditoría y corrección completada!" -ForegroundColor Green
