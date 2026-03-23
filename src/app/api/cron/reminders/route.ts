import { NextResponse } from "next/server";
import { subDays, subHours } from "date-fns";
import { IntakeTokenStatus } from "@prisma/client";
import { sendIntakeReminderEmail } from "@/lib/email/send";
import { getPublicAppUrl } from "@/lib/email/client";
import { prisma } from "@/lib/prisma";

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const after48h = subHours(now, 48);
  const after5d = subDays(now, 5);

  const tokens = await prisma.intakeToken.findMany({
    where: {
      response: null,
      status: { in: [IntakeTokenStatus.PENDING, IntakeTokenStatus.IN_PROGRESS] },
      expiresAt: { gt: now },
      reminderCount: { lt: 2 },
      OR: [
        { reminderCount: 0, createdAt: { lte: after48h } },
        { reminderCount: 1, createdAt: { lte: after5d } },
      ],
    },
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  let sent = 0;
  const base = getPublicAppUrl();

  for (const row of tokens) {
    if (!row.client.email) continue;
    const firstName = row.client.name.trim().split(/\s+/)[0] ?? "Bonjour";
    const intakeUrl = `${base}/intake/${row.token}`;
    const r = await sendIntakeReminderEmail({
      to: row.client.email,
      clientId: row.client.id,
      firstName,
      intakeUrl,
      currentStep: row.currentStep,
      totalSteps: 7,
    });
    if (r.ok) {
      sent += 1;
      await prisma.intakeToken.update({
        where: { id: row.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: now,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, checked: tokens.length, sent });
}
