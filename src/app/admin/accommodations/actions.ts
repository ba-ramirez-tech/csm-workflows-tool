"use server";

import { Prisma, TripTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type AccommodationFormState = {
  message?: string;
  errors?: Record<string, string>;
};

const ACCOMMODATION_TYPES = [
  "hotel",
  "ecolodge",
  "hacienda",
  "glamping",
  "boutique",
  "hostel",
  "villa",
] as const;

const AMENITY_KEYS = [
  "pool",
  "wifi",
  "ac",
  "parking",
  "restaurant",
  "spa",
  "bar",
  "gym",
  "laundry",
  "room_service",
  "airport_shuttle",
  "beach_access",
  "garden",
  "terrace",
  "kitchen",
] as const;

const roomTypeEntrySchema = z.object({
  name: z.string().trim().min(1, "Room type name is required."),
  maxGuests: z.coerce.number().int().min(1, "Max guests must be at least 1."),
  bedType: z.string().trim().min(1, "Bed type is required."),
});

const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().positive().optional(),
);

const accommodationSchema = z.object({
  destinationId: z.string().uuid("Select a destination."),
  name: z.string().trim().min(1, "Name is required."),
  type: z.enum(ACCOMMODATION_TYPES),
  tier: z.nativeEnum(TripTier),
  maxCapacity: optionalInt,
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .trim()
    .refine((s) => s === "" || z.string().email().safeParse(s).success, { message: "Invalid email." }),
  website: z
    .string()
    .trim()
    .refine((s) => s === "" || z.string().url().safeParse(s).success, { message: "Invalid URL." }),
  latitude: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(-90).max(90).optional(),
  ),
  longitude: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(-180).max(180).optional(),
  ),
  checkInTime: z.string().trim().min(1, "Check-in time is required."),
  checkOutTime: z.string().trim().min(1, "Check-out time is required."),
  stars: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).max(5).optional(),
  ),
  rating: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(1).max(5).optional(),
  ),
  notes: z.string().optional(),
  amenities: z.array(z.enum(AMENITY_KEYS)),
  roomTypes: z.array(roomTypeEntrySchema),
  isActive: z.boolean(),
});

function parseRoomTypesJson(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function normalizeRoomTypesPayload(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
    .map((row) => ({
      name: String(row.name ?? "").trim(),
      maxGuests: Number(row.maxGuests) || 1,
      bedType: String(row.bedType ?? "").trim(),
    }))
    .filter((r) => r.name.length > 0 && r.bedType.length > 0);
}

function parseAccommodationFormData(formData: FormData) {
  const roomTypesRaw = parseRoomTypesJson(formData.get("roomTypesJson"));
  if (roomTypesRaw === null) {
    return { success: false as const, errors: { roomTypes: "Invalid room types data." } };
  }

  const normalized = normalizeRoomTypesPayload(roomTypesRaw);
  const roomTypesParsed = z.array(roomTypeEntrySchema).safeParse(normalized);
  if (!roomTypesParsed.success) {
    const flat = roomTypesParsed.error.flatten().fieldErrors;
    const msgs = Object.values(flat).flat() as string[];
    const msg = msgs[0] ?? "Invalid room types.";
    return { success: false as const, errors: { roomTypes: msg } };
  }

  const emailRaw = formData.get("email");
  const websiteRaw = formData.get("website");

  const payload = {
    destinationId: formData.get("destinationId"),
    name: formData.get("name"),
    type: formData.get("type"),
    tier: formData.get("tier"),
    maxCapacity: formData.get("maxCapacity"),
    description: (formData.get("description") as string | null) ?? "",
    address: (formData.get("address") as string | null) ?? "",
    phone: (formData.get("phone") as string | null) ?? "",
    email: typeof emailRaw === "string" ? emailRaw : "",
    website: typeof websiteRaw === "string" ? websiteRaw : "",
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    checkInTime: (formData.get("checkInTime") as string | null) ?? "15:00",
    checkOutTime: (formData.get("checkOutTime") as string | null) ?? "11:00",
    stars: formData.get("stars"),
    rating: formData.get("rating"),
    notes: (formData.get("notes") as string | null) ?? "",
    amenities: formData.getAll("amenities"),
    roomTypes: roomTypesParsed.data,
    isActive: formData.get("isActive") === "on",
  };

  const parsed = accommodationSchema.safeParse(payload);
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

function toDescriptionJson(value: string): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const trimmed = value.trim();
  if (!trimmed) return Prisma.JsonNull;
  return trimmed;
}

function toRoomTypesJson(entries: z.infer<typeof roomTypeEntrySchema>[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (entries.length === 0) return Prisma.JsonNull;
  return entries.map((r) => ({
    name: r.name,
    maxGuests: r.maxGuests,
    bedType: r.bedType,
  }));
}

export async function createAccommodationAction(
  _prevState: AccommodationFormState,
  formData: FormData,
): Promise<AccommodationFormState> {
  const parsed = parseAccommodationFormData(formData);
  if (!parsed.success) {
    return {
      errors: "errors" in parsed ? parsed.errors : undefined,
      message: "Please fix the highlighted fields.",
    };
  }

  const data = parsed.data;

  try {
    await prisma.accommodation.create({
      data: {
        destinationId: data.destinationId,
        name: data.name,
        type: data.type,
        tier: data.tier,
        maxCapacity: data.maxCapacity,
        description: toDescriptionJson(data.description ?? ""),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        website: data.website?.trim() || null,
        latitude: data.latitude,
        longitude: data.longitude,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        stars: data.stars,
        rating: data.rating,
        notes: data.notes?.trim() || null,
        amenities: data.amenities,
        roomTypes: toRoomTypesJson(data.roomTypes),
        photoGallery: [],
        isActive: data.isActive,
      },
    });
  } catch {
    return { message: "Unable to create accommodation. Please try again." };
  }

  redirect("/admin/accommodations?message=Accommodation%20created");
}

export async function updateAccommodationAction(
  id: string,
  _prevState: AccommodationFormState,
  formData: FormData,
): Promise<AccommodationFormState> {
  const parsed = parseAccommodationFormData(formData);
  if (!parsed.success) {
    return {
      errors: "errors" in parsed ? parsed.errors : undefined,
      message: "Please fix the highlighted fields.",
    };
  }

  const data = parsed.data;

  try {
    await prisma.accommodation.update({
      where: { id },
      data: {
        destinationId: data.destinationId,
        name: data.name,
        type: data.type,
        tier: data.tier,
        maxCapacity: data.maxCapacity,
        description: toDescriptionJson(data.description ?? ""),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        website: data.website?.trim() || null,
        latitude: data.latitude,
        longitude: data.longitude,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        stars: data.stars,
        rating: data.rating,
        notes: data.notes?.trim() || null,
        amenities: data.amenities,
        roomTypes: toRoomTypesJson(data.roomTypes),
        isActive: data.isActive,
      },
    });
  } catch {
    return { message: "Unable to update accommodation. Please try again." };
  }

  redirect("/admin/accommodations?message=Accommodation%20updated");
}

export async function deleteAccommodationAction(id: string) {
  await prisma.accommodation.delete({ where: { id } });
  redirect("/admin/accommodations?message=Accommodation%20deleted");
}
