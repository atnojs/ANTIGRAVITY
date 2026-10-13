# E2E de la publicacion de CARPETAS en TrickVault:
#   - app real (index.html) + publicar.php real
#   - GitHub simulado + auth.php y image_store.php de mentira
#   - Chrome conduce la app: modo edicion -> Publicar cambios
#   - se simula el despliegue de Hostinger escribiendo el catalogo publicado
#   - y se compara la rejilla de la ventana que publico con la de una ventana
#     VIRGEN (como el incognito): tienen que ser identicas.
#
# Uso: powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/trickvault/_e2e_carpetas.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$tools = 'E:\ANTIGRAVITY\tools\trickvault'
$real  = 'E:\ANTIGRAVITY\apps\trickvault'
$base  = "$tools\_e2e_carpetas"
$app   = "$base\apps\trickvault"
$php   = (Get-Command php).Source
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

# Servidores de una ejecucion anterior (solo estos puertos).
Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
  Where-Object { $_.CommandLine -match '127\.0\.0\.1:811[456]' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 700
if (Test-Path $base) { Remove-Item -Recurse -Force $base }
New-Item -ItemType Directory -Force $app | Out-Null

# 1) la app real, el endpoint real y la capa publicada actual como punto de partida
Copy-Item "$real\index.html"    "$app\index.html"
Copy-Item "$real\app.css"       "$app\app.css"
Copy-Item "$real\publicar.php"  "$app\publicar.php"
Copy-Item "$real\catalogo.json" "$app\catalogo.json"
Copy-Item "$tools\_e2e_carpetas_driver.html" "$app\_e2e_carpetas_driver.html"
Copy-Item "$tools\_mock_github.php" "$base\mock_github.php"
$bytes = [System.IO.File]::ReadAllBytes("$base\mock_github.php")
if ($bytes.Length -gt 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $txt = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
    [System.IO.File]::WriteAllText("$base\mock_github.php", $txt, (New-Object System.Text.UTF8Encoding($false)))
}

$authFalso = @'
<?php
header('Content-Type: application/json');
$password = $_POST['password'] ?? '';
echo json_encode($password === 'secreto' ? ['success' => true] : ['success' => false, 'error' => 'Contrasena incorrecta.']);
'@
Set-Content "$app\auth.php" -Value $authFalso -Encoding ascii

$storeFalso = @'
<?php
header('Content-Type: application/json');
$accion = $_GET['action'] ?? $_POST['action'] ?? '';
if ($accion === 'list') { echo json_encode(['success' => true, 'images' => new stdClass()]); exit; }
if ($accion === 'fav_list') { echo json_encode(['success' => true, 'exists' => false, 'ids' => []]); exit; }
if ($accion === 'fav_save') { echo json_encode(['success' => true]); exit; }
echo json_encode(['success' => true]);
'@
Set-Content "$app\image_store.php" -Value $storeFalso -Encoding ascii

# 2) servidores
$phpDir = Split-Path $php
$ext = @('-d', "extension_dir=$phpDir\ext", '-d', 'extension=curl')
$env:PUBLICAR_TOKEN = 'token-de-prueba-1234567890'
$env:PUBLICAR_REPO = 'atnojs/ANTIGRAVITY'
$env:PUBLICAR_RAMA = 'main'
$env:PUBLICAR_API_URL = 'http://127.0.0.1:8116'
$env:PUBLICAR_AUTH_URL = 'http://127.0.0.1:8114/apps/trickvault/auth.php'
$srv  = Start-Process -FilePath $php -ArgumentList ($ext + @('-d','display_errors=1','-S','127.0.0.1:8115','-t',$base)) -PassThru -WindowStyle Hidden -RedirectStandardError "$base\php-err.log"
$mock = Start-Process -FilePath $php -ArgumentList @('-S','127.0.0.1:8116',"$base\mock_github.php") -PassThru -WindowStyle Hidden -RedirectStandardError "$base\mock-err.log"
$auth = Start-Process -FilePath $php -ArgumentList @('-S','127.0.0.1:8114','-t',$base) -PassThru -WindowStyle Hidden -RedirectStandardError "$base\auth-err.log"
Start-Sleep -Seconds 2

try {
    # 3) Chrome: la app publica (perfil P1 = ventana normal del usuario)
    $flags = @('--headless=new','--no-sandbox','--no-first-run','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1400,1000')
    & $chrome @flags '--virtual-time-budget=120000' "--user-data-dir=$base\perfil1" --dump-dom 'http://127.0.0.1:8115/apps/trickvault/_e2e_carpetas_driver.html' 2>$null | Set-Content "$base\driver.html" -Encoding UTF8

    $dom = Get-Content "$base\driver.html" -Raw
    Write-Output '=== A) la app publica desde su boton ==='
    if ($dom -match '(?s)<pre id="out">(.*?)</pre>') { Write-Output $Matches[1].Trim() } else { Write-Output '(no encontre la salida del driver)' }

    # 4) despliegue simulado: el catalogo que llego al "repositorio" pasa al servidor
    $estado = Get-Content "$base\_mock_github_estado.json" -Raw | ConvertFrom-Json
    $sha = $estado.catalogoSha
    if (-not $sha) { throw 'la publicacion no creo catalogo en el mock' }
    $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($estado.blobs.$sha))
    [System.IO.File]::WriteAllText("$app\catalogo.json", $json, (New-Object System.Text.UTF8Encoding($false)))

    Write-Output '=== B) capa publicada (lo que traera el despliegue) ==='
    $obj = $json | ConvertFrom-Json
    Write-Output ("listaCarpetas (" + @($obj.listaCarpetas).Count + "): " + (($obj.listaCarpetas | ForEach-Object { $_.id }) -join ', '))
    Write-Output ("ordenCarpetas: " + ($obj.ordenCarpetas -join ', '))
    Write-Output ("carpetasBorradas: " + ($obj.carpetasBorradas -join ', '))
    Write-Output ("tarjetas en la capa: " + @($obj.tarjetas.PSObject.Properties).Count)

    # 5) las dos ventanas, una al lado de la otra
    function Rejilla($perfil, $png) {
        # Chrome escribe «N bytes written to file» en stderr y con
        # ErrorActionPreference=Stop eso aborta el script: aquí se tolera.
        $ErrorActionPreference = 'Continue'
        & $chrome @flags '--virtual-time-budget=25000' "--user-data-dir=$base\$perfil" "--screenshot=$base\$png" 'http://127.0.0.1:8115/apps/trickvault/index.html' 2>$null | Out-Null
        & $chrome @flags '--virtual-time-budget=25000' "--user-data-dir=$base\$perfil" --dump-dom 'http://127.0.0.1:8115/apps/trickvault/index.html' 2>$null | Set-Content "$base\$perfil.html" -Encoding UTF8
        $h = Get-Content "$base\$perfil.html" -Raw
        $chips = [regex]::Matches($h,'class="count">(\d+)</span>\s*([^<]+)') | ForEach-Object { ($_.Groups[1].Value + ' ' + $_.Groups[2].Value.Trim()) }
        $tarjetas = [regex]::Matches($h,'aria-label="([^"]+?): (\d+) trucos"') | ForEach-Object { $_.Groups[1].Value }
        return [pscustomobject]@{ Perfil = $perfil; Chips = ($chips -join ' | '); Tarjetas = @($tarjetas) }
    }

    $A = Rejilla 'perfil1' 'despues_A.png'     # la ventana que publico (con su estado local)
    $B = Rejilla 'perfil2' 'despues_B.png'     # ventana VIRGEN (como el incognito)

    Write-Output '=== C) las dos ventanas despues de publicar ==='
    Write-Output ("ventana normal   -> " + $A.Chips + "  ||  " + $A.Tarjetas.Count + " tarjetas: " + (($A.Tarjetas | Select-Object -First 4) -join ' / '))
    Write-Output ("ventana incognito-> " + $B.Chips + "  ||  " + $B.Tarjetas.Count + " tarjetas: " + (($B.Tarjetas | Select-Object -First 4) -join ' / '))
    $mismo = ($A.Chips -eq $B.Chips) -and (($A.Tarjetas -join '|') -eq ($B.Tarjetas -join '|'))
    Write-Output ("IGUALES: " + $(if ($mismo) { 'SI, mismas carpetas y mismo orden' } else { 'NO' }))
    Write-Output ("xl-juegos en la ventana incognito: " + $(if (($B.Tarjetas -join '|') -match 'Juegos') { 'SIGUE (mal)' } else { 'no aparece (baja aplicada)' }))
    Write-Output ("carpeta propia en la ventana incognito: " + $(if (($B.Tarjetas -join '|') -match 'Carpeta solo local') { 'SI' } else { 'NO (mal)' }))
    Write-Output ("Favoritos primero: " + $(if ($B.Tarjetas[0] -match 'Favoritos') { 'SI' } else { 'NO: ' + $B.Tarjetas[0] }))
} finally {
    Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $mock.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $auth.Id -Force -ErrorAction SilentlyContinue
    Remove-Item Env:PUBLICAR_TOKEN, Env:PUBLICAR_REPO, Env:PUBLICAR_RAMA, Env:PUBLICAR_API_URL, Env:PUBLICAR_AUTH_URL -ErrorAction SilentlyContinue
    Write-Output '=== errores php ==='
    Get-Content "$base\php-err.log" -Tail 4 -ErrorAction SilentlyContinue
    Get-Content "$base\mock-err.log" -Tail 4 -ErrorAction SilentlyContinue
}
