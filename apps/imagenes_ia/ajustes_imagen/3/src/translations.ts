import { Language, Translations, MenuItem, SportEvent, LiveMusicEvent, Review } from './types';

export const TRANSLATIONS: Record<'es' | 'en' | 'de', Translations> = {
  es: {
    nav: {
      about: 'Establecimiento',
      sports: 'Deportes',
      music: 'Música en Vivo',
      menu: 'Carta y Bebidas',
      gallery: 'Galería',
      schedule: 'Horarios',
      contact: 'Reservas',
      reviews: 'Opiniones'
    },
    hero: {
      subtitle: 'La terraza de moda en el complejo',
      title: 'Tu punto de encuentro bajo el sol y las estrellas',
      desc: 'Disfruta de una experiencia gastronómica inigualable. El mejor café por la mañana, retransmisiones deportivas memorables en pantalla gigante y música en vivo los fines de semana.',
      ctaReserve: 'Reservar Mesa',
      ctaMenu: 'Ver Carta'
    },
    about: {
      title: 'Bienvenidos a CON~SENTID@S',
      subtitle: 'Un espacio con tres almas',
      desc1: 'Ubicados en el corazón del complejo residencial, CON~SENTID@S nace con la ilusión de ser tu segundo hogar. Un lugar donde residentes de todo el mundo, familias y turistas comparten momentos únicos en un ambiente sofisticado, cercano y multilingüe.',
      desc2: 'Desde un desayuno luminoso con café de especialidad hasta un cóctel premium bajo las estrellas, nuestra cocina de fusión y nuestra atmósfera acogedora están diseñadas para deleitar tus sentidos en cualquier momento del día.',
      terraceTitle: 'La Terraza Panorámica',
      terraceDesc: 'Nuestra gioia exterior. Un espacio amplio y ajardinado con cómodos sofás lounge, ideal para disfrutar de la brisa mediterránea, desayunar bajo el sol matutino o refrescarse con un cóctel al atardecer.',
      ambience1Title: 'Lounge & Gastro Inside',
      ambience1Desc: 'Primer ambiente interior: una zona cálida decorada con maderas naturales, iluminación suave y sofás elegantes. Perfecta para cenas íntimas, charlas relajadas o trabajar mientras disfrutas de un té.',
      ambience2Title: 'Bar & Social Arena',
      ambience2Desc: 'Segundo ambiente interior: un espacio dinámico e interactivo de diseño contemporáneo, donde la barra de bar es la gran protagonista y conecta con nuestro espacio social principal.'
    },
    sports: {
      title: 'Pasión por el Deporte',
      subtitle: 'Eventos en Pantalla Gigante',
      desc: 'No te pierdas ni un solo segundo de tus competiciones favoritas. Contamos con una zona dedicada equipada con una televisión ultraluminosa de gran formato y sonido envolvente. Transmitimos los mejores partidos de fútbol, tenis, baloncesto, Fórmula 1 y más.',
      upcoming: 'Próximas Retransmisiones',
      liveIndicator: 'EN DIRECTO',
      noEvents: 'No hay eventos programados para hoy. ¡Pregunta a nuestro personal por tu deporte favorito!',
      filterAll: 'Ver todos',
      competition: 'Competición'
    },
    music: {
      title: 'Música en Directo',
      subtitle: 'Vibraciones de Fin de Semana',
      desc: 'Los fines de semana en CON~SENTID@S se llenan de magia. Contamos con actuaciones de artistas locales e internacionales que amenizan la terraza y los interiores con estilos que van desde el jazz y el soul acústico hasta el house chillout más elegante.',
      upcoming: 'Cartelera de Actuaciones',
      hours: 'Horario: Viernes a Domingos desde las 19:30 h',
      bookTable: 'Reservar con antelación'
    },
    menu: {
      title: 'Nuestra Carta',
      subtitle: 'Sabor para cada momento',
      desc: 'Cuidamos cada ingrediente para ofrecerte platos memorables. Desayunos energéticos, raciones para compartir entre amigos, platos principales con sello y cócteles artesanos preparados al momento por nuestros bartenders.',
      breakfast: 'Desayunos',
      coffees: 'Cafetería & Bebidas',
      lunchTapas: 'Almuerzos & Tapas',
      dinner: 'Cenas',
      cocktails: 'Lounge Cócteles',
      popular: 'Favorito',
      allergensNote: '* Si tiene alguna alergia o intolerancia alimentaria, por favor comuníqueselo a nuestro equipo antes de realizar su pedido.'
    },
    gallery: {
      title: 'Galería de Experiencias',
      subtitle: 'Capturas de momentos CON~SENTID@S',
      filterAll: 'Todo',
      filterTerrace: 'La Terraza',
      filterInterior: 'Interiores',
      filterSports: 'Zona Deportiva',
      filterMusic: 'Música en Vivo',
      filterProducts: 'Nuestros Platos'
    },
    schedule: {
      title: 'Nuestros Horarios',
      subtitle: 'Siempre listos para recibirte',
      weekdays: 'Lunes a Jueves',
      weekdaysTime: '08:30 h - 23:30 h',
      weekends: 'Viernes y Sábados',
      weekendsTime: '08:30 h - 01:30 h',
      specialEvents: 'Domingos',
      specialEventsTime: '09:00 h - 00:00 h',
      tagline: 'La cocina permanece abierta hasta 1 hora antes del cierre del local.'
    },
    contact: {
      title: 'Reservas y Contacto',
      subtitle: 'Asegura tu momento especial',
      reserveButton: 'Solicitar Reserva de Mesa',
      sendMessage: 'Enviar Mensaje',
      formName: 'Nombre Completo',
      formEmail: 'Correo Electrónico',
      formPhone: 'Teléfono de Contacto',
      formDate: 'Fecha',
      formTime: 'Hora',
      formGuests: 'Número de Personas',
      formMessage: 'Mensaje o Peticiones Especiales (Zona, Alergias, etc.)',
      formNotes: 'Nota: Su reserva estará sujeta a confirmación vía WhatsApp o Correo electrónico en menos de 15 minutos.',
      formSubmitReserve: 'Confirmar Reserva',
      formSubmitMessage: 'Enviar Mensaje de Contacto',
      contactInfo: 'Información de Contacto',
      phoneLabel: 'Teléfono Directo',
      whatsappLabel: 'WhatsApp Express',
      emailLabel: 'Correo Electrónico',
      addressLabel: 'Dirección física',
      successReserve: '¡Solicitud de reserva recibida correctamente! Te enviaremos un WhatsApp de confirmación en unos minutos.',
      successMessage: '¡Gracias por contactarnos! Hemos recibido tu mensaje y responderemos lo antes posible.',
      mapTitle: 'Ubicación de CON~SENTID@S Café (Complejo Residencial Marina Bay)'
    },
    reviews: {
      title: 'La Opinión de Nuestros Clientes',
      subtitle: 'Momentos inolvidables compartidos',
      addReview: 'Escribir una Reseña',
      formAuthor: 'Tu Nombre',
      formRating: 'Puntuación (1-5 estrellas)',
      formComment: 'Tu Opinión',
      formSubmit: 'Publicar Reseña',
      successReview: '¡Muchísimas gracias por tu reseña! Valoramos enormemente tus amables comentarios.'
    },
    footer: {
      desc: 'El punto de encuentro internacional más acogedor del complejo. Café selecto, gastronomía mediterránea-fusión, eventos deportivos de primer nivel y noches mágicas de música en vivo.',
      rights: '© 2026 CON~SENTID@S Terraza & Lounge. Todos los derechos reservados. Diseñado para residentes y visitantes exigentes.',
      legalTerms: 'Términos y Condiciones',
      privacyPolicy: 'Política de Privacidad y Cookies'
    }
  },
  en: {
    nav: {
      about: 'Establishment',
      sports: 'Sports Zone',
      music: 'Live Music',
      menu: 'Menu & Drinks',
      gallery: 'Gallery',
      schedule: 'Opening Hours',
      contact: 'Reservations',
      reviews: 'Reviews'
    },
    hero: {
      subtitle: 'The trendiest terrace in the resort',
      title: 'Your meeting point under the sun and stars',
      desc: 'Treat yourself to an unparalleled culinary experience. The finest specialty morning coffee, memorable sports broadcasts on a giant screen, and high-vibe live music during weekends.',
      ctaReserve: 'Book a Table',
      ctaMenu: 'View Menu'
    },
    about: {
      title: 'Welcome to CON~SENTID@S',
      subtitle: 'One venue, three experiences',
      desc1: 'Nestled in the heart of the residential resort, CON~SENTID@S was born with the dream of being your home away from home. A place where residents from all over the globe, families, and tourists share unique moments in a sophisticated, welcoming, and multilingual atmosphere.',
      desc2: 'From a sun-drenched breakfast paired with boutique specialty coffee, to a premium cocktail crafted under the night sky, our fusion cuisine and snug atmosphere are designed to captivate your senses any time of the day.',
      terraceTitle: 'The Panoramic Terrace',
      terraceDesc: 'Our outdoor crown jewel. A spacious, garden-lined space adorned with luxurious lounge couches. It is perfect for basking in the soft coastal breeze, enjoying breakfast in the morning sun, or chilling with a refreshing dusk cocktail.',
      ambience1Title: 'Lounge & Gastro Inside',
      ambience1Desc: 'First indoor atmosphere: a warm enclave styled with natural timber elements, soft ambient glow, and chic sofas. Perfect for romantic dinners, laid-back conversations, or catching up on work with a warm herbal tea.',
      ambience2Title: 'Bar & Social Arena',
      ambience2Desc: 'Second indoor atmosphere: a lively and high-energy interactive space highlighting our masterfully crafted central bar connects seamlessly with our primary social gathering lounge.'
    },
    sports: {
      title: 'Passion for Sports',
      subtitle: 'Big Screen Broadcasts',
      desc: 'Never miss a single dramatic moment of your favorite sports. We have a dedicated arena equipped with an ultra-bright large format television and powerful spatial audio. We broadcast the absolute best of soccer, tennis, basketball, Formula 1, and more.',
      upcoming: 'Live Broadcast Schedule',
      liveIndicator: 'LIVE NOW',
      noEvents: 'No broadcasts scheduled for today. Ask our wonderful staff if you would like to request your favorite sport!',
      filterAll: 'View all',
      competition: 'Competition'
    },
    music: {
      title: 'Live Music Arena',
      subtitle: 'Weekend Resonance',
      desc: 'Weekends at CON~SENTID@S transform with pure acoustic magic. We host exquisite local and international artists who light up our terrace and indoor lounges with genres ranging from smooth jazz and acoustic soul to polished deep house lounge loops.',
      upcoming: 'Live Performance Schedule',
      hours: 'Time: Fridays to Sundays starting at 7:30 PM',
      bookTable: 'Reserve a table in advance'
    },
    menu: {
      title: 'Our Menu',
      subtitle: 'Flavor for every single moment',
      desc: 'We curate every single high-quality ingredient to bring you memorable culinary hits. High-energy breakfasts, gorgeous platters to share with great friends, signature courses, and artisanal cocktails shaken to perfection.',
      breakfast: 'Breakfast',
      coffees: 'Coffee & Drinks',
      lunchTapas: 'Lunch & Tapas',
      dinner: 'Dinner Courses',
      cocktails: 'Lounge Cocktails',
      popular: 'Popular Selection',
      allergensNote: '* If you have any food allergies or dietary intolerances, please notify our team before placing your order.'
    },
    gallery: {
      title: 'Experience Gallery',
      subtitle: 'Capturing moments at CON~SENTID@S',
      filterAll: 'All Photos',
      filterTerrace: 'The Terrace',
      filterInterior: 'Indoor Lounges',
      filterSports: 'Sports Arena',
      filterMusic: 'Live Music',
      filterProducts: 'Our Platters'
    },
    schedule: {
      title: 'Our Opening Hours',
      subtitle: 'Always excited to welcome you',
      weekdays: 'Monday to Thursday',
      weekdaysTime: '08:30 AM - 11:30 PM',
      weekends: 'Friday and Saturday',
      weekendsTime: '08:30 AM - 01:30 AM',
      specialEvents: 'Sundays',
      specialEventsTime: '09:00 AM - 12:00 AM',
      tagline: 'Our kitchen stays open until 1 hour prior to resort closing.'
    },
    contact: {
      title: 'Bookings & Contact',
      subtitle: 'Lock in your perfect table',
      reserveButton: 'Request Table Booking',
      sendMessage: 'Send Message',
      formName: 'Full Name',
      formEmail: 'Email Address',
      formPhone: 'Phone Number',
      formDate: 'Date',
      formTime: 'Select Time',
      formGuests: 'Number of Guests',
      formMessage: 'Special Requests / Preferences (Zone, Allergies, etc.)',
      formNotes: 'Please note: Your table request is pending and will be officially confirmed via WhatsApp or Email within 15 minutes.',
      formSubmitReserve: 'Complete Booking',
      formSubmitMessage: 'Send Contact Message',
      contactInfo: 'Contact Information',
      phoneLabel: 'Direct Line',
      whatsappLabel: 'WhatsApp Express',
      emailLabel: 'Email Address',
      addressLabel: 'Resort Location',
      successReserve: 'Booking request sent successfully! Keep an eye out for a quick WhatsApp confirmation in a few minutes!',
      successMessage: 'Thank you for reaching out! We have successfully received your inquiry and will revert shortly.',
      mapTitle: 'CON~SENTID@S Cafe Location (Marina Bay Apartments & Residences)'
    },
    reviews: {
      title: 'What Our Guests Say',
      subtitle: 'Memorable moments shared by our global community',
      addReview: 'Write a Review',
      formAuthor: 'Your Name',
      formRating: 'Rating (1-5 stars)',
      formComment: 'Your Opinion',
      formSubmit: 'Submit Review',
      successReview: 'Thank you so much for your review! We deeply value your feedback.'
    },
    footer: {
      desc: 'The most welcoming international meeting spot in the resort. Outstanding coffee, exceptional Mediterranean-fusion platters, elite sports action, and magical live music nights.',
      rights: '© 2026 CON~SENTID@S Terraza & Lounge. All rights reserved. Exquisitely designed for residents & global travelers.',
      legalTerms: 'Terms & Conditions',
      privacyPolicy: 'Privacy & Cookie Policies'
    }
  },
  de: {
    nav: {
      about: 'Das Lokal',
      sports: 'Sports-Zone',
      music: 'Live-Musik',
      menu: 'Speisekarte',
      gallery: 'Galerie',
      schedule: 'Öffnungszeiten',
      contact: 'Reservierung',
      reviews: 'Bewertungen'
    },
    hero: {
      subtitle: 'Die angesagteste Terrasse im Resort',
      title: 'Ihr Treffpunkt unter Sonne und Sternen',
      desc: 'Gönnen Sie sich ein unvergleichliches kulinarisches Erlebnis. Erstklassiger Kaffeespezialitäten am Morgen, packende Sportübertragungen auf Großleinwand und stilvolle Live-Musik am Wochenende.',
      ctaReserve: 'Tisch reservieren',
      ctaMenu: 'Speisekarte ansehen'
    },
    about: {
      title: 'Willkommen im CON~SENTID@S',
      subtitle: 'Ein Ort mit drei Seelen',
      desc1: 'Im Herzen des Wohn- und Resortkomplexes gelegen, wurde das CON~SENTID@S mit dem Traum geboren, Ihr zweites Zuhause zu sein. Ein einladender, eleganter, mehrsprachiger Ort, an dem Bewohner aus aller Welt, Familien und Urlauber einzigartige Momente teilen.',
      desc2: 'Von einem sonnenverwöhnten Frühstück mit erlesenem Kaffeespezialitäten bis hin zu handwerklichen Premium-Cocktails unter dem klaren Sternenhimmel – unsere Fusionsküche und unser wohnliches Ambiente verzaubern Sie zu jeder Tageszeit.',
      terraceTitle: 'Die Panorama-Terrasse',
      terraceDesc: 'Unser Prunkstück im Freien. Ein weitläufiger, üppig begrünter Bereich mit gemütlichen Lounge-Sofas – ideal, um die mediterrane Meeresbrise zu genießen, im Sonnenschein zu frühstücken oder bei Sonnenuntergang genüsslich Cocktails zu schlürfen.',
      ambience1Title: 'Lounge & Gastro Inside',
      ambience1Desc: 'Der erste Innenbereich: Eine behagliche Oase mit viel Naturholz, sanfter Beleuchtung und edlen Sofas. Ideal für romantische Dinner, entspannte Gespräche oder um Laptop-Arbeiten bei einer feinen Tasse Tee zu erledigen.',
      ambience2Title: 'Bar & Social Arena',
      ambience2Desc: 'Der zweite Innenbereich: Ein dynamischer und designstarker sozialer Raum, in dem eine imposante, meisterhaft gestaltete Bar im Mittelpunkt steht und unsere Gäste harmonisch vernetzt.'
    },
    sports: {
      title: 'Leidenschaft für Sport',
      subtitle: 'Übertragungen auf Großbildfernseher',
      desc: 'Verpassen Sie keine einzige Sekunde Ihrer Lieblingswettkämpfe. Wir bieten Ihnen eine eigene Zone, die mit einer hochauflösenden Großbild-TV-Wand und erstklassigem Sound ausgestattet ist. Wir zeigen die besten Spiele der Bundesliga, La Liga, Champions League, Tennis (Wimbledon), Formel 1 und vieles mehr.',
      upcoming: 'Aktueller Sendeplan',
      liveIndicator: 'JETZT LIVE',
      noEvents: 'Für heute sind keine Übertragungen angesetzt. Fragen Sie unser herzliches Personal gern nach Ihren Lieblingssportarten!',
      filterAll: 'Alle anzeigen',
      competition: 'Wettbewerb'
    },
    music: {
      title: 'Live-Musik am Wochenende',
      subtitle: 'Magische Schwingungen',
      desc: 'Wochenenden im CON~SENTID@S sind pure Magie. Wir präsentieren Ihnen großartige regionale und internationale Künstler, die unsere Terrasse und Innenlounges mit sanftem Jazz, akustischem Soul und edlen Deep-House-Chillout-Klängen beleben.',
      upcoming: 'Kommende Auftritte',
      hours: 'Uhrzeit: Freitag bis Sonntag ab 19:30 Uhr',
      bookTable: 'Tisch im Voraus reservieren'
    },
    menu: {
      title: 'Unsere Speisekarte',
      subtitle: 'Genuss für jeden Moment',
      desc: 'Wir wählen jede Zutat mit größter Sorgfalt aus, um Ihnen unvergessliche Gerichte zu servieren. Energiereiches Frühstück, genussvolle Platten zum Teilen mit guten Freunden, meisterhafte Hauptgerichte und frische, kreative Cocktails.',
      breakfast: 'Frühstück',
      coffees: 'Kaffee & Getränke',
      lunchTapas: 'Mittagessen & Tapas',
      dinner: 'Abendessen',
      cocktails: 'Lounge-Cocktails',
      popular: 'Favorit',
      allergensNote: '* Sollten Sie Nahrungsmittelallergien oder Unverträglichkeiten haben, informieren Sie bitte unser freundliches Service-Team vor Ihrer Bestellung.'
    },
    gallery: {
      title: 'Erlebnis-Galerie',
      subtitle: 'Visualisierte CON~SENTID@S-Momente',
      filterAll: 'Alle Bilder',
      filterTerrace: 'Die Terrasse',
      filterInterior: 'Innenlounges',
      filterSports: 'Sportarena',
      filterMusic: 'Live-Musik',
      filterProducts: 'Unsere Speisen'
    },
    schedule: {
      title: 'Unsere Öffnungszeiten',
      subtitle: 'Wir freuen uns sehr auf Sie',
      weekdays: 'Montag bis Donnerstag',
      weekdaysTime: '08:30 Uhr - 23:30 Uhr',
      weekends: 'Freitag und Samstag',
      weekendsTime: '08:30 Uhr - 01:30 Uhr',
      specialEvents: 'Sonntag',
      specialEventsTime: '09:00 Uhr - 00:00 Uhr',
      tagline: 'Unsere Küche schließt jeweils eine Stunde vor Betriebsschluss.'
    },
    contact: {
      title: 'Reservierung & Kontakt',
      subtitle: 'Sichern Sie sich Ihren Lieblingstisch',
      reserveButton: 'Tischreservierung anfragen',
      sendMessage: 'Nachricht senden',
      formName: 'Vollständiger Name',
      formEmail: 'E-Mail-Adresse',
      formPhone: 'Telefonnummer',
      formDate: 'Datum',
      formTime: 'Uhrzeit wählen',
      formGuests: 'Personenanzahl',
      formMessage: 'Sonderwünsche (Innen/Außenbereich, Allergien, etc.)',
      formNotes: 'Bitte beachten: Ihre Reservierungsanfrage ist unverbindlich und wird innerhalb von ca. 15 Minuten per WhatsApp/E-Mail bestätigt.',
      formSubmitReserve: 'Reservierung absenden',
      formSubmitMessage: 'Nachricht absenden',
      contactInfo: 'Kontaktinformationen',
      phoneLabel: 'Direkte Nummer',
      whatsappLabel: 'WhatsApp Express',
      emailLabel: 'E-Mail-Adresse',
      addressLabel: 'Resort-Standort',
      successReserve: 'Reservierungsanfrage erfolgreich versendet! Wir senden Ihnen in Kürze eine Bestätigung per WhatsApp.',
      successMessage: 'Vielen Dank für Ihre Anfrage! Wir haben Ihre Nachricht erhalten und melden uns umgehend bei Ihnen.',
      mapTitle: 'Standort des CON~SENTID@S Cafés (Marina Bay Apartments & Residences)'
    },
    reviews: {
      title: 'Gästemeinungen',
      subtitle: 'Unvergessliche Momente, geteilt von unserer weltweiten Community',
      addReview: 'Bewertung schreiben',
      formAuthor: 'Ihr Name',
      formRating: 'Bewertung (1-5 Sterne)',
      formComment: 'Ihre Meinung',
      formSubmit: 'Bewertung abschicken',
      successReview: 'Hunderprozentigen Dank für Ihre Bewertung! Wir freuen uns sehr über Ihr nettes Feedback.'
    },
    footer: {
      desc: 'Der gemütlichste internationale Treffpunkt des Resorts. Erlesener Kaffee, außergewöhnliche mediterrane Fusionsgerichte, hochkarätiger Livesport und legendäre Live-Musik-Abende.',
      rights: '© 2026 CON~SENTID@S Terraza & Lounge. Alle Rechte vorbehalten. Exquisit gestaltet für anspruchsvolle Gäste.',
      legalTerms: 'Allgemeine Geschäftsbedingungen',
      privacyPolicy: 'Datenschutzerklärung & Cookies'
    }
  }
};

export const MENU_DATA: Record<Language, { categoryId: string; categoryName: string; items: MenuItem[] }[]> = {
  es: [
    {
      categoryId: 'breakfast',
      categoryName: 'Desayunos',
      items: [
        { id: 'b1', name: 'Desayuno Inglés Completo', description: 'Dos huevos fritos, bacon inglés crujiente, salchichas de Cumberland, judías dulces, champiñones salteados, tomate asado y tostada de pan rústico con mantequilla.', price: 10.50, tags: ['Clásico', 'Muy Popular'], isPopular: true },
        { id: 'b2', name: 'Tostada de Aguacate & Huevo Poché', description: 'Pan artesanal de masa madre con aguacate machacado, tomate cherry concassé, un huevo poché ecológico en su punto y brotes verdes frescos.', price: 8.50, tags: ['Saludable', 'Veggie'] },
        { id: 'b3', name: 'Açaí Bowl Premium', description: 'Base cremosa de açaí orgánico batido con plátano y leche de almendras, coronado con fresas frescas, arándanos, semillas de chía, nueces tostadas y granola crujiente.', price: 9.00, tags: ['Súper Alimento', 'Vegano'] },
        { id: 'b4', name: 'Tostada Francesa Brioche', description: 'Pan brioche infusionado en crema dulce de canela, dorado en plancha y acompañado de frutos rojos macerados, sirope de arce puro y crema mascarpone.', price: 7.90, tags: ['Dulce'] }
      ]
    },
    {
      categoryId: 'coffees',
      categoryName: 'Cafetería & Bebidas',
      items: [
        { id: 'c1', name: 'Café de Especialidad Espresso', description: 'Extracción perfecta de granos de origen Arábica (100% ecológicos) con notas de chocolate y frutos secos.', price: 2.20 },
        { id: 'c2', name: 'Cappuccino Italiano Cremoso', description: 'Doble shot de espresso artesano con crema emulsionada al vapor y espolvoreado con cacao belga puro.', price: 3.40, tags: ['Destacado'] },
        { id: 'c3', name: 'Matcha Blue Ocean Latte', description: 'Elixir de matcha ceremonial combinado con infusión de alga espirulina azul, leche de avena tibia y un toque sutil de vainilla de Madagascar.', price: 4.80, tags: ['Especialidad', 'Instagrammable'], isPopular: true },
        { id: 'c4', name: 'Iced Salted Caramel Latte', description: 'Café frío de especialidad agitado con hielo, leche fresca entera o vegetal, sirope de caramelo salado casero y espuma fría cremosa.', price: 4.20 },
        { id: 'c5', name: 'Zumo de Naranja Natural', description: 'Naranjas de la huerta local recién exprimidas y llenas de vitamina C.', price: 3.80, tags: ['100% Fresco'] }
      ]
    },
    {
      categoryId: 'lunchTapas',
      categoryName: 'Almuerzos & Tapas',
      items: [
        { id: 'l1', name: 'Croquetas de Jamón Ibérico (6 uds)', description: 'Croquetas artesanales de bechamel ultra cremosa infusionada con el mejor hueso de jamón ibérico de bellota de Guijuelo y rebozado panko supercrujiente.', price: 9.50, tags: ['Artesanal', 'Tradición'], isPopular: true },
        { id: 'l2', name: 'Patatas Bravas "CON~SENTID@S"', description: 'Patatas rústicas cortadas a mano, doblemente cocinadas hasta quedar crujientes en su exterior y tiernas por dentro, con alioli suave de ajo asado y nuestra salsa brava picante secreta.', price: 7.00, tags: ['Veggie', 'Para Compartir'] },
        { id: 'l3', name: 'Hamburguesa Angus Premium', description: '180g de carne de ternera Angus a la parrilla, queso cheddar vintage fundido, bacon crujiente de roble, cebolla roja caramelizada tierna, lechuga romana, salsa bourbon y pan brioche súper tierno. Acompañada de patatas fritas caseras.', price: 15.50, tags: ['Gourmet', 'Clásico Club'], isPopular: true },
        { id: 'l4', name: 'Ensalada César con Pollo al Carbón', description: 'Hojas frescas de lechuga romana baby, pechuga de pollo marinada y asada al carbón, crujientes picatostes artesanales de ajo, lascas de Parmigiano Reggiano y nuestra salsa César casera.', price: 12.50, tags: ['Fresco', 'Equilibrado'] },
        { id: 'l5', name: 'Club Sandwich Auténtico', description: 'Tres pisos de pan tostado con tiras de pechuga de pollo tierna, bacon ahumado crujiente, tortilla de huevo recién hecha, queso emmental, rodajas de tomate pera, lechuga y mayonesa trufada. Servido con patatas fritas rústicas.', price: 11.90, tags: ['Estilo Internacional'] }
      ]
    },
    {
      categoryId: 'dinner',
      categoryName: 'Cenas',
      items: [
        { id: 'd1', name: 'Entrecot de Ternera a la Parrilla (300g)', description: 'Corte de solomillo madurado, cocinado a la brasa en el punto de su elección, servido con sal de escamas, romero fresco, patatas rústicas especiadas y mantequilla de hierbas finas del chef.', price: 22.50, tags: ['Carnes Premium'], isPopular: true },
        { id: 'd2', name: 'Lomo de Salmón con Glaseado Teriyaki', description: 'Salmón de Noruega fresco en costra de sésamo tostado con verduras tiernas wok salteadas en wok directo, puré cremoso de boniato dulce e hilos de jengibre.', price: 18.50, tags: ['Pescados'] },
        { id: 'd3', name: 'Wok Asiático de Mariscos Gourmet', description: 'Tallarines salteados con gambones, calamar joven de bahía, pimientos tricolor, cebolleta tierna y brotes de soja en salsa agridulce teriyaki.', price: 16.90, tags: ['Exótico'] },
        { id: 'd4', name: 'Raviolis de Espinacas & Ricotta artesanos', description: 'Pasta fresca rellena de espinacas tiernas y queso ricotta de oveja, salteados con mantequilla francesa de salvia fresca, tomates secos al sol y nueces de pecán picadas.', price: 14.50, tags: ['Veggie'] }
      ]
    },
    {
      categoryId: 'cocktails',
      categoryName: 'Lounge Cócteles',
      items: [
        { id: 'k1', name: 'Signature Mojito de Maracuyá', description: 'Ron blanco añejo selecto, puré natural de maracuyá, lima fresca exprimida, azúcar moreno ecológico de caña, menta fresca recogida en el día y un top de soda espumosa.', price: 8.50, tags: ['Tropical', 'Refrescante'], isPopular: true },
        { id: 'k2', name: 'Sunset CON~SENTID@S Gin & Tonic', description: 'Ginebra premium destilada artesanalmente, tónica de frutos de la pasión y frutos rojos, fresas frescas laminadas y bayas de enebro machacadas.', price: 9.50, tags: ['Aromático'] },
        { id: 'k3', name: 'Espresso Martini Deluxe', description: 'Shot de nuestro espresso caliente de especialidad, vodka ultra refinado, licor de café Kahlúa aromático y un toque de sirope de vainilla casero, sacudido en coctelera para crear una espuma densa.', price: 9.00, tags: ['Elegante', 'Energizante'] },
        { id: 'k4', name: 'Exotic Virgin Colada (Sin Alcohol)', description: 'Mezcla batida fresca de crema concentrada de coco caribeño, zumo de piña dulce exprimido y un toque sutil de granadina fría.', price: 6.50, tags: ['Sin Alcohol', 'Apto Niños'] }
      ]
    }
  ],
  en: [
    {
      categoryId: 'breakfast',
      categoryName: 'Breakfast',
      items: [
        { id: 'b1', name: 'Full English Breakfast', description: 'Two fried eggs, crispy British bacon, Cumberland sausages, sweet baked beans, sautéed mushrooms, grilled herb tomato, and toasted rustic sourdough with dairy butter.', price: 10.50, tags: ['Classic', 'Highly Popular'], isPopular: true },
        { id: 'b2', name: 'Avocado Toast & Poached Egg', description: 'Artisanal sourdough bread topped with crushed avocado, seasoned cherry tomato concassé, an organic poached egg cooked perfectly, and fresh microgreens.', price: 8.50, tags: ['Healthy', 'Veggie'] },
        { id: 'b3', name: 'Premium Açaí Bowl', description: 'Creamy organic açaí blended with banana and almond milk, beautifully layered with fresh strawberries, blueberries, chia seeds, roasted pecans, and crunchy house granola.', price: 9.00, tags: ['Super Food', 'Vegan'] },
        { id: 'b4', name: 'Brioche French Toast', description: 'Thick brioche slices soaked in cinnamon vanilla custard, griddled golden and topped with macerated mixed berries, pure maple syrup, and coveted mascarpone cream.', price: 7.90, tags: ['Sweet Tooth'] }
      ]
    },
    {
      categoryId: 'coffees',
      categoryName: 'Specialty Coffee & Drinks',
      items: [
        { id: 'c1', name: 'Specialty Arabica Espresso', description: 'Flawlessly extracted shots of 100% organic Single Origin Arabica beans, exhibiting notes of roasted hazelnut and dark cacao.', price: 2.20 },
        { id: 'c2', name: 'Creamy Italian Cappuccino', description: 'Double espresso pulled by hand, combined with velvety micro-foamed hot milk, gently dusted with fine Belgian cocoa.', price: 3.40, tags: ['Signature'] },
        { id: 'c3', name: 'Matcha Blue Ocean Latte', description: 'Ceremonial-grade Japanese matcha whisked with blue spirulina infusion, warm organic oat milk, and a delicate touch of Madagascar vanilla bean.', price: 4.80, tags: ['Specialty', 'Instagrammable'], isPopular: true },
        { id: 'c4', name: 'Iced Salted Caramel Latte', description: 'Chilled specialty coffee double shot shaken on ice with fresh whole or almond milk, house-infused salted caramel reduction, and thick cold foam.', price: 4.20 },
        { id: 'c5', name: 'Freshly Squeezed Orange Juice', description: 'Juicy local orchard oranges hand-squeezed on order, loaded with premium Vitamin C.', price: 3.80, tags: ['100% Raw'] }
      ]
    },
    {
      categoryId: 'lunchTapas',
      categoryName: 'Lunch & Tapas',
      items: [
        { id: 'l1', name: 'Acorn-fed Iberian Ham Croquettes (6 pcs)', description: 'Ultra-creamy homemade béchamel croquettes, infused with roasted Iberian acorn ham bones from Guijuelo, and deep-fried in extra-crispy Japanese panko breadcrumbs.', price: 9.50, tags: ['Handmade', 'Spanish Classic'], isPopular: true },
        { id: 'l2', name: 'CON~SENTID@S Signature Bravas', description: 'Rustic thick-cut potatoes cooked twice until golden and crispy outside and fluffy inside. Smothered in sweet roasted garlic aioli and our secret smoked spicy brava sauce.', price: 7.00, tags: ['Veggie', 'Great for Sharing'] },
        { id: 'l3', name: 'Premium Grilled Angus Burger', description: '180g of premium Angus flame-grilled beef, melted aged vintage cheddar cheese, crispy oak-smoked bacon, caramelized sweet red onions, crisp romana lettuce, smoky bourbon reduction, inside a toasted buttery brioche bun. Served with thick house fries.', price: 15.50, tags: ['Gourmet', 'Club Classic'], isPopular: true },
        { id: 'l4', name: 'Charcoal Grilled Chicken Caesar', description: 'Crisp hand-torn romaine baby lettuce heads, tender charcoal-kissed chicken breast, crunchy garlic herb croutons, shards of genuine Parmigiano Reggiano, and our masterfully whipped signature Caesar dressing.', price: 12.50, tags: ['Fresh', 'Balanced Choice'] },
        { id: 'l5', name: 'Authentic Club Sandwich', description: 'Stacked toasted club bread layered with sliced roasted chicken breast, crispy smoked bacon, freshly grilled egg omelette, Swiss Emmental cheese, sliced plum tomatoes, leaf lettuce, and light white truffled mayonnaise. Served with rustic home-cut fries.', price: 11.90, tags: ['International Style'] }
      ]
    },
    {
      categoryId: 'dinner',
      categoryName: 'Dinner Courses',
      items: [
        { id: 'd1', name: 'Flame Grilled Ribeye Steak (300g)', description: 'Carefully dry-aged ribeye steak cut, grilled on wood charcoal to your exact preference. Finished with flaky sea salt, fresh garden rosemary sprigs, roasted baby potatoes, and the chef’s special compound herb butter.', price: 22.50, tags: ['Premium Steak'], isPopular: true },
        { id: 'd2', name: 'Teriyaki Glazed Norwegian Salmon', description: 'Fresh pan-seared Norwegian salmon loin crusting toasted sesame seeds with fresh garden wok-fried vegetables, velvety sweet potato purée, and delicate ginger ribbons.', price: 18.50, tags: ['Fish Specialties'] },
        { id: 'd3', name: 'Gourmet Seafood Asian Wok', description: 'Stir-fried ribbon noodles with king prawns, local squid rings, sweet bell peppers, spring scallops, and organic bean sprouts tossed in rich teriyaki sauce.', price: 16.90, tags: ['Exotic Blend'] },
        { id: 'd4', name: 'Handmade Spinach & Ricotta Ravioli', description: 'Generous fresh pasta filled with tender garden spinach and sheep ricotta cheese, sautéed in premium French sage butter, sun-dried cherry tomatoes, and toasted crushed pecans.', price: 14.50, tags: ['Veggie'] }
      ]
    },
    {
      categoryId: 'cocktails',
      categoryName: 'Lounge Cocktails',
      items: [
        { id: 'k1', name: 'Passion Fruit Signature Mojito', description: 'Selected aged white rum, natural tang of fresh passion fruit nectar, freshly crushed lime wedges, organic brown sugar cane, freshly picked mint leaves, and a heavy splash of sparkling club soda.', price: 8.50, tags: ['Tropical Vibe', 'Refreshing Option'], isPopular: true },
        { id: 'k2', name: 'Sunset CON~SENTID@S Gin & Tonic', description: 'Artisanal micro-distilled premium dry gin, exotic wild berries tonic water, slivers of fresh strawberries, and crushed juniper berries.', price: 9.50, tags: ['Aromatic Twist'] },
        { id: 'k3', name: 'Deluxe Espresso Martini', description: 'Fresh hot extraction of our proprietary specialty espresso, ultra-filtered grain vodka, aromatic Kahlúa liqueur, and a drizzle of vanilla bean syrup, double-shaken for an immaculate silky froth tier.', price: 9.00, tags: ['Elegant Choice', 'Energizing Pop'] },
        { id: 'k4', name: 'Exotic Virgin Colada (Mocktail)', description: 'Perfectly whipped frozen mix of concentrated tropical coconut cream, cold sweet pineapple nectar, and a beautiful drizzle of pomegranate grenadine.', price: 6.50, tags: ['No-Alcohol', 'Kid Friendly'] }
      ]
    }
  ],
  de: [
    {
      categoryId: 'breakfast',
      categoryName: 'Frühstück',
      items: [
        { id: 'b1', name: 'Englisches Frühstück Komplett', description: 'Zwei Spiegeleier, knuspriger englischer Speck, Cumberland-Würstchen, süße Baked Beans, sautierte Champignons, gegrillte Tomaten und getoastetes rustikales Sauerteigbrot mit cremiger Butter.', price: 10.50, tags: ['Klassiker', 'Sehr Beliebt'], isPopular: true },
        { id: 'b2', name: 'Avocado-Rustico mit pochiertem Ei', description: 'Rustikales Weizensauerteigbrot mit sonnengereifter zerdrückter Avocado, Kirschtomaten-Ragout, einem perfekt pochiertem Bio-Ei und knackigen Mikro-Kräutern.', price: 8.50, tags: ['Gesund', 'Vegetarisch'] },
        { id: 'b3', name: 'Premium Açaí-Bowl', description: 'Samtige Bio-Açaí-Basis püriert mit Bananen- und Mandelmilch, gekrönt mit frischen Erdbeeren, Heidelbeeren, Chiasamen, gerösteten Pekannüssen und knusprigem Haus-Müsli.', price: 9.00, tags: ['Superfood', 'Vegan'] },
        { id: 'b4', name: 'Brioche „Armer Ritter“', description: 'Fluffiges Brioche-Brot, eingetaucht in Vanille-Zimt-Creme, goldbraun gebacken, serviert mit marinierten Waldbeeren, echtem Ahornsirup und feiner Mascarpone-Creme.', price: 7.90, tags: ['Süßspeise'] }
      ]
    },
    {
      categoryId: 'coffees',
      categoryName: 'Kaffeespezialitäten & Getränke',
      items: [
        { id: 'c1', name: 'Spezialitäten-Espresso Arabica', description: 'Präzise gebrühte Tasse mit 100 % biologischen Arabica-Bohnen aus einer einzigen Anbauregion, Noten von Nuss und dunklem Kakao.', price: 2.20 },
        { id: 'c2', name: 'Cremiger italienischer Cappuccino', description: 'Doppelter Espresso, handgezogen, mit wunderbar feinporigem, aufgeschäumtem Milchschaum und feinem belgischen Kakao veredelt.', price: 3.40, tags: ['Signature'] },
        { id: 'c3', name: 'Exotischer Ocean Matcha Latte', description: 'Premium-Matcha verquirlt mit einem Hauch blauer Spirulina-Alge, warmer Hafermilch und echter Bourbon-Vanille aus Madagaskar.', price: 4.80, tags: ['Spezialität', 'Instagram-Trend'], isPopular: true },
        { id: 'c4', name: 'Iced Salted Caramel Latte', description: 'Frisch zubereiteter Espresso-Doppelschuss auf Eis geschüttelt, gekühlte Frischmilch, hausgemachte gesalzene Karamellsauce und zarter Kaltmilchschaum.', price: 4.20 },
        { id: 'c5', name: 'Frisch gepresster Orangensaft', description: 'Direkt vor Ihren Augen gepresste saftige Orangen aus sonnigen lokalen Hainen – pure Vitamine.', price: 3.80, tags: ['100% Roh'] }
      ]
    },
    {
      categoryId: 'lunchTapas',
      categoryName: 'Mittagessen & Tapas',
      items: [
        { id: 'l1', name: 'Iberische Schinkenkroketten (6 Stk)', description: 'Hausgemachte, hocharomatische Kroketten aus ultra-cremigem Béchamelteig, gekocht mit feinstem iberischem Eichelschinken aus Guijuelo, frittiert in knusprigen japanischen Panko-Bröseln.', price: 9.50, tags: ['Handgemacht', 'Traditionell'], isPopular: true },
        { id: 'l2', name: 'CON~SENTID@S Signature Bravas', description: 'In Handarbeit geschnittene rustikale Kartoffeln, zweifach gegart für maximale Knusprigkeit, serviert mit feiner Knoblauch-Aioli und unserer geheimen scharfen Salsa Brava.', price: 7.00, tags: ['Vegetarisch', 'Ideal zum Teilen'] },
        { id: 'l3', name: 'Premium Angus-Rindfleisch-Burger', description: '180 g exquisites, saftiges Angus-Rindfleisch vom Grill, geschmolzener gereifter Cheddar-Käse, knuspriger Buchenrauch-Speck, handkaramellisierte rote Zwiebeln, frischer Römersalat, Bourbon-Barbecue-Sauce im gebutterten Brioche-Brötchen. Dazu hausgemachte Pommes.', price: 15.50, tags: ['Gourmet', 'Club-Highlight'], isPopular: true },
        { id: 'l4', name: 'Caesar-Salat vom Holzkohlegrill', description: 'Knackiger Mini-Römersalat, marinierte und auf Holzkohle gegrillte Hähnchenbrust, hausgemachte Knoblauch-Kräuter-Croutons, gehobelter Echter Parmigiano Reggiano und unser cremiges Caesar-Dressing.', price: 12.50, tags: ['Frisch', 'Ausgewogen'] },
        { id: 'l5', name: 'Original Club-Sandwich', description: 'Dreistöckiges Weizentoast-Sandwich mit saftig gegrilltem Hähnchenbrustfilet, kross gegrilltem Speck, einem frischen Rührei, Schweizer Emmentaler-Käse, aromatischen Eiertomaten, Salat und exquisiter Trüffel-Mayonnaise. Dazu Pommes Frites.', price: 11.90, tags: ['Internationaler Stil'] }
      ]
    },
    {
      categoryId: 'dinner',
      categoryName: 'Abendessen',
      items: [
        { id: 'd1', name: 'Gegrilltes Rumpsteak vom Angus (300g)', description: 'Gut gereiftes Premium-Rindfleisch, über Holzkohle nach Wunsch gebraten. Mit grobem Meersalz, frischem Gartenrosmarin, würzigen Ofenkartoffeln und der hausgemachten Kräuterbutter des Küchenchefs.', price: 22.50, tags: ['Premium Steak'], isPopular: true },
        { id: 'd2', name: 'Lachsfilet im Teriyaki-Mantel', description: 'Frisches norwegisches Lachsfilet in gerösteter Sesamkruste auf knackigem, frisch zubereitetem Wok-Gemüse, serviert mit samtigem Süßkartoffepüree und feinen Ingwerstreifen.', price: 18.50, tags: ['Fischgerichte'] },
        { id: 'd3', name: 'Gourmet Meeresfrüchte-Wok', description: 'Im traditionellen Wok geschwenkte Bandnudeln mit Riesen-Garnelen, zarten Calamari-Ringen aus der Bucht, dreifarbiger Paprika, Frühlingszwiebeln und Sojasprossen in pikanter Teriyaki-Sauce.', price: 16.90, tags: ['Exotic Taste'] },
        { id: 'd4', name: 'Frische hausgemachte Spinat-Ricotta-Ravioli', description: 'Teigtaschen gefüllt mit jungem Blattspinat und cremigem Schafsricotta, geschwenkt in französischer Salbeibutter mit getrockneten Tomaten und gehackten Pekannüssen.', price: 14.50, tags: ['Vegetarisch'] }
      ]
    },
    {
      categoryId: 'cocktails',
      categoryName: 'Lounge-Cocktails',
      items: [
        { id: 'k1', name: 'Signature Passionsfrucht-Mojito', description: 'Auserlesener weißer Rum, frisches Passionsfrucht-Nektarmark, frisch gepresste Limettenachtel, brauner Bio-Rohrzucker, frisch gezupfte Minze und spritziges Club-Soda.', price: 8.50, tags: ['Karibisch', 'Besonders Erfrischend'], isPopular: true },
        { id: 'k2', name: 'Sunset CON~SENTID@S Gin & Tonic', description: 'In kleinen Chargen handwerklich destillierter Premium Dry Gin mit fruchtigem Waldbeeren-Tonic-Water, frischen Erdbeerenscheiben und Wacholderbeeren.', price: 9.50, tags: ['Sehr Aromatisch'] },
        { id: 'k3', name: 'Deluxe Espresso Martini', description: 'Verführerisches Zusammenspiel aus frisch gebrühtem Kaffeespezialitäten-Espresso, dreifach gefiltertem Wódka, Kahlúa-Kaffeelikör und feiner Bourbon-Vanille, eiskalt shaker-geschüttelt.', price: 9.00, tags: ['Elegant & Stark', 'Wachmacher'] },
        { id: 'k4', name: 'Tropic Virgin Colada (Alkoholfrei)', description: 'Frisch gemixter, eisgekühlter Traum aus cremiger Kokosmilch, fruchtigem Ananassaft und einem eleganten Schuss rotem Granatapfelsirup.', price: 6.50, tags: ['Alkoholfrei', 'Kinderfreundlich'] }
      ]
    }
  ]
};

export const SPORTS_EVENTS: Record<Language, SportEvent[]> = {
  es: [
    { id: 's1', date: 'Hoy', time: '20:45 h', sport: 'football', title: 'Real Madrid vs Paris Saint-Germain', competition: 'UEFA Champions League - Cuartos de Final', isLive: true },
    { id: 's2', date: 'Sáb, 13 Jun', time: '14:00 h', sport: 'formula1', title: 'Clasificación GP de España', competition: 'Fórmula 1 - Circuito de Barcelona-Catalunya' },
    { id: 's3', date: 'Sáb, 13 Jun', time: '17:30 h', sport: 'tennis', title: 'Semifinales Singles Masculinos', competition: 'Wimbledon Championships' },
    { id: 's4', date: 'Dom, 14 Jun', time: '15:00 h', sport: 'formula1', title: 'Gran Carrera GP de España', competition: 'Fórmula 1 - Carrera Principal' },
    { id: 's5', date: 'Dom, 14 Jun', time: '16:00 h', sport: 'tennis', title: 'Final Masculina de Wimbledon', competition: 'Wimbledon Grand Slam Final' },
    { id: 's6', date: 'Dom, 14 Jun', time: '21:00 h', sport: 'football', title: 'España vs Inglaterra', competition: 'Eurocopa - Gran Final' }
  ],
  en: [
    { id: 's1', date: 'Today', time: '08:45 PM', sport: 'football', title: 'Real Madrid vs Paris Saint-Germain', competition: 'UEFA Champions League - Quarter Finals', isLive: true },
    { id: 's2', date: 'Sat, Jun 13', time: '02:00 PM', sport: 'formula1', title: 'Spanish GP - Qualifying Session', competition: 'Formula 1 - Barcelona-Catalunya Circuit' },
    { id: 's3', date: 'Sat, Jun 13', time: '05:30 PM', sport: 'tennis', title: 'Men\'s Singles Semifinals', competition: 'Wimbledon Championships' },
    { id: 's4', date: 'Sun, Jun 14', time: '03:00 PM', sport: 'formula1', title: 'Spanish GP - Grand Race', competition: 'Formula 1 - Main Race Session' },
    { id: 's5', date: 'Sun, Jun 14', time: '04:00 PM', sport: 'tennis', title: 'Men\'s Singles Grand Final', competition: 'Wimbledon Grand Slam Final' },
    { id: 's6', date: 'Sun, Jun 14', time: '09:00 PM', sport: 'football', title: 'Spain vs England', competition: 'UEFA Euro - Grand Final' }
  ],
  de: [
    { id: 's1', date: 'Heute', time: '20:45 Uhr', sport: 'football', title: 'Real Madrid vs. Paris Saint-Germain', competition: 'UEFA Champions League - Viertelfinale', isLive: true },
    { id: 's2', date: 'Sa, 13. Jun', time: '14:00 Uhr', sport: 'formula1', title: 'Großer Preis von Spanien - Qualifying', competition: 'Formel 1 - Spanien (Catalunya)' },
    { id: 's3', date: 'Sa, 13. Jun', time: '17:30 Uhr', sport: 'tennis', title: 'Herren-Einzel Halbfinale', competition: 'Wimbledon Championships' },
    { id: 's4', date: 'So, 14. Jun', time: '15:00 Uhr', sport: 'formula1', title: 'Großer Preis von Spanien - Das Hauptrennen', competition: 'Formel 1 - Rennen' },
    { id: 's5', date: 'So, 14. Jun', time: '16:00 Uhr', sport: 'tennis', title: 'Herren-Einzel Finale', competition: 'Wimbledon Finale (Grand Slam)' },
    { id: 's6', date: 'So, 14. Jun', time: '21:00 Uhr', sport: 'football', title: 'Spanien vs. England', competition: 'UEFA Europameisterschaft - Finale' }
  ]
};

export const LIVE_MUSIC_EVENTS: Record<Language, LiveMusicEvent[]> = {
  es: [
    {
      id: 'm1',
      date: 'Viernes',
      time: '19:30 h',
      artist: 'Sofía & Her Acoustic Soul',
      genre: 'Acoustic Soul, R&B & Pop Classics',
      description: 'Una atmósfera inmejorable mientras atardece en la terraza exterior. Disfruta de la voz sedosa de Sofía versionando grandes clásicos del soul en formato acústico con guitarra.',
      image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm2',
      date: 'Sábado',
      time: '20:30 h',
      artist: 'The Moonlight Jazz Trio',
      genre: 'Classy Jazz, swing & Bossanova',
      description: 'Nuestra velada estrella de los sábados. El Moonlight Trio crea un ambiente sofisticado ideal para acompañar tus cenas en el interior o tu copa en la terraza, interpretando un repertorio de jazz de época.',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm3',
      date: 'Domingo',
      time: '18:00 h',
      artist: 'DJ Max - Chillout Sessions',
      genre: 'Deep House, Sunset Ambient & Lounge',
      description: 'Cierra el fin de semana con las mejores vibraciones veraniegas. Una sesión de música electrónica relajante mezclada por DJ Max, perfecta para disfrutar de nuestros cócteles gourmet premium.',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    }
  ],
  en: [
    {
      id: 'm1',
      date: 'Friday',
      time: '07:30 PM',
      artist: 'Sofía & Her Acoustic Soul',
      genre: 'Acoustic Soul, R&B & Pop Classics',
      description: 'Enjoy a beautiful sunset on our outdoor terrace. Delight in Sofía\'s silky voice covering timeless soul classics as the stars emerge, in an intimate acoustic guitar setup.',
      image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm2',
      date: 'Saturday',
      time: '08:30 PM',
      artist: 'The Moonlight Jazz Trio',
      genre: 'Classy Jazz, Swing & Bossanova',
      description: 'Our premier Saturday night event. The Moonlight Trio weaves a sophisticated musical backdrop for your dinner inside or cocktails on the patio, playing legendary vintage jazz numbers.',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm3',
      date: 'Sunday',
      time: '06:00 PM',
      artist: 'DJ Max - Chillout Sessions',
      genre: 'Deep House, Sunset Ambient & Lounge',
      description: 'Unwind and finish your weekend on a glorious high with chilled summer vibrations. A live-ambient deep house mix by DJ Max, beautifully paired with premium cocktails.',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    }
  ],
  de: [
    {
      id: 'm1',
      date: 'Freitag',
      time: '19:30 Uhr',
      artist: 'Sofía & Her Acoustic Soul',
      genre: 'Akustischer Soul, R&B & Pop-Klassiker',
      description: 'Eine atemberaubende Atmosphäre beim Sonnenuntergang auf der Terrasse. Genießen Sie Sofías samtige Stimme, die Soul-Klassiker im intimen Gitarren-Akustikformat darbietet.',
      image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm2',
      date: 'Samstag',
      time: '20:30 Uhr',
      artist: 'The Moonlight Jazz Trio',
      genre: 'Classy Jazz, Swing & Bossanova',
      description: 'Unser samstägliches Highlight-Event. Das Moonlight Trio erschafft eine erstklassig-edle Kulisse für Ihr feines Abendessen im Inneren oder edle Drinks auf der Lounge-Terrasse.',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm3',
      date: 'Sonntag',
      time: '18:00 Uhr',
      artist: 'DJ Max - Chillout Sessions',
      genre: 'Deep House, Sunset Ambient & Lounge',
      description: 'Lassen Sie das Wochenende entspannt ausklingen. Eine Live-Mischung aus entspannten elektronischen Klängen von DJ Max, wunderbar abgestimmt auf unsere Gourmet-Cocktails.',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    }
  ]
};

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'r1',
    author: 'Sarah Jenkins (UK)',
    rating: 5,
    comment: 'An absolute gem inside the apartments! We spent almost every evening on the terrace. The English Breakfast is incredible, and the staff speak perfect English. Live music on Saturdays made our holiday!',
    source: 'google',
    date: '2026-06-02'
  },
  {
    id: 'r2',
    author: 'Mathias Schmidt (DE)',
    rating: 5,
    comment: 'Beste Sports-Bar im Komplex! Großer Fernseher und tolle Stimmung bei Champions-League-Spielen. Die Iberischen Kroketten und das Steak waren überragend gut. Sehr zu empfehlen für deutsche Urlauber.',
    source: 'tripadvisor',
    date: '2026-05-28'
  },
  {
    id: 'r3',
    author: 'Alejandra Ruiz (ES)',
    rating: 5,
    comment: 'Ambiente súper agradable, los dos espacios interiores están decorados con muchísimo gusto. Gran terraza para las noches calurosas y una carta de cócteles espectacular. Recomiendo el Mojito de Maracuyá.',
    source: 'direct',
    date: '2026-06-04'
  }
];