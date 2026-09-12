import { useQuery } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";

import { getMarcaCliente } from "@/lib/marca.functions";

export function ClientBrand({ children }: { children: ReactNode }) {
  const { data } = useQuery({ queryKey: ["marca-cliente"], queryFn: () => getMarcaCliente() });
  const style = data ? ({
    "--gold": data.cor_primaria,
    "--primary": data.cor_primaria,
    "--secondary": data.cor_secundaria ?? undefined,
    "--sage": data.cor_accent ?? undefined,
    "--accent": data.cor_accent ?? undefined,
  } as CSSProperties) : undefined;
  return <div className="client-brand" data-hide-signature={data?.assinatura_visivel === false} style={style}>{children}</div>;
}