<#
.SYNOPSIS
    Publica las skills canonicas de ANTIGRAVITY en la raiz de descubrimiento de DSH.

.DESCRIPTION
    DeepSeek Harness descubre skills en <raiz_proyecto>/.dsh/skills (un nivel de
    profundidad). Las skills canonicas viven en skills/*.md.

    Este script crea .dsh/skills como un JUNCTION de directorio que apunta a
    skills/. Un junction es un punto de reanalisis de directorio que en Windows NO
    requiere privilegios de administrador (a diferencia de los symlinks, que si
    los exigen). Resultado:

      - DSH ve las 20 skills canonicas del proyecto.
      - No hay copia ni duplicacion: es la misma carpeta.
      - No hay desincronizacion posible al editar una skill (no hay copias).

    Es idempotente y migra instalaciones anteriores que usaban hardlinks por
    archivo: si encuentra ese formato, lo sustituye por el junction. Nunca escribe
    ni borra el contenido de skills/: al eliminar el junction se usa un borrado NO
    recursivo del punto de reanalisis, de modo que el destino jamas se sigue.

    .dsh/ esta en .gitignore, asi que nada de esto se versiona ni se despliega a
    la raiz publica de Hostinger.

.EXAMPLE
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\link-dsh-skills.ps1
#>
[CmdletBinding()]
param(
    [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot puede llegar vacio como valor por defecto de un parametro en
# Windows PowerShell 5.1; se resuelve aqui.
if (-not $RepoRoot) {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $PSCommandPath }
    $RepoRoot = Split-Path -Parent $scriptDir
}

$skillsDir = Join-Path $RepoRoot 'skills'
$dshDir = Join-Path $RepoRoot '.dsh'
$linkDir = Join-Path $dshDir 'skills'

if (-not (Test-Path $skillsDir)) {
    throw "No se encuentra el directorio canonico de skills: $skillsDir"
}

$canonicalCount = @(Get-ChildItem -Path (Join-Path $skillsDir '*.md') -File).Count
$valid = 0
$invalid = @()
foreach ($file in Get-ChildItem -Path (Join-Path $skillsDir '*.md') -File) {
    $head = Get-Content -LiteralPath $file.FullName -TotalCount 8 -Encoding UTF8
    $hasName = [bool]($head | Where-Object { $_ -match '^name:\s*\S' })
    $hasDescription = [bool]($head | Where-Object { $_ -match '^description:' })
    if ($hasName -and $hasDescription) { $valid++ } else { $invalid += $file.Name }
}

if (-not (Test-Path $dshDir)) {
    New-Item -ItemType Directory -Force -Path $dshDir | Out-Null
    Write-Host "Creado $dshDir"
}

$existing = Get-Item -LiteralPath $linkDir -Force -ErrorAction SilentlyContinue
$action = ''

if ($null -eq $existing) {
    $action = 'creado'
}
elseif ($existing.LinkType -eq 'Junction') {
    $target = ($existing.Target -join '')
    if ($target -like "*$skillsDir") {
        $action = 'ya correcto'
    }
    else {
        # Borrado NO recursivo: elimina solo el punto de reanalisis, sin seguir el destino.
        [System.IO.Directory]::Delete($linkDir, $false)
        $action = 'reapuntado'
    }
}
elseif ($existing.LinkType -eq 'SymbolicLink') {
    [System.IO.Directory]::Delete($linkDir, $false)
    $action = 'reemplazado (symlink)'
}
else {
    # Formato anterior: carpeta real con un hardlink por skill. Borrarla elimina
    # solo los enlaces; los archivos de skills/ conservan su otra referencia.
    Remove-Item -LiteralPath $linkDir -Recurse -Force
    $action = 'migrado desde hardlinks'
}

if ($action -ne 'ya correcto') {
    New-Item -ItemType Junction -Path $linkDir -Target $skillsDir | Out-Null
}

$link = Get-Item -LiteralPath $linkDir -Force
$visible = @(Get-ChildItem -Path $linkDir -File).Count

# Salvaguarda: el arbol canonico debe seguir intacto.
$after = @(Get-ChildItem -Path (Join-Path $skillsDir '*.md') -File).Count
if ($after -ne $canonicalCount) {
    throw "ALERTA: skills/ tenia $canonicalCount archivos y ahora tiene $after. Revisa el repositorio."
}

Write-Host ""
Write-Host "Estado del enlace : $action"
Write-Host "Enlace            : $linkDir"
Write-Host "Tipo              : $($link.LinkType)"
Write-Host "Destino           : $($link.Target -join '')"
Write-Host "Skills con front matter valido : $valid de $canonicalCount archivos .md"
if ($invalid.Count -gt 0) {
    Write-Host "Ignoradas por DSH (no son skills): $($invalid -join ', ')"
}
Write-Host "Archivos visibles por DSH : $visible"
Write-Host "skills/ intacto : $after de $canonicalCount archivos"
