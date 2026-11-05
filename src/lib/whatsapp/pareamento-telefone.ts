/**
 * Conexão por número de telefone (alternativa ao QR Code): o WhatsApp mostra
 * "Conectar com número de telefone" e o Flow devolve um código de 8 caracteres
 * para digitar no celular. Regras puras, sem rede.
 */

/**
 * A Evolution troca o QR — e, junto, o código por número — a cada ~45 s (visto nos logs de 05/11/2026). Um código
 * trocado é recusado pelo celular: a tela mostra sempre o código atual e conta esse tempo.
 */
export const SEGUNDOS_DE_CADA_CODIGO = 45;

export type EstadoDoCodigo =
  | { estado: "aguardando"; codigo: string | null }
  | { estado: "conectado" }
  | { estado: "encerrado" };

/**
 * Número com DDI só com dígitos (12 a 15), ou null. Sem DDI e com 10 ou 11 dígitos, assume Brasil (55).
 * Celular brasileiro de DDD 31 em diante: o WhatsApp registra o número SEM o 9 extra (55 79 9178-7208), e o código
 * de pareamento só vale para o número exatamente como o WhatsApp o conhece — com o 9, o celular recusa o código.
 * DDD 11 a 28 mantêm o 9.
 */
export function numeroParaPareamento(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "").replace(/^0+/, "");
  let numero: string | null = null;
  if (digitos.length === 10 || digitos.length === 11) numero = `55${digitos}`;
  else if (digitos.length >= 12 && digitos.length <= 15) numero = digitos;
  if (!numero) return null;
  const celularBr = numero.match(/^55(\d{2})9(\d{8})$/);
  if (celularBr && Number(celularBr[1]) >= 31) return `55${celularBr[1]}${celularBr[2]}`;
  return numero;
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
