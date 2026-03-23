"use client";

import type { LeadStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  Circle,
  Download,
  FileText,
  Globe,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualTouchpointAction } from "@/app/admin/clients/touchpoint-actions";

export type TouchpointUiRow = {
  id: string;
  bookingId: string | null;
  channel: string;
  category: string;
  direction: string;
  subject: string | null;
  summary: string | null;
  outcome: string | null;
  attachmentUrl: string | null;
  externalRef: string | null;
  contentType: string | null;
  contentName: string | null;
  agentId: string | null;
  agentName: string | null;
  duration: number | null;
  touchpointAt: string;
  createdAt: string;
};

const AUTOMATED_CONTENT = new Set([
  "intake_form_sent",
  "intake_form_started",
  "intake_form_completed",
  "roadbook_viewed",
  "newsletter_click",
  "guide_download",
  "brochure_view",
  "website_visit",
]);

const CATEGORY_LABEL: Record<string, string> = {
  discovery: "Discovery",
  follow_up: "Suivi",
  quotation: "Devis",
  booking_confirmation: "Réservation",
  operational: "Opérationnel",
  support: "Support",
  feedback: "Retour",
  marketing: "Marketing",
};

const CHANNEL_OPTIONS = [
  { value: "", label: "Tous les canaux" },
  { value: "call", label: "Appel" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email_sent", label: "Email envoyé" },
  { value: "email_received", label: "Email reçu" },
  { value: "sms", label: "SMS" },
  { value: "meeting", label: "Réunion" },
  { value: "video_call", label: "Visio" },
  { value: "social_media", label: "Réseaux" },
  { value: "website_visit", label: "Web / formulaire" },
  { value: "internal", label: "Interne / note" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Toutes catégories" },
  { value: "discovery", label: "Discovery" },
  { value: "follow_up", label: "Suivi" },
  { value: "quotation", label: "Devis" },
  { value: "booking_confirmation", label: "Réservation" },
  { value: "operational", label: "Opérationnel" },
  { value: "support", label: "Support" },
  { value: "feedback", label: "Retour" },
  { value: "marketing", label: "Marketing" },
];

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "interested", label: "Intéressé" },
  { value: "needs_time", label: "Besoin de temps" },
  { value: "requested_changes", label: "Modifications demandées" },
  { value: "confirmed", label: "Confirmé" },
  { value: "no_response", label: "Sans réponse" },
  { value: "declined", label: "Refus" },
];

function defaultCategoryFromLead(lead: LeadStatus): string {
  switch (lead) {
    case "NEW":
    case "CONTACTED":
      return "discovery";
    case "DISCOVERY_DONE":
      return "follow_up";
    case "QUOTED":
    case "NEGOTIATING":
      return "quotation";
    case "WON":
      return "booking_confirmation";
    case "LOST":
      return "follow_up";
    default:
      return "follow_up";
  }
}

function isMarketingNoise(tp: TouchpointUiRow): boolean {
  if (tp.category === "marketing") return true;
  if (tp.contentType && AUTOMATED_CONTENT.has(tp.contentType)) return true;
  return false;
}

function ChannelIcon({ channel, contentType }: { channel: string; contentType: string | null }) {
  const ct = contentType ?? "";
  if (ct === "guide_download" || ct === "brochure_view") return <Download className="h-4 w-4" />;
  if (ct.startsWith("intake_form") || ct === "newsletter_click") return <FileText className="h-4 w-4" />;
  if (channel === "website_visit" || ct === "website_visit") return <Globe className="h-4 w-4" />;
  if (channel === "call") return <Phone className="h-4 w-4" />;
  if (channel === "whatsapp") return <MessageCircle className="h-4 w-4" />;
  if (channel === "email_sent" || channel === "email_received") return <Mail className="h-4 w-4" />;
  if (channel === "video_call") return <Video className="h-4 w-4" />;
  if (channel === "meeting") return <FileText className="h-4 w-4" />;
  if (channel === "internal") return <FileText className="h-4 w-4" />;
  return <Globe className="h-4 w-4" />;
}

function DirectionMark({ direction }: { direction: string }) {
  if (direction === "inbound")
    return (
      <span className="text-emerald-600 dark:text-emerald-400" title="Entrant">
        <ArrowLeft className="h-4 w-4" />
      </span>
    );
  if (direction === "internal")
    return (
      <span className="text-slate-400 dark:text-gray-500" title="Interne">
        <Circle className="h-3 w-3 fill-current" />
      </span>
    );
  return (
    <span className="text-blue-600 dark:text-blue-400" title="Sortant">
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, string> = {
    interested: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    needs_time: "bg-amber-100 text-amber-950 dark:bg-amber-900/30 dark:text-amber-100",
    no_response: "bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-400",
    declined: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
    confirmed: "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100",
    requested_changes: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  };
  const labels: Record<string, string> = Object.fromEntries(OUTCOME_OPTIONS.map((o) => [o.value, o.label]));
  const c = styles[outcome] ?? "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>
      {labels[outcome] ?? outcome}
    </span>
  );
}

const QUICK_CHANNELS: {
  key: string;
  channel: string;
  direction: string;
  label: string;
  placeholder: string;
}[] = [
  { key: "call", channel: "call", direction: "outbound", label: "Appel", placeholder: "Appel à propos de…" },
  {
    key: "whatsapp",
    channel: "whatsapp",
    direction: "outbound",
    label: "WhatsApp",
    placeholder: "WhatsApp — …",
  },
  {
    key: "email",
    channel: "email_sent",
    direction: "outbound",
    label: "Email",
    placeholder: "Email re : …",
  },
  {
    key: "meeting",
    channel: "meeting",
    direction: "outbound",
    label: "Réunion",
    placeholder: "Réunion — …",
  },
  {
    key: "video",
    channel: "video_call",
    direction: "outbound",
    label: "Visio",
    placeholder: "Visio — …",
  },
  {
    key: "note",
    channel: "internal",
    direction: "internal",
    label: "Note",
    placeholder: "Note interne — …",
  },
];

type BookingOpt = { id: string; dossierNumber: string };

export function ClientActivityTimeline({
  clientId,
  leadStatus,
  touchpoints,
  bookings,
}: {
  clientId: string;
  leadStatus: LeadStatus;
  touchpoints: TouchpointUiRow[];
  bookings: BookingOpt[];
}) {
  const router = useRouter();
  const [showMarketing, setShowMarketing] = useState(false);
  const [channelFilter, setChannelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [quickKey, setQuickKey] = useState<string | null>(null);

  const suggestedCategory = useMemo(() => defaultCategoryFromLead(leadStatus), [leadStatus]);

  const agents = useMemo(() => {
    const s = new Set<string>();
    for (const t of touchpoints) {
      if (t.agentName) s.add(t.agentName);
    }
    return Array.from(s).sort();
  }, [touchpoints]);

  const filtered = useMemo(() => {
    return touchpoints.filter((t) => {
      if (!showMarketing && isMarketingNoise(t)) return false;
      if (channelFilter && t.channel !== channelFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (agentFilter && t.agentName !== agentFilter) return false;
      const at = new Date(t.touchpointAt).getTime();
      if (dateFrom) {
        const start = new Date(dateFrom).setHours(0, 0, 0, 0);
        if (at < start) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo).setHours(23, 59, 59, 999);
        if (at > end) return false;
      }
      return true;
    });
  }, [touchpoints, showMarketing, channelFilter, categoryFilter, agentFilter, dateFrom, dateTo]);

  const [tpPending, startTpTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (!saveToast) return;
    const t = window.setTimeout(() => setSaveToast(false), 2000);
    return () => window.clearTimeout(t);
  }, [saveToast]);

  const quick = quickKey ? QUICK_CHANNELS.find((q) => q.key === quickKey) : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Activité &amp; contacts</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
        Historique des échanges — le plus récent en haut.
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/50">
        {saveToast ? (
          <div
            className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
            role="status"
          >
            Enregistré ✓
          </div>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
          Enregistrer un contact
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_CHANNELS.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => setQuickKey((k) => (k === q.key ? null : q.key))}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                quickKey === q.key
                  ? "border-teal-700 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {quick ? (
          <form
            key={quick.key}
            className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-gray-600"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              setFormError(null);
              startTpTransition(async () => {
                const res = await createManualTouchpointAction(fd);
                if (res.ok) {
                  form.reset();
                  setQuickKey(null);
                  setSaveToast(true);
                  router.refresh();
                } else {
                  setFormError(res.error);
                }
              });
            }}
          >
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="channel" value={quick.channel} />
            <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
              Sujet <span className="text-red-600">*</span>
              <input
                name="subject"
                required
                placeholder={quick.placeholder}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
              Résumé (optionnel)
              <textarea
                name="summary"
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <fieldset className="text-sm">
                <legend className="font-medium text-slate-800 dark:text-gray-200">Direction</legend>
                <div className="mt-1 flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="direction"
                      value="outbound"
                      defaultChecked={quick.direction === "outbound"}
                    />
                    Sortant
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="direction" value="inbound" defaultChecked={quick.direction === "inbound"} />
                    Entrant
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="direction"
                      value="internal"
                      defaultChecked={quick.direction === "internal"}
                    />
                    Interne
                  </label>
                </div>
              </fieldset>
              <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                Catégorie
                <select
                  name="category"
                  defaultValue={suggestedCategory}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  {CATEGORY_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                Résultat (optionnel)
                <select
                  name="outcome"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  {OUTCOME_OPTIONS.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {(quick.channel === "call" || quick.channel === "meeting" || quick.channel === "video_call") && (
                <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                  Durée (minutes)
                  <input
                    type="number"
                    name="duration"
                    min={0}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </label>
              )}
            </div>
            {bookings.length > 0 ? (
              <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
                Dossier (optionnel)
                <select
                  name="bookingId"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">—</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.dossierNumber}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
              Lien pièce jointe (URL, optionnel)
              <input
                name="attachmentUrl"
                type="url"
                placeholder="https://…"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800 dark:text-gray-200">
              Réf. externe (optionnel)
              <input
                name="externalRef"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            {formError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={tpPending}
              className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-teal-600"
            >
              {tpPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/30 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
          Canal
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="mt-0.5 block w-full min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {CHANNEL_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
          Catégorie
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-0.5 block w-full min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value || "allc"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
          Agent
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="mt-0.5 block w-full min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Tous</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
          Depuis
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-0.5 block rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-gray-400">
          Jusqu’au
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-0.5 block rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
          <input type="checkbox" checked={showMarketing} onChange={(e) => setShowMarketing(e.target.checked)} />
          Afficher le marketing / auto
        </label>
      </div>

      <div className="relative mt-6">
        <div className="absolute start-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-gray-700" aria-hidden />
        <ul className="space-y-0">
          {filtered.length === 0 ? (
            <li className="ps-10 text-sm text-slate-500 dark:text-gray-400">Aucune activité pour ces filtres.</li>
          ) : (
            filtered.map((t) => {
              const at = new Date(t.touchpointAt);
              const rel = formatDistanceToNow(at, { addSuffix: true, locale: fr });
              const isOpen = expanded.has(t.id);
              const showDuration =
                t.duration != null && (t.channel === "call" || t.channel === "meeting" || t.channel === "video_call");
              return (
                <li key={t.id} className="relative ps-10 pb-8 last:pb-0">
                  <div className="absolute start-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    <ChannelIcon channel={t.channel} contentType={t.contentType} />
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <DirectionMark direction={t.direction} />
                        {t.subject ? (
                          <span className="font-semibold text-slate-900 dark:text-gray-100">{t.subject}</span>
                        ) : (
                          <span className="text-slate-500 dark:text-gray-400">(sans sujet)</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400">
                        {CATEGORY_LABEL[t.category] ?? t.category}
                      </span>
                    </div>
                    {t.summary ? (
                      <div className="mt-2">
                        <p
                          className={`text-sm text-slate-600 dark:text-gray-300 ${isOpen ? "" : "line-clamp-2"}`}
                        >
                          {t.summary}
                        </p>
                        {t.summary.length > 120 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(t.id)) next.delete(t.id);
                                else next.add(t.id);
                                return next;
                              })
                            }
                            className="mt-1 text-xs font-medium text-teal-800 dark:text-teal-400"
                          >
                            {isOpen ? "Réduire" : "Voir plus"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {t.outcome ? <OutcomeBadge outcome={t.outcome} /> : null}
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        {t.agentName ?? "Système"} — {rel}
                      </span>
                      {showDuration ? (
                        <span className="text-xs text-slate-500 dark:text-gray-400">Durée : {t.duration} min</span>
                      ) : null}
                      {t.attachmentUrl ? (
                        <a
                          href={t.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 dark:text-teal-400"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          Pièce jointe
                        </a>
                      ) : null}
                    </div>
                    {t.contentName ? (
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-gray-500">{t.contentName}</p>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
