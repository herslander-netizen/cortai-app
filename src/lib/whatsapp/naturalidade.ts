/**
 * Conversa com jeito de gente, sem enganar (docs/conversacao-flow-aprimoramentos-2026-11-05.md, P0.3 e P0.4):
 * "digitando…" proporcional ao texto e juntar as mensagens que o cliente manda picadas antes de responder.
 * Regras puras; quem chama é `fluxo.server.ts`.
 */

/** Tempo de "digitando…": cresce com o texto, entre 0,8 s e 2,5 s (nunca segura a resposta por muito tempo). */
export function tempoDeDigitar(texto: string): number {
  const ms = 600 + texto.trim().length * 20;
  return Math.max(800, Math.min(2500, Math.round(ms)));
}

/** Silêncio esperado antes de responder; `CORTAI_WHATSAPP_JUNTAR_MS=0` desliga. */
export function esperaParaJuntar(env: Record<string, string | undefined> = process.env): number {
  const bruto = env["CORTAI_WHATSAPP_JUNTAR_MS"];
  if (bruto === undefined || bruto.trim() === "") return 3000;
  const n = Number(bruto);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 8000) : 3000;
}

export type LinhaDaConversa = {
  direcao: string;
  conteudo: string | null;
  mensagem_externa_id: string | null;
  criado_em: string;
};

/** Mensagens seguidas do cliente só se juntam dentro desta janela. */
export const JANELA_DE_JUNCAO_MS = 2 * 60_000;
const MAXIMO_JUNTADAS = 5;

/**
 * `linhas` em ordem do mais novo para o mais antigo. Se chegou mensagem do cliente depois desta, devolve `null`: a
 * mais nova responde por todas. Senão, devolve o texto das mensagens seguidas do cliente desde a última resposta
 * (até 5, dentro de 2 minutos), na ordem em que foram escritas.
 */
export function textoJuntado(
  linhas: readonly LinhaDaConversa[],
  atual: { mensagemExternaId: string | null; texto: string },
): string | null {
  const entradas = linhas.filter((l) => l.direcao === "entrada");
  const maisNova = entradas[0];
  if (
    maisNova &&
    atual.mensagemExternaId &&
    maisNova.mensagem_externa_id !== atual.mensagemExternaId
  ) {
    return null;
  }
  const partes: string[] = [];
  const limite = Date.parse(maisNova?.criado_em ?? "") - JANELA_DE_JUNCAO_MS;
  for (const l of linhas) {
    if (l.direcao !== "entrada") break;
    if (Number.isFinite(limite) && Date.parse(l.criado_em) < limite) break;
    const texto = (l.conteudo ?? "").trim();
    if (texto) partes.push(texto);
    if (partes.length >= MAXIMO_JUNTADAS) break;
  }
  if (!partes.length) return atual.texto;
  return partes.reverse().join("\n");
}
