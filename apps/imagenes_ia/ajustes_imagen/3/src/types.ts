export type Language = 'es' | 'en' | 'de';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  tags?: string[];
  isPopular?: boolean;
}

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface SportEvent {
  id: string;
  date: string; // e.g., "Mier, 10 Jun" / "Wed, Jun 10" / "Mi, 10. Jun"
  time: string;
  sport: 'football' | 'tennis' | 'formula1' | 'basketball' | 'golf' | 'other';
  title: string;
  competition: string;
  isLive?: boolean;
}

export interface LiveMusicEvent {
  id: string;
  date: string; // e.g., "Sab, 13 Jun" / "Sat, Jun 13" / "Sa, 13. Jun"
  time: string;
  artist: string;
  genre: string;
  description: string;
  image: string; // url
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  source: 'google' | 'tripadvisor' | 'direct';
  date: string;
}

export interface Translations {
  nav: {
    about: string;
    sports: string;
    music: string;
    menu: string;
    gallery: string;
    schedule: string;
    contact: string;
    reviews: string;
  };
  hero: {
    subtitle: string;
    title: string;
    desc: string;
    ctaReserve: string;
    ctaMenu: string;
  };
  about: {
    title: string;
    subtitle: string;
    desc1: string;
    desc2: string;
    terraceTitle: string;
    terraceDesc: string;
    ambience1Title: string;
    ambience1Desc: string;
    ambience2Title: string;
    ambience2Desc: string;
  };
  sports: {
    title: string;
    subtitle: string;
    desc: string;
    upcoming: string;
    liveIndicator: string;
    noEvents: string;
    filterAll: string;
    competition: string;
  };
  music: {
    title: string;
    subtitle: string;
    desc: string;
    upcoming: string;
    hours: string;
    bookTable: string;
  };
  menu: {
    title: string;
    subtitle: string;
    desc: string;
    breakfast: string;
    coffees: string;
    lunchTapas: string;
    dinner: string;
    cocktails: string;
    popular: string;
    allergensNote: string;
  };
  gallery: {
    title: string;
    subtitle: string;
    filterAll: string;
    filterTerrace: string;
    filterInterior: string;
    filterSports: string;
    filterMusic: string;
    filterProducts: string;
  };
  schedule: {
    title: string;
    subtitle: string;
    weekdays: string;
    weekdaysTime: string;
    weekends: string;
    weekendsTime: string;
    specialEvents: string;
    specialEventsTime: string;
    tagline: string;
  };
  contact: {
    title: string;
    subtitle: string;
    reserveButton: string;
    sendMessage: string;
    formName: string;
    formEmail: string;
    formPhone: string;
    formDate: string;
    formTime: string;
    formGuests: string;
    formMessage: string;
    formNotes: string;
    formSubmitReserve: string;
    formSubmitMessage: string;
    contactInfo: string;
    phoneLabel: string;
    whatsappLabel: string;
    emailLabel: string;
    addressLabel: string;
    successReserve: string;
    successMessage: string;
    mapTitle: string;
  };
  reviews: {
    title: string;
    subtitle: string;
    addReview: string;
    formAuthor: string;
    formRating: string;
    formComment: string;
    formSubmit: string;
    successReview: string;
  };
  footer: {
    desc: string;
    rights: string;
    legalTerms: string;
    privacyPolicy: string;
  };
}
