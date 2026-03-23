import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Resend (and compatible) webhooks: tries common payload shapes for open/click.
 * Configure in Resend dashboard; optional verify via CRON_SECRET-style bearer for MVP.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const type = String(b.type ?? b.event ?? "");
  const data = (typeof b.data === "object" && b.data !== null ? b.data : b) as Record<string, unknown>;
  const emailId = String(data.email_id ?? data.emailId ?? data.id ?? "");

  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const now = new Date();
  const isOpen = /open/i.test(type);
  const isClick = /click/i.test(type);

  if (isOpen) {
    await prisma.emailLog.updateMany({
      where: { resendId: emailId },
      data: { openedAt: now, status: "opened" },
    });
  } else if (isClick) {
    await prisma.emailLog.updateMany({
      where: { resendId: emailId },
      data: { clickedAt: now, status: "clicked" },
    });
  }

  return NextResponse.json({ ok: true });
}
