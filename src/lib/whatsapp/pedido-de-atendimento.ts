import { telefoneDoTicket } from "@/lib/comanda-ticket";
import { LINKS_DE_TELA } from "@/lib/links-de-tela";

import { linkDoWhatsApp } from "./link-whatsapp";

/**
 * Aviso "Cliente pediu atendimento" para a equipe (dono, 06/11/2026: "abrir o WhatsApp direto no cliente"). Um só
 * formato para o Flow Bot e a Flow IA: telefone legível no corpo e o toque abre a conversa com o cliente no WhatsApp.
 * Telefone que não dá para usar continua levando ao início do painel.
 */
export function avisoDePedidoDeAtendimento(telefone: string, texto: string) {
  const legivel = telefoneDoTicket(telefone) ?? telefone;
  return {
    _tipo: "whatsapp_humano",
    _titulo: "Cliente pediu atendimento",
    _corpo: `${legivel}: "${texto.slice(0, 100)}"`,
    _link: linkDoWhatsApp(telefone) ?? LINKS_DE_TELA.inicio,
  };
}

/** Link externo do WhatsApp: abre fora do app, nunca troca a tela do painel. */
export function ehLinkDoWhatsApp(link: string | null | undefined): link is string {
  return !!link && link.startsWith("https://wa.me/");
}
