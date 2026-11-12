/**
 * Uma negativa comprovada de canal não é equivalente a uma falha temporária
 * em consultar o banco de consentimento. Em caso de dúvida, não enviar e
 * manter a reserva até resolução/expiração; jamais pular a vez silenciosamente.
 */
export function classificarImpedimentoDeOferta(
  motivo: string,
): "sem_canal" | "incerta" {
  if (
    motivo === "Não foi possível confirmar o consentimento agora." ||
    motivo === "Cliente não encontrado."
  ) {
    return "incerta";
  }
  return "sem_canal";
}
