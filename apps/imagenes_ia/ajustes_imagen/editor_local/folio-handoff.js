/* Importa automáticamente una imagen creada en Folio al editor local. */
(function importFolioImage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('handoff') !== 'folio') return;

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        const input = document.querySelector('input[type="file"][accept*="image"]');
        if (!input) {
            if (attempts >= 80) window.clearInterval(timer);
            return;
        }

        try {
            const raw = localStorage.getItem('antigravity-image-handoff');
            if (!raw) throw new Error('No hay ninguna imagen pendiente de Folio.');
            const handoff = JSON.parse(raw);
            if (!handoff?.dataUrl?.startsWith('data:image/')) throw new Error('La imagen recibida no es válida.');

            const parts = handoff.dataUrl.split(',');
            const mime = parts[0].match(/data:([^;]+)/)?.[1] || 'image/png';
            const binary = atob(parts[1]);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            const safeName = String(handoff.title || 'infografia-folio').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-|-$/g, '');
            const file = new File([bytes], `${safeName || 'infografia-folio'}.png`, { type: mime });
            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            localStorage.removeItem('antigravity-image-handoff');
            window.clearInterval(timer);
        } catch (error) {
            console.warn('[Editor] No se pudo importar la imagen de Folio:', error.message);
            window.clearInterval(timer);
        }
    }, 250);
})();
