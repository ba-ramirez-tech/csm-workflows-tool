import Link from "next/link";
import { TransportMode } from "@prisma/client";
import { createTransportRouteAction } from "../actions";
import { TransportRouteForm } from "../transport-form";
import { prisma } from "@/lib/prisma";

export default async function NewTransportRoutePage() {
  const destinations = await prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Transport Route</h1>
          <p className="text-sm text-slate-600">Define a route between two destinations.</p>
        </div>
        <Link href="/admin/transport" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to list
        </Link>
      </div>

      <TransportRouteForm
        mode="create"
        destinations={destinations}
        action={createTransportRouteAction}
        submitLabel="Create route"
        initialValues={{
          originId: "",
          destinationId: "",
          mode: TransportMode.PRIVATE_CAR,
          provider: "",
          vehicleType: "",
          capacity: "",
          distanceKm: "",
          durationMinutes: "",
          altitudeStart: "",
          altitudeEnd: "",
          routeNotes: "",
          contactName: "",
          contactPhone: "",
          contactEmail: "",
          isActive: true,
        }}
      />
    </section>
  );
}
