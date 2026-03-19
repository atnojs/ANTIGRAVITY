-- Visual Identity Architect - Database Schema

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) DEFAULT 'Nueva Conversación',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversacion_id INT NOT NULL,
    rol ENUM('user', 'assistant') NOT NULL,
    contenido TEXT NOT NULL,
    imagen_url VARCHAR(500) NULL,
    metadata JSON NULL, -- Para guardar datos técnicos (ratio, estilo, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (conversacion_id),
    CONSTRAINT fk_conversacion FOREIGN KEY (conversacion_id) 
        REFERENCES conversaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de fotos de referencia del Sujeto (Antonio)
CREATE TABLE IF NOT EXISTS referencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    ruta VARCHAR(500) NOT NULL,
    descripcion TEXT NULL,
    vector_id VARCHAR(100) NULL, -- Reservado por si usamos embeddings en el futuro
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
