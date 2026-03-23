"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocument } from "@prisma/client";
import {
  createClientDocumentAction,
  deleteClientDocumentAction,
  updateClientDocumentAction,
} from "@/app/admin/clients/client-detail-actions";

export type ClientDocumentTypeOption = { value: string; label: string };

type Props = {
  clientId: string;
  documents: ClientDocument[];
  documentTypeOptions: ClientDocumentTypeOption[];
};

function typeLabel(value: string, options: ClientDocumentTypeOption[]) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function ClientDocumentsSection({ clientId, documents, documentTypeOptions }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Documents client</h2>
      <p className="mt-1 text-sm text-slate-600">
        Fichiers (URL) et notes. Pour les formalités diverses (visa, Check-Mig, etc.), utilisez « Autres formalités » — fichier optionnel.
      </p>

      {!adding && !editingId ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
        >
          Ajouter un document / une note
        </button>
      ) : null}

      {adding ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <DocumentForm
            clientId={clientId}
            documentTypeOptions={documentTypeOptions}
            onCancel={() => setAdding(false)}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : null}

      <ul className="mt-6 space-y-3">
        {documents.map((d) =>
          editingId === d.id ? (
            <li key={d.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <DocumentForm
                clientId={clientId}
                documentTypeOptions={documentTypeOptions}
                initial={d}
                onCancel={() => setEditingId(null)}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3">
              <div className="text-sm">
                <div className="font-semibold text-slate-900">{typeLabel(d.type, documentTypeOptions)}</div>
                {d.title ? <div className="text-slate-700">{d.title}</div> : null}
                {d.fileUrl ? (
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
                    Fichier / lien
                  </a>
                ) : null}
                {d.expiryDate ? (
                  <div className="mt-1 text-xs text-slate-500">Expiration : {d.expiryDate.toLocaleDateString("fr-FR")}</div>
                ) : null}
                {d.notes ? <p className="mt-1 text-xs text-slate-600">{d.notes}</p> : null}
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm text-teal-700 hover:underline" onClick={() => setEditingId(d.id)}>
                  Modifier
                </button>
                <DeleteDocumentButton clientId={clientId} id={d.id} />
              </div>
            </li>
          ),
        )}
      </ul>

      {documents.length === 0 && !adding ? <p className="mt-4 text-sm text-slate-500">Aucun document enregistré.</p> : null}
    </section>
  );
}

function DeleteDocumentButton({ clientId, id }: { clientId: string; id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
      onClick={() => {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("clientId", clientId);
        startTransition(async () => {
          await deleteClientDocumentAction(fd);
          router.refresh();
        });
      }}
    >
      Supprimer
    </button>
  );
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function DocumentForm({
  clientId,
  documentTypeOptions,
  initial,
  onCancel,
  onDone,
}: {
  clientId: string;
  documentTypeOptions: ClientDocumentTypeOption[];
  initial?: ClientDocument;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const run = initial ? updateClientDocumentAction : createClientDocumentAction;

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setFormError(null);
        startTransition(async () => {
          const res = await run(fd);
          if (res.ok) {
            router.refresh();
            onDone();
          } else {
            setFormError(res.error);
          }
        });
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        Type
        <select name="type" required defaultValue={initial?.type} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          {documentTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        Titre (optionnel — suffit seul avec le type)
        <input name="title" defaultValue={initial?.title ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        URL du fichier (optionnel)
        <input name="fileUrl" placeholder="https://… (optionnel)" defaultValue={initial?.fileUrl ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        Notes
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        Date d&apos;expiration (optionnel)
        <input
          name="expiryDate"
          type="date"
          defaultValue={initial?.expiryDate ? toDateInput(initial.expiryDate) : ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      {formError ? (
        <p className="text-sm text-red-600 sm:col-span-2" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "…" : initial ? "Enregistrer" : "Ajouter"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}
