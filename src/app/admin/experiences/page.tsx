import Link from "next/link";
import { DifficultyLevel, ExperienceStyle } from "@prisma/client";
import { formatMinutesToLabel } from "@/lib/format-duration";
import { prisma } from "@/lib/prisma";

type ExperiencesPageProps = {
  searchParams?: Promise<{
    q?: string;
    destinationId?: string;
    category?: string;
    difficulty?: string;
    message?: string;
  }>;
};

const languageLabels: Record<string, string> = {
  fr: "FR",
  en: "EN",
  es: "ES",
  de: "DE",
};

const CATEGORIES = ["city_tour", "nature", "cultural", "gastronomic", "adventure", "wellness"] as const;
const DIFFICULTIES = Object.values(DifficultyLevel);

function categoryBadgeClass() {
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function styleBadgeClass(style: ExperienceStyle) {
  switch (style) {
    case "ACTIVE":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "CONTEMPLATIVE":
      return "border-blue-200 bg-blue-50 text-blue-900";
    case "CULTURAL":
      return "border-purple-200 bg-purple-50 text-purple-900";
    case "GASTRONOMIC":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "NATURE":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "ADVENTURE":
      return "border-orange-300 bg-orange-100 text-orange-950";
    case "RELAXATION":
      return "border-teal-200 bg-teal-50 text-teal-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function difficultyIndicatorClass(level: DifficultyLevel) {
  switch (level) {
    case "EASY":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "MODERATE":
      return "border-amber-300 bg-amber-100 text-amber-950";
    case "CHALLENGING":
      return "border-orange-300 bg-orange-100 text-orange-950";
    case "DEMANDING":
      return "border-rose-300 bg-rose-100 text-rose-900";
    case "EXTREME":
      return "border-red-900/40 bg-red-950 text-red-50";
    default:
      return "border-slate-200 bg-slate-100 text-slate-800";
  }
}

function CategoryBadge({ category }: { category: string }) {
  const label = category.replace(/_/g, " ");
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        categoryBadgeClass(),
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export default async function ExperiencesListPage({ searchParams }: ExperiencesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const destinationId = params?.destinationId?.trim() ?? "";
  const categoryParam = params?.category?.trim() ?? "";
  const difficultyParam = params?.difficulty?.trim() ?? "";
  const message = params?.message;

  const categoryFilter = CATEGORIES.includes(categoryParam as (typeof CATEGORIES)[number])
    ? categoryParam
    : undefined;
  const difficultyFilter = DIFFICULTIES.includes(difficultyParam as DifficultyLevel)
    ? (difficultyParam as DifficultyLevel)
    : undefined;

  const destinations = await prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const experiences = await prisma.experience.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        destinationId ? { destinationId } : {},
        categoryFilter ? { category: categoryFilter } : {},
        difficultyFilter ? { difficulty: difficultyFilter } : {},
      ],
    },
    include: { destination: { select: { name: true } } },
    orderBy: [{ destination: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <form
            action="/admin/experiences"
            method="get"
            className="flex flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
          >
            <div className="flex w-full min-w-[200px] max-w-md flex-1 flex-col gap-1">
              <label htmlFor="q" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Search
              </label>
              <input
                id="q"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              />
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="destinationId" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Destination
              </label>
              <select
                id="destinationId"
                name="destinationId"
                defaultValue={destinationId}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All destinations</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="category" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={categoryParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="difficulty" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={difficultyParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All levels</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Apply
              </button>
              <Link
                href="/admin/experiences"
                className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
              >
                Reset
              </Link>
            </div>
          </form>

          <Link
            href="/admin/experiences/new"
            className="inline-flex shrink-0 items-center justify-center self-stretch rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 lg:self-start"
          >
            Add Experience
          </Link>
        </div>

        <p className="text-sm text-slate-600">
          {experiences.length} experience{experiences.length === 1 ? "" : "s"}
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Style</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Languages</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {experiences.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block font-medium text-slate-800">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      {row.destination.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      <CategoryBadge category={row.category} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          styleBadgeClass(row.activityStyle),
                        ].join(" ")}
                      >
                        {row.activityStyle}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      {formatMinutesToLabel(row.durationMinutes)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                          difficultyIndicatorClass(row.difficulty),
                        ].join(" ")}
                      >
                        {row.difficulty}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      <div className="flex flex-wrap gap-1.5">
                        {row.languages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                          >
                            {languageLabels[lang] ?? lang.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/experiences/${row.id}/edit`} className="block">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                          row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700",
                        ].join(" ")}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
              {experiences.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No experiences found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
