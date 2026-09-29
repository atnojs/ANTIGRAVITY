# Comprueba en bucle que el despliegue de Hostinger ya publicó los cambios de la
# migración. Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/verificar-despliegue.ps1 [-Iteraciones 40] [-Intervalo 150] [-Solo <subcadena>]
param(
    [int]$Iteraciones = 40,
    [int]$Intervalo = 150,
    [string]$Solo = ''
)

$todas = @(
    'angulos_de_camara','escenario_modelo','imagenes_ia/ajustes_imagen','estilizador_prompt',
    'conversor_multimedia','creador_memes','infografia-referencia','infografia',
    'vestir_modelo','imagenes_ia/editar_generar','editar_generar','editar_generar_1',
    'galletas_infografias','prompt_copilot_premium','prompt_estudio',
    'imagenes_ia/generar','imagenes_ia/generar_copia','imagenes_ia/editar',
    'imagenes_ia/copiar_estilo','imagenes_ia/combinar_imagenes','imagenes_ia/estilo_json',
    'imagenes_ia/upscaler','color','dibujo_lineas','ficha_producto','outfit','generar_imagenes'
)
$apps = $todas | Where-Object { $Solo -eq '' -or $_ -like "*$Solo*" }
$pendientes = [System.Collections.Generic.HashSet[string]]::new()
foreach ($a in $apps) { [void]$pendientes.Add($a) }

function Test-Publicado {
    param([string]$app)
    $cb = Get-Random
    if ($app -eq 'infografia') {
        try {
            $html = (Invoke-WebRequest -Uri "https://atnojs.es/apps/infografia/folio.html?cb=$cb" -TimeoutSec 45 -UseBasicParsing).Content
            return ($html -match 'history-manager\.js\?v=7')
        } catch { return $false }
    }
    try {
        $body = (Invoke-WebRequest -Uri "https://atnojs.es/apps/$app/proxy.php?cb=$cb" -Method Post -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 45 -UseBasicParsing).Content
        # El marcador fiable: el proxy publica el catalogo vigente.
        return ($body -match 'gemini-2')
    } catch { return $false }
}

for ($i = 1; $i -le $Iteraciones -and $pendientes.Count -gt 0; $i++) {
    $stamp = Get-Date -Format 'HH:mm:ss'
    foreach ($a in $apps) {
        if (-not $pendientes.Contains($a)) { continue }
        if (Test-Publicado $a) {
            Write-Output "$stamp  OK   $a publicado"
            [void]$pendientes.Remove($a)
        } else {
            Write-Output "$stamp  ...  $a sigue con la version antigua"
        }
    }
    if ($pendientes.Count -gt 0 -and $i -lt $Iteraciones) { Start-Sleep -Seconds $Intervalo }
}
if ($pendientes.Count -eq 0) { Write-Output 'TODOS LOS MARCADORES PUBLICADOS' }
else { Write-Output "SIN PUBLICAR TODAVIA: $($pendientes -join ', ')" }
