import { IntakeTokenStatus, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { sendIntakeConfirmationEmail } from "@/lib/email/send";
import { getPublicAppUrl } from "@/lib/email/client";
import { intakeFullSchema } from "@/lib/intake/schema";
import { REGIONS } from "@/lib/intake/options";
import { prisma } from "@/lib/prisma";
import { clientFlightsFromIntakeStep7 } from "@/lib/intake/intake-flights";
import { addDays, validateIntakeSession } from "@/lib/intake/token";
import { getCurrentUser } from "@/lib/auth";
import { logIntakeFormCompleted } from "@/lib/log-touchpoint";

type SubmitBody = {
  token: string;
  data: {
    step1: unknown;
    step2: unknown;
    step3: unknown;
    step4: unknown;
    step5: unknown;
    step6: unknown;
    step7: unknown;
  };
};

function regionLabel(key: string): string {
  return REGIONS.find((r) => r.value === key)?.label ?? key;
}

function buildSummary(data: ReturnType<typeof intakeFullSchema.parse>): string[] {
  const lines: string[] = [];
  const s2 = data.step2;
  lines.push(`${s2.numTravelers} voyageur(s), ${s2.tripDurationDays} jours`);
  if (s2.regions?.length) lines.push(`Régions : ${s2.regions.map(regionLabel).join(", ")}`);
  const s3 = data.step3;
  lines.push(`Budget : ${s3.budgetBand}`);
  const top = data.step6.priorityOrder.slice(0, 3);
  lines.push(`Priorités : ${top.join(", ")}`);
  return lines;
}

export async function POST(req: Request) {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.token || !body.data) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const v = await validateIntakeSession(body.token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, reason: v.reason }, { status: 410 });
  }

  const parsed = intakeFullSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const row = v.token;
  const concierge = getCurrentUser();

  const fullResponse = data as unknown as Prisma.InputJsonValue;

  try {
    await prisma.$transaction(async (tx) => {
      const response = await tx.intakeResponse.create({
        data: {
          tokenId: row.id,
          clientId: row.clientId,
          step1Data: data.step1 as object,
          step2Data: data.step2 as object,
          step3Data: data.step3 as object,
          step4Data: data.step4 as object,
          step5Data: data.step5 as object,
          step6Data: data.step6 as object,
          step7Data: data.step7 as object,
          fullResponse,
          marketingOptIn: data.step6.marketingOptIn ?? true,
        },
      });

      const flightRows = clientFlightsFromIntakeStep7(row.clientId, data.step7);
      if (flightRows.length > 0) {
        await tx.clientFlight.createMany({ data: flightRows });
      }

      await tx.intakeToken.update({
        where: { id: row.id },
        data: {
          status: IntakeTokenStatus.COMPLETED,
          completedAt: new Date(),
          currentStep: 8,
        },
      });

      const phone =
        `${data.step1.phonePrefix}${data.step1.phoneLocal}`.replace(/\s+/g, "") || undefined;

      await tx.client.update({
        where: { id: row.clientId },
        data: {
          name: data.step1.fullName,
          email: data.step1.email,
          phone: phone ?? undefined,
          preferredLanguage: data.step1.preferredLanguage,
          spokenLanguages: data.step1.spokenLanguages,
          guideLanguage: data.step1.guideLanguage,
          marketingOptOut: !data.step6.marketingOptIn,
        },
      });

      if (data.step6.marketingOptIn) {
        const nextDrip = addDays(new Date(), 3);
        await tx.dripSequence.create({
          data: {
            clientId: row.clientId,
            intakeResponseId: response.id,
            sequenceName: "post_intake",
            currentStep: 0,
            nextSendAt: nextDrip,
            isActive: true,
          },
        });
      }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  await logIntakeFormCompleted(row.clientId, row.id).catch(() => {});

  const summaryLines = buildSummary(data);
  const firstName = data.step1.fullName.trim().split(/\s+/)[0] ?? "vous";
  const base = getPublicAppUrl();
  const unsub = `${base}/intake/unsubscribe?clientId=${encodeURIComponent(row.clientId)}`;

  await sendIntakeConfirmationEmail({
    to: data.step1.email,
    clientId: row.clientId,
    firstName,
    conciergeName: concierge.name,
    summaryLines,
    unsubscribeUrl: data.step6.marketingOptIn === false ? undefined : unsub,
  });

  return NextResponse.json({
    ok: true,
    summaryUrl: `${base}/admin/clients/${row.clientId}/intake`,
  });
}
