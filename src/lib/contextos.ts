/**
 * Conta Cortaí = identidade (um e-mail, uma conta). Contextos = o que a conta faz.
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

/** Mostrar o seletor só quando há dois contextos e a pessoa ainda não escolheu (ou pediu para trocar). */
export function precisaEscolherContexto(
  sessao: { papel: string; contextos: Contextos; contextoEscolhido: boolean },
  aposEntrar = false,
): boolean {
  if (sessao.papel === "admin") return false;
  const ambos = sessao.contextos.cliente && sessao.contextos.negocio;
  return ambos && (aposEntrar || !sessao.contextoEscolhido);
}
