/**
 * Cálculos de apresentação da cobrança no padrão Figaroo.
 * O valor efetivo a cobrar continua sendo validado e gravado pelo motor
 * canônico da comanda no servidor — estas funções não dão baixa em pagamento.
 */

export type TipoDescontoCheckout = "reais" | "percentual";

function moedaEmCentavos(texto: string): number | null {
  const limpo = texto.trim();
  // Campo digitado, sem separadores de milhar: não aceitar valores ambíguos,
  // notação científica ou mais que duas casas de centavos.
  if (!/^\d{1,7}(?:[,.]\d{1,2})?$/.test(limpo)) return null;
  const valor = Math.round(Number(limpo.replace(",", ".")) * 100);
  return Number.isSafeInteger(valor) && valor >= 0 ? valor : null;
}

export function calcularDescontoCheckout(
  subtotalCentavos: number,
  entrada: string,
  tipo: TipoDescontoCheckout,
): { descontoCentavos: number; totalCentavos: number; valido: boolean } {
  if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos < 0)
    return { descontoCentavos: 0, totalCentavos: 0, valido: false };

  if (!entrada.trim())
    return { descontoCentavos: 0, totalCentavos: subtotalCentavos, valido: true };

  let solicitado: number | null = null;
  if (tipo === "reais") {
    solicitado = moedaEmCentavos(entrada);
  } else if (tipo === "percentual" && /^\d{1,3}(?:[,.]\d{1,2})?$/.test(entrada.trim())) {
    const percentual = Number(entrada.trim().replace(",", "."));
    if (Number.isFinite(percentual) && percentual >= 0 && percentual <= 100)
      solicitado = Math.round(subtotalCentavos * percentual / 100);
  }
  if (solicitado === null || !Number.isSafeInteger(solicitado) || solicitado < 0)
    return { descontoCentavos: 0, totalCentavos: subtotalCentavos, valido: false };

  const descontoCentavos = Math.min(subtotalCentavos, solicitado);
  return { descontoCentavos, totalCentavos: subtotalCentavos - descontoCentavos, valido: true };
}

export function calcularDinheiroCheckout(totalCentavos: number, entrada: string): {
  recebidoCentavos: number | null;
  faltaCentavos: number;
  trocoCentavos: number;
  podeConfirmar: boolean;
} {
  const totalValido = Number.isSafeInteger(totalCentavos) && totalCentavos >= 0;
  const recebidoCentavos = moedaEmCentavos(entrada);
  const recebido = recebidoCentavos ?? 0;
  return {
    recebidoCentavos,
    faltaCentavos: totalValido ? Math.max(0, totalCentavos - recebido) : 0,
    trocoCentavos: totalValido ? Math.max(0, recebido - totalCentavos) : 0,
    podeConfirmar: totalValido && recebidoCentavos !== null && recebido >= totalCentavos,
  };
}
