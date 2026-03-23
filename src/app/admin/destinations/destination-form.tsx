"use client";

import { useActionState } from "react";
import type { DestinationFormState } from "./actions";

export type DestinationFormValues = {
  name: string;
  region: string;
  country: string;
  description: string;
  altitudeMeters: string;
  avgTempMin: string;
  avgTempMax: string;
  climateNotes: string;
  languagesAvailable: string[];
  rentalAvailable: boolean;
  trekkingAvailable: boolean;
  latitude: string;
  longitude: string;
};

type DestinationFormProps = {
  mode: "create" | "edit";
  initialValues: DestinationFormValues;
  action: (state: DestinationFormState, formData: FormData) => Promise<DestinationFormState>;
  submitLabel: string;
};

const initialState: DestinationFormState = {};

const languages = [
  { code: "fr", label: "French" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
] as const;

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-rose-600">{error}</p>;
}

export function DestinationForm({ mode, initialValues, action, submitLabel }: DestinationFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
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
          <label htmlFor="region" className="mb-1 block text-sm font-medium text-slate-700">
            Region
          </label>
          <input
            id="region"
            name="region"
            defaultValue={initialValues.region}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.region} />
        </div>

        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-slate-700">
            Country
          </label>
          <input
            id="country"
            name="country"
            defaultValue={initialValues.country}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.country} />
        </div>

        <div>
          <label htmlFor="altitudeMeters" className="mb-1 block text-sm font-medium text-slate-700">
            Altitude (m)
          </label>
          <input
            id="altitudeMeters"
            name="altitudeMeters"
            type="number"
            defaultValue={initialValues.altitudeMeters}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.altitudeMeters} />
        </div>

        <div>
          <label htmlFor="avgTempMin" className="mb-1 block text-sm font-medium text-slate-700">
            Avg Temp Min (C)
          </label>
          <input
            id="avgTempMin"
            name="avgTempMin"
            type="number"
            defaultValue={initialValues.avgTempMin}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.avgTempMin} />
        </div>

        <div>
          <label htmlFor="avgTempMax" className="mb-1 block text-sm font-medium text-slate-700">
            Avg Temp Max (C)
          </label>
          <input
            id="avgTempMax"
            name="avgTempMax"
            type="number"
            defaultValue={initialValues.avgTempMax}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.avgTempMax} />
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
          <label htmlFor="climateNotes" className="mb-1 block text-sm font-medium text-slate-700">
            Climate Notes
          </label>
          <textarea
            id="climateNotes"
            name="climateNotes"
            defaultValue={initialValues.climateNotes}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.climateNotes} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Languages Available</span>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            {languages.map((language) => (
              <label key={language.code} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="languagesAvailable"
                  value={language.code}
                  defaultChecked={initialValues.languagesAvailable.includes(language.code)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>{language.label}</span>
              </label>
            ))}
          </div>
          <ErrorText error={state.errors?.languagesAvailable} />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="rentalAvailable"
              defaultChecked={initialValues.rentalAvailable}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Rental available
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="trekkingAvailable"
              defaultChecked={initialValues.trekkingAvailable}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Trekking available
          </label>
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
