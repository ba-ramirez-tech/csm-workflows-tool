"use client";

import { useActionState, useMemo, useState } from "react";
import type { ContractFormState } from "./actions";

export type AccommodationOption = { id: string; label: string };
export type ExperienceOption = { id: string; label: string };
export type TransportOption = { id: string; label: string };

type ContractCreateFormProps = {
  accommodations: AccommodationOption[];
  experiences: ExperienceOption[];
  transports: TransportOption[];
  action: (state: ContractFormState, formData: FormData) => Promise<ContractFormState>;
};

const initialState: ContractFormState = {};

type SupplierType = "accommodation" | "experience" | "transport";

type PerkRow = { description: string; conditions: string };
type ConditionRow = { key: string; value: string };

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-rose-600">{error}</p>;
}

export function ContractCreateForm({ accommodations, experiences, transports, action }: ContractCreateFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [step, setStep] = useState<1 | 2>(1);
  const [supplierType, setSupplierType] = useState<SupplierType>("accommodation");

  const [perks, setPerks] = useState<PerkRow[]>([]);
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>([]);

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
      <input type="hidden" name="supplierType" value={supplierType} readOnly />

      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Step 1 — Supplier type</h2>
          <div className="space-y-3">
            {(
              [
                { value: "accommodation" as const, label: "Accommodation" },
                { value: "experience" as const, label: "Experience" },
                { value: "transport" as const, label: "Transport route" },
              ] as const
            ).map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="radio"
                  name="supplierTypeRadio"
                  checked={supplierType === opt.value}
                  onChange={() => setSupplierType(opt.value)}
                  className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-slate-800">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Step 2 — Supplier & terms</h2>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                ← Change supplier type
              </button>
            </div>

            <div className="mb-5 grid gap-4 md:grid-cols-2">
              {supplierType === "accommodation" && (
                <div className="md:col-span-2">
                  <label htmlFor="accommodationId" className="mb-1 block text-sm font-medium text-slate-700">
                    Accommodation
                  </label>
                  <select
                    id="accommodationId"
                    name="accommodationId"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select accommodation
                    </option>
                    {accommodations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ErrorText error={state.errors?.accommodationId} />
                </div>
              )}

              {supplierType === "experience" && (
                <div className="md:col-span-2">
                  <label htmlFor="experienceId" className="mb-1 block text-sm font-medium text-slate-700">
                    Experience
                  </label>
                  <select
                    id="experienceId"
                    name="experienceId"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select experience
                    </option>
                    {experiences.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  <ErrorText error={state.errors?.experienceId} />
                </div>
              )}

              {supplierType === "transport" && (
                <div className="md:col-span-2">
                  <label htmlFor="transportId" className="mb-1 block text-sm font-medium text-slate-700">
                    Transport route
                  </label>
                  <select
                    id="transportId"
                    name="transportId"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select route
                    </option>
                    {transports.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ErrorText error={state.errors?.transportId} />
                </div>
              )}

              <div>
                <label htmlFor="season" className="mb-1 block text-sm font-medium text-slate-700">
                  Season
                </label>
                <select
                  id="season"
                  name="season"
                  defaultValue="BAJA"
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
                  defaultValue="per_night"
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
                    required
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                  />
                  <span className="shrink-0 text-sm text-slate-500">COP</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Integer only — no decimals.</p>
                <ErrorText error={state.errors?.netCostCop} />
              </div>

              <div>
                <label htmlFor="currency" className="mb-1 block text-sm font-medium text-slate-700">
                  Currency
                </label>
                <input
                  id="currency"
                  name="currency"
                  defaultValue="COP"
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
                  required
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
                  required
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                />
                <ErrorText error={state.errors?.notes} />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Active
                </label>
              </div>
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
              {perks.length === 0 && <p className="text-sm text-slate-500">No perks added.</p>}
              {perks.map((row, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updatePerk(i, { description: e.target.value })}
                      placeholder="e.g. Free night after 3 consecutive nights"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Conditions</label>
                    <input
                      type="text"
                      value={row.conditions}
                      onChange={(e) => updatePerk(i, { conditions: e.target.value })}
                      placeholder="Optional conditions"
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
            <p className="mb-3 text-xs text-slate-500">
              Key–value pairs (e.g. Cancellation, Payment terms). Stored as structured JSON.
            </p>
            <div className="space-y-3">
              {conditionRows.length === 0 && <p className="text-sm text-slate-500">No conditions added.</p>}
              {conditionRows.map((row, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Key</label>
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateCondition(i, { key: e.target.value })}
                      placeholder="e.g. Cancellation"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600/40 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Value</label>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateCondition(i, { value: e.target.value })}
                      placeholder="e.g. 50% charge within 20 days"
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

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? "Creating..." : "Create contract"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
