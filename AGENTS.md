# AGENTS.md — instrucciones para agentes en este repositorio

Lo leen los agentes que buscan `AGENTS.md`: Codex, DeepSeek Harness y **los workers del
superagente**. Las reglas canónicas son las de `claude.md`; esto es el índice de entrada, no una
copia. Si algo aquí y en `claude.md` discrepa, manda `claude.md` y se corrige este fichero.

## Antes de tocar un solo archivo

1. `claude.md` — reglas fijas del usuario y reglas críticas del proyecto.
2. `skills/INDEX.md` — dice qué ficha cargar; después se lee entera la que toque.
3. `tools/memoria/MEMORIA.md` — entorno real, errores ya cometidos y recetas verificadas.

## Resumen operativo (la versión canónica está en `claude.md`)

- **`main` despliega en producción.** Hostinger publica la raíz pública con el push. Un commit sin
  push no existe; un push sin verificación puede romper la web. Procedimiento: `publicar-git`.
- **Commit aislado por rutas explícitas:**

  ```powershell
  git add -A -- <rutas del encargo>
  git commit -m "tipo(ámbito): resumen" -- <rutas del encargo>
  ```

  El veto es al `git add .` / `git add -A` **sin** pathspec y a `git commit -a` / `-am`: escenifican
  todo el repo y publican trabajo que no es tuyo. `git add -A -- <rutas>` es la forma correcta, y
  hace falta para los archivos nuevos.
- **Sin secretos en el repo.** Claves en `.htaccess` / `.private/` / entorno. Nada versionado es
  privado: todo lo que entra es accesible por web.
- **Herramientas y pruebas en `tools/`**, nunca en la raíz ni en `apps/`.
- **Obligatorio el gate `autocalidad-90`** antes de entregar: autoevaluación con evidencia y PASS
  independiente ≥ 90,0. Sin PASS no hay entrega; si no se puede verificar, es BLOCKED.
- **Ramas:** solo `main`. Única excepción: las ramas `agent/<ticket>` del superagente, remotas y
  efímeras, que una persona mergea con squash y borra; su checkout vive aislado en
  `E:\_superagent\work\<ticket>`. Nunca copias de trabajo **dentro de `E:\ANTIGRAVITY`**.

## Si eres un worker del superagente

- Carga `skills/SKILL_SUPERAGENT.md` y aplica el flujo de ticket: un objetivo, rama `agent/<ticket>`,
  PR en draft, sin merge, sin tocar `tools/` ni `.htaccess`, evidencia en el PR.
- Silencio mientras trabajas. Se habla para confirmar una vez, entregar o bloquear.
- Si el ticket pide algo fuera de su alcance, se devuelve con una frase de motivo. No se amplía solo.
