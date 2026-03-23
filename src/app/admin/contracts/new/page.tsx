import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createContractAction } from "../actions";
import { ContractCreateForm } from "../contract-create-form";

export default async function NewContractPage() {
  requireRole("SUPER_ADMIN");

  const [accommodationsRaw, experiencesRaw, transportsRaw] = await Promise.all([
    prisma.accommodation.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, destination: { select: { name: true } } },
    }),
    prisma.experience.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, destination: { select: { name: true } } },
    }),
    prisma.transportRoute.findMany({
      orderBy: [{ origin: { name: "asc" } }, { destination: { name: "asc" } }],
      select: {
        id: true,
        origin: { select: { name: true } },
        destination: { select: { name: true } },
      },
    }),
  ]);

  const accommodations = accommodationsRaw.map((a) => ({
    id: a.id,
    label: `${a.name} (${a.destination.name})`,
  }));

  const experiences = experiencesRaw.map((e) => ({
    id: e.id,
    label: `${e.name} (${e.destination.name})`,
  }));

  const transports = transportsRaw.map((t) => ({
    id: t.id,
    label: `${t.origin.name} → ${t.destination.name}`,
  }));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Add contract</h1>
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
              Confidential
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Link a net cost to a supplier for a season and validity window.</p>
        </div>
        <Link href="/admin/contracts" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to list
        </Link>
      </div>

      <ContractCreateForm
        accommodations={accommodations}
        experiences={experiences}
        transports={transports}
        action={createContractAction}
      />
    </section>
  );
}
