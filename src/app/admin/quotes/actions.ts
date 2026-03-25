"use server";

import { addDays, format } from "date-fns";
import { BookingStatus, ClientDocumentType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientAmountToCop, copToClientAmount } from "@/lib/exchange-rates";
import { getCurrentUser } from "@/lib/auth";
import { sendQuoteReviewEmail } from "@/lib/email/send";
import { getPublicAppUrl } from "@/lib/email/client";
import { logQuoteSent } from "@/lib/log-touchpoint";
import { markAiProposalUsedForQuoteAction } from "@/app/admin/clients/ai-proposal-actions";
import { prisma } from "@/lib/prisma";
import { aiProposalItemSchema, formatAiEstimatedPriceRange } from "@/lib/ai/proposal-response-schema";
import { resolveTemplateIdFromRecommended } from "@/lib/ai/resolve-template-from-ai";
import { findContractForSupplier, lineQuantityForContract } from "@/lib/quote-contracts";
import { createQuoteFormSchema, quoteEditorPayloadSchema } from "./quote-payload";

function notesJson(text: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const t = text.trim();
  if (!t) return Prisma.JsonNull;
  return t;
}

async function ensureQuoteUser(): Promise<string> {
  const u = getCurrentUser();
  await prisma.user.upsert({
    where: { id: u.id },
    create: {
      id: u.id,
      email: `quote-user-${u.id}@placeholder.local`,
      name: u.name,
      role: "SUPER_ADMIN",
    },
    update: { name: u.name },
  });
  return u.id;
}

async function nextDossierNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CSM-${year}-`;
  const last = await prisma.booking.findFirst({
    where: { dossierNumber: { startsWith: prefix } },
    orderBy: { dossierNumber: "desc" },
    select: { dossierNumber: true },
  });
  let n = 1;
  if (last?.dossierNumber) {
    const parts = last.dossierNumber.split("-");
    const num = parseInt(parts[2] ?? "0", 10);
    if (!Number.isNaN(num)) n = num + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export type ActionState = { ok?: boolean; message?: string };

export async function createQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    clientId: String(formData.get("clientId") ?? ""),
    mode: formData.get("mode") === "scratch" ? "scratch" : "template",
    templateId: (() => {
      const t = formData.get("templateId");
      return t && String(t).length > 0 ? String(t) : null;
    })(),
    name: String(formData.get("name") ?? ""),
    durationDays: Number(formData.get("durationDays")),
    numTravelers: Number(formData.get("numTravelers")),
    travelerType: (() => {
      const v = formData.get("travelerType");
      return v && String(v).length > 0 ? String(v) : null;
    })(),
    tier: (() => {
      const v = formData.get("tier");
      return v && String(v).length > 0 ? String(v) : null;
    })(),
    currency: String(formData.get("currency") ?? "EUR"),
  };

  const parsed = createQuoteFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const v = parsed.data;
  if (v.mode === "template" && !v.templateId) {
    return { ok: false, message: "Select a template." };
  }

  const userId = await ensureQuoteUser();
  const travelStart = addDays(new Date(), 30);
  const travelEnd = addDays(travelStart, Math.max(1, v.durationDays) - 1);

  if (v.mode === "scratch") {
    const dest = await prisma.destination.findFirst({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    if (!dest) return { ok: false, message: "No destination in database — add one first." };

    const quote = await prisma.$transaction(async (tx) => {
      const q = await tx.quote.create({
        data: {
          clientId: v.clientId,
          createdById: userId,
          name: v.name,
          durationDays: v.durationDays,
          numTravelers: v.numTravelers,
          travelerType: v.travelerType ?? undefined,
          tier: v.tier ?? undefined,
          currency: v.currency,
          marginPct: 20,
          travelStartDate: travelStart,
          travelEndDate: travelEnd,
          status: "draft",
        },
      });
      const dd = await tx.quoteDayDetail.create({
        data: {
          quoteId: q.id,
          dayNumber: 1,
          destinationId: dest.id,
          sortOrder: 0,
        },
      });
      await tx.quoteItem.create({
        data: {
          quoteId: q.id,
          quoteDayDetailId: dd.id,
          dayNumber: 1,
          sortOrder: 0,
          destinationId: dest.id,
          itemType: "free_time",
          description: "Free time",
          notes: Prisma.JsonNull,
          quantity: 1,
          isManualPricing: true,
          manualLineTotalClient: 0,
        },
      });
      return q;
    });
    await recalculateQuoteTotals(quote.id);
    revalidatePath("/admin/quotes");
    redirect(`/admin/quotes/${quote.id}`);
  }

  const template = await prisma.tripTemplate.findUnique({
    where: { id: v.templateId! },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!template) return { ok: false, message: "Template not found." };

  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        clientId: v.clientId,
        templateId: template.id,
        createdById: userId,
        name: v.name,
        durationDays: v.durationDays,
        numTravelers: v.numTravelers,
        travelerType: v.travelerType ?? undefined,
        tier: v.tier ?? template.tier,
        currency: v.currency,
        marginPct: 20,
        travelStartDate: travelStart,
        travelEndDate: travelEnd,
        status: "draft",
        included: template.included ?? Prisma.JsonNull,
        notIncluded: template.notIncluded ?? Prisma.JsonNull,
      },
    });

    const hasItems = template.days.some((d) => d.items.length > 0);
    if (hasItems) {
      for (const day of template.days) {
        const dd = await tx.quoteDayDetail.create({
          data: {
            quoteId: q.id,
            dayNumber: day.dayNumber,
            destinationId: day.destinationId,
            sortOrder: day.dayNumber - 1,
          },
        });
        for (const it of day.items) {
          const desc =
            it.itemType === "meal" || it.itemType === "free_time"
              ? it.itemType === "meal"
                ? "Meal"
                : "Free time"
              : "";
          await tx.quoteItem.create({
            data: {
              quoteId: q.id,
              quoteDayDetailId: dd.id,
              dayNumber: day.dayNumber,
              sortOrder: it.sortOrder,
              destinationId: day.destinationId,
              itemType: it.itemType,
              accommodationId: it.accommodationId,
              experienceId: it.experienceId,
              transportId: it.transportId,
              timeSlot: it.timeSlot,
              startTime: it.startTime,
              notes: it.notes ?? Prisma.JsonNull,
              isOptional: it.isOptional,
              description: desc,
              quantity: 1,
              isManualPricing: it.itemType === "meal" || it.itemType === "free_time",
              manualLineTotalClient: it.itemType === "meal" || it.itemType === "free_time" ? 0 : null,
            },
          });
        }
      }
    } else {
      const firstDay = template.days[0];
      const destId = firstDay?.destinationId ?? (await tx.destination.findFirst())?.id;
      if (destId) {
        const dd = await tx.quoteDayDetail.create({
          data: {
            quoteId: q.id,
            dayNumber: 1,
            destinationId: destId,
            sortOrder: 0,
          },
        });
        await tx.quoteItem.create({
          data: {
            quoteId: q.id,
            quoteDayDetailId: dd.id,
            dayNumber: 1,
            sortOrder: 0,
            destinationId: destId,
            itemType: "free_time",
            description: "Free time",
            quantity: 1,
            isManualPricing: true,
            manualLineTotalClient: 0,
          },
        });
      }
    }

    return q;
  });

  await recalculateQuoteTotals(quote.id);
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${quote.id}`);
}

export async function saveQuoteDraftAction(quoteId: string, json: unknown): Promise<ActionState> {
  const parsed = quoteEditorPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ") };
  }
  const p = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quoteDayDetail.deleteMany({ where: { quoteId } });

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        name: p.name,
        marginPct: p.marginPct,
        currency: p.currency,
        validUntil: p.validUntil ? new Date(p.validUntil) : null,
        travelStartDate: p.travelStartDate ? new Date(p.travelStartDate) : null,
        travelEndDate: p.travelEndDate ? new Date(p.travelEndDate) : null,
        durationDays: p.durationDays,
        numTravelers: p.numTravelers,
        travelerType: p.travelerType ?? undefined,
        tier: p.tier ?? undefined,
        included: p.included === null ? Prisma.JsonNull : (p.included as Prisma.InputJsonValue),
        notIncluded: p.notIncluded === null ? Prisma.JsonNull : (p.notIncluded as Prisma.InputJsonValue),
      },
    });

    for (let idx = 0; idx < p.days.length; idx++) {
      const day = p.days[idx];
      const dayNum = idx + 1;
      const dd = await tx.quoteDayDetail.create({
        data: {
          quoteId,
          dayNumber: dayNum,
          destinationId: day.destinationId,
          title: day.title?.trim() || null,
          clientDescription: day.clientDescription?.trim() || null,
          agentNotes: day.agentNotes?.trim() || null,
          tags: day.tags,
          transportEntries:
            day.transportEntries.length > 0
              ? (JSON.parse(JSON.stringify(day.transportEntries)) as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          sortOrder: day.sortOrder ?? idx,
        },
      });
      for (const it of day.items) {
        await tx.quoteItem.create({
          data: {
            quoteId,
            quoteDayDetailId: dd.id,
            dayNumber: dayNum,
            sortOrder: it.sortOrder,
            destinationId: day.destinationId,
            itemType: it.itemType,
            accommodationId: it.accommodationId,
            experienceId: it.experienceId,
            transportId: it.transportId,
            timeSlot: it.timeSlot,
            startTime: it.startTime,
            notes: notesJson(it.notesText),
            isOptional: it.isOptional,
            description: it.description,
            isManualPricing: it.isManualPricing,
            manualLineTotalClient: it.manualLineTotalClient,
            quantity: 1,
          },
        });
      }
    }
  });

  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  return { ok: true, message: "Saved." };
}

export async function recalculateQuoteAction(quoteId: string): Promise<ActionState> {
  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true, message: "Recalculated." };
}

async function recalculateQuoteTotals(quoteId: string): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!quote) return;

  const travel = quote.travelStartDate ?? addDays(new Date(), 30);
  const margin = (quote.marginPct ?? 20) / 100;
  const currency = quote.currency;

  let sumSellCop = 0;

  for (const item of quote.items) {
    if (item.isManualPricing || item.itemType === "meal" || item.itemType === "free_time") {
      const manual = item.manualLineTotalClient ?? 0;
      sumSellCop += clientAmountToCop(manual, currency);
      await prisma.quoteItem.update({
        where: { id: item.id },
        data: {
          netUnitCop: null,
          costPerWhat: null,
          subtotalNetCop: null,
        },
      });
      continue;
    }

    let ref:
      | { supplierType: "accommodation"; accommodationId: string }
      | { supplierType: "experience"; experienceId: string }
      | { supplierType: "transport"; transportId: string }
      | null = null;
    if (item.itemType === "accommodation" && item.accommodationId) {
      ref = { supplierType: "accommodation", accommodationId: item.accommodationId };
    } else if (item.itemType === "experience" && item.experienceId) {
      ref = { supplierType: "experience", experienceId: item.experienceId };
    } else if (item.itemType === "transport" && item.transportId) {
      ref = { supplierType: "transport", transportId: item.transportId };
    }

    if (!ref) {
      await prisma.quoteItem.update({
        where: { id: item.id },
        data: { netUnitCop: null, costPerWhat: null, subtotalNetCop: null },
      });
      continue;
    }

    const contract = await findContractForSupplier(ref, travel);
    if (!contract) {
      await prisma.quoteItem.update({
        where: { id: item.id },
        data: {
          netUnitCop: null,
          costPerWhat: null,
          subtotalNetCop: null,
        },
      });
      continue;
    }

    const qty = lineQuantityForContract(contract.costPerWhat, quote.numTravelers);
    const lineNet = contract.netCostCop * qty;
    const lineSellCop = Math.round(lineNet * (1 + margin));

    await prisma.quoteItem.update({
      where: { id: item.id },
      data: {
        netUnitCop: contract.netCostCop,
        costPerWhat: contract.costPerWhat,
        quantity: qty,
        subtotalNetCop: lineNet,
      },
    });
    sumSellCop += lineSellCop;
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      totalPriceCop: sumSellCop,
      totalPriceEur: currency === "EUR" ? copToClientAmount(sumSellCop, "EUR") : null,
    },
  });
}

export async function sendQuoteToClientAction(quoteId: string): Promise<ActionState> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!quote) return { ok: false, message: "Quote not found." };

  const until = addDays(new Date(), 14);
  const base = getPublicAppUrl();
  const printUrl = `${base}/admin/quotes/${quoteId}/print`;
  const quoteTitle = quote.name?.trim() || "Sans titre";
  const sentLabel = format(until, "yyyy-MM-dd");

  await prisma.clientDocument.upsert({
    where: { quoteId },
    create: {
      clientId: quote.clientId,
      quoteId: quote.id,
      type: ClientDocumentType.QUOTATION,
      title: `Devis — ${quoteTitle}`,
      fileUrl: printUrl,
      notes: `Export PDF (impression admin). Référencé avant envoi / validation. Valable jusqu’au ${sentLabel}.`,
    },
    update: {
      title: `Devis — ${quoteTitle}`,
      fileUrl: printUrl,
      notes: `Export PDF (impression admin). Référencé avant envoi / validation. Valable jusqu’au ${sentLabel}.`,
    },
  });

  const reviewEmails = (process.env.QUOTE_REVIEW_EMAIL ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const to of reviewEmails) {
    await sendQuoteReviewEmail({
      to,
      clientId: quote.clientId,
      quoteName: quoteTitle,
      clientName: quote.client.name,
      printUrl,
      validUntilLabel: sentLabel,
    });
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "sent", validUntil: until },
  });

  const u = getCurrentUser();
  await logQuoteSent({
    clientId: quote.clientId,
    quoteId,
    subject: `Devis envoyé — ${quoteTitle}`,
    agentId: u.id,
    agentName: u.name,
  });

  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/clients/${quote.clientId}`);
  return {
    ok: true,
    message:
      reviewEmails.length > 0
        ? "Devis enregistré sur la fiche client, email de revue envoyé, statut « envoyé »."
        : "Devis enregistré sur la fiche client (lien PDF), statut « envoyé ». Définissez QUOTE_REVIEW_EMAIL pour un email de revue automatique.",
  };
}

export async function markQuoteAcceptedAction(quoteId: string): Promise<ActionState> {
  await prisma.quote.update({ where: { id: quoteId }, data: { status: "accepted" } });
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  return { ok: true };
}

export async function markQuoteRejectedAction(quoteId: string, reason: string): Promise<ActionState> {
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "rejected", rejectionReason: reason.trim() || null },
  });
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  return { ok: true };
}

export async function cloneQuoteAction(quoteId: string): Promise<ActionState> {
  const q = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] },
      dayDetails: { orderBy: { dayNumber: "asc" } },
    },
  });
  if (!q) return { ok: false, message: "Quote not found." };
  const userId = await ensureQuoteUser();

  const newQuote = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({
      data: {
        clientId: q.clientId,
        templateId: q.templateId,
        createdById: userId,
        name: `${q.name ?? "Quote"} (v2)`,
        status: "draft",
        durationDays: q.durationDays,
        numTravelers: q.numTravelers,
        travelerType: q.travelerType ?? undefined,
        tier: q.tier ?? undefined,
        marginPct: q.marginPct ?? 20,
        currency: q.currency,
        validUntil: null,
        travelStartDate: q.travelStartDate,
        travelEndDate: q.travelEndDate,
        included: q.included ?? Prisma.JsonNull,
        notIncluded: q.notIncluded ?? Prisma.JsonNull,
        notes: q.notes,
        customizations: q.customizations ?? Prisma.JsonNull,
      },
    });

    const detailIdMap = new Map<string, string>();

    if (q.dayDetails.length > 0) {
      for (const dd of q.dayDetails) {
        const n = await tx.quoteDayDetail.create({
          data: {
            quoteId: created.id,
            dayNumber: dd.dayNumber,
            destinationId: dd.destinationId,
            title: dd.title,
            clientDescription: dd.clientDescription,
            agentNotes: dd.agentNotes,
            tags: dd.tags,
            transportEntries: dd.transportEntries ?? Prisma.JsonNull,
            sortOrder: dd.sortOrder,
          },
        });
        detailIdMap.set(dd.id, n.id);
      }
    } else {
      const dayNums = [...new Set(q.items.map((i) => i.dayNumber))].sort((a, b) => a - b);
      for (const d of dayNums) {
        const destId = q.items.find((i) => i.dayNumber === d)?.destinationId;
        if (!destId) continue;
        const n = await tx.quoteDayDetail.create({
          data: {
            quoteId: created.id,
            dayNumber: d,
            destinationId: destId,
            sortOrder: dayNums.indexOf(d),
          },
        });
        detailIdMap.set(`legacy:${d}`, n.id);
      }
    }

    for (const it of q.items) {
      const newDetailId = it.quoteDayDetailId
        ? detailIdMap.get(it.quoteDayDetailId)
        : detailIdMap.get(`legacy:${it.dayNumber}`);
      await tx.quoteItem.create({
        data: {
          quoteId: created.id,
          quoteDayDetailId: newDetailId ?? null,
          dayNumber: it.dayNumber,
          sortOrder: it.sortOrder,
          destinationId: it.destinationId,
          itemType: it.itemType,
          accommodationId: it.accommodationId,
          experienceId: it.experienceId,
          transportId: it.transportId,
          timeSlot: it.timeSlot,
          startTime: it.startTime,
          notes: it.notes ?? Prisma.JsonNull,
          isOptional: it.isOptional,
          description: it.description,
          netUnitCop: it.netUnitCop,
          costPerWhat: it.costPerWhat,
          quantity: it.quantity,
          subtotalNetCop: it.subtotalNetCop,
          manualLineTotalClient: it.manualLineTotalClient,
          isManualPricing: it.isManualPricing,
        },
      });
    }
    return created;
  });

  await recalculateQuoteTotals(newQuote.id);
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${newQuote.id}`);
}

export async function convertQuoteToBookingAction(quoteId: string): Promise<ActionState> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] }, booking: true },
  });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (quote.status !== "accepted") return { ok: false, message: "Quote must be accepted first." };
  if (quote.booking) {
    redirect(`/admin/bookings/${quote.booking.id}`);
  }

  const start = quote.travelStartDate ?? new Date();
  const end = quote.travelEndDate ?? addDays(start, Math.max(1, quote.durationDays) - 1);
  const totalCop = quote.totalPriceCop ?? 0;
  const dossier = await nextDossierNumber();

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        quoteId: quote.id,
        clientId: quote.clientId,
        dossierNumber: dossier,
        status: BookingStatus.DRAFT,
        travelStart: start,
        travelEnd: end,
        numTravelers: quote.numTravelers,
        totalPriceCop: totalCop,
        currency: quote.currency,
      },
    });

    const dayDest = new Map<number, string>();
    for (const it of quote.items) {
      if (!dayDest.has(it.dayNumber)) dayDest.set(it.dayNumber, it.destinationId);
    }

    let order = 1;
    for (let d = 1; d <= quote.durationDays; d++) {
      const destId = dayDest.get(d) ?? quote.items[0]?.destinationId;
      if (!destId) continue;
      const dayStart = addDays(start, d - 1);
      const dayEnd = addDays(start, d);
      const stage = await tx.bookingStage.create({
        data: {
          bookingId: b.id,
          destinationId: destId,
          stageOrder: order++,
          dateStart: dayStart,
          dateEnd: dayEnd,
        },
      });

      const dayItems = quote.items.filter((i) => i.dayNumber === d);
      let so = 0;
      for (const it of dayItems) {
        await tx.stageService.create({
          data: {
            stageId: stage.id,
            serviceType: it.itemType,
            accommodationId: it.accommodationId,
            experienceId: it.experienceId,
            transportId: it.transportId,
            sortOrder: so++,
            serviceDate: dayStart,
            serviceTime: it.startTime,
          },
        });
      }
    }

    return b;
  });

  revalidatePath("/admin/quotes");
  redirect(`/admin/bookings/${booking.id}`);
}

function tagsFromAiProposal(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase().replace(/[\s/]+/g, "_")).filter(Boolean))];
}

function transportEntriesJson(
  entries: { type: string; route?: string; duration?: string; tip?: string | null; notes?: string | null }[],
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!entries?.length) return Prisma.JsonNull;
  return entries.map((e) => ({
    type: e.type,
    route: e.route ?? "",
    duration: e.duration ?? "",
    tip: e.tip ?? "",
    notes: e.notes ?? "",
  })) as unknown as Prisma.InputJsonValue;
}

export async function createQuoteFromAiProposalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const clientId = String(formData.get("clientId") ?? "");
  const proposalJson = String(formData.get("proposalJson") ?? "");
  const proposalIdRaw = String(formData.get("proposalId") ?? "").trim();
  const proposalId = proposalIdRaw.length > 0 ? proposalIdRaw : null;
  const currencyRaw = String(formData.get("currency") ?? "EUR").toUpperCase();
  const currency = currencyRaw === "USD" || currencyRaw === "COP" ? currencyRaw : "EUR";

  let parsedProposal;
  try {
    parsedProposal = aiProposalItemSchema.parse(JSON.parse(proposalJson));
  } catch {
    return { ok: false, message: "Invalid proposal data." };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "Client not found." };

  const templates = await prisma.tripTemplate.findMany({
    where: { isPublished: true, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  let templateId: string | null =
    parsedProposal.recommended_template_id &&
    templates.some((t) => t.id === parsedProposal.recommended_template_id)
      ? parsedProposal.recommended_template_id
      : null;

  if (!templateId) {
    templateId = resolveTemplateIdFromRecommended(parsedProposal.recommended_template, templates);
  }

  const userId = await ensureQuoteUser();
  const travelStart = addDays(new Date(), 30);
  const targetDays = parsedProposal.duration_days;
  const travelEnd = addDays(travelStart, Math.max(1, targetDays) - 1);

  const name = parsedProposal.proposal_name.slice(0, 240);
  const tier = parsedProposal.tier;

  const priceLine = formatAiEstimatedPriceRange(parsedProposal.estimated_price_range);
  const notesText = [
    `AI proposal — ${parsedProposal.proposal_name}`,
    parsedProposal.tagline,
    "",
    "## Présentation",
    parsedProposal.presentation,
    "",
    "## Pourquoi cette option",
    parsedProposal.why_this_fits,
    "",
    parsedProposal.differentiator,
    "",
    `Fourchette indicative : ${priceLine}`,
    "",
    `--- JSON ---`,
    proposalJson,
  ].join("\n");

  const customizations = {
    source: "ai_proposal",
    proposal: parsedProposal,
  } as Prisma.InputJsonValue;

  const destinationFallback = await prisma.destination.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  if (!destinationFallback) return { ok: false, message: "No destination in database — add one first." };

  const aiByDay = new Map(parsedProposal.days.map((d) => [d.day_number, d]));

  async function finish(quoteId: string) {
    await recalculateQuoteTotals(quoteId);
    if (proposalId) await markAiProposalUsedForQuoteAction({ proposalId, quoteId });
    revalidatePath("/admin/quotes");
    revalidatePath(`/admin/clients/${clientId}`);
    redirect(`/admin/quotes/${quoteId}`);
  }

  if (!templateId) {
    const quote = await prisma.$transaction(async (tx) => {
      const q = await tx.quote.create({
        data: {
          clientId,
          createdById: userId,
          name,
          durationDays: targetDays,
          numTravelers: 2,
          travelerType: client.travelerType ?? undefined,
          tier,
          currency,
          marginPct: 20,
          travelStartDate: travelStart,
          travelEndDate: travelEnd,
          status: "draft",
          notes: notesText,
          customizations,
        },
      });
      for (let d = 1; d <= targetDays; d++) {
        const aiDay = aiByDay.get(d);
        const dd = await tx.quoteDayDetail.create({
          data: {
            quoteId: q.id,
            dayNumber: d,
            destinationId: destinationFallback.id,
            title: aiDay?.title ?? null,
            clientDescription: aiDay?.description ?? null,
            tags: aiDay ? tagsFromAiProposal(aiDay.tags) : [],
            transportEntries: aiDay ? transportEntriesJson(aiDay.transport) : Prisma.JsonNull,
            sortOrder: d - 1,
          },
        });
        const narrative = aiDay?.description ?? aiDay?.title ?? "Journée";
        const itemType: "transport" | "experience" =
          /transfer|flight|vol|aeroport|airport|route|trajet/i.test(`${aiDay?.title ?? ""} ${aiDay?.description ?? ""}`)
            ? "transport"
            : "experience";
        await tx.quoteItem.create({
          data: {
            quoteId: q.id,
            quoteDayDetailId: dd.id,
            dayNumber: d,
            sortOrder: 0,
            destinationId: destinationFallback.id,
            itemType,
            description: (aiDay?.title ?? `Day ${d}`).slice(0, 500),
            notes: notesJson(narrative),
            quantity: 1,
            isManualPricing: true,
            manualLineTotalClient: 0,
            isOptional: false,
            timeSlot: null,
            startTime: null,
            accommodationId: null,
            experienceId: null,
            transportId: null,
          },
        });
      }
      return q;
    });
    await finish(quote.id);
  } else {
  const template = await prisma.tripTemplate.findUnique({
    where: { id: templateId },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!template) return { ok: false, message: "Template not found." };

  const templateDayMap = new Map(template.days.map((d) => [d.dayNumber, d]));

  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        clientId,
        templateId: template.id,
        createdById: userId,
        name,
        durationDays: targetDays,
        numTravelers: 2,
        travelerType: client.travelerType ?? undefined,
        tier,
        currency,
        marginPct: 20,
        travelStartDate: travelStart,
        travelEndDate: travelEnd,
        status: "draft",
        included: template.included ?? Prisma.JsonNull,
        notIncluded: template.notIncluded ?? Prisma.JsonNull,
        notes: notesText,
        customizations,
      },
    });

    for (let d = 1; d <= targetDays; d++) {
      const td = templateDayMap.get(d);
      const aiDay = aiByDay.get(d);
      const destId = td?.destinationId ?? destinationFallback.id;
      const dd = await tx.quoteDayDetail.create({
        data: {
          quoteId: q.id,
          dayNumber: d,
          destinationId: destId,
          title: aiDay?.title ?? null,
          clientDescription: aiDay?.description ?? null,
          tags: aiDay ? tagsFromAiProposal(aiDay.tags) : [],
          transportEntries: aiDay ? transportEntriesJson(aiDay.transport) : Prisma.JsonNull,
          sortOrder: d - 1,
        },
      });

      if (td && td.items.length > 0) {
        for (const it of td.items) {
          const desc =
            it.itemType === "meal" || it.itemType === "free_time"
              ? it.itemType === "meal"
                ? "Meal"
                : "Free time"
              : "";
          await tx.quoteItem.create({
            data: {
              quoteId: q.id,
              quoteDayDetailId: dd.id,
              dayNumber: d,
              sortOrder: it.sortOrder,
              destinationId: td.destinationId,
              itemType: it.itemType,
              accommodationId: it.accommodationId,
              experienceId: it.experienceId,
              transportId: it.transportId,
              timeSlot: it.timeSlot,
              startTime: it.startTime,
              notes: it.notes ?? Prisma.JsonNull,
              isOptional: it.isOptional,
              description: desc,
              quantity: 1,
              isManualPricing: it.itemType === "meal" || it.itemType === "free_time",
              manualLineTotalClient: it.itemType === "meal" || it.itemType === "free_time" ? 0 : null,
            },
          });
        }
      } else {
        const narrative = aiDay?.description ?? aiDay?.title ?? "Journée";
        const itemType: "transport" | "experience" =
          /transfer|flight|vol|aeroport|airport|route|trajet/i.test(`${aiDay?.title ?? ""} ${aiDay?.description ?? ""}`)
            ? "transport"
            : "experience";
        await tx.quoteItem.create({
          data: {
            quoteId: q.id,
            quoteDayDetailId: dd.id,
            dayNumber: d,
            sortOrder: 0,
            destinationId: destId,
            itemType,
            description: (aiDay?.title ?? `Day ${d}`).slice(0, 500),
            notes: notesJson(narrative),
            quantity: 1,
            isManualPricing: true,
            manualLineTotalClient: 0,
            isOptional: false,
            timeSlot: null,
            startTime: null,
            accommodationId: null,
            experienceId: null,
            transportId: null,
          },
        });
      }
    }

    return q;
  });

  await finish(quote.id);
  }
  return { ok: false, message: "Unexpected state." };
}

export async function patchQuoteDayDetailFieldsAction(input: {
  quoteId: string;
  dayNumber: number;
  dayDetailId?: string | null;
  title?: string;
  clientDescription?: string;
  agentNotes?: string;
  tags?: string[];
  transportEntries?: { type: string; route: string; duration: string; tip: string; notes: string }[];
}): Promise<ActionState> {
  const data: Prisma.QuoteDayDetailUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim() || null;
  if (input.clientDescription !== undefined) data.clientDescription = input.clientDescription.trim() || null;
  if (input.agentNotes !== undefined) data.agentNotes = input.agentNotes.trim() || null;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.transportEntries !== undefined) {
    data.transportEntries =
      input.transportEntries.length > 0
        ? (JSON.parse(JSON.stringify(input.transportEntries)) as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }

  if (input.dayDetailId) {
    await prisma.quoteDayDetail.update({
      where: { id: input.dayDetailId, quoteId: input.quoteId },
      data,
    });
  } else {
    await prisma.quoteDayDetail.update({
      where: { quoteId_dayNumber: { quoteId: input.quoteId, dayNumber: input.dayNumber } },
      data,
    });
  }
  revalidatePath(`/admin/quotes/${input.quoteId}`);
  return { ok: true };
}

export async function swapQuoteDayAccommodationAction(input: {
  quoteId: string;
  anchorDayNumber: number;
  accommodationId: string;
}): Promise<ActionState> {
  const [quote, acc] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: input.quoteId },
      include: { items: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] } },
    }),
    prisma.accommodation.findUnique({
      where: { id: input.accommodationId },
      select: { id: true, destinationId: true },
    }),
  ]);
  if (!quote || !acc) return { ok: false, message: "Not found." };

  const byDay = new Map<number, (typeof quote.items)[number][]>();
  for (const it of quote.items) {
    if (!byDay.has(it.dayNumber)) byDay.set(it.dayNumber, []);
    byDay.get(it.dayNumber)!.push(it);
  }

  const anchorItems = byDay.get(input.anchorDayNumber) ?? [];
  const accItem = anchorItems.find((i) => i.itemType === "accommodation" && i.accommodationId);
  const oldId = accItem?.accommodationId;
  if (!oldId) return { ok: false, message: "Aucun hébergement ce jour à remplacer." };

  let start = input.anchorDayNumber;
  while (start > 1) {
    const prev = byDay
      .get(start - 1)
      ?.find((i) => i.itemType === "accommodation" && i.accommodationId === oldId);
    if (!prev) break;
    start--;
  }
  let end = input.anchorDayNumber;
  while (end < quote.durationDays) {
    const next = byDay
      .get(end + 1)
      ?.find((i) => i.itemType === "accommodation" && i.accommodationId === oldId);
    if (!next) break;
    end++;
  }

  for (let d = start; d <= end; d++) {
    const rows = byDay.get(d) ?? [];
    for (const it of rows) {
      if (it.itemType === "accommodation" && it.accommodationId === oldId) {
        await prisma.quoteItem.update({
          where: { id: it.id },
          data: { accommodationId: acc.id, destinationId: acc.destinationId },
        });
      }
    }
  }

  await recalculateQuoteTotals(quote.id);
  revalidatePath(`/admin/quotes/${quote.id}`);
  return { ok: true };
}
