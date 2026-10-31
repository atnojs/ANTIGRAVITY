# Compila PASAFOTOS.exe con el compilador de .NET Framework 4.8 (sin Visual Studio, sin NuGet).
# Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1
param([switch]$Silencioso)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$wpf = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF'
$sysXaml = 'C:\Windows\Microsoft.NET\assembly\GAC_MSIL\System.Xaml\v4.0_4.0.0.0__b77a5c561934e089\System.Xaml.dll'
$sysDll = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.dll'
$sysCore = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Core.dll'

foreach ($f in @($csc, "$wpf\PresentationFramework.dll", "$wpf\PresentationCore.dll", "$wpf\WindowsBase.dll", $sysXaml, $sysDll, $sysCore)) {
    if (-not (Test-Path $f)) { throw "Falta una pieza del compilador: $f" }
}

# --- Fuente Electrolize junto al ejecutable ---
$ttfOrigen = 'E:\ANTIGRAVITY\apps\conversor_multimedia\vendor\electrolize.ttf'
$ttfDestino = Join-Path $dir 'electrolize.ttf'
if ((Test-Path $ttfOrigen) -and -not (Test-Path $ttfDestino)) { Copy-Item $ttfOrigen $ttfDestino -Force }

# --- Icono de la app (dibujado por código, mismo lenguaje visual que la UI) ---
function New-Icono {
    param([string]$Ruta)
    Add-Type -AssemblyName System.Drawing
    $tam = 256
    $bmp = New-Object System.Drawing.Bitmap($tam, $tam, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    $rect = New-Object System.Drawing.Rectangle(10, 10, 236, 236)
    $radio = 54
    $camino = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radio * 2
    $camino.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $camino.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $camino.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $camino.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $camino.CloseFigure()
    $pincel = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 0, 208, 208), [System.Drawing.Color]::FromArgb(255, 38, 198, 38), 45.0)
    $g.FillPath($pincel, $camino)

    # Carpeta blanca
    $blanco = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $oscuro = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 21, 27))
    $rutaCarpeta = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rutaCarpeta.AddPolygon([System.Drawing.Point[]]@(
        (New-Object System.Drawing.Point(58, 92)),
        (New-Object System.Drawing.Point(114, 92)),
        (New-Object System.Drawing.Point(134, 112)),
        (New-Object System.Drawing.Point(198, 112)),
        (New-Object System.Drawing.Point(198, 172)),
        (New-Object System.Drawing.Point(58, 172))
    ))
    $g.FillPath($blanco, $rutaCarpeta)
    # Flecha hacia abajo (copia)
    $lapiz = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 21, 27), 15)
    $lapiz.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lapiz.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($lapiz, 128, 122, 128, 152)
    $g.DrawLine($lapiz, 108, 137, 128, 157)
    $g.DrawLine($lapiz, 148, 137, 128, 157)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $png = $ms.ToArray()
    $ms.Dispose()

    $fs = [System.IO.File]::Create($Ruta)
    $bw = New-Object System.IO.BinaryWriter($fs)
    $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
    $bw.Write([Byte]0); $bw.Write([Byte]0)
    $bw.Write([Byte]0); $bw.Write([Byte]0)
    $bw.Write([UInt16]1); $bw.Write([UInt16]32)
    $bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)
    $bw.Write($png)
    $bw.Flush(); $bw.Close(); $fs.Close()
}

$ico = Join-Path $dir 'app.ico'
New-Icono -Ruta $ico

# --- Compilación ---
$salida = Join-Path $dir 'PasaFotos.exe'
if (Test-Path $salida) { Remove-Item $salida -Force }

$argOut = '/out:' + $salida
$argIcono = '/win32icon:' + $ico
$argPf = '/r:' + "$wpf\PresentationFramework.dll"
$argPc = '/r:' + "$wpf\PresentationCore.dll"
$argWb = '/r:' + "$wpf\WindowsBase.dll"
$argXaml = '/r:' + $sysXaml
$argSys = '/r:' + $sysDll
$argCore = '/r:' + $sysCore
$argResUi = '/resource:' + (Join-Path $dir 'ui.xaml') + ',ui.xaml'
$argResTtf = '/resource:' + (Join-Path $dir 'electrolize.ttf') + ',electrolize.ttf'

$argumentos = @(
    '/nologo', '/target:winexe', '/platform:anycpu', '/optimize+', '/codepage:65001',
    $argOut,
    $argIcono,
    $argPf,
    $argPc,
    $argWb,
    $argXaml,
    $argSys,
    $argCore,
    $argResUi,
    $argResTtf,
    (Join-Path $dir 'PasaFotos.Core.cs'),
    (Join-Path $dir 'PasaFotos.Ui.cs')
)

& $csc @argumentos 2>&1 | ForEach-Object { $_ }
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $salida)) { throw "La compilación ha fallado (csc devolvió $LASTEXITCODE)." }

$hash = (Get-FileHash $salida -Algorithm SHA256).Hash
$tam = (Get-Item $salida).Length
if (-not $Silencioso) {
    Write-Host ''
    Write-Host ('PASAFOTOS.exe compilado: {0:N0} bytes' -f $tam) -ForegroundColor Cyan
    Write-Host ('SHA256: {0}' -f $hash) -ForegroundColor DarkGray
}
