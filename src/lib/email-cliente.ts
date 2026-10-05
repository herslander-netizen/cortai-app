/** E-mail opcional do cliente: vazio vira null; inválido devolve erro. */
export function normalizarEmailCliente(
  bruto: string | null | undefined,
): { ok: true; email: string | null } | { ok: false; erro: string } {
  const email = String(bruto ?? "").trim().toLowerCase();
  if (!email) return { ok: true, email: null };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { ok: false, erro: "Informe um e-mail válido." };
  return { ok: true, email };
}
