/**
 * A conexão caiu enquanto ainda abria (QR ou código na tela) com motivo 401 da Evolution: é o serviço derrubando a
 * sessão (ex.: 05/11/2026, Redis sem gravar), não o número do negócio. A tela diz isso em vez de deixar só o erro
 * genérico do WhatsApp ("confira o número"). Depois de conectado, 401 é saída pelo celular: mensagem diferente.
 */
export const TEXTO_QUEDA_AO_ABRIR =
  "A conexão caiu logo ao abrir. Pode ser instabilidade no serviço de WhatsApp — não é o seu número. Tente de novo em alguns minutos.";

const ABRINDO = new Set(["pendente", "qr_pronto", "conectando"]);

export function erroDaQueda(p: {
  estadoNovo: string;
  motivo: unknown;
  statusAnterior: string | null | undefined;
}): string | null {
  if (p.estadoNovo !== "close") return null;
  if (Number(p.motivo) !== 401) return null;
  return ABRINDO.has(String(p.statusAnterior ?? "")) ? TEXTO_QUEDA_AO_ABRIR : null;
}
