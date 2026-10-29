/**
 * Conexão por número de telefone (alternativa ao QR Code): o WhatsApp mostra
 * "Conectar com número de telefone" e o Flow devolve um código de 8 caracteres
 * para digitar no celular. Regras puras, sem rede.
 */

/** O código do WhatsApp vale poucos minutos; a tela mostra a contagem. */
export const MINUTOS_DO_CODIGO = 2;

/** Número com DDI só com dígitos (12 a 15), ou null. Sem DDI e com 10 ou 11 dígitos, assume Brasil (55). */
export function numeroParaPareamento(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "").replace(/^0+/, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if (digitos.length >= 12 && digitos.length <= 15) return digitos;
  return null;
}

/** Extrai o código de pareamento da resposta do serviço (Evolution: `pairingCode`). */
export function codigoDePareamento(bruto: unknown): string | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const valor = (bruto as Record<string, unknown>)["pairingCode"];
  if (typeof valor !== "string") return null;
  const limpo = valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return limpo.length === 8 ? limpo : null;
}

/** "WZYEH1YY" → "WZYE-H1YY", igual ao que o WhatsApp pede no celular. */
export function formatarCodigo(codigo: string): string {
  return codigo.length === 8 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo;
}
