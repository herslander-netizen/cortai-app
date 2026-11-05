/**
 * Linha da plataforma (WhatsApp administrativo do Flow) — decisão do dono, 05/11/2026. Regras puras.
 *
 * Uso FECHADO: só os eventos abaixo, só para donos e admins que ligaram o opt-in no próprio telefone verificado.
 * Nunca envia para cliente de um negócio e nunca substitui o número de um negócio ("sem número reserva" continua
 * valendo para todo aviso de negócio). A conexão é a linha `escopo = 'central'` de `conexoes_whatsapp`.
 */

export const EVENTOS_DA_PLATAFORMA = [
  "whatsapp_do_negocio_caiu",
  "cobranca_assinatura",
  "boas_vindas_negocio",
  "alerta_admin",
] as const;

export type EventoDaPlataforma = (typeof EVENTOS_DA_PLATAFORMA)[number];

export function ehEventoDaPlataforma(valor: unknown): valor is EventoDaPlataforma {
  return typeof valor === "string" && (EVENTOS_DA_PLATAFORMA as readonly string[]).includes(valor);
}

export type DadosDoAviso = {
  negocio?: string | null;
  /** Queda: "caiu" ou "qr" (pede QR de novo). */
  detalhe?: string | null;
  /** Cobrança: vencimento (DD/MM) e link de pagamento. */
  vencimento?: string | null;
  link?: string | null;
};

const ASSINATURA = "\n\n— Flow (avisos da plataforma)";

/** Texto fixo de cada evento. Curto, verdadeiro e sem dados de clientes. */
export function textoDoAviso(evento: EventoDaPlataforma, d: DadosDoAviso = {}): string {
  const negocio = d.negocio?.trim() || "seu negócio";
  switch (evento) {
    case "whatsapp_do_negocio_caiu":
      return (
        (d.detalhe === "qr"
          ? `O WhatsApp de ${negocio} pede um novo QR Code. Enquanto isso, os avisos aos clientes não saem.`
          : `O WhatsApp de ${negocio} desconectou. Enquanto isso, os avisos aos clientes não saem.`) +
        "\nAbra o Flow → WhatsApp → Conexão para reconectar." +
        ASSINATURA
      );
    case "cobranca_assinatura":
      return (
        `A assinatura do Flow de ${negocio} está com pagamento em aberto` +
        (d.vencimento ? ` (vencimento ${d.vencimento})` : "") +
        "." +
        (d.link ? `\nPara pagar: ${d.link}` : "\nVeja em Flow → Ajustes → Plano.") +
        ASSINATURA
      );
    case "boas_vindas_negocio":
      return (
        `Boas-vindas ao Flow, ${negocio}! Por este número você recebe só avisos importantes da plataforma, ` +
        "como quedas do seu WhatsApp e cobrança. Para parar, desligue em Flow → Ajustes." +
        ASSINATURA
      );
    case "alerta_admin":
      return (
        `Alerta da plataforma: ${d.detalhe?.trim() || "verifique o painel do ADM."}` + ASSINATURA
      );
  }
}

/** Hora (AAAAMMDDHH, UTC) para chaves que valem "uma vez por hora". */
export function horaDaChave(agora: Date = new Date()): string {
  return agora.toISOString().slice(0, 13).replace(/\D/g, "");
}
