/**
 * Uma negativa COMPROVADA de contato/consentimento libera a vez na fila.
 * Se o porteiro ou o consentimento retornar erro desconhecido, preservar a
 * oferta até reconciliação/expiração. Um erro novo não comprova ausência de canal.
 *
 * Lista alinhada aos retornos efetivos de:
 *   whatsapp/porteiro.ts (podeMandarWhatsapp)
 *   whatsapp/consentimento.ts (decidirConsentimentoWhatsapp)
 *   whatsapp/consentimento.server.ts (telefone inválido)
 */
const NEGATIVAS_CONFIRMADAS = new Set([
  "Cliente sem WhatsApp válido.",
  "Telefone do cliente sem WhatsApp.",
  "A pessoa avisou que o número é errado.",
  "O cliente pediu para não receber mensagens (SAIR).",
  "Telefone não confirmado pelo cliente.",
  "Cliente sem consentimento para lembretes.",
  "Este telefone pediu para interromper as mensagens automáticas.",
  "Não existe consentimento válido para esta finalidade.",
  // Compatibilidade com versões anteriores do verificador de consentimento.
  "Sem consentimento para lista de espera.",
]);

export function classificarImpedimentoDeOferta(
  motivo: string,
): "sem_canal" | "incerta" {
  return NEGATIVAS_CONFIRMADAS.has(motivo.trim()) ? "sem_canal" : "incerta";
}
