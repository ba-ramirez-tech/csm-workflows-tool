"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CreateClientResult =
  | { ok: true; clientId: string }
  | { ok: false; error: string };

export async function createClientAction(formData: FormData): Promise<CreateClientResult> {
  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw || null;
  if (!name) return { ok: false, error: "Le nom est requis." };

  try {
    const client = await prisma.client.create({
      data: { name, email },
    });
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${client.id}`);
    return { ok: true, clientId: client.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Cet email est déjà utilisé par un autre client." };
    }
    throw e;
  }
}
