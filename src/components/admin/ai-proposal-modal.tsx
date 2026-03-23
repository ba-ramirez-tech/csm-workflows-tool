"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { createQuoteFromAiProposalAction } from "@/app/admin/quotes/actions";
import {
  getAiProposalWorkspaceAction,
  persistGeneratedAiProposalsAction,
  saveAiProposalDraftAction,
  saveAiProposalEditsAction,
  saveAiProposalForLaterAction,
  setAiProposalStatusAction,
} from "@/app/admin/clients/ai-proposal-actions";
import type { AiProposalItem } from "@/lib/ai/proposal-types";

type Props = {
  clientId: string;
  clientName: string;
  /** Number of ClientPreference rows — 0 means discovery is thin; generation is still allowed. */
  discoveryPreferenceCount: number;
  /** From server: ANTHROPIC_API_KEY present after trim (never send the key to the client). */
  aiConfigured: boolean;
};

function tierBadgeClass(tier: string) {
  const u = tier.toUpperCase();
  if (u === "LUXURY") return "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100";
  if (u === "CHARME") return "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100";
  if (u === "STANDARD") return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
  if (u === "BUDGET") return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
  return "bg-slate-200 text-slate-800";
}

function DiscoveryHint({ clientId }: { clientId: string }) {
  return (
    <p className="max-w-sm text-right text-xs leading-snug text-amber-900/90 dark:text-amber-200/90">
      Peu de préférences discovery — vous pouvez quand même générer (historique devis &amp; dossiers).{" "}
      <a href="#discovery" className="font-medium text-teal-800 underline dark:text-teal-400">
        Enrichir le profil
      </a>{" "}
      ·{" "}
      <a href={`/admin/clients/${clientId}/intake`} className="font-medium text-teal-800 underline dark:text-teal-400">
        Questionnaire
      </a>
    </p>
  );
}

const BRIEF_PLACEHOLDER =
  "Ex. rythme plus lent, privilégier le café et Salento, éviter Bogotá en week-end, budget serré côté hébergement…";

function sortByDay<T extends { day_number: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.day_number - b.day_number);
}

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
  const [proposals, setProposals] = useState<Array<{ id: string | null; status: string; proposal: AiProposalItem }> | null>(null);
  const [pending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  /** Refreshed from GET /api/ai/health when modal opens — picks up key after dev server restart without full page reload. */
  const [healthConfigured, setHealthConfigured] = useState<boolean | null>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proposalSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      if (Array.isArray(r.proposals) && r.proposals.length > 0) {
        const parsed = r.proposals
          .map((p) => ({ id: p.id, status: p.status, proposal: p.proposal as AiProposalItem }))
          .filter((p) => p.proposal && typeof p.proposal === "object");
        if (parsed.length > 0) setProposals(parsed);
      }
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

  const queueProposalSave = (proposalId: string | null, proposal: AiProposalItem) => {
    if (!proposalId) return;
    const prev = proposalSaveTimers.current[proposalId];
    if (prev) clearTimeout(prev);
    proposalSaveTimers.current[proposalId] = setTimeout(() => {
      void saveAiProposalEditsAction({ proposalId, proposalJson: proposal });
    }, 500);
  };

  const updateProposal = (index: number, updater: (p: AiProposalItem) => AiProposalItem) => {
    setProposals((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      const proposal = updater(row.proposal);
      next[index] = { ...row, proposal };
      queueProposalSave(row.id, proposal);
      return next;
    });
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setProposals(null);
    setSaveMsg(null);
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
        issues?: unknown;
        raw?: string;
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
      if (persisted.ok && persisted.proposals) {
        setProposals(
          persisted.proposals.map((p) => ({
            id: p.id,
            status: p.status,
            proposal: p.proposal as AiProposalItem,
          })),
        );
      } else {
        setProposals(data.proposals.map((p) => ({ id: null, status: "draft", proposal: p })));
      }
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const createQuote = (p: AiProposalItem, proposalId: string | null) => {
    setSaveMsg(null);
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("proposalJson", JSON.stringify(p));
    if (proposalId) fd.set("proposalId", proposalId);
    fd.set("currency", "EUR");
    startTransition(() => {
      void createQuoteFromAiProposalAction({}, fd);
    });
  };

  const saveForLater = (p: AiProposalItem, proposalId: string | null) => {
    setSaveMsg(null);
    startTransition(async () => {
      const r = await saveAiProposalForLaterAction({
        clientId,
        proposalJson: JSON.stringify(p, null, 2),
        proposalId: proposalId ?? undefined,
      });
      if (r.ok) {
        setSaveMsg("Enregistré — voir le fil d’activité.");
        router.refresh();
      }
    });
  };

  const setProposalStatus = (proposalId: string | null, status: "accepted" | "rejected") => {
    if (!proposalId) return;
    startTransition(async () => {
      const r = await setAiProposalStatusAction({ proposalId, status });
      if (r.ok) {
        setSaveMsg(status === "accepted" ? "Proposition marquée comme acceptée." : "Proposition marquée comme refusée.");
        setProposals((prev) => (prev ? prev.map((row) => (row.id === proposalId ? { ...row, status } : row)) : prev));
        router.refresh();
      }
    });
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
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-900"
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
                    (statut lead, dossiers, devis).
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
                    disabled={!!proposals}
                  />
                </div>

                <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                  Nombre de propositions
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value) as 2 | 3)}
                    disabled={!!proposals}
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
                {saveMsg ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                    {saveMsg}
                  </p>
                ) : null}

                {!proposals ? (
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
                ) : null}
              </div>
            </div>

            {proposals && proposals.length > 0 ? (
              <ul className="space-y-5 border-t border-slate-100 px-6 py-6 dark:border-gray-700">
                {proposals.map((row, i) => {
                  const p = row.proposal;
                  return (
                  <li
                    key={i}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5 dark:border-gray-600 dark:bg-gray-800/40 dark:ring-white/5"
                  >
                    <div className="border-b border-slate-100 bg-gradient-to-br from-teal-50/90 via-white to-violet-50/50 px-5 py-5 dark:border-gray-600 dark:from-teal-950/40 dark:via-gray-800/60 dark:to-violet-950/30">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-semibold leading-snug text-slate-900 dark:text-gray-100">{p.proposal_name}</h3>
                          <p className="mt-1.5 text-sm font-medium text-teal-800/95 dark:text-teal-200/90">{p.tagline}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierBadgeClass(p.tier)}`}
                          >
                            {p.tier}
                          </span>
                          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 dark:bg-gray-700/90 dark:text-gray-100 dark:ring-gray-500">
                            {p.duration_days} j
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 inline-flex rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-gray-900/80 dark:text-gray-100 dark:ring-gray-600">
                        {p.estimated_price_range.low_eur_pp.toLocaleString("fr-FR")} –{" "}
                        {p.estimated_price_range.high_eur_pp.toLocaleString("fr-FR")}{" "}
                        <span className="ml-1 font-normal text-slate-600 dark:text-gray-400">EUR / pers.</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">Statut: {row.status}</p>
                    </div>

                    <div className="space-y-6 px-5 py-5">
                      <section className="grid gap-2">
                        <input
                          className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                          value={p.proposal_name}
                          onChange={(e) => updateProposal(i, (prev) => ({ ...prev, proposal_name: e.target.value }))}
                        />
                        <input
                          className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                          value={p.tagline}
                          onChange={(e) => updateProposal(i, (prev) => ({ ...prev, tagline: e.target.value }))}
                        />
                      </section>
                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                          Présentation
                        </h4>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-gray-300">
                          <textarea
                            className="min-h-[100px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                            value={p.presentation}
                            onChange={(e) => updateProposal(i, (prev) => ({ ...prev, presentation: e.target.value }))}
                          />
                        </div>
                      </section>

                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                          Itinéraire en bref
                        </h4>
                        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-gray-700 dark:border-gray-600">
                          {sortByDay(p.itinerary_at_a_glance).map((row) => (
                            <li key={row.day_number} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2.5 text-sm">
                              <span className="font-semibold text-teal-800 dark:text-teal-300">J{row.day_number}</span>
                              <span className="font-medium text-slate-900 dark:text-gray-100">{row.title}</span>
                              <span className="text-slate-500 dark:text-gray-400">— {row.area}</span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="space-y-4">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                          Programme détaillé
                        </h4>
                        {sortByDay(p.days_program).map((day) => (
                          <div
                            key={day.day_number}
                            className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-gray-600 dark:bg-gray-900/40"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h5 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                                Jour {day.day_number} — {day.title}
                              </h5>
                              {day.suggested_lodging ? (
                                <span className="text-xs font-medium text-violet-800 dark:text-violet-300">
                                  {day.suggested_lodging}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-gray-300">
                              <textarea
                                className="min-h-[90px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                                value={day.narrative}
                                onChange={(e) =>
                                  updateProposal(i, (prev) => ({
                                    ...prev,
                                    days_program: prev.days_program.map((d) =>
                                      d.day_number === day.day_number ? { ...d, narrative: e.target.value } : d,
                                    ),
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </section>

                      {(p.lodging_highlights?.length ?? 0) > 0 ? (
                        <section>
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                            Hébergements
                          </h4>
                          <ul className="mt-2 space-y-3">
                            {p.lodging_highlights!.map((lod, idx) => (
                              <li
                                key={`${lod.name}-${idx}`}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800/60"
                              >
                                <div className="font-semibold text-slate-900 dark:text-gray-100">{lod.name}</div>
                                <div className="text-xs text-slate-500 dark:text-gray-400">{lod.location}</div>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-gray-300">{lod.summary}</p>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                          Pourquoi ça colle
                        </h4>
                        <textarea
                          className="mt-2 min-h-[70px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          value={p.why_this_fits}
                          onChange={(e) => updateProposal(i, (prev) => ({ ...prev, why_this_fits: e.target.value }))}
                        />
                      </section>

                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
                          Thèmes &amp; fil rouge
                        </h4>
                        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700 dark:text-gray-300">
                          {p.day_highlights.map((h, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-500" aria-hidden />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="rounded-lg bg-slate-50/80 px-3 py-2.5 dark:bg-gray-900/50">
                        <p className="text-sm text-slate-700 dark:text-gray-300">
                          <span className="font-semibold text-slate-900 dark:text-gray-100">Différenciant :</span>
                        </p>
                        <textarea
                          className="mt-2 min-h-[70px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          value={p.differentiator}
                          onChange={(e) => updateProposal(i, (prev) => ({ ...prev, differentiator: e.target.value }))}
                        />
                      </section>

                      <p className="text-xs text-slate-500 dark:text-gray-500">
                        Modèle suggéré : <span className="font-medium text-slate-700 dark:text-gray-300">{p.recommended_template}</span>
                        {p.recommended_template_id ? (
                          <span className="ml-1 font-mono text-[10px] text-slate-400">({p.recommended_template_id.slice(0, 8)}…)</span>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-gray-600">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => createQuote(p, row.id)}
                          className="inline-flex flex-1 items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 sm:flex-none"
                        >
                          Créer un devis
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => saveForLater(p, row.id)}
                          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 sm:flex-none"
                        >
                          Enregistrer pour plus tard
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setProposalStatus(row.id, "accepted")}
                          className="inline-flex flex-1 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 sm:flex-none"
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setProposalStatus(row.id, "rejected")}
                          className="inline-flex flex-1 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50 sm:flex-none"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
