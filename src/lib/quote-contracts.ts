import type { Contract, Prisma, Season } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Rough season bucket for Colombia — used to pick contract rows. */
export function seasonForTravelDate(d: Date): Season {
  const m = d.getUTCMonth() + 1;
  if ([12, 1, 2, 6, 7, 8].includes(m)) return "ALTA";
  if ([4, 5, 9, 10].includes(m)) return "BAJA";
  return "MEDIA";
}

type SupplierRef =
  | { supplierType: "accommodation"; accommodationId: string }
  | { supplierType: "experience"; experienceId: string }
  | { supplierType: "transport"; transportId: string };

function contractWhereForSupplier(ref: SupplierRef): Prisma.ContractWhereInput {
  if (ref.supplierType === "accommodation") {
    return { supplierType: "accommodation", accommodationId: ref.accommodationId };
  }
  if (ref.supplierType === "experience") {
    return { supplierType: "experience", experienceId: ref.experienceId };
  }
  return { supplierType: "transport", transportId: ref.transportId };
}

/** Picks best active contract for travel date: prefers matching season, then any in-range. */
export async function findContractForSupplier(
  ref: SupplierRef,
  travelDate: Date,
): Promise<Contract | null> {
  const base: Prisma.ContractWhereInput = {
    ...contractWhereForSupplier(ref),
    isActive: true,
    validFrom: { lte: travelDate },
    validTo: { gte: travelDate },
  };
  const season = seasonForTravelDate(travelDate);
  const withSeason = await prisma.contract.findFirst({
    where: { ...base, season },
    orderBy: { updatedAt: "desc" },
  });
  if (withSeason) return withSeason;
  return prisma.contract.findFirst({
    where: base,
    orderBy: { updatedAt: "desc" },
  });
}

export function lineQuantityForContract(
  costPerWhat: string,
  numTravelers: number,
): number {
  switch (costPerWhat) {
    case "per_person":
      return Math.max(1, numTravelers);
    case "per_night":
    case "per_group":
    case "per_vehicle":
    default:
      return 1;
  }
}
