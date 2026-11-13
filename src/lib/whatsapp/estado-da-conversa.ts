/**
 * Estado EXIBIDO na Central de Atendimento, derivado de fatos persistidos.
 * Não altera o protocolo de atendimento, nem tenta inferir se a IA enviou.
 * "Resolvida" corresponde ao status real "encerrada" (CHECK do banco).
 */
export type EstadoDaConversa =
  | "nova"
  | "ia_atendendo"
  | "aguardando_cliente"
  | "atendimento_humano"
  | "resolvida";

export type FatosDaConversa = {
  status: string;
  iaAtiva: boolean;
  modoHumano: boolean;
  modoHumanoAte: string | null;
  ultimaDirecao: "entrada" | "saida" | null;
  /** Registro de resposta de saída observado na amostra de mensagens da conversa. */
  possuiSaidaRegistrada: boolean;
  naoLidas: number;
};

export const ROTULOS_DA_CONVERSA: Record<EstadoDaConversa, string> = {
  nova: "Nova",
  ia_atendendo: "IA atendendo",
  aguardando_cliente: "Aguardando cliente",
  atendimento_humano: "Atendimento humano",
  resolvida: "Resolvida",
};

export function estadoDaConversa(fatos: FatosDaConversa, agoraMs: number): EstadoDaConversa {
  // Encerramento explícito é definitivo até o profissional reabrir.
  if (fatos.status === "encerrada") return "resolvida";
  const fim = fatos.modoHumanoAte ? Date.parse(fatos.modoHumanoAte) : NaN;
  if (
    fatos.status === "humano" ||
    fatos.modoHumano ||
    (Number.isFinite(fim) && fim > agoraMs)
  ) return "atendimento_humano";

  if (fatos.ultimaDirecao === "saida") return "aguardando_cliente";
  // "Nova" = entrada ainda sem resposta registrada nesta amostra, ou IA desligada
  // e cliente aguardando alguém. Não apresentar IA atendendo se ela está desligada.
  if (!fatos.iaAtiva || (fatos.ultimaDirecao === "entrada" && !fatos.possuiSaidaRegistrada)) {
    return "nova";
  }
  return "ia_atendendo";
}

/** Nova entrada nunca ativa a IA quando o profissional possui a conversa. */
export function podeResponderAutomaticamente(
  fatos: Pick<FatosDaConversa, "status" | "iaAtiva" | "modoHumano" | "modoHumanoAte">,
  agoraMs: number,
): boolean {
  const fim = fatos.modoHumanoAte ? Date.parse(fatos.modoHumanoAte) : NaN;
  return (
    fatos.status !== "encerrada" &&
    fatos.status !== "humano" &&
    fatos.iaAtiva &&
    !fatos.modoHumano &&
    !(Number.isFinite(fim) && fim > agoraMs)
  );
}
