import Link from "next/link";
import { TravelerType, TripTier } from "@prisma/client";
import { CLIENT_CURRENCY_OPTIONS, DEFAULT_CLIENT_CURRENCY } from "@/lib/client-currency";
import { createTripTemplateAction } from "../actions";

type NewTemplatePageProps = {
  searchParams?: Promise<{ error?: string }>;
};

const TRAVELERS = Object.values(TravelerType);
const TIERS = Object.values(TripTier);

export default async function NewTemplatePage({ searchParams }: NewTemplatePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error;

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create template</h1>
          <p className="text-sm text-slate-600">
            Set metadata first; you will configure the day-by-day itinerary next.
          </p>
        </div>
        <Link href="/admin/templates" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to list
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createTripTemplateAction} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
            Slug (optional, auto from name)
          </label>
          <input
            id="slug"
            name="slug"
            placeholder="classic-colombia-14d"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Traveler profiles</span>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
            {TRAVELERS.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="travelerTypes"
                  value={t}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="font-medium">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="tier" className="mb-1 block text-sm font-medium text-slate-700">
            Tier
          </label>
          <select
            id="tier"
            name="tier"
            defaultValue="STANDARD"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="durationDays" className="mb-1 block text-sm font-medium text-slate-700">
            Duration (days)
          </label>
          <input
            id="durationDays"
            name="durationDays"
            type="number"
            min={1}
            max={365}
            defaultValue={7}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="clientCurrency" className="mb-1 block text-sm font-medium text-slate-700">
            Client currency
          </label>
          <select
            id="clientCurrency"
            name="clientCurrency"
            defaultValue={DEFAULT_CLIENT_CURRENCY}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          >
            {CLIENT_CURRENCY_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">EUR is standard for CSM clients; COP only when needed.</p>
        </div>

        <div>
          <label htmlFor="basePriceAmount" className="mb-1 block text-sm font-medium text-slate-700">
            Base price (per person, whole units in selected currency)
          </label>
          <input
            id="basePriceAmount"
            name="basePriceAmount"
            type="number"
            min={0}
            step={1}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="webProductUrl" className="mb-1 block text-sm font-medium text-slate-700">
            Web product URL
          </label>
          <input
            id="webProductUrl"
            name="webProductUrl"
            type="url"
            placeholder="https://www.colombiesurmesure.com/circuits/…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium text-slate-700">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            placeholder="classic, family, caribbean"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Create & open builder
          </button>
        </div>
      </form>
    </section>
  );
}
