# Filee — réplica en React de `filee.sh`

Réplica de la landing en español de **Filee** (https://filee.sh/es/), reescrita como
aplicación **React + Vite** con CSS propio.

> **Aviso.** Esta página no es oficial y no está afiliada a Filee. Es una réplica
> técnica con fines de demostración: `noindex` activo y atribución visible en el pie.
> Filee es un proyecto de **Myeonggu Kim (KnifeLemon)** publicado con **licencia MIT**
> — https://github.com/KnifeLemon/Filee. El logotipo, los textos descriptivos del
> producto y las capturas de la aplicación pertenecen a ese proyecto y a su autor.
> Las animaciones (`/media/demos`, `/media/whats-new`) y las capturas
> (`/media/screens`) son material de su web.

## Qué hay aquí

```
filee-clone/
├── index.html          ← página compilada (esto es lo que se sirve)
├── assets/             ← JS y CSS compilados con hash
├── media/              ← imágenes, vídeos y banderas (8,6 MB)
└── fuente/             ← proyecto Vite editable (React 18 + Vite 6)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── data.js          ← todo el contenido (textos, categorías, FAQ…)
        ├── icons.jsx        ← iconos SVG
        ├── hooks.js         ← revelado al hacer scroll, barra fija…
        ├── styles.css       ← sistema de diseño completo (claro y oscuro)
        └── components/
            ├── Nav.jsx  Hero.jsx  Demo.jsx  Clip.jsx
            ├── Sections.jsx  Footer.jsx  Logo.jsx
```

## Cómo se reconstruye

```bash
cd fuente
npm install
npm run build      # genera dist/
```

Después se copia `fuente/dist/*` a la raíz de `filee-clone/` (sobrescribiendo
`index.html` y `assets/`) y `fuente/dist/media` se mantiene igual.

## Qué se ha replicado

- **Trece secciones** en el mismo orden: héroe con demo interactiva, vídeo, tres
  pasos, cuatro gestos, novedades 2.5, funciones, formatos (marquesina + 18
  categorías + conversiones populares), HWP, automatización, galería, 13 preguntas,
  «de un vistazo» y descarga.
- **Sistema de diseño** con sus tokens reales: fondo `#f7f6f2` / `#0f0e16` en oscuro,
  acento `#7f77dd`, verde `#1d9e75`, radio 24 px, contenedor 1180 px, tipografía
  Inter (cargada de Google Fonts, como el original) y ambos temas por
  `prefers-color-scheme`.
- **Interacciones**: menú circular con porciones al arrastrar, anillo de progreso,
  selección por teclado (Intro + flechas), clips que se reproducen al entrar en
  pantalla, tarjetas con inclinación y foco de luz, marquesina, revelado al hacer
  scroll, menú de idiomas de 22 entradas, selector de descarga que cambia enlace y
  estado, y preguntas desplegables.

## Paridad medida

Comparado con `https://filee.sh/es/` conduciendo Chrome por CDP:

| Ancho | Alto original | Alto réplica | Δ |
|---|---|---|---|
| 1440 px | 16 984 px | 16 985 px | +1 px |
| 820 px | 19 468 px | 19 469 px | +1 px |
| 390 px | 22 543 px | 22 531 px | −12 px |

En 1440 px las 24 cajas medidas (héroe, titular, demo, secciones, tarjetas, galería,
FAQ, tabla de especificaciones, descarga y pie) coinciden en x, y, ancho y alto con
desviación 0 px.

## Diferencias conocidas y deliberadas

1. **Menú de navegación.** En el original, a 1440 px el botón «Descargar» sobresale
   11 px del viewport y se recorta. Aquí los enlaces se aprietan ligeramente entre
   981 y 1520 px (`gap: 18px`) para que no se recorte nada.
2. **`noindex, nofollow`** y aviso de réplica no oficial en el pie (el original no
   los tiene).
3. **Demo del héroe**: además de la animación, acepta imágenes reales soltadas sobre
   el escenario y las convierte a PNG en el navegador (con enlace de descarga). El
   original solo simula la conversión.
4. **Enlaces de navegación**: los idiomas distintos del español y las guías de
   conversión apuntan al sitio real (`filee.sh`, GitHub) porque esta réplica solo
   tiene la página en español.
5. El pie incluye una frase de atribución que no existe en el original.

## Verificación

28 comprobaciones automáticas en Chrome (estructura, demo con ratón y teclado,
selector de descarga, clips, preguntas, idiomas, scroll, tres anchos sin
desbordamiento, consola y red): **28/28 OK**, consola limpia y sin peticiones
fallidas.
