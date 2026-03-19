const { useState, useEffect, useCallback } = React;

const API_PROXY_URL = '/apps/banco_de_imagenes/proxy.php';
const STOCK_BASE_URL = '/stock_images';

// DATOS COMPLETOS
const BUSINESS_CATEGORIES = [
    {
        id: 'gastro',
        name: "Gastronomía y Hostelería",
        icon: "fa-utensils",
        color: "text-orange-500",
        options: ['restaurante', 'cafetería', 'bar', 'food truck', 'pastelería', 'heladería', 'vinoteca', 'catering', 'hotel', 'hostal', 'bed and breakfast', 'resort', 'spa hotel']
    },
    {
        id: 'salud',
        name: "Salud y Bienestar",
        icon: "fa-heartbeat",
        color: "text-red-500",
        options: ['consultorio médico', 'clínica dental', 'fisioterapia', 'gimnasio', 'centro de yoga', 'nutricionista', 'psicología', 'spa', 'centro de estética', 'peluquería', 'salón de belleza', 'barbería', 'manicuría', 'quiropráctico', 'veterinaria']
    },
    {
        id: 'pro',
        name: "Servicios Profesionales",
        icon: "fa-briefcase",
        color: "text-blue-600",
        options: ['despacho de abogados', 'asesoría fiscal', 'consultoría empresarial', 'arquitectura', 'despacho de interiorismo', 'agencia de marketing', 'agencia de publicidad', 'agencia de social media', 'consultoría IT', 'seguros', 'agencia de viajes', 'inmobiliaria', 'agente inmobiliario']
    },
    {
        id: 'edu',
        name: "Educación y Formación",
        icon: "fa-graduation-cap",
        color: "text-indigo-600",
        options: ['academia de idiomas', 'escuela infantil', 'colegio privado', 'academia de música', 'clases de baile', 'academia de arte', 'taller de cocina', 'coach personal', 'formación online', 'guardería', 'autoescuela']
    },
    {
        id: 'retail',
        name: "Comercio y Retail",
        icon: "fa-store",
        color: "text-purple-600",
        options: ['tienda de ropa', 'boutique', 'tienda de decoración', 'floristería', 'librería', 'tienda de muebles', 'ferretería', 'tienda de electrónica', 'joyería', 'tienda de regalos', 'tienda óptica', 'tienda de mascotas']
    },
    {
        id: 'tech',
        name: "Tecnología y Startups",
        icon: "fa-microchip",
        color: "text-cyan-600",
        options: ['agencia web', 'desarrollo de apps', 'consultoría ciberseguridad', 'empresa de software', 'startup tecnológica', 'empresa de inteligencia artificial', 'servicios cloud', 'e-commerce', 'dropshipping']
    },
    {
        id: 'deporte',
        name: "Deportes y Ocio",
        icon: "fa-futbol",
        color: "text-green-600",
        options: ['escuela de fútbol', 'club de pádel', 'escalada indoor', 'club de golf', 'alquiler de bicicletas', 'escuela de surf', 'organización de eventos', 'alquiler de locales', 'sala de escape room', 'centro de realidad virtual']
    },
    {
        id: 'hogar',
        name: "Servicios al Hogar",
        icon: "fa-home",
        color: "text-teal-600",
        options: ['limpieza doméstica', 'cuidado de personas mayores', 'niñera', 'organización profesional', 'home staging', 'reformas de cocina', 'decorador de interiores', 'instalación de domótica', 'impermeabilización']
    },
    {
        id: 'constru',
        name: "Industria y Construcción",
        icon: "fa-building",
        color: "text-stone-600",
        options: ['constructora', 'empresa de reformas integrales', 'arquitecto técnico', 'topografía', 'peritaje', 'empresa de limpieza industrial', 'mantenimiento de edificios']
    },
    {
        id: 'eco',
        name: "Sostenibilidad y Eco",
        icon: "fa-leaf",
        color: "text-green-500",
        options: ['tienda zero waste', 'alimentación orgánica', 'instalación de placas solares', 'consultoría de sostenibilidad', 'compostaje comunitario', 'moda sostenible']
    },
    {
        id: 'auto',
        name: "Automoción",
        icon: "fa-car",
        color: "text-gray-700",
        options: ['concesionario de coches', 'taller de chapa y pintura', 'rent a car', 'lavado de coches ecológico', 'renting de vehículos', 'recambios de automoción']
    },
    {
        id: 'otros',
        name: "Otros Servicios",
        icon: "fa-ellipsis",
        color: "text-slate-500",
        options: ['ludoteca', 'parque infantil', 'salón de juegos', 'estudio de tatuajes', 'piercing studio', 'tienda de vapeo', 'alquiler de trajes', 'lavandería', 'tintorería', 'servicio de recogida a domicilio']
    }
];

const IMAGE_TYPE_MAP = [
    { id: 'hero', name: "Imagen Hero Principal", file: 'hero.jpg' },
    { id: 'servicio', name: "Servicio en Acción", file: 'servicio.jpg' },
    { id: 'equipo', name: "Equipo Profesional", file: 'equipo.jpg' },
    { id: 'testimonial', name: "Cliente Satisfecho", file: 'testimonial.jpg' },
    { id: 'blog', name: "Artículo de Blog", file: 'blog.jpg' },
    { id: 'cta', name: "Banner CTA", file: 'cta.jpg' },
    { id: 'producto', name: "Detalle Producto", file: 'producto.jpg' },
    { id: 'mision', name: "Imagen de Misión", file: 'mision.jpg' },
    { id: 'hero2', name: "Segunda Hero", file: 'hero2.jpg' },
    { id: 'servicio2', name: "Segundo Servicio", file: 'servicio2.jpg' },
    { id: 'oficina', name: "Ambiente Oficina", file: 'oficina.jpg' },
    { id: 'interaccion', name: "Cliente Interactuando", file: 'interaccion.jpg' },
    { id: 'abstracta', name: "Imagen Abstracta", file: 'abstracta.jpg' },
    { id: 'promo', name: "Banner Promocional", file: 'promo.jpg' },
    { id: 'nosotros', name: "Sobre Nosotros", file: 'nosotros.jpg' },
    { id: 'contacto', name: "Contacto/Ubicación", file: 'contacto.jpg' }
];

// INDEXEDDB MANAGER - Solución definitiva para almacenar imágenes
const HistoryDB = {
    DB_NAME: 'AIImageHistoryDB',
    STORE_NAME: 'images',
    VERSION: 1,
    MAX_ITEMS: 25,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('savedAt', 'savedAt', { unique: false });
                }
            };
        });
    },

    async getAll() {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    // Ordenar por fecha descendente
                    const items = request.result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
                    resolve(items);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error('DB Error:', err);
            return [];
        }
    },

    async add(item) {
        try {
            // Verificar límite primero
            const existing = await this.getAll();
            if (existing.find(e => e.id === item.id)) {
                return existing; // Ya existe
            }

            const db = await this.init();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);

                // Si hay más de MAX_ITEMS, eliminar el más antiguo
                if (existing.length >= this.MAX_ITEMS) {
                    const oldest = existing[existing.length - 1];
                    store.delete(oldest.id);
                }

                const request = store.put(item);

                request.onsuccess = async () => {
                    const all = await this.getAll();
                    resolve(all);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error('Error adding to DB:', err);
            throw err;
        }
    },

    async remove(id) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = async () => {
                    const all = await this.getAll();
                    resolve(all);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error('Error removing:', err);
            return [];
        }
    },

    async clear() {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.clear();

                request.onsuccess = () => resolve([]);
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            return [];
        }
    }
};

// SPINNER COMPONENT
const ThinkingOverlay = ({ text = "IA Pensando..." }) => (
    <div className="loading-overlay rounded-lg">
        <div className="spinner-triple">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
        </div>
        <p className="loading-text">{text}</p>
    </div>
);

// COMPONENTES

const Toast = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-xl z-[200] text-sm font-semibold glass-panel border-0">
            {message}
        </div>
    );
};

const BusinessAccordion = ({ value, onChange, onSelectCategory, disabled }) => {
    const [openCategory, setOpenCategory] = useState(null);

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                {BUSINESS_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="rounded-lg overflow-hidden glass-panel border border-white/10">
                        <button
                            onClick={() => setOpenCategory(openCategory === cat.id ? null : cat.id)}
                            disabled={disabled}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <i className={`fa-solid ${cat.icon} ${cat.color} text-sm shrink-0`}></i>
                                <span className="font-semibold text-[11px] leading-tight text-left truncate">{cat.name}</span>
                            </div>
                            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform shrink-0 ml-1 ${openCategory === cat.id ? 'rotate-180' : ''}`}></i>
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ${openCategory === cat.id ? 'max-h-64' : 'max-h-0'}`}>
                            <div className="p-1 space-y-0.5 bg-black/20 accordion-options custom-scrollbar">
                                {cat.options.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            onChange(opt);
                                            onSelectCategory({
                                                id: cat.id,
                                                name: cat.name,
                                                icon: cat.icon,
                                                color: cat.color
                                            });
                                        }}
                                        disabled={disabled}
                                        className={`w-full text-left px-3 py-2 text-xs rounded transition-all flex items-center justify-between ${value === opt
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                                            : 'hover:bg-white/10 text-slate-200'
                                            }`}
                                    >
                                        <span className="capitalize">{opt}</span>
                                        {value === opt && <i className="fa-solid fa-check text-xs"></i>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ImageTypeSelector = ({ isOpen, onClose, selectedTypes, onToggleType, generatedTypes, businessType, businessCategory }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-white/10">
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white">Seleccionar Tipos de Imagen</h3>
                        <p className="text-xs text-slate-300 mt-1">
                            Para: <span className="font-semibold text-blue-600 capitalize">{businessType}</span>
                            {businessCategory && <span className="text-slate-300"> ({businessCategory.name})</span>}
                        </p>
                    </div>
                    <button onClick={() => onClose(false)} className="p-2 hover:bg-white/10 rounded-full">
                        <i className="fa-solid fa-xmark text-lg text-slate-400"></i>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {IMAGE_TYPE_MAP.map((type) => {
                            const isSelected = selectedTypes.includes(type.id);
                            const isGenerated = generatedTypes.includes(type.id);

                            return (
                                <div
                                    key={type.id}
                                    onClick={() => !isGenerated && onToggleType(type.id)}
                                    className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-cyan-500/10' : 'border-white/20 hover:border-cyan-300/50 bg-white/5'
                                        } ${isGenerated ? 'opacity-50 grayscale' : ''}`}
                                >
                                    <div className="aspect-video relative bg-slate-200">
                                        <img
                                            src={`${STOCK_BASE_URL}/${type.file}`}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        {isGenerated && (
                                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">Generada</span>
                                            </div>
                                        )}
                                        {isSelected && !isGenerated && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg">
                                                <i className="fa-solid fa-check text-xs"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-black/20">
                                        <h4 className="font-semibold text-sm text-white">{type.name}</h4>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20 rounded-b-2xl flex justify-between items-center">
                    <span className="text-sm text-slate-300">
                        <span className="font-semibold text-cyan-400">{selectedTypes.length}</span> seleccionadas
                        {generatedTypes.length > 0 && <span className="ml-2 text-slate-400">({generatedTypes.length} ya generadas)</span>}
                    </span>
                    <div className="space-x-3">
                        <button onClick={() => onClose(false)} className="px-4 py-2 text-slate-300 hover:bg-white/10 rounded-lg text-sm font-medium glass-button">
                            Cancelar
                        </button>
                        <button onClick={() => onClose(true)} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-cyan-400 hover:to-blue-400 shadow-md glass-button">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Lightbox = ({ image, onClose }) => {
    if (!image) return null;

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center cursor-zoom-out" onClick={onClose}>
            <button className="absolute top-4 right-4 text-white text-3xl p-2 hover:text-slate-300" onClick={onClose}>
                <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <img src={image.src} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={onClose} />
                <div className="mt-4 text-center text-white glass-panel p-4 rounded-xl bg-black/50 border-white/10">
                    <p className="font-semibold text-lg">{image.category}</p>
                    <p className="text-sm opacity-80 capitalize">{image.business}</p>
                    {image.parentCategory && <p className="text-xs opacity-60 mt-1">{image.parentCategory}</p>}
                </div>
            </div>
        </div>
    );
};

// APP PRINCIPAL
const App = () => {
    const [business, setBusiness] = useState('');
    const [businessCategory, setBusinessCategory] = useState(null);
    const [desc, setDesc] = useState('');
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [generatedTypes, setGeneratedTypes] = useState([]);
    const [images, setImages] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState([]);
    const [progress, setProgress] = useState(0);
    const [showSelector, setShowSelector] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [history, setHistory] = useState([]);
    const [toast, setToast] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Cargar historial al inicio usando IndexedDB
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const items = await HistoryDB.getAll();
                console.log('History loaded from IndexedDB:', items.length, 'items');
                setHistory(items);
            } catch (err) {
                console.error('Failed to load history:', err);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        loadHistory();
    }, []);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2000);
    };

    const handleBusinessChange = (newBusiness) => {
        if (newBusiness !== business) {
            setBusiness(newBusiness);
            setImages([]);
            setGeneratedTypes([]);
            setSelectedTypes([]);
            setSuggestedPrompts([]);
        }
    };

    const toggleType = (typeId) => {
        setSelectedTypes(prev =>
            prev.includes(typeId)
                ? prev.filter(id => id !== typeId)
                : [...prev, typeId]
        );
    };

    const handleImprovePrompt = async () => {
        if (!business) {
            showToast('Selecciona un negocio primero');
            return;
        }

        setIsImproving(true);
        setSuggestedPrompts([]);

        try {
            const aiSystemPrompt = `
                Actúa como experto en fotografía y dirección de arte. 
                Genera 4 opciones de descripciones visuales detalladas y diferentes para un negocio de: "${business}". 
                Categoría: "${businessCategory?.name || 'General'}".
                Contexto usuario: "${desc}".
                
                Requisitos:
                1. Estilo FOTORREALISTA y profesional.
                2. Descripciones breves pero evocadoras (iluminación, ambiente, composición).
                3. Devuelve SOLO las 4 opciones separadas por una barra vertical "|".
                4. No incluyas numeración ni texto extra.
                Ejemplo: "Oficina moderna con luz natural | Primer plano de producto | Exterior con cielo azul | Interior minimalista"
            `;

            const response = await fetch(API_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiSystemPrompt })
            });

            if (!response.ok) throw new Error('Error en API');

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Procesar respuesta para obtener array
            const options = rawText.split('|').map(s => s.trim()).filter(s => s.length > 5).slice(0, 4);

            if (options.length > 0) {
                setSuggestedPrompts(options);
                showToast('✨ 4 Ideas generadas');
            } else {
                throw new Error('No se generaron opciones');
            }

        } catch (error) {
            console.error(error);
            showToast('Error al mejorar prompt');
        } finally {
            setIsImproving(false);
        }
    };

    // GUARDAR USANDO INDEXEDDB
    const saveToHistory = useCallback(async (img) => {
        console.log('Saving to history via IndexedDB:', img.id);

        if (!img || !img.src) {
            showToast('Error: Imagen inválida');
            return;
        }

        const itemToSave = {
            id: img.id,
            src: img.src,
            category: img.category || 'Sin categoría',
            business: img.business || business || 'Sin negocio',
            parentCategory: img.parentCategory || (businessCategory ? businessCategory.name : ''),
            typeId: img.typeId || '',
            savedAt: new Date().toISOString()
        };

        try {
            const newHistory = await HistoryDB.add(itemToSave);
            setHistory(newHistory);
            showToast('✓ Guardado en historial');
        } catch (err) {
            console.error('Error saving:', err);
            showToast('× Error al guardar');
        }
    }, [business, businessCategory]);

    const deleteImage = (id) => {
        setImages(prev => {
            const img = prev.find(i => i.id === id);
            const newImages = prev.filter(i => i.id !== id);
            if (img && !newImages.some(i => i.typeId === img.typeId)) {
                setGeneratedTypes(prevTypes => prevTypes.filter(t => t !== img.typeId));
            }
            return newImages;
        });
    };

    const downloadSingle = (img) => {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `${img.business}_${img.category.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✓ Descargado');
    };

    const applySuggestion = (suggestion) => {
        setDesc(suggestion);
        // NO borramos suggestedPrompts para que el usuario pueda probar otras
    };

    const generateImages = async () => {
        if (selectedTypes.length === 0) return;

        setIsGenerating(true);
        setProgress(0);

        // Identificar qué falta generar
        const toGenerate = selectedTypes.filter(id => !generatedTypes.includes(id));

        // Crear placeholders
        const newImages = toGenerate.map((typeId, i) => {
            const typeInfo = IMAGE_TYPE_MAP.find(t => t.id === typeId);
            return {
                id: Date.now() + i,
                typeId: typeId,
                category: typeInfo.name,
                src: '', // Vacío inicialmente
                prompt: `Fotografía profesional fotorrealista de alta calidad. Tema: ${typeInfo.name} para un negocio de ${business}. ${desc}. Iluminación cinematográfica, 8k, detallado. Sin texto, sin marcas de agua.`,
                status: 'loading',
                selected: false,
                business: business,
                parentCategory: businessCategory ? businessCategory.name : ''
            };
        });

        setImages(prev => [...newImages, ...prev]);
        setGeneratedTypes(prev => [...prev, ...toGenerate]);
        setShowSelector(false); // Cerrar selector si estaba abierto

        // Procesar una por una
        for (let i = 0; i < newImages.length; i++) {
            const img = newImages[i];
            setProgress(i + 1);

            try {
                const response = await fetch(API_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: img.prompt })
                });

                if (!response.ok) throw new Error('API Error');

                const data = await response.json();

                // Extraer imagen base64 (asumiendo que Gemini devuelve base64 en alguna parte, 
                // o si la API devuelve URL, adaptar aquí. El proxy actual devuelve JSON estándar de Gemini)
                // NOTA: Gemini Pro Vision/Image devuelve structure compleja.
                // Asumimos que el proxy maneja la respuesta binaria o base64 correctamente.
                // Si el proxy devuelve text, es un error.
                // El proxy actual parece devolver el JSON crudo de Gemini.

                // ADAPTACIÓN PARA GEMINI IMAGE (B64):
                // La respuesta de Gemini para imagen suele venir en inlineData o similar.
                // Ajustar según respuesta real. Si falla, usar placeholder para demo.

                let imageUrl = '';
                // Intento de parseo de respuesta estándar Gemini Image
                if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                    imageUrl = `data:image/png;base64,${data.candidates[0].content.parts[0].inlineData.data}`;
                } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    // Si devuelve texto, es que falló la generación de imagen
                    throw new Error('Modelo devolvió texto en vez de imagen');
                } else {
                    // Fallback simulado si la API no es la de imagen real (para evitar crash en dev)
                    throw new Error('Formato de respuesta no reconocido');
                }

                setImages(prev => prev.map(item =>
                    item.id === img.id ? { ...item, src: imageUrl, status: 'done', selected: true } : item
                ));

            } catch (error) {
                console.error('Generation error:', error);
                setImages(prev => prev.map(item =>
                    item.id === img.id ? { ...item, status: 'error' } : item
                ));
            }
        }

        setIsGenerating(false);
        showToast('Generación completada');
    };

    const regenerateImage = async (img) => {
        // Lógica similar a generateImages pero para uno solo
        setImages(prev => prev.map(item => item.id === img.id ? { ...item, status: 'loading' } : item));

        try {
            const response = await fetch(API_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: img.prompt })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            let imageUrl = '';
            if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                imageUrl = `data:image/png;base64,${data.candidates[0].content.parts[0].inlineData.data}`;
            } else {
                throw new Error('No image data');
            }

            setImages(prev => prev.map(item =>
                item.id === img.id ? { ...item, src: imageUrl, status: 'done' } : item
            ));
        } catch (error) {
            setImages(prev => prev.map(item =>
                item.id === img.id ? { ...item, status: 'error' } : item
            ));
        }
    };

    const downloadZip = async (imagesToZip) => {
        if (!imagesToZip || imagesToZip.length === 0) return;

        showToast('Preparando ZIP...');

        try {
            const zip = new window.JSZip();

            let count = 0;
            imagesToZip.forEach((img, idx) => {
                if (img.src && img.src.startsWith('data:image')) {
                    const base64Data = img.src.split(',')[1];
                    if (base64Data) {
                        const filename = `${business}_${img.category}_${idx + 1}.png`.replace(/\s+/g, '_').toLowerCase();
                        zip.file(filename, base64Data, { base64: true });
                        count++;
                    }
                }
            });

            if (count === 0) {
                showToast('Error: No hay imágenes válidas para ZIP');
                return;
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${business}_pack_imagenes.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('✓ ZIP descargado');
        } catch (err) {
            console.error('ZIP Error:', err);
            showToast('Error al crear ZIP');
        }
    };

    const removeFromHistory = async (id) => {
        try {
            await HistoryDB.remove(id);
            const items = await HistoryDB.getAll();
            setHistory(items.reverse());
        } catch (e) {
            console.error(e);
        }
    };

    const clearHistory = async () => {
        if (!confirm('¿Borrar todo el historial?')) return;
        await HistoryDB.clear();
        setHistory([]);
        showToast('Historial vaciado');
    };

    // Filtrado de imágenes completadas
    const completedImages = images.filter(i => i.status === 'done');
    const selectedImages = images.filter(i => i.selected);

    return (
        <div className="min-h-screen pb-10">
            {/* Header */}
            <header className="glass-panel sticky top-0 z-30 px-6 py-3 border-b border-white/10 shadow-sm backdrop-blur-md">
                <div className="max-w-[1400px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <i className="fa-solid fa-images text-white text-xl"></i>
                        </div>
                        <h1 className="text-xl font-bold gradient-text">Banco de Imágenes AI Pro</h1>
                    </div>
                    <div className="text-sm font-medium text-cyan-300 bg-white/5 px-3 py-1 rounded-full border border-cyan-400/30">
                        Historial: {isLoadingHistory ? '...' : `${history.length}/25`}
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 py-8">
                <div className="layout-three-col">

                    {/* COLUMNA IZQUIERDA: Config */}
                    <div className="space-y-4">
                        <div className="glass-panel rounded-2xl p-5 relative">
                            {isImproving && <ThinkingOverlay text="Ideando 4 conceptos únicos..." />}

                            <h2 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-sliders"></i> Configuración
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-2 text-slate-300">Tipo de Negocio</label>
                                    <BusinessAccordion
                                        value={business}
                                        onChange={handleBusinessChange}
                                        onSelectCategory={setBusinessCategory}
                                        disabled={isGenerating || isImproving}
                                    />
                                </div>

                                {business && (
                                    <div className="p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-lg text-xs flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-check"></i>
                                        </div>
                                        <div>
                                            <span className="font-bold text-white capitalize block">{business}</span>
                                            {businessCategory && (
                                                <span className="text-cyan-300 font-medium">({businessCategory.name})</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold mb-2 text-slate-300">Descripción / Estilo</label>
                                    <div className="relative">
                                        <textarea
                                            value={desc}
                                            onChange={(e) => setDesc(e.target.value)}
                                            placeholder="Detalla el estilo, iluminación, colores..."
                                            rows="3"
                                            className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 bg-white/5 resize-none pr-10 outline-none transition-all focus:bg-white/10 text-white placeholder-slate-400"
                                            disabled={isGenerating || isImproving}
                                        />
                                        {/* Prompt Magic Button */}
                                        <button
                                            onClick={handleImprovePrompt}
                                            disabled={isGenerating || isImproving || !business}
                                            className="absolute bottom-2 right-2 w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-lg shadow-md flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 group z-10"
                                            title="Generar 4 ideas con IA"
                                        >
                                            <i className="fa-solid fa-wand-magic-sparkles text-sm group-hover:rotate-12 transition-transform"></i>
                                        </button>
                                    </div>

                                    {/* SUGERENCIAS DE PROMPTS (BOTONES ESTILO GUÍA) */}
                                    {suggestedPrompts.length > 0 && (
                                        <div className="mt-4 animate-fadeIn">
                                            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <i className="fa-solid fa-lightbulb"></i> Ideas IA:
                                            </p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {suggestedPrompts.map((suggestion, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => applySuggestion(suggestion)}
                                                        className="prompt-btn w-full text-left group"
                                                    >
                                                        <span className="font-semibold text-cyan-300 block mb-1 text-xs">Opción {idx + 1}</span>
                                                        <span className="opacity-90 group-hover:opacity-100">{suggestion}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {business && (
                                    <div className="pt-2 space-y-3">
                                        <button
                                            onClick={() => setShowSelector(true)}
                                            disabled={isGenerating || isImproving}
                                            className="w-full py-3 glass-button rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-layer-group"></i>
                                            {selectedTypes.length > 0 ? `Modificar Selección (${selectedTypes.length})` : 'Seleccionar Imágenes'}
                                        </button>

                                        <button
                                            onClick={generateImages}
                                            disabled={isGenerating || isImproving || selectedTypes.length === 0}
                                            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${selectedTypes.length === 0
                                                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5'
                                                }`}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                                    Generando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa-solid fa-bolt"></i>
                                                    Generar {selectedTypes.length > 0 ? `${selectedTypes.length} Imágenes` : 'Pack'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA CENTRO: Generadas */}
                    <div className="glass-panel rounded-2xl min-h-[600px] flex flex-col relative overflow-hidden">
                        {isGenerating && <ThinkingOverlay text={`Creando ${selectedTypes.length} obras maestras...`} />}

                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/10 backdrop-blur-sm">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-palette text-blue-500"></i>
                                Galería
                            </h3>
                            {completedImages.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setImages(prev => prev.map(i => ({ ...i, selected: !i.selected })))}
                                        className="text-xs px-3 py-1.5 glass-button rounded-lg text-slate-200 font-medium hover:bg-white/5"
                                    >
                                        {selectedImages.length === completedImages.length ? 'Nada' : 'Todo'}
                                    </button>
                                    {selectedImages.length > 0 && (
                                        <button
                                            onClick={() => downloadZip(selectedImages)}
                                            className="text-[10px] px-2.5 py-1 rounded-full text-white font-semibold glass-button border border-white/10 flex items-center gap-1 hover:bg-white/5"
                                        >
                                            <i className="fa-solid fa-file-zipper"></i> ZIP
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex-1 bg-black/5">
                            {images.length === 0 ? (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-300">
                                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4 shadow-inner">
                                        <i className="fa-solid fa-image text-4xl text-slate-400"></i>
                                    </div>
                                    <p className="text-sm font-medium">Tu galería está vacía</p>
                                    <p className="text-xs mt-1 opacity-70">Define tu negocio y genera contenido</p>
                                </div>
                            ) : (
                                <div className="generated-grid-3">
                                    {images.map((img) => (
                                        <div key={img.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100">
                                            {img.status === 'done' ? (
                                                <>
                                                    <div
                                                        className="aspect-square relative bg-slate-100 cursor-zoom-in overflow-hidden"
                                                        onClick={() => setLightboxImage(img)}
                                                    >
                                                        <img src={img.src} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    </div>

                                                    {/* BOTONES ACCIÓN (NUEVO ESTILO CÍRCULO) */}
                                                    <div className="image-actions">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); regenerateImage(img); }}
                                                            className="action-btn-circle"
                                                            title="Regenerar"
                                                        >
                                                            <i className="fa-solid fa-arrows-rotate text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); downloadSingle(img); }}
                                                            className="action-btn-circle"
                                                            title="Descargar"
                                                        >
                                                            <i className="fa-solid fa-download text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); saveToHistory(img); }}
                                                            className="action-btn-circle"
                                                            title="Guardar"
                                                        >
                                                            <i className="fa-regular fa-bookmark text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                                                            className="action-btn-circle hover:bg-red-500/80 hover:border-red-500"
                                                            title="Eliminar"
                                                        >
                                                            <i className="fa-solid fa-trash text-xs"></i>
                                                        </button>
                                                    </div>

                                                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        <p className="text-[10px] font-bold truncate text-shadow">{img.category}</p>
                                                    </div>

                                                    <input
                                                        type="checkbox"
                                                        checked={img.selected || false}
                                                        onChange={() => setImages(prev => prev.map(i => i.id === img.id ? { ...i, selected: !i.selected } : i))}
                                                        className="absolute bottom-2 right-2 w-4 h-4 text-blue-600 rounded border-white shadow-sm cursor-pointer z-20"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </>
                                            ) : img.status === 'error' ? (
                                                <div className="aspect-square flex flex-col items-center justify-center bg-red-50 text-red-500 text-[10px] p-2">
                                                    <i className="fa-solid fa-triangle-exclamation text-xl mb-1"></i>
                                                    <p>Error</p>
                                                    <button onClick={() => regenerateImage(img)} className="mt-2 px-3 py-1 bg-white border border-red-200 rounded-full text-[9px] hover:bg-red-50">Retry</button>
                                                </div>
                                            ) : (
                                                <div className="aspect-square flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full -translate-x-full animate-shimmer"></div>
                                                    <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                                                    <p className="text-[9px] text-slate-400 font-medium">Creando...</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Historial */}
                    <div>
                        <div className="glass-panel rounded-xl sticky top-24 max-h-[85vh] flex flex-col">
                            <div className="p-3 border-b border-white/10 bg-black/10 rounded-t-xl flex justify-between items-center backdrop-blur-sm">
                                <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                                    <i className="fa-solid fa-clock-rotate-left text-blue-500"></i>
                                    Historial
                                </h3>
                                {history.length > 0 && (
                                    <button
                                        onClick={clearHistory}
                                        className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-1 hover:bg-red-500/20 rounded transition-colors"
                                    >
                                        <i className="fa-solid fa-trash-can mr-1"></i>
                                        Vaciar
                                    </button>
                                )}
                            </div>

                            <div className="p-3 overflow-y-auto custom-scrollbar flex-1 min-h-[200px]">
                                {history.length === 0 ? (
                                    <div className="text-center text-slate-400 py-10 text-xs flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                            <i className="fa-regular fa-folder-open text-xl opacity-60"></i>
                                        </div>
                                        <p>Tu historial está vacío</p>
                                    </div>
                                ) : (
                                    <div className="history-grid-2">
                                        {history.map((item) => (
                                            <div key={item.id} className="group relative aspect-square bg-black/20 rounded-lg overflow-hidden border border-white/20 shadow-sm hover:shadow-md hover:border-cyan-400/50 transition-all">
                                                <img
                                                    src={item.src}
                                                    alt=""
                                                    className="w-full h-full object-cover cursor-zoom-in"
                                                    onClick={() => setLightboxImage(item)}
                                                />

                                                {/* Botones Flotantes (Sin Velo Negro) */}
                                                <div className="absolute top-1 right-1 flex gap-1 transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const link = document.createElement('a');
                                                            link.href = item.src;
                                                            link.download = `historial_${item.category}.png`;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                        className="w-6 h-6 bg-black/60 backdrop-blur-sm text-white rounded-full shadow flex items-center justify-center text-[10px] hover:bg-black/80 hover:text-cyan-300"
                                                        title="Descargar"
                                                    >
                                                        <i className="fa-solid fa-download"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromHistory(item.id);
                                                        }}
                                                        className="w-6 h-6 bg-black/60 backdrop-blur-sm text-white rounded-full shadow flex items-center justify-center text-[10px] hover:bg-red-500/80"
                                                        title="Borrar"
                                                    >
                                                        <i className="fa-solid fa-times"></i>
                                                    </button>
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                                                    <p className="text-[9px] text-white font-medium text-center truncate">
                                                        {item.category}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {history.length > 0 && (
                                <div className="p-3 border-t border-white/30 bg-white/20 rounded-b-xl">
                                    <button
                                        onClick={() => downloadZip(history)}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <i className="fa-solid fa-file-zipper"></i>
                                        Descargar Todo
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            <ImageTypeSelector
                isOpen={showSelector}
                onClose={(confirmed) => {
                    if (!confirmed) setSelectedTypes([]);
                    setShowSelector(false);
                }}
                selectedTypes={selectedTypes}
                onToggleType={toggleType}
                generatedTypes={generatedTypes}
                businessType={business}
                businessCategory={businessCategory}
            />

            {lightboxImage && (
                <Lightbox
                    image={lightboxImage}
                    onClose={() => setLightboxImage(null)}
                />
            )}

            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);