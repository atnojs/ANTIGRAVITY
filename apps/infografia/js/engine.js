// ============================================================
// INFÓGRAPHIC ENGINE - Genera infografías 100% en el navegador
// Sin APIs externas. Sin CSP. Sin dependencias.
// ============================================================

const InfographicEngine = {
  /**
   * Convierte el contenido del usuario en una infografía estructurada
   */
  parseContent(title, content, styleId) {
    const style = STYLES.find(s => s.id === styleId);
    const lines = content.split('\n').filter(l => l.trim());
    
    // Crear secciones a partir del contenido
    const sections = [];
    let currentSection = null;

    lines.forEach(line => {
      const trimmed = line.trim().replace(/^[·•\-–—*✓✔☑✅🔹🔸🔷🔶▸►▻➤➢➣]\s*/, '');
      
      // Detectar si es un título de sección
      const isHeader = trimmed.startsWith('#') || 
        (trimmed.length < 30 && trimmed === trimmed.toUpperCase() && trimmed.length > 3) ||
        (trimmed.endsWith(':') && trimmed.length < 40);
      
      if (isHeader) {
        if (currentSection && currentSection.puntos.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          titulo: trimmed.replace(/^#+\s*/, '').substring(0, 40),
          icono: this.pickIcon(trimmed, style.cat),
          dato_destacado: '',
          puntos: []
        };
      } else if (trimmed && currentSection) {
        currentSection.puntos.push(trimmed.substring(0, 120));
      } else if (trimmed && !currentSection) {
        // Primer contenido antes de cualquier sección
        currentSection = {
          titulo: title ? title.substring(0, 30) : 'Información',
          icono: this.pickIcon(title + trimmed, style.cat),
          dato_destacado: '',
          puntos: [trimmed.substring(0, 120)]
        };
      }
    });

    if (currentSection && currentSection.puntos.length > 0) {
      sections.push(currentSection);
    }

    // Si no se generaron secciones, crear una por defecto
    if (sections.length === 0) {
      const points = lines.slice(0, 6).map(l => l.trim().replace(/^[·•\-–—*]\s*/, '').substring(0, 120));
      sections.push({
        titulo: 'Puntos clave',
        icono: '📌',
        dato_destacado: '',
        puntos: points.length > 0 ? points : ['Información proporcionada por el usuario']
      });
    }

    // Asignar datos destacados si hay números/porcentajes
    sections.forEach(sec => {
      const allText = sec.puntos.join(' ');
      const numMatch = allText.match(/(\d+[\.,]?\d*\s*%?)/);
      if (numMatch) sec.dato_destacado = numMatch[1];
      
      // Limitar puntos a 3 por sección
      sec.puntos = sec.puntos.slice(0, 3);
    });

    // Limitar a 4-5 secciones
    const finalSections = sections.slice(0, 5);

    return {
      titulo: title || 'Información',
      subtitulo: '',
      sections: finalSections,
      fuente: ''
    };
  },

  /**
   * Elige un icono apropiado según el texto
   */
  pickIcon(text, cat) {
    const t = text.toLowerCase();
    const icons = {
      infantil: ['🦄','🌈','🎨','⭐','🦋','🐱','🎈','🍭','🧸','🚀'],
      senior: ['🏥','💊','🍎','📅','🏠','📞','⚠️','❤️','🛡️','🕐'],
      corporativo: ['📊','💼','🎯','📈','💡','🏆','🔑','📋','⚡','🔝'],
      artistico: ['🎨','🖌️','✨','🌟','🎭','📐','🖼️','💎','🌈','🔮'],
      tecnico: ['🔬','📐','⚙️','🧬','📡','💻','🔍','🧪','📏','🎛️']
    };
    const pool = icons[cat] || icons.corporativo;
    // Seleccionar por hash simple del texto
    let hash = 0;
    for (let i = 0; i < t.length; i++) hash = ((hash << 5) - hash) + t.charCodeAt(i);
    return pool[Math.abs(hash) % pool.length];
  }
};
