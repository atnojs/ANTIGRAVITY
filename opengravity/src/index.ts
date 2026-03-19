import { env } from './config.js';
import { bot } from './bot/index.js';

import { registerTool } from './tools/registry.js';
import { getCurrentTimeTool } from './tools/getCurrentTime.js';
import { speakTool } from './tools/speak.js';

registerTool(getCurrentTimeTool);
registerTool(speakTool);

process.once('SIGINT', () => {
    console.log('Apagando bot...');
    bot.stop();
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('Apagando bot...');
    bot.stop();
    process.exit(0);
});

async function main() {
    console.log('🚀 Iniciando OpenGravity...');
    console.log('☁️  Firebase Firestore conectado.');
    console.log(`📡 Bot configurado para: ${env.TELEGRAM_ALLOWED_USER_IDS.join(', ')}`);

    try {
        await bot.start({
            onStart: (botInfo) => {
                console.log(`✅ ¡Bot conectado como @${botInfo.username}!`);
                console.log('⏳ Esperando mensajes...');
            }
        });
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

main();
