const TOTAL = 12;

export type OperationalCompletionRow = Partial<{
  numAdults: number | null;
  numChildren: number | null;
  childrenAges: string | null;
  roomComposition: string | null;
  numRooms: number | null;
  passportNames: unknown;
  medicalNotes: string | null;
  mobilityNotes: string | null;
  arrivalInfo: string | null;
  departureInfo: string | null;
  specialRequests: string | null;
  travelInsurance: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
}> | null;

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function passportFilled(json: unknown): boolean {
  if (!json || !Array.isArray(json)) return false;
  return json.some((item) => {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    return (
      nonEmpty(String(o.firstName ?? "")) ||
      nonEmpty(String(o.lastName ?? "")) ||
      nonEmpty(String(o.passportNumber ?? ""))
    );
  });
}

/** Twelve operational slots for the admin progress bar. */
export function operationalCompletion(d: OperationalCompletionRow): { filled: number; total: number } {
  if (!d) return { filled: 0, total: TOTAL };

  const slots = [
    d.numAdults != null && d.numAdults >= 1,
    d.numChildren != null && (d.numChildren === 0 || nonEmpty(d.childrenAges)),
    nonEmpty(d.roomComposition),
    d.numRooms != null && d.numRooms >= 1,
    passportFilled(d.passportNames),
    nonEmpty(d.medicalNotes),
    nonEmpty(d.mobilityNotes),
    nonEmpty(d.arrivalInfo),
    nonEmpty(d.departureInfo),
    nonEmpty(d.specialRequests),
    nonEmpty(d.travelInsurance),
    nonEmpty(d.emergencyContactName) &&
      nonEmpty(d.emergencyContactPhone) &&
      nonEmpty(d.emergencyContactRelation),
  ];

  const filled = slots.filter(Boolean).length;
  return { filled, total: TOTAL };
}
