/**
 * O Supabase reemite `SIGNED_IN` (e `INITIAL_SESSION`) para a mesma conta sempre que o aparelho volta ao
 * aplicativo ou recupera a sessão. Tratar isso como "entrou de novo" limpava o cache da sessão e
 * reiniciava as rotas no meio de um toque, e a navegação em curso se perdia (tela em branco e volta
 * para a tela anterior). Só uma mudança real de conta ou de dados deve reiniciar algo.
 *
 * `contaAnterior` é `undefined` enquanto o ouvinte ainda não recebeu nenhum evento. O primeiro evento ao
 * abrir o app (`INITIAL_SESSION`, ou `SIGNED_IN`/`TOKEN_REFRESHED` da recuperação da sessão) só informa a
 * conta que já estava salva — a mesma que as guardas de rota leram com `getSession()`, que espera a mesma
 * inicialização. Antes ele era lido como "conta nova": a cada abertura o app esquecia a sessão, reiniciava
 * as rotas e recarregava tudo logo depois de a tela aparecer (registros do banco da prévia, 25/10/2026:
 * uma segunda leitura da sessão em toda abertura, no instante em que a tela sumia).
 */
export type EfeitoDoEvento = "nada" | "dados" | "conta";

export function efeitoDoEventoDeAutenticacao(
  evento: string,
  contaAnterior: string | null | undefined,
  contaAtual: string | null,
): EfeitoDoEvento {
  if (evento === "SIGNED_OUT") return "conta";
  // Primeiro evento deste ouvinte: só apresenta a conta já salva.
  if (contaAnterior === undefined) return "nada";
  if (evento === "SIGNED_IN" || evento === "INITIAL_SESSION") {
    return contaAnterior === contaAtual ? "nada" : "conta";
  }
  if (evento === "USER_UPDATED") return "dados";
  return "nada";
}
