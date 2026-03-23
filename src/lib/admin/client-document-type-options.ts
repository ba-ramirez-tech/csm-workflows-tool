import { ClientDocumentType } from "@prisma/client";

/** UI labels for document type select — must not live in a `"use server"` file. */
export const clientDocumentTypeOptions: { value: ClientDocumentType; label: string }[] = [
  { value: ClientDocumentType.PASSPORT, label: "Passeport" },
  { value: ClientDocumentType.INSURANCE, label: "Assurance" },
  { value: ClientDocumentType.VACCINATION, label: "Vaccination" },
  { value: ClientDocumentType.FLIGHT_INFO, label: "Infos vol" },
  {
    value: ClientDocumentType.SPECIAL_REQUIREMENTS,
    label: "Autres formalités (visa, Check-Mig, permis d’entrée)",
  },
  { value: ClientDocumentType.QUOTATION, label: "Devis / proposition (PDF)" },
  { value: ClientDocumentType.OTHER, label: "Autre" },
];
