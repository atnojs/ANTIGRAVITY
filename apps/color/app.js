document.addEventListener('DOMContentLoaded', () => {
    // ─── HistoryManager ──────────────────────────────────────
    HistoryManager.configure({ dbName: 'color_app_db' });

    const colorModeBtn = document.getElementById('color-mode-btn');
    const imageModeBtn = document.getElementById('image-mode-btn');
    const colorInputContainer = document.getElementById('color-input-container');
    const imageInputContainer = document.getElementById('image-input-container');
    const generatorForm = document.getElementById('generator-form');
    const colorInput = document.getElementById('color-input');
    const imageUpload = document.getElementById('image-upload');
    const imageUploadLabel = document.querySelector('.image-upload-label');
    const fileNameSpan = document.getElementById('file-name');
    const generateBtn = document.getElementById('generate-btn');
    const loader = document.getElementById('loader');
    const resultsContainer = document.getElementById('results-container');
    const textOptionContainer = document.getElementById('text-option-container');
    const withTextBtn = document.getElementById('with-text-btn');
    const noTextBtn = document.getElementById('no-text-btn');
    const customTextBtn = document.getElementById('custom-text-btn');
    const customTextWrapper = document.getElementById('custom-text-wrapper');
    const customTextInput = document.getElementById('custom-text-input');

    let currentMode = 'color';
    let uploadedFile = null;
    let textChoice = null; // null, true (con), false (sin), 'custom'

    function setInputMode(mode) {
        currentMode = mode;
        textChoice = null;
        updateGenerateButtonState();

        // Mostrar botones de texto
        withTextBtn.classList.remove('active');
        noTextBtn.classList.remove('active');
        customTextBtn.classList.remove('active');
        textOptionContainer.classList.remove('hidden');
        customTextWrapper.classList.add('hidden');
        customTextInput.value = '';

        if (mode === 'color') {
            colorModeBtn.classList.add('active');
            imageModeBtn.classList.remove('active');
            colorModeBtn.setAttribute('aria-pressed', 'true');
            imageModeBtn.setAttribute('aria-pressed', 'false');
            colorInputContainer.classList.remove('hidden');
            imageInputContainer.classList.add('hidden');
            colorInput.required = true;
            imageUpload.required = false;
        } else {
            colorModeBtn.classList.remove('active');
            imageModeBtn.classList.add('active');
            colorModeBtn.setAttribute('aria-pressed', 'false');
            imageModeBtn.setAttribute('aria-pressed', 'true');
            colorInputContainer.classList.add('hidden');
            imageInputContainer.classList.remove('hidden');
            colorInput.required = false;
            imageUpload.required = true;
        }
    }

    function updateGenerateButtonState() {
        const hasInput = currentMode === 'color' ? colorInput.value : uploadedFile;
        let isTextOk = textChoice !== null;

        if (textChoice === 'custom') {
            isTextOk = customTextInput.value.trim().length > 0;
        }

        generateBtn.disabled = !(hasInput && isTextOk);
    }

    colorModeBtn.addEventListener('click', () => setInputMode('color'));
    imageModeBtn.addEventListener('click', () => setInputMode('image'));

    colorInput.addEventListener('input', () => updateGenerateButtonState());
    customTextInput.addEventListener('input', () => updateGenerateButtonState());

    imageUpload.addEventListener('change', (e) => {
        uploadedFile = e.target.files[0];
        if (uploadedFile) {
            imageUpload.required = true;

            const reader = new FileReader();
            reader.onload = function (event) {
                const imageUrl = event.target.result;

                imageUploadLabel.style.backgroundImage = `url('${imageUrl}')`;
                imageUploadLabel.style.backgroundSize = 'contain';
                imageUploadLabel.style.backgroundPosition = 'center';
                imageUploadLabel.style.backgroundRepeat = 'no-repeat';
                imageUploadLabel.classList.add('has-image');

                const img = new Image();
                img.onload = function () {
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    imageUploadLabel.style.aspectRatio = width / height;
                };
                img.src = imageUrl;
            }
            reader.readAsDataURL(uploadedFile);

            // Mostrar opción de texto cuando hay imagen
            textOptionContainer.classList.remove('hidden');
            updateGenerateButtonState();

        } else {
            imageUpload.required = true;
            imageUploadLabel.style.backgroundImage = 'none';
            imageUploadLabel.style.aspectRatio = 'auto';
            imageUploadLabel.classList.remove('has-image');
            textOptionContainer.classList.add('hidden');
            updateGenerateButtonState();
            const spanElement = imageUploadLabel.querySelector('span:first-of-type');
            if (spanElement) {
                spanElement.style.display = 'block';
            }
        }
    });

    withTextBtn.addEventListener('click', () => {
        textChoice = true;
        withTextBtn.classList.add('active');
        noTextBtn.classList.remove('active');
        customTextBtn.classList.remove('active');
        customTextWrapper.classList.add('hidden');
        updateGenerateButtonState();
    });

    noTextBtn.addEventListener('click', () => {
        textChoice = false;
        noTextBtn.classList.add('active');
        withTextBtn.classList.remove('active');
        customTextBtn.classList.remove('active');
        customTextWrapper.classList.add('hidden');
        updateGenerateButtonState();
    });

    customTextBtn.addEventListener('click', () => {
        textChoice = 'custom';
        customTextBtn.classList.add('active');
        withTextBtn.classList.remove('active');
        noTextBtn.classList.remove('active');
        customTextWrapper.classList.remove('hidden');
        customTextInput.focus();
        updateGenerateButtonState();
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageUploadLabel.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    imageUploadLabel.addEventListener('dragenter', () => imageUploadLabel.classList.add('dragover'));
    imageUploadLabel.addEventListener('dragleave', () => imageUploadLabel.classList.remove('dragleave'));
    imageUploadLabel.addEventListener('drop', (e) => {
        imageUploadLabel.classList.remove('dragover');
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            imageUpload.files = files;
            const changeEvent = new Event('change');
            imageUpload.dispatchEvent(changeEvent);
        }
    });


    generatorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- PERSONALIDAD EN SYSTEM, INSTRUCCIÓN EN PROMPT
        const systemInstruction = {
            parts: [{
                text: "Eres un director de arte experto. Tu objetivo es crear conceptos publicitarios premium que combinen texto técnico y una imagen publicitaria impactante para cada concepto."
            }]
        };

        const basePrompt = `Genera exactamente 3 propuestas de diseño basadas en la entrada del usuario.

REGLAS OBLIGATORIAS POR CADA PROPUESTA:
1. BLOQUE DE TEXTO:
   - **Título**: [Nombre de la propuesta]
   - **Colores**: [6 códigos HEX]
   - **Tipografía**: [Nombre], https://fonts.google.com/
2. IMAGEN: Inmediatamente después del texto, genera UNA imagen publicitaria del concepto (estética Neon Glassmorphism).

IMPORTANTE: Eres un modelo MULTIMODAL. El formato final debe ser: Texto1, Imagen1, Texto2, Imagen2, Texto3, Imagen3. No olvides ninguna imagen.

La entrada del usuario es:`;

        let textInstruction = "";
        if (textChoice === true) {
            textInstruction = "**Importante: Es imprescindible que cada imagen generada contenga un texto visible y estéticamente integrado usando la tipografía que has sugerido.**";
        } else if (textChoice === false) {
            textInstruction = "**PROHIBICIÓN ESTRICTA: NO incluyas NINGÚN TIPO DE TEXTO, LOGOTIPO O MARCA DE AGUA dentro de las imágenes. La imagen debe ser puramente visual.**";
        } else if (textChoice === 'custom') {
            const userText = customTextInput.value.trim();
            textInstruction = `**Importante: Es IMPRESCINDIBLE que cada imagen generada contenga EXACTAMENTE el siguiente texto: "${userText}". El texto debe estar estéticamente integrado usando la tipografía que has sugerido.**`;
        }

        const promptParts = [];
        let finalPrompt = basePrompt;

        if (currentMode === 'color') {
            const color = colorInput.value;
            if (!color) return;
            finalPrompt += ` el color "${color}". ${textInstruction}`;
            promptParts.push({ text: finalPrompt });
        } else {
            if (!uploadedFile) return;
            try {
                const base64Image = await fileToBase64(uploadedFile);
                const mimeType = uploadedFile.type;
                finalPrompt += ` la siguiente imagen. Extrae el color dominante y úsalo como base. ${textInstruction}`;
                promptParts.push({ text: finalPrompt });
                promptParts.push({
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                });
            } catch (error) {
                console.error("Error converting file to base64:", error);
                alert("Hubo un error al procesar la imagen.");
                return;
            }
        }

        setLoading(true);

        try {
            const response = await callGeminiAPI(promptParts, systemInstruction);
            console.log("Respuesta completa de la API:", response);

            if (response && response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
                const hasResults = displayResults(response.candidates[0].content.parts);
                if (!hasResults) {
                    resultsContainer.innerHTML = `<p class="error-message">El modelo devolvió una respuesta pero no se encontraron imágenes generadas. Prueba a cambiar el texto o la imagen.</p>`;
                } else {
                    // Guardar imágenes generadas en el historial
                    saveGeneratedToHistory(response.candidates[0].content.parts);
                }
            } else {
                console.error('La respuesta de la API no tiene el formato esperado o fue bloqueada.', response);
                let errorMessage = "No se pudo generar un resultado. ";

                if (response && response.candidates && response.candidates.length > 0 && response.candidates[0].finishReason === 'SAFETY') {
                    errorMessage += "La solicitud fue bloqueada por políticas de seguridad. Prueba con otra imagen o color.";
                } else {
                    errorMessage += "Inténtalo de nuevo.";
                }

                resultsContainer.innerHTML = `<p class="error-message">${errorMessage}</p>`;
            }
        } catch (error) {
            console.error('Error llamando a la API de Gemini:', error);
            resultsContainer.innerHTML = `<p class="error-message">Hubo un error al generar las imágenes. Por favor, revisa la consola para más detalles e inténtalo de nuevo.</p>`;
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (isLoading) {
            generateBtn.disabled = true;
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            }
            if (loadingText) loadingText.textContent = 'Interpretando Concepto...';
            document.body.style.overflow = 'hidden';
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
        } else {
            generateBtn.disabled = false;
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }
            document.body.style.overflow = '';
            resultsContainer.classList.remove('hidden');
        }
    }

    async function callGeminiAPI(parts, systemInstruction = null) {
        const body = {
            contents: [{ parts }],
            generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                maxOutputTokens: 2048,
                temperature: 0.7
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        if (systemInstruction) {
            body.systemInstruction = systemInstruction;
        }

        // console.log("Cuerpo de la petición enviada al Proxy:", JSON.stringify(body, null, 2));

        const response = await fetch('proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }
        return response.json();
    }

    function displayResults(parts) {
        console.log("Procesando partes de la respuesta Gemini:", parts);
        parts.forEach((p, i) => {
            if (p.text) console.log(`Parte ${i} [TEXTO]:`, p.text.substring(0, 100) + "...");
            if (p.inlineData) console.log(`Parte ${i} [IMAGEN]:`, p.inlineData.mimeType);
        });
        resultsContainer.innerHTML = '';
        let currentInfo = null;

        for (const part of parts) {
            if (part.text) {
                if (currentInfo) {
                    currentInfo += "\n" + part.text;
                } else {
                    currentInfo = part.text;
                }
            } else if (part.inlineData) {
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                const title = currentInfo ? getTitleFromInfo(currentInfo) : 'Diseño Generado';
                const infoText = currentInfo || "Información no disponible";

                const cardHTML = createResultCard(imageUrl, infoText, title);
                resultsContainer.insertAdjacentHTML('beforeend', cardHTML);

                // Añadir evento para el visor
                const lastCard = resultsContainer.lastElementChild;
                const img = lastCard.querySelector('img');
                img.addEventListener('click', () => openViewer(imageUrl, title));

                // Añadir evento para descarga
                const downloadBtn = lastCard.querySelector('.download-card-btn');
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    downloadImage(imageUrl, `diseño_${title.toLowerCase()}.jpg`);
                });

                currentInfo = null;
            }
        }
        return resultsContainer.children.length > 0;
    }

    function getTitleFromInfo(textInfo) {
        if (textInfo.toLowerCase().includes('monocromático')) {
            return 'Monocromático';
        } else if (textInfo.toLowerCase().includes('análogo')) {
            return 'Análogo';
        } else if (textInfo.toLowerCase().includes('complementario')) {
            return 'Complementario';
        }
        return 'Diseño Generado';
    }

    function getTextColorForBg(hexColor) {
        if (!hexColor || hexColor === 'transparent') return '#000000';
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }


    function createResultCard(imageUrl, textInfo, title) {
        const colorsMatch = textInfo.match(/\*\*Colores\*\*:\s*([\s\S]*?)(?=\*\*Tipografía\*\*|$)/);
        const colorsText = colorsMatch ? colorsMatch[1].trim() : 'No disponible';

        const typographyMatch = textInfo.match(/\*\*Tipografía\*\*:\s*(.*)/);
        const typographyText = typographyMatch ? typographyMatch[1].trim() : 'No disponible';

        let fontName = typographyText.split(',')[0] || "Desconocida";
        let fontLink = typographyText.match(/https?:\/\/[^\s)]+/) ? typographyText.match(/https?:\/\/[^\s)]+/)[0] : '#';

        const colorItems = colorsText.split('\n').map(line => line.replace(/^-/, '').trim()).filter(Boolean);

        const colorBlocks = colorItems.map(c => {
            const hexMatch = c.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
            const bgColor = hexMatch ? hexMatch[0] : 'transparent';
            const textColor = getTextColorForBg(bgColor);
            return `<div class="color-code" style="background-color: ${bgColor}; color: ${textColor};">${c}</div>`;
        }).join('');

        return `
            <article class="result-card">
                <div class="image-container">
                    <img src="${imageUrl}" alt="${title}">
                    <button class="download-card-btn" title="Descargar Imagen">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75Z" />
                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                        </svg>
                    </button>
                </div>
                <div class="result-info">
                    <h3>${title}</h3>
                    <div class="info-section">
                        <h4>Códigos de Color</h4>
                        <div class="color-codes">
                            ${colorBlocks}
                        </div>
                    </div>
                    <div class="info-section">
                        <h4>Tipografía</h4>
                        <p class="typography-info">
                            ${fontName} - <a href="${fontLink}" target="_blank" rel="noopener noreferrer">Descargar</a>
                        </p>
                    </div>
                </div>
            </article>
        `;
    }

    function resizeImage(file, maxWidth = 1200, maxHeight = 1200) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        } else {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(file.type, 0.85).split(',')[1]);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    function fileToBase64(file) {
        // Redimensionamos para evitar errores de conexión por tamaño excesivo
        return resizeImage(file);
    }

    function openViewer(url, title = 'imagen') {
        let viewer = document.getElementById('image-viewer');
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = 'image-viewer';
            viewer.className = 'image-viewer zoom-out';
            viewer.innerHTML = `
                <span class="close-viewer">&times;</span>
                <div class="viewer-content">
                    <img src="" alt="Vista ampliada">
                    <button class="download-viewer-btn" title="Descargar Imagen">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75Z" />
                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                        </svg>
                        Descargar
                    </button>
                </div>
            `;
            document.body.appendChild(viewer);
            viewer.querySelector('.close-viewer').addEventListener('click', () => viewer.classList.remove('active'));
            viewer.addEventListener('click', (e) => {
                if (e.target === viewer) viewer.classList.remove('active');
            });
        }

        const viewerImg = viewer.querySelector('img');
        viewerImg.src = url;

        const downloadBtn = viewer.querySelector('.download-viewer-btn');
        // Limpiar listener anterior para evitar duplicados
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

        newDownloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadImage(url, `diseño_${title.toLowerCase()}.jpg`);
        });

        viewer.classList.add('active');
    }

    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ─── Persistencia con HistoryManager ────────────────────────
    function saveGeneratedToHistory(parts) {
        parts.forEach(function (p) {
            if (p.inlineData) {
                var imageUrl = 'data:' + (p.inlineData.mimeType || 'image/png') + ';base64,' + p.inlineData.data;
                HistoryManager.saveItem({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                    url: imageUrl,
                    prompt: colorInput.value || uploadedFile?.name || 'Paleta generada',
                    aspectRatio: '1:1',
                    size: '',
                    geminiSize: '1K',
                    style: { mode: currentMode },
                    createdAt: Date.now()
                });
            }
        });
        loadAndRenderHistory();
    }

    function deleteHistoryItem(id) {
        if (confirm('¿Eliminar esta imagen del historial?')) {
            HistoryManager.deleteItem(id).then(function () { loadAndRenderHistory(); });
        }
    }

    function clearAllHistory() {
        if (confirm('¿Eliminar todo el historial?')) {
            HistoryManager.clearAll().then(function () { loadAndRenderHistory(); });
        }
    }

    function loadAndRenderHistory() {
        HistoryManager.loadAll().then(function (items) {
            var grid = document.getElementById('history-grid');
            var title = document.getElementById('history-title');
            if (!grid) return;
            if (!items || !items.length) {
                grid.innerHTML = '';
                if (title) title.style.display = 'none';
                return;
            }
            if (title) title.style.display = 'block';
            grid.innerHTML = items.map(function (item) {
                return '<article class="result-card" style="position:relative">' +
                    '<div class="image-container">' +
                    '<img src="' + item.url + '" alt="Historial" onclick="document.getElementById(\'image-viewer\')?.' +
                    'classList.add(\'active\');var v=document.querySelector(\'#image-viewer img\');if(v)v.src=this.src">' +
                    '<button class="download-card-btn" title="Eliminar" style="right:10px;left:auto;background:rgba(239,68,68,0.8)" ' +
                    'onclick="event.stopPropagation();window._deleteHistoryItem && window._deleteHistoryItem(\'' + item.id + '\')">' +
                    '<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'white\' width=\'16\' height=\'16\'>' +
                    '<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.75h-.75A2.25 2.25 0 0 0 3 6.75v.5c0 .414.336.75.75.75H4v6.75A2.75 2.75 0 0 0 6.75 17h6.5A2.75 2.75 0 0 0 16 14.75V8h.25A.75.75 0 0 0 17 7.25v-.5A2.25 2.25 0 0 0 14.75 4.5H14v-.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM12.5 4.5v-.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.75h5Z" clip-rule="evenodd"/></svg>' +
                    '</button></div>' +
                    '<div class="result-info"><p style="color:#94a3b8;font-size:0.8rem;margin:0">' +
                    new Date(item.createdAt).toLocaleString() + '</p></div></article>';
            }).join('');

            // Botón limpiar todo
            var clearBtn = document.getElementById('history-clear-btn');
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'history-clear-btn';
                clearBtn.textContent = 'Limpiar Historial';
                clearBtn.style.cssText = 'margin-top:1rem;padding:0.5rem 1rem;background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#ef4444;border-radius:8px;cursor:pointer;font-size:0.8rem';
                clearBtn.onclick = clearAllHistory;
                var historyContainer = document.getElementById('history-container');
                if (historyContainer) historyContainer.appendChild(clearBtn);
            }
        });
    }

    // Exponer función de borrado para onclick inline
    window._deleteHistoryItem = deleteHistoryItem;

    // Cargar historial al iniciar
    HistoryManager.init().then(function () { loadAndRenderHistory(); });

    setInputMode('image');
});