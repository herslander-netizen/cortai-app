/** Impede que a resposta da IA deixe o chat público aguardando indefinidamente. */
export async function respostaComPrazo<T>(requisicao: Promise<T>, limiteMs = 8_000): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      requisicao,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), limiteMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
