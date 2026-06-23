(function () {
    "use strict";

    var CONTACT = {
        phone: "+34 922 000 000",
        phoneHref: "tel:+34922000000",
        whatsappHref: "https://wa.me/34922000000?text=Hola%2C%20quiero%20hacer%20una%20reserva%20en%20Terraza%20Brisa%20Cafe.",
        email: "reservas@terrazabrisa.cafe",
        address: "Complejo Atlantico, Avenida de la Terraza 12, Tenerife",
        instagram: "https://www.instagram.com/",
        facebook: "https://www.facebook.com/",
        tripadvisor: "https://www.tripadvisor.com/",
        mapsEmbed: "https://www.google.com/maps?q=Tenerife%20Spain&output=embed"
    };

    var LANGUAGES = [
        { code: "es", label: "ES", name: "Español" },
        { code: "en", label: "EN", name: "English" },
        { code: "de", label: "DE", name: "Deutsch" }
    ];

    var DICT = {
        es: {
            metaTitle: "Terraza Brisa Cafe | Terraza, deporte y musica en directo",
            metaDescription: "Cafeteria premium con gran terraza, deportes en pantalla grande y musica en directo los fines de semana.",
            brandPlace: "Apartment Cafe",
            nav: ["Cafeteria", "Deportes", "Musica", "Carta", "Galeria", "Reservas"],
            actions: { reserve: "Reservar mesa", whatsapp: "WhatsApp", call: "Llamar", menu: "Ver carta", events: "Ver eventos", send: "Enviar consulta" },
            hero: {
                eyebrow: "Cafe, terraza y ocio en el complejo",
                title: "Tu terraza para desayunar, ver el partido y alargar la noche.",
                copy: "Una cafeteria acogedora y elegante para residentes y visitantes: cafe de mañana, comidas informales, pantalla grande para deporte, copas al atardecer y musica en directo cada fin de semana.",
                metrics: [
                    ["3", "zonas: terraza, lounge y sala deportiva"],
                    ["7/7", "abierto para desayunos, cenas y copas"],
                    ["ES · EN · DE", "atencion pensada para clientes internacionales"]
                ]
            },
            about: {
                eyebrow: "Bienvenidos",
                title: "Un punto de encuentro dentro del complejo, con ambiente de vacaciones todo el año.",
                lead: "Terraza Brisa Cafe combina la comodidad de una cafeteria de confianza con el caracter de un local social: mesas amplias, servicio cercano, carta flexible y espacios preparados para distintos momentos del dia.",
                labels: ["Terraza amplia", "Pantalla grande", "Musica en directo"],
                features: [
                    ["sun", "Gran terraza exterior", "Mesas con sombra, vegetacion y luz calida para desayunos tranquilos, comidas al aire libre y tardes largas."],
                    ["coffee", "Dos ambientes interiores", "Un lounge relajado para conversar y una zona mas viva para deporte, grupos y eventos."],
                    ["users", "Para residentes y turistas", "Servicio claro, acogedor y facil de entender para clientes españoles, ingleses, alemanes y otras nacionalidades."]
                ]
            },
            highlights: {
                eyebrow: "Lo esencial",
                title: "Tres razones para volver",
                lead: "La experiencia se organiza alrededor de terraza, deporte y musica, con una carta pensada para acompañar cada plan.",
                items: [
                    ["terrace", "Terraza con protagonismo", "El lugar natural para desayunar, leer, reunirse o tomar una copa cuando cae la tarde."],
                    ["sports", "Deportes en pantalla grande", "Futbol, tenis, motor y eventos internacionales en una zona comoda y visible."],
                    ["music", "Fines de semana con directo", "Sesiones acusticas, jazz suave y artistas locales para crear ambiente sin perder comodidad."]
                ]
            },
            sports: {
                eyebrow: "Pantalla grande",
                title: "Tu zona deportiva para partidos, finales y grandes citas.",
                lead: "Programamos retransmisiones destacadas durante la semana y reforzamos el ambiente en partidos clave. Si buscas un evento concreto, contacta y lo preparamos.",
                panelTitle: "Eventos que solemos emitir",
                panelText: "Futbol nacional e internacional, Champions, Premier League, LaLiga, torneos de tenis, Formula 1, MotoGP y competiciones especiales segun temporada.",
                tags: ["Futbol", "Tenis", "Formula 1", "MotoGP", "Eventos privados"],
                listTitle: "Proximas retransmisiones",
                events: [
                    ["Vier", "14", "Jun", "Noche de futbol europeo", "Partido destacado con sonido ambiente y reserva de mesas para grupos.", "20:30", "Zona pantalla"],
                    ["Sab", "15", "Jun", "Tarde de tenis", "Sesion de semifinales con carta de cafes, tapas y bebidas frias.", "17:00", "Interior lounge"],
                    ["Dom", "16", "Jun", "Gran premio en directo", "Motor en pantalla grande y menu informal para ver la carrera con calma.", "14:00", "Zona deportiva"]
                ]
            },
            music: {
                eyebrow: "Fin de semana",
                title: "Musica en directo para cerrar el dia con otro ritmo.",
                lead: "Cada fin de semana reservamos un espacio para actuaciones cercanas: volumen agradable, artistas locales y un ambiente perfecto para parejas, familias y amigos.",
                events: [
                    ["Vie", "21", "Jun", "Acoustic Sunset", "Laura Medina Duo", "20:30", "Versiones acusticas y soul suave para cena y copas."],
                    ["Sab", "22", "Jun", "Jazz & Terrace", "Blue Palm Trio", "21:00", "Jazz calido con contrabajo, guitarra y percusion ligera."],
                    ["Dom", "23", "Jun", "Latin Easy Night", "Mar de Fondo", "19:30", "Ritmos latinos relajados para despedir el fin de semana."]
                ]
            },
            menu: {
                eyebrow: "Carta editable",
                title: "De la mañana a la noche",
                lead: "Los precios y platos estan organizados por categoria para actualizar la carta con facilidad.",
                categories: { breakfast: "Desayunos", coffee: "Cafes y bebidas", tapas: "Comidas y tapas", dinner: "Cenas", cocktails: "Cocteles" },
                items: {
                    breakfast: [["Tostada mediterranea", "Pan artesano, tomate natural, aceite de oliva y jamon serrano.", "6,50 €"], ["Bowl de yogur y fruta", "Yogur cremoso, fruta fresca, granola y miel.", "7,20 €"], ["Desayuno Brisa", "Cafe, zumo natural, tostada a elegir y mini bolleria.", "9,80 €"]],
                    coffee: [["Cafe especialidad", "Espresso, cortado, latte o cappuccino con leche a elegir.", "2,20 €"], ["Iced latte terraza", "Cafe frio, leche, hielo y toque de vainilla.", "4,60 €"], ["Limonada de hierbabuena", "Limon natural, hierbabuena y agua con gas.", "4,90 €"]],
                    tapas: [["Tabla de quesos y fruta", "Seleccion local, frutos secos y chutney suave.", "14,50 €"], ["Papas bravas Brisa", "Salsa ahumada, alioli ligero y hierbas frescas.", "8,40 €"], ["Wrap de pollo grill", "Pollo marinado, verduras, salsa yogur y ensalada.", "11,90 €"]],
                    dinner: [["Ensalada Atlantica", "Hojas verdes, aguacate, langostinos y vinagreta citrica.", "13,80 €"], ["Burger de terraza", "Carne seleccionada, queso curado, cebolla dulce y patatas.", "15,50 €"], ["Pasta cremosa de setas", "Setas salteadas, parmesano y aceite de trufa suave.", "14,90 €"]],
                    cocktails: [["Spritz de la casa", "Aperitivo citrico, cava, soda y naranja fresca.", "8,50 €"], ["Mojito Brisa", "Ron, lima, hierbabuena y azucar moreno.", "8,90 €"], ["Mocktail tropical", "Mango, lima, ginger ale y fruta fresca.", "6,80 €"]]
                }
            },
            gallery: { eyebrow: "Galeria", title: "Espacios pensados para cada momento", lead: "Imagenes del ambiente que definen la experiencia: terraza, interior, pantalla, musica y producto.", labels: ["Terraza exterior", "Zona deportiva", "Musica en directo", "Ambiente interior", "Cafe y platos"] },
            hours: { eyebrow: "Horarios", title: "Abierto todos los dias", lead: "Los horarios especiales para deporte y musica se anuncian en la agenda y tambien por WhatsApp.", rows: [["Lunes a jueves", "08:00 - 23:00"], ["Viernes", "08:00 - 01:00"], ["Sabado", "09:00 - 01:00"], ["Domingo", "09:00 - 23:30"], ["Eventos especiales", "Segun programacion"]] },
            contact: {
                eyebrow: "Reservas y contacto",
                title: "Reserva mesa o pregunta por tu evento.",
                lead: "Para grupos, partidos concretos o actuaciones, contacta con antelacion y preparamos la zona mas adecuada.",
                cards: ["Telefono", "WhatsApp", "Correo", "Ubicacion"],
                form: {
                    title: "Enviar consulta", name: "Nombre", email: "Email", phone: "Telefono", people: "Personas", date: "Fecha", type: "Tipo de reserva", message: "Mensaje",
                    placeholders: ["Tu nombre", "tu@email.com", "+34 ...", "2", "Cuentanos si vienes a desayunar, ver un partido, cenar o disfrutar de musica en directo."],
                    options: ["Reserva de mesa", "Evento deportivo", "Musica en directo", "Grupo privado", "Otra consulta"],
                    success: "Consulta preparada. Se abrira tu cliente de email para enviarla.",
                    errors: { required: "Campo obligatorio", email: "Introduce un email valido", people: "Minimo 1 persona" }
                }
            },
            reviews: { eyebrow: "Opiniones", title: "Una experiencia facil de recomendar", items: [["Nos encanta tener un sitio asi dentro del complejo. Desayuno tranquilo por la mañana y ambiente precioso por la noche.", "Marta R., residente"], ["Great terrace, friendly service and the football area was exactly what we needed for the match.", "James K., visitor"], ["Sehr angenehme Atmosphaere, gute Cocktails und Live-Musik am Wochenende. Wir kommen wieder.", "Anna M., guest"]] },
            footer: { text: "Cafe, terraza, deporte y musica en directo dentro de un complejo de apartamentos con ambiente internacional.", contact: "Contacto", explore: "Explorar", legal: "Legal", legalLinks: ["Aviso legal", "Privacidad", "Cookies"], copyright: "© 2026 Terraza Brisa Cafe. Todos los derechos reservados.", note: "Contenido preparado para editar carta, horarios y eventos desde app.js." }
        },
        en: {
            metaTitle: "Terraza Brisa Cafe | Terrace, sport and live music",
            metaDescription: "Premium cafe with a large terrace, big-screen sports and weekend live music.",
            brandPlace: "Apartment Cafe",
            nav: ["Cafe", "Sports", "Music", "Menu", "Gallery", "Bookings"],
            actions: { reserve: "Book a table", whatsapp: "WhatsApp", call: "Call", menu: "View menu", events: "View events", send: "Send enquiry" },
            hero: {
                eyebrow: "Cafe, terrace and leisure in the complex",
                title: "Your terrace for breakfast, the match and a relaxed night out.",
                copy: "A welcoming, elegant cafe for residents and visitors: morning coffee, casual dining, big-screen sport, sunset drinks and live music every weekend.",
                metrics: [["3", "areas: terrace, lounge and sports room"], ["7/7", "open for breakfast, dinner and drinks"], ["ES · EN · DE", "service designed for international guests"]]
            },
            about: {
                eyebrow: "Welcome",
                title: "A meeting point inside the complex, with a holiday mood all year round.",
                lead: "Terraza Brisa Cafe blends the comfort of a trusted cafe with the character of a social venue: spacious tables, warm service, a flexible menu and areas prepared for every part of the day.",
                labels: ["Large terrace", "Big screen", "Live music"],
                features: [["sun", "Large outdoor terrace", "Shaded tables, greenery and warm lighting for calm breakfasts, open-air lunches and long evenings."], ["coffee", "Two indoor atmospheres", "A relaxed lounge for conversation and a livelier area for sports, groups and events."], ["users", "For residents and tourists", "Clear, welcoming service for Spanish, English, German and other international guests."]]
            },
            highlights: { eyebrow: "Essentials", title: "Three reasons to come back", lead: "The experience is built around terrace, sport and music, with a menu that fits every plan.", items: [["terrace", "A terrace with presence", "The natural place for breakfast, reading, meeting friends or enjoying a drink at sunset."], ["sports", "Big-screen sports", "Football, tennis, motorsport and international events in a comfortable, visible area."], ["music", "Weekend live sessions", "Acoustic sets, soft jazz and local artists create atmosphere without losing comfort."]] },
            sports: { eyebrow: "Big screen", title: "Your sports area for matches, finals and major events.", lead: "We schedule key broadcasts during the week and build the atmosphere for important fixtures. Looking for a specific event? Contact us and we will prepare it.", panelTitle: "Events we usually show", panelText: "National and international football, Champions League, Premier League, LaLiga, tennis tournaments, Formula 1, MotoGP and seasonal special competitions.", tags: ["Football", "Tennis", "Formula 1", "MotoGP", "Private events"], listTitle: "Upcoming broadcasts", events: [["Fri", "14", "Jun", "European football night", "Featured match with venue sound and table bookings for groups.", "20:30", "Screen area"], ["Sat", "15", "Jun", "Tennis afternoon", "Semi-final session with coffee, tapas and cold drinks.", "17:00", "Interior lounge"], ["Sun", "16", "Jun", "Grand prix live", "Motorsport on the big screen with an informal menu for an easy race day.", "14:00", "Sports area"]] },
            music: { eyebrow: "Weekend", title: "Live music to end the day with a different rhythm.", lead: "Every weekend we reserve space for intimate performances: pleasant volume, local artists and an atmosphere that works for couples, families and friends.", events: [["Fri", "21", "Jun", "Acoustic Sunset", "Laura Medina Duo", "20:30", "Acoustic covers and soft soul for dinner and drinks."], ["Sat", "22", "Jun", "Jazz & Terrace", "Blue Palm Trio", "21:00", "Warm jazz with double bass, guitar and light percussion."], ["Sun", "23", "Jun", "Latin Easy Night", "Mar de Fondo", "19:30", "Relaxed Latin rhythms to close the weekend."]] },
            menu: { eyebrow: "Editable menu", title: "From morning to night", lead: "Prices and dishes are grouped by category so the menu can be updated easily.", categories: { breakfast: "Breakfast", coffee: "Coffee and drinks", tapas: "Lunch and tapas", dinner: "Dinner", cocktails: "Cocktails" }, items: {} },
            gallery: { eyebrow: "Gallery", title: "Spaces designed for every moment", lead: "Images of the atmosphere that defines the experience: terrace, interior, screen, music and food.", labels: ["Outdoor terrace", "Sports area", "Live music", "Indoor mood", "Coffee and dishes"] },
            hours: { eyebrow: "Opening hours", title: "Open every day", lead: "Special hours for sport and music are announced in the agenda and via WhatsApp.", rows: [["Monday to Thursday", "08:00 - 23:00"], ["Friday", "08:00 - 01:00"], ["Saturday", "09:00 - 01:00"], ["Sunday", "09:00 - 23:30"], ["Special events", "According to schedule"]] },
            contact: { eyebrow: "Bookings and contact", title: "Book a table or ask about your event.", lead: "For groups, specific matches or live music nights, contact us in advance and we will prepare the best area.", cards: ["Phone", "WhatsApp", "Email", "Location"], form: { title: "Send enquiry", name: "Name", email: "Email", phone: "Phone", people: "People", date: "Date", type: "Booking type", message: "Message", placeholders: ["Your name", "you@email.com", "+34 ...", "2", "Tell us whether you are coming for breakfast, a match, dinner or live music."], options: ["Table booking", "Sports event", "Live music", "Private group", "Other enquiry"], success: "Enquiry prepared. Your email client will open so you can send it.", errors: { required: "Required field", email: "Enter a valid email", people: "Minimum 1 person" } } },
            reviews: { eyebrow: "Reviews", title: "An experience people recommend", items: [["We love having a place like this inside the complex. Calm breakfast in the morning and a beautiful mood at night.", "Marta R., resident"], ["Great terrace, friendly service and the football area was exactly what we needed for the match.", "James K., visitor"], ["Sehr angenehme Atmosphaere, gute Cocktails und Live-Musik am Wochenende. Wir kommen wieder.", "Anna M., guest"]] },
            footer: { text: "Cafe, terrace, sport and live music inside an apartment complex with an international atmosphere.", contact: "Contact", explore: "Explore", legal: "Legal", legalLinks: ["Legal notice", "Privacy", "Cookies"], copyright: "© 2026 Terraza Brisa Cafe. All rights reserved.", note: "Content prepared for editing menu, hours and events from app.js." }
        },
        de: {
            metaTitle: "Terraza Brisa Cafe | Terrasse, Sport und Live-Musik",
            metaDescription: "Premium-Cafe mit grosser Terrasse, Sport auf Grossbildschirm und Live-Musik am Wochenende.",
            brandPlace: "Apartment Cafe",
            nav: ["Cafe", "Sport", "Musik", "Karte", "Galerie", "Reservieren"],
            actions: { reserve: "Tisch reservieren", whatsapp: "WhatsApp", call: "Anrufen", menu: "Karte ansehen", events: "Events ansehen", send: "Anfrage senden" },
            hero: { eyebrow: "Cafe, Terrasse und Freizeit im Komplex", title: "Ihre Terrasse fuer Fruehstueck, Spielabend und entspannte Naechte.", copy: "Ein einladendes, elegantes Cafe fuer Bewohner und Besucher: Kaffee am Morgen, lockeres Essen, Sport auf Grossbildschirm, Drinks zum Sonnenuntergang und jedes Wochenende Live-Musik.", metrics: [["3", "Bereiche: Terrasse, Lounge und Sportbereich"], ["7/7", "geoeffnet fuer Fruehstueck, Abendessen und Drinks"], ["ES · EN · DE", "Service fuer internationale Gaeste"]] },
            about: { eyebrow: "Willkommen", title: "Ein Treffpunkt im Komplex, mit Urlaubsgefuehl das ganze Jahr.", lead: "Terraza Brisa Cafe verbindet den Komfort eines vertrauten Cafes mit dem Charakter eines sozialen Treffpunkts: grosszuegige Tische, herzlicher Service, flexible Karte und Bereiche fuer jede Tageszeit.", labels: ["Grosse Terrasse", "Grossbildschirm", "Live-Musik"], features: [["sun", "Grosse Aussenterrasse", "Schattige Tische, Pflanzen und warmes Licht fuer ruhiges Fruehstueck, Essen im Freien und lange Abende."], ["coffee", "Zwei Innenbereiche", "Eine ruhige Lounge fuer Gespraeche und ein lebendigerer Bereich fuer Sport, Gruppen und Events."], ["users", "Fuer Bewohner und Touristen", "Klarer, herzlicher Service fuer spanische, englische, deutsche und weitere internationale Gaeste."]] },
            highlights: { eyebrow: "Highlights", title: "Drei Gruende wiederzukommen", lead: "Das Erlebnis dreht sich um Terrasse, Sport und Musik, mit einer Karte, die zu jedem Plan passt.", items: [["terrace", "Terrasse im Mittelpunkt", "Der natuerliche Ort fuer Fruehstueck, Lesen, Treffen oder einen Drink beim Sonnenuntergang."], ["sports", "Sport auf Grossbildschirm", "Fussball, Tennis, Motorsport und internationale Events in einem bequemen, gut sichtbaren Bereich."], ["music", "Live-Musik am Wochenende", "Akustik-Sets, sanfter Jazz und lokale Kuenstler schaffen Atmosphaere mit Komfort."]] },
            sports: { eyebrow: "Grossbildschirm", title: "Ihr Sportbereich fuer Spiele, Finals und grosse Events.", lead: "Wir planen wichtige Uebertragungen unter der Woche und schaffen Stimmung bei besonderen Spielen. Sie suchen ein bestimmtes Event? Kontaktieren Sie uns, wir bereiten es vor.", panelTitle: "Was wir normalerweise zeigen", panelText: "Nationaler und internationaler Fussball, Champions League, Premier League, LaLiga, Tennisturniere, Formel 1, MotoGP und saisonale Spezialwettbewerbe.", tags: ["Fussball", "Tennis", "Formel 1", "MotoGP", "Private Events"], listTitle: "Naechste Uebertragungen", events: [["Fr", "14", "Jun", "Europaeischer Fussballabend", "Topspiel mit Sound im Raum und Tischreservierung fuer Gruppen.", "20:30", "Bildschirmbereich"], ["Sa", "15", "Jun", "Tennisnachmittag", "Halbfinal-Session mit Kaffee, Tapas und kalten Getraenken.", "17:00", "Innenlounge"], ["So", "16", "Jun", "Grand Prix live", "Motorsport auf Grossbildschirm mit lockerer Karte fuer einen entspannten Renntag.", "14:00", "Sportbereich"]] },
            music: { eyebrow: "Wochenende", title: "Live-Musik, um den Tag mit anderem Rhythmus zu beenden.", lead: "Jedes Wochenende reservieren wir Raum fuer nahe, angenehme Auftritte: gute Lautstaerke, lokale Kuenstler und eine Atmosphaere fuer Paare, Familien und Freunde.", events: [["Fr", "21", "Jun", "Acoustic Sunset", "Laura Medina Duo", "20:30", "Akustische Covers und sanfter Soul fuer Abendessen und Drinks."], ["Sa", "22", "Jun", "Jazz & Terrace", "Blue Palm Trio", "21:00", "Warmer Jazz mit Kontrabass, Gitarre und leichter Percussion."], ["So", "23", "Jun", "Latin Easy Night", "Mar de Fondo", "19:30", "Entspannte Latin-Rhythmen zum Abschluss des Wochenendes."]] },
            menu: { eyebrow: "Editierbare Karte", title: "Vom Morgen bis zur Nacht", lead: "Preise und Gerichte sind nach Kategorien geordnet, damit die Karte einfach aktualisiert werden kann.", categories: { breakfast: "Fruehstueck", coffee: "Kaffee und Getraenke", tapas: "Essen und Tapas", dinner: "Abendessen", cocktails: "Cocktails" }, items: {} },
            gallery: { eyebrow: "Galerie", title: "Bereiche fuer jeden Moment", lead: "Bilder der Atmosphaere, die das Erlebnis praegt: Terrasse, Innenraum, Bildschirm, Musik und Speisen.", labels: ["Aussenterrasse", "Sportbereich", "Live-Musik", "Innenambiente", "Kaffee und Speisen"] },
            hours: { eyebrow: "Oeffnungszeiten", title: "Jeden Tag geoeffnet", lead: "Spezielle Zeiten fuer Sport und Musik werden in der Agenda und per WhatsApp bekannt gegeben.", rows: [["Montag bis Donnerstag", "08:00 - 23:00"], ["Freitag", "08:00 - 01:00"], ["Samstag", "09:00 - 01:00"], ["Sonntag", "09:00 - 23:30"], ["Spezielle Events", "Laut Programm"]] },
            contact: { eyebrow: "Reservierung und Kontakt", title: "Tisch reservieren oder Event anfragen.", lead: "Fuer Gruppen, bestimmte Spiele oder Live-Musik-Abende kontaktieren Sie uns bitte fruehzeitig, damit wir den passenden Bereich vorbereiten.", cards: ["Telefon", "WhatsApp", "E-Mail", "Standort"], form: { title: "Anfrage senden", name: "Name", email: "E-Mail", phone: "Telefon", people: "Personen", date: "Datum", type: "Art der Reservierung", message: "Nachricht", placeholders: ["Ihr Name", "sie@email.com", "+34 ...", "2", "Sagen Sie uns, ob Sie zum Fruehstueck, Spiel, Abendessen oder zur Live-Musik kommen."], options: ["Tischreservierung", "Sportevent", "Live-Musik", "Private Gruppe", "Andere Anfrage"], success: "Anfrage vorbereitet. Ihr E-Mail-Programm wird geoeffnet, damit Sie sie senden koennen.", errors: { required: "Pflichtfeld", email: "Bitte gueltige E-Mail eingeben", people: "Mindestens 1 Person" } } },
            reviews: { eyebrow: "Bewertungen", title: "Ein Erlebnis, das man gerne empfiehlt", items: [["Wir lieben es, so einen Ort direkt im Komplex zu haben. Ruhiges Fruehstueck am Morgen und schoene Stimmung am Abend.", "Marta R., Bewohnerin"], ["Great terrace, friendly service and the football area was exactly what we needed for the match.", "James K., visitor"], ["Sehr angenehme Atmosphaere, gute Cocktails und Live-Musik am Wochenende. Wir kommen wieder.", "Anna M., Gast"]] },
            footer: { text: "Cafe, Terrasse, Sport und Live-Musik in einem Apartmentkomplex mit internationaler Atmosphaere.", contact: "Kontakt", explore: "Entdecken", legal: "Rechtliches", legalLinks: ["Impressum", "Datenschutz", "Cookies"], copyright: "© 2026 Terraza Brisa Cafe. Alle Rechte vorbehalten.", note: "Inhalte fuer einfache Bearbeitung von Karte, Zeiten und Events in app.js vorbereitet." }
        }
    };

    DICT.en.menu.items = {
        breakfast: [["Mediterranean toast", "Artisan bread, fresh tomato, olive oil and serrano ham.", "6.50 €"], ["Yoghurt and fruit bowl", "Creamy yoghurt, fresh fruit, granola and honey.", "7.20 €"], ["Brisa breakfast", "Coffee, fresh juice, toast of your choice and mini pastry.", "9.80 €"]],
        coffee: [["Specialty coffee", "Espresso, cortado, latte or cappuccino with your choice of milk.", "2.20 €"], ["Terrace iced latte", "Cold coffee, milk, ice and a touch of vanilla.", "4.60 €"], ["Mint lemonade", "Fresh lemon, mint and sparkling water.", "4.90 €"]],
        tapas: [["Cheese and fruit board", "Local selection, nuts and a mild chutney.", "14.50 €"], ["Brisa bravas potatoes", "Smoked sauce, light aioli and fresh herbs.", "8.40 €"], ["Grilled chicken wrap", "Marinated chicken, vegetables, yoghurt sauce and salad.", "11.90 €"]],
        dinner: [["Atlantic salad", "Green leaves, avocado, prawns and citrus vinaigrette.", "13.80 €"], ["Terrace burger", "Selected beef, mature cheese, sweet onion and potatoes.", "15.50 €"], ["Creamy mushroom pasta", "Sauteed mushrooms, parmesan and a soft truffle oil.", "14.90 €"]],
        cocktails: [["House spritz", "Citrus aperitif, cava, soda and fresh orange.", "8.50 €"], ["Brisa mojito", "Rum, lime, mint and brown sugar.", "8.90 €"], ["Tropical mocktail", "Mango, lime, ginger ale and fresh fruit.", "6.80 €"]]
    };
    DICT.de.menu.items = {
        breakfast: [["Mediterraner Toast", "Handwerksbrot, frische Tomate, Olivenoel und Serrano-Schinken.", "6,50 €"], ["Joghurt-Frucht-Bowl", "Cremiger Joghurt, frisches Obst, Granola und Honig.", "7,20 €"], ["Brisa Fruehstueck", "Kaffee, frischer Saft, Toast nach Wahl und Mini-Gebaeck.", "9,80 €"]],
        coffee: [["Spezialitaetenkaffee", "Espresso, Cortado, Latte oder Cappuccino mit Milch nach Wahl.", "2,20 €"], ["Terrace Iced Latte", "Kalter Kaffee, Milch, Eis und ein Hauch Vanille.", "4,60 €"], ["Minz-Limonade", "Frische Zitrone, Minze und Sprudelwasser.", "4,90 €"]],
        tapas: [["Kaese- und Fruchtplatte", "Lokale Auswahl, Nuesse und mildes Chutney.", "14,50 €"], ["Brisa Patatas Bravas", "Rauchige Sauce, leichter Aioli und frische Kraeuter.", "8,40 €"], ["Gegrillter Chicken Wrap", "Mariniertes Huhn, Gemuese, Joghurtsauce und Salat.", "11,90 €"]],
        dinner: [["Atlantik-Salat", "Gruene Blaetter, Avocado, Garnelen und Zitrus-Vinaigrette.", "13,80 €"], ["Terrassen-Burger", "Ausgewaehltes Rindfleisch, gereifter Kaese, suesse Zwiebel und Kartoffeln.", "15,50 €"], ["Cremige Pilz-Pasta", "Gebratene Pilze, Parmesan und mildes Trueffeloel.", "14,90 €"]],
        cocktails: [["Haus-Spritz", "Zitrus-Aperitif, Cava, Soda und frische Orange.", "8,50 €"], ["Brisa Mojito", "Rum, Limette, Minze und brauner Zucker.", "8,90 €"], ["Tropical Mocktail", "Mango, Limette, Ginger Ale und frisches Obst.", "6,80 €"]]
    };

    var navIds = ["about", "sports", "music", "menu", "gallery", "contact"];
    var activeMenuCategory = "breakfast";
    var currentLang = localStorage.getItem("terraza_brisa_lang") || "es";

    function esc(value) {
        return String(value).replace(/[&<>"']/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
        });
    }

    function icon(name) {
        var paths = {
            coffee: '<path d="M5 8h10v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M15 9h2a2 2 0 0 1 0 4h-2"/><path d="M4 20h12"/><path d="M7 4v1"/><path d="M11 4v1"/>',
            phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z"/>',
            message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
            mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="m22 6-10 7L2 6"/>',
            map: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
            calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>',
            screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/>',
            music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
            sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/>',
            users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
            menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
            star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.8L12 17.7 5.8 21l1.2-6.8-5-4.8 6.9-1Z"/>',
            instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
            facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>'
        };
        return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.coffee) + "</svg>";
    }

    function langSwitcher(extraClass) {
        return '<div class="language ' + (extraClass || "") + '" role="group">' + LANGUAGES.map(function (item) {
            return '<button type="button" class="' + (currentLang === item.code ? "active" : "") + '" data-lang="' + item.code + '" title="' + esc(item.name) + '">' + item.label + "</button>";
        }).join("") + "</div>";
    }

    function brand(t) {
        return '<a href="#top" class="brand"><span class="brand-mark">' + icon("coffee") + '</span><span><span class="brand-name">Terraza Brisa</span><span class="brand-place">' + esc(t.brandPlace) + "</span></span></a>";
    }

    function eventCard(item) {
        return '<article class="event-card reveal"><div class="date-box"><div><span>' + esc(item[0]) + "</span><strong>" + esc(item[1]) + "</strong><span>" + esc(item[2]) + "</span></div></div><div><h3>" + esc(item[3]) + "</h3><p>" + esc(item[4]) + '</p><div class="event-meta"><span>' + esc(item[5]) + "</span><span>" + esc(item[6]) + "</span></div></div></article>";
    }

    function renderMenuCards(t) {
        return t.menu.items[activeMenuCategory].map(function (item) {
            return '<article class="menu-card reveal"><header><h3>' + esc(item[0]) + '</h3><span class="price">' + esc(item[2]) + "</span></header><p>" + esc(item[1]) + "</p></article>";
        }).join("");
    }

    function render() {
        var t = DICT[currentLang] || DICT.es;
        document.documentElement.lang = currentLang;
        document.title = t.metaTitle;
        var meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute("content", t.metaDescription);

        var nav = navIds.map(function (id, index) {
            return '<a href="#' + id + '">' + esc(t.nav[index]) + "</a>";
        }).join("");

        var html = "";
        html += '<header class="site-header"><div class="container header-inner">' + brand(t) + '<nav class="nav">' + nav + '</nav><div class="header-actions">' + langSwitcher("") + '<a class="icon-btn" href="' + CONTACT.phoneHref + '">' + icon("phone") + '</a><a class="btn primary" href="#contact">' + icon("calendar") + esc(t.actions.reserve) + '</a><button class="menu-toggle" type="button">' + icon("menu") + "</button></div></div></header>";

        html += '<main><section id="top" class="hero"><div class="container hero-inner"><div class="hero-copy reveal"><p class="eyebrow">' + esc(t.hero.eyebrow) + "</p><h1>" + esc(t.hero.title) + "</h1><p>" + esc(t.hero.copy) + '</p><div class="hero-actions"><a class="btn primary" href="#contact">' + icon("calendar") + esc(t.actions.reserve) + '</a><a class="btn light" href="#menu">' + icon("coffee") + esc(t.actions.menu) + '</a><a class="btn light" href="' + CONTACT.whatsappHref + '" target="_blank" rel="noreferrer">' + icon("message") + esc(t.actions.whatsapp) + '</a></div><div class="hero-metrics">' + t.hero.metrics.map(function (m) { return '<div class="metric"><strong>' + esc(m[0]) + "</strong><span>" + esc(m[1]) + "</span></div>"; }).join("") + "</div></div></div></section>";

        html += '<section id="about" class="section"><div class="container intro-grid"><div class="image-stack reveal"><div class="main-photo"><span class="photo-label">' + esc(t.about.labels[0]) + '</span></div><div class="mini-row"><div class="mini-photo sports"><span class="photo-label">' + esc(t.about.labels[1]) + '</span></div><div class="mini-photo music"><span class="photo-label">' + esc(t.about.labels[2]) + '</span></div></div></div><div class="reveal"><p class="eyebrow">' + esc(t.about.eyebrow) + "</p><h2>" + esc(t.about.title) + '</h2><p class="lead">' + esc(t.about.lead) + '</p><div class="feature-list">' + t.about.features.map(function (f) { return '<article class="feature"><span class="feature-icon">' + icon(f[0]) + "</span><div><h3>" + esc(f[1]) + "</h3><p>" + esc(f[2]) + "</p></div></article>"; }).join("") + "</div></div></div></section>";

        html += '<section class="section alt"><div class="container"><div class="section-head center reveal"><p class="eyebrow">' + esc(t.highlights.eyebrow) + "</p><h2>" + esc(t.highlights.title) + '</h2><p class="lead">' + esc(t.highlights.lead) + '</p></div><div class="highlight-grid">' + t.highlights.items.map(function (item) { return '<article class="card reveal"><div class="card-media ' + item[0] + '"></div><div class="card-body"><h3>' + esc(item[1]) + "</h3><p>" + esc(item[2]) + "</p></div></article>"; }).join("") + "</div></div></section>";

        html += '<section id="sports" class="section dark"><div class="container events-layout"><aside class="screen-panel reveal"><div class="screen-image"></div><div class="screen-body"><p class="eyebrow">' + esc(t.sports.eyebrow) + "</p><h2>" + esc(t.sports.title) + "</h2><p>" + esc(t.sports.lead) + '</p><div class="pills">' + t.sports.tags.map(function (tag) { return '<span class="pill">' + icon("screen") + esc(tag) + "</span>"; }).join("") + '</div></div></aside><div><div class="section-head reveal"><div><h2>' + esc(t.sports.panelTitle) + '</h2><p class="lead">' + esc(t.sports.panelText) + '</p></div><a class="btn light" href="' + CONTACT.whatsappHref + '" target="_blank" rel="noreferrer">' + icon("message") + esc(t.actions.whatsapp) + "</a></div><h3>" + esc(t.sports.listTitle) + '</h3><div class="event-list">' + t.sports.events.map(eventCard).join("") + "</div></div></div></section>";

        html += '<section id="music" class="section"><div class="container"><div class="section-head reveal"><div><p class="eyebrow">' + esc(t.music.eyebrow) + "</p><h2>" + esc(t.music.title) + '</h2><p class="lead">' + esc(t.music.lead) + '</p></div><a class="btn ghost" href="#contact">' + icon("calendar") + esc(t.actions.reserve) + '</a></div><div class="music-grid">' + t.music.events.map(function (event) { return '<article class="card music-card reveal"><div class="music-thumb"></div><div class="card-body"><div class="date-box"><div><span>' + esc(event[0]) + "</span><strong>" + esc(event[1]) + "</strong><span>" + esc(event[2]) + "</span></div></div><h3>" + esc(event[3]) + "</h3><p><strong>" + esc(event[4]) + "</strong> · " + esc(event[5]) + "</p><p>" + esc(event[6]) + "</p></div></article>"; }).join("") + "</div></div></section>";

        html += '<section id="menu" class="section alt"><div class="container"><div class="section-head reveal"><div><p class="eyebrow">' + esc(t.menu.eyebrow) + "</p><h2>" + esc(t.menu.title) + '</h2><p class="lead">' + esc(t.menu.lead) + '</p></div><a class="btn dark" href="#contact">' + icon("calendar") + esc(t.actions.reserve) + '</a></div><div class="menu-toolbar reveal" role="tablist">' + Object.keys(t.menu.categories).map(function (key) { return '<button type="button" class="tab ' + (key === activeMenuCategory ? "active" : "") + '" data-menu="' + key + '">' + esc(t.menu.categories[key]) + "</button>"; }).join("") + '</div><div class="menu-grid">' + renderMenuCards(t) + "</div></div></section>";

        html += '<section id="gallery" class="section"><div class="container"><div class="section-head center reveal"><p class="eyebrow">' + esc(t.gallery.eyebrow) + "</p><h2>" + esc(t.gallery.title) + '</h2><p class="lead">' + esc(t.gallery.lead) + '</p></div><div class="gallery-grid">' + t.gallery.labels.map(function (label, index) { return '<div class="gallery-item reveal ' + (index === 0 ? "large" : "") + '"><span>' + esc(label) + "</span></div>"; }).join("") + "</div></div></section>";

        html += '<section id="contact" class="section alt"><div class="container"><div class="hours-contact"><div class="reveal"><p class="eyebrow">' + esc(t.hours.eyebrow) + "</p><h2>" + esc(t.hours.title) + '</h2><p class="lead">' + esc(t.hours.lead) + '</p><div class="hours-list">' + t.hours.rows.map(function (row) { return '<div class="hours-row"><strong>' + esc(row[0]) + "</strong><span>" + esc(row[1]) + "</span></div>"; }).join("") + '</div></div><div class="reveal"><p class="eyebrow">' + esc(t.contact.eyebrow) + "</p><h2>" + esc(t.contact.title) + '</h2><p class="lead">' + esc(t.contact.lead) + '</p><div class="contact-grid">' + contactCards(t) + '</div></div></div><div class="form-map">' + formHtml(t) + '<div id="map" class="map reveal"><iframe title="Terraza Brisa Cafe map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="' + CONTACT.mapsEmbed + '"></iframe></div></div></div></section>';

        html += '<section class="section"><div class="container"><div class="section-head center reveal"><p class="eyebrow">' + esc(t.reviews.eyebrow) + "</p><h2>" + esc(t.reviews.title) + '</h2></div><div class="testimonial-grid">' + t.reviews.items.map(function (item) { return '<article class="testimonial reveal"><div class="stars" aria-hidden="true">' + [1, 2, 3, 4, 5].map(function () { return icon("star"); }).join("") + "</div><blockquote>“" + esc(item[0]) + "”</blockquote><cite>" + esc(item[1]) + "</cite></article>"; }).join("") + "</div></div></section></main>";

        html += '<footer class="site-footer"><div class="container"><div class="footer-grid"><div>' + brand(t) + "<p>" + esc(t.footer.text) + '</p><div class="socials"><a class="social" href="' + CONTACT.instagram + '" target="_blank" rel="noreferrer" aria-label="Instagram">' + icon("instagram") + '</a><a class="social" href="' + CONTACT.facebook + '" target="_blank" rel="noreferrer" aria-label="Facebook">' + icon("facebook") + '</a><a class="social" href="' + CONTACT.tripadvisor + '" target="_blank" rel="noreferrer" aria-label="Tripadvisor">' + icon("star") + '</a></div></div><div><h3>' + esc(t.footer.contact) + '</h3><div class="footer-links"><a href="' + CONTACT.phoneHref + '">' + esc(CONTACT.phone) + '</a><a href="' + CONTACT.whatsappHref + '" target="_blank" rel="noreferrer">' + esc(t.actions.whatsapp) + '</a><a href="mailto:' + CONTACT.email + '">' + CONTACT.email + '</a></div></div><div><h3>' + esc(t.footer.explore) + '</h3><div class="footer-links">' + nav + '</div></div><div><h3>' + esc(t.footer.legal) + '</h3><div class="footer-links">' + t.footer.legalLinks.map(function (label) { return '<a href="mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(label) + '">' + esc(label) + "</a>"; }).join("") + "</div>" + langSwitcher("footer-language") + '</div></div><div class="footer-bottom"><span>' + esc(t.footer.copyright) + "</span><span>" + esc(t.footer.note) + "</span></div></div></footer>";

        document.getElementById("root").innerHTML = html;
        bindEvents();
        reveal();
    }

    function contactCards(t) {
        var cards = [
            ["phone", t.contact.cards[0], CONTACT.phone, CONTACT.phoneHref],
            ["message", t.contact.cards[1], t.actions.whatsapp, CONTACT.whatsappHref],
            ["mail", t.contact.cards[2], CONTACT.email, "mailto:" + CONTACT.email],
            ["map", t.contact.cards[3], CONTACT.address, "#map"]
        ];
        return cards.map(function (card) {
            var target = card[3].indexOf("http") === 0 ? ' target="_blank" rel="noreferrer"' : "";
            return '<a class="contact-panel" href="' + card[3] + '"' + target + '><span class="contact-icon">' + icon(card[0]) + '</span><span><span>' + esc(card[1]) + "</span><strong>" + esc(card[2]) + "</strong></span></a>";
        }).join("");
    }

    function formHtml(t) {
        var f = t.contact.form;
        return '<form class="form-panel reveal" id="contactForm" novalidate><h3>' + esc(f.title) + '</h3><div class="field-grid">' +
            field("name", f.name, "text", f.placeholders[0]) +
            field("email", f.email, "email", f.placeholders[1]) +
            field("phone", f.phone, "text", f.placeholders[2]) +
            field("people", f.people, "number", f.placeholders[3], ' min="1" value="2"') +
            field("date", f.date, "date", "", "") +
            '<div class="field"><label for="type">' + esc(f.type) + '</label><select id="type" name="type">' + f.options.map(function (option) { return "<option>" + esc(option) + "</option>"; }).join("") + '</select><span class="error"></span></div>' +
            '<div class="field full"><label for="message">' + esc(f.message) + '</label><textarea id="message" name="message" placeholder="' + esc(f.placeholders[4]) + '"></textarea><span class="error" data-error="message"></span></div>' +
            '</div><button class="btn dark" type="submit">' + icon("mail") + esc(DICT[currentLang].actions.send) + '</button><p class="form-status" id="formStatus"></p></form>';
    }

    function field(id, label, type, placeholder, extra) {
        return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" name="' + id + '" type="' + type + '" placeholder="' + esc(placeholder || "") + '"' + (extra || "") + '><span class="error" data-error="' + id + '"></span></div>';
    }

    function bindEvents() {
        document.querySelectorAll("[data-lang]").forEach(function (button) {
            button.addEventListener("click", function () {
                currentLang = button.getAttribute("data-lang");
                localStorage.setItem("terraza_brisa_lang", currentLang);
                render();
            });
        });

        var menuToggle = document.querySelector(".menu-toggle");
        var nav = document.querySelector(".nav");
        if (menuToggle && nav) {
            menuToggle.addEventListener("click", function () {
                nav.classList.toggle("open");
                document.body.classList.toggle("menu-open", nav.classList.contains("open"));
            });
            nav.querySelectorAll("a").forEach(function (link) {
                link.addEventListener("click", function () {
                    nav.classList.remove("open");
                    document.body.classList.remove("menu-open");
                });
            });
        }

        document.querySelectorAll("[data-menu]").forEach(function (button) {
            button.addEventListener("click", function () {
                activeMenuCategory = button.getAttribute("data-menu");
                var t = DICT[currentLang] || DICT.es;
                document.querySelector(".menu-grid").innerHTML = renderMenuCards(t);
                document.querySelectorAll("[data-menu]").forEach(function (tab) {
                    tab.classList.toggle("active", tab.getAttribute("data-menu") === activeMenuCategory);
                });
                reveal();
            });
        });

        var form = document.getElementById("contactForm");
        if (form) form.addEventListener("submit", submitForm);
    }

    function submitForm(event) {
        event.preventDefault();
        var t = DICT[currentLang] || DICT.es;
        var f = t.contact.form;
        var data = {
            name: value("name"),
            email: value("email"),
            phone: value("phone"),
            people: value("people"),
            date: value("date"),
            type: value("type"),
            message: value("message")
        };
        var errors = {};
        if (!data.name) errors.name = f.errors.required;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = f.errors.email;
        if (!data.phone) errors.phone = f.errors.required;
        if (!data.people || Number(data.people) < 1) errors.people = f.errors.people;
        if (!data.date) errors.date = f.errors.required;
        if (!data.message) errors.message = f.errors.required;

        document.querySelectorAll("[data-error]").forEach(function (node) {
            var key = node.getAttribute("data-error");
            node.textContent = errors[key] || "";
        });

        if (Object.keys(errors).length) return;

        localStorage.setItem("terraza_brisa_last_enquiry", JSON.stringify(Object.assign({}, data, { sentAt: new Date().toISOString() })));
        document.getElementById("formStatus").textContent = f.success;
        var subject = encodeURIComponent("Reserva Terraza Brisa Cafe - " + data.type);
        var body = encodeURIComponent("Nombre: " + data.name + "\nEmail: " + data.email + "\nTelefono: " + data.phone + "\nPersonas: " + data.people + "\nFecha: " + data.date + "\nTipo: " + data.type + "\n\nMensaje:\n" + data.message);
        window.location.href = "mailto:" + CONTACT.email + "?subject=" + subject + "&body=" + body;
    }

    function value(id) {
        var node = document.getElementById(id);
        return node ? node.value.trim() : "";
    }

    function reveal() {
        document.querySelectorAll(".reveal").forEach(function (element) {
            var rect = element.getBoundingClientRect();
            if (rect.top < window.innerHeight - 60) element.classList.add("visible");
        });
    }

    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);
    document.addEventListener("DOMContentLoaded", render);
})();
