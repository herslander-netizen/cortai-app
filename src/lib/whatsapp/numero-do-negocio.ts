/**
 * Um número só para o negócio (dono, 05/11/2026): o WhatsApp do cadastro (`tenants.whatsapp`, usado pela página e pela
 * agenda) é o mesmo que está conectado. A gaveta de conexão mostra o número cadastrado antes de conectar; se a pessoa
 * conectar outro, o cadastro passa a ser o conectado. Regras puras.
 */
import { numeroParaWhatsApp } from "@/lib/comanda-ticket";

/**
 * Forma única de comparar: com 55 e, para celular de DDD 31 em diante, sem o 9 extra (é assim que o WhatsApp
 * identifica a conta). "79991787208", "+55 79 99178-7208" e "557991787208" são o mesmo número.
 */
export function chaveDoNumero(telefone: string | null | undefined): string | null {
  const n = numeroParaWhatsApp(telefone);
  if (!n) return null;
  const celular = n.match(/^55(\d{2})9(\d{8})$/);
  return celular && Number(celular[1]) >= 31 ? `55${celular[1]}${celular[2]}` : n;
}

export function mesmoNumero(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = chaveDoNumero(a);
  return x !== null && x === chaveDoNumero(b);
}

/**
 * Número conectado no formato do cadastro (DDD + número, como a pessoa digita). O WhatsApp devolve celular de DDD 31+
 * sem o 9 ("557998181983"): o 9 volta para o cadastro mostrar o número que a pessoa conhece.
 */
export function numeroParaCadastro(conectado: string): string | null {
  const n = numeroParaWhatsApp(conectado);
  if (!n) return null;
  const local = n.slice(2);
  if (local.length === 10 && /^[6-9]$/.test(local[2] ?? ""))
    return `${local.slice(0, 2)}9${local.slice(2)}`;
  return local;
}
