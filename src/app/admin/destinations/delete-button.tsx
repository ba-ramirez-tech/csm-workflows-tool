"use client";

import { useTransition } from "react";

type DeleteButtonProps = {
  onDelete: () => Promise<void>;
};

export function DeleteButton({ onDelete }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        const confirmed = window.confirm("Delete this destination? This action cannot be undone.");
        if (!confirmed) return;
        startTransition(() => {
          void onDelete();
        });
      }}
      disabled={isPending}
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
