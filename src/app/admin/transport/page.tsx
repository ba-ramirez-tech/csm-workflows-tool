import Link from "next/link";
import { TransportMode } from "@prisma/client";
import { Bus, Car, CircleDot, Footprints, Plane, Ship, Truck } from "lucide-react";
import { formatMinutesToLabel } from "@/lib/format-duration";
import { prisma } from "@/lib/prisma";

type TransportListPageProps = {
  searchParams?: Promise<{
    q?: string;
    mode?: string;
    originId?: string;
    destinationId?: string;
    message?: string;
  }>;
};

const MODES = Object.values(TransportMode);

const modeIcons: Record<TransportMode, React.ComponentType<{ className?: string }>> = {
  PRIVATE_CAR: Car,
  MINIVAN: Truck,
  BUS: Bus,
  FLIGHT: Plane,
  BOAT: Ship,
  FOUR_BY_FOUR: Truck,
  JEEP_WILLYS: Car,
  HORSE: CircleDot,
  WALKING: Footprints,
  CANOE: Ship,
};

function ModeDisplay({ mode }: { mode: TransportMode }) {
  const Icon = modeIcons[mode] ?? CircleDot;
  const label = mode.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
      <span className="font-medium">{label}</span>
    </span>
  );
}

function AltitudeChange({ start, end }: { start: number | null; end: number | null }) {
  if (start == null && end == null) {
    return <span className="text-slate-500">—</span>;
  }
  const s = start != null ? `${start}m` : "—";
  const e = end != null ? `${end}m` : "—";
  if (start != null && end != null) {
    const delta = end - start;
    const arrowClass = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-400";
    return (
      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-slate-800">
        <span>{s}</span>
        <span className={arrowClass} aria-hidden="true">
          →
        </span>
        <span>{e}</span>
      </span>
    );
  }
  return (
    <span className="tabular-nums text-slate-700">
      {s} → {e}
    </span>
  );
}

export default async function TransportListPage({ searchParams }: TransportListPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const modeParam = params?.mode?.trim() ?? "";
  const originId = params?.originId?.trim() ?? "";
  const destinationId = params?.destinationId?.trim() ?? "";
  const message = params?.message;

  const modeFilter = MODES.includes(modeParam as TransportMode) ? (modeParam as TransportMode) : undefined;

  const destinations = await prisma.destination.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const routes = await prisma.transportRoute.findMany({
    where: {
      AND: [
        q ? { provider: { contains: q, mode: "insensitive" } } : {},
        modeFilter ? { mode: modeFilter } : {},
        originId ? { originId } : {},
        destinationId ? { destinationId } : {},
      ],
    },
    include: {
      origin: { select: { name: true } },
      destination: { select: { name: true } },
    },
    orderBy: [{ origin: { name: "asc" } }, { destination: { name: "asc" } }, { provider: "asc" }],
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <form
            action="/admin/transport"
            method="get"
            className="flex flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
          >
            <div className="flex w-full min-w-[180px] max-w-md flex-1 flex-col gap-1">
              <label htmlFor="q" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Provider
              </label>
              <input
                id="q"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by provider"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              />
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label htmlFor="mode" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Mode
              </label>
              <select
                id="mode"
                name="mode"
                defaultValue={modeParam}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All modes</option>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="originId" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Origin
              </label>
              <select
                id="originId"
                name="originId"
                defaultValue={originId}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
              >
                <option value="">All origins</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
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
                  <option key={`dest-${d.id}`} value={d.id}>
                    {d.name}
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
                href="/admin/transport"
                className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
              >
                Reset
              </Link>
            </div>
          </form>

          <Link
            href="/admin/transport/new"
            className="inline-flex shrink-0 items-center justify-center self-stretch rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 lg:self-start"
          >
            Add Transport Route
          </Link>
        </div>

        <p className="text-sm text-slate-600">
          {routes.length} route{routes.length === 1 ? "" : "s"}
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
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Altitude change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/transport/${row.id}/edit`}
                      className="block font-medium text-slate-800"
                    >
                      {row.origin.name} → {row.destination.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <Link href={`/admin/transport/${row.id}/edit`} className="block">
                      <ModeDisplay mode={row.mode} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/transport/${row.id}/edit`} className="block">
                      {row.provider ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    <Link href={`/admin/transport/${row.id}/edit`} className="block">
                      {row.distanceKm != null ? `${row.distanceKm} km` : "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    <Link href={`/admin/transport/${row.id}/edit`} className="block">
                      {formatMinutesToLabel(row.durationMinutes)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/transport/${row.id}/edit`} className="block">
                      <AltitudeChange start={row.altitudeStart} end={row.altitudeEnd} />
                    </Link>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No transport routes found.
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
