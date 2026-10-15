# MEMORIA del proyecto Antigravity

Memoria operativa del agente. Existe porque **entre sesiones no recuerdo nada**: lo que
no esté aquí escrito, no existe para la siguiente sesión (ni para la misma en otro PC).

> **Léela al empezar cualquier sesión.** Empieza por este índice y abre solo lo que la
> tarea necesite, para no gastar contexto.

## Ficheros

| Fichero | Para qué | Cuándo abrirlo |
|---|---|---|
| [entorno.md](entorno.md) | La máquina: rutas, herramientas, versiones y **sus limitaciones** | Siempre al empezar (es corto) |
| [mapa.md](mapa.md) | Estructura del repo, herramientas que ya existen e índice tarea → skill | Cuando no sepas dónde está algo |
| [errores.md](errores.md) | Errores ya cometidos: síntoma, causa, solución | **Antes** de tocar algo que suene a problema ya visto |
| [recetas.md](recetas.md) | Comandos verificados que funcionan en este equipo | Cuando necesites ejecutar algo del sistema |
| [decisiones.md](decisiones.md) | Decisiones tomadas y **por qué** | Antes de cambiar algo que parece raro a propósito |
| [pendientes.md](pendientes.md) | Lo que quedó abierto, con el siguiente paso concreto | Al empezar y al terminar |
| [bitacora.md](bitacora.md) | Qué se hizo cada día, con commits | Para saber por dónde íbamos |

## Reglas de esta memoria

1. **Obligación de escribir.** Al terminar cualquier tarea que aporte algo replicable, o
   tras resolver un error propio, se añade la entrada **antes** de dar la tarea por
   terminada. Si no se escribe, se pierde.
2. **Nunca valores de claves ni contraseñas.** Solo *dónde viven*. Este repo se publica
   en Hostinger (las memorias están en `tools/`, protegido por `.htaccess`, pero la regla
   se aplica igual).
3. **No duplicar.** Si algo ya está documentado en otro sitio (una guía de `tools/`, una
   skill, `claude.md`), aquí va el **puntero**, no la copia. Las copias divergen.
4. **Verificable o no entra.** Cada solución debe llevar cómo comprobarla. Nada de
   "debería funcionar".
5. **Los errores se escriben con nombre y apellidos.** Un error sin causa raíz se repite.

## Plantilla de entrada

```markdown
### [AAAA-MM-DD] Título corto y descriptivo
- **Síntoma:** qué se vio (mensaje exacto si lo hay)
- **Causa:** por qué pasó de verdad
- **Solución:** qué se hizo (comando o fichero concreto)
- **Verificación:** cómo se comprueba que quedó resuelto
- **Commit:** sha si aplica
```
