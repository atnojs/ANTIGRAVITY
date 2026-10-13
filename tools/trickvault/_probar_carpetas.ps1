# Prueba de la parte de CARPETAS de apps/trickvault/publicar.php contra la API de
# GitHub simulada: lista + orden + bajas acumuladas + «sin cambios» + app antigua.
#
# Uso: powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/trickvault/_probar_carpetas.ps1

$ErrorActionPreference = 'Stop'
$base = "E:\ANTIGRAVITY\tools\trickvault\_prueba_carpetas"
$app  = "$base\apps\trickvault"
$php  = (Get-Command php).Source

# Si una ejecucion anterior fallo a medias, sus servidores siguen vivos y
# bloquean los ficheros: se cierran SOLO los de estos puertos.
Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
  Where-Object { $_.CommandLine -match '127\.0\.0\.1:810[456]' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 700

if (Test-Path $base) { Remove-Item -Recurse -Force $base }
New-Item -ItemType Directory -Force $app | Out-Null
Copy-Item "E:\ANTIGRAVITY\apps\trickvault\publicar.php" "$app\publicar.php"
Copy-Item "E:\ANTIGRAVITY\tools\trickvault\_mock_github.php" "$base\mock_github.php"
# Un BOM UTF-8 al principio del mock rompe las cabeceras HTTP (y el JSON): fuera.
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

$env:PUBLICAR_TOKEN = 'token-de-prueba-1234567890'
$env:PUBLICAR_REPO = 'atnojs/ANTIGRAVITY'
$env:PUBLICAR_RAMA = 'main'
$env:PUBLICAR_API_URL = 'http://127.0.0.1:8106'
$env:PUBLICAR_AUTH_URL = 'http://127.0.0.1:8104/apps/trickvault/auth.php'
$phpDir = Split-Path (Get-Command php).Source
$ext = @('-d', "extension_dir=$phpDir\ext", '-d', 'extension=curl')
$srv  = Start-Process -FilePath $php -ArgumentList ($ext + @('-d','display_errors=1','-S','127.0.0.1:8105','-t',$base)) -PassThru -WindowStyle Hidden -RedirectStandardError "$base\php-err.log"
$mock = Start-Process -FilePath $php -ArgumentList @('-S','127.0.0.1:8106',"$base\mock_github.php") -PassThru -WindowStyle Hidden -RedirectStandardError "$base\mock-err.log"
$auth = Start-Process -FilePath $php -ArgumentList @('-S','127.0.0.1:8104','-t',$base) -PassThru -WindowStyle Hidden -RedirectStandardError "$base\auth-err.log"
Start-Sleep -Seconds 2

function Llamar($campos) {
    $body = @{ action = 'publicar' }
    foreach ($k in $campos.Keys) { $body[$k] = $campos[$k] }
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8105/apps/trickvault/publicar.php' -Method Post -Body $body -UseBasicParsing -TimeoutSec 90
        return $r.Content
    } catch {
        $resp = $_.Exception.Response
        if ($resp) { return (New-Object System.IO.StreamReader($resp.GetResponseStream())).ReadToEnd() }
        return "FALLO: $($_.Exception.Message)"
    }
}

# Catalogo de prueba: 3 carpetas (una con acentos y emoji) y Favoritos primero.
$carpetas = @'
[{"id":"xl-carteles","label":"Carteles y materiales","icon":"\uD83E\uDEA7","color":"pink","bgIcon":"\uD83D\uDCF0"},{"id":"xl-dev","label":"Dev y productividad","icon":"\uD83D\uDCBB","color":"amber","bgIcon":"\u2328"},{"id":"f_demo","label":"Carpeta creada aqui","icon":"\uD83D\uDCC1","color":"cyan","bgIcon":"\uD83D\uDDC2"}]
'@
$carpetas = $carpetas.Trim()
$orden = '["favorites","f_demo","xl-carteles","xl-dev"]'

$cat1 = '{"version":1,"tarjetas":{"cap-cmd-111":{"title":"prueba carpetas"}},"nuevas":[],"borradas":[],"orden":{},' +
        '"listaCarpetas":' + $carpetas + ',"ordenCarpetas":' + $orden + ',"carpetasBorradas":["xl-vieja"]}'

Write-Output '=== 1) publicar con carpetas + una baja ==='
(Llamar @{ password='secreto'; catalogo=$cat1; imagenes='[]'; mensaje='prueba carpetas' }) | ConvertFrom-Json | ConvertTo-Json -Depth 3

Write-Output '=== 2) publicar lo MISMO otra vez (debe decir sin_cambios) ==='
(Llamar @{ password='secreto'; catalogo=$cat1; imagenes='[]'; mensaje='prueba carpetas' }) | ConvertFrom-Json | ConvertTo-Json -Depth 3

Write-Output '=== 3) publicar una tarjeta nueva SIN lista de carpetas (app antigua) ==='
$cat2 = '{"version":1,"tarjetas":{"cap-cmd-222":{"title":"otra"}},"nuevas":[],"borradas":[],"orden":{}}'
(Llamar @{ password='secreto'; catalogo=$cat2; imagenes='[]'; mensaje='sin lista' }) | ConvertFrom-Json | ConvertTo-Json -Depth 3

Write-Output '=== 4) contrasena mala ==='
(Llamar @{ password='mala'; catalogo=$cat1; imagenes='[]' })

Write-Output '=== 5) catalogo publicado (blob del mock) ==='
$estado = Get-Content "$base\_mock_github_estado.json" -Raw | ConvertFrom-Json
$sha = $estado.catalogoSha
$json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($estado.blobs.$sha))
$obj = $json | ConvertFrom-Json
"claves: $($obj.PSObject.Properties.Name -join ', ')"
"listaCarpetas: $(@($obj.listaCarpetas).Count) -> " + (($obj.listaCarpetas | ForEach-Object { $_.id + '=' + $_.label }) -join ' | ')
"ordenCarpetas: " + ($obj.ordenCarpetas -join ' | ')
"carpetasBorradas: " + ($obj.carpetasBorradas -join ' | ')
"tarjetas: " + (($obj.tarjetas.PSObject.Properties.Name) -join ' | ')

Write-Output '=== 6) saneado de una lista hostil ==='
$catMal = @'
{"version":1,"tarjetas":{},"nuevas":[],"borradas":[],"orden":{},"listaCarpetas":[{"id":"ok-1","label":"  Buena   con   espacios  ","icon":"x"},{"id":"mal id!!","label":"Mala"},{"id":"ok-1","label":"Duplicada"},{"id":"sin-label","label":""},{"id":"../escape","label":"Travesia"}],"ordenCarpetas":["ok-1","favorites","ok-1","no-existe",123],"carpetasBorradas":["ok-1","ok-1","../x"]}
'@
$catMal = $catMal.Trim()
(Llamar @{ password='secreto'; catalogo=$catMal; imagenes='[]'; mensaje='hostil' }) | ConvertFrom-Json | ConvertTo-Json -Depth 3
$estado2 = Get-Content "$base\_mock_github_estado.json" -Raw | ConvertFrom-Json
$sha2 = $estado2.catalogoSha
$json2 = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($estado2.blobs.$sha2))
$obj2 = $json2 | ConvertFrom-Json
"lista saneada: " + (($obj2.listaCarpetas | ForEach-Object { $_.id + '=' + $_.label }) -join ' | ')
"orden saneado: " + ($obj2.ordenCarpetas -join ' | ')
"bajas acumuladas: " + ($obj2.carpetasBorradas -join ' | ')

Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $mock.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $auth.Id -Force -ErrorAction SilentlyContinue
Write-Output '=== errores php ==='
Get-Content "$base\php-err.log" -Tail 8 -ErrorAction SilentlyContinue
Get-Content "$base\mock-err.log" -Tail 4 -ErrorAction SilentlyContinue
Remove-Item Env:PUBLICAR_TOKEN, Env:PUBLICAR_REPO, Env:PUBLICAR_RAMA, Env:PUBLICAR_API_URL, Env:PUBLICAR_AUTH_URL -ErrorAction SilentlyContinue
