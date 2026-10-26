# Unified Image Studio · Hoola

Copia **completa y actual** de `apps/unified-image-studio` con el **estilo Hoola/Relatos al 100 %**:
cian `#00D0D0`, verde `#26C626`, Electrolize en toda la interfaz, degradado
`#001018 → #062f43 → #0E5368`, halos, rejilla cian de 46 px y vidrio azulado con borde cian de 2 px.

Hace **exactamente lo mismo** que el original: importar o generar imágenes, editar, componer,
guardar el proyecto versionado, exportar, **generar con Google Flow (imagen y vídeo)**, ver la
biblioteca de resultados y **proteger los modelos caros con la contraseña de acceso**.

> Estado: **verificado en local (12/12) y en producción**. Detalle y capturas en
> [docs/VERIFICACION.md](docs/VERIFICACION.md).

- **URL**: `https://atnojs.es/apps/unified-image-studio-hoola/`
- **Original intacto**: `apps/unified-image-studio/` no se modifica.
- **Marcador de versión**: `version.txt` y el sello de la barra inferior (`v3.0.0`).

---

## 1. Qué incluye esta versión (v3.0.0)

Es el código actual del original (v1.6.1) más la capa Hoola:

| Pieza | Estado |
|---|---|
| Google Flow: imágenes y vídeo desde cualquier dispositivo | Sí · cola en servidor + agente del PC (`tools/flow-agent`) |
| Varias imágenes por encolado (1–4) | Sí · límite de cola en servidor |
| Parar una generación / quitar de la cola | Sí · `flow.cancel`, el agente cierra Chrome y no sube nada |
| Biblioteca de resultados (imagen y vídeo) | Sí · visor ampliado y descarga |
| Compuerta de modelos con contraseña de acceso | Sí · Model Gate 1.2.0, valida contra `api.php?action=login` |
| Contraseña de acceso compartida (`PW_ACCESS`) | Sí · misma sesión `antigravity_auth` del proyecto |
| Estilo Hoola al 100 % | Sí · tokens, fondo, cabecera, paneles, píldoras, overlay, modales y visor |
| Almacenamiento local aislado | `unified-image-studio-hoola` / `uis-hoola:*` |

## 2. El estilo Hoola, aplicado

- **Lienzo**: `linear-gradient(180deg,#001018 0%,#062f43 60%,#0E5368 100%)` fijo, dos halos
  radiales y rejilla cian de 1 px cada 46 px con máscara radial (en `body::before` / `body::after`).
- **Superficies**: `rgba(23,79,122,.42)`, `blur(12px)`, borde `rgba(0,208,208,.45)` de 2 px, radio
  14 px, halo exterior e iluminación interior cian.
- **Tipografía**: Electrolize en toda la interfaz, incluidos controles, cifras y el selector.
- **Selector de modelo**: píldoras de vidrio; activo con gradiente `#174F7A → #00D0D0` y texto
  `#CCFFFF`; candado de la compuerta como insignia en la esquina, sin tapar el texto.
- **Cabecera**: barra de vidrio con borde inferior cian de 2 px, marca con degradado y etiqueta
  `HOOLA`; navegación Imagen / Vídeo / Biblioteca en píldoras.
- **Carga de IA**: overlay canónico (tres aros, fondo translúcido con blur 14 px, título
  «IA generando lo solicitado...», panel de progreso y barra indeterminada cian→verde).
- **Modales**: acceso privado, compuerta de modelo, ayuda y confirmación en vidrio azulado con
  borde cian, foco visible y cierre con Escape.
- **Visor**: overlay Hoola con zoom de rueda 1x–8x, arrastre limitado y cierre con clic/Escape
  (`lightbox-zoom.20261026.js`).
- **Detalle**: barras de desplazamiento cian, `prefers-reduced-motion` respetado.

## 3. Compuerta de modelos

Los modelos caros piden **la contraseña de acceso de la app** (la misma del formulario de entrada).
La compuerta la valida contra `api.php?action=login`; al acertar, desbloquea los modelos **y deja la
sesión iniciada**. El código de modelos del proyecto sigue valiendo como respaldo.

| Sin contraseña | Con contraseña |
|---|---|
| Flow: NANO BANANA 2 / PRO / 2 LITE | OPENAI 2.5: MEDIUM, HIGH, MAX FLARE, XHIGH, MAX SUNBURST |
| IMAGE 2: LOW y MEDIUM | GEMINI 2 / 3.1 FLASH / 3 PRO · QWEN 3 PRO · IMAGE 2 HIGH |
| Vídeo: VEO 3.1 LITE y FAST | Vídeo: VEO 3.1 QUALITY y OMNI FLASH |

## 4. Estructura

```text
apps/unified-image-studio-hoola/
├── index.html                     Interfaz completa (barra, paneles, lienzo, vídeo, biblioteca)
├── assets/css/base.css            Sistema Hoola: tokens, tipografía, controles, loaders
├── assets/css/studio.css          Estructura de la estación (la del original actual)
├── assets/css/hoola.css           Capa visual: cabecera, paneles, píldoras, modales y Flow
├── assets/js/
│   ├── app.js                     Orquestador (BUILD v3.0.0)
│   ├── core.js                    Estado, documento, capas, historial
│   ├── render.js                  Motor de dibujo, viewport, máscaras
│   ├── tools.js                   Puntero: mover, redimensionar, rotar, máscara, texto, forma
│   ├── ui.js                      Vistas, avisos, overlay de carga canónico
│   ├── persist.js                 IndexedDB con namespace propio + cliente de la API
│   ├── exporter.js                PNG/JPG/WebP, escala, DPI real, portapapeles
│   ├── ai.js                      Catálogo de modelos directos
│   └── flow.js                    Google Flow: cola, estado del PC y trabajos
├── lightbox-zoom.20261026.js      Módulo canónico de zoom (rueda, arrastre, pellizco)
├── api.php / proxy.php            API privada y entrada de proveedores
├── lib/                           Configuración, SQLite, auth, trabajos y motor de Flow
├── storage/                       Datos privados (denegado por web; no versionado)
├── .htaccess                      Caché/MIME y CSP propia con `blob:` para modo local
├── schema.sql / pricing.example.json
├── version.txt                    Marcador de la versión servida
└── docs/VERIFICACION.md           Evidencia de pruebas y límites declarados
```

## 5. Instalación y entorno

Idéntica al original (el webhook del repositorio despliega en la raíz pública de Hostinger):

1. Requisitos: PHP 8.0+, `pdo_sqlite`, `curl`, `json`, `session`; `storage/` escribible (0770).
2. **No hay contraseña nueva**: se usa `auth/lib.php` del proyecto con `PW_ACCESS` / `PW_EDIT` del
   `.htaccess` raíz y la cookie de dominio `antigravity_auth`.
3. Flow: el agente del PC se configura en `tools/flow-agent` (token en el servidor y `agente.json`
   en el PC). Ver `tools/flow-agent/LEEME.md`.
4. Comprobación de salud: `GET api.php?action=state` → `ok:true`, `configured:true` y, con sesión,
   `php`, `sqlite` y `curl`.

## 6. Limitaciones conocidas

- La copia usa su propia base SQLite (`storage/studio.sqlite`): los proyectos del original no
  aparecen aquí, y viceversa. Los datos del historial no se versionan.
- La generación real necesita sesión `PW_ACCESS` y, para Flow, el agente encendido en el PC.
- El recorte de fondo local funciona con fondos uniformes, igual que en el original.
- La compuerta es una comodidad de interfaz: la autenticación real para generar sigue siendo la
  sesión del servidor, que la propia compuerta inicia al acertar la contraseña.
