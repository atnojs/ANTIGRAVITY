<#
.SYNOPSIS
    Agente del Limpiador Windows para Antigravity
.DESCRIPTION
    Se ejecuta en Windows y hace polling al servidor Hostinger cada 15 segundos.
    Cuando detecta una orden de limpieza, ejecuta Clean-WindowsJunk.ps1
    con los parametros adecuados y sube los resultados al servidor.
.PARAMETER ConfigPath
    Ruta al archivo JSON de configuracion. Por defecto: config.json junto a este script.
.EXAMPLE
    .\agente-limpiador.ps1
    Ejecuta el agente con la configuracion por defecto.
.EXAMPLE
    .\agente-limpiador.ps1 -ConfigPath "C:\Users\anton\Desktop\config.json"
.NOTES
    Dejalo corriendo en una ventana de PowerShell o configuralo como tarea programada
    para que se ejecute al iniciar Windows.
#>

[CmdletBinding()]
param(
    [string]$ConfigPath = ""
)

# ============================================================
# CONFIGURACION POR DEFECTO
# ============================================================

$DefaultConfig = @{
    server_url  = "https://tudominio.com/limpiador-windows/proxy.php"
    api_key     = "antigravity_limpiador_2026"
    poll_seconds = 15
    script_path = ""  # Se autodetecta si esta vacio
}

# ============================================================
# FUNCIONES
# ============================================================

function Write-AgentLog {
    param([string]$Text, [string]$Color = "White")
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $msg = "[$time] $Text"
    Write-Host $msg -ForegroundColor $Color
}

function Load-Config {
    param([string]$Path)

    $config = $DefaultConfig.Clone()

    # Intentar cargar desde archivo JSON
    if ($Path -and (Test-Path $Path)) {
        try {
            $fileConfig = Get-Content $Path -Raw -ErrorAction Stop | ConvertFrom-Json
            foreach ($prop in $fileConfig.PSObject.Properties) {
                $config[$prop.Name] = $prop.Value
            }
            Write-AgentLog "Config cargada desde: $Path" "Green"
        } catch {
            Write-AgentLog "Error al leer config.json, usando defaults: $_" "Yellow"
        }
    } else {
        # Buscar config.json junto a este script
        $autoPath = Join-Path $PSScriptRoot "config.json"
        if (Test-Path $autoPath) {
            try {
                $fileConfig = Get-Content $autoPath -Raw -ErrorAction Stop | ConvertFrom-Json
                foreach ($prop in $fileConfig.PSObject.Properties) {
                    $config[$prop.Name] = $prop.Value
                }
                Write-AgentLog "Config cargada desde: $autoPath" "Green"
            } catch {
                Write-AgentLog "Error al leer config.json, usando defaults: $_" "Yellow"
            }
        }
    }

    # Autodetectar ruta del script de limpieza
    if (-not $config.script_path) {
        $candidate = Join-Path $PSScriptRoot "..\..\..\..\Claude Code Ollama\Clean-WindowsJunk.ps1"
        if (Test-Path $candidate) {
            $config.script_path = (Resolve-Path $candidate).Path
        } else {
            $candidate = Join-Path $PSScriptRoot "Clean-WindowsJunk.ps1"
            if (Test-Path $candidate) {
                $config.script_path = (Resolve-Path $candidate).Path
            }
        }
    }

    return $config
}

function Invoke-ApiCall {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )

    $headers = @{
        "X-API-Key" = $script:Config.api_key
        "Accept"    = "application/json"
    }

    $url = $script:Config.server_url + "?action=" + $Endpoint

    $params = @{
        Uri             = $url
        Method          = $Method
        Headers         = $headers
        ContentType     = "application/json"
        UseBasicParsing = $true
        TimeoutSec      = 15
    }

    if ($Body -and $Method -eq "POST") {
        $params.Body = $Body | ConvertTo-Json -Compress
    }

    try {
        $response = Invoke-RestMethod @params
        return $response
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-AgentLog "Error API ($Endpoint): $statusCode - $_" "Red"
        return $null
    }
}

function Get-PendingOrder {
    $result = Invoke-ApiCall -Endpoint "pending"
    if ($result -and $result.ok -and $result.has_order) {
        return $result.order
    }
    return $null
}

function Send-Results {
    param(
        [string]$OrderId,
        [int]$Mode,
        [string]$ModeName,
        [string]$Status,
        [string]$TotalAnalyzed,
        [string]$TotalFreed,
        [int]$Errors,
        [string]$Log,
        [array]$Sections,
        [array]$GuidedPlan = @()
    )

    $body = @{
        order_id       = $OrderId
        mode           = $Mode
        mode_name      = $ModeName
        status         = $Status
        total_analyzed = $TotalAnalyzed
        total_freed    = $TotalFreed
        errors         = $Errors
        log            = $Log
        sections       = $Sections
        computer       = $env:COMPUTERNAME
        user           = $env:USERNAME
        is_admin       = $script:IsAdmin
    }

    if ($GuidedPlan -and $GuidedPlan.Count -gt 0) {
        $body.guided_plan = $GuidedPlan
    }

    $result = Invoke-ApiCall -Endpoint "result" -Method "POST" -Body $body
    return $result
}

function Invoke-CleanupScript {
    param(
        [PSObject]$Order
    )

    $mode = $Order.mode
    $approvedBlocks = @()
    if ($Order.PSObject.Properties.Name -contains 'guided_blocks' -and $Order.guided_blocks) {
        $approvedBlocks = @($Order.guided_blocks)
    }

    # Mapear modo del menu a parametros de Clean-WindowsJunk.ps1
    $params = @{}
    switch ($mode) {
        1 {
            # Analizar solamente
            $params["DryRun"] = $true
            $modeName = "Analisis (sin borrar)"
        }
        2 {
            if ($approvedBlocks.Count -gt 0) {
                $params["Auto"] = $true
                $params["Blocks"] = ($approvedBlocks -join ',')
                $modeName = "Limpieza guiada (bloques aprobados)"
            } else {
                $params["DryRun"] = $true
                $modeName = "Limpieza guiada (analisis por bloques)"
            }
        }
        3 {
            # Limpieza automatica
            $params["Auto"] = $true
            $modeName = "Limpieza automatica"
        }
        4 {
            # Limpieza profunda
            $params["Auto"] = $true
            $params["Aggressive"] = $true
            $modeName = "Limpieza profunda"
        }
        5 {
            # Solo sistema
            $params["Auto"] = $true
            $params["SkipBrowsers"] = $true
            $params["SkipApps"] = $true
            $modeName = "Solo sistema (sin apps)"
        }
    }

    Write-AgentLog "Ejecutando limpieza: $modeName (modo $mode)" "Cyan"
    Write-AgentLog "Script: $($script:Config.script_path)" "Cyan"

    if (-not (Test-Path $script:Config.script_path)) {
        Write-AgentLog "ERROR: No se encuentra el script de limpieza" "Red"
        return @{
            Status        = "error"
            TotalAnalyzed = "0 B"
            TotalFreed    = "0 B"
            Errors        = 1
            Log           = "Error: Script no encontrado en $($script:Config.script_path)"
            ModeName      = $modeName
            Sections      = @()
        }
    }

    # Construir argumentos
    $summaryPath = Join-Path ([System.IO.Path]::GetTempPath()) ("CleanJunk_summary_{0}.json" -f ([guid]::NewGuid().ToString('N')))
    $params["SummaryPath"] = $summaryPath

    $argList = @()
    foreach ($key in $params.Keys) {
        $value = $params[$key]
        if ($value -is [bool] -and $value) {
            $argList += "-$key"
        } elseif ($null -ne $value -and "$value" -ne "") {
            $escaped = "$value".Replace('"', '\"')
            $argList += "-$key `"$escaped`""
        }
    }

    $argString = $argList -join " "

    try {
        Write-AgentLog "Iniciando proceso: powershell.exe -File `"$($script:Config.script_path)`" $argString" "Gray"

        # Ejecutar el script de limpieza
        $process = Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$($script:Config.script_path)`" $argString" `
            -Wait -PassThru -NoNewWindow

        Write-AgentLog "Proceso completado con codigo: $($process.ExitCode)" "Gray"
    } catch {
        Write-AgentLog "Error al ejecutar script: $_" "Red"
        return @{
            Status        = "error"
            TotalAnalyzed = "0 B"
            TotalFreed    = "0 B"
            Errors        = 1
            Log           = "Error al ejecutar: $_"
            ModeName      = $modeName
            Sections      = @()
        }
    }

    # Leer el log generado por Clean-WindowsJunk.ps1
    # Buscar el log mas reciente en %TEMP%
    $tempDir = [System.IO.Path]::GetTempPath()
    $logs = Get-ChildItem -Path $tempDir -Filter "CleanJunk_*.log" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending

    if (-not $logs -or $logs.Count -eq 0) {
        Write-AgentLog "No se encontro archivo de log" "Yellow"
        return @{
            Status        = "completed"
            TotalAnalyzed = "0 B"
            TotalFreed    = "0 B"
            Errors        = 0
            Log           = "Script ejecutado pero no se encontro el log en $tempDir"
            ModeName      = $modeName
            Sections      = @()
        }
    }

    $latestLog = $logs[0]
    Write-AgentLog "Log encontrado: $($latestLog.FullName)" "Gray"

    $logContent = Get-Content $latestLog.FullName -Raw -ErrorAction SilentlyContinue

    # Parsear resultados del log
    $totalAnalyzed = "0 B"
    $totalFreed    = "0 B"
    $errors        = 0
    $sections      = @()
    $guidedPlan    = @()

    if ($logContent) {
        # Buscar "Total analizado   : X"
        if ($logContent -match "(?m)^\s*Total analizado\s+:\s+(.+)$") {
            $totalAnalyzed = $matches[1].Trim()
        }
        # Buscar "Total liberado    : X"
        if ($logContent -match "(?m)^\s*Total liberado\s+:\s+(.+)$") {
            $totalFreed = $matches[1].Trim()
        }
        # Buscar "Errores           : X"
        if ($logContent -match "(?m)^\s*Errores\s+:\s+(\d+)") {
            $errors = [int]$matches[1]
        }

        # Extraer secciones limpiadas
        $sectionMatches = [regex]::Matches($logContent, '>> (.+)')
        foreach ($match in $sectionMatches) {
            $sections += $match.Groups[1].Value.Trim()
        }
    }

    if (Test-Path -LiteralPath $summaryPath) {
        try {
            $summary = Get-Content -LiteralPath $summaryPath -Raw -ErrorAction Stop | ConvertFrom-Json
            if ($summary.blocks) {
                $guidedPlan = @($summary.blocks)
            }
            Remove-Item -LiteralPath $summaryPath -Force -ErrorAction SilentlyContinue
        } catch {
            Write-AgentLog "No se pudo leer resumen guiado: $_" "Yellow"
        }
    }

    Write-AgentLog "Resultado: Analizado=$totalAnalyzed, Liberado=$totalFreed, Errores=$errors" "Green"

    return @{
        Status        = if ($errors -gt 0) { "completed_with_errors" } else { "success" }
        TotalAnalyzed = $totalAnalyzed
        TotalFreed    = $totalFreed
        Errors        = $errors
        Log           = if ($logContent -and $logContent.Length -gt 50000) { $logContent.Substring(0, 50000) + "...[truncado]" } else { "$logContent" }
        ModeName      = $modeName
        Sections      = $sections
        GuidedPlan    = $guidedPlan
    }
}

# ============================================================
# BUCLE PRINCIPAL
# ============================================================

function Start-AgentLoop {
    Clear-Host

    $boxTop = [char]0x2554 + [string]([char]0x2550) * 58 + [char]0x2557
    $boxMid = [char]0x2551
    $boxBot = [char]0x255A + [string]([char]0x2550) * 58 + [char]0x255D

    Write-Host $boxTop -ForegroundColor Cyan
    Write-Host "$boxMid   AGENTE LIMPIADOR WINDOWS - Antigravity" + (" " * 12) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxMid   (" " * 58) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxMid "   Servidor : $($script:Config.server_url)" + (" " * (44 - $script:Config.server_url.Length)) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxMid "   Equipo   : $env:COMPUTERNAME" + (" " * 44) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxMid "   Usuario  : $env:USERNAME" + (" " * 44) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxMid "   Admin    : $(if ($script:IsAdmin) { 'Si' } else { 'No' })" + (" " * 49) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxMid "   Polling  : Cada $($script:Config.poll_seconds)s" + (" " * 43) + "$boxMid" -ForegroundColor Cyan
    Write-Host $boxBot -ForegroundColor Cyan

    Write-Host ""
    Write-AgentLog "Agente iniciado. Esperando ordenes..." "White"
    Write-Host "  Presiona Ctrl+C para detener."
    Write-Host ""

    $consecutiveErrors = 0
    $maxErrors = 5

    while ($true) {
        try {
            Write-AgentLog "Consultando servidor..." "Gray"

            $order = Get-PendingOrder

            if ($order) {
                Write-AgentLog ">>> ORDEN RECIBIDA: $($order.mode_name) (ID: $($order.id))" "Yellow"

                # Ejecutar limpieza
                $results = Invoke-CleanupScript -Order $order

                # Enviar resultados
                Write-AgentLog "Enviando resultados al servidor..." "Cyan"
                $sendResult = Send-Results `
                    -OrderId $order.id `
                    -Mode $order.mode `
                    -ModeName $results.ModeName `
                    -Status $results.Status `
                    -TotalAnalyzed $results.TotalAnalyzed `
                    -TotalFreed $results.TotalFreed `
                    -Errors $results.Errors `
                    -Log $results.Log `
                    -Sections $results.Sections `
                    -GuidedPlan $results.GuidedPlan

                if ($sendResult -and $sendResult.ok) {
                    Write-AgentLog "Resultados enviados correctamente" "Green"
                } else {
                    Write-AgentLog "Error al enviar resultados" "Red"
                }

                Write-AgentLog "Esperando nueva orden..." "White"
                Write-Host ""

                $consecutiveErrors = 0
            } else {
                $consecutiveErrors = 0
            }
        } catch {
            $consecutiveErrors++
            Write-AgentLog "Error en bucle principal ($consecutiveErrors/$maxErrors): $_" "Red"

            if ($consecutiveErrors -ge $maxErrors) {
                Write-AgentLog "Demasiados errores consecutivos. Pausando 60s..." "Yellow"
                Start-Sleep -Seconds 60
                $consecutiveErrors = 0
            }
        }

        # Esperar antes de siguiente poll
        Start-Sleep -Seconds $script:Config.poll_seconds
    }
}

# ============================================================
# INICIO
# ============================================================

# Cargar configuracion
$script:Config = Load-Config -Path $ConfigPath

# Verificar admin
$script:IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $script:IsAdmin) {
    Write-AgentLog "ADVERTENCIA: No eres Administrador. Algunas limpiezas pueden fallar." "Yellow"
    Write-Host ""
}

# Verificar que existe el script de limpieza
if (-not (Test-Path $script:Config.script_path)) {
    Write-AgentLog "ERROR CRITICO: No se encuentra Clean-WindowsJunk.ps1" "Red"
    Write-AgentLog "Ruta buscada: $($script:Config.script_path)" "Red"
    Write-AgentLog "Crea un archivo config.json junto al agente con:" "Yellow"
    Write-AgentLog '  { "script_path": "C:\\ruta\\a\\Clean-WindowsJunk.ps1" }' "Yellow"
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-AgentLog "Script de limpieza encontrado: $($script:Config.script_path)" "Green"

# Verificar que el servidor responde
Write-AgentLog "Verificando conexion con el servidor..." "Cyan"
$statusCheck = Invoke-ApiCall -Endpoint "status"
if ($statusCheck -and $statusCheck.ok) {
    Write-AgentLog "Servidor OK. Resultados previos: $($statusCheck.total_results)" "Green"
} else {
    Write-AgentLog "ADVERTENCIA: El servidor no responde. ¿La URL es correcta?" "Yellow"
    Write-AgentLog "URL: $($script:Config.server_url)" "Yellow"
}

Write-Host ""

# Iniciar bucle
Start-AgentLoop
