import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { getIntakePageState } from "@/lib/intake/token";
import { getPublicAppUrl } from "@/lib/email/client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const base = getPublicAppUrl();
  const url = `${base}/intake/${token}`;
  const title = "Your Trip to Colombia Starts Here 🇨🇴";
  const description = "Tell us about your dream trip so we can craft the perfect experience.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Colombie sur mesure",
      locale: "fr_FR",
      type: "website",
      images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630, alt: "Colombie sur mesure" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${url}/opengraph-image`],
    },
  };
}

export default async function IntakePage({ params }: Props) {
  const { token } = await params;
  const state = await getIntakePageState(token);

  if (state.kind === "not_found") {
    notFound();
  }

  if (state.kind === "expired") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">Lien expiré</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Ce questionnaire n&apos;est plus disponible. Contactez votre concierge pour recevoir un nouveau lien.
        </p>
        <Link href="/" className="mt-8 text-sm font-medium text-teal-800 underline dark:text-teal-400">
          Retour
        </Link>
      </div>
    );
  }

  if (state.kind === "completed") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">Merci !</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Nous avons déjà reçu le questionnaire de {state.clientName}. Votre concierge vous recontacte très bientôt.
        </p>
      </div>
    );
  }

  return (
    <IntakeForm
      token={state.token}
      client={state.client}
      serverPartial={state.partialData}
      initialStep={Math.min(7, Math.max(1, state.currentStep))}
    />
  );
}
