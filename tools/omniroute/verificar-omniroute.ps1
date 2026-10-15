<#
.SYNOPSIS
    Comprueba la salud del gateway OmniRoute y del arranque automatico.

.DESCRIPTION
    No depende de CIM/WMI (que puede estar restringido): usa TCP directo y
    netstat. Devuelve un resumen con OK/FALLO por apartado.

.EXAMPLE
    .\verificar-omniroute.ps1
    .\verificar-omniroute.ps1 -ApiKey 'laDeEndpoints' -Probe
#>
[CmdletBinding()]
param(
    [int]$Port = 20128,
    [string]$HermesHome = 'E:\hermes-data',
    [string]$ApiKey,
    [switch]$Probe
)

$fallos = 0
function Check($nombre, $ok, $detalle) {
    if ($ok) { Write-Host ("  [ OK ] {0,-34} {1}" -f $nombre, $detalle) -ForegroundColor Green }
    else     { Write-Host ("  [FALLO] {0,-34} {1}" -f $nombre, $detalle) -ForegroundColor Red; $script:fallos++ }
}

Write-Host "`n== OmniRoute: comprobacion ==" -ForegroundColor Cyan

# 1. puerto
$tcp = $false
try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', $Port)
    $tcp = $true
    $c.Dispose()
} catch { $tcp = $false }
Check "puerto $Port (127.0.0.1)" $tcp $(if ($tcp) { 'escuchando' } else { 'cerrado' })

# 2. a que interfaz esta atado
$linea = (netstat -ano | Select-String ":$Port\s" | Select-String 'LISTENING' | Select-Object -First 1)
if ($linea) {
    $texto = ($linea -join ' ').Trim() -replace '\s+', ' '
    Check 'interfaz de escucha' $true $texto
    if ($texto -match '^TCP\s+0\.0\.0\.0') {
        Write-Host '         aviso: escucha en TODAS las interfaces (no solo localhost)' -ForegroundColor Yellow
    }
} else {
    Check 'interfaz de escucha' $false 'sin linea LISTENING'
}

# 3. panel web
if ($tcp) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -TimeoutSec 10 -UseBasicParsing
        Check 'panel HTTP /' ($r.StatusCode -lt 500) "HTTP $($r.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Check 'panel HTTP /' ($code -ge 200 -and $code -lt 500) "HTTP $code"
    }
}

# 4. API /v1/models
if ($tcp -and $ApiKey) {
    try {
        $h = @{ Authorization = "Bearer $ApiKey" }
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/models" -Headers $h -TimeoutSec 15
        $n = @($r.data).Count
        Check 'API /v1/models' ($n -gt 0) "$n modelos"
    } catch {
        Check 'API /v1/models' $false $_.Exception.Message
    }
} elseif (-not $ApiKey) {
    Write-Host '  [skip] API /v1/models                 (pasa -ApiKey para probarla)' -ForegroundColor DarkGray
}

# 5. daemon y candado
$pyw = Join-Path (Split-Path ((Get-Command python.exe -ErrorAction SilentlyContinue).Source)) 'pythonw.exe'
$lock = Join-Path $HermesHome 'logs\omniroute-autostart.lock'
if (Test-Path $lock) {
    $pidLock = (Get-Content $lock -ErrorAction SilentlyContinue | Select-Object -First 1)
    $vivo = $false
    if ($pidLock) { $vivo = [bool](Get-Process -Id ([int]$pidLock) -ErrorAction SilentlyContinue) }
    Check 'daemon (candado)' $vivo "PID $pidLock $(if ($vivo) { 'vivo' } else { 'no existe: candado obsoleto' })"
} else {
    Write-Host '  [skip] daemon (candado)               sin fichero de candado' -ForegroundColor DarkGray
}

# 6. autostart instalado
$startup = [Environment]::GetFolderPath('Startup')
$vbs = Join-Path $startup 'omniroute_gateway.vbs'
Check 'autostart en Inicio' (Test-Path $vbs) $vbs
$viejos = Get-ChildItem $startup -Filter 'omniroute_deepseek_autostart*' -ErrorAction SilentlyContinue
Check 'sin lanzadores v1' (-not $viejos) $(if ($viejos) { 'quedan restos v1' } else { 'limpio' })

# 7. ultimas lineas del log
$log = Join-Path $HermesHome 'logs\omniroute-autostart.log'
if (Test-Path $log) {
    Write-Host "`n-- ultimas 8 lineas de $log --" -ForegroundColor Cyan
    Get-Content $log -Tail 8 | ForEach-Object { "  $_" }
}

# 8. prueba opcional de extremo a extremo
if ($Probe -and $ApiKey) {
    Write-Host "`n-- prueba real de inferencia (modelo auto) --" -ForegroundColor Cyan
    try {
        $body = @{ model = 'auto'; messages = @(@{ role = 'user'; content = 'Responde solo: OK' }) } | ConvertTo-Json -Depth 5
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/chat/completions" -Method Post `
             -Headers @{ Authorization = "Bearer $ApiKey"; 'Content-Type' = 'application/json' } `
             -Body $body -TimeoutSec 90
        Write-Host ("  respuesta: " + $r.choices[0].message.content) -ForegroundColor Green
        Write-Host ("  modelo enrutado: " + $r.model) -ForegroundColor Green
    } catch {
        Write-Host "  fallo: $($_.Exception.Message)" -ForegroundColor Red
        $script:fallos++
    }
}

Write-Host ""
if ($fallos -eq 0) { Write-Host "RESULTADO: todo correcto.`n" -ForegroundColor Green }
else { Write-Host "RESULTADO: $fallos comprobacion(es) fallidas.`n" -ForegroundColor Red }
