import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tokenId: string }> };

export default async function AdminIntakeDetailPage({ params }: Props) {
  const { tokenId } = await params;
  const row = await prisma.intakeToken.findUnique({
    where: { id: tokenId },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      response: true,
    },
  });
  if (!row) notFound();

  const printable = row.response?.fullResponse ?? row.partialData;

  return (
    <section className="print:shadow-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-0">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <Link href="/admin/intakes" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            ← Tous les intakes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Réponse questionnaire</h1>
          <p className="mt-1 text-sm text-slate-600">
            {row.client.name}
            {row.client.email ? ` · ${row.client.email}` : ""}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-semibold text-slate-900">Colombie sur mesure — Intake</h1>
        <p className="text-sm text-slate-600">
          {row.client.name} · {row.client.email ?? "—"} · {row.client.phone ?? "—"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Soumis : {row.response?.submittedAt.toLocaleString("fr-FR") ?? "Brouillon / partiel"}
        </p>
      </div>

      {!row.response ? (
        <p className="mt-6 text-sm text-amber-800">
          Pas encore soumis — données partielles ci-dessous (auto-sauvegarde).
        </p>
      ) : null}

      <pre className="mt-6 overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 print:bg-white print:p-0">
        {JSON.stringify(printable, null, 2)}
      </pre>

      <p className="mt-6 text-xs text-slate-500 print:hidden">
        <Link href={`/admin/clients/${row.clientId}/intake`} className="text-teal-700 hover:underline">
          Gérer les liens pour ce client
        </Link>
      </p>
    </section>
  );
}
