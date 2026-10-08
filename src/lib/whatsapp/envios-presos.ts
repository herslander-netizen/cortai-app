/**
 * Decisão pura sobre um envio parado em "enviando" (sem rede, testável).
 * Nunca reenvia: com id externo já houve saída; sem ele, a saída é incerta.
 */
export const PRESO_APOS_MS = 5 * 60_000;
export const MOTIVO_INTERROMPIDO = "envio interrompido";

export type EnvioPreso = {
  id: string;
  status: string;
  atualizado_em: string | null;
  criado_em: string | null;
  mensagem_externa_id: string | null;
};

export type DecisaoDoPreso = "aguardar" | "enviado" | "interrompido";

export function decidirEnvioPreso(envio: EnvioPreso, agora: number): DecisaoDoPreso {
  if (envio.status !== "enviando") return "aguardar";
  if (envio.mensagem_externa_id) return "enviado";
  const desde = Date.parse(envio.atualizado_em ?? envio.criado_em ?? "");
  if (!Number.isFinite(desde) || agora - desde < PRESO_APOS_MS) return "aguardar";
  return "interrompido";
}
