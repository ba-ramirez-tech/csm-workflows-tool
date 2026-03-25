"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  getAiProposalWorkspaceAction,
  persistGeneratedAiProposalsAction,
  saveAiProposalDraftAction,
} from "@/app/admin/clients/ai-proposal-actions";
import type { AiProposalItem } from "@/lib/ai/proposal-response-schema";

type Props = {
  clientId: string;
  clientName: string;
  /** Number of ClientPreference rows — 0 means discovery is thin; generation is still allowed. */
  discoveryPreferenceCount: number;
  /** From server: ANTHROPIC_API_KEY present after trim (never send the key to the client). */
  aiConfigured: boolean;
};

function DiscoveryHint({ clientId }: { clientId: string }) {
  return (
    <p className="max-w-sm text-right text-xs leading-snug text-amber-900/90 dark:text-amber-200/90">
      Peu de préférences discovery — vous pouvez quand même générer (historique devis &amp; dossiers).{" "}
      <a href="#discovery" className="font-medium text-teal-800 underline dark:text-teal-400">
        Enrichir le profil
      </a>{" "}
      ·{" "}
      <Link href={`/admin/clients/${clientId}/intake`} className="font-medium text-teal-800 underline dark:text-teal-400">
        Questionnaire
      </Link>
    </p>
  );
}

const BRIEF_PLACEHOLDER =
  "Ex. rythme plus lent, privilégier le café et Salento, éviter Bogotá en week-end, budget serré côté hébergement…";

export function AiProposalModal({
  clientId,
  clientName,
  discoveryPreferenceCount,
  aiConfigured,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<2 | 3>(2);
  const [focusNote, setFocusNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  /** Refreshed from GET /api/ai/health when modal opens — picks up key after dev server restart without full page reload. */
  const [healthConfigured, setHealthConfigured] = useState<boolean | null>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasDiscoveryPrefs = discoveryPreferenceCount > 0;
  const effectiveConfigured = healthConfigured !== null ? healthConfigured : aiConfigured;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/ai/health")
      .then((r) => r.json() as Promise<{ configured?: boolean }>)
      .then((data) => {
        if (!cancelled && typeof data.configured === "boolean") {
          setHealthConfigured(data.configured);
        }
      })
      .catch(() => {
        if (!cancelled) setHealthConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || draftLoaded) return;
    let cancelled = false;
    void getAiProposalWorkspaceAction({ clientId }).then((r) => {
      if (cancelled || !r.ok) return;
      setFocusNote(r.draftText ?? "");
      setDraftLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, draftLoaded, clientId]);

  useEffect(() => {
    if (!open || !draftLoaded) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      void saveAiProposalDraftAction({ clientId, draftText: focusNote });
    }, 600);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [focusNote, open, draftLoaded, clientId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-proposal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, count, focusNote: focusNote.trim() || undefined }),
      });
      const data = (await res.json()) as {
        proposals?: AiProposalItem[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        const detail = (() => {
          if (data.code === "ai_output_truncated") {
            return "La réponse IA était trop longue et a été coupée. Réessayez avec un brief plus court ou 2 variantes.";
          }
          if (typeof data.error === "string" && data.error.includes("Failed to parse model JSON")) {
            return "La réponse IA est arrivée dans un format incomplet. Réessayez avec un brief plus court.";
          }
          return typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
        })();
        setError(detail);
        return;
      }
      if (!data.proposals || !Array.isArray(data.proposals)) {
        setError("Réponse inattendue du serveur.");
        return;
      }
      const persisted = await persistGeneratedAiProposalsAction({
        clientId,
        briefDraft: focusNote.trim(),
        proposals: data.proposals,
      });
      if (!persisted.ok) {
        setError(persisted.message ?? "Enregistrement des propositions impossible.");
        return;
      }
      setOpen(false);
      router.refresh();
      window.requestAnimationFrame(() => {
        document.getElementById("ai-proposals")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      {!open ? (
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-400/80 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/20 hover:from-violet-500 hover:to-indigo-500 dark:border-violet-500/50"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              Propositions IA
            </button>
            {!effectiveConfigured ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                Clé IA manquante
              </span>
            ) : null}
          </div>
          <p className="max-w-xs text-right text-[11px] leading-snug text-slate-500 dark:text-gray-400">
            Brief + discovery + CRM (devis, dossiers)
          </p>
        </div>
      ) : null}
      {!hasDiscoveryPrefs && !open ? <DiscoveryHint clientId={clientId} /> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-900"
            role="dialog"
            aria-labelledby="ai-proposal-title"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/90 to-teal-50/80 px-6 py-5 dark:border-gray-700 dark:from-violet-950/40 dark:to-teal-950/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="ai-proposal-title" className="text-lg font-semibold tracking-tight text-slate-900 dark:text-gray-100">
                    Propositions de voyage (IA)
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{clientName}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-gray-500">
                    Le modèle utilise le brief ci-dessous, la discovery, les modèles publiés, et l’historique commercial
                    (statut lead, dossiers, devis). Les variantes apparaissent dans la section « Propositions IA »
                    sous le profil discovery.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-white/80 dark:hover:bg-gray-800"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              {!effectiveConfigured ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                  <p className="font-medium">Clé Anthropic non configurée</p>
                  <p className="mt-1 text-amber-900/95 dark:text-amber-200/95">
                    Ajoutez <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">ANTHROPIC_API_KEY</code> sur{" "}
                    <strong>une seule ligne</strong> dans <code className="font-mono text-xs">.env</code> ou{" "}
                    <code className="font-mono text-xs">.env.local</code>. Pas de retour à la ligne dans la valeur sauf si toute la clé est entre
                    guillemets.
                  </p>
                </div>
              ) : null}

              {!hasDiscoveryPrefs ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">Discovery peu remplie</p>
                  <p className="mt-1 text-amber-900/95 dark:text-amber-200/95">
                    Génération possible avec le statut lead, l’historique devis/dossiers, les modèles et votre brief. Enrichissez la discovery pour
                    plus de précision.
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
                    <a href="#discovery" className="text-teal-800 underline dark:text-teal-400">
                      Profil discovery
                    </a>
                    <Link href={`/admin/clients/${clientId}/intake`} className="text-teal-800 underline dark:text-teal-400">
                      Questionnaire
                    </Link>
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                    Brief pour l’IA / contraintes
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                    Oriente le ton, les destinations et les points forts des propositions (y compris les descriptions et le jour par jour).
                  </p>
                  <textarea
                    className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder={BRIEF_PLACEHOLDER}
                    value={focusNote}
                    onChange={(e) => setFocusNote(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                  Nombre de propositions
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value) as 2 | 3)}
                    disabled={loading}
                  >
                    <option value={2}>2 variantes</option>
                    <option value={3}>3 variantes</option>
                  </select>
                </label>

                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={loading}
                  onClick={generate}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Génération…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Générer les propositions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
