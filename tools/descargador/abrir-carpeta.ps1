# Abre el Explorador en la carpeta de descargas (con el fichero seleccionado, si
# se indica) y TRAE LA VENTANA AL FRENTE.
#
# Por qué existe este script:
#   - Abrir `explorer.exe /select,...` desde el worker (un proceso en segundo
#     plano y oculto) dejaba la ventana detrás del navegador o minimizada.
#   - Las ventanas modernas del Explorador (las que abre el factory de Windows)
#     NO aparecen en Shell.Application.Windows(), así que se localizan por su
#     ventana real (clase CabinetWClass + título de la carpeta).
#   - Para darle el foco se pulsa Alt de forma sintética y se llama a
#     SetForegroundWindow: es el truco que salta el bloqueo de primer plano de
#     Windows cuando quien llama no es la ventana activa.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File abrir-carpeta.ps1 `
#     -Carpeta "D:\Descargas Y, I y T" [-Fichero "D:\...\video.mp4"]
#
# Sale con 0 si la ventana se ha abierto (se traiga al frente o no).

param(
  [Parameter(Mandatory = $true)][string]$Carpeta,
  [string]$Fichero = ''
)

$ErrorActionPreference = 'SilentlyContinue'

Add-Type @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class VentanaExplorador {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();

  // Ventanas del Explorador cuyo título contiene el nombre de la carpeta.
  public static List<string> Buscar(string titulo) {
    var r = new List<string>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var cls = new StringBuilder(64); GetClassName(h, cls, 64);
      if (cls.ToString() != "CabinetWClass") return true;
      var t = new StringBuilder(512); GetWindowText(h, t, 512);
      if (t.ToString().IndexOf(titulo, StringComparison.OrdinalIgnoreCase) < 0) return true;
      uint pid; GetWindowThreadProcessId(h, out pid);
      r.Add(h.ToInt64() + "|" + pid + "|" + IsIconic(h) + "|" + t.ToString());
      return true;
    }, IntPtr.Zero);
    return r;
  }

  // Restaura (si está minimizada) y activa la ventana con el truco de Alt.
  public static void Activar(IntPtr h) {
    ShowWindow(h, IsIconic(h) ? 9 : 1);
    keybd_event(0x12, 0, 0, UIntPtr.Zero);
    keybd_event(0x12, 0, 2, UIntPtr.Zero);
    SetForegroundWindow(h);
  }

  public static IntPtr PrimerPlano() { return GetForegroundWindow(); }
}
"@

if (-not (Test-Path -LiteralPath $Carpeta)) {
  Write-Output 'NO_EXISTE'
  exit 2
}

$nombre = Split-Path -Leaf $Carpeta
if ($nombre -eq '') { $nombre = $Carpeta }

# 1) Abrir el Explorador (seleccionando el fichero si se conoce).
#    -WindowStyle Normal es importante: el worker lanza PowerShell oculto y, sin
#    esto, la ventana del Explorador hereda ese estado y sale minimizada.
if ($Fichero -ne '' -and (Test-Path -LiteralPath $Fichero)) {
  Start-Process explorer.exe -ArgumentList ('/select,"' + $Fichero + '"') -WindowStyle Normal
} else {
  Start-Process explorer.exe -ArgumentList ('"' + $Carpeta + '"') -WindowStyle Normal
}

# 2) Buscar SU ventana. Se prefiere una NUEVA (la que acaba de abrirse), porque
#    puede haber ventanas viejas de la misma carpeta en la barra de tareas.
$antes = @([VentanaExplorador]::Buscar($nombre) | ForEach-Object { ($_ -split '\|')[0] })
$objetivo = $null
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Milliseconds 150
  $ahora = @([VentanaExplorador]::Buscar($nombre))
  if ($ahora.Count -gt 0) {
    $nuevas = @($ahora | Where-Object { $antes -notcontains ($_ -split '\|')[0] })
    if ($nuevas.Count -gt 0) { $objetivo = $nuevas[0]; break }
    # Puede haber sido una pestaña nueva en una ventana que ya existía.
    if ($i -ge 6) { $objetivo = $ahora[0]; break }
  }
}

if (-not $objetivo) {
  Write-Output 'SIN_VENTANA'
  exit 0
}

# 3) Traerla al frente.
$hwnd = [IntPtr][int64](($objetivo -split '\|')[0])
[VentanaExplorador]::Activar($hwnd)
Start-Sleep -Milliseconds 250
if ([VentanaExplorador]::PrimerPlano() -eq $hwnd) {
  Write-Output 'OK_FOCO'
} else {
  Write-Output 'OK_SIN_FOCO'
}
exit 0
