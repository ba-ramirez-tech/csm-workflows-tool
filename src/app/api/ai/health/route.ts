import { NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/ai/env";

/** Public shape only — never expose the key. */
export async function GET() {
  return NextResponse.json({ configured: getAnthropicApiKey() != null });
}
