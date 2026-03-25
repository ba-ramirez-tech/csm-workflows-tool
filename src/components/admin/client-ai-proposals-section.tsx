"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { createQuoteFromAiProposalAction } from "@/app/admin/quotes/actions";
import {
  deleteAiProposalAction,
  saveAiProposalEditsAction,
  setAiProposalStatusAction,
} from "@/app/admin/clients/ai-proposal-actions";
import { formatAiEstimatedPriceRange, type AiProposalItem } from "@/lib/ai/proposal-response-schema";

export type ClientAiProposalRow = {
  id: string;
  status: string;
  proposalName: string;
  tagline: string | null;
  durationDays: number | null;
  tier: string | null;
  estimatedPriceRange: string | null;
  quoteId: string | null;
  createdAt: string;
  proposal: AiProposalItem | null;
};

function tierBadgeClass(tier: string | null) {
  if (!tier) return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
  const u = tier.toUpperCase();
  if (u === "LUXURY") return "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100";
  if (u === "CHARME") return "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100";
  if (u === "STANDARD") return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
  if (u === "BUDGET") return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
  return "bg-slate-200 text-slate-800";
}

function statusLabel(status: string) {
  switch (status) {
    case "generated":
      return "Générée";
    case "selected":
      return "Sélectionnée";
    case "converted":
      return "Convertie en devis";
    case "dismissed":
      return "Masquée";
    default:
      return status;
  }
}

type Props = {
  clientId: string;
  initialRows: ClientAiProposalRow[];
};

export function ClientAiProposalsSection({ clientId, initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  const [editing, setEditing] = useState<ClientAiProposalRow | null>(null);
  const [editDraft, setEditDraft] = useState<AiProposalItem | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openEdit = (row: ClientAiProposalRow) => {
    if (!row.proposal) return;
    setEditing(row);
    setEditDraft(JSON.parse(JSON.stringify(row.proposal)) as AiProposalItem);
    setEditError(null);
  };

  const saveEdit = () => {
    if (!editing || !editDraft) return;
    setEditError(null);
    startTransition(async () => {
      const r = await saveAiProposalEditsAction({ proposalId: editing.id, proposalJson: editDraft });
      if (!r.ok) {
        setEditError(r.message ?? "Enregistrement impossible.");
        return;
      }
      setRows((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? {
                ...x,
                proposalName: editDraft.proposal_name,
                tagline: editDraft.tagline,
                durationDays: editDraft.duration_days,
                tier: editDraft.tier,
                estimatedPriceRange: formatAiEstimatedPriceRange(editDraft.estimated_price_range),
                proposal: editDraft,
              }
            : x,
        ),
      );
      setEditing(null);
      setEditDraft(null);
      router.refresh();
    });
  };

  const createQuote = (row: ClientAiProposalRow) => {
    if (!row.proposal) return;
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("proposalJson", JSON.stringify(row.proposal));
    fd.set("proposalId", row.id);
    fd.set("currency", "EUR");
    startTransition(() => {
      void createQuoteFromAiProposalAction({}, fd);
    });
  };

  const dismiss = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const r = await setAiProposalStatusAction({ proposalId: id, status: "dismissed" });
      setBusyId(null);
      if (r.ok) {
        setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: "dismissed" } : x)));
        router.refresh();
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("Supprimer cette proposition IA ?")) return;
    setBusyId(id);
    startTransition(async () => {
      const r = await deleteAiProposalAction({ proposalId: id });
      setBusyId(null);
      if (r.ok) {
        setRows((prev) => prev.filter((x) => x.id !== id));
        router.refresh();
      } else {
        alert(r.message ?? "Suppression impossible.");
      }
    });
  };

  const visible = rows.filter((r) => r.status !== "dismissed");

  return (
    <section
      id="ai-proposals"
      className="scroll-mt-24 rounded-xl border border-violet-200/80 bg-gradient-to-b from-violet-50/50 to-white p-5 dark:border-violet-900/40 dark:from-violet-950/20 dark:to-gray-900/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Propositions IA</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Générez depuis le bouton en haut de page · modifiez ou créez un devis ici
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-gray-400">
          Aucune proposition en cours. Ouvrez « Propositions IA » pour générer des variantes.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {visible.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-gray-100">{row.proposalName}</h3>
                  {row.tagline ? (
                    <p className="mt-0.5 text-sm text-teal-800 dark:text-teal-200/90">{row.tagline}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                    {statusLabel(row.status)}
                    {row.durationDays != null ? ` · ${row.durationDays} j` : null}
                    {row.estimatedPriceRange ? ` · ${row.estimatedPriceRange}` : null}
                  </p>
                  {!row.proposal ? (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                      Données complètes indisponibles — impossible de créer un devis depuis cette entrée.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.tier ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${tierBadgeClass(row.tier)}`}>
                      {row.tier}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-gray-600">
                {row.quoteId ? (
                  <Link
                    href={`/admin/quotes/${row.quoteId}`}
                    className="inline-flex items-center rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Voir le devis
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={pending || busyId === row.id || !row.proposal || row.status === "converted"}
                    onClick={() => createQuote(row)}
                    className="inline-flex items-center rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    Sélectionner &amp; créer devis
                  </button>
                )}
                <button
                  type="button"
                  disabled={!row.proposal || pending}
                  onClick={() => openEdit(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id || row.status === "dismissed"}
                  onClick={() => dismiss(row.id)}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Masquer
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id || !!row.quoteId}
                  onClick={() => remove(row.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-800 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && editDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-gray-600 dark:bg-gray-900"
            role="dialog"
            aria-labelledby="edit-ai-proposal-title"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="edit-ai-proposal-title" className="text-base font-semibold text-slate-900 dark:text-gray-100">
                Modifier la proposition
              </h3>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800"
                aria-label="Fermer"
                onClick={() => {
                  setEditing(null);
                  setEditDraft(null);
                  setEditError(null);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{editing.proposalName}</p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
                Titre
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={editDraft.proposal_name}
                  onChange={(e) => setEditDraft({ ...editDraft, proposal_name: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
                Accroche
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={editDraft.tagline}
                  onChange={(e) => setEditDraft({ ...editDraft, tagline: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
                Présentation
                <textarea
                  className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={editDraft.presentation ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, presentation: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
                Pourquoi cette option
                <textarea
                  className="mt-1 min-h-[70px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={editDraft.why_this_fits}
                  onChange={(e) => setEditDraft({ ...editDraft, why_this_fits: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
                Différenciant
                <textarea
                  className="mt-1 min-h-[60px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={editDraft.differentiator}
                  onChange={(e) => setEditDraft({ ...editDraft, differentiator: e.target.value })}
                />
              </label>
            </div>

            {editError ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300">{editError}</p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-gray-600"
                onClick={() => {
                  setEditing(null);
                  setEditDraft(null);
                  setEditError(null);
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={saveEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
