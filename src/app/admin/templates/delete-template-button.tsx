"use client";

import { useTransition } from "react";

type DeleteTemplateButtonProps = {
  deleteAction: () => Promise<void>;
};

export function DeleteTemplateButton({ deleteAction }: DeleteTemplateButtonProps) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm("Delete this template and all its days? This cannot be undone.")) return;
        start(() => {
          void deleteAction();
        });
      }}
      disabled={pending}
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
