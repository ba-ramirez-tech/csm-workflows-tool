import { z } from "zod";

const contactMethod = z.enum(["whatsapp", "email", "phone"]);
const prefLang = z.enum(["fr", "es", "en", "de"]);

export const intakeStep1Schema = z
  .object({
    fullName: z.string().trim().min(1, "Indiquez votre nom."),
    email: z.string().trim().email("Email invalide."),
    phonePrefix: z.string().min(1),
    phoneLocal: z.string().trim().min(1, "Indiquez votre numéro."),
    contactMethod,
    /** Language for documents, emails, roadbook — also drives intake UI locale. */
    preferredLanguage: prefLang,
    /** Languages the traveler speaks (subset of fr|es|en|de). */
    spokenLanguages: z.array(prefLang).min(1, "Sélectionnez au moins une langue parlée."),
    /** Preferred guide/host language on the trip — must be one of spokenLanguages. */
    guideLanguage: prefLang,
  })
  .superRefine((d, ctx) => {
    if (!d.spokenLanguages.includes(d.guideLanguage)) {
      ctx.addIssue({
        code: "custom",
        message: "Choisissez une langue de guide parmi celles que vous parlez.",
        path: ["guideLanguage"],
      });
    }
  });

export const intakeStep2Schema = z
  .object({
    tripTypes: z.array(z.string()).min(1, "Choisissez au moins un type."),
    numTravelers: z.number().int().min(1).max(20),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    datesFlexible: z.boolean(),
    flexibleSeason: z.string().optional(),
    tripDurationDays: z.number().int().min(3).max(30),
    regions: z.array(z.string()).min(1, "Choisissez au moins une région."),
  })
  .superRefine((data, ctx) => {
    if (!data.datesFlexible) {
      if (!data.dateFrom || !data.dateTo) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez vos dates ou cochez « Dates flexibles ».",
          path: ["dateFrom"],
        });
      }
    } else {
      if (!data.flexibleSeason) {
        ctx.addIssue({
          code: "custom",
          message: "Choisissez une période.",
          path: ["flexibleSeason"],
        });
      }
    }
  });

export const intakeStep3Schema = z.object({
  budgetBand: z.string().min(1, "Choisissez une fourchette."),
  accommodationStyles: z.array(z.string()).min(1, "Choisissez au moins un style."),
  amenities: z.array(z.string()),
});

export const intakeStep4Schema = z.object({
  activities: z.array(z.string()).min(1, "Choisissez au moins une activité."),
  diningPreferences: z.array(z.string()).min(1),
  pace: z.enum(["relaxed", "balanced", "intense"]),
});

export const intakeStep5Schema = z
  .object({
    dietaryNotes: z.string().optional(),
    medicalNotes: z.string().optional(),
    insurance: z.enum(["yes", "recommendations", "unknown"]),
    visa: z.enum(["eu_schengen", "other", "advice"]),
    visaOtherDetail: z.string().optional(),
    flights: z.enum(["yes", "help", "self"]),
  })
  .superRefine((d, ctx) => {
    if (d.visa === "other" && !(d.visaOtherDetail ?? "").trim()) {
      ctx.addIssue({ code: "custom", message: "Précisez votre passeport.", path: ["visaOtherDetail"] });
    }
  });

export const intakeStep6Schema = z
  .object({
    priorityOrder: z.array(z.string()).min(8),
    freeText: z.string().optional(),
    referralSource: z.string().min(1, "Indiquez comment vous nous avez connus."),
    consent: z.boolean().refine((v) => v === true, { message: "Le consentement est requis." }),
    /** Drip / nurture emails */
    marketingOptIn: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.priorityOrder.length < 3) {
      ctx.addIssue({ code: "custom", message: "Classez les priorités.", path: ["priorityOrder"] });
    }
  });

/** International flight hints — all optional; used for transfer coordination. */
export const intakeStep7Schema = z.object({
  arrivalAirline: z.string().optional(),
  arrivalFlightNumber: z.string().optional(),
  arrivalDate: z.string().optional(),
  arrivalTime: z.string().optional(),
  arrivalCity: z.string().optional(),
  departureAirline: z.string().optional(),
  departureFlightNumber: z.string().optional(),
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  departureCity: z.string().optional(),
});

export const intakeFullSchema = z.object({
  step1: intakeStep1Schema,
  step2: intakeStep2Schema,
  step3: intakeStep3Schema,
  step4: intakeStep4Schema,
  step5: intakeStep5Schema,
  step6: intakeStep6Schema,
  step7: intakeStep7Schema,
});

export type IntakeFullInput = z.infer<typeof intakeFullSchema>;
export type IntakeStep1 = z.infer<typeof intakeStep1Schema>;
export type IntakeStep2 = z.infer<typeof intakeStep2Schema>;
export type IntakeStep3 = z.infer<typeof intakeStep3Schema>;
export type IntakeStep4 = z.infer<typeof intakeStep4Schema>;
export type IntakeStep5 = z.infer<typeof intakeStep5Schema>;
export type IntakeStep6 = z.infer<typeof intakeStep6Schema>;
export type IntakeStep7 = z.infer<typeof intakeStep7Schema>;

export const stepSchemas = [
  intakeStep1Schema,
  intakeStep2Schema,
  intakeStep3Schema,
  intakeStep4Schema,
  intakeStep5Schema,
  intakeStep6Schema,
  intakeStep7Schema,
] as const;
