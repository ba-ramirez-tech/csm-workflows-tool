import Link from "next/link";
import { Prisma, Season } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCop } from "@/lib/format-currency";
import { prisma } from "@/lib/prisma";

type ContractsPageProps = {
  searchParams?: Promise<{
    q?: string;
    supplierType?: string;
    season?: string;
    activeOnly?: string;
    message?: string;
  }>;
};

const SUPPLIER_TYPES = ["accommodation", "experience", "transport"] as const;
const SEASONS = Object.values(Season);

const COST_PER_LABELS: Record<string, string> = {
  per_night: "per night",
  per_person: "per person",
  per_group: "per group",
  per_vehicle: "per vehicle",
};

function supplierTypeBadgeClass(type: string) {
  switch (type) {
    case "accommodation":
      return "border-teal-200 bg-teal-50 text-teal-900";
    case "experience":
      return "border-purple-200 bg-purple-50 text-purple-900";
    case "transport":
      return "border-orange-200 bg-orange-50 text-orange-950";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

function seasonBadgeClass(season: Season) {
  switch (season) {
    case "BAJA":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "MEDIA":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "ALTA":
      return "border-red-200 bg-red-50 text-red-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

type ContractWithSuppliers = Prisma.ContractGetPayload<{
  include: {
    accommodation: {
      select: { id: true; name: true; destination: { select: { name: true } } };
    };
    experience: {
      select: { id: true; name: true; destination: { select: { name: true } } };
    };
    transport: {
      select: {
        id: true;
        origin: { select: { name: true } };
        destination: { select: { name: true } };
      };
    };
  };
}>;

function supplierDisplayName(c: ContractWithSuppliers): string {
  if (c.accommodation) {
    return `${c.accommodation.name} (${c.accommodation.destination.name})`;
  }
  if (c.experience) {
    return `${c.experience.name} (${c.experience.destination.name})`;
  }
  if (c.transport) {
    return `${c.transport.origin.name} → ${c.transport.destination.name}`;
  }
  return "Unknown supplier";
}

function groupKey(c: ContractWithSuppliers): string {
  const id = c.accommodationId ?? c.experienceId ?? c.transportId ?? "none";
  return `${c.supplierType}:${id}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ContractsListPage({ searchParams }: ContractsPageProps) {
  requireRole("SUPER_ADMIN");

  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const supplierTypeParam = params?.supplierType?.trim() ?? "";
  const seasonParam = params?.season?.trim() ?? "";
  const activeOnly = params?.activeOnly === "1";
  const message = params?.message;

  const supplierTypeFilter = SUPPLIER_TYPES.includes(supplierTypeParam as (typeof SUPPLIER_TYPES)[number])
    ? supplierTypeParam
    : undefined;
  const seasonFilter = SEASONS.includes(seasonParam as Season) ? (seasonParam as Season) : undefined;

  const whereClause: Prisma.ContractWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { accommodation: { name: { contains: q, mode: "insensitive" } } },
              { experience: { name: { contains: q, mode: "insensitive" } } },
              { transport: { origin: { name: { contains: q, mode: "insensitive" } } } },
              { transport: { destination: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {},
      supplierTypeFilter ? { supplierType: supplierTypeFilter } : {},
      seasonFilter ? { season: seasonFilter } : {},
      activeOnly ? { isActive: true } : {},
    ],
  };

  const [contracts, activeTotal, accommodationCosts, expiringCount] = await Promise.all([
    prisma.contract.findMany({
      where: whereClause,
      include: {
        accommodation: {
          select: { id: true, name: true, destination: { select: { name: true } } },
        },
        experience: {
          select: { id: true, name: true, destination: { select: { name: true } } },
        },
        transport: {
          select: {
            id: true,
            origin: { select: { name: true } },
            destination: { select: { name: true } },
          },
        },
      },
      orderBy: [{ supplierType: "asc" }, { validFrom: "desc" }],
    }),
    prisma.contract.count({ where: { isActive: true } }),
    prisma.contract.findMany({
      where: { isActive: true, supplierType: "accommodation" },
      select: { netCostCop: true },
    }),
    (() => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
      return prisma.contract.count({
        where: {
          isActive: true,
          validTo: { gte: start, lte: end },
        },
      });
    })(),
  ]);

  const avgAccommodationCop =
    accommodationCosts.length === 0
      ? null
      : Math.round(
          accommodationCosts.reduce((sum, c) => sum + c.netCostCop, 0) / accommodationCosts.length,
        );

  const grouped = new Map<string, ContractWithSuppliers[]>();
  for (const c of contracts) {
    const key = groupKey(c);
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }

  const groupOrder = Array.from(grouped.keys()).sort();

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Contracts</h1>
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
              Confidential
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Net costs and supplier agreements — super admin only.</p>
        </div>
        <Link
          href="/admin/contracts/new"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          Add Contract
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active contracts</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{activeTotal}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Avg net (active accommodations)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {avgAccommodationCop != null ? formatCop(avgAccommodationCop) : "—"}
          </p>
        </div>
        <div
          className={[
            "rounded-xl border bg-white p-4 shadow-sm",
            expiringCount > 0
              ? "border-amber-300 bg-amber-50/40"
              : "border-slate-200",
          ].join(" ")}
        >
          <p
            className={[
              "text-xs font-medium uppercase tracking-wide",
              expiringCount > 0 ? "text-amber-800" : "text-slate-500",
            ].join(" ")}
          >
            Expiring in 30 days
          </p>
          <p
            className={[
              "mt-1 text-2xl font-semibold tabular-nums",
              expiringCount > 0 ? "text-amber-900" : "text-slate-900",
            ].join(" ")}
          >
            {expiringCount}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <form
            action="/admin/contracts"
            method="get"
            className="flex flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
          >
            <div className="flex w-full min-w-[200px] max-w-md flex-1 flex-col gap-1">
              <label htmlFor="q" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Supplier name
              </label>
              <input
                id="q"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search supplier"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              />
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="supplierType" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Supplier type
              </label>
              <select
                id="supplierType"
                name="supplierType"
                defaultValue={supplierTypeParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All types</option>
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[140px] flex-col gap-1">
              <label htmlFor="season" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Season
              </label>
              <select
                id="season"
                name="season"
                defaultValue={seasonParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All seasons</option>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="activeOnly"
                type="checkbox"
                name="activeOnly"
                value="1"
                defaultChecked={activeOnly}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="activeOnly" className="text-sm text-slate-700">
                Active only
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
                href="/admin/contracts"
                className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>
        <p className="text-sm text-slate-600">
          {contracts.length} contract{contracts.length === 1 ? "" : "s"} shown
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {groupOrder.map((key) => {
          const rows = grouped.get(key) ?? [];
          const first = rows[0];
          if (!first) return null;
          const title = supplierDisplayName(first);
          return (
            <details
              key={key}
              open
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex w-full items-center justify-between gap-2">
                  <span className="truncate">{title}</span>
                  <span className="shrink-0 text-xs font-normal text-slate-500">
                    {rows.length} contract{rows.length === 1 ? "" : "s"} ·{" "}
                    <span className="capitalize">{first.supplierType}</span>
                  </span>
                </span>
              </summary>
              <div className="border-t border-slate-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Supplier name</th>
                        <th className="px-4 py-3">Supplier type</th>
                        <th className="px-4 py-3">Season</th>
                        <th className="px-4 py-3">Net cost</th>
                        <th className="px-4 py-3">Cost per</th>
                        <th className="px-4 py-3">Valid from</th>
                        <th className="px-4 py-3">Valid to</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/contracts/${row.id}/edit`}
                              className="font-medium text-slate-800 hover:text-teal-700"
                            >
                              {supplierDisplayName(row)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
                              <span
                                className={[
                                  "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                                  supplierTypeBadgeClass(row.supplierType),
                                ].join(" ")}
                              >
                                {row.supplierType}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
                              <span
                                className={[
                                  "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                  seasonBadgeClass(row.season),
                                ].join(" ")}
                              >
                                {row.season}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium tabular-nums text-slate-800">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
                              {formatCop(row.netCostCop)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
                              {COST_PER_LABELS[row.costPerWhat] ?? row.costPerWhat}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600 tabular-nums">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
                              {formatDate(row.validFrom)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600 tabular-nums">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
                              {formatDate(row.validTo)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/contracts/${row.id}/edit`} className="block">
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
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          );
        })}

        {contracts.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
            No contracts match your filters.
          </div>
        )}
      </div>
    </section>
  );
}
