import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Globe, Mail, MessageCircle, Phone, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function channelGlyph(channel: string) {
  if (channel === "call") return <Phone className="h-4 w-4 shrink-0 text-slate-500" />;
  if (channel === "whatsapp") return <MessageCircle className="h-4 w-4 shrink-0 text-slate-500" />;
  if (channel === "email_sent" || channel === "email_received")
    return <Mail className="h-4 w-4 shrink-0 text-slate-500" />;
  if (channel === "video_call") return <Video className="h-4 w-4 shrink-0 text-slate-500" />;
  return <Globe className="h-4 w-4 shrink-0 text-slate-500" />;
}

export default async function AdminDashboardPage() {
  const recent = await prisma.clientTouchpoint.findMany({
    orderBy: { touchpointAt: "desc" },
    take: 10,
    include: { client: { select: { id: true, name: true } } },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          Welcome to Travel Workflow admin. Use the sidebar to manage destinations and operations.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Activité récente</h2>
          <span className="text-xs text-slate-500 dark:text-gray-500">10 derniers contacts (tous clients)</span>
        </div>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-gray-700">
          {recent.length === 0 ? (
            <li className="py-4 text-sm text-slate-500 dark:text-gray-400">Aucune activité enregistrée pour l’instant.</li>
          ) : (
            recent.map((t) => {
              const rel = formatDistanceToNow(t.touchpointAt, { addSuffix: true, locale: fr });
              return (
                <li key={t.id} className="flex gap-3 py-3">
                  {channelGlyph(t.channel)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-gray-100">
                      <Link href={`/admin/clients/${t.client.id}`} className="text-teal-800 hover:underline dark:text-teal-400">
                        {t.client.name}
                      </Link>
                    </p>
                    <p className="truncate text-sm text-slate-600 dark:text-gray-400">{t.subject ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">{rel}</p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <p className="mt-4 text-sm">
          <span className="text-slate-500 dark:text-gray-500">Vue analytique complète : </span>
          <span className="text-slate-400 dark:text-gray-600">bientôt</span>
        </p>
      </section>
    </div>
  );
}
