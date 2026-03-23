import Link from "next/link";
import { TravelerType, TripTier } from "@prisma/client";
import { formatClientPrice } from "@/lib/client-currency";
import { prisma } from "@/lib/prisma";
import { QuickStartTemplatesSection } from "./quick-start-section";

type TemplatesPageProps = {
  searchParams?: Promise<{
    q?: string;
    tier?: string;
    travelerType?: string;
    published?: string;
    message?: string;
    error?: string;
  }>;
};

const TIERS = Object.values(TripTier);
const TRAVELERS = Object.values(TravelerType);

const travelerLabels: Record<string, string> = {
  COUPLE: "Couple",
  FAMILY: "Family",
  SOLO: "Solo",
  FRIENDS: "Friends",
  MICE: "MICE",
  PLUS_60: "60+",
  HONEYMOON: "Honeymoon",
};

function tierBadgeClass(tier: TripTier) {
  switch (tier) {
    case "BUDGET":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "STANDARD":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "CHARME":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "LUXURY":
      return "border-purple-200 bg-purple-50 text-purple-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default async function TemplatesListPage({ searchParams }: TemplatesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const tierParam = params?.tier?.trim() ?? "";
  const travelerParam = params?.travelerType?.trim() ?? "";
  const publishedOnly = params?.published === "1";
  const message = params?.message;
  const error = params?.error;

  const tierFilter = TIERS.includes(tierParam as TripTier) ? (tierParam as TripTier) : undefined;
  const travelerFilter = TRAVELERS.includes(travelerParam as TravelerType)
    ? (travelerParam as TravelerType)
    : undefined;

  const [templateCount, templates] = await Promise.all([
    prisma.tripTemplate.count(),
    prisma.tripTemplate.findMany({
      where: {
        AND: [
          q ? { name: { contains: q, mode: "insensitive" } } : {},
          tierFilter ? { tier: tierFilter } : {},
          travelerFilter ? { travelerTypes: { has: travelerFilter } } : {},
          publishedOnly ? { isPublished: true } : {},
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        _count: { select: { days: true } },
      },
    }),
  ]);

  const showQuickStart = templateCount < 5;

  return (
    <section className="space-y-4">
      {showQuickStart && <QuickStartTemplatesSection />}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <form
            action="/admin/templates"
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
            <div className="flex min-w-[140px] flex-col gap-1">
              <label htmlFor="tier" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Tier
              </label>
              <select
                id="tier"
                name="tier"
                defaultValue={tierParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All tiers</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="travelerType" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Traveler profile
              </label>
              <select
                id="travelerType"
                name="travelerType"
                defaultValue={travelerParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All profiles</option>
                {TRAVELERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="published"
                type="checkbox"
                name="published"
                value="1"
                defaultChecked={publishedOnly}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="published" className="text-sm text-slate-700">
                Published only
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Apply
              </button>
              <Link
                href="/admin/templates"
                className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
              >
                Reset
              </Link>
            </div>
          </form>

          <Link
            href="/admin/templates/new"
            className="inline-flex shrink-0 items-center justify-center self-stretch rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 lg:self-start"
          >
            Create Template
          </Link>
        </div>
        <p className="text-sm text-slate-600">
          {templates.length} template{templates.length === 1 ? "" : "s"}
          {q || tierFilter || travelerFilter || publishedOnly ? " (filtered)" : ""} · {templateCount} total in database
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Profiles</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Base price</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${row.id}`} className="block font-medium text-slate-800">
                      {row.name}
                    </Link>
                    <span className="text-xs text-slate-400">{row._count.days} days</span>
                    {row.webProductUrl && (
                      <a
                        href={row.webProductUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs font-medium text-teal-700 hover:underline"
                      >
                        Web product →
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/templates/${row.id}`} className="block">
                      {row.durationDays} {row.durationDays === 1 ? "day" : "days"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${row.id}`} className="block">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {row.travelerTypes.map((tt) => (
                          <span
                            key={tt}
                            className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                          >
                            {travelerLabels[tt] ?? tt}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${row.id}`} className="block">
                      <div className="flex max-w-[10rem] flex-wrap gap-1">
                        {(row.tags ?? []).length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          (row.tags ?? []).slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded-full border border-teal-100 bg-teal-50/80 px-2 py-0.5 text-[10px] font-medium text-teal-900"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                        {(row.tags ?? []).length > 4 && (
                          <span className="text-[10px] text-slate-400">+{(row.tags ?? []).length - 4}</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${row.id}`} className="block">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          tierBadgeClass(row.tier),
                        ].join(" ")}
                      >
                        {row.tier}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                    <Link href={`/admin/templates/${row.id}`} className="block">
                      {formatClientPrice(row.basePriceAmount, row.clientCurrency)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${row.id}`} className="flex items-center gap-2">
                      <span
                        className={[
                          "inline-block h-2.5 w-2.5 rounded-full",
                          row.isPublished ? "bg-emerald-500" : "bg-slate-300",
                        ].join(" ")}
                        aria-hidden
                      />
                      <span className="text-slate-600">{row.isPublished ? "Yes" : "No"}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/templates/${row.id}`} className="block">
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
              {templates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No templates found.
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
