import { Globe2, Luggage, Map, Route } from "lucide-react";
import { createQuickStartTemplateAction } from "./actions";
import type { QuickStartFormula } from "@/lib/quick-start-formulas";
import { QUICK_START_FORMULAS } from "@/lib/quick-start-formulas";

const ICONS = {
  Luggage,
  Route,
  Map,
  Globe2,
} as const;

function FormulaCard({ formula }: { formula: QuickStartFormula }) {
  const Icon = ICONS[formula.icon];
  return (
    <div
      className={[
        "flex flex-col rounded-xl border-2 border-transparent bg-white p-5 shadow-sm",
        "bg-gradient-to-br from-white to-teal-50/40",
        "ring-1 ring-teal-200/80 ring-offset-0",
        "hover:ring-teal-400/70 hover:shadow-md transition-shadow",
      ].join(" ")}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums text-teal-800">{formula.durationDays}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600/90">days</p>
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-900">{formula.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{formula.description}</p>
      <form action={createQuickStartTemplateAction} className="mt-4">
        <input type="hidden" name="formulaKey" value={formula.id} />
        <button
          type="submit"
          className="w-full rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          Use this formula
        </button>
      </form>
    </div>
  );
}

export function QuickStartTemplatesSection() {
  return (
    <section className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/60 via-white to-cyan-50/40 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Start from a pre-built formula</h2>
      <p className="mt-1 text-sm text-slate-600">
        Pick a circuit aligned with your public products on{" "}
        <span className="font-medium text-slate-800">colombiesurmesure.com</span>. We create the template shell; you
        assign destinations and services per day.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_START_FORMULAS.map((f) => (
          <FormulaCard key={f.id} formula={f} />
        ))}
      </div>
    </section>
  );
}
