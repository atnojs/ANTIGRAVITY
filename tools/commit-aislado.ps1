# Commit aislado para este repositorio: usa un GIT_INDEX_FILE propio y limita el
# commit a las rutas indicadas, para no arrastrar cambios que otros procesos
# (agentes en paralelo) tengan en el indice compartido de .git/index.
#
# Uso recomendado (la politica de ejecucion de este equipo bloquea invocar el .ps1
# directamente con &; se usa un proceso hijo con -ExecutionPolicy Bypass):
#   powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\commit-aislado.ps1 -Mensaje "..." -Rutas apps/foo,apps/bar
#
# Tambien acepta un array si se invoca desde una sesion con ExecutionPolicy que lo permita:
#   & E:\ANTIGRAVITY\tools\commit-aislado.ps1 -Mensaje "..." -Rutas @('apps/foo','apps/bar')
#
# Si git no tiene identidad configurada, exporta antes GIT_AUTHOR_NAME/EMAIL y
# GIT_COMMITTER_NAME/EMAIL en la misma sesion: el script no pasa -c al commit.
param(
    [Parameter(Mandatory = $true)][string]$Mensaje,
    [Parameter(Mandatory = $true)][string[]]$Rutas
)

# Normaliza las rutas: un array de PowerShell o una unica cadena "a,b" (forma -File).
$Rutas = @($Rutas | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
if ($Rutas.Count -eq 0) { throw 'No hay rutas que commitear.' }

$root = 'E:\ANTIGRAVITY'
$indexFile = Join-Path $env:TEMP ("dsh_index_" + [guid]::NewGuid().ToString('N'))
$env:GIT_INDEX_FILE = $indexFile

Push-Location $root
try {
    # Indice temporal vacio -> partimos de HEAD y anadimos solo lo pedido.
    & git read-tree HEAD
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inicializar el indice temporal.' }

    foreach ($r in $Rutas) {
        if (-not (Test-Path (Join-Path $root $r))) { Write-Output "AVISO: no existe $r"; continue }
        & git add -- $r
        if ($LASTEXITCODE -ne 0) { throw "git add fallo para $r" }
    }

    Write-Output '--- contenido que se va a commitear ---'
    & git diff --cached --name-status HEAD

    & git commit -q -m $Mensaje
    if ($LASTEXITCODE -ne 0) { throw 'git commit fallo (nada que commitear?)' }
    & git log --oneline -1
} finally {
    Pop-Location
    Remove-Item $indexFile -Force -ErrorAction SilentlyContinue
    Remove-Item "$indexFile.lock" -Force -ErrorAction SilentlyContinue
    Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
}
