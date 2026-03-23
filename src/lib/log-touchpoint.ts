import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LogTouchpointInput = {
  clientId: string;
  channel: string;
  category: string;
  direction?: string;
  subject?: string;
  summary?: string;
  outcome?: string;
  attachmentUrl?: string;
  externalRef?: string;
  contentType?: string;
  contentName?: string;
  agentId?: string;
  agentName?: string;
  bookingId?: string;
  duration?: number;
  touchpointAt?: Date;
};

/**
 * Creates a `ClientTouchpoint` row. Use for manual and automated CRM logging.
 */
export async function logTouchpoint(data: LogTouchpointInput): Promise<void> {
  const {
    clientId,
    channel,
    category,
    direction = "outbound",
    subject,
    summary,
    outcome,
    attachmentUrl,
    externalRef,
    contentType,
    contentName,
    agentId,
    agentName,
    bookingId,
    duration,
    touchpointAt,
  } = data;

  if (!clientId || !channel || !category) return;

  await prisma.clientTouchpoint.create({
    data: {
      clientId,
      bookingId: bookingId ?? undefined,
      channel,
      category,
      direction,
      subject: subject?.slice(0, 500) ?? undefined,
      summary: summary?.slice(0, 8000) ?? undefined,
      outcome: outcome ?? undefined,
      attachmentUrl: attachmentUrl?.slice(0, 2000) ?? undefined,
      externalRef: externalRef?.slice(0, 500) ?? undefined,
      contentType: contentType ?? undefined,
      contentName: contentName?.slice(0, 500) ?? undefined,
      agentId: agentId ?? undefined,
      agentName: agentName?.slice(0, 200) ?? undefined,
      duration: duration ?? undefined,
      touchpointAt: touchpointAt ?? new Date(),
    },
  });
}

/** After successful AI proposal generation (API route). */
export async function logAiProposalGenerated(clientId: string, numProposals: number): Promise<void> {
  const u = getCurrentUser();
  await logTouchpoint({
    clientId,
    channel: "internal",
    category: "quotation",
    direction: "outbound",
    subject: "AI proposal generated",
    summary: `AI proposal generated — ${numProposals} options created`,
    agentId: u.id,
    agentName: u.name,
  });
}

/** Intake invitation email sent from admin. */
export async function logIntakeInviteEmailSent(clientId: string, intakeUrl: string): Promise<void> {
  await logTouchpoint({
    clientId,
    channel: "email_sent",
    category: "marketing",
    direction: "outbound",
    subject: "Questionnaire d’accueil envoyé",
    contentType: "intake_form_sent",
    contentName: intakeUrl.slice(0, 200),
  });
}

/** Client opened the intake form (first progress after PENDING). */
export async function logIntakeFormStarted(clientId: string, tokenId: string): Promise<void> {
  const ext = `intake_token:${tokenId}`;
  const dup = await prisma.clientTouchpoint.findFirst({
    where: { clientId, contentType: "intake_form_started", externalRef: ext },
    select: { id: true },
  });
  if (dup) return;

  await logTouchpoint({
    clientId,
    channel: "website_visit",
    category: "marketing",
    direction: "inbound",
    subject: "Questionnaire démarré",
    contentType: "intake_form_started",
    externalRef: ext,
  });
}

/** Intake submitted successfully. */
export async function logIntakeFormCompleted(clientId: string, tokenId: string): Promise<void> {
  await logTouchpoint({
    clientId,
    channel: "website_visit",
    category: "marketing",
    direction: "inbound",
    subject: "Questionnaire complété",
    contentType: "intake_form_completed",
    externalRef: `intake_token:${tokenId}`,
  });
}

/** Wire from quote creation UI when implemented. */
export async function logQuoteCreated(params: {
  clientId: string;
  quoteId: string;
  quoteName: string | null;
  agentId?: string;
  agentName?: string;
}): Promise<void> {
  await logTouchpoint({
    clientId: params.clientId,
    channel: "internal",
    category: "quotation",
    direction: "internal",
    subject: `Devis créé : ${params.quoteName ?? "Sans titre"}`,
    externalRef: `quote:${params.quoteId}`,
    agentId: params.agentId,
    agentName: params.agentName,
  });
}

/** Wire when a quote is marked sent / email goes out. */
export async function logQuoteSent(params: {
  clientId: string;
  quoteId: string;
  subject?: string;
  agentId?: string;
  agentName?: string;
}): Promise<void> {
  await logTouchpoint({
    clientId: params.clientId,
    channel: "email_sent",
    category: "quotation",
    direction: "outbound",
    subject: params.subject ?? "Devis envoyé",
    externalRef: `quote:${params.quoteId}`,
    agentId: params.agentId,
    agentName: params.agentName,
  });
}

/** Wire when booking status becomes CONFIRMED. */
export async function logBookingConfirmed(params: {
  clientId: string;
  bookingId: string;
  dossierNumber: string;
  agentId?: string;
  agentName?: string;
}): Promise<void> {
  await logTouchpoint({
    clientId: params.clientId,
    bookingId: params.bookingId,
    channel: "internal",
    category: "booking_confirmation",
    direction: "internal",
    subject: `Réservation confirmée — ${params.dossierNumber}`,
    externalRef: `booking:${params.bookingId}`,
    agentId: params.agentId,
    agentName: params.agentName,
  });
}

/** Wire when roadbook.publishedAt is set. */
export async function logRoadbookPublished(params: {
  clientId: string;
  bookingId: string;
  agentId?: string;
  agentName?: string;
}): Promise<void> {
  await logTouchpoint({
    clientId: params.clientId,
    bookingId: params.bookingId,
    channel: "internal",
    category: "operational",
    direction: "internal",
    subject: "Carnet de voyage publié",
    contentType: "roadbook_published",
    agentId: params.agentId,
    agentName: params.agentName,
  });
}

/** Client opened the public roadbook share link. */
export async function logRoadbookViewed(params: {
  clientId: string;
  bookingId: string;
  shareToken: string;
}): Promise<void> {
  await logTouchpoint({
    clientId: params.clientId,
    bookingId: params.bookingId,
    channel: "website_visit",
    category: "marketing",
    direction: "inbound",
    subject: "Carnet de voyage consulté",
    contentType: "roadbook_viewed",
    externalRef: `roadbook_token:${params.shareToken.slice(0, 80)}`,
  });
}
