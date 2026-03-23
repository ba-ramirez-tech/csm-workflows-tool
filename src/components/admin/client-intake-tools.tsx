"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  regenerateIntakeLinkAction,
  sendIntakeInviteAction,
  type ActionState,
} from "@/app/admin/clients/intake-actions";

type Props = {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  appBaseUrl: string;
  activePublicToken: string;
};

export function ClientIntakeTools({
  clientId,
  clientName,
  clientEmail,
  appBaseUrl,
  activePublicToken,
}: Props) {
  const [token, setToken] = useState(activePublicToken);
  const [regenState, regenAction, regenPending] = useActionState(regenerateIntakeLinkAction, null as ActionState | null);
  const [sendState, sendAction, sendPending] = useActionState(sendIntakeInviteAction, null as ActionState | null);

  useEffect(() => {
    setToken(activePublicToken);
  }, [activePublicToken]);

  useEffect(() => {
    if (regenState?.ok && regenState.token) setToken(regenState.token);
  }, [regenState]);

  const shareUrl = useMemo(() => `${appBaseUrl}/intake/${token}`, [appBaseUrl, token]);

  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `Bonjour ! Voici votre questionnaire Colombie sur mesure : ${shareUrl}`,
  )}`;

  const embedCode = `<iframe src="${shareUrl}" title="Questionnaire Colombie sur mesure" width="100%" height="720" style="border:0;border-radius:12px;max-width:42rem" loading="lazy"></iframe>`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Lien actif (unique)</h2>
        <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-gray-300">{shareUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyLinkButton text={shareUrl} />
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            WhatsApp
          </a>
          <form action={sendAction} className="inline">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="publicToken" value={token} />
            <button
              type="submit"
              disabled={sendPending || !clientEmail}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {sendPending ? "Envoi…" : "Envoyer par email"}
            </button>
          </form>
        </div>
        {!clientEmail ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">Ajoutez un email au client pour l&apos;invitation.</p>
        ) : null}
        {sendState && !sendState.ok ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{sendState.error}</p>
        ) : null}
        {sendState?.ok && sendState.message ? (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{sendState.message}</p>
        ) : null}

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-gray-700">
          <p className="text-xs font-medium text-slate-600 dark:text-gray-400">Code embed (iframe)</p>
          <textarea
            readOnly
            rows={3}
            className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 p-2 font-mono text-[11px] text-slate-800 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-200"
            value={embedCode}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      </div>

      <form action={regenAction} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/80">
        <input type="hidden" name="clientId" value={clientId} />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Régénérer le lien</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
          Invalide l’ancien lien non soumis et en crée un nouveau (30 jours). Les réponses déjà envoyées restent
          enregistrées.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
            Nom (préremplissage)
            <input
              name="prefillName"
              defaultValue={clientName}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <label className="block text-xs font-medium text-slate-700 dark:text-gray-300">
            Email (préremplissage)
            <input
              name="prefillEmail"
              type="email"
              defaultValue={clientEmail ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={regenPending}
          className="mt-4 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
        >
          {regenPending ? "Régénération…" : "Régénérer le lien"}
        </button>
        {regenState && !regenState.ok ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{regenState.error}</p>
        ) : null}
        {regenState?.ok && regenState.message ? (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{regenState.message}</p>
        ) : null}
      </form>
    </div>
  );
}

function CopyLinkButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* ignore */
        }
      }}
    >
      Copier le lien
    </button>
  );
}
