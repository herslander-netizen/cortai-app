/** Limite de espera para leituras de rede que controlam o carregamento de telas. */
export class PrazoEsgotado extends Error {
  constructor(etapa: string) {
    super(`Tempo esgotado ao ${etapa}.`);
    this.name = "PrazoEsgotado";
  }
}

/**
 * Devolve o resultado dentro do prazo ou rejeita para que a interface mostre
 * o estado de erro/repetição em vez de manter um esqueleto indefinidamente.
 * A operação original não é cancelada; quando houver suporte, use também um
 * AbortSignal na camada de transporte.
 */
export async function comPrazo<T>(
  operacao: PromiseLike<T>,
  limiteMs: number,
  etapa: string,
): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const expirou = new Promise<never>((_, reject) => {
    temporizador = setTimeout(() => reject(new PrazoEsgotado(etapa)), Math.max(0, limiteMs));
  });
  try {
    return await Promise.race([Promise.resolve(operacao), expirou]);
  } finally {
    if (temporizador !== undefined) clearTimeout(temporizador);
  }
}
