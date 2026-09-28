// Transforma el script babel de trickvault/index.html con @babel/standalone.
// Falla (exit != 0) si Babel no compila (comas perdidas, llaves rotas...).
const fs = require('fs');
const Babel = require('E:/hermes-data/cache/scratch/babelcheck/node_modules/@babel/standalone');

const src = fs.readFileSync('E:/ANTIGRAVITY/apps/trickvault/index.html', 'utf8');
const re = /<script[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/;
const m = src.match(re);
if (!m) { console.error('NO SE ENCONTRO SCRIPT BABEL'); process.exit(2); }
const script = m[1];
console.log('script babel:', script.length, 'chars');
try {
  const out = Babel.transform(script, { presets: ['react'] });
  console.log('TRANSFORM OK:', out.code.length, 'chars de salida');
} catch (e) {
  console.error('TRANSFORM FALLO:', e.message);
  process.exit(1);
}
