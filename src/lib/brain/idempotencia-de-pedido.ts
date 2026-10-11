/**
 * Idempotência por REQUISIÇÃO do chat do painel (voz ou texto), sem migração.
 *
 * O navegador gera um `idDaMensagem` por envio e o reaproveita em nova tentativa (timeout,
 * reenvio do mesmo áudio/texto, duplo clique). Aqui:
 *  - já respondido → devolve a MESMA resposta, sem chamar o modelo nem executar nada de novo;
 *  - em andamento (outra chamada com o mesmo id) → avisa, sem processar em paralelo;
 *  - tentativa anterior que morreu → reprocessa sem duplicar a mensagem da pessoa.
 *
 * Limite honesto: sem um índice único no banco, a disputa "inserir e conferir quem foi
 * primeiro" não é 100% atômica. A segurança de fato contra duplicar horário está na
 * idempotência semântica do agendamento (`agendarComSeguranca`), que vale mesmo se duas
 * chamadas passarem por aqui ao mesmo tempo.
 */
export const JANELA_EM_ANDAMENTO_MS = 90_000;

type Linha = {
  id: string;
  autor: string;
  conteudo: string;
  acao: Record<string, unknown> | null;
  criado_em: string;
};

export type ResultadoDoPedido =
  | { tipo: "novo"; usuarioMsgId: string }
  | { tipo: "repetido"; resposta: Record<string, unknown> }
  | { tipo: "em_andamento" };

/** O mínimo do cliente de banco usado aqui (facilita o teste com um banco simulado). */
export type BancoDeMensagens = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente de banco encadeável
  from: (tabela: "mensagens_de_ia") => any;
};

/** Tira do que vai para a tela os campos internos de controle. */
export function respostaPublica(acao: Record<string, unknown>): Record<string, unknown> {
  const { pendente: _p, idDaMensagem: _i, origem: _o, falhou: _f, ...resto } = acao;
  void _p;
  void _i;
  void _o;
  void _f;
  return resto;
}

export async function reivindicarPedido(
  db: BancoDeMensagens,
  a: {
    tenantId: string;
    conversaId: string;
    idDaMensagem: string;
    origem: "texto" | "voz";
    mensagem: string;
    agora?: number;
  },
): Promise<ResultadoDoPedido> {
  const agora = a.agora ?? Date.now();
  const tabela = () => db.from("mensagens_de_ia");

  const { data: marcadas, error } = await tabela()
    .select("id, autor, conteudo, acao, criado_em")
    .eq("conversa_id", a.conversaId)
    .eq("tenant_id", a.tenantId)
    .eq("acao->>idDaMensagem", a.idDaMensagem)
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const linhas = (marcadas ?? []) as Linha[];

  const resposta = linhas.find((l) => l.autor === "assistente");
  if (resposta?.acao) return { tipo: "repetido", resposta: respostaPublica(resposta.acao) };

  const usuario = linhas.find((l) => l.autor === "barbeiro");
  if (usuario) {
    const idade = agora - Date.parse(usuario.criado_em);
    if (!usuario.acao?.["falhou"] && idade < JANELA_EM_ANDAMENTO_MS)
      return { tipo: "em_andamento" };
    // A tentativa anterior morreu antes de responder: reprocessa, sem repetir a fala da pessoa.
    await tabela()
      .update({ acao: { ...usuario.acao, falhou: false } })
      .eq("id", usuario.id)
      .eq("tenant_id", a.tenantId);
    return { tipo: "novo", usuarioMsgId: usuario.id };
  }

  const { data: criada, error: erroInsercao } = await tabela()
    .insert({
      conversa_id: a.conversaId,
      tenant_id: a.tenantId,
      autor: "barbeiro",
      conteudo: a.mensagem,
      acao: { idDaMensagem: a.idDaMensagem, origem: a.origem },
    })
    .select("id")
    .single();
  if (erroInsercao || !criada)
    throw new Error(erroInsercao?.message ?? "Não consegui registrar o pedido.");

  // Duas chamadas com o mesmo id: vence quem entrou primeiro; a outra recua e some do histórico.
  const { data: primeira } = await tabela()
    .select("id")
    .eq("conversa_id", a.conversaId)
    .eq("tenant_id", a.tenantId)
    .eq("autor", "barbeiro")
    .eq("acao->>idDaMensagem", a.idDaMensagem)
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);
  const primeiro = ((primeira ?? []) as { id: string }[])[0]?.id;
  if (primeiro && primeiro !== criada.id) {
    await tabela().delete().eq("id", criada.id).eq("tenant_id", a.tenantId);
    return { tipo: "em_andamento" };
  }
  return { tipo: "novo", usuarioMsgId: criada.id as string };
}

/** Marca a tentativa como falha para que a nova tentativa (mesmo id) possa reprocessar já. */
export async function marcarPedidoComoFalho(
  db: BancoDeMensagens,
  a: { tenantId: string; usuarioMsgId: string; idDaMensagem: string; origem: "texto" | "voz" },
) {
  await db
    .from("mensagens_de_ia")
    .update({ acao: { idDaMensagem: a.idDaMensagem, origem: a.origem, falhou: true } })
    .eq("id", a.usuarioMsgId)
    .eq("tenant_id", a.tenantId);
}
