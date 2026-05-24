document.addEventListener('DOMContentLoaded', () => {
    const PROXY_URL = 'proxy.php';
    const imageInput = document.getElementById('image-input');
    const startButton = document.getElementById('start-button');
    const processingSection = document.getElementById('processing-section');
    const previewGrid = document.getElementById('preview-grid');
    const previewSection = document.getElementById('preview-section');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const spinnerContainer = document.getElementById('spinner-container');
    const resultsGallery = document.getElementById('results-gallery');
    const galleryTitle = document.querySelector('.gallery-title');

    let imageQueue = [];

    imageInput.addEventListener('change', (e) => {
        imageQueue = Array.from(e.target.files);
        if (imageQueue.length === 0) return;
        startButton.disabled = false;
        startButton.innerHTML = `🚀 Iniciar Procesamiento (${imageQueue.length})`;
        previewSection.classList.remove('hidden');
        previewGrid.innerHTML = '';
        imageQueue.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `<img src="${ev.target.result}">`;
                previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });

    startButton.addEventListener('click', async () => {
        startButton.disabled = true;
        processingSection.classList.remove('hidden');
        spinnerContainer.classList.remove('hidden');
        galleryTitle.classList.remove('hidden');
        resultsGallery.innerHTML = '';
        const total = imageQueue.length;

        for (let i = 0; i < total; i++) {
            const file = imageQueue[i];
            progressText.innerText = `Procesando ${i + 1} de ${total}...`;
            progressBar.style.width = `${((i + 1) / total) * 100}%`;

            try {
                const base64 = await new Promise(r => {
                    const rd = new FileReader();
                    rd.onload = () => r(rd.result.split(',')[1]);
                    rd.readAsDataURL(file);
                });

                const res = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64,
                        mimeType: file.type || 'image/jpeg',
                        prompt: "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page.\n\nStyle Conversion: Convert all visual elements from the input image (people, objects, backgrounds, text, etc.) into consistent, smooth, and distinct black outlines using clean, uniform lines.\n\nTonal Removal: Completely eliminate all colors, gradients, shading, textures, and gray fills. The resulting image must consist purely of black lines on a pure white background.\n\nClarity and Space: Simplify complex shapes when necessary to create distinct, clear areas of white space that invite and are easy to color. Ensure that the outlines of key objects are prominent.\n\nDetail & Context Preservation: Maintain the original composition, perspective, and key elements of the input image. If the input image contains text, render it as clear, simple, colorable outlines. If there are intricate details, reduce them to essential lines without losing the object's identity (e.g., ship rigging details or basic facial features).\n\nCleanliness: The final drawing must be sharp, without artifacts, smudges, or extraneous lines. Do not add additional background textures or decorative frames unless they were present in the original image or specifically requested.\n\nThe final output should appear ready to be printed and hand-colored."
                    })
                });

                const data = await res.json();

                if (!res.ok || data.error) {
                    throw new Error(data.error?.message || `Error HTTP ${res.status}`);
                }

                if (data.image) {
                    // GPT-4o devolvio una imagen
                    const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.innerHTML = `
                        <img src="data:${data.mimeType};base64,${data.image}" alt="Dibujo lineal">
                        <div class="gallery-item-actions">
                            <a href="data:${data.mimeType};base64,${data.image}" download="dibujo_${safeName}.png" class="download-single-btn">💾 Descargar</a>
                        </div>
                    `;
                    resultsGallery.appendChild(item);
                } else if (data.text) {
                    // GPT-4o devolvio solo texto (no pudo generar imagen)
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.style.borderColor = 'var(--acc2)';
                    item.innerHTML = `
                        <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;color:var(--text);text-align:center;font-size:.8rem;overflow:auto">
                            ${data.text.substring(0, 500)}
                        </div>
                    `;
                    resultsGallery.appendChild(item);
                } else {
                    throw new Error('Respuesta vacia del modelo');
                }

            } catch (err) {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.style.borderColor = 'var(--danger)';
                item.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;color:var(--danger);text-align:center;font-size:.85rem">
                        Error: ${err.message}
                    </div>
                `;
                resultsGallery.appendChild(item);
            }
        }
        spinnerContainer.classList.add('hidden');
        progressText.innerText = 'Procesamiento Finalizado';
    });
});
