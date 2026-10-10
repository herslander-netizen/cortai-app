/** Regras puras do que ainda falta antes de publicar e do que conta como alteração pendente. */

export type Lacuna = {
  chave: "servicos" | "profissionais" | "horarios";
  rotulo: string;
  destino: "/barbeiro/servicos" | "/barbeiro/profissionais" | "/barbeiro/horarios";
};

export function mesmoConteudo(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Há alteração pendente quando o rascunho foi mexido depois da publicação E o conteúdo é
 * diferente do publicado. Salvar sem mudar nada, ou descartar, deixa de contar como pendência.
 */
export function haAlteracoesPendentes(
  linha: {
    updated_at: string | null;
    published_at: string | null;
    draft_config: unknown;
    published_config: unknown;
  } | null,
) {
  if (!linha) return false;
  if (linha.updated_at === linha.published_at) return false;
  return !mesmoConteudo(linha.draft_config, linha.published_config);
}

/** O que impede o cliente de agendar pela página. Aviso, nunca bloqueio. */
export function lacunasDaPagina(contagem: {
  servicosAtivos: number;
  profissionais: number;
  diasAbertos: number;
}): Lacuna[] {
  const lista: Lacuna[] = [];
  if (contagem.servicosAtivos === 0)
    lista.push({
      chave: "servicos",
      rotulo: "Nenhum serviço ativo: o cliente não consegue escolher o que agendar.",
      destino: "/barbeiro/servicos",
    });
  if (contagem.profissionais === 0)
    lista.push({
      chave: "profissionais",
      rotulo: "Nenhum profissional cadastrado: não há quem receba o agendamento.",
      destino: "/barbeiro/profissionais",
    });
  if (contagem.diasAbertos === 0)
    lista.push({
      chave: "horarios",
      rotulo: "Nenhum dia aberto nos horários: não há horário para oferecer.",
      destino: "/barbeiro/horarios",
    });
  return lista;
}
