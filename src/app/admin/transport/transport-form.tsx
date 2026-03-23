"use client";

import { useActionState } from "react";
import type { TransportRouteFormState } from "./actions";

type DestinationOption = { id: string; name: string };

export type TransportFormValues = {
  originId: string;
  destinationId: string;
  mode: string;
  provider: string;
  vehicleType: string;
  capacity: string;
  distanceKm: string;
  durationMinutes: string;
  altitudeStart: string;
  altitudeEnd: string;
  routeNotes: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
};

type TransportFormProps = {
  mode: "create" | "edit";
  destinations: DestinationOption[];
  initialValues: TransportFormValues;
  action: (state: TransportRouteFormState, formData: FormData) => Promise<TransportRouteFormState>;
  submitLabel: string;
};

const initialState: TransportRouteFormState = {};

const MODES = [
  "PRIVATE_CAR",
  "MINIVAN",
  "BUS",
  "FLIGHT",
  "BOAT",
  "FOUR_BY_FOUR",
  "JEEP_WILLYS",
  "HORSE",
  "WALKING",
  "CANOE",
] as const;

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-rose-600">{error}</p>;
}

function modeLabel(m: string) {
  return m.replace(/_/g, " ");
}

export function TransportRouteForm({ mode, destinations, initialValues, action, submitLabel }: TransportFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label htmlFor="originId" className="mb-1 block text-sm font-medium text-slate-700">
            Origin
          </label>
          <select
            id="originId"
            name="originId"
            defaultValue={initialValues.originId || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            <option value="" disabled>
              Select origin
            </option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.originId} />
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
              <option key={`d-${d.id}`} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.destinationId} />
        </div>

        <div>
          <label htmlFor="mode" className="mb-1 block text-sm font-medium text-slate-700">
            Mode
          </label>
          <select
            id="mode"
            name="mode"
            defaultValue={initialValues.mode}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {modeLabel(m)}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.mode} />
        </div>

        <div>
          <label htmlFor="provider" className="mb-1 block text-sm font-medium text-slate-700">
            Provider
          </label>
          <input
            id="provider"
            name="provider"
            defaultValue={initialValues.provider}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.provider} />
        </div>

        <div>
          <label htmlFor="vehicleType" className="mb-1 block text-sm font-medium text-slate-700">
            Vehicle type
          </label>
          <input
            id="vehicleType"
            name="vehicleType"
            defaultValue={initialValues.vehicleType}
            placeholder="e.g. Minivan, 4x4"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.vehicleType} />
        </div>

        <div>
          <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-slate-700">
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={0}
            defaultValue={initialValues.capacity}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.capacity} />
        </div>

        <div>
          <label htmlFor="distanceKm" className="mb-1 block text-sm font-medium text-slate-700">
            Distance (km)
          </label>
          <input
            id="distanceKm"
            name="distanceKm"
            type="number"
            min={0}
            defaultValue={initialValues.distanceKm}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.distanceKm} />
        </div>

        <div>
          <label htmlFor="durationMinutes" className="mb-1 block text-sm font-medium text-slate-700">
            Duration (minutes)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={0}
            defaultValue={initialValues.durationMinutes}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <p className="mt-1 text-xs text-slate-500">Shown as e.g. 2h30 on the list.</p>
          <ErrorText error={state.errors?.durationMinutes} />
        </div>

        <div>
          <label htmlFor="altitudeStart" className="mb-1 block text-sm font-medium text-slate-700">
            Altitude start (m ASL)
          </label>
          <input
            id="altitudeStart"
            name="altitudeStart"
            type="number"
            defaultValue={initialValues.altitudeStart}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.altitudeStart} />
        </div>

        <div>
          <label htmlFor="altitudeEnd" className="mb-1 block text-sm font-medium text-slate-700">
            Altitude end (m ASL)
          </label>
          <input
            id="altitudeEnd"
            name="altitudeEnd"
            type="number"
            defaultValue={initialValues.altitudeEnd}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.altitudeEnd} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="routeNotes" className="mb-1 block text-sm font-medium text-slate-700">
            Route notes
          </label>
          <textarea
            id="routeNotes"
            name="routeNotes"
            defaultValue={initialValues.routeNotes}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.routeNotes} />
        </div>

        <div>
          <label htmlFor="contactName" className="mb-1 block text-sm font-medium text-slate-700">
            Contact name
          </label>
          <input
            id="contactName"
            name="contactName"
            defaultValue={initialValues.contactName}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.contactName} />
        </div>

        <div>
          <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium text-slate-700">
            Contact phone
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={initialValues.contactPhone}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.contactPhone} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
            Contact email
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={initialValues.contactEmail}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.contactEmail} />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initialValues.isActive}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Active
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
