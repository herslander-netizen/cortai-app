/**
 * Decide o QR Code que fica gravado após um novo estado da conexão.
 * "connecting" da Evolution não significa QR inexistente: um QR ainda válido
 * é preservado enquanto o pareamento não termina. Conectado ou expirado limpa.
 */
const ESTADOS_DE_PAREAMENTO = new Set(["conectando", "qr_pronto", "pendente"]);

export function qrAposEstado(
  status: string,
  novo: { qrCode?: string | null; qrExpiraEm?: string | null },
  atual: { qr_code?: string | null; qr_expira_em?: string | null } | null,
  agora: number = Date.now(),
): { qr_code: string | null; qr_expira_em: string | null } {
  const vazio = { qr_code: null, qr_expira_em: null };
  if (!ESTADOS_DE_PAREAMENTO.has(status)) return vazio;
  if (novo.qrCode) return { qr_code: novo.qrCode, qr_expira_em: novo.qrExpiraEm ?? null };
  if (atual?.qr_code && qrValido(atual.qr_expira_em, agora)) {
    return { qr_code: atual.qr_code, qr_expira_em: atual.qr_expira_em ?? null };
  }
  return vazio;
}

export function qrValido(expiraEm: string | null | undefined, agora: number = Date.now()) {
  if (!expiraEm) return false;
  const t = Date.parse(expiraEm);
  return Number.isFinite(t) && t > agora;
}
