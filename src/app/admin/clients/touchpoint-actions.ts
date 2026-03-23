"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { logTouchpoint } from "@/lib/log-touchpoint";

export type TouchpointActionState = { ok: true } | { ok: false; error: string };

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  return t.length ? t : undefined;
}

/** Single-argument shape so client components can call `await createManualTouchpointAction(fd)` reliably. */
export async function createManualTouchpointAction(formData: FormData): Promise<TouchpointActionState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const summary = emptyToUndef(String(formData.get("summary") ?? ""));
  const direction = String(formData.get("direction") ?? "outbound").trim() || "outbound";
  const category = String(formData.get("category") ?? "follow_up").trim() || "follow_up";
  const outcome = emptyToUndef(String(formData.get("outcome") ?? ""));
  const bookingId = emptyToUndef(String(formData.get("bookingId") ?? ""));
  const attachmentUrl = emptyToUndef(String(formData.get("attachmentUrl") ?? ""));
  const externalRef = emptyToUndef(String(formData.get("externalRef") ?? ""));
  const durationRaw = String(formData.get("duration") ?? "").trim();
  const duration =
    durationRaw === "" || Number.isNaN(Number(durationRaw)) ? undefined : Math.max(0, Math.floor(Number(durationRaw)));

  if (!clientId || !channel) return { ok: false, error: "Données invalides." };
  if (!subject) return { ok: false, error: "Le sujet est obligatoire." };

  const user = getCurrentUser();

  const needsDuration = channel === "call" || channel === "meeting" || channel === "video_call";
  const finalDuration = needsDuration ? duration : undefined;

  try {
    await logTouchpoint({
      clientId,
      bookingId,
      channel,
      category,
      direction,
      subject,
      summary,
      outcome,
      attachmentUrl,
      externalRef,
      duration: finalDuration,
      agentId: user.id,
      agentName: user.name,
    });
  } catch (e) {
    console.error("createManualTouchpointAction", e);
    return { ok: false, error: "Enregistrement impossible. Vérifiez la base de données." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  return { ok: true };
}
