export type MovimentoDeCaixaParaGaveta = {
  tipo: string;
  valor_centavos: number;
  forma_pagamento?: string | null;
};

const TIPOS_DE_SAIDA_LEGADA = new Set(["saida", "sangria", "despesa", "estorno", "ajuste"]);

/**
 * A conferência física deve contar só dinheiro.
 * Movimentos antigos sem forma, registrados pelo formulário de saída anterior,
 * são tratados como dinheiro para não apagar silenciosamente uma retirada já anotada.
 */
function movimentoAfetaGaveta(movimento: MovimentoDeCaixaParaGaveta): boolean {
  if (movimento.forma_pagamento === "dinheiro") return true;
  if (movimento.forma_pagamento === "pix" || movimento.forma_pagamento === "cartao") return false;
  return TIPOS_DE_SAIDA_LEGADA.has(movimento.tipo);
}

export function calcularSaldoEsperadoNaGaveta(
  saldoInicialCentavos: number,
  movimentos: readonly MovimentoDeCaixaParaGaveta[],
): number {
  return movimentos.reduce((saldo, movimento) => {
    if (!movimentoAfetaGaveta(movimento)) return saldo;
    return saldo + (movimento.tipo === "entrada" ? movimento.valor_centavos : -movimento.valor_centavos);
  }, saldoInicialCentavos);
}

/** Positivo = sobra; negativo = falta; zero = contagem exata. */
export function calcularDiferencaDoFechamento(
  saldoEsperadoCentavos: number,
  saldoContadoCentavos: number,
): number {
  return saldoContadoCentavos - saldoEsperadoCentavos;
}
