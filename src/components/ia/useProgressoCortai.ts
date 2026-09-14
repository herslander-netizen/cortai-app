import { useQuery } from "@tanstack/react-query";

import { getConfiguracaoInicial, ITENS_DO_CHECKLIST } from "@/lib/onboarding.functions";

export type ProgressoCortai = {
  total: number;
  feitos: number;
  pendentes: number;
  concluido: boolean;
  itens: { chave: string; rotulo: string; feito: boolean }[];
};

/** Usa o estado real de configuração inicial da barbearia. Nada é inventado. */
export function useProgressoCortai(): ProgressoCortai | null {
  const { data } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
    staleTime: 60_000,
  });
  if (!data) return null;

  const itens = ITENS_DO_CHECKLIST.map((i) => ({
    chave: i.chave as string,
    rotulo: i.rotulo as string,
    feito: Boolean(data.itens[i.chave]),
  }));
  const feitos = itens.filter((i) => i.feito).length;
  return {
    total: itens.length,
    feitos,
    pendentes: itens.length - feitos,
    concluido: feitos === itens.length,
    itens,
  };
}
