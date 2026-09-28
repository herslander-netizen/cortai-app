import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getMarcaCliente } from "@/lib/marca.functions";
import { estiloDaMarca } from "@/lib/cor-marca";

export function ClientBrand({ children }: { children: ReactNode }) {
  const { data } = useQuery({ queryKey: ["marca-cliente"], queryFn: () => getMarcaCliente() });
  const marca = estiloDaMarca(data?.cor_primaria);
  return <div className="client-brand" data-custom-brand={marca.personalizada || undefined} data-hide-signature={data?.assinatura_visivel === false} style={marca.style}>{children}</div>;
}