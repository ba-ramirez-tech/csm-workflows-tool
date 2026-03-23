import { prisma } from "@/lib/prisma";

export type GuideLanguageGap = {
  destinationId: string;
  destinationName: string;
  guideLanguageCode: string;
  availableLanguageCodes: string[];
};

const LANG_LABEL: Record<string, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
};

export function languageCodeLabel(code: string): string {
  return LANG_LABEL[code] ?? code.toUpperCase();
}

/** Destinations from linked bookings (stages) and quotes (template days) lacking the client’s preferred guide language. */
export async function getGuideLanguageGapsForClient(
  clientId: string,
  guideLanguage: string | null | undefined,
): Promise<GuideLanguageGap[]> {
  if (!guideLanguage) return [];

  const [bookings, quotes] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId },
      select: {
        stages: {
          select: {
            destination: { select: { id: true, name: true, languagesAvailable: true } },
          },
        },
      },
    }),
    prisma.quote.findMany({
      where: { clientId },
      select: {
        template: {
          select: {
            days: {
              select: {
                destination: { select: { id: true, name: true, languagesAvailable: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const byId = new Map<string, { name: string; languagesAvailable: string[] }>();

  for (const b of bookings) {
    for (const s of b.stages) {
      const d = s.destination;
      byId.set(d.id, { name: d.name, languagesAvailable: d.languagesAvailable });
    }
  }
  for (const q of quotes) {
    const days = q.template?.days;
    if (!days) continue;
    for (const day of days) {
      const d = day.destination;
      byId.set(d.id, { name: d.name, languagesAvailable: d.languagesAvailable });
    }
  }

  const gaps: GuideLanguageGap[] = [];
  for (const [destinationId, dest] of byId) {
    if (!dest.languagesAvailable.includes(guideLanguage)) {
      gaps.push({
        destinationId,
        destinationName: dest.name,
        guideLanguageCode: guideLanguage,
        availableLanguageCodes: [...dest.languagesAvailable],
      });
    }
  }
  return gaps;
}
