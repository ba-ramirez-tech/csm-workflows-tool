import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewQuoteWizard } from "./new-quote-wizard";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const [clients, templates] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, leadStatus: true },
    }),
    prisma.tripTemplate.findMany({
      where: { isPublished: true, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/quotes" className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400">
        ← Quotes
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">New quote</h1>
      <NewQuoteWizard clients={clients} templates={templates} />
    </div>
  );
}
