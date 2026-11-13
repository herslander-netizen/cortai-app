/**
 * Base de conhecimento compacta do Flow Core.
 *
 * Mantém regras/respostas canônicas sem duplicação. A função é pura para poder
 * ser usada em seed, importação, testes e futuramente em uma tabela por tenant.
 */

export type EntradaDeConhecimento = {
  id?: string;
  categoria: "conversa" | "regra" | "faq" | "operacao" | "seguranca";
  gatilhos: string[];
  resposta: string;
  acao?: string | null;
  prioridade?: number;
  origem?: string;
  ativo?: boolean;
};

export type EntradaCanonica = EntradaDeConhecimento & {
  id: string;
  chave: string;
  prioridade: number;
  ativo: boolean;
};

export function normalizarConhecimento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chaveDaEntrada(entrada: EntradaDeConhecimento): string {
  const gatilhos = [...new Set(entrada.gatilhos.map(normalizarConhecimento).filter(Boolean))].sort();
  return [
    entrada.categoria,
    entrada.acao ?? "",
    gatilhos.join("|"),
    normalizarConhecimento(entrada.resposta),
  ].join("::");
}

function idDaChave(chave: string, indice: number): string {
  let hash = 2166136261;
  for (const caractere of chave) {
    hash ^= caractere.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `core-${(hash >>> 0).toString(36)}-${indice}`;
}

/**
 * Descarta duplicatas exatas de regra + gatilhos + resposta.
 * Em empate, mantém a primeira entrada: a ordem do documento é a fonte de
 * decisão e evita que uma importação posterior substitua uma regra aprovada.
 */
export function compactarConhecimento(
  entradas: EntradaDeConhecimento[],
): EntradaCanonica[] {
  const vistas = new Set<string>();
  const resultado: EntradaCanonica[] = [];

  for (const entrada of entradas) {
    const gatilhos = [...new Set(entrada.gatilhos.map(normalizarConhecimento).filter(Boolean))];
    const resposta = entrada.resposta.trim();
    if (!gatilhos.length || !resposta) continue;

    const normalizada = {
      ...entrada,
      gatilhos,
      resposta,
      prioridade: entrada.prioridade ?? 0,
      ativo: entrada.ativo ?? true,
    };
    const chave = chaveDaEntrada(normalizada);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    resultado.push({
      ...normalizada,
      id: entrada.id || idDaChave(chave, resultado.length),
      chave,
    });
  }

  return resultado.sort((a, b) => b.prioridade - a.prioridade);
}

/** Retorna só a diferença que ainda não existe na base atual. */
export function novidadesDoConhecimento(
  atual: EntradaDeConhecimento[],
  propostas: EntradaDeConhecimento[],
): EntradaCanonica[] {
  const existentes = new Set(compactarConhecimento(atual).map((x) => x.chave));
  return compactarConhecimento(propostas).filter((x) => !existentes.has(x.chave));
}
