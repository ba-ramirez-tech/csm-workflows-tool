"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClientAction } from "./actions";

export function CreateClientForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const r = await createClientAction(fd);
        setPending(false);
        if (r.ok) {
          router.push(`/admin/clients/${r.clientId}`);
          return;
        }
        setError(r.error);
      }}
    >
      <div className="min-w-[180px] flex-1">
        <label htmlFor="new-client-name" className="block text-xs font-medium text-slate-600">
          Nom
        </label>
        <input
          id="new-client-name"
          name="name"
          required
          autoComplete="name"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="ex. Marie Dupont"
        />
      </div>
      <div className="min-w-[200px] flex-1">
        <label htmlFor="new-client-email" className="block text-xs font-medium text-slate-600">
          Email (optionnel)
        </label>
        <input
          id="new-client-email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="marie@exemple.com"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {pending ? "Création…" : "Créer un client"}
      </button>
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
