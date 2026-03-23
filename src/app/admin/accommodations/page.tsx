import Link from "next/link";
import { TripTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AccommodationsPageProps = {
  searchParams?: Promise<{
    q?: string;
    destinationId?: string;
    tier?: string;
    type?: string;
    message?: string;
  }>;
};

const TIERS = Object.values(TripTier);
const TYPES = ["hotel", "ecolodge", "hacienda", "glamping", "boutique", "hostel", "villa"] as const;

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

function TypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, " ");
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
      {label}
    </span>
  );
}

export default async function AccommodationsListPage({ searchParams }: AccommodationsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const destinationId = params?.destinationId?.trim() ?? "";
  const tierParam = params?.tier?.trim() ?? "";
  const typeParam = params?.type?.trim() ?? "";
  const message = params?.message;

  const tierFilter = TIERS.includes(tierParam as TripTier) ? (tierParam as TripTier) : undefined;
  const typeFilter = TYPES.includes(typeParam as (typeof TYPES)[number]) ? typeParam : undefined;

  const destinations = await prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const accommodations = await prisma.accommodation.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        destinationId ? { destinationId } : {},
        tierFilter ? { tier: tierFilter } : {},
        typeFilter ? { type: typeFilter } : {},
      ],
    },
    include: { destination: { select: { name: true } } },
    orderBy: [{ destination: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <form action="/admin/accommodations" method="get" className="flex flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
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
          <div className="flex min-w-[140px] flex-col gap-1">
            <label htmlFor="type" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={typeParam}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
              href="/admin/accommodations"
              className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
            >
              Reset
            </Link>
          </div>
        </form>

          <Link
            href="/admin/accommodations/new"
            className="inline-flex shrink-0 items-center justify-center self-stretch rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 lg:self-start"
          >
            Add Accommodation
          </Link>
        </div>

        <p className="text-sm text-slate-600">
          {accommodations.length} accommodation{accommodations.length === 1 ? "" : "s"}
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
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Max Capacity</th>
                <th className="px-4 py-3">Stars</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accommodations.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block font-medium text-slate-800">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
                      {row.destination.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
                      <TypeBadge type={row.type} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
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
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
                      {row.maxCapacity ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
                      {row.stars ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
                      {row.rating != null ? row.rating.toFixed(1) : "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/accommodations/${row.id}/edit`} className="block">
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
              {accommodations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No accommodations found.
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
