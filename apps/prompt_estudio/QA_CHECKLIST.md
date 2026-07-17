# QA de Prompt Studio Premium

## Funcional

- [ ] Modo automático envía la petición y devuelve un resultado.
- [ ] Crear desde cero fuerza Método Copiloto.
- [ ] Mejorar un prompt fuerza Mejorador profesional.
- [ ] Los cuatro selectores se aplican correctamente.
- [ ] Los campos opcionales se incluyen cuando tienen contenido.
- [ ] Un archivo TXT/MD/JSON/CSV menor de 1 MB se importa como contexto.
- [ ] Un archivo mayor de 1 MB o de tipo no permitido se rechaza.
- [ ] El prompt final puede editarse, copiarse y descargarse.
- [ ] El historial persiste tras recargar.
- [ ] Buscar, abrir, editar, eliminar y vaciar historial funciona.

## Error y recuperación

- [ ] Sin clave R se muestra un mensaje comprensible.
- [ ] Una clave inválida no se expone en el error.
- [ ] Un fallo de OpenRouter conserva la entrada de la persona.
- [ ] Un fallo del historial no oculta el prompt generado.
- [ ] No se pueden lanzar solicitudes duplicadas durante la carga.
- [ ] El overlay se cierra también cuando ocurre un error.

## Seguridad

- [ ] `skills/`, `history_data/` y `config.php` no son accesibles por URL.
- [ ] El frontend no contiene claves ni endpoints configurables.
- [ ] `proxy.php` solo acepta modelos, modos y campos permitidos.
- [ ] `history.php` solo acepta el namespace fijo.
- [ ] No se devuelve una traza de PHP al navegador.

## Visual y accesibilidad

- [ ] Fondo, rejilla, paneles, bordes y paleta coinciden con Hoola/Relatos.
- [ ] Electrolize se aplica a controles y contenido.
- [ ] El overlay usa los tres aros y la barra indeterminada requerida.
- [ ] No hay scroll horizontal a 360, 768, 1280 y 1920 px.
- [ ] Se puede completar el flujo usando solo teclado.
- [ ] El foco es visible y los cambios dinámicos se anuncian.
- [ ] `prefers-reduced-motion` detiene animaciones relevantes.
