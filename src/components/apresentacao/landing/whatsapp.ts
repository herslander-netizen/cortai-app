/** Contato comercial temporário da página de apresentação, aprovado em 08/11/2026. */
export const WHATSAPP_COMERCIAL_FLOW = "5579998181983";

/** Abre a conversa com interesse já preenchido, sem enviar mensagem automaticamente. */
export function linkDeInteresseFlow(plano?: string): string {
  const assunto = plano?.trim() ? `no plano ${plano.trim()}` : "em conhecer a plataforma";
  const mensagem = `Olá! Conheci o Flow e tenho interesse ${assunto} para o meu negócio. Gostaria de saber mais.`;
  return `https://wa.me/${WHATSAPP_COMERCIAL_FLOW}?text=${encodeURIComponent(mensagem)}`;
}
