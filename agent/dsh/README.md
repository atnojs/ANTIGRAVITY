# Agentes de DeepSeek Harness para ANTIGRAVITY

Ocho agentes especializados en el flujo de trabajo de este proyecto, montados como
**agent presets** nativos de DeepSeek Harness (DSH). Aparecen en el selector de
agentes de la interfaz, igual que los cuatro de fábrica.

## Cómo se ven en la interfaz

Selector de agentes (encima del cuadro de texto):

| Orden | Agente | Para qué |
|-------|--------|----------|
| 1 | `standard` 标准模式 | De fábrica. Todas las herramientas. |
| 2 | `code` PTC 模式 | De fábrica. Modo código: el modelo compone un programa. |
| 3 | `minimal` 极简模式 | De fábrica. El más barato, dos herramientas. |
| 4 | `cordis` 创造模式 | De fábrica. **Creator mode**: crea otros agentes. |
| 10 | **Desarrollo Frontend** | Interfaces web: HTML, CSS, JS y React con estilo hoola. |
| 11 | **Backend PHP Hostinger** | `proxy.php`, claves aisladas, historial persistente. |
| 12 | **Cirujano de Código** | Corregir código existente sin romper lo que funciona. |
| 13 | **Auditor Web** | Calidad final: rendimiento, SEO, contraste, teclado. |
| 14 | **Revisor Adversario** | Busca bugs y fallos de seguridad antes de entregar. |
| 15 | **Orquestador Multiagente** | Divide el trabajo, asigna y coordina agentes. |
| 16 | **Diseño Hoola** | Identidad visual, copywriting y landing pages. |
| 17 | **Imágenes IA** | Prompts para OpenAI image 2 y control de calidad de imagen. |

Los cuatro primeros son los mismos que explica el vídeo
[Crea AGENTES de IA en DEEPSEEK HARNESS](https://www.youtube.com/watch?v=_YjTRMExXjQ&t=335s)
de Ernesto Ibáñez. Los ocho últimos son los de este proyecto.

## Dónde vive cada cosa

```text
E:\ANTIGRAVITY\agent\dsh\
├── crear-agentes.ps1          Genera los presets a partir de las personas
├── validar-agentes.mjs        Valida con el descubrimiento real del harness
├── agentes\<id>\
│   ├── persona.md             El system prompt del agente (fuente, versionada)
│   └── preset.yml             Nombre, descripción y orden (fuente, versionada)
└── README.md

C:\Users\atnojs\.dsh\.agent-presets\<id>\    ← GENERADO, no editar a mano
├── agent.cordis.yml           Composición de plugins del agente
└── preset.yml                 Copia de la fuente
```

Las **fuentes** son las de este repositorio. La carpeta `C:\Users\atnojs\.dsh\.agent-presets\`
es la raíz de presets de usuario que DSH escanea en cada arranque; se puede borrar
entera y regenerar con el script.

**Nunca se toca la raíz de fábrica**
(`E:\herramientas\deepseek-harness\apps\cli\config\agent-presets\`): pertenece a la
instalación y una actualización de DSH la sobrescribe.

## Cómo funciona la generación

`crear-agentes.ps1` no escribe 250 líneas de YAML por agente. Parte de la composición
del preset de fábrica `standard` (la que trae todas las herramientas) y le sustituye
dos bloques:

1. La fila `persona`, por el contenido de `agentes\<id>\persona.md`.
2. La fila `skill-filesystem`, para añadir `customSkillDirs: E:\ANTIGRAVITY\.claude\skills`.

Así los agentes heredan las herramientas y la configuración del preset estándar de la
instalación, y las **11 skills** del proyecto quedan disponibles para todos ellos.

```powershell
# Regenerar todos los agentes
powershell -File E:\ANTIGRAVITY\agent\dsh\crear-agentes.ps1

# Validar (ejecuta el descubrimiento real de DSH sobre las raíces reales)
node E:\ANTIGRAVITY\agent\dsh\validar-agentes.mjs
```

El resultado esperado del validador es `Presets rotos: 0` y `metadatos=true` en todos.

## Cómo añadir un agente

1. Crea `agentes\<id>\persona.md` con el system prompt. El `id` debe cumplir
   `^[a-z0-9][a-z0-9-]*$` (minúsculas, números y guiones).
2. Crea `agentes\<id>\preset.yml`:

   ```yaml
   name: 'Mi Agente'
   description: 'Qué hace, en una frase.'
   order: 18
   ```

3. Ejecuta `crear-agentes.ps1` y luego `validar-agentes.mjs`.

El script recorre la carpeta `agentes\`, así que no hay ninguna lista que mantener.
El roster relee las raíces en cada llamada: **no hace falta reiniciar DSH**, basta
recargar la página de la interfaz.

## Dos trampas que ya están resueltas

Ambas fallan **en silencio**, por eso están documentadas y cubiertas por el validador.

1. **Codificación del script.** Windows PowerShell 5.1 lee los `.ps1` sin BOM como
   ANSI, así que los acentos dentro del script se corrompen. Por eso
   `crear-agentes.ps1` es ASCII puro y todo el texto en español vive en `persona.md`
   y `preset.yml`, que se leen como UTF-8 explícito. Los archivos generados se
   escriben sin BOM (un BOM rompería el parseo YAML).

2. **Dos puntos en un valor sin comillas.** En YAML, `description: Control de calidad
   final: rendimiento...` es inválido: el segundo `:` abre un mapeo. DSH degrada sin
   avisar y el agente pierde nombre y orden. **Cita siempre los valores**:

   ```yaml
   description: 'Control de calidad final: rendimiento, SEO y contraste.'
   ```

## Pendiente: reglas globales

El vídeo empieza escribiendo un archivo de normas globales. En DSH ese archivo es
`C:\Users\atnojs\.dsh\AGENTS.md` y se inyecta en **todas** las sesiones, de cualquier
proyecto. No se ha creado porque afecta a todo el harness, no solo a ANTIGRAVITY.
Si se quiere, las normas del proyecto ya viven en `E:\ANTIGRAVITY\CLAUDE.md`, que DSH
también carga como instrucciones de proyecto (por eso las estás viendo ahora).
