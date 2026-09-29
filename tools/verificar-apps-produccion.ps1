# Verificacion en produccion de las apps migradas (filas 14-15 del §6.1).
# Comprueba: health del proxy con el catalogo vigente, history.php sirviendo desde
# history_store/ y la version de los assets servidos. Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/verificar-apps-produccion.ps1
param(
    [int]$Iteraciones = 12,
    [int]$Intervalo = 150
)

# Cada app: ruta publica + tipo de marcador.
#  modelo  -> el health del proxy debe contener el catalogo (gemini-2 / image-2)
#  texto   -> proxy de texto: el health debe devolver 'configured'
#  soloHistorial -> app sin proxy de imagen (solo historial)
$apps = @(
    @{ App = 'vestir_modelo';                   Tipo = 'modelo' },
    @{ App = 'editar_generar';                  Tipo = 'modelo' },
    @{ App = 'editar_generar_1';                Tipo = 'modelo' },
    @{ App = 'galletas_infografias';            Tipo = 'modelo' },
    @{ App = 'prompt_copilot_premium';          Tipo = 'texto' },
    @{ App = 'prompt_estudio';                  Tipo = 'texto' },
    @{ App = 'imagenes_ia/generar';             Tipo = 'modelo' },
    @{ App = 'imagenes_ia/generar_copia';       Tipo = 'modelo' },
    @{ App = 'imagenes_ia/editar';              Tipo = 'modelo' },
    @{ App = 'imagenes_ia/copiar_estilo';       Tipo = 'modelo' },
    @{ App = 'imagenes_ia/combinar_imagenes';   Tipo = 'modelo' },
    @{ App = 'imagenes_ia/estilo_json';         Tipo = 'modelo' },
    @{ App = 'imagenes_ia/upscaler';            Tipo = 'modelo' },
    @{ App = 'color';                           Tipo = 'modelo' },
    @{ App = 'dibujo_lineas';                   Tipo = 'modelo' },
    @{ App = 'ficha_producto';                  Tipo = 'modelo' },
    @{ App = 'outfit';                          Tipo = 'modelo' },
    @{ App = 'generar_imagenes';                Tipo = 'modelo' }
)

$pendientes = [System.Collections.Generic.HashSet[string]]::new()
foreach ($a in $apps) { [void]$pendientes.Add($a.App) }
$resultado = @{}

for ($i = 1; $i -le $Iteraciones -and $pendientes.Count -gt 0; $i++) {
    $stamp = Get-Date -Format 'HH:mm:ss'
    Write-Output "===== ronda $i  ($stamp) ====="
    foreach ($a in $apps) {
        if (-not $pendientes.Contains($a.App)) { continue }
        $cb = Get-Random
        $base = "https://atnojs.es/apps/$($a.App)"
        $estado = 'pendiente'
        $detalle = ''

        # 1) health del proxy
        try {
            $body = (Invoke-WebRequest -Uri "$base/proxy.php?cb=$cb" -Method Post -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 60 -UseBasicParsing).Content
            if ($a.Tipo -eq 'texto') {
                if ($body -match 'configured') { $estado = 'ok' } else { $detalle = "health sin configured: $($body.Substring(0,[Math]::Min(90,$body.Length)))" }
            } else {
                if ($body -match 'gemini-2') { $estado = 'ok' } else { $detalle = "health antiguo: $($body.Substring(0,[Math]::Min(90,$body.Length)))" }
            }
        } catch {
            $estado = 'error'
            $detalle = $_.Exception.Message
        }

        # 2) historial en history_store/ (si la app tiene history.php)
        $hist = ''
        try {
            $hj = (Invoke-WebRequest -Uri "$base/history.php?action=list&app=$($a.App.Split('/')[-1])&cb=$cb" -TimeoutSec 90 -UseBasicParsing).Content | ConvertFrom-Json
            if ($hj.success) {
                $conLegacy = @($hj.history | Where-Object { $_.imageUrl -like '*history_data*' }).Count
                $conStore  = @($hj.history | Where-Object { $_.imageUrl -like '*history_store*' }).Count
                $hist = "historial=$($hj.count) store=$conStore legacy=$conLegacy"
                if ($conLegacy -gt 0 -and $conStore -eq 0) { $detalle = "$detalle | historial sin migrar" }
            } else { $hist = 'history.php sin success' }
        } catch { $hist = 'history.php no responde' }

        $linea = "{0,-32} {1,-10} {2}  {3}" -f $a.App, $estado, $hist, $detalle
        Write-Output $linea
        if ($estado -eq 'ok') {
            $resultado[$a.App] = $linea
            [void]$pendientes.Remove($a.App)
        }
    }
    if ($pendientes.Count -gt 0 -and $i -lt $Iteraciones) { Start-Sleep -Seconds $Intervalo }
}

Write-Output ''
Write-Output '===== RESUMEN ====='
foreach ($k in ($resultado.Keys | Sort-Object)) { Write-Output $resultado[$k] }
if ($pendientes.Count -eq 0) { Write-Output 'TODAS LAS APPS DE LAS FILAS 14-15 VERIFICADAS' }
else { Write-Output "SIN VERIFICAR TODAVIA: $($pendientes -join ', ')" }
