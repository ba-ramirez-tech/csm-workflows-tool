import type { ReactNode } from "react";

export default function OperationalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">{children}</div>
  );
}
