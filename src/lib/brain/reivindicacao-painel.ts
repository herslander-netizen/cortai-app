/**
 * Reivindicação exclusiva de uma ação pendente no painel.
 *
 * Sem prova de atualização atômica, o pedido NUNCA pode ser executado.
 * Um erro de rede ou falta do ID da mensagem NÃO equivale a autorização.
 */
export type BancoDaReivindicacao = {
  from: (tabela: "mensagens_de_ia") => any;
};

export async function reivindicarPendentePainel(
  db: BancoDaReivindicacao,
  entrada: {
    mensagemId: string | null | undefined;
    tenantId: string;
    pendenteId: string;
    acaoDaMensagem: unknown;
  },
): Promise<boolean> {
  const { mensagemId, tenantId, pendenteId, acaoDaMensagem } = entrada;
  if (!mensagemId || !tenantId || !pendenteId) {
    throw new Error("Não foi possível verificar a confirmação; nenhuma ação foi executada.");
  }
  if (!acaoDaMensagem || typeof acaoDaMensagem !== "object" || Array.isArray(acaoDaMensagem)) {
    throw new Error("Dados da ação pendente indisponíveis; nenhuma ação foi executada.");
  }
  const { data, error } = await db
    .from("mensagens_de_ia")
    .update({
      acao: { ...(acaoDaMensagem as Record<string, unknown>), pendente: null },
    })
    .eq("id", mensagemId)
    .eq("tenant_id", tenantId)
    .eq("acao->pendente->>id", pendenteId)
    .select("id");
  if (error) throw new Error("Não foi possível reservar a confirmação; nenhuma ação foi executada.");
  // Disputa concorrente: só a requisição que consumiu a pendente recebe uma linha.
  return Array.isArray(data) && data.length === 1 && data[0]?.id === mensagemId;
}
