# Mapa del repositorio

Para no explorar de cero en cada sesión. **No sustituye al inventario**: aquí está la
estructura y dónde buscar, no la descripción de cada app.

## Estructura de primer nivel

| Ruta | Qué es |
|---|---|
| `apps/` | ~85 carpetas: una por app/web desplegada (`apps/<nombre>/`) |
| `skills/` | Skills **canónicas** (`SKILL_*.md`) + infraestructura compartida |
| `.claude/skills/` | 13 punteros con front matter: al abrirlos, remiten a `skills/<archivo>.md` |
| `tools/` | Herramientas de desarrollo (**protegido por `.htaccess`, no público**) |
| `tools/memoria/` | Esta memoria |
| `tools/omniroute/` | Gateway OmniRoute: daemon, instalador, verificador y guía |
| `public_html/` | Contenido público adicional |
| `claude.md` | Instrucciones del proyecto (se cargan solas) |
| `soul.md` | Perfil de Antonio: español, directo, precisión antes que optimismo |
| `inicio.md` | Datos del proyecto (**gitignored**, contiene un token: no versionar) |
| `index.html`, `script.js`, `styles.css` | Portada del sitio |

## Herramientas ya existentes (úsalas en vez de reescribirlas)

| Script | Para qué |
|---|---|
| `tools/inventario-apps.php` | Inventario de las apps |
| `tools/verificar-apps-produccion.ps1` | Comprobar qué está publicado y cómo |
| `tools/verificar-despliegue.ps1` | Verificar que el despliegue de Hostinger está al día |
| `tools/git_logger.sh` | Registro de actividad de git |
| `tools/commit-aislado.ps1` | Commit de un cambio concreto sin arrastrar el resto |
| `tools/compress_to_limit.ps1` | Comprimir ficheros por debajo de un límite |
| `tools/link-dsh-skills.ps1` | Enlazar skills con DSH |
| `tools/generar-punteros-skills.php` | Regenerar los punteros de `.claude/skills/` |
| `tools/evidencias/`, `tools/json/`, `tools/legacy/` | Capturas y material de apoyo |
| `apps/trickvault/publicar.php` | Publica en GitHub los cambios de TrickVault hechos **desde la app** (lo usa Antonio, no el agente) |

## Infraestructura compartida en `skills/`

| Fichero | Qué es |
|---|---|
| `proxy.php` | Proxy PHP para llamadas a APIs de IA con la clave fuera del frontend |
| `history.php` + `history-manager.js` | Historial persistente server-side (Hostinger) |
| `POLITICA_modelos-imagen.md` | Qué modelo de imagen se usa y con qué ajustes |
| `HERMES_BOOTSTRAP.md` | Arranque de Hermes |
| `.htaccess` | Protección de la carpeta |

## Índice rápido: tarea → skill

| Si la tarea es… | Carga |
|---|---|
| Crear o editar una app/web | `crear` (maestra) + `style-guide-antigravity` + `capturas-verificacion` |
| Aplicar la estética del proyecto | `style-guide-antigravity` |
| Arreglar / refactorizar código que ya funciona | `cirujano-codigo-produccion` |
| Analizar, clonar o sacar el prompt de una imagen | `analista-visual-pro` |
| Imágenes de las tarjetas de trickvault | `trickvault-imagenes` |
| Publicar cambios de TrickVault desde la app (lo hace Antonio) | `recetas.md` → «TrickVault: publicar cambios desde la propia app» |
| Vídeos de video-vault | `videovault-videos` |
| Vídeo gratis (Veo) con Google Flow | `google-flow` |
| Claves de API / proxy PHP en Hostinger | `arquitecto-backend-php-hostinger` |
| Historial persistente en servidor | `history-server` |
| Control de calidad final de una web | `auditor-lighthouse-accesibilidad` |
| Medir y enseñar un resultado visual | `capturas-verificacion` |
| Verificar el flujo real en navegador (clics, formularios, descargas, consola) | `verificacion-playwright` |
| Plan por fases con riesgos | `planificacion-pro` |
| Opciones creativas con criterio | `brainstorming-pro` |
| Prompts con el Método Copiloto | `metodo-copiloto` |
| Crear o estandarizar una skill | `creador-de-skills-antigravity` · `estandarizador-skills-antigravity` |
| Coordinar varios agentes | `director-orquestador-multiagente` |
| Conectar apps externas vía Zapier | `zapier-mcp` |
| Word / Excel / PowerPoint | `office-docx` · `office-xlsx` · `office-pptx` |
| Ingeniería inversa de binarios, apps empaquetadas o web | `reverse-engineer-anything` |
| Denegaciones raras del sandbox en Windows | `diagnose-windows-sandbox-acl` |

## Reglas de navegación

- Antes de crear algo nuevo en `apps/`, comprueba si ya existe una app parecida: hay
  variantes (`generar`, `generar_imagenes`, `generar_ia`, `estudio_imagenes`…) y duplicar
  es el error más fácil de cometer aquí.
- Nada de globs recursivos sobre la raíz: usa `apps/<nombre>` concreto (ver `recetas.md`).
