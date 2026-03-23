import Link from "next/link";
import { prisma } from "@/lib/prisma";

type DestinationsPageProps = {
  searchParams?: Promise<{
    q?: string;
    message?: string;
  }>;
};

const languageLabels: Record<string, string> = {
  fr: "FR",
  en: "EN",
  es: "ES",
  de: "DE",
};

function ToggleIndicator({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={[
        "inline-flex h-6 w-11 items-center rounded-full p-1 transition",
        enabled ? "bg-emerald-500/20" : "bg-slate-200",
      ].join(" ")}
    >
      <span
        className={[
          "h-4 w-4 rounded-full transition",
          enabled ? "translate-x-5 bg-emerald-600" : "translate-x-0 bg-slate-500",
        ].join(" ")}
      />
    </span>
  );
}

export default async function DestinationsListPage({ searchParams }: DestinationsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const message = params?.message;

  const destinations = await prisma.destination.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { region: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ name: "asc" }],
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <form action="/admin/destinations" className="flex w-full max-w-md items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or region"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Search
          </button>
        </form>

        <Link
          href="/admin/destinations/new"
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          Add Destination
        </Link>
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
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Altitude</th>
                <th className="px-4 py-3">Languages</th>
                <th className="px-4 py-3">Trekking</th>
                <th className="px-4 py-3">Rental</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {destinations.map((destination) => (
                <tr key={destination.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block font-medium text-slate-800">
                      {destination.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block">
                      {destination.region}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block">
                      {destination.altitudeMeters ? `${destination.altitudeMeters} m` : "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block">
                      <div className="flex flex-wrap gap-1.5">
                        {destination.languagesAvailable.map((lang) => (
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
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block">
                      <ToggleIndicator enabled={destination.trekkingAvailable} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block">
                      <ToggleIndicator enabled={destination.rentalAvailable} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/destinations/${destination.id}/edit`} className="block">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                          destination.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700",
                        ].join(" ")}
                      >
                        {destination.isActive ? "Active" : "Inactive"}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
              {destinations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No destinations found.
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
