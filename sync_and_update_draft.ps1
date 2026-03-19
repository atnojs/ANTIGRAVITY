# Script de Sincronización y Actualización Antigravity
# Este script busca y reemplaza el modelo de IA y re-vincula con GitHub.

$OLD_MODEL = "gemini-3-pro-image-preview"
$NEW_MODEL = "gemini-3.1-flash-image-preview" # Modelo gratuito de Google AI Studio
$GH_USER = "atnojs"

function Update-Project {
    param($path, $name)
    Write-Host "Procesando: $name en $path" -ForegroundColor Cyan
    
    # 1. Reemplazo de Modelo en JS y PHP
    Get-ChildItem -Path $path -Include *.js, *.php -Recurse | ForEach-Object {
        (Get-Content $_.FullName) -replace $OLD_MODEL, $NEW_MODEL | Set-Content $_.FullName
    }

    # 2. Recuperación de Git
    Push-Location $path
    if (!(Test-Path .git)) {
        git init
        git remote add origin "https://github.com/$GH_USER/$name.git"
    }
    git add .
    git commit -m "Actualización masiva: Cambio a modelo $NEW_MODEL y sincronización tras formateo"
    git push -u origin main
    Pop-Location
}

# Ejecutar para carpetas en apps/ y webs/ que tengan un repositorio conocido
# (Esta lista se generará dinámicamente o se pasará como parámetro)
