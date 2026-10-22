import type { StatusAssinatura } from "@/lib/cobranca";

/** Recorte do plano que a escolha precisa; vem de `planos_da_plataforma` (nada é inventado aqui). */
export type PlanoParaEscolha = {
  chave: string;
  nome: string;
  precoMensalCentavos: number;
  limites: { profissionais: number | null };
};

/** Planos do mais barato ao mais caro. */
function porPreco<T extends PlanoParaEscolha>(planos: readonly T[]): T[] {
  return [...planos].sort((a, b) => a.precoMensalCentavos - b.precoMensalCentavos);
}

/**
 * "Quantos profissionais você precisa?" (os assentos do Figaro): o plano mais barato que comporta essa
 * equipe. Sem limite (`null`) comporta qualquer número. Devolve `null` se nenhum plano comporta.
 */
export function planoParaProfissionais<T extends PlanoParaEscolha>(
  planos: readonly T[],
  profissionais: number,
): T | null {
  return (
    porPreco(planos).find(
      (p) => p.limites.profissionais === null || p.limites.profissionais >= profissionais,
    ) ?? null
  );
}

/** Maior equipe que algum plano comporta (limite finito); 1 se não houver planos. */
export function maximoDeProfissionais(planos: readonly PlanoParaEscolha[]): number {
  const limites = planos.map((p) => p.limites.profissionais).filter((n): n is number => n !== null);
  return limites.length ? Math.max(...limites) : 1;
}

/** Menor equipe para a qual o plano é o escolhido (para o seletor abrir no plano atual). */
export function profissionaisDoPlano(planos: readonly PlanoParaEscolha[], chave: string): number {
  for (let n = 1; n <= maximoDeProfissionais(planos); n++) {
    if (planoParaProfissionais(planos, n)?.chave === chave) return n;
  }
  return 1;
}

export type SituacaoDoPaywall = { texto: string; tom: "aviso" | "info" };

/** Selo de cima da tela de planos ("Seu teste grátis terminou", "Assinatura pausada"…). */
export function situacaoDoPaywall(entrada: {
  status: StatusAssinatura | null;
  teste?: { ativo: boolean; diasRestantes: number; fim: string | null } | undefined;
}): SituacaoDoPaywall | null {
  if (entrada.teste?.ativo) {
    const d = entrada.teste.diasRestantes;
    return {
      texto: d === 1 ? "Seu teste grátis termina hoje" : `Seu teste grátis: ${d} dias restantes`,
      tom: "info",
    };
  }
  if (
    entrada.status === "suspensa" ||
    entrada.status === "pendente" ||
    entrada.status === "aguardando_pagamento"
  )
    return { texto: "Assinatura pausada", tom: "aviso" };
  if (
    entrada.status === "cancelada" ||
    (entrada.status === "teste" && entrada.teste && !entrada.teste.ativo)
  )
    return { texto: "Seu teste grátis terminou", tom: "aviso" };
  return null;
}
