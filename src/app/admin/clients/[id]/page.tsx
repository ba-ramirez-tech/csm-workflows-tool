import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatus, LeadStatus } from "@prisma/client";
import { ClientDocumentsSection } from "@/components/admin/client-documents-section";
import { ClientFlightsSection } from "@/components/admin/client-flights-section";
import { ClientOperationalSection } from "@/components/admin/client-operational-section";
import { ClientOperationalTools } from "@/components/admin/client-operational-tools";
import { ClientActivityTimeline } from "@/components/admin/client-activity-timeline";
import { AiProposalModal } from "@/components/admin/ai-proposal-modal";
import { ClientAiProposalsSection } from "@/components/admin/client-ai-proposals-section";
import { DiscoveryProfileSection } from "@/components/admin/discovery-profile-section";
import { DISCOVERY_INTAKE_FIELDS } from "@/lib/admin/discovery-intake-fields";
import { ensureOperationalFormToken } from "@/lib/admin/client-operational";
import { getGuideLanguageGapsForClient, languageCodeLabel } from "@/lib/admin/guide-language-warnings";
import { clientDocumentTypeOptions } from "@/lib/admin/client-document-type-options";
import { getPublicAppUrl } from "@/lib/email/client";
import { getAnthropicApiKey } from "@/lib/ai/env";
import { aiProposalItemSchema } from "@/lib/ai/proposal-response-schema";
import { prisma } from "@/lib/prisma";

const LANG_FLAG: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
};

function LangBadge({ code, label }: { code: string; label?: string }) {
  const flag = LANG_FLAG[code] ?? "🏳️";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm">
      <span className="text-base leading-none" aria-hidden>
        {flag}
      </span>
      {label ?? code.toUpperCase()}
    </span>
  );
}

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      flights: { orderBy: { date: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      operationalDetails: true,
      bookings: {
        select: { id: true, status: true, dossierNumber: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) notFound();

  const discoveryKeys = DISCOVERY_INTAKE_FIELDS.map((f) => f.key);
  const [latestIntake, discoveryPrefs, touchpointsRaw, discoveryPreferenceCount] = await Promise.all([
    prisma.intakeResponse.findFirst({
      where: { clientId: id },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.clientPreference.findMany({
      where: { clientId: id, questionKey: { in: discoveryKeys } },
      select: { questionKey: true, agentNote: true, agentNoteBy: true, agentNoteAt: true },
    }),
    prisma.clientTouchpoint.findMany({
      where: { clientId: id },
      orderBy: { touchpointAt: "desc" },
      take: 400,
    }),
    prisma.clientPreference.count({ where: { clientId: id } }),
  ]);

  const touchpointsForUi = touchpointsRaw.map((t) => ({
    id: t.id,
    bookingId: t.bookingId,
    channel: t.channel,
    category: t.category,
    direction: t.direction,
    subject: t.subject,
    summary: t.summary,
    outcome: t.outcome,
    attachmentUrl: t.attachmentUrl,
    externalRef: t.externalRef,
    contentType: t.contentType,
    contentName: t.contentName,
    agentId: t.agentId,
    agentName: t.agentName,
    duration: t.duration,
    touchpointAt: t.touchpointAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }));

  const appBase = getPublicAppUrl();
  const canShareOperational =
    client.leadStatus === LeadStatus.QUOTED || client.leadStatus === LeadStatus.NEGOTIATING;
  const opsToken = canShareOperational
    ? await ensureOperationalFormToken(id)
    : (client.operationalFormToken ?? "");

  const guideGaps =
    client.guideLanguage != null && client.guideLanguage !== ""
      ? await getGuideLanguageGapsForClient(client.id, client.guideLanguage)
      : [];

  const hasConfirmedBooking = client.bookings.some((b) => b.status === BookingStatus.CONFIRMED);
  const hasArrival = client.flights.some((f) => f.direction === "arrival");
  const hasDeparture = client.flights.some((f) => f.direction === "departure");

  const documentTypeOptions = clientDocumentTypeOptions.map((o) => ({ value: o.value, label: o.label }));
  const aiConfigured = getAnthropicApiKey() != null;

  const aiProposalRowsRaw = await prisma.aiProposal.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      proposalName: true,
      tagline: true,
      durationDays: true,
      tier: true,
      estimatedPriceRange: true,
      quoteId: true,
      createdAt: true,
      fullResponse: true,
    },
  });

  const initialAiProposals = aiProposalRowsRaw.map((r) => {
    const parsed = aiProposalItemSchema.safeParse(r.fullResponse);
    return {
      id: r.id,
      status: r.status,
      proposalName: r.proposalName,
      tagline: r.tagline,
      durationDays: r.durationDays,
      tier: r.tier,
      estimatedPriceRange: r.estimatedPriceRange,
      quoteId: r.quoteId,
      createdAt: r.createdAt.toISOString(),
      proposal: parsed.success ? parsed.data : null,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/clients" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Clients
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">{client.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/clients/${client.id}/intake`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Partager questionnaire
            </Link>
            {canShareOperational ? (
              <Link
                href={`/admin/clients/${client.id}#operational-share`}
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
              >
                Formulaire opérationnel
              </Link>
            ) : null}
            <AiProposalModal
              clientId={client.id}
              clientName={client.name}
              discoveryPreferenceCount={discoveryPreferenceCount}
              aiConfigured={aiConfigured}
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
          {client.email ?? "Pas d’email"} · {client.phone ?? "Pas de téléphone"}
        </p>
      </div>

      <ClientActivityTimeline
        clientId={client.id}
        leadStatus={client.leadStatus}
        touchpoints={touchpointsForUi}
        bookings={client.bookings}
      />

      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/50">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Language preferences</h2>
        <p className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Documents &amp; communications</span>
          <LangBadge code={client.preferredLanguage} label={languageCodeLabel(client.preferredLanguage)} />
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Spoken</span>
          {client.spokenLanguages.length === 0 ? (
            <span className="text-sm text-slate-500 dark:text-gray-400">—</span>
          ) : (
            client.spokenLanguages.map((code) => (
              <LangBadge key={code} code={code} label={languageCodeLabel(code)} />
            ))
          )}
        </p>
        <p className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Guide preference</span>
          {client.guideLanguage ? (
            <LangBadge code={client.guideLanguage} label={languageCodeLabel(client.guideLanguage)} />
          ) : (
            <span className="text-sm text-slate-500 dark:text-gray-400">—</span>
          )}
        </p>
        {guideGaps.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-amber-200/80 pt-4">
            {guideGaps.map((g) => (
              <li
                key={g.destinationId}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
              >
                Note: {g.destinationName} may not have {languageCodeLabel(g.guideLanguageCode)} speaking guides
                available. Consider{" "}
                {g.availableLanguageCodes.length > 0
                  ? g.availableLanguageCodes.map(languageCodeLabel).join(", ")
                  : "confirming availability"}.
              </li>
            ))}
          </ul>
        )}
      </section>

      <div id="discovery">
        <DiscoveryProfileSection
          clientId={client.id}
          fullResponse={latestIntake?.fullResponse ?? null}
          preferenceRows={discoveryPrefs}
        />
      </div>

      <ClientAiProposalsSection clientId={client.id} initialRows={initialAiProposals} />

      {canShareOperational ? (
        <div id="operational-share">
          <ClientOperationalTools
            clientId={client.id}
            clientName={client.name}
            appBaseUrl={appBase}
            activePublicToken={opsToken}
          />
        </div>
      ) : null}

      <ClientOperationalSection clientId={client.id} initial={client.operationalDetails} />

      <ClientFlightsSection
        clientId={client.id}
        flights={client.flights}
        bookings={client.bookings}
        showMissingArrival={hasConfirmedBooking && !hasArrival}
        showMissingDeparture={hasConfirmedBooking && !hasDeparture}
      />

      <ClientDocumentsSection
        clientId={client.id}
        documents={client.documents}
        documentTypeOptions={documentTypeOptions}
      />
    </div>
  );
}
