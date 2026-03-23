/** Machine keys → default FR labels (i18n-ready: swap locale file later). */
export const INTAKE_LOCALE = "fr" as const;

export const PHONE_PREFIXES = [
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+57", label: "🇨🇴 +57" },
  { value: "+32", label: "🇧🇪 +32" },
  { value: "+41", label: "🇨🇭 +41" },
  { value: "+1", label: "🇺🇸 +1" },
] as const;

export const CONTACT_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
] as const;

export const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
] as const;

export const TRIP_TYPES = [
  { value: "adventure", label: "Aventure" },
  { value: "cultural", label: "Culturel" },
  { value: "romantic", label: "Romantique" },
  { value: "family", label: "Familial" },
  { value: "wellness", label: "Bien-être & détente" },
  { value: "gastronomic", label: "Gastronomique" },
  { value: "ecotourism", label: "Écotourisme" },
  { value: "bleisure", label: "Affaires + loisirs (bleisure)" },
] as const;

export const FLEXIBLE_SEASONS = [
  { value: "jan_mar", label: "Janvier–Mars" },
  { value: "apr_jun", label: "Avril–Juin" },
  { value: "jul_sep", label: "Juillet–Septembre" },
  { value: "oct_dec", label: "Octobre–Décembre" },
  { value: "undecided", label: "Pas encore décidé" },
] as const;

export type RegionOption = {
  value: string;
  label: string;
  /** CSS gradient for card (no external image required for MVP) */
  gradient: string;
};

export const REGIONS: RegionOption[] = [
  { value: "bogota", label: "Bogotá & alentours", gradient: "linear-gradient(135deg,#2D6A4F,#1B4332)" },
  {
    value: "cartagena",
    label: "Carthagène & côte Caraïbe",
    gradient: "linear-gradient(135deg,#D4A853,#C49A3C)",
  },
  {
    value: "medellin_coffee",
    label: "Medellín & Eje Cafetero",
    gradient: "linear-gradient(135deg,#40916C,#2D6A4F)",
  },
  { value: "amazon", label: "Amazonie", gradient: "linear-gradient(135deg,#0F2B1F,#1B4332)" },
  {
    value: "san_andres",
    label: "San Andrés & Providencia",
    gradient: "linear-gradient(135deg,#5CA4C4,#3A7CA5)",
  },
  {
    value: "boyaca",
    label: "Boyacá & Villa de Leyva",
    gradient: "linear-gradient(135deg,#8B7355,#6B5B3E)",
  },
  { value: "cali_pacific", label: "Cali & Pacifique", gradient: "linear-gradient(135deg,#C44536,#9B3429)" },
  {
    value: "tayrona",
    label: "Sierra Nevada & Tayrona",
    gradient: "linear-gradient(135deg,#52796F,#354F52)",
  },
  { value: "surprise", label: "Laissez-nous vous surprendre", gradient: "linear-gradient(135deg,#D4A853,#B8942D)" },
];

export const BUDGET_BANDS = [
  { value: "economy", label: "Économique (< 1 500 €)" },
  { value: "comfort", label: "Confort (1 500 – 3 000 €)" },
  { value: "premium", label: "Premium (3 000 – 5 000 €)" },
  { value: "luxury", label: "Luxe (5 000 € +)" },
  { value: "discuss", label: "Je préfère en discuter" },
] as const;

export const ACCOMMODATION_STYLES = [
  { value: "boutique_hotel", label: "Hôtel boutique" },
  { value: "ecolodge", label: "Écolodge" },
  { value: "finca", label: "Finca traditionnelle" },
  { value: "hostel", label: "Hostel / Auberge" },
  { value: "airbnb", label: "Airbnb / Appartement" },
  { value: "resort", label: "Resort / All-inclusive" },
  { value: "glamping", label: "Glamping" },
  { value: "homestay", label: "Chez l'habitant" },
] as const;

export const AMENITIES = [
  { value: "pool", label: "Piscine" },
  { value: "wifi", label: "Wi-Fi fiable" },
  { value: "ac", label: "Climatisation" },
  { value: "breakfast", label: "Petit-déjeuner inclus" },
  { value: "parking", label: "Parking" },
  { value: "accessible", label: "Accessible PMR" },
] as const;

export const ACTIVITIES = [
  { value: "trekking", label: "Randonnée / Trekking", icon: "🥾" },
  { value: "diving", label: "Plongée / Snorkeling", icon: "🤿" },
  { value: "birding", label: "Observation d'oiseaux", icon: "🦜" },
  { value: "cooking", label: "Cours de cuisine", icon: "👨‍🍳" },
  { value: "salsa", label: "Salsa / Danse", icon: "💃" },
  { value: "coffee_cacao", label: "Café & cacao (fincas)", icon: "☕" },
  { value: "art", label: "Art & street art", icon: "🎨" },
  { value: "markets", label: "Marchés locaux", icon: "🛍️" },
  { value: "yoga", label: "Yoga & méditation", icon: "🧘" },
  { value: "watersports", label: "Sports nautiques", icon: "🏄" },
  { value: "photography", label: "Photographie", icon: "📷" },
  { value: "nightlife", label: "Vie nocturne", icon: "🌙" },
  { value: "community", label: "Volontariat / communautaire", icon: "🤝" },
] as const;

export const DINING = [
  { value: "local", label: "Cuisine locale authentique" },
  { value: "vegetarian", label: "Végétarien / Végan" },
  { value: "fine", label: "Fine dining" },
  { value: "street", label: "Street food" },
  { value: "gluten_free", label: "Sans gluten" },
  { value: "halal", label: "Halal" },
  { value: "none", label: "Pas de restriction" },
] as const;

export const PACE_OPTIONS = [
  {
    value: "relaxed",
    title: "Tranquille",
    desc: "Beaucoup de temps libre",
    icon: "🐢",
  },
  {
    value: "balanced",
    title: "Équilibré",
    desc: "Mix activités et repos",
    icon: "⚖️",
  },
  {
    value: "intense",
    title: "Intense",
    desc: "Remplir chaque journée",
    icon: "🚀",
  },
] as const;

export const INSURANCE_OPTIONS = [
  { value: "yes", label: "Oui, déjà souscrite" },
  { value: "recommendations", label: "Non, j'aimerais des recommandations" },
  { value: "unknown", label: "Je ne sais pas encore" },
] as const;

export const VISA_OPTIONS = [
  { value: "eu_schengen", label: "Passeport UE / Schengen" },
  { value: "other", label: "Passeport autre (préciser)" },
  { value: "advice", label: "J'ai besoin de conseils" },
] as const;

export const FLIGHT_OPTIONS = [
  { value: "yes", label: "Oui" },
  { value: "help", label: "Non, j'aimerais de l'aide" },
  { value: "self", label: "Non, je m'en occupe" },
] as const;

export const PRIORITY_KEYS = [
  "authenticity",
  "comfort",
  "adventure",
  "gastronomy",
  "nature",
  "culture",
  "relaxation",
  "local_meetings",
] as const;

export const PRIORITY_LABELS: Record<(typeof PRIORITY_KEYS)[number], string> = {
  authenticity: "Authenticité",
  comfort: "Confort",
  adventure: "Aventure",
  gastronomy: "Gastronomie",
  nature: "Nature",
  culture: "Culture & histoire",
  relaxation: "Détente",
  local_meetings: "Rencontres locales",
};

export const REFERRAL_SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "word_of_mouth", label: "Bouche à oreille" },
  { value: "google", label: "Google" },
  { value: "event", label: "Salon / Événement" },
  { value: "other", label: "Autre" },
] as const;

export const DURATION_TICKS = [5, 7, 10, 14, 21] as const;
