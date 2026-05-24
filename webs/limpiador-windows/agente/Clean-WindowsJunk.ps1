<#
.SYNOPSIS
    Limpieza prudente de basura en Windows 10/11.
.DESCRIPTION
    Analiza y limpia ubicaciones temporales, caches de Windows, papelera,
    caches de navegadores y caches comunes de aplicaciones. Genera un log
    en %TEMP% con el formato que espera agente-limpiador.ps1.
.PARAMETER DryRun
    Solo analiza. No borra nada.
.PARAMETER Auto
    No pregunta antes de limpiar cada seccion.
.PARAMETER Aggressive
    Incluye zonas mas grandes pero razonablemente seguras: Prefetch,
    memory dumps, Windows.old y logs temporales adicionales.
.PARAMETER SkipBrowsers
    No limpia caches de navegadores.
.PARAMETER SkipApps
    No limpia caches de aplicaciones comunes.
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Auto,
    [switch]$Aggressive,
    [switch]$SkipBrowsers,
    [switch]$SkipApps,
    [string[]]$Blocks = @(),
    [string]$SummaryPath = ''
)

$script:Version = '1.0.0'
$script:StartedAt = Get-Date
$script:LogPath = Join-Path ([System.IO.Path]::GetTempPath()) ("CleanJunk_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
$script:TotalAnalyzedBytes = [int64]0
$script:TotalFreedBytes = [int64]0
$script:ErrorCount = 0
$script:CurrentSection = ''
$script:CurrentBlock = ''
$script:BlockNames = @{
    system_temp = 'Temporales del sistema'
    windows_update = 'Windows Update y Delivery Optimization'
    recycle_bin = 'Papelera de reciclaje'
    browsers = 'Caches de navegadores'
    apps = 'Caches de aplicaciones'
    deep = 'Limpieza profunda'
}
$script:BlockStats = @{}

foreach ($key in $script:BlockNames.Keys) {
    $script:BlockStats[$key] = [ordered]@{
        id = $key
        name = $script:BlockNames[$key]
        analyzed_bytes = [int64]0
        freed_bytes = [int64]0
        total_analyzed = '0 B'
        total_freed = '0 B'
    }
}

$script:SelectedBlocks = @()
foreach ($block in $Blocks) {
    if (-not [string]::IsNullOrWhiteSpace($block)) {
        $script:SelectedBlocks += ($block -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    }
}

function Test-RunBlock {
    param([string]$Id)

    return $script:SelectedBlocks.Count -eq 0 -or $script:SelectedBlocks -contains $Id
}

function Set-CurrentBlock {
    param([string]$Id)
    $script:CurrentBlock = $Id
}

function Add-BlockStat {
    param(
        [int64]$Analyzed,
        [int64]$Freed
    )

    if (-not $script:CurrentBlock -or -not $script:BlockStats.ContainsKey($script:CurrentBlock)) {
        return
    }

    $script:BlockStats[$script:CurrentBlock].analyzed_bytes += $Analyzed
    $script:BlockStats[$script:CurrentBlock].freed_bytes += $Freed
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$script:IsAdmin = Test-IsAdmin

function Write-Log {
    param(
        [string]$Text = '',
        [ConsoleColor]$Color = 'White'
    )

    Add-Content -LiteralPath $script:LogPath -Value $Text -Encoding UTF8
    try {
        Write-Host $Text -ForegroundColor $Color
    } catch {
        Write-Output $Text
    }
}

function Format-Bytes {
    param([int64]$Bytes)

    if ($Bytes -ge 1TB) { return '{0:N2} TB' -f ($Bytes / 1TB) }
    if ($Bytes -ge 1GB) { return '{0:N2} GB' -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return '{0:N2} MB' -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return '{0:N2} KB' -f ($Bytes / 1KB) }
    return "$Bytes B"
}

function Get-ItemSize {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [int64]0
    }

    try {
        $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
        if (-not $item.PSIsContainer) {
            return [int64]$item.Length
        }

        $sum = [int64]0
        Get-ChildItem -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue |
            ForEach-Object {
                if (-not $_.PSIsContainer) {
                    $sum += [int64]$_.Length
                }
            }
        return $sum
    } catch {
        $script:ErrorCount++
        Write-Log "   [!] Error analizando '$Path': $($_.Exception.Message)" 'Yellow'
        return [int64]0
    }
}

function Confirm-Cleanup {
    param(
        [string]$Name,
        [int64]$Bytes
    )

    if ($DryRun) {
        return $false
    }

    if ($Auto) {
        return $true
    }

    $answer = Read-Host ("   Limpiar {0} ({1})? [s/N]" -f $Name, (Format-Bytes $Bytes))
    return $answer -match '^(s|si|sí|y|yes)$'
}

function Remove-ChildrenSafe {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [int64]0
    }

    $before = Get-ItemSize -Path $Path
    $script:TotalAnalyzedBytes += $before
    Write-Log ("   [i] Encontrado: {0}" -f (Format-Bytes $before)) 'Gray'

    if ($before -le 0) {
        Add-BlockStat -Analyzed $before -Freed 0
        return [int64]0
    }

    if (-not (Confirm-Cleanup -Name $script:CurrentSection -Bytes $before)) {
        Write-Log "   [i] Sin borrar" 'Gray'
        Add-BlockStat -Analyzed $before -Freed 0
        return [int64]0
    }

    try {
        Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue |
            Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    } catch {
        $script:ErrorCount++
        Write-Log "   [!] Error borrando '$Path': $($_.Exception.Message)" 'Yellow'
    }

    $after = Get-ItemSize -Path $Path
    $freed = [Math]::Max([int64]0, $before - $after)
    $script:TotalFreedBytes += $freed
    Add-BlockStat -Analyzed $before -Freed $freed
    Write-Log ("   [+] Eliminado: {0}" -f (Format-Bytes $freed)) 'Green'
    return $freed
}

function Remove-PathSafe {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [int64]0
    }

    $before = Get-ItemSize -Path $Path
    $script:TotalAnalyzedBytes += $before
    Write-Log ("   [i] Encontrado: {0}" -f (Format-Bytes $before)) 'Gray'

    if ($before -le 0) {
        Add-BlockStat -Analyzed $before -Freed 0
        return [int64]0
    }

    if (-not (Confirm-Cleanup -Name $script:CurrentSection -Bytes $before)) {
        Write-Log "   [i] Sin borrar" 'Gray'
        Add-BlockStat -Analyzed $before -Freed 0
        return [int64]0
    }

    try {
        Remove-Item -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
    } catch {
        $script:ErrorCount++
        Write-Log "   [!] Error borrando '$Path': $($_.Exception.Message)" 'Yellow'
    }

    $after = Get-ItemSize -Path $Path
    $freed = [Math]::Max([int64]0, $before - $after)
    $script:TotalFreedBytes += $freed
    Add-BlockStat -Analyzed $before -Freed $freed
    Write-Log ("   [+] Eliminado: {0}" -f (Format-Bytes $freed)) 'Green'
    return $freed
}

function Start-Section {
    param([string]$Title)

    Write-Log ''
    Write-Log '============================================================' 'Cyan'
    Write-Log $Title 'Cyan'
    Write-Log '============================================================' 'Cyan'
}

function Invoke-CleanupTarget {
    param(
        [string]$Name,
        [string]$Path,
        [switch]$RemoveRoot
    )

    Write-Log ">> $Name" 'White'
    $script:CurrentSection = $Name

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Log "   [i] No existe" 'DarkGray'
        return
    }

    if ($RemoveRoot) {
        Remove-PathSafe -Path $Path | Out-Null
    } else {
        Remove-ChildrenSafe -Path $Path | Out-Null
    }
}

function Stop-ServiceIfRunning {
    param([string]$Name)

    try {
        $service = Get-Service -Name $Name -ErrorAction Stop
        if ($service.Status -eq 'Running') {
            Stop-Service -Name $Name -Force -ErrorAction Stop
            return $true
        }
    } catch {
        Write-Log "   [!] No se pudo detener servicio ${Name}: $($_.Exception.Message)" 'Yellow'
        $script:ErrorCount++
    }
    return $false
}

function Start-ServiceIfStoppedByUs {
    param(
        [string]$Name,
        [bool]$WasRunning
    )

    if (-not $WasRunning) {
        return
    }

    try {
        Start-Service -Name $Name -ErrorAction Stop
    } catch {
        Write-Log "   [!] No se pudo reiniciar servicio ${Name}: $($_.Exception.Message)" 'Yellow'
        $script:ErrorCount++
    }
}

function Clear-RecycleBinSafe {
    if (-not (Test-RunBlock 'recycle_bin')) {
        return
    }
    Set-CurrentBlock 'recycle_bin'
    Start-Section '3. PAPELERA DE RECICLAJE'
    Write-Log '>> Papelera de reciclaje' 'White'
    $script:CurrentSection = 'Papelera de reciclaje'

    if (-not (Confirm-Cleanup -Name $script:CurrentSection -Bytes 1)) {
        Write-Log '   [i] Sin borrar' 'Gray'
        return
    }

    try {
        Clear-RecycleBin -Force -ErrorAction Stop
        Write-Log '   [+] Papelera vaciada (Clear-RecycleBin)' 'Green'
    } catch {
        $script:ErrorCount++
        Write-Log "   [!] Error vaciando papelera: $($_.Exception.Message)" 'Yellow'
    }
}

function Clear-WindowsUpdateCache {
    if (-not (Test-RunBlock 'windows_update')) {
        return
    }
    Set-CurrentBlock 'windows_update'
    Start-Section '2. WINDOWS UPDATE Y DELIVERY OPTIMIZATION'

    if (-not $script:IsAdmin) {
        Write-Log '>> Windows Update cache' 'White'
        Write-Log '   [!] Requiere ejecutar como Administrador' 'Yellow'
        return
    }

    Write-Log '>> Windows Update cache' 'White'
    $script:CurrentSection = 'Windows Update cache'
    $path = Join-Path $env:WINDIR 'SoftwareDistribution\Download'
    $bitsWasRunning = $false
    $wuaWasRunning = $false

    if ((Test-Path -LiteralPath $path) -and (-not $DryRun) -and ($Auto -or (Confirm-Cleanup -Name $script:CurrentSection -Bytes (Get-ItemSize $path)))) {
        $bitsWasRunning = Stop-ServiceIfRunning -Name 'BITS'
        $wuaWasRunning = Stop-ServiceIfRunning -Name 'wuauserv'
        Remove-ChildrenSafe -Path $path | Out-Null
        Start-ServiceIfStoppedByUs -Name 'wuauserv' -WasRunning $wuaWasRunning
        Start-ServiceIfStoppedByUs -Name 'BITS' -WasRunning $bitsWasRunning
    } else {
        Invoke-CleanupTarget -Name 'Windows Update cache' -Path $path
    }

    Invoke-CleanupTarget -Name 'Delivery Optimization cache' -Path (Join-Path $env:ProgramData 'Microsoft\Windows\DeliveryOptimization\Cache')
}

function Clear-SystemTemp {
    if (-not (Test-RunBlock 'system_temp')) {
        return
    }
    Set-CurrentBlock 'system_temp'
    Start-Section '1. ARCHIVOS TEMPORALES DEL SISTEMA'
    Invoke-CleanupTarget -Name 'Windows Temp' -Path (Join-Path $env:WINDIR 'Temp')
    Invoke-CleanupTarget -Name 'Temp del usuario' -Path ([System.IO.Path]::GetTempPath())
    Invoke-CleanupTarget -Name 'Reportes de errores de Windows' -Path (Join-Path $env:ProgramData 'Microsoft\Windows\WER\ReportArchive')
    Invoke-CleanupTarget -Name 'Reportes de errores pendientes' -Path (Join-Path $env:ProgramData 'Microsoft\Windows\WER\ReportQueue')
}

function Clear-BrowserCaches {
    if ($SkipBrowsers -or -not (Test-RunBlock 'browsers')) {
        return
    }
    Set-CurrentBlock 'browsers'

    Start-Section '4. CACHES DE NAVEGADORES'

    $local = $env:LOCALAPPDATA
    $roaming = $env:APPDATA
    $targets = @(
        @{ Name = 'Chrome Cache'; Path = Join-Path $local 'Google\Chrome\User Data\Default\Cache' },
        @{ Name = 'Chrome Code Cache'; Path = Join-Path $local 'Google\Chrome\User Data\Default\Code Cache' },
        @{ Name = 'Chrome GPUCache'; Path = Join-Path $local 'Google\Chrome\User Data\Default\GPUCache' },
        @{ Name = 'Edge Cache'; Path = Join-Path $local 'Microsoft\Edge\User Data\Default\Cache' },
        @{ Name = 'Edge Code Cache'; Path = Join-Path $local 'Microsoft\Edge\User Data\Default\Code Cache' },
        @{ Name = 'Edge GPUCache'; Path = Join-Path $local 'Microsoft\Edge\User Data\Default\GPUCache' },
        @{ Name = 'Firefox Cache'; Path = Join-Path $local 'Mozilla\Firefox\Profiles' },
        @{ Name = 'Opera Cache'; Path = Join-Path $roaming 'Opera Software\Opera Stable\Cache' },
        @{ Name = 'Brave Cache'; Path = Join-Path $local 'BraveSoftware\Brave-Browser\User Data\Default\Cache' }
    )

    foreach ($target in $targets) {
        if ($target.Name -eq 'Firefox Cache' -and (Test-Path -LiteralPath $target.Path)) {
            Get-ChildItem -LiteralPath $target.Path -Directory -ErrorAction SilentlyContinue |
                ForEach-Object {
                    Invoke-CleanupTarget -Name "Firefox Cache [$($_.Name)]" -Path (Join-Path $_.FullName 'cache2')
                }
        } else {
            Invoke-CleanupTarget -Name $target.Name -Path $target.Path
        }
    }
}

function Clear-AppCaches {
    if ($SkipApps -or -not (Test-RunBlock 'apps')) {
        return
    }
    Set-CurrentBlock 'apps'

    Start-Section '5. CACHES DE APLICACIONES'

    $local = $env:LOCALAPPDATA
    $roaming = $env:APPDATA
    $targets = @(
        @{ Name = 'Microsoft Teams Cache'; Path = Join-Path $roaming 'Microsoft\Teams\Cache' },
        @{ Name = 'Microsoft Teams GPUCache'; Path = Join-Path $roaming 'Microsoft\Teams\GPUCache' },
        @{ Name = 'Discord Cache'; Path = Join-Path $roaming 'discord\Cache' },
        @{ Name = 'Discord Code Cache'; Path = Join-Path $roaming 'discord\Code Cache' },
        @{ Name = 'Slack Cache'; Path = Join-Path $roaming 'Slack\Cache' },
        @{ Name = 'Spotify Data Cache'; Path = Join-Path $local 'Spotify\Data' },
        @{ Name = 'Visual Studio Code Cache'; Path = Join-Path $roaming 'Code\Cache' },
        @{ Name = 'Visual Studio Code CachedData'; Path = Join-Path $roaming 'Code\CachedData' },
        @{ Name = 'NVIDIA DXCache'; Path = Join-Path $local 'NVIDIA\DXCache' },
        @{ Name = 'NVIDIA GLCache'; Path = Join-Path $local 'NVIDIA\GLCache' },
        @{ Name = 'DirectX Shader Cache'; Path = Join-Path $local 'D3DSCache' }
    )

    foreach ($target in $targets) {
        Invoke-CleanupTarget -Name $target.Name -Path $target.Path
    }
}

function Clear-AggressiveTargets {
    if (-not $Aggressive -or -not (Test-RunBlock 'deep')) {
        return
    }
    Set-CurrentBlock 'deep'

    Start-Section '6. LIMPIEZA PROFUNDA'

    Invoke-CleanupTarget -Name 'Prefetch' -Path (Join-Path $env:WINDIR 'Prefetch')
    Invoke-CleanupTarget -Name 'Mini dumps' -Path (Join-Path $env:WINDIR 'Minidump')
    Invoke-CleanupTarget -Name 'Memory dump' -Path (Join-Path $env:WINDIR 'MEMORY.DMP') -RemoveRoot
    Invoke-CleanupTarget -Name 'Windows.old' -Path (Join-Path (Split-Path $env:WINDIR -Parent) 'Windows.old') -RemoveRoot
    Invoke-CleanupTarget -Name 'Logs CBS archivados' -Path (Join-Path $env:WINDIR 'Logs\CBS')
    Invoke-CleanupTarget -Name 'Logs DISM' -Path (Join-Path $env:WINDIR 'Logs\DISM')
}

function Write-Header {
    Write-Log '============================================================' 'Cyan'
    Write-Log '  LIMPIADOR DE BASURA - Windows 10/11' 'Cyan'
    Write-Log '============================================================' 'Cyan'
    Write-Log "  Version    : $script:Version"
    Write-Log "  Ejecucion  : $($script:StartedAt.ToString('o'))"
    Write-Log "  Equipo     : $env:COMPUTERNAME"
    Write-Log "  Usuario    : $env:USERNAME"
    Write-Log "  Admin      : $(if ($script:IsAdmin) { 'Si' } else { 'No' })"
    Write-Log "  Modo       : $(if ($DryRun) { 'Analisis (DryRun)' } elseif ($Aggressive) { 'Limpieza profunda' } else { 'Limpieza real' })"
    Write-Log "  Log        : $script:LogPath"
}

function Write-Summary {
    foreach ($key in $script:BlockStats.Keys) {
        $script:BlockStats[$key].total_analyzed = Format-Bytes $script:BlockStats[$key].analyzed_bytes
        $script:BlockStats[$key].total_freed = Format-Bytes $script:BlockStats[$key].freed_bytes
    }

    Write-Log ''
    Write-Log '============================================================' 'Cyan'
    Write-Log 'RESUMEN DE LIMPIEZA' 'Cyan'
    Write-Log '============================================================' 'Cyan'
    Write-Log "  MODO: $(if ($DryRun) { 'ANALISIS - NO SE BORRO NADA' } else { 'LIMPIEZA REAL' })"
    Write-Log ''
    Write-Log ("  Total analizado   : {0}" -f (Format-Bytes $script:TotalAnalyzedBytes))
    Write-Log ("  Total liberado    : {0}" -f (Format-Bytes $script:TotalFreedBytes))
    Write-Log ("  Errores           : {0}" -f $script:ErrorCount)
    Write-Log "  Log guardado en   : $script:LogPath"
    Write-Log ''
    Write-Log '============================================================' 'Cyan'
}

function Write-SummaryJson {
    if ([string]::IsNullOrWhiteSpace($SummaryPath)) {
        return
    }

    $plan = @()
    foreach ($key in @('system_temp', 'windows_update', 'recycle_bin', 'browsers', 'apps', 'deep')) {
        $block = $script:BlockStats[$key]
        if ($block.analyzed_bytes -gt 0 -or $key -eq 'recycle_bin') {
            $plan += [ordered]@{
                id = $block.id
                name = $block.name
                analyzed_bytes = $block.analyzed_bytes
                freed_bytes = $block.freed_bytes
                total_analyzed = $block.total_analyzed
                total_freed = $block.total_freed
            }
        }
    }

    $summary = [ordered]@{
        total_analyzed = Format-Bytes $script:TotalAnalyzedBytes
        total_freed = Format-Bytes $script:TotalFreedBytes
        errors = $script:ErrorCount
        blocks = $plan
    }

    $summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8
}

try {
    Write-Header
    Clear-SystemTemp
    Clear-WindowsUpdateCache
    Clear-RecycleBinSafe
    Clear-BrowserCaches
    Clear-AppCaches
    Clear-AggressiveTargets
    Write-Summary
    Write-SummaryJson
    exit 0
} catch {
    $script:ErrorCount++
    Write-Log ''
    Write-Log "ERROR CRITICO: $($_.Exception.Message)" 'Red'
    Write-Summary
    Write-SummaryJson
    exit 1
}
