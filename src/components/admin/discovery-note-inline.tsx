"use client";

import { MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDiscoveryAgentNoteAction } from "@/app/admin/clients/discovery-note-actions";

type Props = {
  clientId: string;
  questionKey: string;
  answerSnapshot: string;
  initialNote: string | null;
  initialBy: string | null;
  initialAt: Date | null;
};

export function DiscoveryNoteInline({
  clientId,
  questionKey,
  answerSnapshot,
  initialNote,
  initialBy,
  initialAt,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {initialNote ? (
        <p className="mt-1 text-xs italic text-slate-600 dark:text-gray-400">
          Note ({initialBy ?? "Agent"}
          {initialAt ? ` · ${initialAt.toLocaleString("fr-FR")}` : ""}) : {initialNote}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 inline-flex items-center gap-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-teal-800 print:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-teal-300"
        title="Note agent"
        aria-label="Note agent"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="text-xs">{initialNote ? "Modifier la note" : "Ajouter une note"}</span>
      </button>
      {open ? (
        <form
          className="mt-2 space-y-2 print:hidden"
          action={(fd) => {
            startTransition(async () => {
              await saveDiscoveryAgentNoteAction(fd);
              router.refresh();
              setOpen(false);
            });
          }}
        >
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="questionKey" value={questionKey} />
          <input type="hidden" name="answerSnapshot" value={answerSnapshot} />
          <textarea
            name="agentNote"
            rows={3}
            defaultValue={initialNote ?? ""}
            placeholder="Note interne (ex. confirmé au téléphone…)…"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <p className="text-[11px] text-slate-500 dark:text-gray-500">Videz le texte et enregistrez pour supprimer la note.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-teal-600"
            >
              {pending ? "…" : "Enregistrer"}
            </button>
            <button
              type="button"
              className="text-xs text-slate-600 underline dark:text-gray-400"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
