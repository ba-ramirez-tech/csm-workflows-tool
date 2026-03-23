import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<{ clientId?: string }> };

export default async function IntakeUnsubscribePage({ searchParams }: Search) {
  const { clientId } = await searchParams;
  let ok = false;
  if (clientId && /^[0-9a-f-]{36}$/i.test(clientId)) {
    await prisma.client.updateMany({
      where: { id: clientId },
      data: { marketingOptOut: true },
    });
    ok = true;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-bold text-[#0F2B1F]">
        {ok ? "Préférences enregistrées" : "Lien invalide"}
      </h1>
      <p className="mt-3 text-sm text-[#5C5A52]">
        {ok
          ? "Vous ne recevrez plus nos emails de découverte. Votre concierge peut toujours vous écrire pour votre dossier voyage."
          : "Ce lien de désinscription n’est pas valide."}
      </p>
      <Link href="/" className="mt-8 text-sm font-medium text-[#2D6A4F] underline">
        Accueil
      </Link>
    </div>
  );
}
