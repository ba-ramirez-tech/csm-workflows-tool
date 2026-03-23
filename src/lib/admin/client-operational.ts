import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

/** Ensures the client has a non-null operational form token for /operational/[token]. */
export async function ensureOperationalFormToken(clientId: string): Promise<string> {
  const row = await prisma.client.findUnique({
    where: { id: clientId },
    select: { operationalFormToken: true },
  });
  if (!row) throw new Error("Client not found");
  if (row.operationalFormToken) return row.operationalFormToken;
  const token = randomUUID();
  await prisma.client.update({
    where: { id: clientId },
    data: { operationalFormToken: token },
  });
  return token;
}
