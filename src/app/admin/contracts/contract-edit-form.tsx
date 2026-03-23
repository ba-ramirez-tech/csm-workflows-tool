"use client";

import { useActionState, useMemo, useState } from "react";
import type { ContractFormState } from "./actions";

type PerkRow = { description: string; conditions: string };
type ConditionRow = { key: string; value: string };

type ContractEditFormProps = {
  supplierTypeLabel: string;
  supplierName: string;
  initialValues: {
    season: string;
    netCostCop: number;
    costPerWhat: string;
    currency: string;
    validFrom: string;
    validTo: string;
    commissionPct: string;
    notes: string;
    isActive: boolean;
    perks: PerkRow[];
    conditionRows: ConditionRow[];
  };
  action: (state: ContractFormState, formData: FormData) => Promise<ContractFormState>;
};

const initialState: ContractFormState = {};

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-rose-600">{error}</p>;
}

export function ContractEditForm({ supplierTypeLabel, supplierName, initialValues, action }: ContractEditFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [perks, setPerks] = useState<PerkRow[]>(initialValues.perks);
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>(initialValues.conditionRows);

  const negotiatedPerksJson = useMemo(() => JSON.stringify(perks), [perks]);
  const conditionsJson = useMemo(() => JSON.stringify(conditionRows), [conditionRows]);

  function addPerk() {
    setPerks((p) => [...p, { description: "", conditions: "" }]);
  }

  function removePerk(i: number) {
    setPerks((p) => p.filter((_, idx) => idx !== i));
  }

  function updatePerk(i: number, patch: Partial<PerkRow>) {
    setPerks((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addCondition() {
    setConditionRows((r) => [...r, { key: "", value: "" }]);
  }

  function removeCondition(i: number) {
    setConditionRows((r) => r.filter((_, idx) => idx !== i));
  }

  function updateCondition(i: number, patch: Partial<ConditionRow>) {
    setConditionRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="negotiatedPerksJson" value={negotiatedPerksJson} readOnly />
      <input type="hidden" name="conditionsJson" value={conditionsJson} readOnly />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Supplier (read-only)</h2>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{supplierTypeLabel}</span>
          <span className="mx-2 text-slate-300">·</span>
          {supplierName}
        </p>
        <p className="mt-2 text-xs text-slate-500">The linked supplier cannot be changed after creation.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label htmlFor="season" className="mb-1 block text-sm font-medium text-slate-700">
            Season
          </label>
          <select
            id="season"
            name="season"
            defaultValue={initialValues.season}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          >
            <option value="BAJA">BAJA</option>
            <option value="MEDIA">MEDIA</option>
            <option value="ALTA">ALTA</option>
          </select>
          <ErrorText error={state.errors?.season} />
        </div>

        <div>
          <label htmlFor="costPerWhat" className="mb-1 block text-sm font-medium text-slate-700">
            Cost per
          </label>
          <select
            id="costPerWhat"
            name="costPerWhat"
            defaultValue={initialValues.costPerWhat}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          >
            <option value="per_night">per night</option>
            <option value="per_person">per person</option>
            <option value="per_group">per group</option>
            <option value="per_vehicle">per vehicle</option>
          </select>
          <ErrorText error={state.errors?.costPerWhat} />
        </div>

        <div>
          <label htmlFor="netCostCop" className="mb-1 block text-sm font-medium text-slate-700">
            Net cost (COP)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="netCostCop"
              name="netCostCop"
              type="number"
              min={1}
              step={1}
              defaultValue={initialValues.netCostCop}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
            />
            <span className="shrink-0 text-sm text-slate-500">COP</span>
          </div>
          <ErrorText error={state.errors?.netCostCop} />
        </div>

        <div>
          <label htmlFor="currency" className="mb-1 block text-sm font-medium text-slate-700">
            Currency
          </label>
          <input
            id="currency"
            name="currency"
            defaultValue={initialValues.currency}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
          <ErrorText error={state.errors?.currency} />
        </div>

        <div>
          <label htmlFor="validFrom" className="mb-1 block text-sm font-medium text-slate-700">
            Valid from
          </label>
          <input
            id="validFrom"
            name="validFrom"
            type="date"
            defaultValue={initialValues.validFrom}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
          <ErrorText error={state.errors?.validFrom} />
        </div>

        <div>
          <label htmlFor="validTo" className="mb-1 block text-sm font-medium text-slate-700">
            Valid to
          </label>
          <input
            id="validTo"
            name="validTo"
            type="date"
            defaultValue={initialValues.validTo}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
          <ErrorText error={state.errors?.validTo} />
        </div>

        <div>
          <label htmlFor="commissionPct" className="mb-1 block text-sm font-medium text-slate-700">
            Commission (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="commissionPct"
              name="commissionPct"
              type="number"
              min={0}
              max={100}
              step={0.01}
              defaultValue={initialValues.commissionPct}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
            />
            <span className="shrink-0 text-sm text-slate-500">%</span>
          </div>
          <ErrorText error={state.errors?.commissionPct} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-700">
            Internal Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initialValues.notes}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
          />
          <ErrorText error={state.errors?.notes} />
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
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Negotiated perks</h3>
          <button
            type="button"
            onClick={addPerk}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            + Add Perk
          </button>
        </div>
        <div className="space-y-3">
          {perks.length === 0 && <p className="text-sm text-slate-500">No perks.</p>}
          {perks.map((row, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updatePerk(i, { description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Conditions</label>
                <input
                  type="text"
                  value={row.conditions}
                  onChange={(e) => updatePerk(i, { conditions: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                />
              </div>
              <button
                type="button"
                onClick={() => removePerk(i)}
                className="rounded-lg border border-rose-200 bg-white px-2 py-2 text-sm text-rose-700 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Conditions</h3>
          <button
            type="button"
            onClick={addCondition}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            + Add Condition
          </button>
        </div>
        <div className="space-y-3">
          {conditionRows.length === 0 && <p className="text-sm text-slate-500">No conditions.</p>}
          {conditionRows.map((row, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Key</label>
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateCondition(i, { key: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Value</label>
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCondition(i)}
                className="rounded-lg border border-rose-200 bg-white px-2 py-2 text-sm text-rose-700 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {state.message && <p className="text-sm text-rose-600">{state.message}</p>}
      {state.errors?.form && <p className="text-sm text-rose-600">{state.errors.form}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
