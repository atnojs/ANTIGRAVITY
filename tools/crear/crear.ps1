<#
  crear.ps1 — generador de código, imágenes y vídeo con las vías gratuitas del equipo.
  Versión 1.0.0 (2026-11-07)

  No guarda claves: las lee del .env del equipo (E:\hermes-data\.env) en cada ejecución
  y nunca las imprime ni las escribe en disco.

  Uso rápido:
    .\crear.ps1 estado
    .\crear.ps1 code -Texto "funcion en PowerShell que cuente palabras de un fichero"
    .\crear.ps1 img  -Texto "manzana roja sobre fondo blanco, foto de estudio" -Ancho 1024 -Alto 1024
    .\crear.ps1 video -Texto "una ola rompiendo al amanecer, plano lento"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('estado', 'code', 'img', 'video')]
    [string]$Accion,

    # Texto de la petición (código, imagen o vídeo).
    [string]$Texto = '',

    # Alternativa a -Texto: fichero del que se lee la petición.
    [string]$Desde = '',

    # Fichero de salida. Por defecto: .\salidas\<fecha>-<accion>.<ext>
    [string]$Salida = '',

    [int]$Ancho = 1024,
    [int]$Alto = 1024,

    # Solo para img: modelo de Pollinations (flux, turbo...). Vacío = flux.
    [string]$Modelo = '',

    # Solo para video: lanza flow.py de verdad (abre Chrome y GASTA puntos de Flow).
    [switch]$Generar,

    # Ruta alternativa al .env con las claves.
    [string]$EnvFile = ''
)

$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
# Consola en UTF-8: en PowerShell 5.1 los acentos salen como simbolos raros si no.
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding $false } catch { }
$Script:Version = '1.0.0'
$Script:InstruccionIdioma = 'Todo texto generado debe estar obligatoriamente en espanol.'

function Escribir-Info  { param([string]$m) Write-Host "[crear] $m" -ForegroundColor Cyan }
function Escribir-Aviso { param([string]$m) Write-Host "[crear] $m" -ForegroundColor Yellow }
function Escribir-Fallo { param([string]$m) [Console]::Error.WriteLine("[crear] $m") }

# ---------- claves y rutas ----------

function Get-RutaEnv {
    param([string]$RutaIndicada)
    if ($RutaIndicada) {
        if (Test-Path $RutaIndicada) { return (Resolve-Path $RutaIndicada).Path }
        return ''
    }
    foreach ($c in @('E:\hermes-data\.env', '\\Principal\e\hermes-data\.env')) {
        if (Test-Path $c) { return $c }
    }
    return ''
}

function Get-Claves {
    param([string]$Ruta)
    $claves = @{}
    if (-not $Ruta) { return $claves }
    foreach ($linea in (Get-Content -LiteralPath $Ruta -ErrorAction SilentlyContinue)) {
        if ($linea -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$') {
            $k = $matches[1]
            $v = $matches[2].Trim()
            if ($v.Length -ge 2 -and $v.StartsWith('"') -and $v.EndsWith('"')) {
                $v = $v.Substring(1, $v.Length - 2)
            }
            $claves[$k] = $v
        }
    }
    return $claves
}

function Get-Peticion {
    if ($Texto -and $Desde) {
        throw 'Usa -Texto o -Desde, no los dos.'
    }
    $textoFinal = $Texto
    if ($Desde) {
        if (-not (Test-Path $Desde)) { throw "No existe el fichero de entrada: $Desde" }
        $textoFinal = (Get-Content -LiteralPath $Desde -Raw)
    }
    $textoFinal = ($textoFinal -replace '\s+$', '')
    if (-not $textoFinal) {
        throw 'Falta la petición: usa -Texto "..." o -Desde <fichero>.'
    }
    return $textoFinal
}

function Get-RutaSalida {
    param([string]$Accion, [string]$Extension, [string]$Destino)
    if ($Destino) {
        $carpeta = Split-Path -Parent $Destino
        if ($carpeta -and -not (Test-Path $carpeta)) { New-Item -ItemType Directory -Path $carpeta -Force | Out-Null }
        return $Destino
    }
    $base = Join-Path (Get-Location).Path 'salidas'
    if (-not (Test-Path $base)) { New-Item -ItemType Directory -Path $base -Force | Out-Null }
    $sello = (Get-Date).ToString('yyyyMMdd-HHmmss')
    return (Join-Path $base ("{0}-{1}.{2}" -f $Accion, $sello, $Extension))
}

# ---------- código ----------

function Invoke-PostJson {
    <#
      PowerShell 5.1 decodifica como Latin-1 el JSON que llega sin charset en la cabecera,
      y eso rompe los acentos (una tilde llega como dos caracteres raros). Aquí se leen los bytes crudos
      y se decodifican siempre como UTF-8, que es lo que envian los proveedores.
    #>
    param([string]$Url, [hashtable]$Cabeceras, [string]$Cuerpo)

    $bytes = [Text.Encoding]::UTF8.GetBytes($Cuerpo)
    $respuesta = Invoke-WebRequest -Method Post -Uri $Url -Headers $Cabeceras `
        -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 120 -UseBasicParsing

    $flujo = $respuesta.RawContentStream
    $flujo.Position = 0
    $lector = New-Object IO.StreamReader($flujo, (New-Object Text.UTF8Encoding $false))
    try { $texto = $lector.ReadToEnd() } finally { $lector.Dispose() }

    return ($texto | ConvertFrom-Json)
}

function Invoke-ProveedorTexto {
    param(
        [string]$Nombre,
        [string]$Url,
        [string]$ModeloId,
        [hashtable]$Cabeceras,
        [string]$Cuerpo,
        [string]$Tipo
    )

    $cronometro = [Diagnostics.Stopwatch]::StartNew()
    try {
        $respuesta = Invoke-PostJson -Url $Url -Cabeceras $Cabeceras -Cuerpo $Cuerpo
        $cronometro.Stop()

        $texto = ''
        if ($Tipo -eq 'gemini') {
            $texto = $respuesta.candidates[0].content.parts[0].text
        } else {
            $texto = $respuesta.choices[0].message.content
        }

        if (-not $texto) { throw 'respuesta sin texto' }

        return @{
            Ok        = $true
            Texto     = $texto.Trim()
            Proveedor = $Nombre
            Modelo    = $ModeloId
            Segundos  = [math]::Round($cronometro.Elapsed.TotalSeconds, 1)
        }
    }
    catch {
        $cronometro.Stop()
        $codigo = ''
        try { $codigo = $_.Exception.Response.StatusCode.value__ } catch { }
        return @{
            Ok        = $false
            Proveedor = $Nombre
            Modelo    = $ModeloId
            Error     = ("HTTP {0}: {1}" -f $codigo, $_.Exception.Message)
            Segundos  = [math]::Round($cronometro.Elapsed.TotalSeconds, 1)
        }
    }
}

function Invoke-Codigo {
    param([string]$Peticion, [hashtable]$Claves, [string]$ModeloForzado)

    $modeloOpenRouter = 'cohere/north-mini-code:free'
    $modeloGemini = 'gemini-3.1-flash-lite'
    if ($ModeloForzado) { $modeloGemini = $ModeloForzado }

    $peticion = $Peticion + "`n`n" + $Script:InstruccionIdioma
    $intentos = @()

    if ($Claves['OPENROUTER_API_KEY']) {
        $intentos += @{
            Nombre = 'openrouter'
            Url    = 'https://openrouter.ai/api/v1/chat/completions'
            Modelo = $modeloOpenRouter
            Tipo   = 'openai'
            Cabeceras = @{ Authorization = "Bearer $($Claves['OPENROUTER_API_KEY'])" }
            Cuerpo = (@{
                model    = $modeloOpenRouter
                messages = @(@{ role = 'user'; content = $peticion })
            } | ConvertTo-Json -Depth 8 -Compress)
        }
    }

    if ($Claves['GOOGLE_API_KEY']) {
        $intentos += @{
            Nombre = 'google'
            Url    = "https://generativelanguage.googleapis.com/v1beta/models/$modeloGemini`:generateContent?key=$($Claves['GOOGLE_API_KEY'])"
            Modelo = $modeloGemini
            Tipo   = 'gemini'
            Cabeceras = @{}
            Cuerpo = (@{
                contents = @(@{ parts = @(@{ text = $peticion }) })
            } | ConvertTo-Json -Depth 8 -Compress)
        }
    }

    if ($Claves['DEEPSEEK_API_KEY']) {
        $intentos += @{
            Nombre = 'deepseek (de pago, barato)'
            Url    = 'https://api.deepseek.com/chat/completions'
            Modelo = 'deepseek-chat'
            Tipo   = 'openai'
            Cabeceras = @{ Authorization = "Bearer $($Claves['DEEPSEEK_API_KEY'])" }
            Cuerpo = (@{
                model    = 'deepseek-chat'
                messages = @(@{ role = 'user'; content = $peticion })
            } | ConvertTo-Json -Depth 8 -Compress)
        }
    }

    if ($intentos.Count -eq 0) {
        throw 'No hay ninguna clave de texto disponible (OPENROUTER_API_KEY, GOOGLE_API_KEY o DEEPSEEK_API_KEY).'
    }

    foreach ($intento in $intentos) {
        Escribir-Info ("probando {0} ({1})..." -f $intento.Nombre, $intento.Modelo)
        $r = Invoke-ProveedorTexto -Nombre $intento.Nombre -Url $intento.Url -ModeloId $intento.Modelo `
            -Cabeceras $intento.Cabeceras -Cuerpo $intento.Cuerpo -Tipo $intento.Tipo
        if ($r.Ok) {
            Escribir-Info ("respondió {0} en {1}s" -f $r.Proveedor, $r.Segundos)
            return $r
        }
        Escribir-Aviso ("{0} fallo -> {1}" -f $r.Proveedor, $r.Error)
    }

    throw 'Todos los proveedores de texto fallaron.'
}

# ---------- imagen ----------

function Invoke-Imagen {
    param([string]$Peticion, [int]$Ancho, [int]$Alto, [string]$ModeloImagen, [string]$Destino)

    if ($Ancho -lt 64 -or $Ancho -gt 2048 -or $Alto -lt 64 -or $Alto -gt 2048) {
        throw 'Ancho y alto deben estar entre 64 y 2048.'
    }
    if (-not $ModeloImagen) { $ModeloImagen = 'flux' }

    # La instruccion de idioma vale para texto y audio; en una imagen solo contamina el prompt.
    $peticion = $Peticion
    if ($peticion.Length -gt 1500) {
        Escribir-Aviso ("la peticion tiene {0} caracteres; Pollinations puede rechazar URLs muy largas. Se recorta a 1500." -f $peticion.Length)
        $peticion = $peticion.Substring(0, 1500)
    }

    # Segundos Unix sin pasar por Get-Date -UFormat (devuelve coma decimal segun idioma).
    $semilla = [int]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() % 2147483647)
    $url = 'https://image.pollinations.ai/prompt/' + [uri]::EscapeDataString($peticion) +
        ('?width={0}&height={1}&nologo=true&model={2}&seed={3}' -f $Ancho, $Alto, [uri]::EscapeDataString($ModeloImagen), $semilla)

    $esperas = @(3, 8, 20)
    for ($intento = 0; $intento -lt $esperas.Count; $intento++) {
        $cronometro = [Diagnostics.Stopwatch]::StartNew()
        try {
            Invoke-WebRequest -Uri $url -OutFile $Destino -TimeoutSec 120 -UseBasicParsing
            $cronometro.Stop()

            $fichero = Get-Item -LiteralPath $Destino
            if ($fichero.Length -lt 4096) { throw ("fichero demasiado pequeno ({0} bytes)" -f $fichero.Length) }

            $fs = [IO.File]::OpenRead($Destino)
            try {
                $b1 = $fs.ReadByte(); $b2 = $fs.ReadByte()
            } finally { $fs.Dispose() }
            $esJpeg = ($b1 -eq 0xFF -and $b2 -eq 0xD8)
            $esPng = ($b1 -eq 0x89 -and $b2 -eq 0x50)
            if (-not ($esJpeg -or $esPng)) { throw 'el fichero descargado no es JPEG ni PNG' }

            # Si llega PNG, no se queda con extension .jpg/.jpeg: se renombra a .png.
            if ($esPng -and (@('.jpg', '.jpeg') -contains $fichero.Extension.ToLower())) {
                $rutaPng = [IO.Path]::ChangeExtension($fichero.FullName, '.png')
                Move-Item -LiteralPath $fichero.FullName -Destination $rutaPng -Force
                $fichero = Get-Item -LiteralPath $rutaPng
            }

            return @{
                Ok       = $true
                Ruta     = $fichero.FullName
                Bytes    = $fichero.Length
                Ancho    = $Ancho
                Alto     = $Alto
                Modelo   = $ModeloImagen
                Segundos = [math]::Round($cronometro.Elapsed.TotalSeconds, 1)
            }
        }
        catch {
            $cronometro.Stop()
            $mensaje = $_.Exception.Message
            $codigo = 0
            try { $codigo = $_.Exception.Response.StatusCode.value__ } catch { }
            if (Test-Path $Destino) { Remove-Item -LiteralPath $Destino -Force -ErrorAction SilentlyContinue }

            # 402/403: la cuota gratuita anonima esta agotada. Reintentar no sirve.
            if ($codigo -eq 402 -or $codigo -eq 403) {
                return @{
                    Ok        = $false
                    Cuota     = $true
                    Codigo    = $codigo
                    Error     = ("HTTP {0}: la cuota gratuita de Pollinations está agotada para esta IP" -f $codigo)
                }
            }

            if ($intento -eq $esperas.Count - 1) {
                return @{ Ok = $false; Cuota = $false; Codigo = $codigo; Error = $mensaje }
            }
            Escribir-Aviso ("intento {0} falló ({1}); reintento en {2}s" -f ($intento + 1), $mensaje, $esperas[$intento])
            Start-Sleep -Seconds $esperas[$intento]
        }
    }
    return @{ Ok = $false; Error = 'sin respuesta' }
}

# ---------- vídeo ----------

function Get-RutaFlow {
    foreach ($c in @('E:\herramientas\google-flow\flow.py', '\\Principal\e\herramientas\google-flow\flow.py')) {
        if (Test-Path $c) { return $c }
    }
    return ''
}

function Get-ChromeFlow {
    try {
        return @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -and $_.CommandLine -match 'flowbot-profile' })
    }
    catch {
        # Sin permisos para leer la linea de comandos: no se puede afirmar nada.
        return @()
    }
}

function Invoke-Video {
    param([string]$Peticion, [switch]$Lanzar)

    $flow = Get-RutaFlow
    if (-not $flow) {
        Escribir-Fallo 'No encuentro flow.py (E:\herramientas\google-flow\flow.py). El video con Veo necesita esa instalacion.'
        return 2
    }

    $enUso = @(Get-ChromeFlow)
    if ($enUso.Count -gt 0) {
        Escribir-Aviso ("hay {0} proceso(s) de Chrome usando el perfil de Flow. Playwright no abre un perfil en uso: cierralos antes de generar." -f $enUso.Count)
    }

    $slug = ($Peticion.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
    if ($slug.Length -gt 40) { $slug = $slug.Substring(0, 40).Trim('-') }
    if (-not $slug) { $slug = 'video' }
    $slug = $slug + '-' + (Get-Date).ToString('HHmmss')

    # Comillas simples para el comando imprimible: aguanta comillas dobles dentro del prompt.
    $promptImprimible = "'" + ($Peticion -replace "'", "''") + "'"
    $comando = 'python "{0}" video --prompt {1} --ratio 16:9 --model "Veo 3.1 - Lite" --name {2} --out outputs' -f $flow, $promptImprimible, $slug
    $carpetaFlow = Split-Path -Parent $flow

    Escribir-Info 'comando que gasta 1 de los 5 vídeos diarios (50 puntos):'
    Write-Host ''
    Write-Host ("  cd " + $carpetaFlow) -ForegroundColor White
    Write-Host ("  " + $comando) -ForegroundColor White
    Write-Host ''

    if (-not $Lanzar) {
        Escribir-Info 'no se ha lanzado nada. Añade -Generar para ejecutarlo de verdad.'
        return 0
    }

    Escribir-Aviso 'lanzando flow.py: abre Chrome, tarda minutos y gasta puntos. No cierres la ventana.'
    Push-Location $carpetaFlow
    try {
        & python $flow video --prompt $Peticion --ratio 16:9 --model 'Veo 3.1 - Lite' --name $slug --out outputs
        $codigo = $LASTEXITCODE
    }
    finally { Pop-Location }

    if ($codigo -ne 0) {
        Escribir-Fallo ("flow.py terminó con código {0}. Si dijiste que no habia puntos, es cuota, no un fallo del codigo." -f $codigo)
        return 1
    }

    Escribir-Info ("video generado. Búscalo en E:\herramientas\google-flow\outputs\ (id {0})" -f $slug)
    return 0
}

# ---------- estado ----------

function Get-Estado {
    param([hashtable]$Claves, [string]$RutaEnv)

    Write-Host ''
    Write-Host ("crear.ps1 v{0} - estado de las vías gratuitas" -f $Script:Version) -ForegroundColor White
    Write-Host ('=' * 62) -ForegroundColor DarkGray

    $correctas = 0

    if ($RutaEnv) { Escribir-Info (".env: {0}" -f $RutaEnv) }
    else { Escribir-Aviso 'no encuentro el .env del equipo (ni E:\hermes-data\.env ni \\Principal\e\hermes-data\.env)' }

    $nombres = @('OPENROUTER_API_KEY', 'GOOGLE_API_KEY', 'DEEPSEEK_API_KEY')
    foreach ($n in $nombres) {
        if ($Claves[$n]) { Write-Host ("  clave {0,-22} presente" -f $n) -ForegroundColor Green }
        else { Write-Host ("  clave {0,-22} ausente" -f $n) -ForegroundColor DarkGray }
    }

    Write-Host ''
    Write-Host 'Probando en vivo...' -ForegroundColor White

    # 1. Texto gratis (OpenRouter)
    if ($Claves['OPENROUTER_API_KEY']) {
        $r = Invoke-ProveedorTexto -Nombre 'openrouter' -Url 'https://openrouter.ai/api/v1/chat/completions' `
            -ModeloId 'cohere/north-mini-code:free' -Tipo 'openai' `
            -Cabeceras @{ Authorization = "Bearer $($Claves['OPENROUTER_API_KEY'])" } `
            -Cuerpo (@{ model = 'cohere/north-mini-code:free'; messages = @(@{ role = 'user'; content = 'Responde solo: OK' }) } | ConvertTo-Json -Depth 8 -Compress)
        if ($r.Ok) { Write-Host ("  [OK]   texto gratis (openrouter)   {0}s" -f $r.Segundos) -ForegroundColor Green; $correctas++ }
        else { Write-Host ("  [FALLO] texto gratis (openrouter)  {0}" -f $r.Error) -ForegroundColor Red }
    }

    # 2. Texto gratis (Google)
    if ($Claves['GOOGLE_API_KEY']) {
        $r = Invoke-ProveedorTexto -Nombre 'google' `
            -Url "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=$($Claves['GOOGLE_API_KEY'])" `
            -ModeloId 'gemini-3.1-flash-lite' -Tipo 'gemini' -Cabeceras @{} `
            -Cuerpo (@{ contents = @(@{ parts = @(@{ text = 'Responde solo: OK' }) }) } | ConvertTo-Json -Depth 8 -Compress)
        if ($r.Ok) { Write-Host ("  [OK]   texto gratis (google)       {0}s" -f $r.Segundos) -ForegroundColor Green; $correctas++ }
        else { Write-Host ("  [FALLO] texto gratis (google)      {0}" -f $r.Error) -ForegroundColor Red }
    }

    # 3. Imagen gratis (Pollinations): una imagen pequena de verdad
    $tmp = Join-Path $env:TEMP ('crear-estado-{0}.jpg' -f ([guid]::NewGuid().ToString('N').Substring(0, 8)))
    $r = Invoke-Imagen -Peticion 'un punto azul sobre fondo blanco' -Ancho 256 -Alto 256 -ModeloImagen 'flux' -Destino $tmp
    if ($r.Ok) {
        Write-Host ("  [OK]   imagen gratis (pollinations) {0}s, {1} KB" -f $r.Segundos, [math]::Round($r.Bytes / 1KB, 0)) -ForegroundColor Green
        $correctas++
    }
    elseif ($r.Cuota) {
        Write-Host '  [SIN CUOTA] imagen gratis (pollinations): 402, cuota anónima agotada' -ForegroundColor Yellow
        Write-Host '              usa Flow/Nano Banana o IMAGE 2 LOW en unified-image-studio-hoola' -ForegroundColor DarkGray
    }
    else {
        Write-Host ("  [FALLO] imagen gratis (pollinations) {0}" -f $r.Error) -ForegroundColor Red
    }
    if (Test-Path $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }

    # 4. Video (Flow local)
    $flow = Get-RutaFlow
    if ($flow) { Write-Host '  [OK]   video con flow.py instalado (gasta 10 puntos por vídeo)' -ForegroundColor Green; $correctas++ }
    else { Write-Host '  [AUSENTE] flow.py no encontrado: sin video local' -ForegroundColor Yellow }

    $enUso = @(Get-ChromeFlow)
    if ($enUso.Count -gt 0) {
        Write-Host ("  [AVISO] {0} Chrome(s) con el perfil de Flow abierto" -f $enUso.Count) -ForegroundColor Yellow
    }

    Write-Host ''
    Write-Host 'Orden de uso recomendado: code -> openrouter gratis -> google gratis -> deepseek (de pago)' -ForegroundColor DarkGray
    Write-Host 'Imagen: solo Pollinations (gratis). Calidad alta: Unified Image Studio o Flow.' -ForegroundColor DarkGray

    if ($correctas -eq 0) {
        Escribir-Fallo 'ninguna vía está operativa: revisa el .env y la red (código 2).'
        return 2
    }
    return 0
}

# ---------- main ----------

$rutaEnv = Get-RutaEnv -RutaIndicada $EnvFile
$claves = Get-Claves -Ruta $rutaEnv

if ($Generar -and $Accion -ne 'video') {
    Escribir-Aviso '-Generar solo se aplica a la acción video; se ignora en las demás.'
}

try {
    switch ($Accion) {

    'estado' {
        exit (Get-Estado -Claves $claves -RutaEnv $rutaEnv)
    }

    'code' {
        $peticion = Get-Peticion
        $r = Invoke-Codigo -Peticion $peticion -Claves $claves -ModeloForzado $Modelo

        $destino = Get-RutaSalida -Accion 'code' -Extension 'md' -Destino $Salida
        $cabecera = @(
            "# crear.ps1 - código",
            "",
            "- fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
            "- proveedor: $($r.Proveedor)",
            "- modelo: $($r.Modelo)",
            "- segundos: $($r.Segundos)",
            "",
            "## Petición",
            "",
            $peticion,
            "",
            "## Respuesta",
            "",
            ""
        ) -join "`n"
        Set-Content -LiteralPath $destino -Value ($cabecera + $r.Texto) -Encoding UTF8

        Write-Host ''
        Write-Host $r.Texto
        Write-Host ''
        Escribir-Info ("guardado en {0}" -f $destino)
        exit 0
    }

    'img' {
        $peticion = Get-Peticion
        $destino = Get-RutaSalida -Accion 'img' -Extension 'jpg' -Destino $Salida
        $r = Invoke-Imagen -Peticion $peticion -Ancho $Ancho -Alto $Alto -ModeloImagen $Modelo -Destino $destino
        if (-not $r.Ok) {
            Escribir-Fallo ("no se pudo generar la imagen: {0}" -f $r.Error)
            if ($r.Cuota) {
                Write-Host ''
                Escribir-Aviso 'La vía gratis de imagen se ha quedado sin cuota. Alternativas reales:'
                Write-Host '  1. Flow / Nano Banana (tu cuenta, gasta puntos): apps/unified-image-studio-hoola' -ForegroundColor White
                Write-Host '  2. IMAGE 2 LOW, el más barato (~1-2 céntimos/imagen): apps/unified-image-studio-hoola' -ForegroundColor White
                Write-Host '  3. Gemini / Qwen en la misma app (pago por uso)' -ForegroundColor White
                Write-Host '  4. Esperar a que se reponga la cuota anónima de Pollinations (no anunciada)' -ForegroundColor White
                Write-Host ''
                Escribir-Info 'No se ha gastado nada: la petición no llegó a generar.'
                exit 2
            }
            exit 1
        }
        Escribir-Info ("imagen {0}x{1} en {2}s -> {3} ({4} KB)" -f $r.Ancho, $r.Alto, $r.Segundos, $r.Ruta, [math]::Round($r.Bytes / 1KB, 0))
        exit 0
    }

    'video' {
        $peticion = Get-Peticion
        exit (Invoke-Video -Peticion $peticion -Lanzar:$Generar)
    }
    }
}
catch {
    Escribir-Fallo $_.Exception.Message
    exit 1
}
