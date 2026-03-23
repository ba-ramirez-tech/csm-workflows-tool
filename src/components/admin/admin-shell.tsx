"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  FileText,
  Globe,
  Hotel,
  Layers,
  LayoutDashboard,
  Lock,
  Menu,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";

type AdminShellProps = {
  children: React.ReactNode;
  showContracts?: boolean;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
};

const allNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Destinations", href: "/admin/destinations", icon: Globe },
  { label: "Accommodations", href: "/admin/accommodations", icon: Hotel },
  { label: "Experiences", href: "/admin/experiences", icon: Compass },
  { label: "Transport", href: "/admin/transport", icon: Truck },
  { label: "Contracts", href: "/admin/contracts", icon: Lock, superAdminOnly: true },
  { label: "Templates", href: "/admin/templates", icon: Layers },
  { label: "Intakes", href: "/admin/intakes", icon: ClipboardList },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Quotes", href: "/admin/quotes", icon: FileText },
  { label: "Bookings", href: "/admin/bookings", icon: BookOpen },
  { label: "Calendar", href: "/admin/calendar", icon: Calendar },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href);
}

function formatCrumb(value: string) {
  if (!value) return "Dashboard";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminShell({ children, showContracts = false }: AdminShellProps) {
  const pathname = usePathname();
  const navItems = allNavItems.filter((item) => !item.superAdminOnly || showContracts);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "admin") return ["Admin"];
    return ["Admin", ...parts.slice(1).map(formatCrumb)];
  }, [pathname]);

  return (
    <div className="admin-app-shell flex min-h-screen bg-white text-slate-900">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex bg-slate-900 text-slate-100 transition-all duration-200 md:static",
          collapsed ? "w-20" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex w-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
            <div className="h-8 w-8 rounded-md bg-teal-600/30 ring-1 ring-teal-500/60" />
            {!collapsed && <span className="text-sm font-semibold tracking-wide">Travel Workflow</span>}
            <button
              type="button"
              className="ml-auto hidden rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white md:inline-flex"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="ml-auto rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                  {index > 0 && <span className="text-slate-300">/</span>}
                  <span className={index === breadcrumbs.length - 1 ? "font-medium text-slate-700" : ""}>
                    {crumb}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="h-9 w-9 rounded-full bg-slate-200 ring-2 ring-slate-100" />
        </header>

        <main className="flex-1 bg-white p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
