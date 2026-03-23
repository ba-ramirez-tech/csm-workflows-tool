"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Opens all nested <details> before print so Discovery Profile prints fully. */
export function DiscoveryPrintExpand({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openAll = () => {
      ref.current?.querySelectorAll("details").forEach((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    };
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);

  return <div ref={ref}>{children}</div>;
}
