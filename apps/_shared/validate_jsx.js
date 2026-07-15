// Valida sintaxis JSX real con Babel standalone (sandbox vm)
const fs = require('fs');
const vm = require('vm');

const path = require('path');
const babelSrc = fs.readFileSync(path.join(__dirname, 'babel.min.js'), 'utf8');
const sandbox = {};
sandbox.self = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(babelSrc, sandbox);

const file = process.argv[2];
const presets = (process.argv[3] || 'react').split(',');
const code = fs.readFileSync(file, 'utf8');
try {
  sandbox.Babel.transform(code, { presets });
  console.log('JSX_OK ' + file);
} catch (e) {
  console.error('JSX_FAIL ' + file + '\n' + e.message.split('\n').slice(0, 12).join('\n'));
  process.exit(1);
}
