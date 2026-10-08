/** Regra pura da Central de Segurança da Conta (calculada só no servidor). */
export type PapelDaConta = "dono" | "profissional" | "cliente";

export function calcularContaVerificada(input: {
  papel: PapelDaConta;
  emailVerificado: boolean;
  whatsappVerificado: boolean;
}): boolean {
  if (!input.emailVerificado) return false;
  // Cliente não precisa de WhatsApp; equipe precisa de e-mail + WhatsApp verificado.
  if (input.papel === "cliente") return true;
  return input.whatsappVerificado;
}

/** Mostra só os 4 últimos dígitos. */
export function mascararTelefone(telefone: string | null): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 4) return null;
  return `•••• ${digitos.slice(-4)}`;
}
