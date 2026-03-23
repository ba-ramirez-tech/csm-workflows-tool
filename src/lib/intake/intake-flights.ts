import type { Prisma } from "@prisma/client";
import type { IntakeStep7 } from "./schema";

function trim(s: string | undefined) {
  return (s ?? "").trim();
}

function parseFlightDate(s: string | undefined): Date | null {
  const t = trim(s);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasMinimumFlight(airline: string | undefined, flightNumber: string | undefined, dateStr: string | undefined) {
  return !!(trim(airline) && trim(flightNumber) && trim(dateStr));
}

/**
 * Builds ClientFlight create payloads from optional intake step 7 fields.
 */
export function clientFlightsFromIntakeStep7(
  clientId: string,
  step7: IntakeStep7,
): Prisma.ClientFlightCreateManyInput[] {
  const out: Prisma.ClientFlightCreateManyInput[] = [];

  const arrDate = step7.arrivalDate;
  if (
    hasMinimumFlight(step7.arrivalAirline, step7.arrivalFlightNumber, arrDate) &&
    parseFlightDate(arrDate)
  ) {
    out.push({
      clientId,
      direction: "arrival",
      airline: trim(step7.arrivalAirline),
      flightNumber: trim(step7.arrivalFlightNumber),
      date: parseFlightDate(arrDate)!,
      departureCity: "Non précisé",
      arrivalCity: trim(step7.arrivalCity) || "Bogotá",
      departureTime: "",
      arrivalTime: trim(step7.arrivalTime),
    });
  }

  const depDate = step7.departureDate;
  if (
    hasMinimumFlight(step7.departureAirline, step7.departureFlightNumber, depDate) &&
    parseFlightDate(depDate)
  ) {
    out.push({
      clientId,
      direction: "departure",
      airline: trim(step7.departureAirline),
      flightNumber: trim(step7.departureFlightNumber),
      date: parseFlightDate(depDate)!,
      departureCity: trim(step7.departureCity) || "Bogotá",
      arrivalCity: "Non précisé",
      departureTime: trim(step7.departureTime),
      arrivalTime: "",
    });
  }

  return out;
}
