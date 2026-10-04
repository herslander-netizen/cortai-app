/**
 * Avisos operacionais da equipe também pelo WhatsApp, para quem ligou a opção
 * "WhatsApp" nas preferências e confirmou o número. O sininho continua sendo a
 * fonte da verdade; aqui é só mais um canal do mesmo evento.
 *
 * Fora da janela de 24h a Meta exige modelo aprovado: sem ele, o envio falha
 * em silêncio e o aviso segue no sininho/push. Nunca lança.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function avisarEquipePorWhatsapp(input: {
  tenantId: string;
  agendamentoId: string;
  tipo: string;
  inicio: string;
  userIds: string[];
  texto: string;
}): Promise<number> {
  if (!input.userIds.length || !input.texto) return 0;
  try {
    const db = await admin();
    const [{ data: prefs }, { data: tels }] = await Promise.all([
      db
        .from("notificacoes_preferencias")
        .select("user_id")
        .eq("tenant_id", input.tenantId)
        .eq("tipo", input.tipo)
        .eq("no_whatsapp", true)
        .in("user_id", input.userIds),
      db
        .from("telefones_da_equipe")
        .select("user_id, telefone")
        .in("user_id", input.userIds)
        .not("verificado_em", "is", null),
    ]);
    const querem = new Set((prefs ?? []).map((p) => p.user_id));
    const alvos = (tels ?? []).filter((t) => querem.has(t.user_id) && t.telefone);
    if (!alvos.length) return 0;
    const { conexaoDeEnvio } = await import("./conexao-envio.server");
    const conexao = await conexaoDeEnvio(input.tenantId);
    if (!conexao) return 0;
    const { conversaDoTelefone, enviarPelaBarbearia } = await import("./fluxo.server");
    let enviados = 0;
    for (const alvo of alvos) {
      const chave = `wa:${input.agendamentoId}:${input.tipo}:${input.inicio}:${alvo.user_id}`;
      const { error: repetido } = await db.from("push_entregas").insert({ chave });
      if (repetido) continue;
      try {
        const conversa = await conversaDoTelefone({
          tenantId: input.tenantId,
          conexaoId: conexao.id,
          telefone: alvo.telefone!,
          nomeContato: null,
        });
        await enviarPelaBarbearia({
          tenantId: input.tenantId,
          conversaId: conversa.id,
          conexaoId: conexao.id,
          sessaoId: conexao.sessao_id,
          telefone: alvo.telefone!,
          texto: input.texto,
          porIa: false,
          iniciadaPelaBarbearia: true,
        });
        enviados += 1;
      } catch {
        /* janela fechada ou falha de canal: o aviso segue no sininho/push */
      }
    }
    return enviados;
  } catch {
    return 0;
  }
}
