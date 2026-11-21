// Perfiles del menú circular: los usa la tarjeta «Perfil» de Inicio (y con ella el círculo).
export const PROFILES = [
  { id: 'default', label: 'Predeterminado', formats: ['JPG', 'PNG', 'WEBP', 'PDF', 'DOCX', 'AVIF', 'ICO'] },
  { id: 'image', label: 'Imágenes', formats: ['PNG', 'JPG', 'WEBP', 'AVIF', 'ICO', 'PDF'] },
  { id: 'doc', label: 'Documentos', formats: ['PDF', 'DOCX', 'TXT', 'MD', 'HTML', 'EPUB'] },
  { id: 'video', label: 'Vídeo', formats: ['MP4', 'WEBM', 'MKV', 'GIF', 'MP3'] },
];

/** Formatos que esta réplica puede generar de verdad en el navegador. */
export const CONVERTIBLE = new Set(['JPG', 'PNG', 'WEBP', 'PDF', 'ICO', 'AVIF', 'DOCX']);
