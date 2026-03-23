import Link from "next/link";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatClientPrice } from "@/lib/client-currency";
import { copToClientAmount } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; from?: string; to?: string };

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    sent: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    accepted: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    rejected: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    expired: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? map.draft}`}
    >
      {status}
    </span>
  );
}

export default async function QuotesListPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();
  const from = sp.from?.trim();
  const to = sp.to?.trim();

  const where: Prisma.QuoteWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (status && ["draft", "sent", "accepted", "rejected", "expired"].includes(status)) {
    where.status = status;
  }
  if (from && to) {
    const a = new Date(from);
    const b = new Date(to);
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
      where.createdAt = { gte: a, lte: b };
    }
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      client: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  });

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (status) qs.set("status", status);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const filterQuery = qs.toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">Quotes</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">Proposals and pricing.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">
            Propositions IA : ouvrez un{" "}
            <Link href="/admin/clients" className="font-medium text-teal-700 underline dark:text-teal-400">
              client
            </Link>{" "}
            → bouton « Propositions IA » sur la fiche.
          </p>
        </div>
        <Link
          href="/admin/quotes/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          New quote
        </Link>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40"
        method="get"
      >
        <label className="flex flex-col text-xs font-medium text-slate-600 dark:text-gray-400">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Name or client"
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600 dark:text-gray-400">
          Status
          <select
            name="status"
            defaultValue={status}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600 dark:text-gray-400">
          From
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600 dark:text-gray-400">
          To
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          Apply
        </button>
        {filterQuery ? (
          <Link href="/admin/quotes" className="text-sm text-teal-700 hover:underline dark:text-teal-400">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900/40">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="py-3 pl-4 font-medium">Quote name</th>
              <th className="py-3 pr-4 font-medium">Client</th>
              <th className="py-3 pr-4 font-medium">Template</th>
              <th className="py-3 pr-4 font-medium">Duration</th>
              <th className="py-3 pr-4 font-medium">Travelers</th>
              <th className="py-3 pr-4 font-medium">Total</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((row) => {
              const totalCop = row.totalPriceCop ?? 0;
              const totalClient = copToClientAmount(totalCop, row.currency);
              return (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-gray-800 dark:hover:bg-gray-800/50">
                  <td className="py-3 pl-4 font-medium text-slate-900 dark:text-gray-100">
                    <Link href={`/admin/quotes/${row.id}`} className="text-teal-800 hover:underline dark:text-teal-400">
                      {row.name ?? "Untitled"}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-gray-300">{row.client.name}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-gray-400">{row.template?.name ?? "—"}</td>
                  <td className="py-3 pr-4 tabular-nums">{row.durationDays}d</td>
                  <td className="py-3 pr-4 tabular-nums">{row.numTravelers}</td>
                  <td className="py-3 pr-4 font-medium tabular-nums">{formatClientPrice(totalClient, row.currency)}</td>
                  <td className="py-3 pr-4">{statusBadge(row.status)}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-gray-400">
                    {format(row.createdAt, "yyyy-MM-dd HH:mm")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {quotes.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-gray-400">No quotes match.</p>
        ) : null}
      </div>
    </div>
  );
}
