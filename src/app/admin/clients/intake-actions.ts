"use server";

import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
import { sendIntakeInviteEmail } from "@/lib/email/send";
import { getPublicAppUrl } from "@/lib/email/client";
import { prisma } from "@/lib/prisma";
import { regenerateIntakeToken } from "@/lib/admin/client-intake";
import { logIntakeInviteEmailSent } from "@/lib/log-touchpoint";

export type ActionState = { ok: true; token?: string; message?: string } | { ok: false; error: string };

function buildPartialFromPrefill(
  prefillName: string,
  prefillEmail: string,
  clientName: string,
  clientEmail: string | null,
): Prisma.InputJsonValue {
  if (!prefillName && !prefillEmail) return {};
  return {
    step1: {
      fullName: prefillName || clientName,
      email: prefillEmail || clientEmail || "",
    },
  };
}

/** Replaces any non-submitted intake link with a new 30-day token. */
export async function regenerateIntakeLinkAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { ok: false, error: "Client manquant." };

  const prefillName = String(formData.get("prefillName") ?? "").trim();
  const prefillEmail = String(formData.get("prefillEmail") ?? "").trim();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client introuvable." };

  const partialData = buildPartialFromPrefill(prefillName, prefillEmail, client.name, client.email);

  const row = await regenerateIntakeToken(clientId, partialData);

  if (prefillName || prefillEmail) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(prefillName ? { name: prefillName } : {}),
        ...(prefillEmail ? { email: prefillEmail } : {}),
      },
    });
  }

  revalidatePath(`/admin/clients/${clientId}/intake`);
  revalidatePath("/admin/intakes");
  return { ok: true, token: row.token, message: "Nouveau lien actif." };
}

export async function sendIntakeInviteAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const clientId = String(formData.get("clientId") ?? "");
  const publicToken = String(formData.get("publicToken") ?? "");
  if (!clientId || !publicToken) return { ok: false, error: "Données invalides." };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.email) return { ok: false, error: "Ajoutez une adresse email au client." };

  const firstName = client.name.trim().split(/\s+/)[0] ?? "Bonjour";
  const base = getPublicAppUrl();
  const intakeUrl = `${base}/intake/${publicToken}`;

  const result = await sendIntakeInviteEmail({
    to: client.email,
    clientId,
    firstName,
    intakeUrl,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Envoi impossible." };

  await logIntakeInviteEmailSent(clientId, intakeUrl).catch(() => {});

  return { ok: true, message: "Invitation envoyée." };
}
