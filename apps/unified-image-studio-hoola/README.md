# Unified Image Studio · Hoola

Copia de `apps/unified-image-studio` con el **estilo Hoola/Relatos**: cian `#00D0D0`,
verde `#26C626`, tipografía Electrolize, vidrio azulado, rejilla cian y halos. La app hace
exactamente lo mismo que el original —importar o generar una imagen, editarla, componer con
textos, logos y formas, guardar el proyecto versionado y exportar— y comparte su backend PHP +
SQLite. Solo cambia la capa visual (y el espacio de nombres del almacenamiento local, para no
mezclarse con la app original en el mismo dominio).

> Estado de la entrega: **frontend y flujo verificados en navegador** sobre un servidor PHP local
> (SQLite + cURL) y **publicado en producción**. La generación real con IA no se ha ejecutado en
> esta tarea porque el equipo de desarrollo no tiene claves de proveedor: el flujo de carga, el
> envío del `model` elegido y el error controlado sí están comprobados. Ver
> [docs/VERIFICACION.md](docs/VERIFICACION.md).

- **URL**: `https://atnojs.es/apps/unified-image-studio-hoola/`
- **Original intacto**: `apps/unified-image-studio/` no se modifica.

---

## 1. Qué cambia respecto al original

| Aspecto | Original | Copia Hoola |
|---|---|---|
| Paleta | slate `#0d1117`, cian `#2ee8ff`, ámbar | degradado `#001018 → #062f43 → #0E5368`, cian `#00D0D0`, verde `#26C626`, halos y rejilla cian de 46 px |
| Tipografía | Electrolize (títulos), Inter (UI), JetBrains Mono (datos) | **Electrolize en toda la interfaz**, con cifras tabulares |
| Superficies | tarjetas casi negras | vidrio azulado `rgba(23,79,122,.42)`, borde cian de 2 px, radio 14 px y halo interior |
| Botones y controles | relleno cian plano | primaria con gradiente cian→verde y texto oscuro; secundarios de vidrio con borde cian; píldoras en el selector de modelo |
| Carga de IA | overlay oscuro con texto variable | overlay canónico Hoola: fondo translúcido con blur 14 px, tres aros de 80 px, título fijo «IA generando lo solicitado...» y barra indeterminada cian→verde |
| Visor | sin visor ampliado | lightbox Hoola con zoom de rueda 1x–8x, arrastre, pellizco y cierre con clic/Escape (`lightbox-zoom.js` canónico) |
| Almacenamiento local | `unified-image-studio` / `uis:*` | `unified-image-studio-hoola` / `uis-hoola:*` (mismo dominio, sin colisiones) |

No cambian ni el modelo de datos, ni los endpoints PHP, ni el pipeline de trabajos/presupuesto,
ni las rutas de la API, ni la autenticación compartida.

## 2. Estructura

```text
apps/unified-image-studio-hoola/
├── index.html                    Interfaz (barra, paneles, lienzo, modales, lightbox)
├── assets/css/base.css           Sistema Hoola: tokens, tipografía, controles, loaders
├── assets/css/studio.css         Estructura de la estación de trabajo (sin cambios de flujo)
├── assets/css/hoola.css          Capa visual: cabecera, paneles, canvas, modales, avisos
├── assets/js/
│   ├── app.js                    Orquestador (BUILD v2.0.0-hoola)
│   ├── core.js                   Estado, documento, capas, historial
│   ├── render.js                 Motor de dibujo, viewport, máscaras (acentos Hoola)
│   ├── tools.js                  Puntero: mover, redimensionar, rotar, máscara, texto, forma
│   ├── ui.js                     Vistas, listas, avisos, overlay de carga canónico
│   ├── persist.js                IndexedDB con namespace propio + cliente de la API
│   ├── exporter.js               PNG/JPG/WebP, escala, DPI real, portapapeles
│   ├── ai.js                     Catálogo de modelos, trabajos y costes
│   └── lightbox.js               Visor ampliado de resultados
├── lightbox-zoom.js              Módulo canónico copiado de apps/_shared
├── api.php / proxy.php           API privada y entrada del proveedor (sin cambios)
├── lib/                          Configuración, SQLite, auth, presupuesto, trabajos
├── storage/                      Datos privados (denegado por web; no versionado)
├── schema.sql / pricing.example.json
└── docs/VERIFICACION.md          Evidencia de pruebas y límites declarados
```

## 3. Instalación y entorno

Idéntica al original (el webhook del repositorio despliega en la raíz pública de Hostinger):

1. Requisitos: PHP 8.0+, `pdo_sqlite`, `curl`, `json`, `session`; `storage/` escribible (0770).
2. **No hay que configurar contraseña nueva**: se usa `auth/lib.php` del proyecto con
   `PW_ACCESS` / `PW_EDIT` del `.htaccess` raíz y la cookie de dominio `antigravity_auth`.
3. Tarifas (opcional): `storage/pricing.json` para que el presupuesto en euros se aplique.
4. Comprobación de salud: `GET api.php?action=state` → `ok:true`, `configured:true`,
   `sharedSession:true` y, con sesión, `php`, `sqlite` y `curl`.

## 4. Limitaciones conocidas

- La generación real con proveedor necesita las claves del `.htaccess` raíz y no se ejecutó en
  esta tarea por no haber claves en el equipo de desarrollo (el original declara la misma
  limitación). El flujo de carga, el payload del modelo elegido y el error controlado sí están
  verificados.
- La copia usa su propia base SQLite (`storage/studio.sqlite`): los proyectos del original no
  aparecen aquí, y viceversa.
- El recorte de fondo local funciona con fondos uniformes, igual que en el original.
