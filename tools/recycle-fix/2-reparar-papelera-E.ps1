# =====================================================================
#  2-reparar-papelera-E.ps1   *** EJECUTAR COMO ADMINISTRADOR ***
#
#  Que hace y por que:
#   - El aviso "La Papelera de reciclaje en E:\ esta dañada" NO es un
#     disco dañado: la papelera de E: acumula carpetas SID de varias
#     instalaciones/usuarios anteriores (Windows no puede resolver esas
#     cuentas y Explorer la marca como corrupta).
#   - El boton "Si" del aviso solo borra la papelera del usuario ACTUAL,
#     por eso el mensaje vuelve a salir siempre.
#
#  Medidas:
#   1. Verifica que eres administrador.
#   2. Copia de seguridad del ACL actual.
#   3. Toma posesion REAL de E:\$Recycle.Bin y sus subcarpetas.
#   4. Borra las carpetas SID ajenas (conserva la del usuario actual,
#      salvo que elijas lo contrario).
#   5. Deja el ACL de la raiz como el de fabrica.
#   6. Limpia la configuracion de volumen en el registro (BitBucket).
#   7. Verifica que la papelera vuelve a funcionar (crea y recicla una
#      carpeta de prueba) y comprueba que se puede acceder a los SID
#      ajenos sin error.
# =====================================================================
[CmdletBinding()]
param(
    [string]$Volumen = 'E',
    [switch]$BorrarTambienMiPapelera,
    [switch]$NoBorrarNada          # solo diagnostico/posesion, sin borrar
)

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# $PSScriptRoot puede llegar vacio segun como se invoque el script
$base = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $base) { $base = (Get-Location).Path }

$ErrorActionPreference = 'Continue'
$raiz    = "$($Volumen):\`$Recycle.Bin"
$miSid   = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$sello   = Get-Date -Format 'yyyyMMdd-HHmmss'
$logDir  = Join-Path $base "registro-$sello"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Start-Transcript -Path (Join-Path $logDir 'reparacion.log') -Force | Out-Null

function Titulo($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "  [OK]  $t" -ForegroundColor Green }
function Aviso($t)  { Write-Host "  [!]   $t" -ForegroundColor Yellow }
function Error2($t) { Write-Host "  [X]   $t" -ForegroundColor Red }

# ---------------------------------------------------------------- 1
Titulo "1. Comprobando privilegios"
$esAdmin = ([System.Security.Principal.WindowsPrincipal][System.Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Error2 "Este script necesita una consola ELEVADA (Ejecutar como administrador)."
    Stop-Transcript | Out-Null
    exit 1
}
Ok "Consola elevada. Usuario: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
Ok "SID del usuario actual: $miSid"

if (-not (Test-Path -LiteralPath $raiz)) {
    Aviso "No existe $raiz. No hay nada que reparar; Windows la recreara sola."
}

# ---------------------------------------------------------------- 2
Titulo "2. Copia de seguridad del ACL actual"
if (Test-Path -LiteralPath $raiz) {
    & icacls $raiz /save (Join-Path $logDir 'acl-recyclebin-antes.txt') /T /C 2>&1 | Out-Null
    & icacls $raiz 2>&1 | Set-Content -LiteralPath (Join-Path $logDir 'acl-recyclebin-antes-legible.txt')
    Ok "ACL guardado en $logDir"
}

# ---------------------------------------------------------------- 3
Titulo "3. Tomando posesion de la Papelera de E:"
# /setowner + /grant son imprescindibles: sin esto, ni un administrador
# puede borrar la carpeta (el propietario es TrustedInstaller).
& takeown /F $raiz /A /R /D S 2>&1 | Out-Null
& icacls $raiz /setowner "Administradores" /T /C 2>&1 | Out-Null
& icacls $raiz /grant "Administradores:(OI)(CI)F" /T /C 2>&1 | Out-Null
# Limpia atributos de solo lectura que impiden el borrado recursivo
try {
    Get-ChildItem -LiteralPath $raiz -Force -Recurse -ErrorAction SilentlyContinue |
        ForEach-Object { try { $_.Attributes = ($_.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)) } catch {} }
    Ok "Posesion y permisos aplicados; atributos de solo lectura limpiados."
} catch { Aviso "Aviso limpiando atributos: $($_.Exception.Message)" }

# ---------------------------------------------------------------- 4
Titulo "4. Carpetas SID presentes"
$sidDirs = @(Get-ChildItem -LiteralPath $raiz -Force -Directory -ErrorAction SilentlyContinue)
$ajenas  = @($sidDirs | Where-Object { $_.Name -ne $miSid -and $_.Name -ne 'S-1-5-18' })
$propias = @($sidDirs | Where-Object { $_.Name -eq $miSid })

foreach ($d in $sidDirs) {
    $marca = if ($d.Name -eq $miSid) { '  <-- TU PAPELERA ACTUAL (se conserva)' } else { '  <-- ajena/huerfana' }
    Write-Host ("  {0}{1}" -f $d.Name, $marca)
}

if ($NoBorrarNada) {
    Aviso "-NoBorrarNada activado: no se borra nada. Fin."
    Stop-Transcript | Out-Null
    exit 0
}

$aBorrar = @($ajenas)
if ($BorrarTambienMiPapelera) { $aBorrar = @($sidDirs | Where-Object { $_.Name -ne 'S-1-5-18' }) }

if ($aBorrar.Count -eq 0) {
    Ok "No hay carpetas SID ajenas que borrar."
} else {
    Write-Host ""
    Write-Host ("  Se van a borrar {0} carpeta(s) de la papelera:" -f $aBorrar.Count) -ForegroundColor Yellow
    foreach ($d in $aBorrar) { Write-Host "     - $($d.FullName)" }
    if (-not $BorrarTambienMiPapelera) {
        Write-Host "  (Tu papelera actual NO se toca.)" -ForegroundColor Green
    }
    Write-Host ""
    $r = Read-Host "  Escribe SI para confirmar el borrado"
    if ($r -ne 'SI') { Aviso "Cancelado por el usuario. No se borro nada."; Stop-Transcript | Out-Null; exit 0 }

    foreach ($d in $aBorrar) {
        Write-Host "  Borrando $($d.FullName) ..."
        & cmd /c rd /s /q "`"$($d.FullName)`"" 2>&1 | Out-Null
        if (Test-Path -LiteralPath $d.FullName) {
            Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $d.FullName) { Error2 "No se pudo borrar: $($d.FullName)" }
        else { Ok "Borrada: $($d.Name)" }
    }
}

# ---------------------------------------------------------------- 5
Titulo "5. Restaurando el ACL de fabrica de la raiz"
$acl = Get-Acl -LiteralPath $raiz
$acl.SetAccessRuleProtection($false, $false)      # vuelve a heredar de E:\
foreach ($regla in @($acl.Access)) {
    if ($regla.IdentityReference -eq 'Todos' -or $regla.IdentityReference -eq 'Everyone' -or $regla.IdentityReference -eq 'S-1-1-0') {
        [void]$acl.RemoveAccessRule($regla)
        Aviso "Eliminada regla no estandar: TODOS = Modify"
    }
}
$acl.SetOwner((New-Object System.Security.Principal.NTAccount('NT AUTHORITY\SYSTEM')))
Set-Acl -LiteralPath $raiz -AclObject $acl -ErrorAction SilentlyContinue
& icacls $raiz /reset 2>&1 | Out-Null
Ok "ACL restaurado a la herencia estandar."
& icacls $raiz 2>&1 | Set-Content -LiteralPath (Join-Path $logDir 'acl-recyclebin-despues.txt')

# ---------------------------------------------------------------- 6
Titulo "6. Limpiando la configuracion de volumen en el registro"
$guid = $null
try {
    $props = (Get-ItemProperty 'HKLM:\SYSTEM\MountedDevices' -ErrorAction Stop).PSObject.Properties
    foreach ($p in $props) {
        if ($p.Name -eq "\DosDevices\$($Volumen):") {
            $bytes = $p.Value
            if ($bytes -is [byte[]] -and $bytes.Length -ge 24) {
                $g = New-Object byte[] 16
                [Array]::Copy($bytes, 8, $g, 0, 16)
                $guid = (New-Object Guid(,$g)).ToString()
            }
        }
    }
} catch { Aviso "No se pudo leer MountedDevices: $($_.Exception.Message)" }

if ($guid) {
    Ok "GUID de volumen de ${Volumen}: = $guid"
    $clave = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\BitBucket\Volume\{$guid}"
    if (Test-Path $clave) {
        Remove-Item -LiteralPath $clave -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path $clave) { Aviso "No se pudo borrar $clave" } else { Ok "Configuracion de volumen borrada (se recreara con valores por defecto)." }
    } else { Ok "No habia configuracion de volumen que limpiar." }
} else {
    Aviso "No se pudo determinar el GUID de volumen; se omite este paso (no es critico)."
}

# ---------------------------------------------------------------- 7
Titulo "7. Verificando que la papelera vuelve a funcionar"

# 7.a recrear la carpeta si se borro
if (-not (Test-Path -LiteralPath $raiz)) {
    New-Item -ItemType Directory -Path $raiz -Force | Out-Null
    & attrib +s +h $raiz 2>&1 | Out-Null
    Ok "Carpeta $raiz recreada."
}

# 7.b acceso a cada SID restante
foreach ($d in Get-ChildItem -LiteralPath $raiz -Force -Directory -ErrorAction SilentlyContinue) {
    $n = 0
    try { $n = @(Get-ChildItem -LiteralPath $d.FullName -Force -ErrorAction SilentlyContinue).Count; Ok "Acceso correcto a $($d.Name) ($n elementos)" }
    catch { Error2 "SIN ACCESO a $($d.Name): $($_.Exception.Message)" }
}

# 7.c prueba real: crear un archivo y mandarlo a la papelera
Aviso "AHORA PUEDE APARECER EN PANTALLA EL AVISO DE LA PAPELERA."
Aviso "Si sale: pulsa 'Si' y dime que ha salido -> el arreglo no basto."
Aviso "Si NO sale nada: el arreglo ha funcionado."
Write-Host ""
$prueba = Join-Path $env:TEMP "prueba-papelera-$sello.txt"
Set-Content -LiteralPath $prueba -Value "prueba de papelera" -Encoding UTF8
try {
    # ventana separada: si Windows muestra un aviso, no bloquea este script
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        "`$sh = New-Object -ComObject Shell.Application; `$sh.Namespace(0).ParseName('$prueba').InvokeVerb('delete'); Start-Sleep -Seconds 2"
    )
    Start-Sleep -Seconds 2
    if (Test-Path -LiteralPath $prueba) { Aviso "El archivo de prueba sigue en su sitio (revisa si salio un aviso en pantalla)." }
    else { Ok "El archivo de prueba se reciclo correctamente: la papelera responde." }
} catch {
    Aviso "No se pudo automatizar la prueba ($($_.Exception.Message)). Prueba manual: borra un archivo en E: y mira si sale el aviso."
    Remove-Item -LiteralPath $prueba -Force -ErrorAction SilentlyContinue
}

Titulo "Resultado"
Write-Host "  Registro completo: $logDir" -ForegroundColor Green
Write-Host ""
Write-Host "  Si vuelve a aparecer el aviso: reinicia el Explorador (o el PC) y repite." -ForegroundColor Yellow
Write-Host "  Como ultimo recurso: chkdsk E: /f  (revisa metadatos del disco)." -ForegroundColor Yellow

Stop-Transcript | Out-Null
Write-Host ""
Read-Host "Pulsa ENTER para cerrar"
