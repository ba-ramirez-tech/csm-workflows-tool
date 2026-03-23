export type PassportTraveler = {
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality: string;
  expiryDate: string;
};

export type OperationalPayload = {
  numAdults: number | null;
  numChildren: number | null;
  childrenAges: string | null;
  roomComposition: string | null;
  numRooms: number | null;
  passportNames: PassportTraveler[];
  medicalNotes: string | null;
  mobilityNotes: string | null;
  arrivalInfo: string | null;
  departureInfo: string | null;
  specialRequests: string | null;
  travelInsurance: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
};

export function emptyTraveler(): PassportTraveler {
  return {
    firstName: "",
    lastName: "",
    passportNumber: "",
    nationality: "",
    expiryDate: "",
  };
}

function cleanInt(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

export function normalizeOperationalPayload(raw: Partial<OperationalPayload>): OperationalPayload {
  const list = Array.isArray(raw.passportNames) ? raw.passportNames : [];
  return {
    numAdults: cleanInt(raw.numAdults ?? null),
    numChildren: cleanInt(raw.numChildren ?? null),
    childrenAges: raw.childrenAges?.trim() || null,
    roomComposition: raw.roomComposition?.trim() || null,
    numRooms: cleanInt(raw.numRooms ?? null),
    passportNames: list.map((t) => ({
      firstName: (t.firstName ?? "").trim(),
      lastName: (t.lastName ?? "").trim(),
      passportNumber: (t.passportNumber ?? "").trim(),
      nationality: (t.nationality ?? "").trim(),
      expiryDate: (t.expiryDate ?? "").trim(),
    })),
    medicalNotes: raw.medicalNotes?.trim() || null,
    mobilityNotes: raw.mobilityNotes?.trim() || null,
    arrivalInfo: raw.arrivalInfo?.trim() || null,
    departureInfo: raw.departureInfo?.trim() || null,
    specialRequests: raw.specialRequests?.trim() || null,
    travelInsurance: raw.travelInsurance?.trim() || null,
    emergencyContactName: raw.emergencyContactName?.trim() || null,
    emergencyContactPhone: raw.emergencyContactPhone?.trim() || null,
    emergencyContactRelation: raw.emergencyContactRelation?.trim() || null,
  };
}
