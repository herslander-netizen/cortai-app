import { useQuery } from "@tanstack/react-query";

import { getEstadoDaCortai } from "@/lib/assistente.functions";

export const CHAVE_DO_ESTADO_DA_CORTAI = ["cortai-estado"] as const;

/** Estado real da Flow IA no negócio (desligada no ADM, pausada, limite...). */
export function useEstadoDaCortai() {
  const { data } = useQuery({
    queryKey: CHAVE_DO_ESTADO_DA_CORTAI,
    queryFn: () => getEstadoDaCortai(),
    staleTime: 60_000,
  });
  return data?.estado ?? null;
}
