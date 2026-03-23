import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { deleteDestinationAction, updateDestinationAction } from "../../actions";
import { DeleteButton } from "../../delete-button";
import { DestinationForm } from "../../destination-form";
import { prisma } from "@/lib/prisma";

type EditDestinationPageProps = {
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

export default async function EditDestinationPage({ params }: EditDestinationPageProps) {
  const { id } = await params;
  const destination = await prisma.destination.findUnique({ where: { id } });

  if (!destination) {
    notFound();
  }

  const updateAction = updateDestinationAction.bind(null, id);
  const deleteAction = deleteDestinationAction.bind(null, id);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Destination</h1>
          <p className="text-sm text-slate-600">Update destination details and availability.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/destinations" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to list
          </Link>
          <DeleteButton onDelete={deleteAction} />
        </div>
      </div>

      <DestinationForm
        mode="edit"
        action={updateAction}
        submitLabel="Save changes"
        initialValues={{
          name: destination.name,
          region: destination.region,
          country: destination.country,
          description: jsonToSingleText(destination.description),
          altitudeMeters: destination.altitudeMeters?.toString() ?? "",
          avgTempMin: destination.avgTempMin?.toString() ?? "",
          avgTempMax: destination.avgTempMax?.toString() ?? "",
          climateNotes: jsonToSingleText(destination.climateNotes),
          languagesAvailable: destination.languagesAvailable,
          rentalAvailable: destination.rentalAvailable,
          trekkingAvailable: destination.trekkingAvailable,
          latitude: destination.latitude?.toString() ?? "",
          longitude: destination.longitude?.toString() ?? "",
        }}
      />
    </section>
  );
}
