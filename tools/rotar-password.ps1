# Rota la contraseña de edición de TrickVault / video-vault / json / agenda.
#
# OJO: la app Descargas ya NO usa esta contraseña; tiene la suya propia en
# apps\descargas\auth.php (no la toca este script). La agenda (apps/agenda)
# sí usa la contraseña de edición, y este script actualiza su hash.
#
# Qué hace, en este orden:
#   1. Coge la contraseña nueva (la que le pases, o una generada al azar).
#   2. Calcula su sha256 — con PHP si está en el PATH (que es lo que ejecuta el
#      servidor), y si no con .NET, que da el mismo resultado para ASCII.
#   3. Escribe el hash en los CUATRO auth.php y lo LEE DE VUELTA para comprobar
#      que quedó bien.
#   4. Guarda la contraseña en claro en .private/ (no se versiona ni se sirve
#      por web) para que no se pierda.
#
# Uso (en este equipo NO hay `pwsh`, es Windows PowerShell 5.1):
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-password.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-password.ps1 -Password "la-que-yo-quiera"
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-password.ps1 -Longitud 32
#
# OJO: después hay que hacer commit + push y esperar al despliegue. El script
# NO hace push a propósito: publicar es una decisión, no un efecto secundario.
param(
    [string]$Password = '',
    [int]$Longitud = 20
)

$ErrorActionPreference = 'Stop'

$raiz = 'E:\ANTIGRAVITY'
if (-not (Test-Path -LiteralPath (Join-Path $raiz 'apps\trickvault'))) {
    $raiz = Split-Path -Parent $PSScriptRoot
}

# Sin caracteres ambiguos (nada de I, l, O, 0, 1): se copia o se teclea igual.
$alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

if ([string]::IsNullOrWhiteSpace($Password)) {
    $bytes = [byte[]]::new($Longitud)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $sb = [System.Text.StringBuilder]::new()
    foreach ($b in $bytes) { [void]$sb.Append($alfabeto[$b % $alfabeto.Length]) }
    $Password = $sb.ToString()
    $generada = $true
} else {
    $generada = $false
}

# ── sha256, igual que el servidor ───────────────────────────────────────────
# La contraseña va por variable de entorno para no tener que escaparla dentro
# del código PHP (comillas, $, barras… romperían el -r).
$php = Get-Command php -ErrorAction SilentlyContinue
if ($php) {
    $env:ROTAR_PW = $Password
    try   { $hash = (& $php.Source -r "echo hash('sha256', (string) getenv('ROTAR_PW'));").Trim() }
    finally { Remove-Item Env:ROTAR_PW -ErrorAction SilentlyContinue }
} else {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = ($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Password)) | ForEach-Object { $_.ToString('x2') }) -join ''
    $sha.Dispose()
}

if ($hash -notmatch '^[0-9a-f]{64}$') { throw "El hash no tiene forma de sha256: '$hash'" }

# ── Ficheros que guardan el hash, y cómo reconocerlo en cada uno ────────────
# Los patrones van entre comillas SIMPLES y con el $ escapado para regex (\$),
# que si no el $ sería «fin de línea» y no encontraría nada.
$destinos = @(
    @{ Ruta = 'apps\trickvault\auth.php';  Patron = '\$expectedHash = ''[0-9a-f]{64}''';         Nuevo = "`$expectedHash = '$hash'" },
    @{ Ruta = 'apps\video-vault\auth.php'; Patron = '\$expectedHash = ''[0-9a-f]{64}''';         Nuevo = "`$expectedHash = '$hash'" },
    @{ Ruta = 'apps\json\auth.php';        Patron = 'const AUTH_PASSWORD_HASH = ''[0-9a-f]{64}'''; Nuevo = "const AUTH_PASSWORD_HASH = '$hash'" },
    @{ Ruta = 'apps\agenda\auth.php';      Patron = 'const AGENDA_PASSWORD_SHA256 = ''[0-9a-f]{64}'''; Nuevo = "const AGENDA_PASSWORD_SHA256 = '$hash'" }
)

# UTF8 SIN BOM: un BOM delante de <?php se enviaría como salida y rompería las
# cabeceras. (Ya nos pasó una vez con un fichero de secreto.)
$utf8SinBom = New-Object System.Text.UTF8Encoding($false)
$tocados = @()

foreach ($d in $destinos) {
    $ruta = Join-Path $raiz $d.Ruta
    if (-not (Test-Path -LiteralPath $ruta)) { Write-Output "  AVISO: no existe $($d.Ruta); lo salto"; continue }

    $texto = [System.IO.File]::ReadAllText($ruta)
    $m = [regex]::Match($texto, $d.Patron)
    if (-not $m.Success) { Write-Output "  AVISO: no encontre el hash en $($d.Ruta); lo salto"; continue }

    # Se sustituye por posicion, sin motor de reemplazo: asi el $ del codigo PHP
    # no se interpreta como grupo de captura.
    $nuevo = $texto.Remove($m.Index, $m.Length).Insert($m.Index, $d.Nuevo)
    [System.IO.File]::WriteAllText($ruta, $nuevo, $utf8SinBom)

    # Leer de vuelta: mejor enterarse aqui que en produccion.
    $releido = [System.IO.File]::ReadAllText($ruta)
    if ($releido -notmatch [regex]::Escape($hash)) { throw "El hash no quedo escrito en $($d.Ruta)" }
    $tocados += $d.Ruta
}

# ── La contraseña en claro, fuera de git y fuera de la web ─────────────────
$privado = Join-Path $raiz '.private'
if (-not (Test-Path -LiteralPath $privado)) { New-Item -ItemType Directory -Path $privado | Out-Null }
$ficheroClave = Join-Path $privado 'password-edicion.txt'
$contenido = @(
    'Contrasena de edicion de TrickVault / video-vault / json / agenda',
    "Cambiada el $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    '',
    $Password,
    '',
    "sha256: $hash",
    '',
    'Vive en .private/ (ignorada por git y con .htaccess que deniega la web).',
    'Para cambiarla: pwsh -File tools/rotar-password.ps1',
    'Despues hay que hacer commit + push de los auth.php.'
)
[System.IO.File]::WriteAllText($ficheroClave, ($contenido -join "`r`n"), $utf8SinBom)

# ── Resumen ────────────────────────────────────────────────────────────────
Write-Output ''
Write-Output '=== CONTRASENA ROTADA ==='
Write-Output "  origen     : $(if ($generada) { 'generada al azar' } else { 'la que has pasado' }) ($($Password.Length) caracteres)"
Write-Output "  sha256     : $hash"
Write-Output "  guardada en: .private\password-edicion.txt"
Write-Output "  ficheros   : $($tocados.Count)"
foreach ($t in $tocados) { Write-Output "      - $t" }
Write-Output ''
Write-Output "  CONTRASENA NUEVA: $Password"
Write-Output ''
Write-Output '  Siguiente paso: commit + push, y esperar al despliegue de Hostinger.'
