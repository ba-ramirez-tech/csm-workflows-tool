import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      quote: { select: { id: true, name: true } },
    },
  });
  if (!booking) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/clients" className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400">
        ← Admin
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">Booking {booking.dossierNumber}</h1>
      <p className="text-sm text-slate-600 dark:text-gray-400">
        Client:{" "}
        <Link href={`/admin/clients/${booking.client.id}`} className="font-medium text-teal-800 hover:underline dark:text-teal-400">
          {booking.client.name}
        </Link>
      </p>
      {booking.quote ? (
        <p className="text-sm text-slate-600 dark:text-gray-400">
          From quote:{" "}
          <Link href={`/admin/quotes/${booking.quote.id}`} className="text-teal-800 hover:underline dark:text-teal-400">
            {booking.quote.name ?? booking.quote.id}
          </Link>
        </p>
      ) : null}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="font-medium">{booking.status}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Travel</dt>
          <dd className="font-medium">
            {format(booking.travelStart, "yyyy-MM-dd")} → {format(booking.travelEnd, "yyyy-MM-dd")}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Travelers</dt>
          <dd className="font-medium">{booking.numTravelers}</dd>
        </div>
      </dl>
      <p className="text-sm text-slate-500 dark:text-gray-400">
        Full booking operations UI comes in Phase 8. This record was created from an accepted quote.
      </p>
    </div>
  );
}
