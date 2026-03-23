import Link from "next/link";
import { IntakeTokenStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabel: Record<IntakeTokenStatus, string> = {
  [IntakeTokenStatus.PENDING]: "En attente",
  [IntakeTokenStatus.IN_PROGRESS]: "En cours",
  [IntakeTokenStatus.COMPLETED]: "Complété",
  [IntakeTokenStatus.EXPIRED]: "Expiré",
};

export default async function AdminIntakesPage() {
  const rows = await prisma.intakeToken.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      client: { select: { id: true, name: true, email: true } },
      response: { select: { id: true, submittedAt: true } },
    },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Questionnaires (intake)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Liens envoyés aux clients — statut et réponses enregistrées.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Client</th>
              <th className="py-2 pr-4 font-medium">Statut</th>
              <th className="py-2 pr-4 font-medium">Étape</th>
              <th className="py-2 pr-4 font-medium">Créé</th>
              <th className="py-2 font-medium">Réponse</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="py-3 pr-4">
                  <Link href={`/admin/clients/${t.clientId}`} className="font-medium text-teal-800 hover:underline">
                    {t.client.name}
                  </Link>
                  {t.client.email ? (
                    <div className="text-xs text-slate-500">{t.client.email}</div>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-slate-700">{statusLabel[t.status]}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-600">{t.currentStep} / 7</td>
                <td className="py-3 pr-4 text-slate-600">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                <td className="py-3">
                  {t.response ? (
                    <Link href={`/admin/intakes/${t.id}`} className="text-teal-700 hover:underline">
                      Voir ({t.response.submittedAt.toLocaleDateString("fr-FR")})
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="mt-6 text-sm text-slate-500">Aucun questionnaire pour le moment.</p> : null}
      </div>
    </section>
  );
}
