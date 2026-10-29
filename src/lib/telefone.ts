/**
 * Padrão de telefone do Flow: só dígitos, com DDI 55 para números
 * brasileiros. Celular com e sem o 9 depois do DDD é o mesmo número.
 */
export function normalizarTelefone(bruto: string | null | undefined): string {
  let d = String(bruto ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}

/** Formas equivalentes do mesmo número (com e sem o 9), já normalizadas. */
export function variantesDoTelefone(bruto: string | null | undefined): string[] {
  const n = normalizarTelefone(bruto);
  if (!n.startsWith("55")) return n ? [n] : [];
  const ddd = n.slice(2, 4);
  const resto = n.slice(4);
  const formas = new Set<string>([n]);
  if (resto.length === 9 && resto.startsWith("9")) formas.add(`55${ddd}${resto.slice(1)}`);
  if (resto.length === 8 && /^[6-9]/.test(resto)) formas.add(`55${ddd}9${resto}`);
  // Cadastros antigos sem DDI continuam sendo encontrados.
  for (const f of [...formas]) formas.add(f.slice(2));
  return [...formas];
}

export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const vb = new Set(variantesDoTelefone(b));
  return variantesDoTelefone(a).some((v) => vb.has(v));
}
