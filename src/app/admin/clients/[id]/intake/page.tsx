import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientIntakeTools } from "@/components/admin/client-intake-tools";
import { getPublicAppUrl } from "@/lib/email/client";
import { ensureActiveIntakeToken } from "@/lib/admin/client-intake";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClientIntakeAdminPage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      emailLogs: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });
  if (!client) notFound();

  const activeRow = await ensureActiveIntakeToken(client.id);
  const base = getPublicAppUrl();

  return (
    <section className="space-y-8">
      <div>
        <Link href={`/admin/clients/${id}`} className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Fiche client
        </Link>
        <span className="mx-2 text-slate-300">|</span>
        <Link href="/admin/clients" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Tous les clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Questionnaire — {client.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{client.email ?? "Pas d’email"}</p>
      </div>

      <ClientIntakeTools
        clientId={client.id}
        clientName={client.name}
        clientEmail={client.email}
        appBaseUrl={base}
        activePublicToken={activeRow.token}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Emails envoyés (aperçu)</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {client.emailLogs.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-2 border-b border-slate-50 py-2">
              <span className="font-medium">{e.template}</span>
              <span className="text-slate-500">{e.status}</span>
              <span className="text-xs text-slate-400">{e.sentAt.toLocaleString("fr-FR")}</span>
              {e.openedAt ? <span className="text-xs text-emerald-700">Ouvert</span> : null}
              {e.clickedAt ? <span className="text-xs text-emerald-700">Clic</span> : null}
            </li>
          ))}
        </ul>
        {client.emailLogs.length === 0 ? <p className="mt-2 text-sm text-slate-500">Aucun email logué.</p> : null}
      </div>
    </section>
  );
}
