/** Contato comercial temporário da página de apresentação, aprovado em 08/11/2026. */
export const WHATSAPP_COMERCIAL_FLOW = "5579998181983";

/** Abre a conversa com interesse já preenchido, sem enviar mensagem automaticamente. */
export function linkDeInteresseFlow(plano?: string): string {
  const nomeDoPlano = plano?.trim();
  const mensagem = nomeDoPlano
    ? `Olá! Tenho interesse no plano ${nomeDoPlano} do Flow e gostaria de saber mais.`
    : "Olá! Tenho interesse no Flow e gostaria de saber como ele pode ajudar meu negócio.";
  return `https://wa.me/${WHATSAPP_COMERCIAL_FLOW}?text=${encodeURIComponent(mensagem)}`;
}
