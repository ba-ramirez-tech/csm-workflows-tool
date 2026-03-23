import { NextResponse } from "next/server";
import { sendDripEmail } from "@/lib/email/send";
import { getPublicAppUrl } from "@/lib/email/client";
import { addDays } from "@/lib/intake/token";
import { REGIONS } from "@/lib/intake/options";
import { prisma } from "@/lib/prisma";

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type DripStep = 0 | 1 | 2 | 3;

function regionFromResponse(full: unknown): string | undefined {
  if (!full || typeof full !== "object") return undefined;
  const step2 = (full as { step2?: { regions?: string[] } }).step2;
  const key = step2?.regions?.[0];
  if (!key) return undefined;
  return REGIONS.find((r) => r.value === key)?.label ?? key;
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const sequences = await prisma.dripSequence.findMany({
    where: {
      isActive: true,
      nextSendAt: { lte: now },
      client: { marketingOptOut: false },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      intakeResponse: { select: { fullResponse: true, marketingOptIn: true } },
    },
  });

  let sent = 0;
  const base = getPublicAppUrl();

  for (const seq of sequences) {
    if (seq.intakeResponse && seq.intakeResponse.marketingOptIn === false) {
      await prisma.dripSequence.update({
        where: { id: seq.id },
        data: { isActive: false, completedAt: now, nextSendAt: null },
      });
      continue;
    }

    if (!seq.client.email) {
      await prisma.dripSequence.update({
        where: { id: seq.id },
        data: { isActive: false, completedAt: now, nextSendAt: null },
      });
      continue;
    }

    const step = seq.currentStep as DripStep;
    const firstName = seq.client.name.trim().split(/\s+/)[0] ?? "Bonjour";
    const unsub =
      seq.intakeResponse?.marketingOptIn !== false
        ? `${base}/intake/unsubscribe?clientId=${encodeURIComponent(seq.clientId)}`
        : undefined;
    const regionLabel = regionFromResponse(seq.intakeResponse?.fullResponse);

    const templates = ["drip_travel_tips", "drip_region", "drip_itinerary_teaser", "drip_checkin"] as const;
    const template = templates[step];
    if (!template) {
      await prisma.dripSequence.update({
        where: { id: seq.id },
        data: { isActive: false, completedAt: now, nextSendAt: null },
      });
      continue;
    }

    const result = await sendDripEmail(template, {
      to: seq.client.email,
      clientId: seq.clientId,
      firstName,
      regionLabel: template === "drip_region" ? regionLabel : undefined,
      unsubscribeUrl: unsub,
    });

    if (!result.ok) continue;

    sent += 1;
    const nextStep = step + 1;
    if (nextStep >= 4) {
      await prisma.dripSequence.update({
        where: { id: seq.id },
        data: {
          currentStep: nextStep,
          isActive: false,
          completedAt: now,
          nextSendAt: null,
        },
      });
    } else {
      const dayOffsets = [7, 14, 21];
      const nextAt = addDays(seq.startedAt, dayOffsets[nextStep - 1]);
      await prisma.dripSequence.update({
        where: { id: seq.id },
        data: {
          currentStep: nextStep,
          nextSendAt: nextAt,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, due: sequences.length, sent });
}
