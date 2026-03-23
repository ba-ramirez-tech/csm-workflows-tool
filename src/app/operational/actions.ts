"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  normalizeOperationalPayload,
  type OperationalPayload,
} from "@/lib/operational/types";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitOperationalFormAction(
  token: string,
  raw: Partial<OperationalPayload>,
): Promise<SubmitResult> {
  if (!token) return { ok: false, error: "Lien invalide." };
  const client = await prisma.client.findUnique({
    where: { operationalFormToken: token },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Lien invalide ou expiré." };

  const data = normalizeOperationalPayload(raw);
  const passportJson = data.passportNames as object;

  await prisma.clientOperationalDetails.upsert({
    where: { clientId: client.id },
    create: {
      clientId: client.id,
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

  revalidatePath(`/admin/clients/${client.id}`);
  return { ok: true };
}
