"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Booking, ClientFlight } from "@prisma/client";
import {
  createClientFlightAction,
  deleteClientFlightAction,
  updateClientFlightAction,
} from "@/app/admin/clients/client-detail-actions";

function DeleteFlightButton({ flightId, clientId }: { flightId: string; clientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
      onClick={() => {
        const fd = new FormData();
        fd.set("id", flightId);
        fd.set("clientId", clientId);
        startTransition(async () => {
          await deleteClientFlightAction(fd);
          router.refresh();
        });
      }}
    >
      Supprimer
    </button>
  );
}

type BookingPick = Pick<Booking, "id" | "status" | "dossierNumber">;

type Props = {
  clientId: string;
  flights: ClientFlight[];
  bookings: BookingPick[];
  showMissingArrival: boolean;
  showMissingDeparture: boolean;
};

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ClientFlightsSection({
  clientId,
  flights,
  bookings,
  showMissingArrival,
  showMissingDeparture,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const arrivals = flights.filter((f) => f.direction === "arrival");
  const departures = flights.filter((f) => f.direction === "departure");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Infos vols</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Les vols internationaux sont réservés par le client. Nous avons besoin de ces informations pour organiser les transferts aéroport (prise en charge et retours).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showMissingArrival ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Vol d&apos;arrivée manquant</span>
          ) : null}
          {showMissingDeparture ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Vol de départ manquant</span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FlightColumn title="Arrivée" flights={arrivals} />
        <FlightColumn title="Départ" flights={departures} />
      </div>

      <div className="mt-6">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
          >
            Ajouter un vol
          </button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <FlightForm
              clientId={clientId}
              bookings={bookings}
              onCancel={() => setAdding(false)}
              onDone={() => setAdding(false)}
            />
          </div>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {flights.map((f) =>
          editingId === f.id ? (
            <li key={f.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <FlightForm
                clientId={clientId}
                bookings={bookings}
                initial={f}
                onCancel={() => setEditingId(null)}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
              <div className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{f.direction === "arrival" ? "Arrivée" : "Départ"}</span>
                {" · "}
                {f.airline} {f.flightNumber} · {f.date.toLocaleDateString("fr-FR")}
                <div className="mt-1 text-xs text-slate-500">
                  {f.departureCity} → {f.arrivalCity} · départ {f.departureTime || "—"} / arrivée {f.arrivalTime || "—"}
                  {f.terminal ? ` · T${f.terminal}` : ""}
                  {f.bookingRef ? ` · Résa ${f.bookingRef}` : ""}
                </div>
                {f.notes ? <p className="mt-1 text-xs text-slate-600">{f.notes}</p> : null}
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm text-teal-700 hover:underline" onClick={() => setEditingId(f.id)}>
                  Modifier
                </button>
                <DeleteFlightButton flightId={f.id} clientId={clientId} />
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function FlightColumn({ title, flights }: { title: string; flights: ClientFlight[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {flights.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">Aucun vol enregistré.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-xs text-slate-600">
          {flights.map((f) => (
            <li key={f.id} className="rounded border border-slate-200 bg-white p-2">
              <strong className="text-slate-800">
                {f.airline} {f.flightNumber}
              </strong>
              <div>
                {f.date.toLocaleDateString("fr-FR")} · {f.departureCity} → {f.arrivalCity}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FlightForm({
  clientId,
  bookings,
  initial,
  onCancel,
  onDone,
}: {
  clientId: string;
  bookings: BookingPick[];
  initial?: ClientFlight;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const run = initial ? updateClientFlightAction : createClientFlightAction;

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
        Direction
        <select name="direction" required defaultValue={initial?.direction ?? "arrival"} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="arrival">Arrivée</option>
          <option value="departure">Départ</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Compagnie
        <input name="airline" required defaultValue={initial?.airline} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        N° de vol
        <input name="flightNumber" required defaultValue={initial?.flightNumber} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Date
        <input name="date" type="date" required defaultValue={initial ? toDateInput(initial.date) : ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Ville / aéroport départ
        <input name="departureCity" defaultValue={initial?.departureCity} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Ville / aéroport arrivée
        <input name="arrivalCity" defaultValue={initial?.arrivalCity} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Heure départ
        <input name="departureTime" type="time" defaultValue={initial?.departureTime || ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Heure arrivée
        <input name="arrivalTime" type="time" defaultValue={initial?.arrivalTime || ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Terminal
        <input name="terminal" defaultValue={initial?.terminal ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Réf. réservation client
        <input name="bookingRef" defaultValue={initial?.bookingRef ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        Lier au dossier (optionnel)
        <select name="bookingId" defaultValue={initial?.bookingId ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">—</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.dossierNumber} ({b.status})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
        Notes
        <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
