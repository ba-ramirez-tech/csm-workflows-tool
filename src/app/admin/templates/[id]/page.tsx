import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { cloneTripTemplateAction, deleteTripTemplateAction } from "../actions";
import type { BuilderDayState, BuilderItemState } from "../template-builder-client";
import { TemplateBuilderClient } from "../template-builder-client";
import { DeleteTemplateButton } from "../delete-template-button";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string }>;
};

function jsonToText(value: Prisma.JsonValue | null): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const lang of ["fr", "en", "es", "de"]) {
      const v = o[lang];
      if (typeof v === "string") return v;
    }
  }
  return "";
}

export default async function TemplateBuilderPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const banner = sp?.message;

  const template = await prisma.tripTemplate.findUnique({
    where: { id },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!template) {
    notFound();
  }

  const [destinations, accommodations, experiences, transportRoutes] = await Promise.all([
    prisma.destination.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.accommodation.findMany({
      select: { id: true, name: true, destinationId: true },
      orderBy: { name: "asc" },
    }),
    prisma.experience.findMany({
      select: { id: true, name: true, destinationId: true },
      orderBy: { name: "asc" },
    }),
    prisma.transportRoute.findMany({
      include: {
        origin: { select: { name: true } },
        destination: { select: { name: true } },
      },
      orderBy: [{ origin: { name: "asc" } }, { destination: { name: "asc" } }],
    }),
  ]);

  const accommodationsByDest: Record<string, { id: string; name: string }[]> = {};
  for (const a of accommodations) {
    (accommodationsByDest[a.destinationId] ??= []).push({ id: a.id, name: a.name });
  }

  const experiencesByDest: Record<string, { id: string; name: string }[]> = {};
  for (const e of experiences) {
    (experiencesByDest[e.destinationId] ??= []).push({ id: e.id, name: e.name });
  }

  const transports = transportRoutes.map((r) => ({
    id: r.id,
    originId: r.originId,
    destinationId: r.destinationId,
    label: `${r.origin.name} → ${r.destination.name}`,
  }));

  const initialDays: BuilderDayState[] = template.days.map((d) => ({
    dayNumber: d.dayNumber,
    destinationId: d.destinationId,
    title: jsonToText(d.title),
    items: d.items.map(
      (it): BuilderItemState => ({
        clientId: it.id,
        sortOrder: it.sortOrder,
        itemType: it.itemType,
        accommodationId: it.accommodationId,
        experienceId: it.experienceId,
        transportId: it.transportId,
        timeSlot: it.timeSlot,
        startTime: it.startTime ?? "",
        isOptional: it.isOptional,
        notesText: jsonToText(it.notes),
      }),
    ),
  }));

  const deleteBound = deleteTripTemplateAction.bind(null, id);

  if (destinations.length === 0) {
    return (
      <section className="space-y-4">
        <Link href="/admin/templates" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Back to templates
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add at least one active destination before editing this template.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{template.name}</h1>
          <p className="text-sm text-slate-600">Template builder · slug: {template.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/templates" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to list
          </Link>
          <form action={cloneTripTemplateAction.bind(null, id)}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clone template
            </button>
          </form>
          <DeleteTemplateButton deleteAction={deleteBound} />
        </div>
      </div>

      {banner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {decodeURIComponent(banner)}
        </div>
      )}

      <TemplateBuilderClient
        key={template.updatedAt.toISOString()}
        templateId={id}
        initialMeta={{
          name: template.name,
          slug: template.slug,
          travelerTypes: template.travelerTypes,
          tier: template.tier,
          durationDays: template.durationDays,
          description: jsonToText(template.description),
          basePriceAmount: template.basePriceAmount,
          clientCurrency: template.clientCurrency,
          webProductUrl: template.webProductUrl ?? "",
          tags: template.tags ?? [],
          isPublished: template.isPublished,
          isActive: template.isActive,
        }}
        initialDays={initialDays}
        destinations={destinations}
        accommodationsByDest={accommodationsByDest}
        experiencesByDest={experiencesByDest}
        transports={transports}
      />
    </section>
  );
}
