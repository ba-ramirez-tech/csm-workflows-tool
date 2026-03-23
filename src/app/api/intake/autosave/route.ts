import { IntakeTokenStatus, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateIntakeSession } from "@/lib/intake/token";
import { logIntakeFormStarted } from "@/lib/log-touchpoint";

type Body = {
  token: string;
  step: number;
  partialStep: Record<string, unknown>;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.token || typeof body.step !== "number" || body.step < 1 || body.step > 7) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const v = await validateIntakeSession(body.token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, reason: v.reason }, { status: 410 });
  }

  const row = v.token;
  const wasPending = row.status === IntakeTokenStatus.PENDING;
  const key = `step${body.step}` as const;
  const prev = (row.partialData && typeof row.partialData === "object" && !Array.isArray(row.partialData)
    ? row.partialData
    : {}) as Record<string, unknown>;

  const nextPartial = { ...prev, [key]: body.partialStep } as Prisma.InputJsonValue;

  const nextStatus =
    row.status === IntakeTokenStatus.PENDING ? IntakeTokenStatus.IN_PROGRESS : row.status;

  await prisma.intakeToken.update({
    where: { id: row.id },
    data: {
      partialData: nextPartial,
      currentStep: Math.max(row.currentStep, body.step + 1),
      status: nextStatus,
    },
  });

  if (wasPending && nextStatus === IntakeTokenStatus.IN_PROGRESS) {
    await logIntakeFormStarted(row.clientId, row.id).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
