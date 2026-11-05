import { numeroParaWhatsApp } from "@/lib/comanda-ticket";

/**
 * Único jeito de montar link ou número de WhatsApp a partir de um telefone cadastrado. Telefone sem DDI ("79991787208")
 * ganha o 55: sem ele o WhatsApp lê "+7 999…" (Rússia) — defeito visto em 05/11/2026. Número que não dá para usar
 * vira null, nunca um link para o país errado.
 */
export function linkDoWhatsApp(telefone: string | null | undefined, texto?: string): string | null {
  const numero = numeroParaWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** Número para envio pelo serviço (só dígitos, com 55 quando vier sem DDI). Fora do padrão, devolve os dígitos. */
export function numeroParaEnvio(telefone: string): string {
  return numeroParaWhatsApp(telefone) ?? telefone.replace(/\D/g, "");
}
