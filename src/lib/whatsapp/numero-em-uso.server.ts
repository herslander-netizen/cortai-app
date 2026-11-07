import { decidirNumeroEmUso, type OutraConexao } from "./numero-em-uso";

/**
 * Antes de gerar o código de pareamento: confere se o número já está em outra conexão (`idProprio` é a atual).
 * Devolve o aviso para o cliente quando precisa parar; senão encerra as outras sessões do mesmo número, que
 * continuariam gerando códigos e derrubando o novo. Falha daqui nunca impede a geração.
 */

export async function liberarNumeroParaPareamento(
  db: any,
  idProprio: string,
  numero: string,
  nomeDaOutra?: string,
) {
  try {
    const { data } = await db
      .from("conexoes_whatsapp")
      .select("id, sessao_id, status, numero")
      .neq("id", idProprio)
      .not("numero", "is", null);
    const decisao = decidirNumeroEmUso((data ?? []) as OutraConexao[], numero, nomeDaOutra);
    if (decisao.bloquear) return decisao.bloquear;
    if (decisao.encerrar.length) {
      const { gatewayDeWhatsapp } = await import("./gateway.server");
      for (const sessao of decisao.encerrar)
        await gatewayDeWhatsapp.desconectar(sessao).catch(() => undefined);
    }
  } catch {
    /* só protege; a geração do código segue */
  }
  return null;
}
