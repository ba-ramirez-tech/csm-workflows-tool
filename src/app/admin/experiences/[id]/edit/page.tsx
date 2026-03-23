import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { deleteExperienceAction, updateExperienceAction } from "../../actions";
import { ExperienceForm } from "../../experience-form";
import { DeleteButton } from "../../delete-button";
import { prisma } from "@/lib/prisma";

type EditExperiencePageProps = {
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

function parseStringListJson(value: Prisma.JsonValue | null): string[] {
  if (value && Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((s) => s.length > 0);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const lang of ["fr", "en", "es", "de"]) {
      const arr = o[lang];
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x).trim()).filter((s) => s.length > 0);
      }
    }
  }
  return [];
}

const VALID_CATEGORIES = new Set([
  "city_tour",
  "nature",
  "cultural",
  "gastronomic",
  "adventure",
  "wellness",
]);

export default async function EditExperiencePage({ params }: EditExperiencePageProps) {
  const { id } = await params;
  const experience = await prisma.experience.findUnique({ where: { id } });

  if (!experience) {
    notFound();
  }

  const destinations = await prisma.destination.findMany({
    where: {
      OR: [{ isActive: true }, { id: experience.destinationId }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const updateAction = updateExperienceAction.bind(null, id);
  const deleteAction = deleteExperienceAction.bind(null, id);

  const categoryValue = VALID_CATEGORIES.has(experience.category) ? experience.category : "cultural";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Experience</h1>
          <p className="text-sm text-slate-600">Update experience details and lists.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/experiences" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to list
          </Link>
          <DeleteButton onDelete={deleteAction} />
        </div>
      </div>

      <ExperienceForm
        mode="edit"
        destinations={destinations}
        action={updateAction}
        submitLabel="Save changes"
        initialValues={{
          destinationId: experience.destinationId,
          name: experience.name,
          category: categoryValue,
          activityStyle: experience.activityStyle,
          durationMinutes: experience.durationMinutes?.toString() ?? "",
          difficulty: experience.difficulty,
          description: jsonToSingleText(experience.description),
          languages: experience.languages,
          transportIncluded: experience.transportIncluded ?? "",
          minPax: experience.minPax?.toString() ?? "1",
          maxPax: experience.maxPax?.toString() ?? "",
          meetingPoint: experience.meetingPoint ?? "",
          contactName: experience.contactName ?? "",
          contactPhone: experience.contactPhone ?? "",
          contactEmail: experience.contactEmail ?? "",
          notes: experience.notes ?? "",
          highlights: parseStringListJson(experience.highlights),
          included: parseStringListJson(experience.included),
          notIncluded: parseStringListJson(experience.notIncluded),
          whatToBring: parseStringListJson(experience.whatToBring),
          isActive: experience.isActive,
        }}
      />
    </section>
  );
}
