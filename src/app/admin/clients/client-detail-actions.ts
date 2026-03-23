"use server";

import { revalidatePath } from "next/cache";
import { ClientDocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateOnly(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createClientFlightAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { ok: false as const, error: "Client manquant." };

  const direction = String(formData.get("direction") ?? "");
  if (direction !== "arrival" && direction !== "departure") {
    return { ok: false as const, error: "Direction invalide." };
  }

  const airline = String(formData.get("airline") ?? "").trim();
  const flightNumber = String(formData.get("flightNumber") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const date = parseDate(dateStr);
  if (!airline || !flightNumber || !date) {
    return { ok: false as const, error: "Compagnie, n° de vol et date sont requis." };
  }

  const bookingIdRaw = String(formData.get("bookingId") ?? "").trim();
  const bookingId = bookingIdRaw || null;

  try {
    await prisma.clientFlight.create({
      data: {
        clientId,
        bookingId,
        direction,
        airline,
        flightNumber,
        date,
        departureCity: String(formData.get("departureCity") ?? "").trim() || "—",
        arrivalCity: String(formData.get("arrivalCity") ?? "").trim() || "—",
        departureTime: String(formData.get("departureTime") ?? "").trim() || "—",
        arrivalTime: String(formData.get("arrivalTime") ?? "").trim() || "—",
        terminal: String(formData.get("terminal") ?? "").trim() || null,
        bookingRef: String(formData.get("bookingRef") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
      },
    });
  } catch (e) {
    console.error("createClientFlightAction", e);
    return { ok: false as const, error: "Enregistrement impossible (vérifiez la base de données)." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}

export async function updateClientFlightAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (!id || !clientId) return { ok: false as const, error: "Données invalides." };

  const direction = String(formData.get("direction") ?? "");
  if (direction !== "arrival" && direction !== "departure") {
    return { ok: false as const, error: "Direction invalide." };
  }

  const airline = String(formData.get("airline") ?? "").trim();
  const flightNumber = String(formData.get("flightNumber") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const date = parseDate(dateStr);
  if (!airline || !flightNumber || !date) {
    return { ok: false as const, error: "Compagnie, n° de vol et date sont requis." };
  }

  const bookingIdRaw = String(formData.get("bookingId") ?? "").trim();

  try {
    await prisma.clientFlight.update({
      where: { id },
      data: {
        bookingId: bookingIdRaw || null,
        direction,
        airline,
        flightNumber,
        date,
        departureCity: String(formData.get("departureCity") ?? "").trim() || "—",
        arrivalCity: String(formData.get("arrivalCity") ?? "").trim() || "—",
        departureTime: String(formData.get("departureTime") ?? "").trim() || "—",
        arrivalTime: String(formData.get("arrivalTime") ?? "").trim() || "—",
        terminal: String(formData.get("terminal") ?? "").trim() || null,
        bookingRef: String(formData.get("bookingRef") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
      },
    });
  } catch (e) {
    console.error("updateClientFlightAction", e);
    return { ok: false as const, error: "Mise à jour impossible." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}

export async function deleteClientFlightAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (!id || !clientId) return { ok: false as const, error: "Données invalides." };

  try {
    await prisma.clientFlight.delete({ where: { id } });
  } catch (e) {
    console.error("deleteClientFlightAction", e);
    return { ok: false as const, error: "Suppression impossible." };
  }
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}

const DOC_TYPES: ClientDocumentType[] = [
  ClientDocumentType.PASSPORT,
  ClientDocumentType.INSURANCE,
  ClientDocumentType.VACCINATION,
  ClientDocumentType.FLIGHT_INFO,
  ClientDocumentType.SPECIAL_REQUIREMENTS,
  ClientDocumentType.QUOTATION,
  ClientDocumentType.OTHER,
];

function parseDocType(raw: string): ClientDocumentType | null {
  return DOC_TYPES.includes(raw as ClientDocumentType) ? (raw as ClientDocumentType) : null;
}

export async function createClientDocumentAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const type = parseDocType(String(formData.get("type") ?? ""));
  if (!clientId || !type) return { ok: false as const, error: "Type ou client invalide." };

  const title = String(formData.get("title") ?? "").trim() || null;
  const fileUrl = String(formData.get("fileUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const expiryRaw = String(formData.get("expiryDate") ?? "").trim();
  const expiryDate = expiryRaw ? parseDateOnly(expiryRaw) : null;

  if (!title && !fileUrl && !notes) {
    return { ok: false as const, error: "Ajoutez au moins un titre, une URL ou des notes." };
  }

  try {
    await prisma.clientDocument.create({
      data: { clientId, type, title, fileUrl, notes, expiryDate },
    });
  } catch (e) {
    console.error("createClientDocumentAction", e);
    return { ok: false as const, error: "Enregistrement impossible." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}

export async function updateClientDocumentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const type = parseDocType(String(formData.get("type") ?? ""));
  if (!id || !clientId || !type) return { ok: false as const, error: "Données invalides." };

  const title = String(formData.get("title") ?? "").trim() || null;
  const fileUrl = String(formData.get("fileUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const expiryRaw = String(formData.get("expiryDate") ?? "").trim();
  const expiryDate = expiryRaw ? parseDateOnly(expiryRaw) : null;

  if (!title && !fileUrl && !notes) {
    return { ok: false as const, error: "Ajoutez au moins un titre, une URL ou des notes." };
  }

  try {
    await prisma.clientDocument.update({
      where: { id },
      data: { type, title, fileUrl, notes, expiryDate },
    });
  } catch (e) {
    console.error("updateClientDocumentAction", e);
    return { ok: false as const, error: "Mise à jour impossible." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}

export async function deleteClientDocumentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (!id || !clientId) return { ok: false as const, error: "Données invalides." };

  try {
    await prisma.clientDocument.delete({ where: { id } });
  } catch (e) {
    console.error("deleteClientDocumentAction", e);
    return { ok: false as const, error: "Suppression impossible." };
  }
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}
