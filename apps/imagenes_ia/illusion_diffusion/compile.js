const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('app.js', 'utf8');

const result = babel.transformSync(source, {
  presets: ['@babel/preset-react'],
});

fs.writeFileSync('app.compiled.js', result.code);
console.log('Compilado exitosamente a app.compiled.js');
