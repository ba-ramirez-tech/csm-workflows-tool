import { randomUUID } from "crypto";
import { IntakeTokenStatus, type Prisma } from "@prisma/client";
import { addDays } from "@/lib/intake/token";
import { prisma } from "@/lib/prisma";

/** Usable intake link: not submitted, not past expiry, not terminal status. */
export async function getActiveIntakeToken(clientId: string) {
  const now = new Date();
  return prisma.intakeToken.findFirst({
    where: {
      clientId,
      response: { is: null },
      expiresAt: { gt: now },
      status: { notIn: [IntakeTokenStatus.EXPIRED, IntakeTokenStatus.COMPLETED] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createIntakeTokenRecord(
  clientId: string,
  partialData: Prisma.InputJsonValue = {},
) {
  const token = randomUUID();
  const expiresAt = addDays(new Date(), 30);
  return prisma.intakeToken.create({
    data: {
      clientId,
      token,
      expiresAt,
      status: IntakeTokenStatus.PENDING,
      currentStep: 1,
      partialData,
    },
  });
}

/** Create a link if the client has no active one. */
export async function ensureActiveIntakeToken(clientId: string) {
  const existing = await getActiveIntakeToken(clientId);
  if (existing) return existing;
  return createIntakeTokenRecord(clientId, {});
}

/**
 * Remove all non-submitted intake tokens for this client, then create a fresh link.
 * Does not delete tokens tied to a submitted response.
 */
export async function regenerateIntakeToken(clientId: string, partialData: Prisma.InputJsonValue = {}) {
  await prisma.intakeToken.deleteMany({
    where: { clientId, response: { is: null } },
  });
  return createIntakeTokenRecord(clientId, partialData);
}
