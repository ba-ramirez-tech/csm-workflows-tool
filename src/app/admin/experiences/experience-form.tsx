"use client";

import { useActionState, useMemo, useState } from "react";
import type { ExperienceFormState } from "./actions";

export type ExperienceFormValues = {
  destinationId: string;
  name: string;
  category: string;
  activityStyle: string;
  durationMinutes: string;
  difficulty: string;
  description: string;
  languages: string[];
  transportIncluded: string;
  minPax: string;
  maxPax: string;
  meetingPoint: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  whatToBring: string[];
  isActive: boolean;
};

type DestinationOption = { id: string; name: string };

type ExperienceFormProps = {
  mode: "create" | "edit";
  destinations: DestinationOption[];
  initialValues: ExperienceFormValues;
  action: (state: ExperienceFormState, formData: FormData) => Promise<ExperienceFormState>;
  submitLabel: string;
};

const initialState: ExperienceFormState = {};

const CATEGORIES = [
  { value: "city_tour", label: "City tour" },
  { value: "nature", label: "Nature" },
  { value: "cultural", label: "Cultural" },
  { value: "gastronomic", label: "Gastronomic" },
  { value: "adventure", label: "Adventure" },
  { value: "wellness", label: "Wellness" },
] as const;

const STYLES = [
  "ACTIVE",
  "CONTEMPLATIVE",
  "CULTURAL",
  "GASTRONOMIC",
  "NATURE",
  "ADVENTURE",
  "RELAXATION",
] as const;

const DIFFICULTIES = ["EASY", "MODERATE", "CHALLENGING", "DEMANDING", "EXTREME"] as const;

const TRANSPORT_MODES = [
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

const LANGUAGES = [
  { code: "fr", label: "French" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
] as const;

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-rose-600">{error}</p>;
}

function DynamicStringList({
  label,
  addLabel,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  addLabel: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  function add() {
    onChange([...items, ""]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function update(index: number, value: string) {
    onChange(items.map((row, i) => (i === index ? value : row)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          {addLabel}
        </button>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        {items.length === 0 && <p className="text-sm text-slate-500">No items yet.</p>}
        {items.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={row}
              onChange={(e) => update(index, e.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="shrink-0 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExperienceForm({ mode, destinations, initialValues, action, submitLabel }: ExperienceFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [highlights, setHighlights] = useState<string[]>(initialValues.highlights);
  const [included, setIncluded] = useState<string[]>(initialValues.included);
  const [notIncluded, setNotIncluded] = useState<string[]>(initialValues.notIncluded);
  const [whatToBring, setWhatToBring] = useState<string[]>(initialValues.whatToBring);

  const highlightsJson = useMemo(() => JSON.stringify(highlights), [highlights]);
  const includedJson = useMemo(() => JSON.stringify(included), [included]);
  const notIncludedJson = useMemo(() => JSON.stringify(notIncluded), [notIncluded]);
  const whatToBringJson = useMemo(() => JSON.stringify(whatToBring), [whatToBring]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="highlightsJson" value={highlightsJson} readOnly />
      <input type="hidden" name="includedJson" value={includedJson} readOnly />
      <input type="hidden" name="notIncludedJson" value={notIncludedJson} readOnly />
      <input type="hidden" name="whatToBringJson" value={whatToBringJson} readOnly />

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
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initialValues.category}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.category} />
        </div>

        <div>
          <label htmlFor="activityStyle" className="mb-1 block text-sm font-medium text-slate-700">
            Activity style
          </label>
          <select
            id="activityStyle"
            name="activityStyle"
            defaultValue={initialValues.activityStyle}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.activityStyle} />
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
          <p className="mt-1 text-xs text-slate-500">Enter total length in minutes (e.g. 150 for 2h30).</p>
          <ErrorText error={state.errors?.durationMinutes} />
        </div>

        <div>
          <label htmlFor="difficulty" className="mb-1 block text-sm font-medium text-slate-700">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue={initialValues.difficulty}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.difficulty} />
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

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Languages</span>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            {LANGUAGES.map((language) => (
              <label key={language.code} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="languages"
                  value={language.code}
                  defaultChecked={initialValues.languages.includes(language.code)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>{language.label}</span>
              </label>
            ))}
          </div>
          <ErrorText error={state.errors?.languages} />
        </div>

        <div>
          <label htmlFor="transportIncluded" className="mb-1 block text-sm font-medium text-slate-700">
            Transport included
          </label>
          <select
            id="transportIncluded"
            name="transportIncluded"
            defaultValue={initialValues.transportIncluded}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          >
            <option value="">None</option>
            {TRANSPORT_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <ErrorText error={state.errors?.transportIncluded} />
        </div>

        <div>
          <label htmlFor="minPax" className="mb-1 block text-sm font-medium text-slate-700">
            Min pax
          </label>
          <input
            id="minPax"
            name="minPax"
            type="number"
            min={1}
            defaultValue={initialValues.minPax}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.minPax} />
        </div>

        <div>
          <label htmlFor="maxPax" className="mb-1 block text-sm font-medium text-slate-700">
            Max pax
          </label>
          <input
            id="maxPax"
            name="maxPax"
            type="number"
            min={1}
            defaultValue={initialValues.maxPax}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.maxPax} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="meetingPoint" className="mb-1 block text-sm font-medium text-slate-700">
            Meeting point
          </label>
          <input
            id="meetingPoint"
            name="meetingPoint"
            defaultValue={initialValues.meetingPoint}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 transition focus:ring-2"
          />
          <ErrorText error={state.errors?.meetingPoint} />
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

        <div className="md:col-span-2 space-y-6">
          <DynamicStringList
            label="Highlights"
            addLabel="+ Add Highlight"
            items={highlights}
            onChange={setHighlights}
            placeholder="Key highlight"
          />
          <DynamicStringList
            label="Included"
            addLabel="+ Add Item"
            items={included}
            onChange={setIncluded}
            placeholder="What's included"
          />
          <DynamicStringList
            label="Not included"
            addLabel="+ Add Item"
            items={notIncluded}
            onChange={setNotIncluded}
            placeholder="Not included"
          />
          <DynamicStringList
            label="What to bring"
            addLabel="+ Add Item"
            items={whatToBring}
            onChange={setWhatToBring}
            placeholder="Item to bring"
          />
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
      {state.errors?.form && <p className="text-sm text-rose-600">{state.errors.form}</p>}

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
