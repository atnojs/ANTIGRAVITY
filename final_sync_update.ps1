# Script de Sincronización y Actualización Antigravity (Versión Final)
# Este script actualiza el modelo a gemini-3.1-flash-image-preview y vincula con GitHub.

$OLD_MODEL = "gemini-3-pro-image-preview"
$NEW_MODEL = "gemini-3.1-flash-image-preview"
$GH_USER = "atnojs"

$folders = Get-ChildItem -Path "e:\ANTIGRAVITY\apps", "e:\ANTIGRAVITY\webs" -Directory

foreach ($folder in $folders) {
    $name = $folder.Name
    $path = $folder.FullName
    Write-Host "Procesando: $name..." -ForegroundColor Cyan
    
    # 1. Reemplazo de Modelo
    $files = Get-ChildItem -Path $path -Include *.js, *.php, *.html -Recurse
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match $OLD_MODEL) {
            Write-Host "  Actualizando modelo en: $($file.Name)" -ForegroundColor Yellow
            $content -replace $OLD_MODEL, $NEW_MODEL | Set-Content $file.FullName
        }
    }

    # 2. Re-vincular GitHub
    # Solo si la carpeta tiene contenido y no es una carpeta administrativa
    if ((Get-ChildItem $path).Count -gt 0) {
        Push-Location $path
        if (!(Test-Path .git)) {
            Write-Host "  Inicializando Git y vinculando a GitHub..." -ForegroundColor Green
            git init -q
            git remote add origin "https://github.com/$GH_USER/$name.git"
            git add .
            git commit -m "Actualización masiva: Cambio a $NEW_MODEL y restauración tras formateo" -q
            # Intentamos el push, pero no bloqueamos el script si el repo no existe aún
            git push -u origin main -q 2>$null
        }
        Pop-Location
    }
}

Write-Host "¡Proceso completado!" -ForegroundColor Green
