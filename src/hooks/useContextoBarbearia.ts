import { useQuery } from "@tanstack/react-query";

import { getContextoBarbearia } from "@/lib/recursos.functions";
import type { Permissao } from "@/lib/permissoes";
import type { ChaveRecursoTenant } from "@/lib/recursos";

/**
 * Regra da interface: o recurso precisa estar ATIVO na barbearia e o
 * funcionário precisa ter PERMISSÃO. O servidor valida de novo em cada ação.
 */
export function useContextoBarbearia() {
  const query = useQuery({
    queryKey: ["contexto-barbearia"],
    queryFn: () => getContextoBarbearia(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const dados = query.data;
  const pode = (permissao: Permissao) => Boolean(dados && (dados.papel === "dono" || dados.permissoes.includes(permissao)));
  const ativo = (chave: ChaveRecursoTenant) => Boolean(dados?.recursos.find((r) => r.chave === chave)?.ativo);
  const disponivel = (chave: ChaveRecursoTenant, permissao?: Permissao) => ativo(chave) && (!permissao || pode(permissao));
  return { ...query, dados, pode, ativo, disponivel, carregando: query.isLoading };
}
