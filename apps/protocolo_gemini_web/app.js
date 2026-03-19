/**
 * ═══════════════════════════════════════════════════════════════════
 * 🧬 PROTOCOLO GEMINI v11.0 - ALIGNED WITH WORKING PATTERN
 * ═══════════════════════════════════════════════════════════════════
 * Modelo: gemini-3.1-flash-image-preview
 * Usa el mismo patrón que editar_imagen (que SÍ funciona)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO ---
    let identityImage = null; // Selfie
    let styleImage = null;    // Referencia

    const PROXY_URL = 'proxy.php';
    const MODEL = 'gemini-3.1-flash-image-preview';

    // --- ELEMENTOS ---
    const dropIdentity = document.getElementById('drop-area-identity');
    const dropStyle = document.getElementById('drop-area-style');
    const fileIdentity = document.getElementById('file-identity');
    const fileStyle = document.getElementById('file-style');

    const previewIdentity = document.getElementById('preview-identity');
    const previewStyle = document.getElementById('preview-style');
    const removeIdentity = document.getElementById('remove-identity');
    const removeStyle = document.getElementById('remove-style');

    const generateBtn = document.getElementById('generate-btn');
    const resultsGrid = document.getElementById('results-grid');
    const logContent = document.getElementById('log-content');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Status Steps
    const step1 = document.getElementById('status-step-1');
    const step2 = document.getElementById('status-step-2');
    const step3 = document.getElementById('status-step-3');

    // --- SETUP INPUTS ---
    setupUpload(dropIdentity, fileIdentity, (data) => {
        identityImage = data;
        previewIdentity.src = data;
        previewIdentity.style.display = 'block';
        dropIdentity.querySelector('.drop-placeholder').style.display = 'none';
        removeIdentity.style.display = 'flex';
        checkStatus();
    });

    setupUpload(dropStyle, fileStyle, (data) => {
        styleImage = data;
        previewStyle.src = data;
        previewStyle.style.display = 'block';
        dropStyle.querySelector('.drop-placeholder').style.display = 'none';
        removeStyle.style.display = 'flex';
        checkStatus();
    });

    function setupUpload(dropArea, input, onDone) {
        dropArea.onclick = () => input.click();
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) processFile(file, onDone);
        };
        dropArea.ondragover = (e) => { e.preventDefault(); dropArea.classList.add('hover'); };
        dropArea.ondragleave = () => dropArea.classList.remove('hover');
        dropArea.ondrop = (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) processFile(file, onDone);
        };
    }

    function processFile(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => callback(e.target.result);
        reader.readAsDataURL(file);
    }

    removeIdentity.onclick = (e) => {
        e.stopPropagation();
        identityImage = null;
        previewIdentity.style.display = 'none';
        dropIdentity.querySelector('.drop-placeholder').style.display = 'flex';
        removeIdentity.style.display = 'none';
        checkStatus();
    };

    removeStyle.onclick = (e) => {
        e.stopPropagation();
        styleImage = null;
        previewStyle.style.display = 'none';
        dropStyle.querySelector('.drop-placeholder').style.display = 'flex';
        removeStyle.style.display = 'none';
        checkStatus();
    };

    function checkStatus() {
        generateBtn.disabled = !(identityImage && styleImage);
    }

    // --- ENGINE LOGIC (PATRÓN DE EDITAR_IMAGEN) ---
    generateBtn.onclick = async () => {
        loadingOverlay.style.display = 'flex';
        resetSteps();
        logContent.innerHTML = '> Iniciando Protocolo v11.0 (gemini-3.1-flash-image-preview)...<br>';

        try {
            // Paso único: Usar el patrón que funciona en editar_imagen
            updateStep(step1, 'completed');
            updateStep(step2, 'completed');
            updateStep(step3, 'active');

            addLog('Aplicando transformación de estilo...');
            const finalImage = await transformImage(identityImage, styleImage);
            addLog('IMAGEN GENERADA CON ÉXITO.');

            addResultCard(finalImage);
            updateStep(step3, 'completed');

        } catch (error) {
            addLog('ERROR: ' + error.message, 'error');
            alert('Fallo: ' + error.message);
        } finally {
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 1000);
        }
    };

    // --- TRANSFORMACIÓN (MISMO PATRÓN QUE EDITAR_IMAGEN) ---
    async function transformImage(img1, img2) {
        // Prompt basado en el que funciona en editar_imagen (línea 151)
        const prompt = `TRANSFORM this entire image into the following style and content: 
Apply the photographic style from the second reference image. 
Match the lighting setup, color grading, background atmosphere and professional quality from the reference.
Ensure the output is a complete, high-quality portrait that maintains the subject's identity and clothing.`;

        const b64_1 = img1.split(',')[1];
        const b64_2 = img2.split(',')[1];

        const res = await fetch(PROXY_URL, {
            method: 'POST',
            body: JSON.stringify({
                model: MODEL,
                contents: [{
                    parts: [
                        { inlineData: { data: b64_1, mimeType: 'image/png' } },
                        { inlineData: { data: b64_2, mimeType: 'image/png' } },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    imageConfig: {
                        aspectRatio: '1:1'
                    }
                }
            })
        });

        const data = await res.json();
        addLog('API Response: ' + JSON.stringify(data).substring(0, 300) + '...');

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (data.promptFeedback?.blockReason) {
            throw new Error('Bloqueado: ' + data.promptFeedback.blockReason);
        }

        const partsResponse = data.candidates?.[0]?.content?.parts || [];
        for (const part of partsResponse) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
        throw new Error('No se generó imagen. Respuesta: ' + JSON.stringify(data));
    }

    // --- UI HELPERS ---
    function resetSteps() {
        [step1, step2, step3].forEach(s => { s.className = 'status-line pending'; });
    }

    function updateStep(elem, status) {
        elem.className = `status-line ${status}`;
    }

    function addLog(msg, type = '') {
        const div = document.createElement('div');
        div.style.color = type === 'error' ? '#ff0000' : '#00ff00';
        div.innerHTML = `> ${msg}`;
        logContent.appendChild(div);
        logContent.scrollTop = logContent.scrollHeight;
    }

    function addResultCard(src) {
        if (resultsGrid.querySelector('.empty-state')) resultsGrid.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'result-card glass-hover';
        card.innerHTML = `<img src="${src}" alt="Resultado">`;
        resultsGrid.prepend(card);
    }
});

