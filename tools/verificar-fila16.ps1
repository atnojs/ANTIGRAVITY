# Verificacion en produccion de la FILA 16 del §6.1 (20 apps).
# Marcador por app: el health del proxy debe publicar el catalogo vigente (gemini-2
# o, en apps sin IA, un "configured" valido). Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/verificar-fila16.ps1 [-Iteraciones 40] [-Intervalo 180]
param(
    [int]$Iteraciones = 40,
    [int]$Intervalo = 180
)

$apps = @(
    @{ App = 'aura-edit';                     Tipo = 'modelo' },
    @{ App = 'clonador';                      Tipo = 'modelo' },
    @{ App = 'decorar_habitacion';            Tipo = 'modelo' },
    @{ App = 'editar_imagen';                 Tipo = 'modelo' },
    @{ App = 'generar';                       Tipo = 'modelo' },
    @{ App = 'generar_ai_studio';             Tipo = 'modelo' },
    @{ App = 'generar_imagene_personalizadas';Tipo = 'modelo' },
    @{ App = 'fotos_antonio';                 Tipo = 'modelo' },
    @{ App = 'estudio_creativo';              Tipo = 'modelo' },
    @{ App = 'estudio_imagenes';              Tipo = 'modelo' },
    @{ App = 'illusion_diffusion';            Tipo = 'modelo' },
    @{ App = 'banco_de_imagenes';             Tipo = 'modelo' },
    @{ App = 'crear_historias';               Tipo = 'modelo' },
    @{ App = 'pasatiempos';                   Tipo = 'texto' },
    @{ App = 'publicidad_producto';           Tipo = 'modelo' },
    @{ App = 'transferir_estilo';             Tipo = 'modelo' },
    @{ App = 'hermes_academy';                Tipo = 'modelo' },
    @{ App = 'rrss';                          Tipo = 'texto' },
    @{ App = 'video-vault';                   Tipo = 'texto' }
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
        try {
            $body = (Invoke-WebRequest -Uri "$base/proxy.php?cb=$cb" -Method Post -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 60 -UseBasicParsing).Content
            $ok = if ($a.Tipo -eq 'texto') { $body -match 'configured' } else { $body -match 'gemini-2' }
            if ($ok) {
                Write-Output ("{0}  OK   {1}" -f $stamp, $a.App)
                $hechas += "$($a.App): OK"
                [void]$pendientes.Remove($a.App)
            } else {
                Write-Output ("{0}  ...  {1}  (health antiguo: {2})" -f $stamp, $a.App, $body.Substring(0, [Math]::Min(80, $body.Length)))
            }
        } catch {
            Write-Output ("{0}  ERR  {1}  ({2})" -f $stamp, $a.App, $_.Exception.Message)
        }
    }
    if ($pendientes.Count -gt 0 -and $i -lt $Iteraciones) { Start-Sleep -Seconds $Intervalo }
}

Write-Output ''
Write-Output '===== RESUMEN FILA 16 ====='
$hechas | ForEach-Object { Write-Output $_ }
if ($pendientes.Count -eq 0) { Write-Output 'FILA 16 VERIFICADA EN PRODUCCION' }
else { Write-Output "SIN PUBLICAR TODAVIA: $($pendientes -join ', ')" }
