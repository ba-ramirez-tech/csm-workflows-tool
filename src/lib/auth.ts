import { redirect } from "next/navigation";

export type CurrentUser = {
  id: string;
  name: string;
  role: string;
};

/** Placeholder until Supabase auth — keep the same shape for a drop-in replacement. */
export function getCurrentUser(): CurrentUser {
  return { id: "admin-1", name: "Braulio", role: "SUPER_ADMIN" };
}

/** Redirects to `/admin` if the current user does not have the required role. */
export function requireRole(role: string): void {
  const user = getCurrentUser();
  if (user.role !== role) {
    redirect("/admin");
  }
}
