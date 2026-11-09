<#
.SYNOPSIS
  Estado del superagente (dsh-superagent) sin panel y sin tmux.

.DESCRIPTION
  Consulta la API local del panel (GET /orchestrator/api/state) y resume setup, salud,
  carga y pausa. Devuelve los mismos códigos que el `status` oficial del prototipo:

    0  el servicio funciona con normalidad
    1  no responde, hay un error del runtime o hay dos instancias
    2  funciona, pero una parte (Source, sync:<id>) está en error: reiniciar no lo arregla
    3  funciona pero espera setup: el panel dice qué falta

  Límite conocido: la duplicidad de instancias no se detecta aquí (si el puerto responde,
  se asume una instancia). Para eso está el `scripts/dsh-superagent status` del prototipo,
  que en Windows no aplica.

  Requiere PowerShell 5.1 (el de este equipo). Solo hace un GET: no arranca, no para y no
  escribe nada.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\superagent\estado.ps1

.EXAMPLE
  ... -Puerto 3082 -Json     # vuelca la respuesta cruda; el código de salida sigue siendo el de estado
#>
[CmdletBinding()]
param(
    [string]$Servidor = '127.0.0.1',
    [int]$Puerto = 3082,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$uri = "http://{0}:{1}/orchestrator/api/state" -f $Servidor, $Puerto

function Get-EstadoCrudo {
    param([string]$Uri)
    $cabeceras = @{ 'x-orchestrator-request' = '1' }
    return Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 8 -Headers $cabeceras
}

function Write-NoResponde {
    param([string]$Uri, [int]$Puerto)
    Write-Output "superagente: NO responde en $Uri"
    Write-Output "  Causa habitual: el perfil 'superagent' no esta arrancado, o el puerto no es $Puerto."
    Write-Output "  Arranque y diagnostico: tools/superagent/INSTALAR.md"
}

try {
    $respuesta = Get-EstadoCrudo -Uri $uri
}
catch [System.Net.WebException] {
    if ($null -ne $_.Exception.Response) {
        $codigoHttp = [int]$_.Exception.Response.StatusCode
        Write-Output ("superagente: {0} responde con HTTP {1}, pero no es la API del panel." -f $uri, $codigoHttp)
        Write-Output "  Comprobar el puerto: el panel usa el que fije webserver.port (aqui 3082); OmniRoute 20128 y la GUI de DSH 19387."
    }
    else {
        Write-NoResponde -Uri $uri -Puerto $Puerto
    }
    exit 1
}
catch {
    Write-NoResponde -Uri $uri -Puerto $Puerto
    exit 1
}

try {
    $estado = $respuesta.Content | ConvertFrom-Json
}
catch {
    Write-Output "superagente: responde en $uri pero no devuelve JSON de estado."
    Write-Output "  Revisar que el puerto sea el del panel y no el de otra aplicacion."
    exit 1
}

# --- clasificar -------------------------------------------------------------
$problema = $null
if ($null -ne $estado.setup) { $problema = $estado.setup.problem }

$errorRuntime = @()
$errorPartes = @()
if ($null -ne $estado.health) {
    foreach ($prop in $estado.health.PSObject.Properties) {
        $entrada = $prop.Value
        if ($null -eq $entrada) { continue }
        if ($entrada.state -ne 'error') { continue }
        $detalle = ''
        if ($entrada.detail) { $detalle = [string]$entrada.detail }
        $linea = if ($detalle -ne '') { "{0}: {1}" -f $prop.Name, $detalle } else { [string]$prop.Name }
        if ($prop.Name -eq 'runtime') { $errorRuntime += $linea } else { $errorPartes += $linea }
    }
}

$codigo = 0
if ($null -ne $problema) { $codigo = 3 }
elseif ($errorRuntime.Count -gt 0) { $codigo = 1 }
elseif ($errorPartes.Count -gt 0) { $codigo = 2 }

# --- informar ---------------------------------------------------------------
if ($Json) { Write-Output $respuesta.Content }

if (-not $Json) {
    $carga = ''
    if ($null -ne $estado.load) {
        $carga = "running={0} queued={1} maxWorkers={2}" -f $estado.load.running, $estado.load.queued, $estado.load.maxWorkers
    }
    $pausa = 'activo'
    if ($estado.paused -eq $true) { $pausa = 'PAUSADO (no procesa hasta que una persona lo reanude)' }

    switch ($codigo) {
        3 {
            Write-Output "superagente: ESPERA SETUP (exit 3)"
            if ($problema.place) { Write-Output ("  lugar : {0}" -f $problema.place) }
            if ($problema.code) { Write-Output ("  codigo: {0}" -f $problema.code) }
            if ($problema.detail) { Write-Output ("  detalle: {0}" -f $problema.detail) }
            if ($problema.values) {
                $valores = ($problema.values.PSObject.Properties | ForEach-Object { "{0}={1}" -f $_.Name, $_.Value }) -join ', '
                if ($valores) { Write-Output ("  valores: {0}" -f $valores) }
            }
            Write-Output "  No reiniciar: el panel enlaza el ajuste que falta."
        }
        1 {
            Write-Output ("superagente: ERROR DEL RUNTIME (exit 1) - {0}" -f $carga)
            foreach ($linea in $errorRuntime) { Write-Output ("  {0}" -f $linea) }
            Write-Output "  Un reinicio puede arreglarlo; si no, el log del perfil dice la causa."
        }
        2 {
            Write-Output ("superagente: FUNCIONA CON PARTES EN ERROR (exit 2) - {0}" -f $carga)
            foreach ($linea in $errorPartes) { Write-Output ("  {0}" -f $linea) }
            Write-Output "  Reiniciar no lo arregla: cada parte limpia su error cuando vuelve a funcionar."
        }
        default {
            Write-Output ("superagente: OK (exit 0) - {0} - {1}" -f $carga, $pausa)
        }
    }
}

exit $codigo
