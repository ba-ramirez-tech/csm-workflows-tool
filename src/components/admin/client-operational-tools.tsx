"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { regenerateOperationalLinkAction, type ActionState } from "@/app/admin/clients/operational-actions";

type Props = {
  clientId: string;
  clientName: string;
  appBaseUrl: string;
  activePublicToken: string;
};

function CopyLinkButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
    >
      {done ? "Copié" : "Copier le lien"}
    </button>
  );
}

export function ClientOperationalTools({ clientId, clientName, appBaseUrl, activePublicToken }: Props) {
  const [token, setToken] = useState(activePublicToken);
  const [regenState, regenAction, regenPending] = useActionState(
    regenerateOperationalLinkAction,
    null as ActionState | null,
  );

  useEffect(() => {
    setToken(activePublicToken);
  }, [activePublicToken]);

  useEffect(() => {
    if (regenState?.ok && regenState.token) setToken(regenState.token);
  }, [regenState]);

  const shareUrl = useMemo(() => `${appBaseUrl}/operational/${token}`, [appBaseUrl, token]);

  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `Bonjour ${clientName}, pour finaliser les détails pratiques de votre voyage : ${shareUrl}`,
  )}`;

  const embedCode = `<iframe src="${shareUrl}" title="Préparer votre voyage" width="100%" height="640" style="border:0;border-radius:12px;max-width:42rem" loading="lazy"></iframe>`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Formulaire opérationnel (client)</h3>
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
      </div>
      <form action={regenAction} className="mt-3">
        <input type="hidden" name="clientId" value={clientId} />
        <button
          type="submit"
          disabled={regenPending}
          className="text-xs font-medium text-amber-800 underline hover:no-underline dark:text-amber-200"
        >
          {regenPending ? "…" : "Régénérer le lien (l’ancien ne fonctionnera plus)"}
        </button>
      </form>
      {regenState && !regenState.ok ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{regenState.error}</p>
      ) : null}
      <div className="mt-4">
        <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Code iframe</label>
        <textarea
          readOnly
          rows={3}
          value={embedCode}
          className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-800 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-200"
        />
      </div>
    </div>
  );
}
