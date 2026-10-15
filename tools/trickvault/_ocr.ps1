# OCR nativo de Windows (Windows.Media.Ocr) desde PowerShell.
# Uso: _ocr.ps1 <ruta-imagen> [<ruta-imagen> ...]
# Imprime: <fichero>\t<texto reconocido en una linea>
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($op, $tipo) {
    $t = $asTaskGeneric.MakeGenericMethod($tipo).Invoke($null, @($op))
    $t.Wait(-1) | Out-Null
    $t.Result
}

$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]

$motor = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $motor) { Write-Error 'no hay motor OCR disponible'; exit 1 }

foreach ($ruta in $args) {
    try {
        $f = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ruta)) ([Windows.Storage.StorageFile])
        $s = Await ($f.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($s)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $res = Await ($motor.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
        $txt = ($res.Lines | ForEach-Object { $_.Text }) -join ' '
        Write-Output ("{0}`t{1}" -f $ruta, ($txt -replace '\s+', ' '))
    } catch {
        Write-Output ("{0}`tERROR {1}" -f $ruta, $_.Exception.Message)
    }
}
