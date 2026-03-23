"use client";

import type { ClientOperationalDetails } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { HeartPulse, MapPin, Phone, Plus, Sparkles, Trash2, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { saveClientOperationalDetailsAction } from "@/app/admin/clients/operational-actions";
import { operationalCompletion } from "@/lib/admin/operational-completion";
import {
  emptyTraveler,
  type OperationalPayload,
  type PassportTraveler,
} from "@/lib/operational/types";

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

type Props = {
  clientId: string;
  initial: ClientOperationalDetails | null;
};

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

const labelPrimary =
  "text-sm font-medium text-slate-900 dark:text-gray-100";

const labelHint = "mt-1 block text-xs leading-relaxed text-slate-500 dark:text-gray-500";

function OpBlock({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm dark:border-gray-600 dark:from-gray-800/50 dark:to-gray-900/80">
      <div className="mb-4 flex gap-3 border-b border-slate-200/80 pb-3 dark:border-gray-600">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/45 dark:text-teal-200"
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-gray-100">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function ClientOperationalSection({ clientId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [numAdults, setNumAdults] = useState<string>(initial?.numAdults != null ? String(initial.numAdults) : "");
  const [numChildren, setNumChildren] = useState<string>(
    initial?.numChildren != null ? String(initial.numChildren) : "",
  );
  const [childrenAges, setChildrenAges] = useState(initial?.childrenAges ?? "");
  const [roomComposition, setRoomComposition] = useState(initial?.roomComposition ?? "");
  const [numRooms, setNumRooms] = useState<string>(initial?.numRooms != null ? String(initial.numRooms) : "");
  const [travelers, setTravelers] = useState<PassportTraveler[]>(() =>
    parseTravelers(initial?.passportNames ?? null),
  );
  const [medicalNotes, setMedicalNotes] = useState(initial?.medicalNotes ?? "");
  const [mobilityNotes, setMobilityNotes] = useState(initial?.mobilityNotes ?? "");
  const [arrivalInfo, setArrivalInfo] = useState(initial?.arrivalInfo ?? "");
  const [departureInfo, setDepartureInfo] = useState(initial?.departureInfo ?? "");
  const [specialRequests, setSpecialRequests] = useState(initial?.specialRequests ?? "");
  const [travelInsurance, setTravelInsurance] = useState(initial?.travelInsurance ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(initial?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initial?.emergencyContactPhone ?? "");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    initial?.emergencyContactRelation ?? "",
  );

  const operationalSyncKey = initial ? `${initial.id}-${initial.updatedAt.getTime()}` : "";

  useEffect(() => {
    if (!initial) return;
    setNumAdults(initial.numAdults != null ? String(initial.numAdults) : "");
    setNumChildren(initial.numChildren != null ? String(initial.numChildren) : "");
    setChildrenAges(initial.childrenAges ?? "");
    setRoomComposition(initial.roomComposition ?? "");
    setNumRooms(initial.numRooms != null ? String(initial.numRooms) : "");
    setTravelers(parseTravelers(initial.passportNames ?? null));
    setMedicalNotes(initial.medicalNotes ?? "");
    setMobilityNotes(initial.mobilityNotes ?? "");
    setArrivalInfo(initial.arrivalInfo ?? "");
    setDepartureInfo(initial.departureInfo ?? "");
    setSpecialRequests(initial.specialRequests ?? "");
    setTravelInsurance(initial.travelInsurance ?? "");
    setEmergencyContactName(initial.emergencyContactName ?? "");
    setEmergencyContactPhone(initial.emergencyContactPhone ?? "");
    setEmergencyContactRelation(initial.emergencyContactRelation ?? "");
  }, [operationalSyncKey, initial]);

  const draftForProgress = useMemo(
    () =>
      ({
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
      }) satisfies Partial<OperationalPayload>,
    [
      numAdults,
      numChildren,
      childrenAges,
      roomComposition,
      numRooms,
      travelers,
      medicalNotes,
      mobilityNotes,
      arrivalInfo,
      departureInfo,
      specialRequests,
      travelInsurance,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
    ],
  );

  const { filled, total } = operationalCompletion(draftForProgress);

  const pct = Math.round((filled / total) * 100);

  const submit = () => {
    setMessage(null);
    setError(null);
    const payload: Partial<OperationalPayload> = {
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
    };
    startTransition(async () => {
      try {
        const r = await saveClientOperationalDetailsAction(clientId, payload);
        if (r.ok) {
          setMessage("Enregistré.");
          setError(null);
          router.refresh();
        } else {
          setError(r.error);
        }
      } catch (e) {
        console.error(e);
        setError("Erreur réseau ou serveur.");
      }
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Détails opérationnels</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-gray-400">
            Infos pratiques pour le dossier et les transferts. À compléter à l&apos;appel pré-réservation ; le client peut
            aussi remplir le formulaire public.
          </p>
        </div>
        <div
          className="w-full shrink-0 rounded-lg border border-teal-200/80 bg-teal-50/70 px-4 py-3 dark:border-teal-800/50 dark:bg-teal-950/35 sm:w-auto sm:min-w-[13rem]"
          role="status"
          aria-label={`Complétion : ${filled} champs sur ${total}`}
        >
          <p className="text-xs font-medium text-teal-900 dark:text-teal-100">Complétion du bloc</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-200/80 dark:bg-teal-900/60">
            <div
              className="h-full rounded-full bg-teal-700 transition-[width] dark:bg-teal-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-teal-900/80 dark:text-teal-200/90">
            <span className="font-semibold tabular-nums">{filled}</span> sur {total} champs renseignés
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <OpBlock
          icon={Users}
          title="Groupe & hébergement"
          description="Taille du groupe, enfants et répartition des chambres — utile pour les hôtels et véhicules."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelPrimary}>Nombre d&apos;adultes</span>
              <input
                type="number"
                min={0}
                className={`mt-1.5 ${inputClass}`}
                value={numAdults}
                onChange={(e) => setNumAdults(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelPrimary}>Nombre d&apos;enfants</span>
              <input
                type="number"
                min={0}
                className={`mt-1.5 ${inputClass}`}
                value={numChildren}
                onChange={(e) => setNumChildren(e.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelPrimary}>Âges des enfants</span>
            <span className={labelHint}>Ex. 4, 7, 12 — à renseigner si enfants &gt; 0</span>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={childrenAges}
              onChange={(e) => setChildrenAges(e.target.value)}
              placeholder="4, 7, 12"
            />
          </label>
          <label className="block">
            <span className={labelPrimary}>Composition des chambres</span>
            <span className={labelHint}>
              Qui partage quoi : couples, enfants avec parents, amis en twin, lits séparés, etc.
            </span>
            <textarea
              rows={3}
              className={`mt-1.5 ${inputClass}`}
              value={roomComposition}
              onChange={(e) => setRoomComposition(e.target.value)}
              placeholder="Ex. 1 double couple + 1 chambre jumelle enfants…"
            />
          </label>
          <label className="block sm:max-w-xs">
            <span className={labelPrimary}>Nombre de chambres</span>
            <input
              type="number"
              min={0}
              className={`mt-1.5 ${inputClass}`}
              value={numRooms}
              onChange={(e) => setNumRooms(e.target.value)}
            />
          </label>
        </OpBlock>

        <OpBlock
          icon={UserRound}
          title="Identité des voyageurs"
          description="Noms sur les passeports et dates d’expiration — alignez avec les réservations aériennes."
        >
          <ul className="space-y-3">
            {travelers.map((t, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 border-l-4 border-l-teal-600 bg-white p-3 shadow-sm dark:border-gray-600 dark:border-l-teal-500 dark:bg-gray-800/40"
              >
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-gray-700">
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                    Voyageur {i + 1}
                  </span>
                  {travelers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setTravelers(travelers.filter((_, j) => j !== i))}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Retirer
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">Prénom</span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      placeholder="Prénom"
                      value={t.firstName}
                      onChange={(e) => {
                        const next = [...travelers];
                        next[i] = { ...t, firstName: e.target.value };
                        setTravelers(next);
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">Nom</span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      placeholder="Nom"
                      value={t.lastName}
                      onChange={(e) => {
                        const next = [...travelers];
                        next[i] = { ...t, lastName: e.target.value };
                        setTravelers(next);
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">N° passeport</span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      placeholder="N° passeport"
                      value={t.passportNumber}
                      onChange={(e) => {
                        const next = [...travelers];
                        next[i] = { ...t, passportNumber: e.target.value };
                        setTravelers(next);
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">Nationalité</span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      placeholder="Nationalité"
                      value={t.nationality}
                      onChange={(e) => {
                        const next = [...travelers];
                        next[i] = { ...t, nationality: e.target.value };
                        setTravelers(next);
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400">Expiration passeport (AAAA-MM-JJ)</span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      placeholder="AAAA-MM-JJ"
                      value={t.expiryDate}
                      onChange={(e) => {
                        const next = [...travelers];
                        next[i] = { ...t, expiryDate: e.target.value };
                        setTravelers(next);
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setTravelers([...travelers, emptyTraveler()])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/80 px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/60"
          >
            <Plus className="h-4 w-4" aria-hidden /> Ajouter un voyageur
          </button>
        </OpBlock>

        <OpBlock
          icon={HeartPulse}
          title="Santé, mobilité & assurance"
          description="À garder confidentiel ; indispensable pour l’encadrement sur le terrain et les assurances."
        >
          <label className="block">
            <span className={labelPrimary}>Santé, allergies, traitements</span>
            <textarea
              rows={2}
              className={`mt-1.5 ${inputClass}`}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Allergies alimentaires, EPI, médicaments…"
            />
          </label>
          <label className="block">
            <span className={labelPrimary}>Mobilité</span>
            <span className={labelHint}>Fauteuil, marche limitée, escaliers à éviter…</span>
            <textarea
              rows={2}
              className={`mt-1.5 ${inputClass}`}
              value={mobilityNotes}
              onChange={(e) => setMobilityNotes(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelPrimary}>Assurance voyage</span>
            <span className={labelHint}>N° de police, « souscription prévue », couverture…</span>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={travelInsurance}
              onChange={(e) => setTravelInsurance(e.target.value)}
              placeholder="N° police, statut de souscription…"
            />
          </label>
        </OpBlock>

        <OpBlock
          icon={Phone}
          title="Contact d’urgence"
          description="Personne joignable hors voyage, en cas d’imprévu médical ou logistique."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-1">
              <span className={labelPrimary}>Nom</span>
              <input
                className={`mt-1.5 ${inputClass}`}
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </label>
            <label className="block sm:col-span-1">
              <span className={labelPrimary}>Téléphone</span>
              <input
                className={`mt-1.5 ${inputClass}`}
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+33…"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className={labelPrimary}>Lien avec le voyageur</span>
              <span className={labelHint}>Conjoint, parent, ami…</span>
              <input
                className={`mt-1.5 ${inputClass}`}
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
              />
            </label>
          </div>
        </OpBlock>

        <OpBlock
          icon={Sparkles}
          title="Demandes particulières"
          description="Anniversaires, régimes, surprises à coordonner avec l’hébergement ou les guides."
        >
          <label className="block">
            <span className={labelPrimary}>Demandes & célébrations</span>
            <textarea
              rows={3}
              className={`mt-1.5 ${inputClass}`}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </label>
        </OpBlock>

        <OpBlock
          icon={MapPin}
          title="Arrivée & départ"
          description="Infos concrètes pour transferts aéroport, horaires souhaités et contraintes de vol."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className={labelPrimary}>Arrivée</span>
              <span className={labelHint}>Vol, terminal, retard habituel, besoin de siège enfant…</span>
              <textarea
                rows={3}
                className={`mt-1.5 ${inputClass}`}
                value={arrivalInfo}
                onChange={(e) => setArrivalInfo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelPrimary}>Départ</span>
              <span className={labelHint}>Heure de prise en charge, vol retour, bagages…</span>
              <textarea
                rows={3}
                className={`mt-1.5 ${inputClass}`}
                value={departureInfo}
                onChange={(e) => setDepartureInfo(e.target.value)}
              />
            </label>
          </div>
        </OpBlock>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-gray-700">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            {message}
          </span>
        ) : null}
        {error ? <span className="text-sm font-medium text-red-600 dark:text-red-400">{error}</span> : null}
      </div>
    </section>
  );
}
