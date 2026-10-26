/**
 * Prueba de mutación: las comprobaciones deben FALLAR si el defecto reaparece.
 * Restaura el archivo al terminar, pase lo que pase.
 *
 * Uso: node tools/flow-agent/probar-comprobacion.mjs
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const APP = 'apps/unified-image-studio';
const SCRIPT = 'tools/flow-agent/comprobar-entregable.mjs';
const appJs = `${APP}/assets/js/app.js`;

const original = fs.readFileSync(appJs, 'utf8');
const casos = [
  [
    'D3: botón de nuevo en tarjetas de vídeo',
    (t) => t.replace(
      "        actions.push(`<button class=\"btn btn-sm btn-ghost\" data-flow-animate=\"${job.id}\">Animar</button>`);",
      "        actions.push(`<button class=\"btn btn-sm btn-ghost\" data-flow-animate=\"${job.id}\">Animar</button>`);\n        actions.push(`<button class=\"btn btn-sm btn-ghost\" data-flow-frames=\"${job.id}\">Usar como inicio</button>`);",
    ),
  ],
  [
    'D7: visor con dimensiones interrogante',
    (t) => t.replace(
      '`${job.type === \'video\' ? \'Vídeo\' : \'Imagen\'} · ${job.ratio || \'\'}${medidas}`',
      '`${job.type === \'video\' ? \'Vídeo\' : \'Imagen\'} · ${job.ratio || \'\'} · ${job.width || \'?\'}×${job.height || \'?\'}`',
    ),
  ],
];

let fallos = 0;
try {
  for (const [nombre, mutar] of casos) {
    const mutado = mutar(original);
    if (mutado === original) {
      console.log(`INVÁLIDA ${nombre}: la mutación no cambió el archivo`);
      fallos += 1;
      continue;
    }
    fs.writeFileSync(appJs, mutado, 'utf8');
    let codigo = 0;
    let salida = '';
    try {
      execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    } catch (error) {
      codigo = error.status || 1;
      salida = `${error.stdout || ''}${error.stderr || ''}`;
    }
    const detecta = codigo !== 0;
    console.log(`${detecta ? 'OK   ' : 'FALLO'} ${nombre}: el script ${detecta ? 'falla como debe' : 'NO detecta la regresión'}`);
    if (!detecta) {
      fallos += 1;
      console.log(salida.slice(-400));
    }
  }
} finally {
  fs.writeFileSync(appJs, original, 'utf8');
}

console.log(fallos === 0 ? '\nMutaciones detectadas: la comprobación es real.' : `\n${fallos} mutación(es) NO detectadas.`);
process.exit(fallos === 0 ? 0 : 1);
