<#
.SYNOPSIS
    Publica las skills canonicas de ANTIGRAVITY en la raiz de descubrimiento de DSH.

.DESCRIPTION
    DeepSeek Harness descubre skills en <raiz_proyecto>/.dsh/skills (un nivel de
    profundidad). Las skills canonicas viven en skills/*.md con front matter
    (name + description en kebab-case). Este script crea .dsh/skills y enlaza ahi
    cada skill valida mediante HARDLINK: mismo contenido, mismo inodo, sin
    duplicar bytes ni versionar nada (el directorio .dsh/ esta en .gitignore y no
    se despliega a Hostinger).

    Es idempotente: puede ejecutarse tantas veces como haga falta. Nunca escribe
    ni borra los archivos canonicos de skills/.

    Nota: los symlinks requieren privilegios de administrador en Windows, por eso
    se usan hardlinks. Si un editor guarda el archivo canonico con "guardado
    atomico" (escribir + renombrar), el enlace puede quedar desincronizado: en ese
    caso, vuelve a ejecutar este script.

.EXAMPLE
    pwsh -File tools\link-dsh-skills.ps1
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
$linkDir = Join-Path $RepoRoot '.dsh\skills'

if (-not (Test-Path $skillsDir)) {
    throw "No se encuentra el directorio canonico de skills: $skillsDir"
}

if (-not (Test-Path $linkDir)) {
    New-Item -ItemType Directory -Force -Path $linkDir | Out-Null
    Write-Host "Creado $linkDir"
}

$linked = 0
$refreshed = 0
$skipped = 0
$invalid = @()

foreach ($file in Get-ChildItem -Path (Join-Path $skillsDir '*.md') -File) {
    $head = Get-Content -LiteralPath $file.FullName -TotalCount 8 -Encoding UTF8
    $hasName = [bool]($head | Where-Object { $_ -match '^name:\s*\S' })
    $hasDescription = [bool]($head | Where-Object { $_ -match '^description:' })

    if (-not ($hasName -and $hasDescription)) {
        $invalid += $file.Name
        continue
    }

    $linkPath = Join-Path $linkDir $file.Name
    $item = Get-Item -LiteralPath $linkPath -ErrorAction SilentlyContinue

    if ($null -eq $item) {
        New-Item -ItemType HardLink -Path $linkPath -Target $file.FullName | Out-Null
        $linked++
        continue
    }

    if ($item.LinkType -eq 'HardLink') {
        $skipped++
        continue
    }

    # Existe pero no es un enlace (copia suelta): se reemplaza por el enlace.
    Remove-Item -LiteralPath $linkPath -Force
    New-Item -ItemType HardLink -Path $linkPath -Target $file.FullName | Out-Null
    $refreshed++
}

Write-Host ""
Write-Host "Skills enlazadas : $linked"
Write-Host "Enlaces ya validos: $skipped"
Write-Host "Copias reemplazadas: $refreshed"
if ($invalid.Count -gt 0) {
    Write-Host "Ignoradas (sin front matter name+description): $($invalid -join ', ')"
}
Write-Host ""
Write-Host "Total de skills visibles para DSH: $((Get-ChildItem -Path $linkDir -File).Count)"
