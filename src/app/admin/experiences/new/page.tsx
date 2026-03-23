import Link from "next/link";
import { createExperienceAction } from "../actions";
import { ExperienceForm } from "../experience-form";
import { prisma } from "@/lib/prisma";

export default async function NewExperiencePage() {
  const destinations = await prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Experience</h1>
          <p className="text-sm text-slate-600">Create a new experience for a destination.</p>
        </div>
        <Link href="/admin/experiences" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to list
        </Link>
      </div>

      <ExperienceForm
        mode="create"
        destinations={destinations}
        action={createExperienceAction}
        submitLabel="Create experience"
        initialValues={{
          destinationId: "",
          name: "",
          category: "cultural",
          activityStyle: "CULTURAL",
          durationMinutes: "",
          difficulty: "EASY",
          description: "",
          languages: ["fr", "en"],
          transportIncluded: "",
          minPax: "1",
          maxPax: "",
          meetingPoint: "",
          contactName: "",
          contactPhone: "",
          contactEmail: "",
          notes: "",
          highlights: [],
          included: [],
          notIncluded: [],
          whatToBring: [],
          isActive: true,
        }}
      />
    </section>
  );
}
