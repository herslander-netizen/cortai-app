import type { ReactNode } from "react";

export function GlobalDesign({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}