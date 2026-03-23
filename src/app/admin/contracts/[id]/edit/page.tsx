import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { parseConditionsToPairs, parseNegotiatedPerksFromJson } from "@/lib/contracts-parse";
import { prisma } from "@/lib/prisma";
import { deleteContractAction, updateContractAction } from "../../actions";
import { ContractEditForm } from "../../contract-edit-form";
import { DeleteContractButton } from "../../delete-contract-button";

type EditContractPageProps = {
  params: Promise<{ id: string }>;
};

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function supplierTypeLabel(type: string): string {
  if (type === "accommodation") return "Accommodation";
  if (type === "experience") return "Experience";
  if (type === "transport") return "Transport route";
  return type;
}

export default async function EditContractPage({ params }: EditContractPageProps) {
  requireRole("SUPER_ADMIN");

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      accommodation: {
        select: { name: true, destination: { select: { name: true } } },
      },
      experience: {
        select: { name: true, destination: { select: { name: true } } },
      },
      transport: {
        select: {
          origin: { select: { name: true } },
          destination: { select: { name: true } },
        },
      },
    },
  });

  if (!contract) {
    notFound();
  }

  let supplierName = "Unknown";
  if (contract.accommodation) {
    supplierName = `${contract.accommodation.name} (${contract.accommodation.destination.name})`;
  } else if (contract.experience) {
    supplierName = `${contract.experience.name} (${contract.experience.destination.name})`;
  } else if (contract.transport) {
    supplierName = `${contract.transport.origin.name} → ${contract.transport.destination.name}`;
  }

  const updateAction = updateContractAction.bind(null, id);
  const deleteAction = deleteContractAction.bind(null, id);

  const perks = parseNegotiatedPerksFromJson(contract.negotiatedPerks);
  const conditionRows = parseConditionsToPairs(contract.conditions);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Edit contract</h1>
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
              Confidential
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Update pricing, validity, perks, and conditions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/contracts" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to list
          </Link>
          <DeleteContractButton onDelete={deleteAction} />
        </div>
      </div>

      <ContractEditForm
        supplierTypeLabel={supplierTypeLabel(contract.supplierType)}
        supplierName={supplierName}
        action={updateAction}
        initialValues={{
          season: contract.season,
          netCostCop: contract.netCostCop,
          costPerWhat: contract.costPerWhat,
          currency: contract.currency,
          validFrom: toDateInputValue(contract.validFrom),
          validTo: toDateInputValue(contract.validTo),
          commissionPct: contract.commissionPct != null ? String(contract.commissionPct) : "",
          notes: contract.notes ?? "",
          isActive: contract.isActive,
          perks,
          conditionRows,
        }}
      />
    </section>
  );
}
