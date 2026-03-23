"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type NoteResult = { ok: true } | { ok: false; error: string };

function serializeAnswer(v: unknown): { answerValue: string; answerJson: object | undefined } {
  if (v === null || v === undefined) return { answerValue: "", answerJson: undefined };
  if (typeof v === "boolean") return { answerValue: v ? "true" : "false", answerJson: undefined };
  if (typeof v === "string") return { answerValue: v.slice(0, 2000), answerJson: undefined };
  if (typeof v === "number") return { answerValue: String(v), answerJson: undefined };
  if (Array.isArray(v)) return { answerValue: v.join(", ").slice(0, 2000), answerJson: { items: v } as object };
  try {
    const s = JSON.stringify(v);
    return { answerValue: s.slice(0, 2000), answerJson: v as object };
  } catch {
    return { answerValue: String(v).slice(0, 2000), answerJson: undefined };
  }
}

export async function saveDiscoveryAgentNoteAction(formData: FormData): Promise<NoteResult> {
  const clientId = String(formData.get("clientId") ?? "");
  const questionKey = String(formData.get("questionKey") ?? "");
  const noteRaw = String(formData.get("agentNote") ?? "").trim();
  const answerSnapshot = formData.get("answerSnapshot");
  const snapshotStr =
    typeof answerSnapshot === "string" ? answerSnapshot.slice(0, 2000) : "";

  if (!clientId || !questionKey) return { ok: false, error: "Données invalides." };

  const user = getCurrentUser();
  const now = new Date();

  if (!noteRaw) {
    await prisma.clientPreference.updateMany({
      where: { clientId, questionKey },
      data: { agentNote: null, agentNoteBy: null, agentNoteAt: null },
    });
    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true };
  }

  const existing = await prisma.clientPreference.findUnique({
    where: { clientId_questionKey: { clientId, questionKey } },
  });

  if (existing) {
    await prisma.clientPreference.update({
      where: { id: existing.id },
      data: {
        agentNote: noteRaw.slice(0, 4000),
        agentNoteBy: user.name,
        agentNoteAt: now,
      },
    });
  } else {
    const { answerValue, answerJson } = serializeAnswer(snapshotStr || null);
    await prisma.clientPreference.create({
      data: {
        clientId,
        questionKey,
        answerValue: answerValue || "—",
        answerJson: answerJson ?? undefined,
        agentNote: noteRaw.slice(0, 4000),
        agentNoteBy: user.name,
        agentNoteAt: now,
      },
    });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}
