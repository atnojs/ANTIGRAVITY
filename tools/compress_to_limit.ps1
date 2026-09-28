param(
    [string]$srcPath,
    [string]$destPath,
    [int]$maxBytes = 58000
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $srcPath)) {
    Write-Error "Source path not found: $srcPath"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($srcPath)
$codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
$jpgCodec = $null
foreach ($c in $codecs) {
    if ($c.MimeType -eq 'image/jpeg') {
        $jpgCodec = $c
        break
    }
}

$saved = $false
foreach ($maxSide in @(700, 600, 500, 420, 360)) {
    $scale = [Math]::Min(1.0, $maxSide / [Math]::Max($img.Width, $img.Height))
    $w = [int]($img.Width * $scale)
    $h = [int]($img.Height * $scale)
    
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()

    foreach ($q in @(80, 70, 60, 50, 40, 30)) {
        $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$q)
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, $jpgCodec, $ep)
        $bytes = $ms.ToArray()
        $ms.Dispose()
        if ($bytes.Length -le $maxBytes) {
            [System.IO.File]::WriteAllBytes($destPath, $bytes)
            Write-Output "OK: Saved $destPath with $($bytes.Length) bytes (size: ${w}x${h}, q: $q)"
            $saved = $true
            break
        }
    }
    $bmp.Dispose()
    if ($saved) { break }
}

$img.Dispose()
if (-not $saved) {
    Write-Error "Could not compress $srcPath under $maxBytes bytes"
}
