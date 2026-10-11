/**
 * Busca de cliente por NOME (pura): monta o padrão do banco e filtra o que voltou.
 * O banco recebe um padrão tolerante a acento (vogais viram `_`); quem decide é o filtro
 * em JavaScript, que compara sem acento e sem caixa. Sempre dentro de UM negócio —
 * o filtro de `tenant_id` é aplicado por quem consulta (ver `buscar_cliente_por_nome`).
 */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Palavras úteis do que foi falado: sem acento, só letras/números, mínimo 2 caracteres. */
export function termosDaBusca(nome: string): string[] {
  return semAcento(nome)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 4);
}

/** Padrão `ilike` do maior termo; vogais e "c" viram curinga para casar com acentos e "ç". */
export function padraoDoBanco(termo: string): string {
  return `%${termo.replace(/[aeiouc]/g, "_")}%`;
}

export type CandidatoBruto = { id: string; nome: string | null; telefone: string | null };
export type CandidatoDeCliente = { id: string; nome: string; telefoneFinal: string | null };

/** Todos os termos precisam aparecer no nome; quem começa pelo termo vem primeiro. */
export function filtrarCandidatos(
  brutos: CandidatoBruto[],
  termos: string[],
  maximo = 6,
): { clientes: CandidatoDeCliente[]; total: number } {
  if (!termos.length) return { clientes: [], total: 0 };
  const casados = brutos
    .filter((c) => c.nome && termos.every((t) => semAcento(c.nome!).includes(t)))
    .sort((a, b) => {
      const ap = semAcento(a.nome!).startsWith(termos[0]!) ? 0 : 1;
      const bp = semAcento(b.nome!).startsWith(termos[0]!) ? 0 : 1;
      return ap - bp || a.nome!.localeCompare(b.nome!, "pt-BR");
    });
  return {
    total: casados.length,
    clientes: casados.slice(0, maximo).map((c) => ({
      id: c.id,
      nome: c.nome!,
      // Só o final: distingue homônimos sem expor o telefone inteiro ao modelo.
      telefoneFinal: c.telefone ? c.telefone.replace(/\D/g, "").slice(-4) || null : null,
    })),
  };
}
