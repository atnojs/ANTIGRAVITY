// Publica el build de Vite en la raíz de la app (despliegue estático en Hostinger).
// - index.dev.html es la plantilla de desarrollo; vite la compila a dist/index.dev.html
// - Este script copia ese HTML a index.html (raíz) y los bundles a assets/
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const htmlSrc = path.join(distDir, 'index.dev.html');
const htmlDst = path.resolve('index.html');
const assetsSrc = path.join(distDir, 'assets');
const assetsDst = path.resolve('assets');

if (!fs.existsSync(htmlSrc)) {
  console.error('No existe dist/index.dev.html. Ejecuta primero: npm run build');
  process.exit(1);
}

fs.copyFileSync(htmlSrc, htmlDst);
fs.mkdirSync(assetsDst, { recursive: true });
for (const f of fs.readdirSync(assetsSrc)) {
  fs.copyFileSync(path.join(assetsSrc, f), path.join(assetsDst, f));
}
console.log('Build publicado en la raíz de la app:', htmlDst);
