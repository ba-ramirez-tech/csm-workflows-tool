import Link from "next/link";
import { createDestinationAction } from "../actions";
import { DestinationForm } from "../destination-form";

export default function NewDestinationPage() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Destination</h1>
          <p className="text-sm text-slate-600">Create a new destination in your catalog.</p>
        </div>
        <Link href="/admin/destinations" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to list
        </Link>
      </div>

      <DestinationForm
        mode="create"
        action={createDestinationAction}
        submitLabel="Create destination"
        initialValues={{
          name: "",
          region: "",
          country: "Colombia",
          description: "",
          altitudeMeters: "",
          avgTempMin: "",
          avgTempMax: "",
          climateNotes: "",
          languagesAvailable: ["fr", "en"],
          rentalAvailable: false,
          trekkingAvailable: false,
          latitude: "",
          longitude: "",
        }}
      />
    </section>
  );
}
