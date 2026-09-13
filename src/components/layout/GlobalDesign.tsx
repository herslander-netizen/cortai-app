import { useQuery } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { getGlobalDesign } from "@/lib/admin.functions";

export function GlobalDesign({ children }: { children: ReactNode }) {
  const { data } = useQuery({ queryKey: ["global-design"], queryFn: () => getGlobalDesign(), staleTime: 300000 });
  const style = data ? {
    "--gold": data.cor_primaria, "--primary": data.cor_primaria,
    "--radius": `${data.raio_px}px`, "--font-sans": `"${data.tipografia}", ui-sans-serif, system-ui, sans-serif`,
  } as CSSProperties : undefined;
  return <div className="min-h-screen" style={style}>{children}</div>;
}