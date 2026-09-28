# Prueba real de gemini-2 contra el proxy canonico en produccion (tarea 1 del §9
# de apps/ESTADO_MIGRACION_APPS.md): comprobar si convierte a linea una FOTO REAL.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File tools/probar-gemini2.ps1 [-Modelo gemini-2] [-Prompt "..."]

param(
    [string]$App = 'dibujo_lineas_copia',
    [string]$Foto = 'E:\ANTIGRAVITY\apps\dibujo_lineas_local\salida\ORIGINAL_ORIGINAL_ORIGINAL_WhatsApp Image 2026-04-28 at 15.16.53.jpeg',
    [string]$Modelo = 'gemini-2',
    [string]$Prompt = ''
)

if (-not (Test-Path -LiteralPath $Foto)) { Write-Output "No existe la foto: $Foto"; exit 1 }
$bytes = [System.IO.File]::ReadAllBytes($Foto)
Write-Output "Foto: $Foto ($([math]::Round($bytes.Length/1024)) KB)"
$ext = [System.IO.Path]::GetExtension($Foto).ToLower()
$mime = if ($ext -eq '.png') { 'image/png' } elseif ($ext -eq '.webp') { 'image/webp' } else { 'image/jpeg' }

# El payload se construye con la clase JSON de .NET (sin problemas de codificacion)
# y se envia con bytes UTF-8 explicitos.
$payloadObj = [ordered]@{
    image    = [Convert]::ToBase64String($bytes)
    mimeType = $mime
    model    = $Modelo
}
if ($Prompt -ne '') { $payloadObj['prompt'] = $Prompt }
$payloadJson = $payloadObj | ConvertTo-Json -Compress
$payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
Write-Output "Payload: $([math]::Round($payloadBytes.Length/1024)) KB"

$cb = Get-Random
$url = "https://atnojs.es/apps/$App/proxy.php?cb=$cb"
$t0 = Get-Date
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
$req = [System.Net.HttpWebRequest]::Create($url)
$req.Method = 'POST'
$req.ContentType = 'application/json; charset=utf-8'
$req.Timeout = 300000
$req.ReadWriteTimeout = 300000
$req.ContentLength = $payloadBytes.Length
try {
    $stream = $req.GetRequestStream()
    $stream.Write($payloadBytes, 0, $payloadBytes.Length)
    $stream.Close()
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $body = $reader.ReadToEnd()
    $reader.Close()
    $ms = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
    Write-Output "HTTP $([int]$resp.StatusCode) en $ms s"
    $json = $body | ConvertFrom-Json
    Write-Output "modelo=$($json.model)  mime=$($json.mimeType)  $($json.width)x$($json.height)  aspect=$($json.aspectRatio)"
    if ($json.image) {
        $out = Join-Path $env:TEMP "gemini2_resultado_$Modelo.png"
        [System.IO.File]::WriteAllBytes($out, [Convert]::FromBase64String($json.image))
        Write-Output "Imagen guardada: $out ($([math]::Round((Get-Item $out).Length/1024)) KB)"
    } else {
        Write-Output "Sin imagen: $($body.Substring(0, [Math]::Min(400, $body.Length)))"
    }
} catch [System.Net.WebException] {
    $r = $_.Exception.Response
    if ($r) {
        $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
        Write-Output "HTTP $([int]$r.StatusCode): $($reader.ReadToEnd())"
    } else {
        Write-Output "ERR: $($_.Exception.Message)"
    }
}
