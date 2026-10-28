# Foto A4

Compositor para colocar varias fotos sobre un folio A4 e imprimirlas tal y como se ven.

## Uso rápido

1. Doble clic en `\\Principal\e\ANTIGRAVITY\tools\foto-a4-bridge\iniciar.bat`.
2. Se abre solo `http://127.0.0.1:8787/`.
3. Añade las fotos, colócalas y pulsa **Imprimir**.

También funciona sin el puente en `https://atnojs.es/webs/foto-a4/`, pero ahí la impresión
directa no está disponible: se usa el diálogo de Windows.

## Qué hace

- Varias fotos en el mismo folio, cada una independiente (mover, escalar, rotar, capas).
- Tiradores en esquinas y lados; esquinas proporcionales y **Mayús** para deformar.
- Giros con imán a 0/90/180/270°.
- **Espejo H** y **Espejo V** por foto seleccionada.
- **Ajustar al folio**: agranda hasta tocar un borde sin recortar (respeta la proporción).
- **Cubrir folio**: llena el A4 y recorta lo que sobra.
- Duplicar, eliminar, orden de capas, deshacer/rehacer y atajos de teclado.
- Aviso de resolución efectiva (ppp) por foto.
- Exportar PDF y PNG a 300 ppp (2480 × 3508 px).
- Guardado automático en el navegador y proyectos `.json` portables.

## Impresión

Dos vías, en la pestaña del diálogo de impresión:

- **Impresora de red** (requiere el puente local): manda el folio directo al driver de
  Windows con papel, copias y calidad reales del driver. Sin diálogos intermedios.
- **Diálogo de Windows**: abre el driver completo (tipo de papel, sin bordes, color…).

El papel se envía a sangre; los márgenes físicos de la impresora (2–4 mm) pueden recortar
los bordes. Para imprimir sin bordes hay que activarlo en las preferencias del driver.

## Estructura

```
webs/foto-a4/            app pública (estática + proxy.php de salud)
tools/foto-a4-bridge/    puente local (no se despliega)
  server.mjs             sirve la app y expone /api/*
  print.ps1              impresión con System.Drawing + driver instalado
  iniciar.bat            arranca el puente y abre el navegador
```

## Requisitos

- Navegador actualizado (Chrome, Edge o Firefox).
- Node.js solo para el puente de impresión local.

## Privacidad

Las fotos no salen del equipo: se procesan en el navegador y, si se usa el puente, viajan
a `127.0.0.1`. No hay cuentas, subidas ni servicios externos.
