/**
 * Remetente de qualquer envio do negócio, com reserva:
 * (a) conexão própria, conectada e não compartilhada;
 * (b) senão, o número oficial do Cortaí (conexão compartilhada) — criada
 *     automaticamente para o negócio que ainda não tem linha;
 * (c) senão, nenhuma: quem chama registra "Nenhum WhatsApp disponível".
 *
 * Cada conexão carrega o próprio `provedor` (evolution/meta): o envio usa o
 * serviço da conexão escolhida, nunca o de outro negócio.
 */
import { logConexao, podeEnviarPelaConexao } from "./saude-conexao";
import {
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
    const { data: tenant } = await db
      .from("tenants")
      .select("notificacoes_whatsapp_ativas, notificacoes_central_habilitada")
      .eq("id", tenantId)
      .maybeSingle();
    const centralHabilitada = tenant?.notificacoes_central_habilitada === true;
    const { data: central } = centralHabilitada
      ? await db
          .from("conexoes_whatsapp")
          .select("id, sessao_id, status, compartilhada, provedor, tipo, escopo, tenant_id")
          .eq("escopo", "central")
          .maybeSingle()
      : { data: null };
    const decisao = escolherConexaoDeNotificacao({
      linhasDoTenant: linhas ?? [],
      central: central ?? null,
      ativas: tenant?.notificacoes_whatsapp_ativas !== false,
      centralHabilitada,
    });
    if (decisao.tipo === "desativado") {
      logConexao("envio_notificacoes_desativadas", { tenantId });
      return null;
    }
    if (decisao.tipo === "propria" || decisao.tipo === "central") {
      const c = decisao.conexao;
      if (decisao.tipo === "central") logConexao("envio_pela_central", { tenantId });
      return {
        id: c.id,
        sessao_id: c.sessao_id,
        compartilhada: false,
        provedor: c.provedor ?? null,
        central: decisao.tipo === "central",
      };
    }
    if (decisao.tipo === "falha") {
      logConexao("envio_notificacoes_indisponivel", { tenantId, motivo: decisao.motivo });
      if (decisao.avisar === "dono")
        await sinalizarFalhaDaFinalidade(tenantId, "notificacoes").catch(() => undefined);
      else await alertarPlataformaCentral(tenantId).catch(() => undefined);
      return null;
    }
    // legado: segue a regra anterior abaixo.
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
  const propria = escolha.propriaExistente ? { status: escolha.motivo } : null;

  const { data: oficial } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, provedor, numero, nome_exibicao, meta_phone_number_id")
    .eq("compartilhada", true)
    .eq("status", "conectado")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!oficial) return null;
  const doOficial = { compartilhada: true, provedor: oficial.provedor ?? null };

  // Já tem linha própria (desconectada): não sobrescreve; usa o número oficial.
  if (propria) {
    logConexao("envio_pela_reserva", { tenantId, finalidade, motivo: propria.status });
    return { id: oficial.id, sessao_id: oficial.sessao_id, ...doOficial };
  }

  const { data: criada, error } = await db
    .from("conexoes_whatsapp")
    .insert({
      tenant_id: tenantId,
      provedor: oficial.provedor,
      sessao_id: `cortai_oficial_${tenantId.replace(/-/g, "").slice(0, 12)}`,
      numero: oficial.numero,
      nome_exibicao: oficial.nome_exibicao,
      meta_phone_number_id: oficial.meta_phone_number_id,
      compartilhada: true,
      status: "conectado",
      conectado_em: new Date().toISOString(),
    })
    .select("id, sessao_id")
    .single();
  if (error || !criada) {
    // Corrida com outra execução: relê a linha criada.
    const { data: relida } = await db
      .from("conexoes_whatsapp")
      .select("id, sessao_id, status")
      .eq("tenant_id", tenantId)
      .eq("compartilhada", true)
      .limit(1)
      .maybeSingle();
    if (relida?.status === "conectado")
      return { id: relida.id, sessao_id: relida.sessao_id, ...doOficial };
    return { id: oficial.id, sessao_id: oficial.sessao_id, ...doOficial };
  }
  return { id: criada.id, sessao_id: criada.sessao_id, ...doOficial };
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
 * sessão de outro (exceto o número oficial compartilhado). Lança se a sessão
 * não existe ou pertence a outro negócio.
 */
export async function gatewayDaSessao(sessaoId: string, tenantId: string) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("tenant_id, compartilhada, provedor")
    .eq("sessao_id", sessaoId)
    .maybeSingle();
  if (!podeEnviarPelaConexao(data, tenantId)) {
    logConexao("envio_bloqueado_isolamento", { tenantId, sessaoId });
    throw new Error("Sessão de WhatsApp não pertence a este negócio.");
  }
  const { gatewayDoProvedor } = await import("./gateway.server");
  return gatewayDoProvedor(data?.provedor ?? null);
}
