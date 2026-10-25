/**
 * O Supabase reemite `SIGNED_IN` (e `INITIAL_SESSION`) para a mesma conta sempre que o aparelho volta ao
 * aplicativo ou recupera a sessão. Tratar isso como "entrou de novo" limpava o cache da sessão e
 * reiniciava as rotas no meio de um toque, e a navegação em curso se perdia (tela em branco e volta
 * para a tela anterior). Só uma mudança real de conta ou de dados deve reiniciar algo.
 */
export type EfeitoDoEvento = "nada" | "dados" | "conta";

export function efeitoDoEventoDeAutenticacao(
  evento: string,
  contaAnterior: string | null,
  contaAtual: string | null,
): EfeitoDoEvento {
  if (evento === "SIGNED_OUT") return "conta";
  if (evento === "SIGNED_IN" || evento === "INITIAL_SESSION") {
    return contaAnterior === contaAtual ? "nada" : "conta";
  }
  if (evento === "USER_UPDATED") return "dados";
  return "nada";
}
