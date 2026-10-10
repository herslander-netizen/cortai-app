/**
 * Gravação do interruptor da IA no WhatsApp (`config_atendimento_ia.responder_whatsapp`),
 * com comparação do valor atual: duas alterações simultâneas nunca deixam o estado inconsistente
 * e qualquer falha preserva o valor anterior.
 */
export type ResultadoDaGravacao =
  | { ok: true; ativa: boolean }
  | { ok: false; motivo: "conflito" | "erro"; ativa: boolean; mensagem: string };

type Cliente = {
  from: (tabela: string) => {
    select: (colunas: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        maybeSingle: () => Promise<{
          data: { responder_whatsapp: boolean | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (campos: Record<string, unknown>) => {
      eq: (
        c: string,
        v: string,
      ) => {
        eq: (
          c2: string,
          v2: boolean,
        ) => {
          select: (colunas: string) => Promise<{
            data: unknown[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    insert: (linha: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

export async function aplicarInterruptor(
  db: Cliente,
  tenantId: string,
  ativa: boolean,
  anterior: boolean,
): Promise<ResultadoDaGravacao> {
  try {
    const { data: atual, error } = await db
      .from("config_atendimento_ia")
      .select("responder_whatsapp")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Sem linha de configuração vale o padrão do atendimento: ligado.
    const valorAtual = atual ? (atual.responder_whatsapp ?? true) : true;
    if (valorAtual !== anterior)
      return {
        ok: false,
        motivo: "conflito",
        ativa: valorAtual,
        mensagem: "O estado mudou em outro lugar. Atualizamos a tela; confira e tente de novo.",
      };
    if (valorAtual === ativa) return { ok: true, ativa };
    if (!atual) {
      const { error: erroInsert } = await db
        .from("config_atendimento_ia")
        .insert({ tenant_id: tenantId, responder_whatsapp: ativa });
      if (erroInsert) throw new Error(erroInsert.message);
      return { ok: true, ativa };
    }
    const { data: linhas, error: erroUpdate } = await db
      .from("config_atendimento_ia")
      .update({ responder_whatsapp: ativa })
      .eq("tenant_id", tenantId)
      .eq("responder_whatsapp", valorAtual)
      .select("tenant_id");
    if (erroUpdate) throw new Error(erroUpdate.message);
    if (!linhas || linhas.length === 0)
      return {
        ok: false,
        motivo: "conflito",
        ativa: valorAtual,
        mensagem: "O estado mudou em outro lugar. Atualizamos a tela; confira e tente de novo.",
      };
    return { ok: true, ativa };
  } catch {
    return {
      ok: false,
      motivo: "erro",
      ativa: anterior,
      mensagem: "Não foi possível concluir a alteração agora. Nada foi mudado.",
    };
  }
}
