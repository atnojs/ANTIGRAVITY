# Comprueba en bucle que el despliegue de Hostinger ya publicó los cambios de la
# migración (marcadores de apps/ESTADO_VERIFICACION_PRODUCCION.md).
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File tools/verificar-despliegue.ps1 [-Iteraciones 40] [-Intervalo 120]
param(
    [int]$Iteraciones = 40,
    [int]$Intervalo = 120
)

$apps = @(
    @{ Nombre = 'angulos_de_camara';          Health = 'https://atnojs.es/apps/angulos_de_camara/proxy.php' },
    @{ Nombre = 'escenario_modelo';           Health = 'https://atnojs.es/apps/escenario_modelo/proxy.php' },
    @{ Nombre = 'imagenes_ia/ajustes_imagen'; Health = 'https://atnojs.es/apps/imagenes_ia/ajustes_imagen/proxy.php' },
    @{ Nombre = 'estilizador_prompt';         Health = 'https://atnojs.es/apps/estilizador_prompt/proxy.php' },
    @{ Nombre = 'conversor_multimedia';       Health = 'https://atnojs.es/apps/conversor_multimedia/proxy.php' },
    @{ Nombre = 'creador_memes';              Health = 'https://atnojs.es/apps/creador_memes/proxy.php' },
    @{ Nombre = 'infografia-referencia';      Health = 'https://atnojs.es/apps/infografia-referencia/proxy.php' },
    @{ Nombre = 'infografia';                 Health = $null }
)
$pendientes = [System.Collections.Generic.HashSet[string]]::new()
foreach ($a in $apps) { [void]$pendientes.Add($a.Nombre) }

function Test-Marcador {
    param($app)
    if ($app.Nombre -eq 'infografia') {
        # App de solo texto: el marcador es la version del bundle servido.
        $cb = Get-Random
        try {
            $html = (Invoke-WebRequest -Uri "https://atnojs.es/apps/infografia/folio.html?cb=$cb" -TimeoutSec 45 -UseBasicParsing).Content
            return ($html -match 'history-manager\.js\?v=7')
        } catch { return $false }
    }
    $cb = Get-Random
    try {
        $body = (Invoke-WebRequest -Uri "$($app.Health)?cb=$cb" -Method Post -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 45 -UseBasicParsing).Content
        return ($body -match 'gemini-2')
    } catch { return $false }
}

for ($i = 1; $i -le $Iteraciones -and $pendientes.Count -gt 0; $i++) {
    $stamp = Get-Date -Format 'HH:mm:ss'
    foreach ($a in $apps) {
        if (-not $pendientes.Contains($a.Nombre)) { continue }
        if (Test-Marcador $a) {
            Write-Output "$stamp  OK   $($a.Nombre) publicado"
            [void]$pendientes.Remove($a.Nombre)
        } else {
            Write-Output "$stamp  ...  $($a.Nombre) sigue con la version antigua"
        }
    }
    if ($pendientes.Count -gt 0 -and $i -lt $Iteraciones) { Start-Sleep -Seconds $Intervalo }
}
if ($pendientes.Count -eq 0) { Write-Output 'TODOS LOS MARCADORES PUBLICADOS' }
else { Write-Output "SIN PUBLICAR TODAVIA: $($pendientes -join ', ')" }
