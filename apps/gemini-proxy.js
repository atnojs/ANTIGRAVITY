const http = require('http');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY || '';
const API_BASE = 'generativelanguage.googleapis.com';
const PORT = 3000;

if (!API_KEY) {
    console.error('ERROR: GEMINI_API_KEY no configurada. Usa: GEMINI_API_KEY=tu_key node gemini-proxy.js');
    process.exit(1);
}

function safeJsonParse(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
}

function buildGeminiPayload(reqData) {
    if (reqData.contents) {
        const payload = { contents: reqData.contents };
        if (reqData.generationConfig) payload.generationConfig = reqData.generationConfig;
        if (reqData.safetySettings) payload.safetySettings = reqData.safetySettings;
        return payload;
    }

    const prompt = (reqData.prompt || '').trim();
    const imageB64 = reqData.base64ImageData || '';
    const mime = reqData.mimeType || 'image/jpeg';

    if (!prompt || !imageB64) return null;

    const parts = [
        { text: prompt },
        { inlineData: { mimeType: mime, data: imageB64 } }
    ];

    const cfg = { responseModalities: ['TEXT', 'IMAGE'] };
    if (reqData.generationConfig) Object.assign(cfg, reqData.generationConfig);

    return {
        contents: [{ parts }],
        generationConfig: cfg
    };
}

function callGemini(model, payload, callback) {
    const path = `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    const body = JSON.stringify(payload);

    const req = https.request({
        hostname: API_BASE,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: 120000
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            callback(res.statusCode, data);
        });
    });

    req.on('error', (e) => {
        callback(502, JSON.stringify({ error: { message: e.message } }));
    });
    req.on('timeout', () => {
        req.destroy();
        callback(504, JSON.stringify({ error: { message: 'Timeout esperando a Google Gemini' } }));
    });

    req.write(body);
    req.end();
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST' || (req.url !== '/api/generate' && !req.url.startsWith('/v1beta/'))) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ruta no encontrada. Usa POST /api/generate' }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        const reqData = safeJsonParse(body);
        if (!reqData) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'JSON invalido' }));
            return;
        }

        const model = reqData.model || 'gemini-3.1-flash-preview';
        const payload = buildGeminiPayload(reqData);

        if (!payload) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Faltan prompt y base64ImageData, o contents' }));
            return;
        }

        callGemini(model, payload, (status, data) => {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(data);
        });
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Gemini Proxy activo en http://127.0.0.1:${PORT}/api/generate`);
    console.log(`Modelo por defecto: gemini-3.1-flash-preview`);
});
