/**
 * Conta Flow = identidade (um e-mail, uma conta). Contextos = o que a conta faz.
 * Regras puras: o servidor decide os contextos e a tela só escolhe o destino.
 */
export type Contextos = { cliente: boolean; negocio: boolean };

export function decidirContextos(entrada: {
  temVinculoAtivo: boolean;
  tipoDoPerfil: string | null;
  fichasDeCliente: number;
  contextoAtivo: string | null;
}): Contextos {
  return {
    negocio: entrada.temVinculoAtivo,
    cliente:
      entrada.fichasDeCliente > 0 ||
      entrada.tipoDoPerfil === "cliente" ||
      entrada.contextoAtivo === "cliente",
  };
}

export type OpcaoDeEntrada =
  | { tipo: "cliente" }
  | { tipo: "negocio"; tenantId: string; nome: string; segmento: string | null }
  | { tipo: "criar_negocio" }
  | { tipo: "admin" };

/**
 * Cartões da tela /escolher: cliente, cada negócio com acesso ativo (ou "criar" quando não há
 * nenhum) e o painel do ADM só para admin da plataforma. O servidor confere tudo na troca.
 */
export function opcoesDeEntrada(entrada: {
  adminDaPlataforma: boolean;
  negocios: readonly {
    id: string;
    nome: string;
    segmento: string | null;
    acessoAtivo: boolean;
    ativa: boolean;
  }[];
}): OpcaoDeEntrada[] {
  const negocios = entrada.negocios.filter((n) => n.acessoAtivo && n.ativa);
  return [
    { tipo: "cliente" },
    ...(negocios.length
      ? negocios.map((n) => ({
          tipo: "negocio" as const,
          tenantId: n.id,
          nome: n.nome,
          segmento: n.segmento,
        }))
      : [{ tipo: "criar_negocio" as const }]),
    ...(entrada.adminDaPlataforma ? [{ tipo: "admin" as const }] : []),
  ];
}

/** Mostrar o seletor só quando há dois contextos e a pessoa ainda não escolheu (ou pediu para trocar). */
export function precisaEscolherContexto(
  sessao: { papel: string; contextos: Contextos; contextoEscolhido: boolean },
  aposEntrar = false,
): boolean {
  if (sessao.papel === "admin") return false;
  const ambos = sessao.contextos.cliente && sessao.contextos.negocio;
  return ambos && (aposEntrar || !sessao.contextoEscolhido);
}
