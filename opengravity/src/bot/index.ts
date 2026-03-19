import { Bot, Context, NextFunction, InputFile } from 'grammy';
import { env } from '../config.js';
import { processUserMessage } from '../services/agent.js';
import { clearHistory } from '../services/db.js';
import { transcribeAudio } from '../services/audio.js';

// Función para enviar mensajes de forma segura, evitando que un error de Markdown crashee el bot
async function safeReply(ctx: Context, text: string) {
    try {
        await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch (error) {
        console.warn('[Bot] Falló el parseo de Markdown, enviando como texto plano:', error);
        await ctx.reply(text); // Fallback sin formato
    }
}

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Middleware: Whitelist de usuarios
async function whitelistMiddleware(ctx: Context, next: NextFunction) {
    if (!ctx.from) return;

    const userId = ctx.from.id;

    if (env.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
        await next(); // Usuario autorizado, continúa al siguiente handler
    } else {
        console.warn(`[Seguridad] Intento de acceso denegado del ID: ${userId} (@${ctx.from.username})`);
        // Opcionalmente podemos responder, pero por seguridad y privacidad en apps personales es mejor ignorar:
        // await ctx.reply("No estás autorizado para usar este bot.");
    }
}

bot.use(whitelistMiddleware);

// Comandos básicos
bot.command('start', async (ctx) => {
    await ctx.reply('¡Hola! Soy OpenGravity, tu agente personal. Estoy vivo y ejecutándome localmente.');
});

bot.command('clear', async (ctx) => {
    if (ctx.from) {
        clearHistory(ctx.from.id);
        await ctx.reply('🧹 He borrado mi memoria de nuestra conversación. ¡Empezamos de cero!');
    }
});

bot.command('id', async (ctx) => {
    if (ctx.from) {
        await ctx.reply(`Tu ID de Telegram es: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
    }
})

// Manejo de mensajes de texto
bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // Enviar "Escribiendo..." para dar feedback
    await ctx.replyWithChatAction('typing');

    try {
        const { text: response, audio } = await processUserMessage(userId, text);

        if (audio) {
            await ctx.replyWithVoice(new InputFile(audio));
        }

        if (response) {
            await safeReply(ctx, response);
        }
    } catch (error) {
        console.error('[Bot Error]', error);
        await ctx.reply('Hubo un error crítico al procesar tu mensaje. Revisa los logs locales.');
    }
});

// Manejo de mensajes de voz
bot.on('message:voice', async (ctx) => {
    const userId = ctx.from.id;

    // Enviar "Escribiendo..." para dar feedback
    await ctx.replyWithChatAction('typing');

    try {
        // Obtener la URL del archivo desde Telegram
        const file = await ctx.getFile();
        const path = file.file_path;
        if (!path) throw new Error('No pude obtener la ruta del archivo de voz.');

        const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${path}`;

        // Descargar el audio
        const responseAudio = await fetch(url);
        const arrayBuffer = await responseAudio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Transcribir con Groq Whisper
        const transcribedText = await transcribeAudio(buffer);
        console.log(`[Bot] Voz transcrita de ${userId}: "${transcribedText}"`);

        // Procesar como un mensaje normal indicando explícitamente que es un audio
        const aiPromptText = `Mensaje de voz del usuario: ${transcribedText}`;
        const { text: response, audio } = await processUserMessage(userId, aiPromptText);

        if (audio) {
            await ctx.replyWithVoice(new InputFile(audio));
        }

        // Opcional: Responder al usuario indicando el texto que entendimos
        await safeReply(ctx, `*Escuchado:* "${transcribedText}"\n\n${response}`);

    } catch (error: any) {
        console.error('[Voice Error Detailed]', error);
        await ctx.reply(`❌ Error procesando el audio: ${error.message}${error.status ? ` (Status: ${error.status})` : ''}\nRevisa los logs.`);
    }
});

// Manejo de errores globales para evitar que el bot muera
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error procesando update ${ctx.update.update_id}:`);
    console.error(err.error);
});
