/**
 * Busca de endereço por CEP (dono, 06/11/2026: "na parte de localização, pesquisa por CEP para achar o bairro e
 * adiantar as configurações"). Usa o ViaCEP público (sem chave, sem custo). Falha nunca bloqueia: quem configura
 * continua podendo digitar o endereço à mão.
 */
export type EnderecoDoCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/** Só dígitos, no máximo 8. */
export function digitosDoCep(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 8);
}

/** "49000000" → "49000-000" enquanto digita. */
export function mascaraCep(valor: string): string {
  const d = digitosDoCep(valor);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** "Rua das Acácias, 120 — Jardins, Aracaju/SE". Sem número: "s/n" só se a rua existir. */
export function montarEndereco(e: EnderecoDoCep, numero: string): string {
  const n = numero.trim();
  const rua = e.logradouro ? `${e.logradouro}, ${n || "s/n"}` : n;
  const lugar = [e.bairro, e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade]
    .filter(Boolean)
    .join(", ");
  return [rua, lugar].filter(Boolean).join(" — ");
}

/** Consulta o ViaCEP. `null` = CEP inexistente ou serviço fora do ar (a tela diz para digitar à mão). */
export async function buscarCep(
  cep: string,
  buscar: typeof fetch = fetch,
): Promise<EnderecoDoCep | null> {
  const d = digitosDoCep(cep);
  if (d.length !== 8) return null;
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), 6000);
  try {
    const r = await buscar(`https://viacep.com.br/ws/${d}/json/`, { signal: controle.signal });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    if (j["erro"]) return null;
    const texto = (k: string) => (typeof j[k] === "string" ? (j[k] as string).trim() : "");
    return {
      cep: `${d.slice(0, 5)}-${d.slice(5)}`,
      logradouro: texto("logradouro"),
      bairro: texto("bairro"),
      cidade: texto("localidade"),
      uf: texto("uf"),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}
