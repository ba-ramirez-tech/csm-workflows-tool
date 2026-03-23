"use client";

import { Printer } from "lucide-react";

export function PrintToolbar() {
  return (
    <div className="mb-6 flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        <Printer className="h-4 w-4" />
        Print / Save as PDF
      </button>
    </div>
  );
}
