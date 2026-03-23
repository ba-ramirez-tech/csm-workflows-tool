"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
      onClick={() => window.print()}
    >
      Imprimer
    </button>
  );
}
