#!/usr/bin/env python
"""Comprueba si Google Flow tiene puntos disponibles AHORA MISMO.

Lee el aviso de cuota de la UI de Flow y, si esta agotada, imprime
CUOTA_AGOTADA (exit 3) para que el lote se detenga en vez de reintentar en bucle.

Uso: python tools/video-vault/comprobar_cuota_flow.py
"""
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r'E:\herramientas\google-flow')

import asyncio

import flow_provider as flow

SIN_PUNTOS = 'sin puntos'


async def main():
    await flow.startup()
    try:
        page = await flow.get_page()
        await flow.create_project()
        await page.wait_for_timeout(5000)
        texto = (await page.evaluate("() => document.body.innerText") or '').lower()
        if SIN_PUNTOS in texto or 'añadir puntos de ia' in texto or 'add ai credits' in texto:
            print('CUOTA_AGOTADA: Google Flow no tiene puntos. Espera a que se repongan o recargalos.')
            return 3
        print('CUOTA_OK: Flow parece tener puntos disponibles.')
        return 0
    finally:
        await flow.shutdown()


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
