"use server";

import { Prisma, TransportMode } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type TransportRouteFormState = {
  message?: string;
  errors?: Record<string, string>;
};

const optionalNonNegInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);

const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().optional(),
);

const transportRouteSchema = z.object({
  originId: z.string().uuid("Select an origin."),
  destinationId: z.string().uuid("Select a destination."),
  mode: z.nativeEnum(TransportMode),
  provider: z.string().optional(),
  vehicleType: z.string().optional(),
  capacity: optionalNonNegInt,
  distanceKm: optionalNonNegInt,
  durationMinutes: optionalNonNegInt,
  altitudeStart: optionalInt,
  altitudeEnd: optionalInt,
  routeNotes: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z
    .string()
    .trim()
    .refine((s) => s === "" || z.string().email().safeParse(s).success, { message: "Invalid email." }),
  isActive: z.boolean(),
});

function parseTransportFormData(formData: FormData) {
  const emailRaw = formData.get("contactEmail");

  const payload = {
    originId: formData.get("originId"),
    destinationId: formData.get("destinationId"),
    mode: formData.get("mode"),
    provider: (formData.get("provider") as string | null) ?? "",
    vehicleType: (formData.get("vehicleType") as string | null) ?? "",
    capacity: formData.get("capacity"),
    distanceKm: formData.get("distanceKm"),
    durationMinutes: formData.get("durationMinutes"),
    altitudeStart: formData.get("altitudeStart"),
    altitudeEnd: formData.get("altitudeEnd"),
    routeNotes: (formData.get("routeNotes") as string | null) ?? "",
    contactName: (formData.get("contactName") as string | null) ?? "",
    contactPhone: (formData.get("contactPhone") as string | null) ?? "",
    contactEmail: typeof emailRaw === "string" ? emailRaw : "",
    isActive: formData.get("isActive") === "on",
  };

  const parsed = transportRouteSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, errors: mapValidationErrors(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

function mapValidationErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, msgs]) => Array.isArray(msgs) && msgs[0])
      .map(([key, msgs]) => [key, msgs![0] ?? "Invalid value."]),
  );
}

function toRouteNotesJson(value: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const trimmed = value.trim();
  if (!trimmed) return Prisma.JsonNull;
  return trimmed;
}

export async function createTransportRouteAction(
  _prevState: TransportRouteFormState,
  formData: FormData,
): Promise<TransportRouteFormState> {
  const parsed = parseTransportFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.errors, message: "Please fix the highlighted fields." };
  }

  const data = parsed.data;

  try {
    await prisma.transportRoute.create({
      data: {
        originId: data.originId,
        destinationId: data.destinationId,
        mode: data.mode,
        provider: data.provider?.trim() || null,
        vehicleType: data.vehicleType?.trim() || null,
        capacity: data.capacity,
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        altitudeStart: data.altitudeStart,
        altitudeEnd: data.altitudeEnd,
        routeNotes: toRouteNotesJson(data.routeNotes ?? ""),
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        isActive: data.isActive,
      },
    });
  } catch {
    return { message: "Unable to create transport route. Please try again." };
  }

  redirect("/admin/transport?message=Transport%20route%20created");
}

export async function updateTransportRouteAction(
  id: string,
  _prevState: TransportRouteFormState,
  formData: FormData,
): Promise<TransportRouteFormState> {
  const parsed = parseTransportFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.errors, message: "Please fix the highlighted fields." };
  }

  const data = parsed.data;

  try {
    await prisma.transportRoute.update({
      where: { id },
      data: {
        originId: data.originId,
        destinationId: data.destinationId,
        mode: data.mode,
        provider: data.provider?.trim() || null,
        vehicleType: data.vehicleType?.trim() || null,
        capacity: data.capacity,
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        altitudeStart: data.altitudeStart,
        altitudeEnd: data.altitudeEnd,
        routeNotes: toRouteNotesJson(data.routeNotes ?? ""),
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        isActive: data.isActive,
      },
    });
  } catch {
    return { message: "Unable to update transport route. Please try again." };
  }

  redirect("/admin/transport?message=Transport%20route%20updated");
}

export async function deleteTransportRouteAction(id: string) {
  await prisma.transportRoute.delete({ where: { id } });
  redirect("/admin/transport?message=Transport%20route%20deleted");
}
