"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeOperationalPayload,
  type OperationalPayload,
} from "@/lib/operational/types";

export type ActionState = { ok: true; token?: string } | { ok: false; error: string };

async function upsertDetails(clientId: string, data: OperationalPayload) {
  const passportJson = data.passportNames as object;
  await prisma.clientOperationalDetails.upsert({
    where: { clientId },
    create: {
      clientId,
      numAdults: data.numAdults,
      numChildren: data.numChildren,
      childrenAges: data.childrenAges,
      roomComposition: data.roomComposition,
      numRooms: data.numRooms,
      passportNames: passportJson,
      medicalNotes: data.medicalNotes,
      mobilityNotes: data.mobilityNotes,
      arrivalInfo: data.arrivalInfo,
      departureInfo: data.departureInfo,
      specialRequests: data.specialRequests,
      travelInsurance: data.travelInsurance,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelation: data.emergencyContactRelation,
    },
    update: {
      numAdults: data.numAdults,
      numChildren: data.numChildren,
      childrenAges: data.childrenAges,
      roomComposition: data.roomComposition,
      numRooms: data.numRooms,
      passportNames: passportJson,
      medicalNotes: data.medicalNotes,
      mobilityNotes: data.mobilityNotes,
      arrivalInfo: data.arrivalInfo,
      departureInfo: data.departureInfo,
      specialRequests: data.specialRequests,
      travelInsurance: data.travelInsurance,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelation: data.emergencyContactRelation,
    },
  });
}

export async function saveClientOperationalDetailsAction(
  clientId: string,
  raw: Partial<OperationalPayload>,
): Promise<ActionState> {
  if (!clientId) return { ok: false, error: "Client manquant." };
  const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!exists) return { ok: false, error: "Client introuvable." };

  const data = normalizeOperationalPayload(raw);
  try {
    await upsertDetails(clientId, data);
  } catch (e) {
    console.error("saveClientOperationalDetailsAction", e);
    return { ok: false, error: "Enregistrement impossible. Vérifiez la console serveur." };
  }
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

export async function regenerateOperationalLinkAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { ok: false, error: "Client manquant." };
  const token = randomUUID();
  await prisma.client.update({
    where: { id: clientId },
    data: { operationalFormToken: token },
  });
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, token };
}
