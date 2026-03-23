import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin | Travel Workflow",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = getCurrentUser();
  return <AdminShell showContracts={user.role === "SUPER_ADMIN"}>{children}</AdminShell>;
}
