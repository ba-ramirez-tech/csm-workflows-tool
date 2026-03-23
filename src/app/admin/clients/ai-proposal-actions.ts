"use server";

import { ClientDocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { aiProposalItemSchema } from "@/lib/ai/proposal-response-schema";
import { getCurrentUser } from "@/lib/auth";
import { logTouchpoint } from "@/lib/log-touchpoint";
import { prisma } from "@/lib/prisma";

type PersistedProposal = {
  id: string;
  status: string;
  proposal: unknown;
  updatedAt: string;
};

async function logProposalLifecycle(params: {
  clientId: string;
  status: "accepted" | "rejected" | "used_for_quote" | "draft";
  proposalId: string;
  proposalJson: string;
  summaryTitle: string;
  quoteId?: string;
}): Promise<void> {
  const u = getCurrentUser();
  const statusLabel =
    params.status === "accepted"
      ? "accepted"
      : params.status === "rejected"
        ? "rejected"
        : params.status === "used_for_quote"
          ? "used for quote"
          : "saved";
  await prisma.clientDocument.create({
    data: {
      clientId: params.clientId,
      type: ClientDocumentType.OTHER,
      title: `AI Proposal — ${params.summaryTitle}`,
      notes: `Status: ${statusLabel}\nProposal ID: ${params.proposalId}\n${params.proposalJson.slice(0, 12000)}`,
    },
  });

  await logTouchpoint({
    clientId: params.clientId,
    channel: "internal",
    category: "quotation",
    direction: "outbound",
    subject: `AI proposal — ${statusLabel}`,
    summary: `${params.summaryTitle}\n\n${params.proposalJson.slice(0, 7000)}`,
    contentType: "ai_proposal_lifecycle",
    externalRef: params.quoteId ? `ai_proposal:${params.proposalId}|quote:${params.quoteId}` : `ai_proposal:${params.proposalId}`,
    agentId: u.id,
    agentName: u.name,
  });
}

export async function getAiProposalWorkspaceAction(input: {
  clientId: string;
}): Promise<{ ok: boolean; draftText?: string; proposals?: PersistedProposal[]; message?: string }> {
  const draft = await prisma.aiProposalDraft.findUnique({
    where: { clientId: input.clientId },
  });
  const rows = await prisma.aiProposal.findMany({
    where: { clientId: input.clientId },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: { id: true, status: true, generatedJson: true, editedJson: true, updatedAt: true },
  });
  const proposals: PersistedProposal[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    proposal: (r.editedJson ?? r.generatedJson) as unknown,
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { ok: true, draftText: draft?.draftText ?? "", proposals };
}

export async function saveAiProposalDraftAction(input: {
  clientId: string;
  draftText: string;
}): Promise<{ ok: boolean; message?: string }> {
  const u = getCurrentUser();
  await prisma.aiProposalDraft.upsert({
    where: { clientId: input.clientId },
    create: {
      clientId: input.clientId,
      draftText: input.draftText.slice(0, 12000),
      updatedById: u.id,
      updatedBy: u.name,
    },
    update: {
      draftText: input.draftText.slice(0, 12000),
      updatedById: u.id,
      updatedBy: u.name,
    },
  });
  return { ok: true };
}

export async function persistGeneratedAiProposalsAction(input: {
  clientId: string;
  briefDraft: string;
  proposals: unknown[];
}): Promise<{ ok: boolean; proposals?: PersistedProposal[]; message?: string }> {
  const u = getCurrentUser();
  const parsed = input.proposals
    .map((p) => aiProposalItemSchema.safeParse(p))
    .filter((r): r is { success: true; data: unknown } => r.success)
    .map((r) => r.data);
  if (parsed.length === 0) return { ok: false, message: "No valid proposals to persist." };

  const created = await prisma.$transaction(
    parsed.map((proposal) =>
      prisma.aiProposal.create({
        data: {
          clientId: input.clientId,
          briefDraft: input.briefDraft.slice(0, 12000),
          generatedJson: proposal as object,
          editedJson: proposal as object,
          status: "draft",
          createdById: u.id,
          createdBy: u.name,
          updatedById: u.id,
          updatedBy: u.name,
        },
        select: { id: true, status: true, editedJson: true, generatedJson: true, updatedAt: true },
      }),
    ),
  );

  const proposals: PersistedProposal[] = created.map((r) => ({
    id: r.id,
    status: r.status,
    proposal: (r.editedJson ?? r.generatedJson) as unknown,
    updatedAt: r.updatedAt.toISOString(),
  }));

  revalidatePath(`/admin/clients/${input.clientId}`);
  return { ok: true, proposals };
}

export async function saveAiProposalEditsAction(input: {
  proposalId: string;
  proposalJson: unknown;
}): Promise<{ ok: boolean; message?: string }> {
  const u = getCurrentUser();
  const parsed = aiProposalItemSchema.safeParse(input.proposalJson);
  if (!parsed.success) return { ok: false, message: "Invalid proposal format." };
  await prisma.aiProposal.update({
    where: { id: input.proposalId },
    data: {
      editedJson: parsed.data as object,
      updatedById: u.id,
      updatedBy: u.name,
    },
  });
  return { ok: true };
}

export async function setAiProposalStatusAction(input: {
  proposalId: string;
  status: "accepted" | "rejected";
}): Promise<{ ok: boolean; message?: string }> {
  const u = getCurrentUser();
  const row = await prisma.aiProposal.findUnique({
    where: { id: input.proposalId },
    select: { id: true, clientId: true, editedJson: true, generatedJson: true },
  });
  if (!row) return { ok: false, message: "Proposal not found." };
  const proposal = (row.editedJson ?? row.generatedJson) as unknown;
  const parsed = aiProposalItemSchema.safeParse(proposal);
  const proposalTitle = parsed.success ? parsed.data.proposal_name : "Untitled";
  await prisma.aiProposal.update({
    where: { id: input.proposalId },
    data: {
      status: input.status,
      acceptedAt: input.status === "accepted" ? new Date() : null,
      rejectedAt: input.status === "rejected" ? new Date() : null,
      updatedById: u.id,
      updatedBy: u.name,
    },
  });
  await logProposalLifecycle({
    clientId: row.clientId,
    status: input.status,
    proposalId: row.id,
    proposalJson: JSON.stringify(proposal),
    summaryTitle: proposalTitle,
  });
  revalidatePath(`/admin/clients/${row.clientId}`);
  return { ok: true };
}

export async function markAiProposalUsedForQuoteAction(input: {
  proposalId: string;
  quoteId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const u = getCurrentUser();
  const row = await prisma.aiProposal.findUnique({
    where: { id: input.proposalId },
    select: { id: true, clientId: true, editedJson: true, generatedJson: true },
  });
  if (!row) return { ok: false, message: "Proposal not found." };
  const proposal = (row.editedJson ?? row.generatedJson) as unknown;
  const parsed = aiProposalItemSchema.safeParse(proposal);
  const proposalTitle = parsed.success ? parsed.data.proposal_name : "Untitled";
  await prisma.aiProposal.update({
    where: { id: row.id },
    data: {
      status: "used_for_quote",
      usedForQuoteAt: new Date(),
      quoteId: input.quoteId,
      updatedById: u.id,
      updatedBy: u.name,
    },
  });
  await logProposalLifecycle({
    clientId: row.clientId,
    status: "used_for_quote",
    proposalId: row.id,
    proposalJson: JSON.stringify(proposal),
    summaryTitle: proposalTitle,
    quoteId: input.quoteId,
  });
  revalidatePath(`/admin/clients/${row.clientId}`);
  return { ok: true };
}

export async function saveAiProposalForLaterAction(input: {
  clientId: string;
  proposalJson: string;
  proposalId?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const u = getCurrentUser();
  await logTouchpoint({
    clientId: input.clientId,
    channel: "internal",
    category: "quotation",
    direction: "outbound",
    subject: "AI proposal — saved for later",
    summary: input.proposalJson.slice(0, 8000),
    contentType: "ai_proposal_saved",
    agentId: u.id,
    agentName: u.name,
  });
  if (input.proposalId) {
    await prisma.aiProposal.update({
      where: { id: input.proposalId },
      data: {
        status: "draft",
        updatedById: u.id,
        updatedBy: u.name,
      },
    });
  }
  await prisma.clientDocument.create({
    data: {
      clientId: input.clientId,
      type: ClientDocumentType.OTHER,
      title: "AI Proposal — saved for later",
      notes: input.proposalJson.slice(0, 12000),
    },
  });
  revalidatePath(`/admin/clients/${input.clientId}`);
  return { ok: true };
}
