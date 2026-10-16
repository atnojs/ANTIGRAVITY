import { createConverter } from "file:///C:/Users/atnojs/AppData/Local/Programs/DeepSeek%20Harness/resources/app.asar.unpacked/dsh/node_modules/@deepseek-ai/libreoffice-kit/lib/index.js";

const pairs = process.argv.slice(2);
if (pairs.length === 0 || pairs.length % 2 !== 0) {
  console.error("uso: node render.mjs <in> <outdir> [<in> <outdir> ...]");
  process.exit(2);
}
const converter = await createConverter();
try {
  for (let i = 0; i < pairs.length; i += 2) {
    const result = await converter.renderImages({ inputPath: pairs[i], outputDir: pairs[i + 1], dpi: 110 });
    console.log(JSON.stringify(result));
  }
} finally {
  await converter.dispose();
}
