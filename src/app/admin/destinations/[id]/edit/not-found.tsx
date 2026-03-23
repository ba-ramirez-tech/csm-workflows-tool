import Link from "next/link";

export default function DestinationNotFoundPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Destination not found</h1>
      <p className="mt-2 text-sm text-slate-600">The destination may have been removed.</p>
      <Link href="/admin/destinations" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800">
        Return to destinations
      </Link>
    </div>
  );
}
