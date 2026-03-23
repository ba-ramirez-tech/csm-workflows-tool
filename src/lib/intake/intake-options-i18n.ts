import {
  ACCOMMODATION_STYLES,
  ACTIVITIES,
  AMENITIES,
  BUDGET_BANDS,
  CONTACT_METHODS,
  DINING,
  FLEXIBLE_SEASONS,
  FLIGHT_OPTIONS,
  INSURANCE_OPTIONS,
  LANGUAGES,
  PACE_OPTIONS,
  PRIORITY_LABELS,
  REFERRAL_SOURCES,
  REGIONS,
  TRIP_TYPES,
  VISA_OPTIONS,
} from "./options";
import type { IntakeLang } from "./intake-lang";

function frLabel<T extends { value: string; label: string }>(list: readonly T[], value: string) {
  return list.find((x) => x.value === value)?.label ?? value;
}

/** Per-value translations; missing lang falls back to FR list label. */
type LangMap = Partial<Record<IntakeLang, string>>;

const TRIP: Record<string, LangMap> = {
  adventure: { en: "Adventure", es: "Aventura", de: "Abenteuer" },
  cultural: { en: "Cultural", es: "Cultural", de: "Kulturell" },
  romantic: { en: "Romantic", es: "Romántico", de: "Romantisch" },
  family: { en: "Family", es: "En familia", de: "Familie" },
  wellness: { en: "Wellness & relaxation", es: "Bienestar y descanso", de: "Wellness & Erholung" },
  gastronomic: { en: "Gastronomic", es: "Gastronómico", de: "Kulinarisch" },
  ecotourism: { en: "Ecotourism", es: "Ecoturismo", de: "Ökotourismus" },
  bleisure: { en: "Business + leisure (bleisure)", es: "Negocios + ocio (bleisure)", de: "Business + Freizeit (Bleisure)" },
};

const REGION: Record<string, LangMap> = {
  bogota: { en: "Bogotá & surroundings", es: "Bogotá y alrededores", de: "Bogotá & Umgebung" },
  cartagena: { en: "Cartagena & Caribbean coast", es: "Cartagena y costa Caribe", de: "Cartagena & Karibikküste" },
  medellin_coffee: { en: "Medellín & Coffee Axis", es: "Medellín y Eje Cafetero", de: "Medellín & Kaffeeachse" },
  amazon: { en: "Amazon", es: "Amazonía", de: "Amazonas" },
  san_andres: { en: "San Andrés & Providencia", es: "San Andrés y Providencia", de: "San Andrés & Providencia" },
  boyaca: { en: "Boyacá & Villa de Leyva", es: "Boyacá y Villa de Leyva", de: "Boyacá & Villa de Leyva" },
  cali_pacific: { en: "Cali & Pacific", es: "Cali y Pacífico", de: "Cali & Pazifik" },
  tayrona: { en: "Sierra Nevada & Tayrona", es: "Sierra Nevada y Tayrona", de: "Sierra Nevada & Tayrona" },
  surprise: { en: "Surprise us", es: "Sorpréndanme", de: "Überraschen Sie uns" },
};

const BUDGET: Record<string, LangMap> = {
  economy: {
    en: "Economy (< €1,500)",
    es: "Económico (< 1 500 €)",
    de: "Economy (< 1.500 €)",
  },
  comfort: {
    en: "Comfort (€1,500 – 3,000)",
    es: "Confort (1 500 – 3 000 €)",
    de: "Komfort (1.500 – 3.000 €)",
  },
  premium: {
    en: "Premium (€3,000 – 5,000)",
    es: "Premium (3 000 – 5 000 €)",
    de: "Premium (3.000 – 5.000 €)",
  },
  luxury: {
    en: "Luxury (€5,000+)",
    es: "Lujo (5 000 € +)",
    de: "Luxus (5.000 € +)",
  },
  discuss: {
    en: "I’d prefer to discuss",
    es: "Prefiero hablarlo",
    de: "Möchte ich besprechen",
  },
};

const ACC: Record<string, LangMap> = {
  boutique_hotel: { en: "Boutique hotel", es: "Hotel boutique", de: "Boutique-Hotel" },
  ecolodge: { en: "Ecolodge", es: "Ecolodge", de: "Ökolodge" },
  finca: { en: "Traditional finca", es: "Finca tradicional", de: "Traditionelle Finca" },
  hostel: { en: "Hostel / guesthouse", es: "Hostal / pensión", de: "Hostel / Pension" },
  airbnb: { en: "Airbnb / apartment", es: "Airbnb / apartamento", de: "Airbnb / Apartment" },
  resort: { en: "Resort / all-inclusive", es: "Resort / todo incluido", de: "Resort / All-inclusive" },
  glamping: { en: "Glamping", es: "Glamping", de: "Glamping" },
  homestay: { en: "Homestay", es: "Casa de familia", de: "Bei Gastgebern" },
};

const AMEN: Record<string, LangMap> = {
  pool: { en: "Pool", es: "Piscina", de: "Pool" },
  wifi: { en: "Reliable Wi‑Fi", es: "Wi‑Fi fiable", de: "Zuverlässiges WLAN" },
  ac: { en: "Air conditioning", es: "Aire acondicionado", de: "Klimaanlage" },
  breakfast: { en: "Breakfast included", es: "Desayuno incluido", de: "Frühstück inklusive" },
  parking: { en: "Parking", es: "Aparcamiento", de: "Parkplatz" },
  accessible: { en: "Accessible (PRM)", es: "Accesible PMR", de: "Barrierefrei" },
};

const ACT: Record<string, LangMap> = {
  trekking: { en: "Hiking / trekking", es: "Senderismo / trekking", de: "Wandern / Trekking" },
  diving: { en: "Diving / snorkeling", es: "Buceo / snorkel", de: "Tauchen / Schnorcheln" },
  birding: { en: "Birdwatching", es: "Observación de aves", de: "Vogelbeobachtung" },
  cooking: { en: "Cooking class", es: "Clase de cocina", de: "Kochkurs" },
  salsa: { en: "Salsa / dance", es: "Salsa / baile", de: "Salsa / Tanz" },
  coffee_cacao: { en: "Coffee & cacao (fincas)", es: "Café y cacao (fincas)", de: "Kaffee & Kakao (Fincas)" },
  art: { en: "Art & street art", es: "Arte y street art", de: "Kunst & Street Art" },
  markets: { en: "Local markets", es: "Mercados locales", de: "Lokale Märkte" },
  yoga: { en: "Yoga & meditation", es: "Yoga y meditación", de: "Yoga & Meditation" },
  watersports: { en: "Water sports", es: "Deportes acuáticos", de: "Wassersport" },
  photography: { en: "Photography", es: "Fotografía", de: "Fotografie" },
  nightlife: { en: "Nightlife", es: "Vida nocturna", de: "Nachtleben" },
  community: { en: "Volunteering / community tourism", es: "Voluntariado / turismo comunitario", de: "Freiwilligenarbeit / Community-Tourismus" },
};

const DINE: Record<string, LangMap> = {
  local: { en: "Authentic local cuisine", es: "Cocina local auténtica", de: "Authentische lokale Küche" },
  vegetarian: { en: "Vegetarian / vegan", es: "Vegetariano / vegano", de: "Vegetarisch / vegan" },
  fine: { en: "Fine dining", es: "Alta cocina", de: "Fine Dining" },
  street: { en: "Street food", es: "Comida callejera", de: "Streetfood" },
  gluten_free: { en: "Gluten-free", es: "Sin gluten", de: "Glutenfrei" },
  halal: { en: "Halal", es: "Halal", de: "Halal" },
  none: { en: "No restrictions", es: "Sin restricciones", de: "Keine Einschränkungen" },
};

const PACE: Record<string, LangMap> = {
  relaxed: { en: "Relaxed — plenty of free time", es: "Tranquilo — mucho tiempo libre", de: "Ruhig — viel Freizeit" },
  balanced: { en: "Balanced — mix of activities & rest", es: "Equilibrado — actividades y descanso", de: "Ausgewogen — Mix aus Aktivität & Ruhe" },
  intense: { en: "Intense — fill each day", es: "Intenso — cada día lleno", de: "Intensiv — volle Tage" },
};

const INS: Record<string, LangMap> = {
  yes: { en: "Yes, already covered", es: "Sí, ya contratada", de: "Ja, bereits abgeschlossen" },
  recommendations: { en: "No, I’d like recommendations", es: "No, me gustarían recomendaciones", de: "Nein, ich möchte Empfehlungen" },
  unknown: { en: "Not sure yet", es: "Aún no lo sé", de: "Noch unklar" },
};

const VISA: Record<string, LangMap> = {
  eu_schengen: { en: "EU / Schengen passport", es: "Pasaporte UE / Schengen", de: "EU- / Schengen-Pass" },
  other: { en: "Other passport (specify)", es: "Otro pasaporte (precisar)", de: "Anderer Pass (bitte angeben)" },
  advice: { en: "I need advice", es: "Necesito consejos", de: "Ich brauche Beratung" },
};

const FLT: Record<string, LangMap> = {
  yes: { en: "Yes", es: "Sí", de: "Ja" },
  help: { en: "No, I’d like help", es: "No, me gustaría ayuda", de: "Nein, ich brauche Hilfe" },
  self: { en: "No, I’ll handle it", es: "No, me encargo yo", de: "Nein, kümmere ich mich selbst" },
};

const REF: Record<string, LangMap> = {
  instagram: { en: "Instagram", es: "Instagram", de: "Instagram" },
  facebook: { en: "Facebook", es: "Facebook", de: "Facebook" },
  word_of_mouth: { en: "Word of mouth", es: "Boca a boca", de: "Empfehlung" },
  google: { en: "Google", es: "Google", de: "Google" },
  event: { en: "Fair / event", es: "Feria / evento", de: "Messe / Event" },
  other: { en: "Other", es: "Otro", de: "Sonstiges" },
};

const FLEX: Record<string, LangMap> = {
  jan_mar: { en: "January–March", es: "Enero–marzo", de: "Januar–März" },
  apr_jun: { en: "April–June", es: "Abril–junio", de: "April–Juni" },
  jul_sep: { en: "July–September", es: "Julio–septiembre", de: "Juli–September" },
  oct_dec: { en: "October–December", es: "Octubre–diciembre", de: "Oktober–Dezember" },
  undecided: { en: "Not decided yet", es: "Aún no decidido", de: "Noch offen" },
};

const CONTACT: Record<string, LangMap> = {
  whatsapp: { en: "WhatsApp", es: "WhatsApp", de: "WhatsApp" },
  email: { en: "Email", es: "Correo", de: "E-Mail" },
  phone: { en: "Phone", es: "Teléfono", de: "Telefon" },
};

function pick(map: Record<string, LangMap>, lang: IntakeLang, value: string, frFallback: string) {
  if (lang === "fr") return frFallback;
  return map[value]?.[lang] ?? frFallback;
}

export function contactMethodLabel(lang: IntakeLang, value: string) {
  return pick(CONTACT, lang, value, frLabel(CONTACT_METHODS, value));
}

export function tripTypeLabel(lang: IntakeLang, value: string) {
  return pick(TRIP, lang, value, frLabel(TRIP_TYPES, value));
}

export function regionCardLabel(lang: IntakeLang, value: string) {
  return pick(REGION, lang, value, frLabel(REGIONS, value));
}

export function budgetLabel(lang: IntakeLang, value: string) {
  return pick(BUDGET, lang, value, frLabel(BUDGET_BANDS, value));
}

export function accommodationLabel(lang: IntakeLang, value: string) {
  return pick(ACC, lang, value, frLabel(ACCOMMODATION_STYLES, value));
}

export function amenityLabel(lang: IntakeLang, value: string) {
  return pick(AMEN, lang, value, frLabel(AMENITIES, value));
}

export function activityLabel(lang: IntakeLang, value: string) {
  const fr = ACTIVITIES.find((a) => a.value === value);
  const text = pick(ACT, lang, value, fr?.label ?? value);
  return fr?.icon ? `${fr.icon} ${text}` : text;
}

export function diningLabel(lang: IntakeLang, value: string) {
  return pick(DINE, lang, value, frLabel(DINING, value));
}

export function paceTitle(lang: IntakeLang, value: string) {
  const fr = PACE_OPTIONS.find((p) => p.value === value);
  if (lang === "fr") return fr?.title ?? value;
  return pick(PACE, lang, value, fr?.title ?? value);
}

export function paceDesc(lang: IntakeLang, value: string) {
  const fr = PACE_OPTIONS.find((p) => p.value === value);
  if (!fr) return "";
  if (lang === "fr") return fr.desc;
  const titles: Record<IntakeLang, Record<string, string>> = {
    fr: { relaxed: fr.desc, balanced: fr.desc, intense: fr.desc },
    en: {
      relaxed: "Plenty of free time",
      balanced: "Mix of activities and rest",
      intense: "Fill each day",
    },
    es: {
      relaxed: "Mucho tiempo libre",
      balanced: "Mezcla de actividades y descanso",
      intense: "Cada día bien lleno",
    },
    de: {
      relaxed: "Viel Freizeit",
      balanced: "Mix aus Aktivitäten und Ruhe",
      intense: "Jeden Tag voll",
    },
  };
  return titles[lang][value] ?? fr.desc;
}

export function insuranceLabel(lang: IntakeLang, value: string) {
  return pick(INS, lang, value, frLabel(INSURANCE_OPTIONS, value));
}

export function visaLabel(lang: IntakeLang, value: string) {
  return pick(VISA, lang, value, frLabel(VISA_OPTIONS, value));
}

export function flightOptLabel(lang: IntakeLang, value: string) {
  return pick(FLT, lang, value, frLabel(FLIGHT_OPTIONS, value));
}

export function referralLabel(lang: IntakeLang, value: string) {
  return pick(REF, lang, value, frLabel(REFERRAL_SOURCES, value));
}

export function flexibleSeasonLabel(lang: IntakeLang, value: string) {
  return pick(FLEX, lang, value, frLabel(FLEXIBLE_SEASONS, value));
}

export function languageChoiceLabel(lang: IntakeLang, value: string) {
  const fr = frLabel(LANGUAGES, value);
  if (lang === "fr") return fr;
  const M: Record<string, LangMap> = {
    fr: { en: "French", es: "Francés", de: "Französisch" },
    en: { en: "English", es: "Inglés", de: "Englisch" },
    es: { en: "Spanish", es: "Español", de: "Spanisch" },
    de: { en: "German", es: "Alemán", de: "Deutsch" },
  };
  return M[value]?.[lang] ?? fr;
}

const PRIORITY: Record<string, LangMap> = {
  authenticity: { en: "Authenticity", es: "Autenticidad", de: "Authentizität" },
  comfort: { en: "Comfort", es: "Confort", de: "Komfort" },
  adventure: { en: "Adventure", es: "Aventura", de: "Abenteuer" },
  gastronomy: { en: "Gastronomy", es: "Gastronomía", de: "Gastronomie" },
  nature: { en: "Nature", es: "Naturaleza", de: "Natur" },
  culture: { en: "Culture & history", es: "Cultura e historia", de: "Kultur & Geschichte" },
  relaxation: { en: "Relaxation", es: "Descanso", de: "Entspannung" },
  local_meetings: { en: "Local encounters", es: "Encuentros locales", de: "Begegnungen vor Ort" },
};

export function priorityLabel(lang: IntakeLang, key: string) {
  const fr = PRIORITY_LABELS[key as keyof typeof PRIORITY_LABELS] ?? key;
  return pick(PRIORITY, lang, key, fr);
}
