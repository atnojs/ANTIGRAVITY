# Contraseñas del proyecto — ahora viven en el .htaccess raíz del servidor.
#
# Desde el 2026-10-21 las contraseñas de edición y de acceso NO están en el
# repositorio ni en ningún auth.php: se declaran UNA vez en el `.htaccess` raíz
# de Hostinger, igual que las claves de API, y todas las apps las leen con
# `auth/lib.php`.
#
# Esto ya NO rota nada solo: no hay acceso al servidor desde el agente. Genera
# el bloque exacto y pégalo en hPanel → Administrador de archivos →
# `public_html/.htaccess` (al lado de los `SetEnv` que ya hay), y guarda. El
# cambio es inmediato: no hay commit ni despliegue.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-password.ps1
#       (pregunta las dos contraseñas y enseña el bloque para pegar)
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-password.ps1 -Edit "0" -Acceso "[ELIMINADO]"
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-password.ps1 -Edit "0" -Acceso "..." -Hash
#       (con -Hash imprime solo los sha256, para no dejar el valor en claro)
#
# OJO: este script NUNCA escribe contraseñas en el repositorio (es público).
param(
    [string]$Edit = '',
    [string]$Acceso = '',
    [switch]$Hash
)

$ErrorActionPreference = 'Stop'

function Leer-Oculta([string]$mensaje) {
    $seguro = Read-Host -Prompt $mensaje -AsSecureString
    $puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero) }
}

function Sha256([string]$texto) {
    $php = Get-Command php -ErrorAction SilentlyContinue
    if ($php) {
        $env:ROTAR_PW = $texto
        try { return (& $php.Source -r "echo hash('sha256', (string) getenv('ROTAR_PW'));").Trim() }
        finally { Remove-Item Env:ROTAR_PW -ErrorAction SilentlyContinue }
    }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($texto)) | ForEach-Object { $_.ToString('x2') }) -join '' }
    finally { $sha.Dispose() }
}

if ([string]::IsNullOrWhiteSpace($Edit)) { $Edit = Leer-Oculta 'Contraseña de EDICIÓN (la del candado / modo edición)' }
if ([string]::IsNullOrWhiteSpace($Acceso)) { $Acceso = Leer-Oculta 'Contraseña de ACCESO (login de Descargas, agenda y publicar en GitHub)' }

if ($Edit -eq $Acceso) { throw 'La de edición y la de acceso deben ser distintas.' }
if ($Edit.Length -eq 0 -or $Acceso.Length -eq 0) { throw 'Las dos contraseñas son obligatorias.' }

if ($Hash) {
    Write-Output ''
    Write-Output '=== BLOQUE PARA EL .htaccess RAÍZ (solo hashes) ==='
    Write-Output ('SetEnv PW_EDIT_SHA256 "' + (Sha256 $Edit) + '"')
    Write-Output ('SetEnv PW_ACCESS_SHA256 "' + (Sha256 $Acceso) + '"')
} else {
    Write-Output ''
    Write-Output '=== BLOQUE PARA EL .htaccess RAÍZ ==='
    Write-Output ('SetEnv PW_EDIT "' + $Edit + '"')
    Write-Output ('SetEnv PW_ACCESS "' + $Acceso + '"')
}
Write-Output ''
Write-Output 'Dónde: hPanel → Administrador de archivos → public_html/.htaccess'
Write-Output '       (junto a los SetEnv de las claves de API; no borres ninguno).'
Write-Output ''
Write-Output 'Cómo comprobarlo SIN tocar una app:  GET /auth/validar.php  debe devolver'
Write-Output '       "configurado":{"edicion":true,"acceso":true}.'
Write-Output 'Y en la app: candado con la de edición, login con la de acceso.'
Write-Output ''
if (-not $Hash) {
    Write-Output 'AVISO: al pegarlo, las contraseñas quedan en el .htaccess del servidor.'
    Write-Output 'No las escribas en el repositorio ni en la memoria del proyecto.'
}
