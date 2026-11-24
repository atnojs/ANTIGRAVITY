<#
.SYNOPSIS
    Espeja la biblioteca canonica de skills de ANTIGRAVITY en el catalogo de skills de
    DeepSeek Harness (%USERPROFILE%\.dsh\skills).

.DESCRIPTION
    Sincronizacion UNIDIRECCIONAL: el share manda (origen), DSH obedece (destino).

    Copia:
      - skills\SKILL_*.md            (solo el nivel superior; INDEX.md y demas NO se copian)
      - skills\recursos\**           (recursivo)

    No borra nada que no haya puesto el mismo: guarda un estado en
    %USERPROFILE%\.dsh\skills-sync.state.json (FUERA del directorio de skills, para no
    ensuciar el descubrimiento) con ruta relativa + sha256 + fecha, y solo elimina los
    destinos listados ahi que ya no existan en el origen.

    Idempotente: si nada cambia, no copia nada y el sha256 del conjunto sale identico.

.PARAMETER Source
    Raiz de la biblioteca canonica. Por defecto el share.

.PARAMETER Destination
    Raiz del catalogo de skills de DSH. Por defecto %USERPROFILE%\.dsh\skills.

.PARAMETER StateFile
    Fichero de estado. Por defecto %USERPROFILE%\.dsh\skills-sync.state.json.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File \\Principal\e\ANTIGRAVITY\tools\skills-sync\sync-a-dsh.ps1 -WhatIf

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File \\Principal\e\ANTIGRAVITY\tools\skills-sync\sync-a-dsh.ps1

.NOTES
    PowerShell 5.1. Sin `??` ni operador ternario.
    Exit code 0 = conteo y hashes cuadran. Exit code 1 = no cuadran (o fallo de origen).
#>
[CmdletBinding()]
param(
    # -WhatIf propio: el conmutador comun de SupportsShouldProcess pondria TODO en
    # simulacion, incluidos Get-FileHash y Get-ChildItem, y el plan saldria vacio.
    [switch]$WhatIf,
    [string]$Source      = '\\Principal\e\ANTIGRAVITY\skills',
    [string]$Destination = (Join-Path $env:USERPROFILE '.dsh\skills'),
    [string]$StateFile   = (Join-Path $env:USERPROFILE '.dsh\skills-sync.state.json')
)

$ErrorActionPreference = 'Stop'
$dryRun = [bool]$WhatIf

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLower()
}

function Get-RelativeKey {
    param([string]$Root, [string]$Full)
    $prefix = $Root.TrimEnd('\') + '\'
    if (-not $Full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Ruta fuera de la raiz: $Full"
    }
    return $Full.Substring($prefix.Length).Replace('\', '/')
}

Write-Output '=== sync-a-dsh : biblioteca canonica de skills -> catalogo de DSH ==='
Write-Output ("Origen : {0}" -f $Source)
Write-Output ("Destino: {0}" -f $Destination)
Write-Output ("Estado : {0}" -f $StateFile)
if ($dryRun) { Write-Output 'MODO: -WhatIf (no se escribe ni se borra nada)' }
Write-Output ''

# ---------- 1. validar origen ----------
if (-not (Test-Path -LiteralPath $Source)) {
    Write-Output "ERROR: el origen no existe o no es accesible: $Source"
    exit 1
}
$srcSkills = @(Get-ChildItem -LiteralPath $Source -Filter 'SKILL_*.md' -File -ErrorAction Stop)
if ($srcSkills.Count -eq 0) {
    Write-Output "ERROR: el origen no tiene ningun SKILL_*.md. No se toca el destino."
    exit 1
}

# ---------- 2. manifiesto del origen ----------
$srcItems = @()
foreach ($f in $srcSkills) {
    $srcItems += [pscustomobject]@{
        Rel  = $f.Name
        Src  = $f.FullName
        Hash = (Get-Sha256 -Path $f.FullName)
    }
}

$recursosSrc = Join-Path $Source 'recursos'
if (Test-Path -LiteralPath $recursosSrc) {
    $recFiles = @(Get-ChildItem -LiteralPath $recursosSrc -Recurse -File -ErrorAction Stop)
    foreach ($f in $recFiles) {
        if ($f.Name -like '*.zip' -or $f.Name -like '*.rar' -or $f.Name -like '*.7z' -or
            $f.Name -like '*.bak' -or $f.Name -like '*.orig') {
            Write-Output ("AVISO: se omite un anexo que no es material de skill: {0}" -f $f.FullName)
            continue
        }
        $srcItems += [pscustomobject]@{
            Rel  = 'recursos/' + (Get-RelativeKey -Root $recursosSrc -Full $f.FullName)
            Src  = $f.FullName
            Hash = (Get-Sha256 -Path $f.FullName)
        }
    }
} else {
    Write-Output ("AVISO: el origen no tiene carpeta recursos\ ({0})" -f $recursosSrc)
}

$srcSkillCount = $srcSkills.Count
$srcRecCount   = @($srcItems | Where-Object { $_.Rel.StartsWith('recursos/') }).Count
Write-Output ("Origen: {0} SKILL_*.md + {1} ficheros en recursos\ = {2} elementos" -f $srcSkillCount, $srcRecCount, $srcItems.Count)

# ---------- 3. estado previo (que pusimos nosotros la ultima vez) ----------
$state = $null
if (Test-Path -LiteralPath $StateFile) {
    try {
        $state = Get-Content -LiteralPath $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Output ("AVISO: el estado no se puede leer ({0}). No se borrara nada." -f $_.Exception.Message)
        $state = $null
    }
}
$stateOk = $false
$prevEntries = @()
if ($null -ne $state -and $null -ne $state.files) {
    $prevEntries = @($state.files)
    $stateOk = $true
}

# ---------- 4. planificar copias ----------
$toCopy    = @()
$unchanged = @()
foreach ($it in $srcItems) {
    $dst = Join-Path $Destination ($it.Rel.Replace('/', '\'))
    if (Test-Path -LiteralPath $dst) {
        $dstHash = Get-Sha256 -Path $dst
        if ($dstHash -eq $it.Hash) { $unchanged += $it } else { $toCopy += $it }
    } else {
        $toCopy += $it
    }
}

# ---------- 5. planificar borrados (solo lo nuestro, y solo si ya no esta en el origen) ----------
$srcKeys = @{}
foreach ($it in $srcItems) { $srcKeys[$it.Rel] = $it.Hash }

$toDelete = @()
if ($stateOk) {
    foreach ($p in $prevEntries) {
        $rel = [string]$p.rel
        if ([string]::IsNullOrWhiteSpace($rel)) { continue }
        if ($srcKeys.ContainsKey($rel)) { continue }
        $dst = Join-Path $Destination ($rel.Replace('/', '\'))
        if (Test-Path -LiteralPath $dst) {
            $toDelete += [pscustomobject]@{ Rel = $rel; Dst = $dst; OldHash = [string]$p.hash }
        }
    }
} elseif (Test-Path -LiteralPath $StateFile) {
    Write-Output 'AVISO: estado ilegible; no se borra ningun destino.'
}

# ---------- 6. ejecutar ----------
$copied = 0
$deleted = 0

if (-not $dryRun) {
    if (-not (Test-Path -LiteralPath $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
}

foreach ($it in $toCopy) {
    $dst = Join-Path $Destination ($it.Rel.Replace('/', '\'))
    $parent = Split-Path -Parent $dst
    if (-not $dryRun) {
        if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -LiteralPath $it.Src -Destination $dst -Force
    }
    $copied++
    Write-Output ("  copiado  {0}" -f $it.Rel)
}

$deletedDirs = @()
foreach ($d in $toDelete) {
    # blindaje: nunca borrar fuera del destino
    $dstFull = [System.IO.Path]::GetFullPath($d.Dst)
    $destFull = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
    if (-not $dstFull.StartsWith($destFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Output ("AVISO: se omite un borrado fuera del destino: {0}" -f $d.Dst)
        continue
    }
    if ($d.OldHash -and (Test-Path -LiteralPath $d.Dst)) {
        $nowHash = Get-Sha256 -Path $d.Dst
        if ($nowHash -ne $d.OldHash) {
            Write-Output ("AVISO: {0} se edito a mano desde la ultima sincronizacion; se elimina igual (ya no esta en el origen)" -f $d.Rel)
        }
    }
    if (-not $dryRun) {
        Remove-Item -LiteralPath $d.Dst -Force
        $deletedDirs += (Split-Path -Parent $d.Dst)
    }
    $deleted++
    Write-Output ("  borrado  {0}" -f $d.Rel)
}

# limpiar solo las carpetas que han quedado vacias por nuestros borrados
if (-not $dryRun -and $deletedDirs.Count -gt 0) {
    foreach ($dir in ($deletedDirs | Sort-Object -Unique)) {
        $cur = $dir
        while ($cur -and (Test-Path -LiteralPath $cur)) {
            $hasChild = @(Get-ChildItem -LiteralPath $cur -Force -ErrorAction SilentlyContinue).Count -gt 0
            if ($hasChild) { break }
            $curFull = [System.IO.Path]::GetFullPath($cur)
            if ($curFull -eq [System.IO.Path]::GetFullPath($Destination)) { break }
            Remove-Item -LiteralPath $cur -Force
            $cur = Split-Path -Parent $cur
        }
    }
}

# ---------- 7. escribir estado ----------
$stamp = (Get-Date).ToString('o')
if (-not $dryRun) {
    $payload = [ordered]@{
        schemaVersion = 1
        tool          = 'sync-a-dsh.ps1'
        source        = $Source
        destination   = $Destination
        generatedAt   = $stamp
        files         = @($srcItems | ForEach-Object {
            [ordered]@{ rel = $_.Rel; hash = $_.Hash; syncedAt = $stamp }
        })
    }
    $parentState = Split-Path -Parent $StateFile
    if (-not (Test-Path -LiteralPath $parentState)) { New-Item -ItemType Directory -Path $parentState -Force | Out-Null }
    ($payload | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $StateFile -Encoding UTF8
}

# ---------- 8. sha256 del conjunto ----------
$lines = @($srcItems | Sort-Object Rel | ForEach-Object { '{0}={1}' -f $_.Rel, $_.Hash })
$blob  = ($lines -join "`n")
$sha   = [System.Security.Cryptography.SHA256]::Create()
$agg   = (($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($blob))) | ForEach-Object { $_.ToString('x2') }) -join ''
$sha.Dispose()

# ---------- 9. verificacion final ----------
# Se cuenta SOLO lo que el script rastrea. Un SKILL_*.md ajeno que viva en el destino
# (otra herramienta, una skill escrita a mano) no es un fallo: se respeta y se informa.
$problems = @()
$dstSkillCount = 0
$dstRecCount   = 0
$foreign       = @()
if (Test-Path -LiteralPath $Destination) {
    foreach ($it in $srcItems) {
        $dst = Join-Path $Destination ($it.Rel.Replace('/', '\'))
        if (Test-Path -LiteralPath $dst) {
            if ($it.Rel.StartsWith('recursos/')) { $dstRecCount++ } else { $dstSkillCount++ }
        }
    }
    foreach ($f in (Get-ChildItem -LiteralPath $Destination -File -Force -ErrorAction SilentlyContinue)) {
        if (-not $srcKeys.ContainsKey($f.Name)) { $foreign += $f.Name }
    }
}
if (-not $dryRun) {
    if ($dstSkillCount -ne $srcSkillCount) {
        $problems += ("conteo SKILL_*.md rastreados destino={0} origen={1}" -f $dstSkillCount, $srcSkillCount)
    }
    if ($dstRecCount -ne $srcRecCount) {
        $problems += ("conteo recursos rastreados destino={0} origen={1}" -f $dstRecCount, $srcRecCount)
    }
    foreach ($it in $srcItems) {
        $dst = Join-Path $Destination ($it.Rel.Replace('/', '\'))
        if (-not (Test-Path -LiteralPath $dst)) { $problems += ("falta en destino: {0}" -f $it.Rel); continue }
        if ((Get-Sha256 -Path $dst) -ne $it.Hash) { $problems += ("hash distinto: {0}" -f $it.Rel) }
    }
}

Write-Output ''
Write-Output '--- RESUMEN ---'
Write-Output ("Origen         : {0}" -f $Source)
Write-Output ("Destino        : {0}" -f $Destination)
Write-Output ("Copiados       : {0}" -f $copied)
Write-Output ("Sin cambios    : {0}" -f $unchanged.Count)
Write-Output ("Eliminados     : {0}" -f $deleted)
Write-Output ("Origen total   : {0} SKILL_*.md + {1} recursos = {2}" -f $srcSkillCount, $srcRecCount, $srcItems.Count)
if ($dryRun) {
    Write-Output 'Destino total  : (no comprobado en -WhatIf)'
} else {
    Write-Output ("Destino total  : {0} SKILL_*.md + {1} recursos (rastreados por este script)" -f $dstSkillCount, $dstRecCount)
    if ($foreign.Count -gt 0) {
        Write-Output ("Ajenos         : {0} en el destino, respetados sin tocar ({1})" -f $foreign.Count, ($foreign -join ', '))
    }
}
Write-Output ("sha256 conjunto: {0}" -f $agg)

if ($dryRun) {
    Write-Output 'RESULTADO: -WhatIf, no se ha modificado nada.'
    exit 0
}

if ($problems.Count -gt 0) {
    Write-Output ''
    Write-Output 'RESULTADO: NO CUADRA. Problemas:'
    foreach ($p in $problems) { Write-Output ("  - {0}" -f $p) }
    exit 1
}

Write-Output 'RESULTADO: OK. Conteo y hashes cuadran.'
exit 0
