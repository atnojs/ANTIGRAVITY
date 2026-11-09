---
name: superagente-antigravity
description: "Actívala cuando llegue trabajo por GitHub (issue, comentario o PR que mencione al agente), cuando haya que operar el superagente (filtro, router, workers, tickets, panel) o cuando se instale, arranque o diagnostique dsh-superagent. Fija el triaje, la rama agent/<ticket>, el PR sin merge, el gate autocalidad-90 y los límites de atención."
---

# Superagente en el flujo de Antigravity

## Qué es

`dsh-superagent` (`github.com/deepseek-ai/dsh-superagent-prototype`, MIT) es el prototipo con el
que DeepSeek investiga un agente que **vive en un repositorio de GitHub** en vez de en una
ventana de chat: escucha Issues, comentarios, PRs y CI, decide qué es trabajo real, abre un
ticket por encargo y lo ejecuta en su propia sesión y su propio directorio, respondiendo en el
hilo original. Se instala como **bundle de DeepSeek Harness** en un perfil aparte (`superagent`)
y sirve un panel en `127.0.0.1`, con el puerto que fije `webserver.port` (aquí 3082).

No es un producto estable: es código de investigación. Se usa como **patrón y como herramienta**,
no como servicio crítico. Su principio rector, que sí adoptamos tal cual:

> Quitar la menor atención humana posible y devolver el mayor valor posible.
> Cada mensaje, aviso, pregunta o ajuste cuesta atención: si no la devuelve con creces, se quita.

## La arquitectura que copiamos

| Pieza | Qué hace | En nuestro flujo |
|---|---|---|
| **Filtro** (evaluación) | Descarta ruido: ¿esto es un encargo real? Modelo de evaluación configurable | Triaje antes de abrir ticket; lo que no es trabajo no genera respuesta |
| **Router** (sesión principal) | No trabaja: reparte. Una nota de ≤ 30 palabras por candidato | Reparto entre agentes sin decisiones técnicas |
| **Workers** (sesión por ticket) | Ejecutan en su directorio, aislados entre sí | Un encargo = un directorio de trabajo, sin tocar el de otro |
| **Ticket** | Unidad de trabajo con origen, alcance y entrega | Rama `agent/<ticket>` + PR en draft |
| **Panel** | Lista primero lo que espera a una persona | Solo se abre cuando hay algo que desbloquear |

Lo que **no** copiamos es su autonomía de merge: aquí `main` publica en producción (Hostinger), así
que el merge lo decide una persona. Ver «Frontera de seguridad».

## Frontera de seguridad (no negociable)

`main` de `atnojs/ANTIGRAVITY` despliega por webhook en la raíz pública. Todo lo versionado es
accesible por web. Por tanto:

1. **El superagente no hace merge.** Abre PR en draft y espera. La condición de auto-merge queda
   vacía o desactivada en su panel; si una versión no lo permite, se prohíbe en el prompt del
   equipo («never merge; a human merges»).
2. **Rama por ticket, remota y efímera:** `agent/<ticket>`, creada por la cuenta del agente en un
   **checkout aislado fuera del repo** (`E:\_superagent\work\<ticket>`, ver runbook). Prohibido el
   worktree o la rama local dentro de `E:\ANTIGRAVITY`: el repo de trabajo no aloja copias. La rama
   se borra al mergear.
3. **Merge con squash**, lo hace Antonio desde GitHub, después del gate `autocalidad-90` y de
   revisar el diff. Nunca un merge automático, nunca `--force`, nunca reescribir `main`.
4. **Nada de secretos en el repo.** El agente lee el checkout entero: claves en `.htaccess`,
   `.private/` o entorno, jamás en archivos versionados. Si una clave aparece en un PR, se revoca.
5. **`tools/` sigue siendo privado** y es el único sitio para scripts de prueba. La raíz pública no
   admite ni zips ni borradores.
6. **Aislamiento del proceso:** los presets del bundle corren con `danger-full-access` como el
   usuario del sistema operativo y el worker puede leer el home. `docs/006-deployment.md` del
   prototipo recomienda una cuenta de SO dedicada («for isolation, use a dedicated OS account»);
   aquí es **política propia y requisito**: si se instala de verdad, va en una cuenta de Windows
   dedicada, no en la de Antonio.

## Flujo A — trabajo que llega por GitHub

Cuando el superagente está instalado y alguien autorizado pide algo:

1. **Llega el disparo.** Issue, comentario o PR que menciona a la cuenta del agente. Una mención
   añadida editando el cuerpo de un Issue **no** llega: hay que comentar.
2. **Policy.** Solo cuenta si quien pide está en la lista de permitidos de esa Source (o si el
   equipo abrió esa conversación a peticiones). Sin lista, nadie puede pedir nada.
3. **Filtro.** Si es charla, duplicado o ruido, no se responde. Una petición convertida en ticket
   se confirma **una vez** y se nombra lo que se va a hacer.
4. **Ticket y directorio propio.** Un solo objetivo por ticket. La rama sale de `main` en un ticket
   de Issue y del head del PR en un ticket de PR; el checkout vive en
   `E:\_superagent\work\<ticket>`, nunca dentro del repo.
5. **Ejecución con nuestras skills.** `maestra-produccion-antigravity` (crear/editar),
   `cirujano-codigo-produccion` (tocar código existente) y el resto de fichas que toquen. El worker
   lee `AGENTS.md` del repo.
6. **Verificación antes de PR.** `autocalidad-90` (PASS ≥ 90,0 con verificador independiente) y,
   si hay efecto visual, `verificacion-playwright` sobre el servidor real.
7. **PR en draft** con la evidencia (qué cambió, cómo se verificó, capturas o salida de comandos).
   Se marca listo solo cuando el gate ha pasado.
8. **Cierre humano.** Antonio revisa, mergea con squash, borra la rama y comprueba el despliegue
   con `publicar-git` (marcador real, no un 200).

## Flujo B — modo superagente sin instalar nada

Hoy el prototipo no está instalado (faltan cinco requisitos, ver
`tools/superagent/INSTALAR.md`). El patrón se puede aplicar ya, en cualquier sesión:

1. **Recoger el disparo** con su origen exacto: quién lo pide, dónde y qué texto.
2. **Triaje de una línea:** ¿es trabajo real, está dentro del repo y lo pide alguien autorizado? Si
   no, se calla y se anota como descartado; no se responde al ruido.
3. **Confirmar una sola vez**, nombrando el objeto y el resultado esperado, en el mismo hilo.
4. **Ticket escrito antes de tocar código:** alcance, archivos, criterio de aceptación y qué queda
   fuera. Sin esto, el trabajo se convierte en una excursión.
5. **Trabajar en el directorio del encargo** (rama `agent/<ticket>` solo si va a haber PR; si no,
   `main` con commit aislado como siempre).
6. **Verificar** con `autocalidad-90`; si hay UI, en navegador real.
7. **Entregar en el hilo original**, con evidencia y una frase de resultado; PR en draft si hay
   revisión pendiente. Una pregunta concreta si hay que decidir algo.
8. **Silencio hasta el siguiente hito.** Nada de partes de progreso, nada de «voy por la mitad».

## Límites de atención (se aplican a cualquier agente del flujo)

- Se habla cuando hay un resultado utilizable, una decisión que solo puede tomar una persona o un
  bloqueo. Nada más.
- Un mensaje al confirmar, uno al entregar, uno por bloqueo. Máximo 100 palabras por mensaje.
- Una pregunta cada vez, en concreto, con las opciones. No listas de dudas.
- Lo proactivo empieza **solo registrando** lo que el agente habría hecho, hasta que ese registro
  se revise y se autorice por escrito.
- Si el agente hace ruido, se acortan y endurecen sus prompts o se pausa. No se añaden mensajes
  explicando el ruido.

## Instalación y operación

Runbook completo, con el estado real de este equipo y los bloqueos de su tabla: **`tools/superagent/INSTALAR.md`**.
Consulta de estado sin panel: **`tools/superagent/estado.ps1`**. Creación del checkout de un ticket:
**`tools/superagent/preparar-ticket.cmd`** (es el `prepare` que se configura en el panel).

| Pieza | Dónde queda |
|---|---|
| Perfil DSH | `%USERPROFILE%\.dsh\profiles\superagent\` (aislado del perfil de trabajo) |
| Estado, base de datos y shims | `C:\Users\atnoj\.dsh\state\superagent` (fuera del repo público; se arranca con `-WorkingDirectory 'C:\'`) |
| Checkout del plugin | `E:\_superagent\dsh-superagent` (fuera del repo) |
| Clone del que salen los tickets | `E:\_superagent\repo` |
| Directorios de ticket | `E:\_superagent\work\<ticket>` |
| Panel | `http://127.0.0.1` con el puerto configurado (aquí 3082) |

## Errores y trampas conocidas

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La mención no llega como petición | Se añadió editando el cuerpo del Issue | Comentar de nuevo mencionando a la cuenta |
| `status` sale 3 | Falta un requisito de setup | El panel dice cuál; no reiniciar en bucle |
| `status` sale 2 | Una parte (Source, sync) falla | Reiniciar no lo arregla: leer `errors` |
| El plugin no activa: `$.stateDir expect string to match regexp /^\//` | `stateDir` con ruta `C:\...` | Usar forma POSIX (`/Users/...`) y arrancar con `-WorkingDirectory 'C:\'`: se resuelve contra la unidad del cwd |
| `PSSecurityException` al ejecutar `pnpm` | La política bloquea `pnpm.ps1` | Usar `pnpm.cmd` o lanzar desde `cmd.exe` |
| El worker propone mergear | Prompt del equipo sin prohibición explícita | Añadir «never merge» y revisar que la condición de auto-merge esté vacía |
| Un PR toca `tools/` o `.htaccess` | Falta el alcance en el ticket | Cerrar el PR: la raíz pública no admite herramientas ni configuración privada |
| Ramas huérfanas `agent/*` | Merge sin borrar rama | Borrar en el mismo acto del merge |
| `tmux: command not found` | Este equipo es Windows y los scripts del prototipo son POSIX | Arrancar con `dsh --profile superagent`; ver runbook |

## Checklist de salida

- [ ] El ticket tiene origen, alcance y criterio de aceptación escritos.
- [ ] La rama es `agent/<ticket>` (remota) o no hay rama: nunca una copia local en `E:\ANTIGRAVITY`.
- [ ] El PR está en draft hasta que `autocalidad-90` da PASS ≥ 90,0.
- [ ] No hay merge automático, ni `--force`, ni secretos, ni scripts de prueba en la raíz pública.
- [ ] El mensaje entregado nombra el resultado y la evidencia, en una sola frase por idea.
- [ ] La rama se borra al mergear y el despliegue se comprueba con marcador real.
