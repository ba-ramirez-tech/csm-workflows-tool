import { NextResponse } from "next/server";
import { validateIntakeSession } from "@/lib/intake/token";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const v = await validateIntakeSession(token);
  if (!v.ok) {
    const status = v.reason === "not_found" ? 404 : 410;
    return NextResponse.json({ ok: false, reason: v.reason }, { status });
  }

  const row = v.token;
  const partial = row.partialData;
  return NextResponse.json({
    ok: true,
    client: {
      name: row.client.name,
      email: row.client.email,
      phone: row.client.phone,
      preferredLanguage: row.client.preferredLanguage,
      spokenLanguages: row.client.spokenLanguages,
      guideLanguage: row.client.guideLanguage,
    },
    status: row.status,
    currentStep: row.currentStep,
    partialData: partial,
    expiresAt: row.expiresAt.toISOString(),
  });
}
