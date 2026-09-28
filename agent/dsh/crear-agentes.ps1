<#
.SYNOPSIS
    Genera los agentes (agent presets) de DeepSeek Harness para el flujo ANTIGRAVITY.

.DESCRIPTION
    Cada agente es un "agent preset" de DSH: un directorio con dos archivos.

      agent.cordis.yml  Composicion de plugins del agente (que herramientas tiene).
      preset.yml        Nombre, descripcion y orden que muestra el selector.

    Las FUENTES viven versionadas en este repo, un directorio por agente:

      agentes\<id>\persona.md   El system prompt del agente.
      agentes\<id>\preset.yml   Nombre, descripcion y orden.

    El script NO escribe la composicion a mano: parte de la composicion del
    preset de fabrica `standard` (la que trae todas las herramientas) y le
    sustituye dos bloques:

      1. La fila `persona`, por el contenido de agentes\<id>\persona.md
      2. La fila `skill-filesystem`, para exponer la biblioteca de skills del proyecto

    Asi cada agente hereda las herramientas y la configuracion del preset
    estandar de la instalacion sin duplicar 250 lineas de YAML.

    Los agentes se escriben en la raiz de presets de usuario de DSH, que el
    roster descubre sin reiniciar el proceso. El preset de fabrica NUNCA se toca:
    una actualizacion de DSH lo sobrescribiria.

    NOTA DE CODIFICACION: este archivo es ASCII puro a proposito. Windows
    PowerShell 5.1 lee los .ps1 sin BOM como ANSI, de modo que los acentos
    literales dentro del script se corrompen. Todo el texto en espanol vive en
    persona.md y preset.yml, que se leen como UTF-8 explicito.

.PARAMETER StandardPath
    Composicion del preset de fabrica que sirve de plantilla.

.PARAMETER SkillsRoot
    Raiz de skills que se expone a todos los agentes generados.

.PARAMETER Destino
    Raiz de presets de usuario de DSH. Por defecto <DSH_HOME>\.agent-presets

.EXAMPLE
    powershell -File crear-agentes.ps1

.EXAMPLE
    powershell -File crear-agentes.ps1 -SkillsRoot 'E:\ANTIGRAVITY\.claude\skills'
#>
[CmdletBinding()]
param(
    [string]$StandardPath = 'E:\herramientas\deepseek-harness\apps\cli\config\agent-presets\standard\agent.cordis.yml',
    [string]$SkillsRoot   = 'E:\ANTIGRAVITY\.claude\skills',
    [string]$Destino      = (Join-Path $env:USERPROFILE '.dsh\.agent-presets')
)

$ErrorActionPreference = 'Stop'
$OrigenAgentes = Join-Path $PSScriptRoot 'agentes'

# ── Utilidades ──────────────────────────────────────────────────────────────

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory)][string]$Ruta,
        [Parameter(Mandatory)][string]$Texto
    )
    # Windows PowerShell 5.1 no admite -Encoding utf8NoBOM y su 'UTF8' escribe BOM.
    # Un BOM romperia el parseo YAML de la composicion, asi que escribimos con .NET.
    $utf8SinBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Ruta, $Texto, $utf8SinBom)
}

function Read-Utf8Text {
    param([Parameter(Mandatory)][string]$Ruta)
    # Lectura explicita en UTF-8: Get-Content en 5.1 depende de la BOM del archivo.
    return [System.IO.File]::ReadAllText($Ruta, (New-Object System.Text.UTF8Encoding($false)))
}

function ConvertTo-PersonaRow {
    param([Parameter(Mandatory)][string]$Texto)

    # La fila `persona` es un escalar de bloque literal (|-), con el contenido
    # indentado 6 espacios. Las lineas vacias se emiten vacias de verdad.
    $lineas = New-Object System.Collections.Generic.List[string]
    $lineas.Add('- id: persona')
    $lineas.Add("  name: '@deepseek-ai/dsh-persona'")
    $lineas.Add('  config:')
    $lineas.Add('    text: |-')

    $normalizado = ($Texto.TrimEnd() -replace "`r`n", "`n")
    foreach ($linea in ($normalizado -split "`n")) {
        if ($linea.Trim() -eq '') { $lineas.Add('') }
        else { $lineas.Add('      ' + $linea.TrimEnd()) }
    }
    return ($lineas -join "`n")
}

# ── Plantilla ───────────────────────────────────────────────────────────────

if (-not (Test-Path -LiteralPath $StandardPath)) { throw "No existe la composicion plantilla: $StandardPath" }
if (-not (Test-Path -LiteralPath $OrigenAgentes)) { throw "No existe la carpeta de agentes: $OrigenAgentes" }

$plantilla = (Read-Utf8Text -Ruta $StandardPath) -replace "`r`n", "`n"

$sfOld = "- id: skill-filesystem`n  name: '@deepseek-ai/dsh-skill-filesystem'"
$sfNew = "- id: skill-filesystem`n  name: '@deepseek-ai/dsh-skill-filesystem'`n  config:`n    customSkillDirs:`n      - '$SkillsRoot'"

if (-not $plantilla.Contains($sfOld)) { throw "No se encontro la fila skill-filesystem en $StandardPath" }
$plantilla = $plantilla.Replace($sfOld, $sfNew)

$pStart = $plantilla.IndexOf('- id: persona')
$pEnd   = $plantilla.IndexOf('- id: agent-instructions')
if ($pStart -lt 0 -or $pEnd -le $pStart) { throw "No se encontro el bloque persona en $StandardPath" }

# ── Generacion ──────────────────────────────────────────────────────────────

New-Item -ItemType Directory -Force -Path $Destino | Out-Null

$creados = 0
foreach ($carpeta in (Get-ChildItem -LiteralPath $OrigenAgentes -Directory | Sort-Object Name)) {
    $id = $carpeta.Name

    if ($id -notmatch '^[a-z0-9][a-z0-9-]*$') {
        Write-Warning "Id invalido para un preset (se omite): $id"
        continue
    }

    $personaPath = Join-Path $carpeta.FullName 'persona.md'
    $metaPath    = Join-Path $carpeta.FullName 'preset.yml'

    if (-not (Test-Path -LiteralPath $personaPath)) { Write-Warning "Sin persona.md (se omite): $id"; continue }
    if (-not (Test-Path -LiteralPath $metaPath))    { Write-Warning "Sin preset.yml (se omite): $id"; continue }

    $persona     = Read-Utf8Text -Ruta $personaPath
    $metaTexto   = Read-Utf8Text -Ruta $metaPath
    $filaPersona = ConvertTo-PersonaRow -Texto $persona
    $composicion = $plantilla.Substring(0, $pStart) + $filaPersona + "`n`n" + $plantilla.Substring($pEnd)

    $dir = Join-Path $Destino $id
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    Write-Utf8NoBom -Ruta (Join-Path $dir 'agent.cordis.yml') -Texto $composicion
    Write-Utf8NoBom -Ruta (Join-Path $dir 'preset.yml') -Texto $metaTexto

    $lineaNombre = ($metaTexto -split "`n" | Where-Object { $_ -match '^name:\s*\S' } | Select-Object -First 1)
    $nombre = if ($lineaNombre) { $lineaNombre -replace '^name:\s*', '' } else { $id }

    Write-Host ("  [ok] {0,-20} {1}" -f $id, $nombre)
    $creados++
}

Write-Host ''
Write-Host "Agentes generados : $creados"
Write-Host "Destino           : $Destino"
Write-Host "Skills expuestas  : $SkillsRoot"
