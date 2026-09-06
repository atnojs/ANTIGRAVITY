---
name: director-orquestador-multiagente
description: "Activa este skill cuando se requiera coordinar tareas en paralelo con un equipo de agentes, gestionar dependencias en JSON, verificar bloqueos de archivos .lock o estructurar flujos de trabajo multiagente."
---

# Director Orquestador Multiagente

## Objetivo

Coordinar tareas en paralelo dentro de un proyecto, gestionando miembros, dependencias, bloqueos de archivos y comunicación entre agentes, replicando la funcionalidad de "Agent Teams".

## Inputs esperados

- `project_root`: ruta absoluta del proyecto actual.
- `action`: comando a ejecutar. Valores admitidos: `init`, `assign`, `check_locks`, `release`, `broadcast`, `send_message`.
- `task_data`: objeto opcional con: `title`, `assigned_to`, `dependencies`, `message`.

---

## 1. Roles del Equipo

| Rol | Nombre | Responsabilidad |
|-----|--------|-----------------|
| **Director** | Alejabot | Líder. Divide problemas, asigna roles, aprueba planes. |
| **Arquitecto** | — | Define estructura y patrones antes de codificar. |
| **Especialista** | — | Ejecuta tareas técnicas (Frontend/Backend/DB). |
| **Marketer** | — | Creación de marca, logos, copywriting, landing pages. |
| **Investigador** | — | Búsqueda de información, documentación, análisis. |
| **Revisor** | Devil's Advocate | Busca fallos, bugs y problemas de seguridad. |

## 2. Protocolo de Inicialización de Entorno (`init`)

1. Crear carpeta oculta del sistema:
```text
${project_root}/.antigravity/team/
```

2. Crear subdirectorios operacionales:
```text
${project_root}/.antigravity/team/mailbox/
${project_root}/.antigravity/team/locks/
```

3. Generar archivo maestro `tasks.json`:
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

4. Inicializar `broadcast.msg` vacío.

## 3. Protocolo de Gatekeeping (Planificación)

Antes de realizar cambios significativos, cada agente debe:

1. Enviar un **Plan de Acción** al buzón de Alejabot (Director).
2. Mantenerse en modo `READ_ONLY` o `PLANNING` hasta recibir `APPROVED`.
3. Solo tras aprobación, proceder a ejecutar cambios.

## 4. Control de Concurrencia mediante File Locking

Antes de cualquier escritura en el proyecto:

1. Verificar si existe: `${project_root}/.antigravity/team/locks/<nombre_archivo>.lock`
2. Si existe → abortar, devolver estado `WAITING`, añadir dependencia en `tasks.json`.
3. Si no existe → crear `.lock` vacío, ejecutar edición, eliminar `.lock` al finalizar.

## 5. Mensajería entre Agentes

### Mensaje Directo (1 a 1)

Enviar al buzón de un agente específico:
```text
${project_root}/.antigravity/team/mailbox/<nombre_agente>.msg
```

Formato:
```json
{"de": "Arquitecto", "mensaje": "La estructura de archivos está lista para revisión."}
```

### Broadcast (a todo el equipo)

Alejabot escribe en `broadcast.msg` para dar directrices globales:
```json
{"de": "Director", "tipo": "BROADCAST", "mensaje": "Nuevo requisito: añadir modo oscuro a todas las apps."}
```

## 6. Inyección de Tareas con Dependencias (`assign`)

1. Leer `tasks.json`.
2. Calcular siguiente ID incremental.
3. Añadir objeto:

```json
{
  "id": 1,
  "title": "Sincronizar proxy con el bloque canónico de apps/dibujo_lineas_copia",
  "status": "PENDING",
  "plan_approved": false,
  "assigned_to": "Especialista",
  "dependencies": [2]
}
```

## 7. Estados permitidos

```
PENDING       → Tarea creada, no iniciada
IN_PROGRESS   → Agente trabajando en ella
COMPLETED     → Terminada con éxito
WAITING       → Bloqueada por dependencia o lock
```

## 8. Script de Orquestación (`team_manager.py`)

```python
import json
import os
import sys

TEAM_DIR = ".antigravity/team"

def init_team():
    """Inicializa la infraestructura del equipo."""
    os.makedirs(f"{TEAM_DIR}/mailbox", exist_ok=True)
    os.makedirs(f"{TEAM_DIR}/locks", exist_ok=True)
    tasks_path = f"{TEAM_DIR}/tasks.json"
    if not os.path.exists(tasks_path):
        with open(tasks_path, 'w') as f:
            json.dump({"tasks": [], "members": [
                "Director", "Arquitecto", "Especialista",
                "Marketer", "Investigador", "Revisor"
            ]}, f, indent=2)
    if not os.path.exists(f"{TEAM_DIR}/broadcast.msg"):
        with open(f"{TEAM_DIR}/broadcast.msg", 'w') as f:
            f.write("")
    print("✓ Infraestructura 'Equipo Alejabot' lista.")

def assign_task(title, assigned_to, deps=None):
    """Asigna una nueva tarea con soporte para dependencias."""
    if deps is None:
        deps = []
    path = f"{TEAM_DIR}/tasks.json"
    with open(path, 'r+') as f:
        data = json.load(f)
        task = {
            "id": len(data["tasks"]) + 1,
            "title": title,
            "status": "PENDING",
            "plan_approved": False,
            "assigned_to": assigned_to,
            "dependencies": deps
        }
        data["tasks"].append(task)
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()
    print(f"✓ Tarea {task['id']} ({title}) asignada a {assigned_to}.")

def broadcast(sender, text):
    """Envía un mensaje a todos los miembros del equipo."""
    msg = {"de": sender, "tipo": "BROADCAST", "mensaje": text}
    with open(f"{TEAM_DIR}/broadcast.msg", 'a') as f:
        f.write(json.dumps(msg) + "\n")
    print(f"✓ Mensaje global enviado por {sender}.")

def send_message(sender, receiver, text):
    """Envía un mensaje al buzón de un agente específico."""
    msg = {"de": sender, "mensaje": text}
    with open(f"{TEAM_DIR}/mailbox/{receiver}.msg", 'a') as f:
        f.write(json.dumps(msg) + "\n")
    print(f"✓ Mensaje enviado a {receiver}.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "init":
            init_team()
        elif cmd == "assign" and len(sys.argv) >= 4:
            title = sys.argv[2]
            assigned_to = sys.argv[3]
            deps = [int(d) for d in sys.argv[4:]] if len(sys.argv) > 4 else []
            assign_task(title, assigned_to, deps)
        elif cmd == "broadcast" and len(sys.argv) >= 4:
            broadcast(sys.argv[2], sys.argv[3])
        elif cmd == "send" and len(sys.argv) >= 5:
            send_message(sys.argv[2], sys.argv[3], sys.argv[4])
```

Uso del script:
```bash
python team_manager.py init
python team_manager.py assign "Crear proxy PHP" "Arquitecto" 1 3
python team_manager.py broadcast "Director" "Revisad los nuevos requisitos"
python team_manager.py send "Especialista" "Revisor" "¿Puedes revisar mi PR?"
```

## 9. Reglas críticas

- No editar un archivo si existe un `.lock` activo para ese archivo.
- No eliminar locks de otros agentes salvo que la acción sea `release`.
- No sobrescribir `tasks.json` sin conservar las tareas existentes.
- Toda nueva tarea debe incluir: ID, título, estado, responsable, `plan_approved` y dependencias.
- Una tarea no debe reclamarse si sus dependencias no están en `COMPLETED`.
- Al completar una tarea, liberar locks y notificar a Alejabot.
