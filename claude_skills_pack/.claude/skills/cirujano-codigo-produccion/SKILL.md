---
name: cirujano-codigo-produccion
description: "Activa este skill para aplicar correcciones de errores, añadir características o refactorizar archivos existentes sin destruir el código previo."
---

# Cirujano de Código y UX de Producción

## Objetivo

Aplicar correcciones, mejoras o refactorizaciones sobre archivos existentes de forma no destructiva, preservando el código funcional y modificando solo los bloques necesarios.

## Inputs esperados

- `target_file`: ruta del archivo físico que se va a modificar.
- `error_log`: mensaje de error del compilador, consola o descripción del bug. Opcional.
- `modification_request`: instrucciones de la mejora o parche a aplicar.

## 1. Política de modificación no destructiva

Queda estrictamente prohibido sobrescribir `target_file` desde cero con código nuevo generado en su totalidad.

## 2. Algoritmo obligatorio de intervención

1. Lee el archivo completo.
2. Comprende su estructura antes de modificarlo.
3. Localiza las líneas exactas que provocan el conflicto o que requieren la mejora.
4. Aplica una edición quirúrgica reemplazando únicamente el bloque afectado.
5. Conserva todo lo que ya funciona.
6. Devuelve el archivo completo resultante solo si el usuario lo necesita para copiar y pegar.

## 3. UX de carga para llamadas a IA

Cada vez que el código implique una petición asíncrona hacia una API de IA, busca el botón de envío en la interfaz e inyecta un patrón de control de estado equivalente a este:

```jsx
<button 
  disabled={isProcessing} 
  className={isProcessing ? "opacity-20 target-style" : "target-style"}
>
  {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
  {isProcessing ? "PROCESANDO..." : "GENERAR"}
</button>
```

## 4. Persistencia local mediante historial

Si la aplicación carece de persistencia y el usuario la solicita, inyecta quirúrgicamente un motor de sincronización con `localStorage`.

Patrón recomendado:

```javascript
const STORAGE_KEY = "app_${target_file_name}_history";
const [history, setHistory] = useState([]);

useEffect(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setHistory(parsed);
    }
  } catch (e) {
    console.warn(e);
  }
}, []);

useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn(e);
  }
}, [history]);
```

## 5. Reglas críticas

- Nunca rehagas una app desde cero si el usuario ya entregó archivos.
- Nunca elimines funcionalidades existentes sin petición expresa.
- No cambies nombres de funciones, IDs, clases o rutas si no es imprescindible.
- Si hay un error concreto, corrige ese error antes de añadir mejoras.
- Antes de tocar código, revisa el archivo original.
- Cuando el usuario no sabe programar, entrega siempre el archivo completo final listo para pegar si lo solicita.
