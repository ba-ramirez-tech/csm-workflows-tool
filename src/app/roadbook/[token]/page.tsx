import Link from "next/link";
import { notFound } from "next/navigation";
import { logRoadbookViewed } from "@/lib/log-touchpoint";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function PublicRoadbookPage({ params }: Props) {
  const { token } = await params;
  const roadbook = await prisma.roadbook.findUnique({
    where: { shareToken: token },
    include: {
      booking: { select: { id: true, clientId: true, dossierNumber: true, travelStart: true, travelEnd: true } },
    },
  });
  if (!roadbook?.booking) notFound();

  await logRoadbookViewed({
    clientId: roadbook.booking.clientId,
    bookingId: roadbook.booking.id,
    shareToken: token,
  }).catch(() => {});

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-16 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="font-serif text-2xl font-bold text-teal-900 dark:text-teal-100">Carnet de voyage</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Dossier <span className="font-mono font-medium">{roadbook.booking.dossierNumber}</span>
        </p>
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          La consultation de ce carnet a été enregistrée. Le contenu détaillé du roadbook sera affiché ici lorsque
          l’équipe l’aura branché à cette page.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-teal-800 underline dark:text-teal-400">
          Retour
        </Link>
      </div>
    </div>
  );
}
