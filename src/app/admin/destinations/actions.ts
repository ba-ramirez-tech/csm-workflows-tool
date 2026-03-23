"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type DestinationFormState = {
  message?: string;
  errors?: Record<string, string>;
};

const destinationSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  region: z.string().trim().min(1, "Region is required."),
  country: z.string().trim().min(1, "Country is required."),
  description: z.string().trim().optional(),
  altitudeMeters: z.coerce.number().int().optional(),
  avgTempMin: z.coerce.number().int().optional(),
  avgTempMax: z.coerce.number().int().optional(),
  climateNotes: z.string().trim().optional(),
  languagesAvailable: z
    .array(z.enum(["fr", "en", "es", "de"]))
    .min(1, "Select at least one language."),
  rentalAvailable: z.boolean(),
  trekkingAvailable: z.boolean(),
  latitude: z.coerce.number().min(-90, "Latitude must be >= -90.").max(90, "Latitude must be <= 90.").optional(),
  longitude: z
    .coerce.number()
    .min(-180, "Longitude must be >= -180.")
    .max(180, "Longitude must be <= 180.")
    .optional(),
});

function asOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  if (value.trim() === "") return undefined;
  return value;
}

function parseDestinationFormData(formData: FormData) {
  const payload = {
    name: formData.get("name"),
    region: formData.get("region"),
    country: formData.get("country") ?? "Colombia",
    description: formData.get("description") ?? "",
    altitudeMeters: asOptionalNumber(formData.get("altitudeMeters")),
    avgTempMin: asOptionalNumber(formData.get("avgTempMin")),
    avgTempMax: asOptionalNumber(formData.get("avgTempMax")),
    climateNotes: formData.get("climateNotes") ?? "",
    languagesAvailable: formData.getAll("languagesAvailable"),
    rentalAvailable: formData.get("rentalAvailable") === "on",
    trekkingAvailable: formData.get("trekkingAvailable") === "on",
    latitude: asOptionalNumber(formData.get("latitude")),
    longitude: asOptionalNumber(formData.get("longitude")),
  };

  return destinationSchema.safeParse(payload);
}

function mapValidationErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, msgs]) => Array.isArray(msgs) && msgs[0])
      .map(([key, msgs]) => [key, msgs![0] ?? "Invalid value."]),
  );
}

function toJsonText(value: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const trimmed = value.trim();
  if (!trimmed) return Prisma.JsonNull;
  return trimmed;
}

export async function createDestinationAction(
  _prevState: DestinationFormState,
  formData: FormData,
): Promise<DestinationFormState> {
  const parsed = parseDestinationFormData(formData);
  if (!parsed.success) {
    return { errors: mapValidationErrors(parsed.error), message: "Please fix the highlighted fields." };
  }

  const data = parsed.data;

  try {
    await prisma.destination.create({
      data: {
        name: data.name,
        region: data.region,
        country: data.country,
        description: toJsonText(data.description ?? ""),
        altitudeMeters: data.altitudeMeters,
        avgTempMin: data.avgTempMin,
        avgTempMax: data.avgTempMax,
        climateNotes: toJsonText(data.climateNotes ?? ""),
        languagesAvailable: data.languagesAvailable,
        rentalAvailable: data.rentalAvailable,
        trekkingAvailable: data.trekkingAvailable,
        latitude: data.latitude,
        longitude: data.longitude,
        photoGallery: [],
      },
    });
  } catch {
    return { message: "Unable to create destination. Please try again." };
  }

  redirect("/admin/destinations?message=Destination%20created");
}

export async function updateDestinationAction(
  id: string,
  _prevState: DestinationFormState,
  formData: FormData,
): Promise<DestinationFormState> {
  const parsed = parseDestinationFormData(formData);
  if (!parsed.success) {
    return { errors: mapValidationErrors(parsed.error), message: "Please fix the highlighted fields." };
  }

  const data = parsed.data;

  try {
    await prisma.destination.update({
      where: { id },
      data: {
        name: data.name,
        region: data.region,
        country: data.country,
        description: toJsonText(data.description ?? ""),
        altitudeMeters: data.altitudeMeters,
        avgTempMin: data.avgTempMin,
        avgTempMax: data.avgTempMax,
        climateNotes: toJsonText(data.climateNotes ?? ""),
        languagesAvailable: data.languagesAvailable,
        rentalAvailable: data.rentalAvailable,
        trekkingAvailable: data.trekkingAvailable,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  } catch {
    return { message: "Unable to update destination. Please try again." };
  }

  redirect("/admin/destinations?message=Destination%20updated");
}

export async function deleteDestinationAction(id: string) {
  await prisma.destination.delete({ where: { id } });
  redirect("/admin/destinations?message=Destination%20deleted");
}
