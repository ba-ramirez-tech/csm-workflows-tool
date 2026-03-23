import type { z } from "zod";
import type { IntakeLang } from "@/lib/intake/intake-lang";
import { intakeFullSchema } from "@/lib/intake/schema";
import {
  accommodationLabel,
  activityLabel,
  amenityLabel,
  budgetLabel,
  contactMethodLabel,
  diningLabel,
  flexibleSeasonLabel,
  flightOptLabel,
  insuranceLabel,
  languageChoiceLabel,
  paceTitle,
  priorityLabel,
  referralLabel,
  regionCardLabel,
  tripTypeLabel,
  visaLabel,
} from "@/lib/intake/intake-options-i18n";
import { intakeField } from "@/lib/intake/intake-field-labels";
import { formatIntakeFlightReview, intakeT } from "@/lib/intake/intake-ui";
import { travelerSummaryLabel } from "@/lib/intake/intake-field-labels";

export type IntakeParsed = z.infer<typeof intakeFullSchema>;

export type DiscoverySectionId = "trip" | "interests" | "accommodation" | "practical" | "language";

export type DiscoveryFieldDef = {
  key: string;
  section: DiscoverySectionId;
  label: string;
  kind: "single" | "multi" | "text" | "boolean";
  answered: (d: IntakeParsed) => boolean;
  /** Human-readable lines (badges or quote lines). */
  lines: (d: IntakeParsed, lang: IntakeLang) => string[];
};

const lang: IntakeLang = "fr";

export const DISCOVERY_INTAKE_FIELDS: DiscoveryFieldDef[] = [
  {
    key: "intake.step1.preferredLanguage",
    section: "language",
    label: "Langue des documents",
    kind: "single",
    answered: (x) => !!x.step1?.preferredLanguage,
    lines: (x) => [languageChoiceLabel(lang, x.step1.preferredLanguage)],
  },
  {
    key: "intake.step1.spokenLanguages",
    section: "language",
    label: "Langues parlées",
    kind: "multi",
    answered: (x) => (x.step1.spokenLanguages?.length ?? 0) > 0,
    lines: (x) => x.step1.spokenLanguages.map((c) => languageChoiceLabel(lang, c)),
  },
  {
    key: "intake.step1.guideLanguage",
    section: "language",
    label: "Langue préférée pour les guides",
    kind: "single",
    answered: (x) => !!x.step1?.guideLanguage,
    lines: (x) => [languageChoiceLabel(lang, x.step1.guideLanguage)],
  },
  {
    key: "intake.step1.contactMethod",
    section: "language",
    label: "Contact préféré",
    kind: "single",
    answered: (x) => !!x.step1?.contactMethod,
    lines: (x) => [contactMethodLabel(lang, x.step1.contactMethod)],
  },
  {
    key: "intake.step2.tripTypes",
    section: "trip",
    label: "Types de voyage",
    kind: "multi",
    answered: (x) => (x.step2.tripTypes?.length ?? 0) > 0,
    lines: (x) => x.step2.tripTypes.map((t) => tripTypeLabel(lang, t)),
  },
  {
    key: "intake.step2.numTravelers",
    section: "trip",
    label: "Nombre de voyageurs",
    kind: "single",
    answered: (x) => x.step2.numTravelers > 0,
    lines: (x) => [
      `${x.step2.numTravelers} — ${travelerSummaryLabel(lang, x.step2.numTravelers)}`,
    ],
  },
  {
    key: "intake.step2.tripDurationDays",
    section: "trip",
    label: "Durée",
    kind: "single",
    answered: (x) => x.step2.tripDurationDays > 0,
    lines: (x) => [`${x.step2.tripDurationDays} ${intakeField(lang, "s2.days")}`],
  },
  {
    key: "intake.step2.dates",
    section: "trip",
    label: "Dates",
    kind: "text",
    answered: (x) =>
      x.step2.datesFlexible
        ? !!x.step2.flexibleSeason
        : !!(x.step2.dateFrom || x.step2.dateTo),
    lines: (x) => {
      if (x.step2.datesFlexible) {
        return x.step2.flexibleSeason
          ? [flexibleSeasonLabel(lang, x.step2.flexibleSeason)]
          : [];
      }
      const a = [x.step2.dateFrom, x.step2.dateTo].filter(Boolean).join(" → ");
      return a ? [a] : [];
    },
  },
  {
    key: "intake.step2.regions",
    section: "trip",
    label: "Régions d’intérêt",
    kind: "multi",
    answered: (x) => (x.step2.regions?.length ?? 0) > 0,
    lines: (x) => x.step2.regions.map((r) => regionCardLabel(lang, r)),
  },
  {
    key: "intake.step3.budgetBand",
    section: "trip",
    label: "Budget",
    kind: "single",
    answered: (x) => !!x.step3.budgetBand,
    lines: (x) => [budgetLabel(lang, x.step3.budgetBand)],
  },
  {
    key: "intake.step3.accommodationStyles",
    section: "accommodation",
    label: "Styles d’hébergement",
    kind: "multi",
    answered: (x) => (x.step3.accommodationStyles?.length ?? 0) > 0,
    lines: (x) => x.step3.accommodationStyles.map((a) => accommodationLabel(lang, a)),
  },
  {
    key: "intake.step3.amenities",
    section: "accommodation",
    label: "Indispensables",
    kind: "multi",
    answered: (x) => (x.step3.amenities?.length ?? 0) > 0,
    lines: (x) => x.step3.amenities.map((a) => amenityLabel(lang, a)),
  },
  {
    key: "intake.step4.activities",
    section: "interests",
    label: "Activités",
    kind: "multi",
    answered: (x) => (x.step4.activities?.length ?? 0) > 0,
    lines: (x) => x.step4.activities.map((a) => activityLabel(lang, a)),
  },
  {
    key: "intake.step4.diningPreferences",
    section: "interests",
    label: "Restauration",
    kind: "multi",
    answered: (x) => (x.step4.diningPreferences?.length ?? 0) > 0,
    lines: (x) => x.step4.diningPreferences.map((d) => diningLabel(lang, d)),
  },
  {
    key: "intake.step4.pace",
    section: "interests",
    label: "Rythme",
    kind: "single",
    answered: (x) => !!x.step4.pace,
    lines: (x) => [paceTitle(lang, x.step4.pace)],
  },
  {
    key: "intake.step6.priorityOrder",
    section: "interests",
    label: "Priorités (ordre)",
    kind: "multi",
    answered: (x) => (x.step6.priorityOrder?.length ?? 0) > 0,
    lines: (x) => x.step6.priorityOrder.map((p) => priorityLabel(lang, p)),
  },
  {
    key: "intake.step6.freeText",
    section: "interests",
    label: "Précisions / occasion spéciale",
    kind: "text",
    answered: (x) => !!x.step6.freeText?.trim(),
    lines: (x) => (x.step6.freeText?.trim() ? [x.step6.freeText.trim()] : []),
  },
  {
    key: "intake.step6.referralSource",
    section: "practical",
    label: "Comment nous avez-vous connus ?",
    kind: "single",
    answered: (x) => !!x.step6.referralSource,
    lines: (x) => [referralLabel(lang, x.step6.referralSource)],
  },
  {
    key: "intake.step6.marketingOptIn",
    section: "practical",
    label: "Inspiration par email",
    kind: "boolean",
    answered: () => true,
    lines: (x) => [x.step6.marketingOptIn ? "Oui" : "Non"],
  },
  {
    key: "intake.step6.consent",
    section: "practical",
    label: "Consentement données",
    kind: "boolean",
    answered: (x) => x.step6.consent === true,
    lines: (x) => [x.step6.consent ? "Accepté" : "Non accepté"],
  },
  {
    key: "intake.step5.dietaryNotes",
    section: "practical",
    label: "Régime alimentaire",
    kind: "text",
    answered: (x) => !!x.step5.dietaryNotes?.trim(),
    lines: (x) => (x.step5.dietaryNotes?.trim() ? [x.step5.dietaryNotes.trim()] : []),
  },
  {
    key: "intake.step5.medicalNotes",
    section: "practical",
    label: "Santé / mobilité (questionnaire)",
    kind: "text",
    answered: (x) => !!x.step5.medicalNotes?.trim(),
    lines: (x) => (x.step5.medicalNotes?.trim() ? [x.step5.medicalNotes.trim()] : []),
  },
  {
    key: "intake.step5.insurance",
    section: "practical",
    label: "Assurance voyage",
    kind: "single",
    answered: (x) => !!x.step5.insurance,
    lines: (x) => [insuranceLabel(lang, x.step5.insurance)],
  },
  {
    key: "intake.step5.visa",
    section: "practical",
    label: "Visa / passeport",
    kind: "single",
    answered: (x) => !!x.step5.visa,
    lines: (x) => {
      const base = [visaLabel(lang, x.step5.visa)];
      if (x.step5.visa === "other" && x.step5.visaOtherDetail?.trim()) {
        base.push(x.step5.visaOtherDetail.trim());
      }
      return base;
    },
  },
  {
    key: "intake.step5.flights",
    section: "practical",
    label: "Vols (statut)",
    kind: "single",
    answered: (x) => !!x.step5.flights,
    lines: (x) => [flightOptLabel(lang, x.step5.flights)],
  },
  {
    key: "intake.step7",
    section: "practical",
    label: "Vols internationaux (détails)",
    kind: "text",
    answered: (x) => formatIntakeFlightReview(lang, x.step7) !== intakeT(lang, "flight.noneLong"),
    lines: (x) => [formatIntakeFlightReview(lang, x.step7)],
  },
];

export const DISCOVERY_SECTION_LABELS: Record<DiscoverySectionId, string> = {
  trip: "À propos du voyage",
  interests: "Intérêts & style",
  accommodation: "Hébergement",
  practical: "Détails pratiques",
  language: "Langue & communication",
};

export function parseIntakeFull(raw: unknown): IntakeParsed | null {
  const p = intakeFullSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function buildDiscoverySummary(data: IntakeParsed): string[] {
  const lines: string[] = [];
  lines.push(
    `${travelerSummaryLabel(lang, data.step2.numTravelers)} · ${data.step2.tripDurationDays} j`,
  );
  if (data.step2.datesFlexible) {
    lines.push(
      data.step2.flexibleSeason
        ? flexibleSeasonLabel(lang, data.step2.flexibleSeason)
        : "Dates flexibles",
    );
  } else if (data.step2.dateFrom || data.step2.dateTo) {
    lines.push([data.step2.dateFrom, data.step2.dateTo].filter(Boolean).join(" → "));
  }
  if (data.step3.budgetBand) lines.push(budgetLabel(lang, data.step3.budgetBand));
  lines.push(`Guide : ${languageChoiceLabel(lang, data.step1.guideLanguage)}`);
  const top = data.step6.priorityOrder.slice(0, 3).map((k) => priorityLabel(lang, k));
  if (top.length) lines.push(`Priorités : ${top.join(", ")}`);
  if (data.step6.freeText?.trim()) lines.push(`Note : ${data.step6.freeText.trim()}`);
  return lines;
}
