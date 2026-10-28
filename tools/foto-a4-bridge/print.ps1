param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('printers', 'caps', 'print', 'prefs')]
  [string]$Mode,
  [string]$Printer,
  [string]$Image,
  [string]$Paper = 'A4',
  [string]$Res = '',
  [int]$Copies = 1,
  [string]$ToFile = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

function Send-Json($obj) {
  $obj | ConvertTo-Json -Compress -Depth 8
}

function Fail($message) {
  Send-Json @{ ok = $false; error = $message }
  exit 1
}

try {
  if ($Mode -eq 'printers') {
    $list = @()
    $defaultName = ''
    try {
      $defaultName = (Get-CimInstance Win32_Printer -ErrorAction Stop | Where-Object { $_.Default } | Select-Object -First 1).Name
    } catch { $defaultName = '' }
    foreach ($p in Get-Printer -ErrorAction Stop) {
      $list += @{ name = $p.Name; default = ($p.Name -eq $defaultName) }
    }
    Send-Json @{ ok = $true; printers = $list }
    exit 0
  }

  $settings = New-Object System.Drawing.Printing.PrinterSettings
  if ($Printer) { $settings.PrinterName = $Printer }
  if (-not $settings.IsValid) { Fail "La impresora no está disponible: $Printer" }

  if ($Mode -eq 'prefs') {
    Start-Process -FilePath 'rundll32.exe' -ArgumentList "printui.dll,PrintUIEntry /e /n `"$($settings.PrinterName)`""
    Send-Json @{ ok = $true }
    exit 0
  }

  if ($Mode -eq 'caps') {
    $papers = @()
    foreach ($p in $settings.PaperSizes) {
      $papers += @{ name = $p.PaperName; width = $p.Width; height = $p.Height }
    }
    $resolutions = @()
    foreach ($r in $settings.PrinterResolutions) {
      if ($r.Kind -eq [System.Drawing.Printing.PrinterResolutionKind]::Custom -and $r.X -gt 0) {
        $resolutions += @{ id = "xy:$($r.X):$($r.Y)"; label = "$($r.X) ppp" }
      } else {
        $resolutions += @{ id = "kind:$($r.Kind)"; label = $r.Kind.ToString() }
      }
    }
    Send-Json @{
      ok          = $true
      printer     = $settings.PrinterName
      color       = $settings.SupportsColor
      duplex      = $settings.CanDuplex
      maxCopies   = $settings.MaximumCopies
      papers      = $papers
      resolutions = $resolutions
    }
    exit 0
  }

  if ($Mode -eq 'print') {
    if (-not $Image -or -not (Test-Path -LiteralPath $Image)) { Fail 'No se recibió la imagen a imprimir.' }

    $defaultBefore = ''
    try {
      $defaultBefore = (Get-CimInstance Win32_Printer -ErrorAction Stop | Where-Object { $_.Default } | Select-Object -First 1).Name
    } catch { $defaultBefore = '' }

    $img = [System.Drawing.Image]::FromFile($Image)
    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings = $settings
    $doc.DocumentName = 'Foto A4'
    $doc.OriginAtMargins = $false
    $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
    $doc.DefaultPageSettings.Landscape = $false

    $paperSize = $settings.PaperSizes | Where-Object { $_.PaperName -eq $Paper } | Select-Object -First 1
    if ($paperSize) { $doc.DefaultPageSettings.PaperSize = $paperSize }

    if ($Res) {
      $resolution = New-Object System.Drawing.Printing.PrinterResolution
      if ($Res -like 'kind:*') {
        $resolution.Kind = [System.Drawing.Printing.PrinterResolutionKind]$Res.Substring(5)
      } elseif ($Res -like 'xy:*') {
        $parts = $Res.Split(':')
        $resolution.Kind = [System.Drawing.Printing.PrinterResolutionKind]::Custom
        $resolution.X = [int]$parts[1]
        $resolution.Y = [int]$parts[2]
      }
      $doc.DefaultPageSettings.PrinterResolution = $resolution
    }

    $settings.Copies = [Math]::Max(1, [Math]::Min(99, $Copies))

    if ($ToFile) {
      $settings.PrintToFile = $true
      $settings.PrintFileName = $ToFile
    }

    $doc.add_PrintPage({
        param($sender, $e)
        $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $e.Graphics.DrawImage($img, 0, 0, $e.PageBounds.Width, $e.PageBounds.Height)
        $e.HasMorePages = $false
      })

    $doc.Print()
    $img.Dispose()
    $doc.Dispose()

    # Algunos drivers (Microsoft Print to PDF) se marcan como predeterminados al
    # imprimir. Se restaura la impresora que el usuario tenía.
    try {
      $defaultAfter = (Get-CimInstance Win32_Printer -ErrorAction Stop | Where-Object { $_.Default } | Select-Object -First 1).Name
      if ($defaultBefore -and $defaultAfter -and ($defaultAfter -ne $defaultBefore)) {
        Start-Process -FilePath 'rundll32.exe' -ArgumentList "printui.dll,PrintUIEntry /y /n `"$defaultBefore`"" -Wait -WindowStyle Hidden
      }
    } catch { }

    Send-Json @{ ok = $true; printer = $settings.PrinterName; copies = $settings.Copies }
    exit 0
  }

  Fail 'Modo no reconocido.'
} catch {
  Fail $_.Exception.Message
}
