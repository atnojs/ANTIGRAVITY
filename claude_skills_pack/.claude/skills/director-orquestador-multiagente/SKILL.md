---
name: director-orquestador-multiagente
description: "Activa este skill cuando se requiera coordinar tareas en paralelo con un equipo de agentes, gestionar dependencias en JSON, verificar bloqueos de archivos .lock o estructurar flujos de trabajo multiagente."
---

# Director Orquestador Multiagente

## Objetivo

Coordinar tareas en paralelo dentro de un proyecto, gestionando miembros, dependencias, bloqueos de archivos y comunicación entre agentes.

## Inputs esperados

- `project_root`: ruta absoluta del proyecto actual.
- `action`: comando a ejecutar. Valores admitidos:
  - `init`
  - `assign`
  - `check_locks`
  - `release`
- `task_data`: objeto opcional con:
  - `title`
  - `assigned_to`
  - `dependencies`

## 1. Protocolo de inicialización de entorno

Si `action` es `init`, ejecuta estrictamente esta lógica:

1. Crea la carpeta oculta del sistema:

```text
${project_root}/.antigravity/team/
```

2. Crea los subdirectorios operacionales:

```text
${project_root}/.antigravity/team/mailbox/
${project_root}/.antigravity/team/locks/
```

3. Genera el archivo maestro inicial:

```text
${project_root}/.antigravity/team/tasks.json
```

con esta estructura exacta:

```json
{
  "tasks": [],
  "members": [
    "Director",
    "Arquitecto",
    "Especialista",
    "Marketer",
    "Investigador",
    "Revisor"
  ]
}
```

4. Inicializa un archivo vacío para mensajes globales:

```text
${project_root}/.antigravity/team/broadcast.msg
```

## 2. Control de concurrencia mediante file locking

Antes de realizar cualquier escritura o modificación de código en el proyecto, valida siempre el estado del semáforo.

### Procedimiento obligatorio

1. Verifica si existe este archivo:

```text
${project_root}/.antigravity/team/locks/<nombre_archivo>.lock
```

2. Si existe:
   - Aborta la operación.
   - Devuelve estado `WAITING`.
   - Añade una dependencia en `tasks.json`.

3. Si no existe:
   - Crea el archivo `.lock` vacío.
   - Ejecuta la edición quirúrgica del código.
   - Elimina el archivo `.lock` inmediatamente al finalizar.

## 3. Inyección de tareas con dependencias

Si `action` es `assign`:

1. Lee el archivo:

```text
${project_root}/.antigravity/team/tasks.json
```

2. Calcula el siguiente ID incremental.

3. Añade un objeto con este formato exacto:

```json
{
  "id": 1,
  "title": "string",
  "status": "PENDING",
  "assigned_to": "string",
  "dependencies": []
}
```

## 4. Estados permitidos

Los estados válidos de una tarea son:

```text
PENDING
IN_PROGRESS
COMPLETED
WAITING
```

## 5. Reglas críticas

- No edites un archivo si existe un `.lock` activo para ese archivo.
- No elimines locks de otros agentes salvo que la acción sea explícitamente `release`.
- No sobrescribas `tasks.json` sin conservar las tareas existentes.
- Toda nueva tarea debe incluir ID, título, estado, responsable y dependencias.
