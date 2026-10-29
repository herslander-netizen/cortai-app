import { numeroParaWhatsApp } from "@/lib/comanda-ticket";

/**
 * WhatsApp do atendimento humano do Flow (com DDD; o 55 é acrescentado se faltar).
 * Enquanto estiver vazio, o cartão "Suporte" do menu lateral não aparece.
 */
export const WHATSAPP_DO_SUPORTE = "79998181983";

export function linkDoSuporte(numero: string = WHATSAPP_DO_SUPORTE): string | null {
  const completo = numeroParaWhatsApp(numero);
  if (!completo) return null;
  return `https://wa.me/${completo}?text=${encodeURIComponent("Olá! Preciso de ajuda com o Flow.")}`;
}
