/**
 * Comparações exatas para textos digitados pelo usuário (regras puras, testáveis).
 * Nunca usar texto do usuário como padrão de `ilike`: ali `%`, `_` e `*` são curingas.
 */

/** Mesmo e-mail, sem diferenciar maiúsculas nem espaços nas pontas. */
export function mesmoEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  return x.length > 0 && x === y;
}

/** Código de cupom aceito: só letras, números e hífen (nenhum curinga chega à busca). */
export function codigoDeCupomValido(codigo: string): boolean {
  return /^[A-Za-z0-9-]{2,40}$/.test(codigo.trim());
}
