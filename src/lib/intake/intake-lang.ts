import { z } from "zod";

export const INTAKE_LANGS = ["fr", "en", "es", "de"] as const;
export type IntakeLang = (typeof INTAKE_LANGS)[number];

export const intakeLangSchema = z.enum(INTAKE_LANGS);

export function isIntakeLang(s: string): s is IntakeLang {
  return INTAKE_LANGS.includes(s as IntakeLang);
}

export function normalizeIntakeLang(s: string | undefined | null): IntakeLang {
  const v = s ?? "";
  return isIntakeLang(v) ? v : "fr";
}
