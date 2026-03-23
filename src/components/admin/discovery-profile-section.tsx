import { Check, X } from "lucide-react";
import type { ClientPreference } from "@prisma/client";
import { DiscoveryNoteInline } from "@/components/admin/discovery-note-inline";
import { DiscoveryPrintExpand } from "@/components/admin/discovery-print-expand";
import {
  DISCOVERY_INTAKE_FIELDS,
  DISCOVERY_SECTION_LABELS,
  type DiscoverySectionId,
  buildDiscoverySummary,
  parseIntakeFull,
  type IntakeParsed,
} from "@/lib/admin/discovery-intake-fields";

const SECTION_ORDER: DiscoverySectionId[] = ["trip", "interests", "accommodation", "practical", "language"];

type NoteRow = Pick<ClientPreference, "questionKey" | "agentNote" | "agentNoteBy" | "agentNoteAt">;

function noteMap(rows: NoteRow[]): Map<string, NoteRow> {
  const m = new Map<string, NoteRow>();
  for (const r of rows) {
    if (r.questionKey) m.set(r.questionKey, r);
  }
  return m;
}

function answerSnapshotForField(def: (typeof DISCOVERY_INTAKE_FIELDS)[0], data: IntakeParsed): string {
  const lines = def.lines(data, "fr");
  return lines.join(" | ").slice(0, 2000);
}

/** Answer cell only — parent renders rows when `answered` is true. */
function AnswerValue({ def, data }: { def: (typeof DISCOVERY_INTAKE_FIELDS)[0]; data: IntakeParsed }) {
  const lines = def.lines(data, "fr");

  if (def.kind === "boolean") {
    const yes = lines[0] === "Oui" || lines[0] === "Accepté";
    return (
      <div className="flex items-center justify-end gap-2 text-sm text-gray-900 md:justify-start dark:text-gray-100">
        {yes ? (
          <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : (
          <X className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" aria-hidden />
        )}
        <span>{lines[0]}</span>
      </div>
    );
  }

  if (def.kind === "text") {
    return (
      <div className="text-sm italic text-gray-800 dark:text-gray-200">
        {lines.map((line, i) => (
          <span key={i} className="block whitespace-pre-wrap">
            {line}
          </span>
        ))}
      </div>
    );
  }

  if (def.kind === "single") {
    return (
      <div className="flex flex-wrap justify-end md:justify-start">
        <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-900 dark:bg-teal-900/40 dark:text-teal-100">
          {lines[0]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5 md:justify-start">
      {lines.map((line) => (
        <span
          key={line}
          className="inline-flex rounded-full border border-teal-200 bg-white px-2.5 py-0.5 text-xs font-medium text-teal-900 dark:border-teal-700 dark:bg-gray-800 dark:text-teal-100"
        >
          {line}
        </span>
      ))}
    </div>
  );
}

export function DiscoveryProfileSection({
  clientId,
  fullResponse,
  preferenceRows,
}: {
  clientId: string;
  fullResponse: unknown;
  preferenceRows: NoteRow[];
}) {
  const parsed = parseIntakeFull(fullResponse);
  const notes = noteMap(preferenceRows);

  if (!parsed) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-gray-300 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Profil découverte</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          Aucune réponse de questionnaire structurée enregistrée pour ce client.
        </p>
      </section>
    );
  }

  const summaryLines = buildDiscoverySummary(parsed);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none print:border-gray-400 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3 print:break-inside-avoid">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Profil découverte</h2>
        <p className="max-w-xl text-xs text-slate-500 dark:text-gray-500">
          Vue tableau — les notes agent s&apos;impriment ; boutons d&apos;édition masqués à l&apos;impression.
        </p>
      </div>

      <DiscoveryPrintExpand>
        <div className="mt-4 rounded-lg border border-teal-200/80 bg-teal-50/60 p-4 print:break-inside-avoid dark:border-teal-800/50 dark:bg-teal-950/30">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-200">
            Synthèse (aperçu rapide)
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-900 dark:text-gray-100">
            {summaryLines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-teal-700 dark:text-teal-400" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {SECTION_ORDER.map((sectionId) => {
            const fields = DISCOVERY_INTAKE_FIELDS.filter((f) => f.section === sectionId);
            const answeredFields = fields.filter((f) => f.answered(parsed));
            if (answeredFields.length === 0) return null;

            return (
              <div
                key={sectionId}
                className="rounded-xl border border-slate-200 bg-slate-50/40 print:break-inside-avoid dark:border-gray-700 dark:bg-gray-800/30"
              >
                <div className="border-b border-slate-200 bg-white/90 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/80">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                    {DISCOVERY_SECTION_LABELS[sectionId]}
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 px-4 dark:divide-gray-700">
                  {answeredFields.map((def) => {
                    const snap = answerSnapshotForField(def, parsed);
                    const pref = notes.get(def.key);
                    return (
                      <div
                        key={def.key}
                        className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-4"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          {def.label}
                        </p>
                        <div className="min-w-0 space-y-2">
                          <AnswerValue def={def} data={parsed} />
                          <DiscoveryNoteInline
                            clientId={clientId}
                            questionKey={def.key}
                            answerSnapshot={snap}
                            initialNote={pref?.agentNote ?? null}
                            initialBy={pref?.agentNoteBy ?? null}
                            initialAt={pref?.agentNoteAt ?? null}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DiscoveryPrintExpand>
    </section>
  );
}
