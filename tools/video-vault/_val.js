// Valida el JSX embebido de apps/video-vault/index.html con @babel/parser.
const fs = require('fs');
const parser = require('E:/ANTIGRAVITY/node_modules/@babel/parser');

const src = fs.readFileSync('E:/ANTIGRAVITY/apps/video-vault/index.html', 'utf8');
const re = /<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/;
const m = src.match(re);
if (!m) { console.error('NO SE ENCUENTRA EL SCRIPT BABEL'); process.exit(2); }
try {
    parser.parse(m[1], { sourceType: 'module', plugins: ['jsx'] });
    console.log('SINTAXIS OK (' + m[1].length + ' chars)');
} catch (e) {
    console.error('FALLO DE SINTAXIS:', e.message);
    process.exit(1);
}
