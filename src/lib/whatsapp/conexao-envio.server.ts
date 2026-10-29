/**
 * Remetente de qualquer envio iniciado pelo Flow: a conexão principal do próprio negócio,
 * conectada e não compartilhada. Sem ela, não há envio (retorna null) — nunca existe troca
 * silenciosa para outro número, nem para o oficial compartilhado, e nenhuma linha é criada
 * automaticamente. Quem chama registra "Nenhum WhatsApp disponível".
 *
 * Cada conexão carrega o próprio `provedor` (evolution/meta): o envio usa o serviço da
 * conexão escolhida, nunca o de outro negócio.
 */
import { logConexao, podeEnviarPelaConexao } from "./saude-conexao";
import {
  escolherConexaoDeNotificacao,
  escolherConexaoPorFinalidade,
  mensagemDeFalhaDaFinalidade,
  ROTULO_DO_TIPO,
  type TipoDeConexao,
} from "./finalidade-conexao";

export type ConexaoDeEnvio = {
  id: string;
  sessao_id: string;
  compartilhada: boolean;
  provedor: string | null;
  /** Conexão Central da plataforma (notificações). */
  central?: boolean;
};

export const SEM_WHATSAPP_DISPONIVEL = "Nenhum WhatsApp disponível.";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Remetente por finalidade. Com duas conexões próprias, nunca troca uma pela
 * outra: a falha é registrada e o negócio é avisado (ver finalidade-conexao.ts).
 * Sem finalidade informada vale "atendimento" (comportamento anterior).
 */
export async function conexaoDeEnvio(
  tenantId: string,
  finalidade: TipoDeConexao = "atendimento",
): Promise<ConexaoDeEnvio | null> {
  const db = await admin();
  const { data: linhas } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status, compartilhada, provedor, tipo, escopo, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("escopo", "tenant");
  if (finalidade === "notificacoes") {
    // Central de Notificações = interruptor do negócio sobre a conexão principal.
    const { data: tenant } = await db
      .from("tenants")
      .select("notificacoes_whatsapp_ativas")
      .eq("id", tenantId)
      .maybeSingle();
    const decisao = escolherConexaoDeNotificacao({
      ativas: tenant?.notificacoes_whatsapp_ativas !== false,
    });
    if (decisao.tipo === "desativado") {
      logConexao("envio_notificacoes_desativadas", { tenantId });
      return null;
    }
  }
  const escolha = escolherConexaoPorFinalidade(linhas ?? [], finalidade);
  if (escolha.tipo === "propria") {
    const c = escolha.conexao;
    if (escolha.legado) logConexao("envio_conexao_unica_legado", { tenantId, finalidade });
    return {
      id: c.id,
      sessao_id: c.sessao_id,
      compartilhada: c.compartilhada === true,
      provedor: c.provedor ?? null,
    };
  }
  if (escolha.tipo === "falha") {
    logConexao("envio_finalidade_indisponivel", { tenantId, finalidade, motivo: escolha.motivo });
    await sinalizarFalhaDaFinalidade(tenantId, finalidade).catch(() => undefined);
    return null;
  }
  // Sem conexão própria conectada: nada sai. Não há reserva nem número compartilhado; a falha
  // fica registrada e o negócio é avisado (no máximo uma vez por hora).
  logConexao("envio_bloqueado_sem_conexao_propria", {
    tenantId,
    finalidade,
    motivo: escolha.motivo,
  });
  await sinalizarFalhaDaFinalidade(tenantId, finalidade).catch(() => undefined);
  return null;
}

/** Aviso único por hora ao negócio: a conexão da finalidade está fora do ar. */
async function sinalizarFalhaDaFinalidade(tenantId: string, finalidade: TipoDeConexao) {
  const { emitirAviso } = await import("@/lib/avisos/emitir.server");
  const hora = new Date().toISOString().slice(0, 13);
  await emitirAviso({
    tenantId,
    evento: "whatsapp_conexao",
    titulo: `${ROTULO_DO_TIPO[finalidade]} indisponível`,
    corpo: mensagemDeFalhaDaFinalidade(finalidade),
    link: "/barbeiro/cortai",
    referencia: `${tenantId}:${finalidade}`,
    versao: `finalidade-${hora}`,
    alvos: [{ destinatario: "gestor" }],
  });
}

/**
 * Gateway da sessão, com trava de isolamento: um negócio nunca envia pela
 * sessão de outro (exceto o número oficial compartilhado). A linha legada da
 * plataforma (`escopo='central'`) nunca envia por negócio. Lança se a sessão
 * não existe ou pertence a outro negócio.
 */
export async function gatewayDaSessao(sessaoId: string, tenantId: string) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("tenant_id, compartilhada, provedor, escopo")
    .eq("sessao_id", sessaoId)
    .maybeSingle();
  const permitido = data?.escopo !== "central" && podeEnviarPelaConexao(data, tenantId);
  if (!permitido) {
    logConexao("envio_bloqueado_isolamento", { tenantId, sessaoId });
    throw new Error("Sessão de WhatsApp não pertence a este negócio.");
  }
  const { gatewayDoProvedor } = await import("./gateway.server");
  return gatewayDoProvedor(data?.provedor ?? null);
}
