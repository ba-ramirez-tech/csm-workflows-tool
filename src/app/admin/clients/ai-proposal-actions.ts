"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  aiProposalItemSchema,
  formatAiEstimatedPriceRange,
  type AiProposalItem,
} from "@/lib/ai/proposal-response-schema";
import { getCurrentUser } from "@/lib/auth";
import { logTouchpoint } from "@/lib/log-touchpoint";
import { prisma } from "@/lib/prisma";

export type PersistedProposal = {
  id: string;
  status: string;
  proposal: AiProposalItem;
  createdAt: string;
};

function proposalToDbColumns(p: AiProposalItem, agentFocusNote: string | null) {
  return {
    proposalName: p.proposal_name.slice(0, 500),
    tagline: p.tagline || null,
    recommendedTemplate: p.recommended_template || null,
    durationDays: p.duration_days,
    tier: p.tier,
    whyThisFits: p.why_this_fits || null,
    dayHighlights: p.days as unknown as Prisma.InputJsonValue,
    estimatedPriceRange: formatAiEstimatedPriceRange(p.estimated_price_range),
    differentiator: p.differentiator || null,
    fullResponse: { ...p } as Prisma.InputJsonValue,
    agentFocusNote: agentFocusNote?.slice(0, 12000) ?? null,
  };
}

function rowToProposal(row: {
  proposalName: string;
  tagline: string | null;
  recommendedTemplate: string | null;
  durationDays: number | null;
  tier: string | null;
  whyThisFits: string | null;
  dayHighlights: Prisma.JsonValue | null;
  estimatedPriceRange: string | null;
  differentiator: string | null;
  fullResponse: Prisma.JsonValue | null;
  agentFocusNote: string | null;
}): AiProposalItem | null {
  if (row.fullResponse && typeof row.fullResponse === "object" && !Array.isArray(row.fullResponse)) {
    const parsed = aiProposalItemSchema.safeParse(row.fullResponse);
    if (parsed.success) return parsed.data;
  }
  return null;
}

export async function getAiProposalWorkspaceAction(input: {
  clientId: string;
}): Promise<{ ok: boolean; draftText?: string; message?: string }> {
  const draft = await prisma.aiProposalDraft.findUnique({
    where: { clientId: input.clientId },
  });
  return { ok: true, draftText: draft?.draftText ?? "" };
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
  const parsed = input.proposals
    .map((p) => aiProposalItemSchema.safeParse(p))
    .filter((r): r is { success: true; data: AiProposalItem } => r.success)
    .map((r) => r.data);
  if (parsed.length === 0) return { ok: false, message: "No valid proposals to persist." };

  const focus = input.briefDraft.trim() || null;
  const created = await prisma.$transaction(
    parsed.map((proposal) =>
      prisma.aiProposal.create({
        data: {
          clientId: input.clientId,
          status: "generated",
          ...proposalToDbColumns(proposal, focus),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          fullResponse: true,
          proposalName: true,
          tagline: true,
          recommendedTemplate: true,
          durationDays: true,
          tier: true,
          whyThisFits: true,
          dayHighlights: true,
          estimatedPriceRange: true,
          differentiator: true,
          agentFocusNote: true,
        },
      }),
    ),
  );

  const u = getCurrentUser();
  await logTouchpoint({
    clientId: input.clientId,
    channel: "internal",
    category: "quotation",
    direction: "outbound",
    subject: "Propositions IA générées",
    summary: `${parsed.length} option(s) — brief enregistré.`,
    contentType: "ai_proposals_generated",
    agentId: u.id,
    agentName: u.name,
  });

  const proposals: PersistedProposal[] = created.map((r) => {
    const prop = rowToProposal(r);
    if (!prop) throw new Error("Failed to read persisted proposal");
    return {
      id: r.id,
      status: r.status,
      proposal: prop,
      createdAt: r.createdAt.toISOString(),
    };
  });

  revalidatePath(`/admin/clients/${input.clientId}`);
  return { ok: true, proposals };
}

export async function saveAiProposalEditsAction(input: {
  proposalId: string;
  proposalJson: unknown;
}): Promise<{ ok: boolean; message?: string }> {
  const parsed = aiProposalItemSchema.safeParse(input.proposalJson);
  if (!parsed.success) return { ok: false, message: "Invalid proposal format." };
  const row = await prisma.aiProposal.findUnique({
    where: { id: input.proposalId },
    select: { clientId: true, agentFocusNote: true },
  });
  if (!row) return { ok: false, message: "Proposal not found." };

  await prisma.aiProposal.update({
    where: { id: input.proposalId },
    data: {
      ...proposalToDbColumns(parsed.data, row.agentFocusNote),
    },
  });
  revalidatePath(`/admin/clients/${row.clientId}`);
  return { ok: true };
}

export async function setAiProposalStatusAction(input: {
  proposalId: string;
  status: "selected" | "dismissed";
}): Promise<{ ok: boolean; message?: string }> {
  const row = await prisma.aiProposal.findUnique({
    where: { id: input.proposalId },
    select: { id: true, clientId: true },
  });
  if (!row) return { ok: false, message: "Proposal not found." };
  await prisma.aiProposal.update({
    where: { id: input.proposalId },
    data: { status: input.status },
  });
  revalidatePath(`/admin/clients/${row.clientId}`);
  return { ok: true };
}

export async function deleteAiProposalAction(input: { proposalId: string }): Promise<{ ok: boolean; message?: string }> {
  const row = await prisma.aiProposal.findUnique({
    where: { id: input.proposalId },
    select: { id: true, clientId: true, quoteId: true },
  });
  if (!row) return { ok: false, message: "Proposal not found." };
  if (row.quoteId) return { ok: false, message: "Dissociez le devis avant suppression." };
  await prisma.aiProposal.delete({ where: { id: input.proposalId } });
  revalidatePath(`/admin/clients/${row.clientId}`);
  return { ok: true };
}

export async function markAiProposalUsedForQuoteAction(input: {
  proposalId: string;
  quoteId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const row = await prisma.aiProposal.findUnique({
    where: { id: input.proposalId },
    select: { id: true, clientId: true, proposalName: true },
  });
  if (!row) return { ok: false, message: "Proposal not found." };

  await prisma.aiProposal.updateMany({
    where: { clientId: row.clientId, quoteId: input.quoteId, NOT: { id: row.id } },
    data: { quoteId: null },
  });

  await prisma.aiProposal.update({
    where: { id: row.id },
    data: {
      status: "converted",
      quoteId: input.quoteId,
    },
  });

  const u = getCurrentUser();
  await logTouchpoint({
    clientId: row.clientId,
    channel: "internal",
    category: "quotation",
    direction: "outbound",
    subject: "Proposition IA convertie en devis",
    summary: `${row.proposalName}\nDevis: ${input.quoteId}`,
    contentType: "ai_proposal_converted",
    externalRef: `quote:${input.quoteId}`,
    agentId: u.id,
    agentName: u.name,
  });

  revalidatePath(`/admin/clients/${row.clientId}`);
  return { ok: true };
}

/** @deprecated — kept for scripts; prefer persist flow + section UI */
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
      data: { status: "generated" },
    });
  }
  revalidatePath(`/admin/clients/${input.clientId}`);
  return { ok: true };
}
