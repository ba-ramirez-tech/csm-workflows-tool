"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { submitOperationalFormAction } from "@/app/operational/actions";
import { emptyTraveler, type PassportTraveler } from "@/lib/operational/types";
import type { OperationalPublicClient } from "@/lib/operational/page-state";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white";

function parseTravelers(json: unknown): PassportTraveler[] {
  if (!json || !Array.isArray(json)) return [emptyTraveler()];
  const rows = json
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        firstName: String(o.firstName ?? ""),
        lastName: String(o.lastName ?? ""),
        passportNumber: String(o.passportNumber ?? ""),
        nationality: String(o.nationality ?? ""),
        expiryDate: String(o.expiryDate ?? ""),
      };
    });
  return rows.length > 0 ? rows : [emptyTraveler()];
}

function OpProgressBar({ step }: { step: number }) {
  const total = 3;
  const pct = Math.round(((step - 1) / total) * 100);
  return (
    <div className="fixed start-0 end-0 top-0 z-[100] border-b border-gray-200/80 bg-white/95 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
            {step}/{total}
          </span>
          <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">{pct}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-800 via-teal-600 to-amber-500 dark:from-teal-600 dark:via-teal-500 dark:to-amber-400"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${
                i + 1 < step
                  ? "bg-teal-800 dark:bg-teal-500"
                  : i + 1 === step
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = {
  token: string;
  client: OperationalPublicClient;
};

const STEP_LABELS = ["Voyageurs & chambres", "Santé & pratique", "Souhaits & trajet"];

export function OperationalForm({ token, client }: Props) {
  const d = client.operationalDetails;
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [numAdults, setNumAdults] = useState<string>(d?.numAdults != null ? String(d.numAdults) : "");
  const [numChildren, setNumChildren] = useState<string>(d?.numChildren != null ? String(d.numChildren) : "");
  const [childrenAges, setChildrenAges] = useState(d?.childrenAges ?? "");
  const [roomComposition, setRoomComposition] = useState(d?.roomComposition ?? "");
  const [numRooms, setNumRooms] = useState<string>(d?.numRooms != null ? String(d.numRooms) : "");
  const [travelers, setTravelers] = useState<PassportTraveler[]>(() => parseTravelers(d?.passportNames ?? null));

  const [medicalNotes, setMedicalNotes] = useState(d?.medicalNotes ?? "");
  const [mobilityNotes, setMobilityNotes] = useState(d?.mobilityNotes ?? "");
  const [travelInsurance, setTravelInsurance] = useState(d?.travelInsurance ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(d?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(d?.emergencyContactPhone ?? "");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(d?.emergencyContactRelation ?? "");

  const [specialRequests, setSpecialRequests] = useState(d?.specialRequests ?? "");
  const [arrivalInfo, setArrivalInfo] = useState(d?.arrivalInfo ?? "");
  const [departureInfo, setDepartureInfo] = useState(d?.departureInfo ?? "");

  const payload = () => ({
    numAdults: numAdults === "" ? null : Number(numAdults),
    numChildren: numChildren === "" ? null : Number(numChildren),
    childrenAges,
    roomComposition,
    numRooms: numRooms === "" ? null : Number(numRooms),
    passportNames: travelers,
    medicalNotes,
    mobilityNotes,
    arrivalInfo,
    departureInfo,
    specialRequests,
    travelInsurance,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
  });

  const submit = () => {
    setErr(null);
    startTransition(async () => {
      const r = await submitOperationalFormAction(token, payload());
      if (r.ok) setDone(true);
      else setErr(r.error);
    });
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">Merci !</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Les informations ont bien été transmises à {client.name}. Votre conseiller peut vous recontacter si un détail
          manque.
        </p>
      </div>
    );
  }

  return (
    <>
      <OpProgressBar step={step} />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-24">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Préparer votre voyage
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">
            {client.name}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Quelques informations pratiques pour finaliser votre dossier.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{STEP_LABELS[step - 1]}</p>
        </header>

        {err ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                Nombre d&apos;adultes
                <input type="number" min={0} className={`mt-1 ${inputClass}`} value={numAdults} onChange={(e) => setNumAdults(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                Nombre d&apos;enfants
                <input type="number" min={0} className={`mt-1 ${inputClass}`} value={numChildren} onChange={(e) => setNumChildren(e.target.value)} />
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Âges des enfants
              <input className={`mt-1 ${inputClass}`} value={childrenAges} onChange={(e) => setChildrenAges(e.target.value)} placeholder="ex. 4, 7, 12" />
            </label>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Composition des chambres
              <textarea
                rows={3}
                className={`mt-1 ${inputClass}`}
                value={roomComposition}
                onChange={(e) => setRoomComposition(e.target.value)}
                placeholder="Qui partage quelle chambre ?"
              />
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                Décrivez qui partage les chambres : couples, enfants avec parents, amis en twin, etc.
              </span>
            </label>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Nombre de chambres
              <input type="number" min={0} className={`mt-1 ${inputClass}`} value={numRooms} onChange={(e) => setNumRooms(e.target.value)} />
            </label>

            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Identité / passeport (par voyageur)</p>
              <ul className="mt-3 space-y-4">
                {travelers.map((t, i) => (
                  <li key={i} className="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Voyageur {i + 1}</span>
                      {travelers.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setTravelers(travelers.filter((_, j) => j !== i))}
                          className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Retirer
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputClass} placeholder="Prénom" value={t.firstName} onChange={(e) => {
                        const n = [...travelers]; n[i] = { ...t, firstName: e.target.value }; setTravelers(n);
                      }} />
                      <input className={inputClass} placeholder="Nom" value={t.lastName} onChange={(e) => {
                        const n = [...travelers]; n[i] = { ...t, lastName: e.target.value }; setTravelers(n);
                      }} />
                      <input className={inputClass} placeholder="N° passeport" value={t.passportNumber} onChange={(e) => {
                        const n = [...travelers]; n[i] = { ...t, passportNumber: e.target.value }; setTravelers(n);
                      }} />
                      <input className={inputClass} placeholder="Nationalité" value={t.nationality} onChange={(e) => {
                        const n = [...travelers]; n[i] = { ...t, nationality: e.target.value }; setTravelers(n);
                      }} />
                      <input className={inputClass} placeholder="Expiration (AAAA-MM-JJ)" value={t.expiryDate} onChange={(e) => {
                        const n = [...travelers]; n[i] = { ...t, expiryDate: e.target.value }; setTravelers(n);
                      }} />
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setTravelers([...travelers, emptyTraveler()])}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-800 dark:text-teal-300"
              >
                <Plus className="h-4 w-4" /> Ajouter un voyageur
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Santé, allergies, médicaments
              <textarea rows={3} className={`mt-1 ${inputClass}`} value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Mobilité
              <textarea rows={2} className={`mt-1 ${inputClass}`} value={mobilityNotes} onChange={(e) => setMobilityNotes(e.target.value)} placeholder="Fauteuil, distance de marche, etc." />
            </label>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Assurance voyage
              <input className={`mt-1 ${inputClass}`} value={travelInsurance} onChange={(e) => setTravelInsurance(e.target.value)} placeholder="N° police ou « je souscris »" />
            </label>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contact d&apos;urgence</p>
            <div className="grid gap-3 sm:grid-cols-1">
              <input className={inputClass} placeholder="Nom" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
              <input className={inputClass} placeholder="Téléphone" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
              <input className={inputClass} placeholder="Lien (conjoint, parent…)" value={emergencyContactRelation} onChange={(e) => setEmergencyContactRelation(e.target.value)} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Demandes particulières / célébrations
              <textarea rows={4} className={`mt-1 ${inputClass}`} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Arrivée au pays
              <textarea rows={2} className={`mt-1 ${inputClass}`} value={arrivalInfo} onChange={(e) => setArrivalInfo(e.target.value)} placeholder="Vol, date, aéroport…" />
            </label>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Départ
              <textarea rows={2} className={`mt-1 ${inputClass}`} value={departureInfo} onChange={(e) => setDepartureInfo(e.target.value)} />
            </label>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={step <= 1 || pending}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 disabled:opacity-40 dark:border-gray-600 dark:text-gray-100"
          >
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          {step < 3 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setStep((s) => Math.min(3, s + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1 rounded-full bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white dark:bg-teal-600"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex items-center gap-1 rounded-full bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-600"
            >
              {pending ? "Envoi…" : "Envoyer"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
