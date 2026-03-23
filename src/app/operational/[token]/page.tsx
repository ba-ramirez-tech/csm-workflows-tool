import { notFound } from "next/navigation";
import { OperationalForm } from "@/components/operational/OperationalForm";
import { getOperationalPageState } from "@/lib/operational/page-state";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function OperationalPublicPage({ params }: Props) {
  const { token } = await params;
  const state = await getOperationalPageState(token);
  if (state.kind === "not_found") notFound();
  return <OperationalForm token={state.token} client={state.client} />;
}
