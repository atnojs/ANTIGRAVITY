# Commit aislado para este repositorio: usa un GIT_INDEX_FILE propio y limita el
# commit a las rutas indicadas, para no arrastrar cambios que otros procesos
# (agentes en paralelo) tengan en el indice compartido de .git/index.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/commit-aislado.ps1 -Mensaje "..." -Rutas apps/foo,apps/bar
param(
    [Parameter(Mandatory = $true)][string]$Mensaje,
    [Parameter(Mandatory = $true)][string[]]$Rutas
)

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
