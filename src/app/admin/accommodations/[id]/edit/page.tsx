import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { deleteAccommodationAction, updateAccommodationAction } from "../../actions";
import type { RoomTypeRow } from "../../accommodation-form";
import { AccommodationForm } from "../../accommodation-form";
import { DeleteButton } from "../../delete-button";
import { prisma } from "@/lib/prisma";

type EditAccommodationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function jsonToSingleText(value: Prisma.JsonValue | null): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybeLocalized = value as Record<string, unknown>;
    for (const lang of ["fr", "en", "es", "de"]) {
      const localized = maybeLocalized[lang];
      if (typeof localized === "string") return localized;
    }
  }
  return "";
}

function parseRoomTypes(value: Prisma.JsonValue | null): RoomTypeRow[] {
  if (!value || !Array.isArray(value)) return [];
  const rows: RoomTypeRow[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
      name: String(row.name ?? ""),
      maxGuests: Math.max(1, Number(row.maxGuests) || 1),
      bedType: String(row.bedType ?? ""),
    });
  }
  return rows;
}

const VALID_TYPES = new Set(["hotel", "ecolodge", "hacienda", "glamping", "boutique", "hostel", "villa"]);

export default async function EditAccommodationPage({ params }: EditAccommodationPageProps) {
  const { id } = await params;
  const accommodation = await prisma.accommodation.findUnique({ where: { id } });

  if (!accommodation) {
    notFound();
  }

  const destinations = await prisma.destination.findMany({
    where: {
      OR: [{ isActive: true }, { id: accommodation.destinationId }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const updateAction = updateAccommodationAction.bind(null, id);
  const deleteAction = deleteAccommodationAction.bind(null, id);

  const typeValue = VALID_TYPES.has(accommodation.type) ? accommodation.type : "hotel";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Accommodation</h1>
          <p className="text-sm text-slate-600">Update accommodation details and room types.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/accommodations" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to list
          </Link>
          <DeleteButton onDelete={deleteAction} />
        </div>
      </div>

      <AccommodationForm
        mode="edit"
        destinations={destinations}
        action={updateAction}
        submitLabel="Save changes"
        initialValues={{
          destinationId: accommodation.destinationId,
          name: accommodation.name,
          type: typeValue,
          tier: accommodation.tier,
          maxCapacity: accommodation.maxCapacity?.toString() ?? "",
          description: jsonToSingleText(accommodation.description),
          address: accommodation.address ?? "",
          phone: accommodation.phone ?? "",
          email: accommodation.email ?? "",
          website: accommodation.website ?? "",
          latitude: accommodation.latitude?.toString() ?? "",
          longitude: accommodation.longitude?.toString() ?? "",
          checkInTime: accommodation.checkInTime ?? "15:00",
          checkOutTime: accommodation.checkOutTime ?? "11:00",
          stars: accommodation.stars?.toString() ?? "",
          rating: accommodation.rating != null ? String(accommodation.rating) : "",
          notes: accommodation.notes ?? "",
          amenities: accommodation.amenities,
          roomTypes: parseRoomTypes(accommodation.roomTypes),
          isActive: accommodation.isActive,
        }}
      />
    </section>
  );
}
