# Verificacion en produccion de la FILA 17 (apps con proxy propio fuera de las filas 1-16).
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File tools/verificar-fila17.ps1 [-Iteraciones 30] [-Intervalo 180]
param(
    [int]$Iteraciones = 30,
    [int]$Intervalo = 180
)

$apps = @(
    @{ App = 'prompts_predeterminados'; Tipo = 'modelo' },
    @{ App = 'generador_ia';            Tipo = 'modelo' },
    @{ App = 'generador_ia_flux';       Tipo = 'modelo' },
    @{ App = 'asistente_inmoviliario';  Tipo = 'texto' },
    @{ App = 'out';                     Tipo = 'propio' },
    @{ App = 'protocolo_gemini_web';    Tipo = 'modelo' },
    @{ App = 'angulos_de_camara/images';Tipo = 'modelo' },
    @{ App = 'viaje_tiempo';            Tipo = 'propio' }
)

$pendientes = [System.Collections.Generic.HashSet[string]]::new()
foreach ($a in $apps) { [void]$pendientes.Add($a.App) }
$hechas = @()

for ($i = 1; $i -le $Iteraciones -and $pendientes.Count -gt 0; $i++) {
    $stamp = Get-Date -Format 'HH:mm:ss'
    Write-Output "===== ronda $i ($stamp) ====="
    foreach ($a in $apps) {
        if (-not $pendientes.Contains($a.App)) { continue }
        $cb = Get-Random
        $base = "https://atnojs.es/apps/$($a.App)"
        $ok = $false
        $detalle = ''
        switch ($a.Tipo) {
            'modelo' {
                try {
                    $body = (Invoke-WebRequest -Uri "$base/proxy.php?cb=$cb" -Method Post -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 60 -UseBasicParsing).Content
                    $ok = $body -match 'gemini-2'
                    if (-not $ok) { $detalle = "health antiguo: $($body.Substring(0,[Math]::Min(80,$body.Length)))" }
                } catch { $detalle = $_.Exception.Message }
            }
            'texto' {
                try {
                    $body = (Invoke-WebRequest -Uri "$base/proxy.php?cb=$cb" -Method Post -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 60 -UseBasicParsing).Content
                    $ok = $body -match 'configured' -and $body -match 'textModels'
                    if (-not $ok) { $detalle = "health antiguo: $($body.Substring(0,[Math]::Min(80,$body.Length)))" }
                } catch { $detalle = $_.Exception.Message }
            }
            'propio' {
                # Apps sin health canonico: el marcador es que el proxy siga vivo.
                try {
                    $r = Invoke-WebRequest -Uri "$base/proxy.php?cb=$cb" -Method Post -Body '{}' -ContentType 'application/json' -TimeoutSec 60 -UseBasicParsing
                    $ok = $true
                    $detalle = "proxy responde $($r.StatusCode)"
                } catch {
                    $resp = $_.Exception.Response
                    if ($resp) { $ok = $true; $detalle = "proxy responde $([int]$resp.StatusCode) (vivo)" }
                    else { $detalle = $_.Exception.Message }
                }
            }
        }
        if ($ok) {
            Write-Output ("{0}  OK   {1}   {2}" -f $stamp, $a.App, $detalle)
            $hechas += "$($a.App): OK"
            [void]$pendientes.Remove($a.App)
        } else {
            Write-Output ("{0}  ...  {1}   {2}" -f $stamp, $a.App, $detalle)
        }
    }
    if ($pendientes.Count -gt 0 -and $i -lt $Iteraciones) { Start-Sleep -Seconds $Intervalo }
}

Write-Output ''
Write-Output '===== RESUMEN FILA 17 ====='
$hechas | ForEach-Object { Write-Output $_ }
if ($pendientes.Count -eq 0) { Write-Output 'FILA 17 VERIFICADA EN PRODUCCION' }
else { Write-Output "SIN PUBLICAR TODAVIA: $($pendientes -join ', ')" }
