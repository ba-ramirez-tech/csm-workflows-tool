import type { ClientOperationalDetails } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OperationalPublicClient = {
  id: string;
  name: string;
  operationalDetails: ClientOperationalDetails | null;
};

export type OperationalPageState =
  | { kind: "not_found" }
  | { kind: "active"; token: string; client: OperationalPublicClient };

export async function getOperationalPageState(rawToken: string): Promise<OperationalPageState> {
  const client = await prisma.client.findUnique({
    where: { operationalFormToken: rawToken },
    include: { operationalDetails: true },
  });
  if (!client) return { kind: "not_found" };
  return {
    kind: "active",
    token: rawToken,
    client: {
      id: client.id,
      name: client.name,
      operationalDetails: client.operationalDetails,
    },
  };
}
