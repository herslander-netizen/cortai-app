import type { CSSProperties } from "react";

import { contrasteDaMarca } from "@/lib/cor-marca";
import { agendamentoStyle, type PaginaConfig } from "@/lib/pagina-config";
import { estiloDaAgendaDireta } from "@/lib/tema-da-agenda-direta";

/**
 * A confirmação pertence à identidade pública que iniciou a reserva.
 *
 * Conversa: preserva o fundo e o acento escolhidos no editor do chat.
 * Direta com layout Agendamento: preserva a paleta especial e estrutura do tema.
 * Site e demais páginas diretas: recebem fundo, fontes e CTA do tema publicado,
 * mesmo quando o chat está configurado com uma superfície diferente.
 */
export function estiloDaConfirmacao(
  config: PaginaConfig,
  experiencia: "conversa" | "direta" | "site" | "figaro",
): CSSProperties {
  if (experiencia === "conversa") return agendamentoStyle(config);
  if (config.layout === "figaro-agendamento" && config.experiencia === "direta") {
    return estiloDaAgendaDireta(config);
  }
  const superficieDoTema: PaginaConfig = {
    ...config,
    chat: { ...config.chat, superficie: "tema" },
  };
  return {
    ...agendamentoStyle(superficieDoTema),
    "--chat-primary": config.cores.botao,
    "--chat-primary-foreground": contrasteDaMarca(config.cores.botao),
  } as CSSProperties;
}

export function varianteDaConfirmacao(
  config: PaginaConfig,
  fluxo: "conversa" | "passo_a_passo",
): "conversa" | "direta" | "site" | "figaro" {
  if (fluxo === "conversa") return "conversa";
  if (config.layout.startsWith("figaro-")) return "figaro";
  return config.experiencia === "vitrine" ? "site" : "direta";
}
