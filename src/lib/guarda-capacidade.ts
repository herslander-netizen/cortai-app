/**
 * Guarda de rota por capacidade do plano.
 *
 * Esconder o item do menu não basta: quem digita o endereço direto também
 * precisa parar. A leitura usa o cache de capacidades (5 minutos), então a
 * troca de tela continua imediata. A regra de verdade continua no servidor,
 * em `exigirRecurso`.
 */
import type { QueryClient } from "@tanstack/react-query";
import { isRedirect, redirect } from "@tanstack/react-router";

import { getCapacidades } from "@/lib/capacidades.functions";
import type { ChaveDeRecurso } from "@/lib/planos";
import { comPrazo } from "@/lib/prazo";

export async function exigirCapacidade(queryClient: QueryClient, recurso: ChaveDeRecurso) {
  try {
    const capacidades = await comPrazo(queryClient.ensureQueryData({
      queryKey: ["capacidades"],
      queryFn: () => getCapacidades(),
      staleTime: 300_000,
    }), 900, "consultar as capacidades do plano");
    if (capacidades.liberados[recurso] === false) {
      throw redirect({ to: "/barbeiro/plano" });
    }
    // Desligado pelo dono em Funcionalidades: os dados ficam guardados.
    if (capacidades.ativos[recurso] === false) {
      throw redirect({ to: "/barbeiro/funcionalidades" });
    }
  } catch (erro) {
    if (isRedirect(erro)) throw erro;
    // Falha de leitura não pode trancar a barbearia fora do próprio painel.
  }
}
