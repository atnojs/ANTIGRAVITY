import { config } from 'dotenv';
import { z } from 'zod';

// Cargar variables de entorno desde el archivo .env
config();

// Definir el esquema de configuración esperado
const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN es requerido'),
    TELEGRAM_ALLOWED_USER_IDS: z.string().transform((val) =>
        val.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
    ),
    GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY es requerido'),
    ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY es requerido'),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('openrouter/free'),
});

// Validar y exportar la configuración
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Error de configuración. Faltan variables de entorno:');
    console.error(parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
