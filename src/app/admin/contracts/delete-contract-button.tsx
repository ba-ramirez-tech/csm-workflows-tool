"use client";

import { useTransition } from "react";

type DeleteContractButtonProps = {
  onDelete: () => Promise<void>;
};

export function DeleteContractButton({ onDelete }: DeleteContractButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        const confirmed = window.confirm("This will permanently remove this cost record.");
        if (!confirmed) return;
        startTransition(() => {
          void onDelete();
        });
      }}
      disabled={isPending}
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Deleting..." : "Delete Contract"}
    </button>
  );
}
