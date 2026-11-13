/**
 * Transições da Central de Atendimento sobre a conversa oficial.
 * Operação condicional por tenant + conversa + timestamp observado na tela.
 * Não cria status novos nem chama o gateway de mensagens.
 */
export type AcaoDaCentral = "assumir" | "retomar" | "resolver";
export type ResultadoDaCentral = { ok: true } | { ok: false; motivo: "conflito" };

type ErroDaConsulta = { message: string } | null;
type BancoDeComandos = {
  from: (tabela: string) => {
    select: (colunas: string) => {
      eq: (coluna: string, valor: string) => {
        eq: (coluna: string, valor: string) => {
          maybeSingle: () => Promise<{
            data: { id: string; atualizado_em: string } | null;
            error: ErroDaConsulta;
          }>;
        };
      };
    };
    update: (campos: Record<string, unknown>) => {
      eq: (coluna: string, valor: string) => {
        eq: (coluna: string, valor: string) => {
          eq: (coluna: string, valor: string) => {
            select: (colunas: string) => {
              maybeSingle: () => Promise<{
                data: { id: string } | null;
                error: ErroDaConsulta;
              }>;
            };
          };
        };
      };
    };
  };
};

export function camposDaTransicao(acao: AcaoDaCentral): Record<string, unknown> {
  if (acao === "assumir")
    return { status: "humano", modo_humano: true, modo_humano_ate: null };
  if (acao === "resolver")
    return { status: "encerrada", modo_humano: true, modo_humano_ate: null, ia_ativa: false };
  return { status: "ativa", modo_humano: false, modo_humano_ate: null, ia_ativa: true };
}

export async function aplicarComandoDaCentral(
  db: BancoDeComandos,
  input: { tenantId: string; conversaId: string; atualizadoEm: string; acao: AcaoDaCentral },
): Promise<ResultadoDaCentral> {
  const { data: atual, error: erroLeitura } = await db
    .from("conversas_whatsapp")
    .select("id, atualizado_em")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.conversaId)
    .maybeSingle();
  if (erroLeitura || !atual) throw new Error("Conversa não encontrada neste estabelecimento.");
  if (atual.atualizado_em !== input.atualizadoEm) return { ok: false, motivo: "conflito" };

  const { data: confirmado, error: erroGravacao } = await db
    .from("conversas_whatsapp")
    .update(camposDaTransicao(input.acao))
    .eq("id", input.conversaId)
    .eq("tenant_id", input.tenantId)
    .eq("atualizado_em", input.atualizadoEm)
    .select("id")
    .maybeSingle();
  if (erroGravacao) throw new Error("Não foi possível atualizar o controle humano.");
  if (!confirmado) return { ok: false, motivo: "conflito" };
  return { ok: true };
}
