import { createConverter } from "file:///C:/Users/atnojs/AppData/Local/Programs/DeepSeek%20Harness/resources/app.asar.unpacked/dsh/node_modules/@deepseek-ai/libreoffice-kit/lib/index.js";

const pairs = process.argv.slice(2);
if (pairs.length === 0 || pairs.length % 2 !== 0) {
  console.error("uso: node conv.mjs <in> <out> [<in> <out> ...]");
  process.exit(2);
}
const converter = await createConverter({
  fontFallbacks: [["Playfair Display", "Times New Roman"]],
});
try {
  for (let i = 0; i < pairs.length; i += 2) {
    const result = await converter.convert({ inputPath: pairs[i], outputPath: pairs[i + 1] });
    console.log(JSON.stringify(result));
  }
} finally {
  await converter.dispose();
}
