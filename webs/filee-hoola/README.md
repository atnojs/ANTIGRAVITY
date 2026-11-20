# Filee · variante con la estética de la casa

Segunda versión de la réplica de **filee.sh/es**: mismo contenido, misma
estructura y mismas interacciones que la [réplica fiel](../filee-clone/), pero
con el sistema visual propio (cian `#00D0D0`, verde `#26C626`, Electrolize,
paneles de vidrio azulados, bordes de 2 px y fondo con rejilla).

> **Aviso.** Página no oficial, sin relación con Filee. El producto, sus textos
> y las capturas pertenecen a **Myeonggu Kim (KnifeLemon)**, que lo publica con
> licencia MIT — https://github.com/KnifeLemon/Filee. El logotipo es propio de
> esta variante; la marca y el logotipo originales no se usan aquí.

## Qué cambia respecto a la réplica fiel

| | Réplica fiel (`/webs/filee-clone/`) | Esta variante |
|---|---|---|
| Paleta | La del original (violeta `#7f77dd`, verde `#1d9e75`) | Cian `#00D0D0` y verde `#26C626` |
| Tipografía | Inter | Electrolize (un solo peso, 400) |
| Superficies | Blancas/translúcidas, radio 24 | Vidrio azulado `rgba(23,79,122,.42)`, radio 14, borde cian de 2 px |
| Fondo | Cálido `#f7f6f2` / `#0f0e16` | Degradado azul profundo + rejilla cian de 46 px + halos |
| Temas | Claro y oscuro | Solo oscuro |
| Logotipo | El de Filee | Marca propia (anillo cian/verde con documento) |
| Jerarquía | Pesos 750–820 | Tamaño, versalitas y `letter-spacing` (Electrolize no tiene negritas) |

Lo que **no** cambia: las trece secciones y su orden, los textos, la demo
interactiva con menú circular, los clips, el selector de descarga, las trece
preguntas, la marquesina de formatos y las dieciocho categorías.

## Estructura

```
filee-hoola/
├── index.html          ← página compilada
├── assets/             ← JS y CSS con hash
├── media/              ← imágenes, vídeos y banderas
├── favicon.svg
└── fuente/             ← proyecto Vite (React 18 + Vite 6)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx  data.js  icons.jsx  hooks.js  styles.css
        └── components/  (Nav, Hero, Demo, Clip, Sections, Footer, Logo)
```

## Reconstruir

```bash
cd fuente
npm install
npm run build      # dist/
```

Después se copia `fuente/dist/*` a la raíz de esta carpeta.

## Verificación

30 comprobaciones automáticas en Chrome a 1440, 820 y 390 px (estructura,
demo con ratón y teclado, selector de descarga, clips, preguntas, idiomas,
scroll, enlaces internos, autoplay, consola y red): **30/30 OK**, sin
desbordamiento horizontal y con la consola limpia.

## Notas de diseño

- La rejilla cian (`background-size: 46px 46px`) se enmascara radialmente para
  que no compita con el contenido.
- Los halos de fondo se animan solo con `transform` (26–38 s, alternos).
- Electrolize tiene un único peso: se usa `font-weight: 400` en todo el
  documento y la jerarquía se construye con tamaño, mayúsculas, interletraje y
  brillo cian (`text-shadow`).
- Las capturas de la aplicación se mantienen tal cual: son el producto.
