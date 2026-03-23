"use client";

import { useActionState, useMemo, useState } from "react";
import type { AccommodationFormState } from "./actions";

export type RoomTypeRow = {
  name: string;
  maxGuests: number;
  bedType: string;
};

export type AccommodationFormValues = {
  destinationId: string;
  name: string;
  type: string;
  tier: string;
  maxCapacity: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  latitude: string;
  longitude: string;
  checkInTime: string;
  checkOutTime: string;
  stars: string;
  rating: string;
  notes: string;
  amenities: string[];
  roomTypes: RoomTypeRow[];
  isActive: boolean;
};

type DestinationOption = {
  id: string;
  name: string;
};

type AccommodationFormProps = {
  mode: "create" | "edit";
  destinations: DestinationOption[];
  initialValues: AccommodationFormValues;
  action: (state: AccommodationFormState, formData: FormData) => Promise<AccommodationFormState>;
  submitLabel: string;
};

const initialState: AccommodationFormState = {};

const TYPES = [
  "hotel",
  "ecolodge",
  "hacienda",
  "glamping",
  "boutique",
  "hostel",
  "villa",
] as const;

const TIERS = ["BUDGET", "STANDARD", "CHARME", "LUXURY"] as const;

const AMENITIES: { key: string; label: string }[] = [
  { key: "pool", label: "Pool" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "ac", label: "A/C" },
  { key: "parking", label: "Parking" },
  { key: "restaurant", label: "Restaurant" },
  { key: "spa", label: "Spa" },
  { key: "bar", label: "Bar" },
  { key: "gym", label: "Gym" },
  { key: "laundry", label: "Laundry" },
  { key: "room_service", label: "Room service" },
  { key: "airport_shuttle", label: "Airport shuttle" },
  { key: "beach_access", label: "Beach access" },
  { key: "garden", label: "Garden" },
  { key: "terrace", label: "Terrace" },
  { key: "kitchen", label: "Kitchen" },
];

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-rose-600">{error}</p>;
}

export function AccommodationForm({ mode, destinations, initialValues, action, submitLabel }: AccommodationFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>(initialValues.roomTypes);

  const roomTypesJson = useMemo(() => JSON.stringify(roomTypes), [roomTypes]);

  function addRoomType() {
    setRoomTypes((prev) => [...prev, { name: "", maxGuests: 2, bedType: "double" }]);
  }

  function removeRoomType(index: number) {
    setRoomTypes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRoomType(index: number, patch: Partial<RoomTypeRow>) {
    setRoomTypes((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="roomTypesJson" value={roomTypesJson} readOnly />

      <div className="grid grid-cols-1 gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={initialValues.name}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.name} />
        </div>

        <div>
          <label htmlFor="destinationId" className="mb-1 block text-sm font-medium text-slate-700">
            Destination
          </label>
          <select
            id="destinationId"
            name="destinationId"
            defaultValue={initialValues.destinationId || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            <option value="" disabled>
              Select destination
            </option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.destinationId} />
        </div>

        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={initialValues.type}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.type} />
        </div>

        <div>
          <label htmlFor="tier" className="mb-1 block text-sm font-medium text-slate-700">
            Tier
          </label>
          <select
            id="tier"
            name="tier"
            defaultValue={initialValues.tier}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.tier} />
        </div>

        <div>
          <label htmlFor="maxCapacity" className="mb-1 block text-sm font-medium text-slate-700">
            Max capacity
          </label>
          <input
            id="maxCapacity"
            name="maxCapacity"
            type="number"
            min={1}
            defaultValue={initialValues.maxCapacity}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.maxCapacity} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={initialValues.description}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.description} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
            Address
          </label>
          <input
            id="address"
            name="address"
            defaultValue={initialValues.address}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.address} />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialValues.phone}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.phone} />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initialValues.email}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.email} />
        </div>

        <div>
          <label htmlFor="website" className="mb-1 block text-sm font-medium text-slate-700">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://"
            defaultValue={initialValues.website}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.website} />
        </div>

        <div>
          <label htmlFor="latitude" className="mb-1 block text-sm font-medium text-slate-700">
            Latitude
          </label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            defaultValue={initialValues.latitude}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.latitude} />
        </div>

        <div>
          <label htmlFor="longitude" className="mb-1 block text-sm font-medium text-slate-700">
            Longitude
          </label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            defaultValue={initialValues.longitude}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.longitude} />
        </div>

        <div>
          <label htmlFor="checkInTime" className="mb-1 block text-sm font-medium text-slate-700">
            Check-in time
          </label>
          <input
            id="checkInTime"
            name="checkInTime"
            defaultValue={initialValues.checkInTime}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.checkInTime} />
        </div>

        <div>
          <label htmlFor="checkOutTime" className="mb-1 block text-sm font-medium text-slate-700">
            Check-out time
          </label>
          <input
            id="checkOutTime"
            name="checkOutTime"
            defaultValue={initialValues.checkOutTime}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.checkOutTime} />
        </div>

        <div>
          <label htmlFor="stars" className="mb-1 block text-sm font-medium text-slate-700">
            Stars (1–5)
          </label>
          <input
            id="stars"
            name="stars"
            type="number"
            min={1}
            max={5}
            defaultValue={initialValues.stars}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.stars} />
        </div>

        <div>
          <label htmlFor="rating" className="mb-1 block text-sm font-medium text-slate-700">
            Rating (1–5, 0.5 steps)
          </label>
          <input
            id="rating"
            name="rating"
            type="number"
            min={1}
            max={5}
            step={0.5}
            defaultValue={initialValues.rating}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.rating} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-700">
            Internal Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={initialValues.notes}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.notes} />
        </div>

        <div className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Amenities</span>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
            {AMENITIES.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="amenities"
                  value={a.key}
                  defaultChecked={initialValues.amenities.includes(a.key)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
          <ErrorText error={state.errors?.amenities} />
        </div>

        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">Room types</span>
            <button
              type="button"
              onClick={addRoomType}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              + Add Room Type
            </button>
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            {roomTypes.length === 0 && (
              <p className="text-sm text-slate-500">No room types yet. Add one to describe room categories.</p>
            )}
            {roomTypes.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_100px_1fr_auto] sm:items-end"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRoomType(index, { name: e.target.value })}
                    placeholder="e.g. Standard Double"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Max guests</label>
                  <input
                    type="number"
                    min={1}
                    value={row.maxGuests}
                    onChange={(e) => updateRoomType(index, { maxGuests: Number(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Bed type</label>
                  <input
                    type="text"
                    value={row.bedType}
                    onChange={(e) => updateRoomType(index, { bedType: e.target.value })}
                    placeholder="e.g. double, king"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                  />
                </div>
                <div className="flex justify-end sm:pb-2">
                  <button
                    type="button"
                    onClick={() => removeRoomType(index)}
                    className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
                    aria-label="Remove room type"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <ErrorText error={state.errors?.roomTypes} />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initialValues.isActive}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Active (visible in catalog)
          </label>
          <ErrorText error={state.errors?.isActive} />
        </div>
      </div>

      {state.message && <p className="text-sm text-rose-600">{state.message}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (mode === "create" ? "Creating..." : "Saving...") : submitLabel}
        </button>
      </div>
    </form>
  );
}
