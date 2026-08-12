"""
Antigravity Command Center - Python Backend
Proporciona git status, health checks y estadisticas de imagenes por modelo.

Rutas montadas en /api/plugins/antigravity-command/dashboard/
"""
import subprocess
import urllib.request
import urllib.error
import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

ANTIGRAVITY_ROOT = Path(r"E:\ANTIGRAVITY")
# Proxy FLUX canonico: unico punto que sabe modelo + calidad de cada generacion
FLUX_PROXY = "https://atnojs.es/apps/generador_ia_flux/proxy.php"

# Map FLUX model ids -> etiquetas legibles
MODEL_LABELS = {
    "flux-2-klein-9b": "FLUX 2 Klein (barato)",
    "flux-2-pro": "FLUX 2 Pro (normal)",
    "flux-2-max": "FLUX 2 Max (pro)",
}


@router.get("/git-status")
async def git_status():
    """Devuelve estado de git en el repo Antigravity."""
    try:
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=ANTIGRAVITY_ROOT,
            capture_output=True, text=True, timeout=5
        )
        branch_name = branch.stdout.strip() or "desconocida"

        log = subprocess.run(
            ["git", "log", "-1", "--format=%s|%an|%ar"],
            cwd=ANTIGRAVITY_ROOT,
            capture_output=True, text=True, timeout=5
        )
        commit_info = log.stdout.strip()

        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ANTIGRAVITY_ROOT,
            capture_output=True, text=True, timeout=5
        )
        dirty_files = [line.strip() for line in status.stdout.splitlines() if line.strip()]
        dirty_count = len(dirty_files)

        return {
            "ok": True,
            "branch": branch_name,
            "commit": commit_info.split("|")[0] if commit_info else "",
            "author": commit_info.split("|")[1] if "|" in commit_info else "",
            "relative_date": commit_info.split("|")[2] if "|" in commit_info else "",
            "dirty": dirty_count > 0,
            "uncommitted": dirty_count
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/health")
async def health_check():
    """Verifica salud del proxy FLUX en Hostinger (sirve como canario de despliegue)."""
    try:
        req = urllib.request.Request(FLUX_PROXY, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            return {"ok": True, "status": resp.status, "proxy": "saludable"}
    except urllib.error.URLError as e:
        return {"ok": False, "status": getattr(e, "code", 0), "proxy": "no responde"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/image-stats")
async def image_stats():
    """Cuenta imagenes generadas por modelo leyendo las estadisticas del proxy FLUX.

    El proxy FLUX es el unico punto que registra el modelo real (flux-2-klein-9b /
    flux-2-pro / flux-2-max) de cada generacion en stats.json. Las apps de imagen
    guardan el modelo en su propio historial (ver history.php / history-manager.js);
    este endpoint agrega el total de generaciones FLUX por modelo.
    """
    try:
        req = urllib.request.Request(FLUX_PROXY, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        raw = (payload.get("stats") or {}).get("models") or {}
        total = (payload.get("stats") or {}).get("total") or sum(raw.values())
        breakdown = [
            {"model": mid, "label": MODEL_LABELS.get(mid, mid), "count": cnt}
            for mid, cnt in sorted(raw.items(), key=lambda kv: -kv[1])
        ]
        return {"ok": True, "total": total, "models": breakdown}
    except Exception as e:
        return {"ok": False, "error": str(e), "total": 0, "models": []}


@router.get("/ping")
async def ping():
    """Endpoint minimo para verificar que el backend esta vivo."""
    return {"ok": True, "plugin": "antigravity-command"}
