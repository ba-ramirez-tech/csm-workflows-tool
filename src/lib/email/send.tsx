import { render } from "@react-email/render";
import type { Prisma } from "@prisma/client";
import type { ReactElement } from "react";
import { prisma } from "@/lib/prisma";
import { getEmailFrom, getResend } from "./client";
import { IntakeConfirmationEmail } from "./templates/IntakeConfirmation";
import { IntakeInviteEmail } from "./templates/IntakeInvite";
import { IntakeReminderEmail } from "./templates/IntakeReminder";
import { QuoteReviewEmail } from "./templates/QuoteReview";
import { DripCheckInEmail } from "./templates/drip/CheckIn";
import { DripItineraryTeaserEmail } from "./templates/drip/ItineraryTeaser";
import { DripRegionHighlightEmail } from "./templates/drip/RegionHighlight";
import { DripTravelTipsEmail } from "./templates/drip/TravelTips";

export type EmailTemplateId =
  | "intake_invite"
  | "intake_reminder"
  | "intake_confirmation"
  | "drip_travel_tips"
  | "drip_region"
  | "drip_itinerary_teaser"
  | "drip_checkin"
  | "quote_review";

type SendArgs = {
  to: string;
  clientId: string;
  template: EmailTemplateId;
  subject: string;
  react: ReactElement;
  metadata?: Record<string, unknown>;
};

export async function sendEmail({ to, clientId, template, subject, react, metadata }: SendArgs): Promise<{
  ok: boolean;
  error?: string;
  resendId?: string;
}> {
  const resend = getResend();
  const from = getEmailFrom();
  const html = await render(react);

  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — log only:", template, to);
    await prisma.emailLog.create({
      data: {
        clientId,
        template,
        subject,
        status: "skipped_no_provider",
        metadata: { ...(metadata ?? {}), to, htmlPreview: html.slice(0, 500) } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, error: "no_resend_key" };
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    await prisma.emailLog.create({
      data: {
        clientId,
        template,
        subject,
        status: "failed",
        metadata: { ...(metadata ?? {}), error: String(error.message ?? error) } as Prisma.InputJsonValue,
      },
    });
    return { ok: false, error: String(error.message ?? error) };
  }

  const resendId = data?.id ?? null;
  await prisma.emailLog.create({
    data: {
      clientId,
      template,
      subject,
      resendId: resendId ?? undefined,
      status: "sent",
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return { ok: true, resendId: resendId ?? undefined };
}

/** After quotation is linked on the client file; optional internal review (see QUOTE_REVIEW_EMAIL). */
export async function sendQuoteReviewEmail(params: {
  to: string;
  clientId: string;
  quoteName: string;
  clientName: string;
  printUrl: string;
  validUntilLabel: string;
}) {
  return sendEmail({
    to: params.to,
    clientId: params.clientId,
    template: "quote_review",
    subject: `[Revue devis] ${params.quoteName} — ${params.clientName}`,
    react: (
      <QuoteReviewEmail
        quoteName={params.quoteName}
        clientName={params.clientName}
        printUrl={params.printUrl}
        validUntilLabel={params.validUntilLabel}
      />
    ),
    metadata: { quotePrintUrl: params.printUrl },
  });
}

export async function sendIntakeInviteEmail(params: {
  to: string;
  clientId: string;
  firstName: string;
  intakeUrl: string;
}) {
  return sendEmail({
    to: params.to,
    clientId: params.clientId,
    template: "intake_invite",
    subject: `🇨🇴 ${params.firstName}, racontez-nous votre voyage de rêve`,
    react: (
      <IntakeInviteEmail firstName={params.firstName} intakeUrl={params.intakeUrl} />
    ),
  });
}

export async function sendIntakeReminderEmail(params: {
  to: string;
  clientId: string;
  firstName: string;
  intakeUrl: string;
  currentStep: number;
  totalSteps?: number;
}) {
  return sendEmail({
    to: params.to,
    clientId: params.clientId,
    template: "intake_reminder",
    subject: `Votre voyage en Colombie vous attend, ${params.firstName}`,
    react: (
      <IntakeReminderEmail
        firstName={params.firstName}
        intakeUrl={params.intakeUrl}
        currentStep={params.currentStep}
        totalSteps={params.totalSteps ?? 7}
      />
    ),
  });
}

export async function sendIntakeConfirmationEmail(params: {
  to: string;
  clientId: string;
  firstName: string;
  conciergeName: string;
  summaryLines: string[];
  unsubscribeUrl?: string;
}) {
  return sendEmail({
    to: params.to,
    clientId: params.clientId,
    template: "intake_confirmation",
    subject: `Merci ${params.firstName} — nous avons bien reçu votre questionnaire`,
    react: (
      <IntakeConfirmationEmail
        firstName={params.firstName}
        conciergeName={params.conciergeName}
        summaryLines={params.summaryLines}
        unsubscribeUrl={params.unsubscribeUrl}
      />
    ),
  });
}

export async function sendDripEmail(
  template: Exclude<EmailTemplateId, "intake_invite" | "intake_reminder" | "intake_confirmation">,
  params: { to: string; clientId: string; firstName: string; regionLabel?: string; unsubscribeUrl?: string },
) {
  const common = { to: params.to, clientId: params.clientId };
  switch (template) {
    case "drip_travel_tips":
      return sendEmail({
        ...common,
        template,
        subject: "5 choses à savoir avant votre voyage en Colombie",
        react: <DripTravelTipsEmail firstName={params.firstName} unsubscribeUrl={params.unsubscribeUrl} />,
      });
    case "drip_region":
      return sendEmail({
        ...common,
        template,
        subject: `Les expériences incontournables — ${params.regionLabel ?? "Colombie"}`,
        react: (
          <DripRegionHighlightEmail
            firstName={params.firstName}
            regionLabel={params.regionLabel ?? "votre région"}
            unsubscribeUrl={params.unsubscribeUrl}
          />
        ),
      });
    case "drip_itinerary_teaser":
      return sendEmail({
        ...common,
        template,
        subject: "Votre itinéraire prend forme — un aperçu",
        react: <DripItineraryTeaserEmail firstName={params.firstName} unsubscribeUrl={params.unsubscribeUrl} />,
      });
    case "drip_checkin":
      return sendEmail({
        ...common,
        template,
        subject: "On avance bien ! Des questions entre-temps ?",
        react: <DripCheckInEmail firstName={params.firstName} unsubscribeUrl={params.unsubscribeUrl} />,
      });
    default:
      return { ok: false as const, error: "unknown_template" };
  }
}

/** MVP: schedule = persist `nextSendAt` on DripSequence; cron sends. */
export async function scheduleEmail(): Promise<void> {
  /* no-op placeholder — scheduling is DB-driven via DripSequence.nextSendAt */
}
