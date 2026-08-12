"""
Antigravity Command Center - Python Backend
Proporciona git status y health checks al plugin del dashboard.
"""
import subprocess
import os
from pathlib import Path

from hermes.plugin import router

ANTIGRAVITY_ROOT = Path(r"E:\ANTIGRAVITY")
PROXY_URL = "https://atnojs.es/apps/generador_ia_flux/proxy.php"


@router.get("/git-status")
async def git_status():
    """Devuelve estado de git en el repo Antigravity."""
    try:
        # Rama actual
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=ANTIGRAVITY_ROOT,
            capture_output=True, text=True, timeout=5
        )
        branch_name = branch.stdout.strip() or "desconocida"

        # Ultimo commit
        log = subprocess.run(
            ["git", "log", "-1", "--format=%s|%an|%ar"],
            cwd=ANTIGRAVITY_ROOT,
            capture_output=True, text=True, timeout=5
        )
        commit_info = log.stdout.strip()

        # Cambios sin commit
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
    """Verifica salud del proxy FLUX en Hostinger."""
    import urllib.request
    import urllib.error
    try:
        req = urllib.request.Request(PROXY_URL, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            return {"ok": True, "status": resp.status, "proxy": "saludable"}
    except urllib.error.URLError as e:
        return {"ok": False, "status": getattr(e, "code", 0), "proxy": "no responde"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/ping")
async def ping():
    """Endpoint minimo para verificar que el backend esta vivo."""
    return {"ok": True, "plugin": "antigravity-command"}
