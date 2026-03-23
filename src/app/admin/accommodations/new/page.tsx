import Link from "next/link";
import { createAccommodationAction } from "../actions";
import { AccommodationForm } from "../accommodation-form";
import { prisma } from "@/lib/prisma";

export default async function NewAccommodationPage() {
  const destinations = await prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Accommodation</h1>
          <p className="text-sm text-slate-600">Create a new accommodation linked to a destination.</p>
        </div>
        <Link href="/admin/accommodations" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to list
        </Link>
      </div>

      <AccommodationForm
        mode="create"
        destinations={destinations}
        action={createAccommodationAction}
        submitLabel="Create accommodation"
        initialValues={{
          destinationId: "",
          name: "",
          type: "hotel",
          tier: "STANDARD",
          maxCapacity: "",
          description: "",
          address: "",
          phone: "",
          email: "",
          website: "",
          latitude: "",
          longitude: "",
          checkInTime: "15:00",
          checkOutTime: "11:00",
          stars: "",
          rating: "",
          notes: "",
          amenities: [],
          roomTypes: [],
          isActive: true,
        }}
      />
    </section>
  );
}
