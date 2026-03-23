import { IntakeTokenStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LoadedIntakeToken = NonNullable<Awaited<ReturnType<typeof loadIntakeToken>>>;

export type IntakeSessionResult =
  | { ok: true; token: LoadedIntakeToken }
  | { ok: false; reason: "not_found" | "completed" | "expired" };

export async function loadIntakeToken(rawToken: string) {
  return prisma.intakeToken.findUnique({
    where: { token: rawToken },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          preferredLanguage: true,
          spokenLanguages: true,
          guideLanguage: true,
        },
      },
      response: { select: { id: true } },
    },
  });
}

export async function validateIntakeSession(rawToken: string): Promise<IntakeSessionResult> {
  const row = await loadIntakeToken(rawToken);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.response) return { ok: false, reason: "completed" };

  const now = new Date();
  if (row.expiresAt < now) {
    if (row.status !== IntakeTokenStatus.EXPIRED) {
      await prisma.intakeToken.update({
        where: { id: row.id },
        data: { status: IntakeTokenStatus.EXPIRED },
      });
    }
    return { ok: false, reason: "expired" };
  }

  return { ok: true, token: row };
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export type IntakePageState =
  | { kind: "not_found" }
  | { kind: "expired" }
  | { kind: "completed"; clientName: string }
  | {
      kind: "active";
      token: string;
      client: {
        name: string;
        email: string | null;
        phone: string | null;
        preferredLanguage: string;
        spokenLanguages: string[];
        guideLanguage: string | null;
      };
      partialData: unknown;
      currentStep: number;
    };

/** For the public intake page only — allows rendering a “déjà envoyé” state after submission. */
export async function getIntakePageState(rawToken: string): Promise<IntakePageState> {
  const row = await prisma.intakeToken.findUnique({
    where: { token: rawToken },
    include: {
      client: {
        select: {
          name: true,
          email: true,
          phone: true,
          preferredLanguage: true,
          spokenLanguages: true,
          guideLanguage: true,
        },
      },
      response: { select: { id: true } },
    },
  });
  if (!row) return { kind: "not_found" };
  if (row.response) {
    return { kind: "completed", clientName: row.client.name };
  }
  const now = new Date();
  if (row.expiresAt < now || row.status === IntakeTokenStatus.EXPIRED) {
    if (row.status !== IntakeTokenStatus.EXPIRED) {
      await prisma.intakeToken.update({
        where: { id: row.id },
        data: { status: IntakeTokenStatus.EXPIRED },
      });
    }
    return { kind: "expired" };
  }
  return {
    kind: "active",
    token: row.token,
    client: row.client,
    partialData: row.partialData,
    currentStep: row.currentStep,
  };
}
