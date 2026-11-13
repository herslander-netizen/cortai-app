/**
 * Gravação é a única confirmação de sucesso. Atualização do cache é uma
 * operação secundária e não deve fazer o cliente acreditar que precisa
 * reenviar a mesma criação (que ainda não tem chave de idempotência).
 *
 * O refresh é disparado sem bloquear o fechamento da folha.
 */
export async function salvarPacoteEAtualizarLista<T>(
  gravar: () => Promise<T>,
  atualizarLista: () => Promise<unknown>,
): Promise<{ resultado: T; atualizacao: Promise<boolean> }> {
  const resultado = await gravar();
  const atualizacao = Promise.resolve()
    .then(atualizarLista)
    .then(
      () => true,
      () => false,
    );
  return { resultado, atualizacao };
}
