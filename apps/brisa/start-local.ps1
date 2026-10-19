param([int]$Port = 8787, [switch]$Demo)
$ErrorActionPreference = 'Stop'
$brisaPhp = (Get-Command php).Source
$brisaExtensions = Join-Path (Split-Path $brisaPhp) 'ext'
$brisaRoot = Split-Path (Split-Path $PSScriptRoot)
$env:BRISA_STORAGE = Join-Path $brisaRoot '.private\brisa-local'
$env:BRISA_PREVIEW = '1'
$brisaModules = & $brisaPhp -m
$brisaArgs = @()
if (Test-Path -LiteralPath $brisaExtensions) { $brisaArgs += @('-d', "extension_dir=$brisaExtensions") }
foreach ($module in @('pdo_sqlite','pdo_mysql','fileinfo','curl')) {
    if ($brisaModules -notcontains $module) { $brisaArgs += @('-d', "extension=$module") }
}
$brisaArgs += @('-d','upload_max_filesize=12M','-d','post_max_size=13M')
if ($Demo) { & $brisaPhp @brisaArgs (Join-Path $PSScriptRoot 'seed-demo.php'); if ($LASTEXITCODE) { exit $LASTEXITCODE } }
Write-Host "Brisa: http://127.0.0.1:$Port/"
Write-Host 'Los cambios se guardan en .private/brisa-local. Ctrl+C para detener.'
& $brisaPhp @brisaArgs -S "127.0.0.1:$Port" -t $PSScriptRoot
