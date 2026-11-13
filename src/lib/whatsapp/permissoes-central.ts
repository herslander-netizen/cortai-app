/**
 * Direitos da Central separados de `gerenciar_whatsapp` (conectar número).
 * O Flow já possui as permissões assumir_conversa e gerenciar_conversas.
 */
export type AcaoDaCentral = "assumir" | "retomar" | "resolver";
export type PermissoesDaCentral = { podeAssumir: boolean; podeGerenciar: boolean };

export function podeComandarConversa(
  permissoes: PermissoesDaCentral,
  acao: AcaoDaCentral,
): boolean {
  if (acao === "resolver") return permissoes.podeGerenciar;
  // Uma equipe que organiza conversas também pode assumir/liberar; não
  // exige a permissão de configurar o WhatsApp da empresa.
  return permissoes.podeAssumir || permissoes.podeGerenciar;
}
