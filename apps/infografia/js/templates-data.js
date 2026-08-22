/* 100 plantillas originales de stock: 10 familias visuales x 10 estructuras. */
const TEMPLATE_FAMILIES = [
  { id:'editorial', name:'Editorial', icon:'E', description:'Revista, reportaje y narrativa visual.', styles:['gran-diario','newsletter','scientific-paper'], colors:['#f4ead7','#20201d','#d35f45'] },
  { id:'illustrated', name:'Ilustrado', icon:'✦', description:'Personajes, metáforas e iconos protagonistas.', styles:['corporate-memphis','cuento-magico','knolling-flat'], colors:['#fff3da','#ed6358','#28a7a1'] },
  { id:'handmade', name:'Hecho a mano', icon:'✎', description:'Doodle, pizarra, papel y trazo humano.', styles:['mono-doodle','chalkboard','handmade-craft'], colors:['#f5eddd','#2f2d2a','#e5a94f'] },
  { id:'bold', name:'Impacto audaz', icon:'!', description:'Contraste, titulares enormes y energía social.', styles:['startup-pitch','bauhaus-grid','comic-bubble'], colors:['#251f45','#ff6b5f','#ffc65a'] },
  { id:'data', name:'Datos & dashboard', icon:'↗', description:'KPIs, gráficas y lectura ejecutiva.', styles:['dashboard-pro','heatmap-data','annual-report'], colors:['#172235','#4389f5','#43d49e'] },
  { id:'minimal', name:'Minimalista', icon:'—', description:'Mucho aire, foco y máxima legibilidad.', styles:['senior-clear','medico-claro','boardroom'], colors:['#f8f7f2','#202a2d','#5a8f7d'] },
  { id:'education', name:'Educativo', icon:'A+', description:'Didáctico, modular y fácil de recordar.', styles:['pizarra-blanca','instructivo','periodic-table'], colors:['#fffdf8','#267aa0','#f0b83f'] },
  { id:'vintage', name:'Retro & archivo', icon:'◷', description:'Historia, academia y memoria gráfica.', styles:['aged-academia','papel-periodico','timeline-history'], colors:['#e8d4ad','#623f2d','#b64639'] },
  { id:'tech', name:'Tech & futurista', icon:'⌁', description:'Sistemas, ciencia y estética digital.', styles:['blueprint','cyberpunk-neon','isometric-tech'], colors:['#0d1830','#2fe5d0','#ff4ead'] },
  { id:'organic', name:'Orgánico', icon:'◌', description:'Naturaleza, bienestar y formas suaves.', styles:['watercolor-story','morandi-soft','infographic-map'], colors:['#e8eee2','#477a68','#d99770'] }
];

const TEMPLATE_ARCHETYPES = [
  { id:'stat', format:'statistical', label:'Radiografía en datos', hook:'Presenta cifras, indicadores y una conclusión clara.', sections:['Dato clave','Tendencia','Contexto','Conclusión'] },
  { id:'compare', format:'comparison', label:'Dos caras', hook:'Compara dos opciones de un vistazo.', sections:['Opción A','Opción B','Coincidencias','Decisión'] },
  { id:'process', format:'process', label:'Paso a paso', hook:'Explica una secuencia accionable.', sections:['Empieza','Construye','Comprueba','Completa'] },
  { id:'timeline', format:'timeline', label:'Historia visual', hook:'Ordena hitos y cambios en el tiempo.', sections:['Origen','Primer cambio','Evolución','Actualidad'] },
  { id:'map', format:'geographic', label:'Mapa de contexto', hook:'Relaciona ideas, lugares o áreas.', sections:['Norte','Este','Sur','Oeste'] },
  { id:'guide', format:'informational', label:'Guía esencial', hook:'Resume un tema complejo en bloques.', sections:['Qué es','Por qué importa','Cómo funciona','Qué recordar'] },
  { id:'mindmap', format:'geographic', label:'Mapa mental', hook:'Conecta causas, efectos y soluciones.', sections:['Problema','Causas','Efectos','Soluciones'] },
  { id:'anatomy', format:'informational', label:'Anatomía visual', hook:'Descompone un sistema en sus partes.', sections:['Núcleo','Pieza 1','Pieza 2','Resultado'] },
  { id:'list', format:'informational', label:'Lista magnética', hook:'Convierte consejos en una pieza memorable.', sections:['Idea 1','Idea 2','Idea 3','Idea 4'] },
  { id:'journey', format:'process', label:'Ruta de proyecto', hook:'Visualiza una experiencia de principio a fin.', sections:['Descubre','Decide','Actúa','Mejora'] }
];

const TEMPLATE_TOPICS = [
  ['El futuro del agua','Sostenibilidad'],['Aprender mejor','Educación'],['Producto ideal','Negocio'],['Hábitos de bienestar','Salud'],['Historia de una idea','Cultura'],
  ['Tecnología cotidiana','Tecnología'],['Decisiones inteligentes','Productividad'],['Cambio climático','Medioambiente'],['Comunicación clara','Marketing'],['Proyecto creativo','Creatividad']
];

const STOCK_TEMPLATES = TEMPLATE_FAMILIES.flatMap((family, familyIndex) =>
  TEMPLATE_ARCHETYPES.map((archetype, index) => {
    const topic = TEMPLATE_TOPICS[(index + familyIndex) % TEMPLATE_TOPICS.length];
    const styleId = family.styles[index % family.styles.length];
    return {
      id: `${family.id}-${String(index + 1).padStart(2,'0')}`,
      family: family.id,
      familyName: family.name,
      name: `${archetype.label} · ${topic[0]}`,
      category: topic[1],
      format: archetype.format,
      styleId,
      variant: index,
      hook: archetype.hook,
      topic: `Crea una infografía sobre ${topic[0].toLowerCase()}. Organiza únicamente la información que aporte el usuario con la estructura ${archetype.label.toLowerCase()}: ${archetype.sections.join(', ')}.`,
      data: {
        titulo: topic[0],
        subtitulo: archetype.hook,
        fuente: 'Añade aquí la fuente o referencia',
        sections: archetype.sections.map((title, sectionIndex) => ({
          titulo: title,
          icono: ['✦','↗','◷','→'][sectionIndex],
          dato_destacado: sectionIndex === 0 && archetype.format === 'statistical' ? 'Dato' : '',
          puntos: ['Texto completamente editable para mostrar la jerarquía de la composición.']
        }))
      }
    };
  })
);

