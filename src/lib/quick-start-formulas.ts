export type QuickStartFormulaId = "welcome" | "esencial10" | "completa15" | "gran21";

export type QuickStartFormula = {
  id: QuickStartFormulaId;
  name: string;
  durationDays: number;
  description: string;
  webProductUrl: string;
  /** Lucide icon name for the card */
  icon: "Luggage" | "Route" | "Map" | "Globe2";
};

export const QUICK_START_FORMULAS: QuickStartFormula[] = [
  {
    id: "welcome",
    name: "Welcome Package",
    durationDays: 1,
    description:
      "Airport pickup, city orientation, hotel check-in. The perfect first impression.",
    webProductUrl: "https://www.colombiesurmesure.com/circuits/accueil-en-francais-colombie",
    icon: "Luggage",
  },
  {
    id: "esencial10",
    name: "Colombia Esencial — 10 Days",
    durationDays: 10,
    description: "Bogotá, Coffee Region, Cartagena. The classic first-timer circuit.",
    webProductUrl: "https://www.colombiesurmesure.com/circuits/colombie-10-jours",
    icon: "Route",
  },
  {
    id: "completa15",
    name: "Colombia Completa — 15 Days",
    durationDays: 15,
    description:
      "Bogotá, Coffee Region, Medellín, Tayrona, Cartagena. The comprehensive experience.",
    webProductUrl: "https://www.colombiesurmesure.com/circuits/colombie-15-jours",
    icon: "Map",
  },
  {
    id: "gran21",
    name: "Gran Colombia — 21 Days",
    durationDays: 21,
    description:
      "The full immersion: Andes, Llanos, Pacific or Caribbean coast, colonial heritage, and off-the-beaten-path.",
    webProductUrl: "https://www.colombiesurmesure.com/circuits/colombie-3-semaines",
    icon: "Globe2",
  },
];

export function getQuickStartFormula(id: string): QuickStartFormula | undefined {
  return QUICK_START_FORMULAS.find((f) => f.id === id);
}
