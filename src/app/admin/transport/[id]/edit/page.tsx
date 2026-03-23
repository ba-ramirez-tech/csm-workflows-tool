import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { deleteTransportRouteAction, updateTransportRouteAction } from "../../actions";
import { TransportRouteForm } from "../../transport-form";
import { DeleteButton } from "../../delete-button";
import { prisma } from "@/lib/prisma";

type EditTransportPageProps = {
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

export default async function EditTransportRoutePage({ params }: EditTransportPageProps) {
  const { id } = await params;
  const route = await prisma.transportRoute.findUnique({ where: { id } });

  if (!route) {
    notFound();
  }

  const destinations = await prisma.destination.findMany({
    where: {
      OR: [{ isActive: true }, { id: { in: [route.originId, route.destinationId] } }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const updateAction = updateTransportRouteAction.bind(null, id);
  const deleteAction = deleteTransportRouteAction.bind(null, id);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Transport Route</h1>
          <p className="text-sm text-slate-600">Update route details and contacts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/transport" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to list
          </Link>
          <DeleteButton onDelete={deleteAction} />
        </div>
      </div>

      <TransportRouteForm
        mode="edit"
        destinations={destinations}
        action={updateAction}
        submitLabel="Save changes"
        initialValues={{
          originId: route.originId,
          destinationId: route.destinationId,
          mode: route.mode,
          provider: route.provider ?? "",
          vehicleType: route.vehicleType ?? "",
          capacity: route.capacity?.toString() ?? "",
          distanceKm: route.distanceKm?.toString() ?? "",
          durationMinutes: route.durationMinutes?.toString() ?? "",
          altitudeStart: route.altitudeStart?.toString() ?? "",
          altitudeEnd: route.altitudeEnd?.toString() ?? "",
          routeNotes: jsonToSingleText(route.routeNotes),
          contactName: route.contactName ?? "",
          contactPhone: route.contactPhone ?? "",
          contactEmail: route.contactEmail ?? "",
          isActive: route.isActive,
        }}
      />
    </section>
  );
}
