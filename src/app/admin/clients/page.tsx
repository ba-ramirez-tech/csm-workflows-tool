import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { CreateClientForm } from "./create-client-form";

export const dynamic = "force-dynamic";

const ACTIVE_LEAD = new Set<LeadStatus>([
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.DISCOVERY_DONE,
  LeadStatus.QUOTED,
  LeadStatus.NEGOTIATING,
]);

export default async function AdminClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { intakeTokens: true, intakeResponses: true } },
    },
  });

  const tpRows = await prisma.clientTouchpoint.findMany({
    orderBy: { touchpointAt: "desc" },
    take: 5000,
    select: { clientId: true, touchpointAt: true },
  });
  const lastContactByClient = new Map<string, Date>();
  for (const r of tpRows) {
    if (!lastContactByClient.has(r.clientId)) lastContactByClient.set(r.clientId, r.touchpointAt);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
      <p className="mt-1 text-sm text-slate-600">CRM — questionnaires et dossiers.</p>
      <p className="mt-2 text-sm text-slate-500">
        Les préférences de langue (documents, langues parlées, langue du guide) s’affichent sur la{" "}
        <strong className="font-medium text-slate-700">fiche client</strong>, pas dans ce tableau.
      </p>

      <CreateClientForm />

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Nom</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Dernier contact</th>
              <th className="py-2 pr-4 font-medium">Intakes</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const last = lastContactByClient.get(c.id);
              const daysSince = last ? differenceInCalendarDays(new Date(), last) : null;
              const isCold = ACTIVE_LEAD.has(c.leadStatus) && (last == null || (daysSince != null && daysSince >= 7));
              const lastLabel = last
                ? formatDistanceToNow(last, { addSuffix: true, locale: fr })
                : "—";
              return (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-medium text-slate-900">
                  <Link href={`/admin/clients/${c.id}`} className="text-teal-800 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-slate-600">{c.email ?? "—"}</td>
                <td
                  className={`py-3 pr-4 text-sm tabular-nums ${isCold ? "font-medium text-red-600 dark:text-red-400" : "text-slate-600 dark:text-gray-400"}`}
                >
                  {lastLabel}
                </td>
                <td className="py-3 pr-4 tabular-nums text-slate-600">
                  {c._count.intakeResponses} rép. / {c._count.intakeTokens} liens
                </td>
                <td className="py-3">
                  <Link href={`/admin/clients/${c.id}/intake`} className="text-teal-700 hover:underline">
                    Questionnaire
                  </Link>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {clients.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            Aucun client pour l’instant. Utilisez le formulaire ci-dessus pour en créer un, puis ouvrez sa fiche pour
            voir les préférences de langue (et les éventuelles alertes sur les destinations).
          </p>
        ) : null}
      </div>
    </section>
  );
}
