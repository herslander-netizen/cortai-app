/**
 * Central de automação do WhatsApp: estado real (derivado no backend) e o interruptor da IA.
 * O interruptor é `config_atendimento_ia.responder_whatsapp`, que o atendimento por IA já
 * respeita; ligar/desligar não mexe no pareamento, na conexão, nos avisos nem na agenda.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirRecurso } from "@/lib/planos";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import type { CentralDeAutomacao } from "@/lib/whatsapp/central-automacao";
import type { OcorrenciaDaCentral } from "@/lib/whatsapp/central-historico";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type DadosDaCentral = {
  central: CentralDeAutomacao;
  historico: OcorrenciaDaCentral[];
  podeGerenciar: boolean;
  /** O alerta externo (sininho/push do gestor) é o canal independente do WhatsApp. */
  canalDeAlerta: "sininho_e_push";
  geradoEm: string;
};

export async function carregarCentral(
  tenantId: string,
): Promise<Omit<DadosDaCentral, "podeGerenciar">> {
  const db = await admin();
  const agora = new Date();
  const [{ data: linhas }, { data: config }, { data: tenant }] = await Promise.all([
    db
      .from("conexoes_whatsapp")
      .select(
        "id, sessao_id, status, numero, verificado_em, visto_em, conectado_em, tipo, compartilhada, escopo, tenant_id",
      )
      .eq("tenant_id", tenantId)
      .eq("escopo", "tenant"),
    db
      .from("config_atendimento_ia")
      .select("responder_whatsapp, ia_pausada_em, ia_pausa_motivo")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    db.from("tenants").select("notificacoes_whatsapp_ativas").eq("id", tenantId).maybeSingle(),
  ]);
  const { conexaoPrincipal } = await import("@/lib/whatsapp/finalidade-conexao");
  const principal = conexaoPrincipal(
    (linhas ?? []).map((l) => ({
      ...l,
      status: l.status as string | null,
    })),
  );
  const [{ iaDisponivel }, { gatewayConfigurado }, { whatsappLiberadoNoPlano }, incidentes] =
    await Promise.all([
      import("@/lib/brain/gateway.server"),
      import("@/lib/whatsapp/gateway.server"),
      import("@/lib/whatsapp/fluxo.server"),
      import("@/lib/whatsapp/incidente-evolution.server"),
    ]);
  const ultimo = principal
    ? await incidentes.ultimoEventoDoServico(tenantId, principal.sessao_id)
    : { evento: null, em: null };
  const { derivarCentral } = await import("@/lib/whatsapp/central-automacao");
  const central = derivarCentral({
    conexao: principal
      ? {
          status: String(principal.status ?? "desconectado"),
          numero: principal.numero ?? null,
          verificadoEm: principal.verificado_em ?? null,
          vistoEm: principal.visto_em ?? null,
          conectadoEm: principal.conectado_em ?? null,
        }
      : null,
    automacaoLigada: config?.responder_whatsapp ?? true,
    iaPausadaEm: config?.ia_pausada_em ?? null,
    iaPausaMotivo: config?.ia_pausa_motivo ?? null,
    iaNoServidor: iaDisponivel(),
    planoLibera: await whatsappLiberadoNoPlano(tenantId),
    avisosAtivos: tenant?.notificacoes_whatsapp_ativas !== false,
    servicoConfigurado: gatewayConfigurado("evolution"),
    ultimoEventoDoServico: ultimo.evento,
    ultimoEventoDoServicoEm: ultimo.em,
    agora,
  });

  const { ACOES_DO_HISTORICO, ocorrenciaDaAuditoria } =
    await import("@/lib/whatsapp/central-historico");
  const { data: eventos } = await db
    .from("auditoria_da_barbearia")
    .select("id, acao, criado_em, detalhes")
    .eq("tenant_id", tenantId)
    .in("acao", [...ACOES_DO_HISTORICO])
    .order("criado_em", { ascending: false })
    .limit(30);
  const historico = (eventos ?? [])
    .map((e) =>
      ocorrenciaDaAuditoria({
        id: e.id as string,
        acao: e.acao as string,
        criado_em: e.criado_em as string,
        detalhes: (e.detalhes ?? null) as Record<string, unknown> | null,
      }),
    )
    .filter((o): o is OcorrenciaDaCentral => o !== null)
    .slice(0, 12);

  return { central, historico, canalDeAlerta: "sininho_e_push", geradoEm: agora.toISOString() };
}

export const getCentralDeAutomacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosDaCentral> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const { data: pode } = await context.supabase.rpc("has_tenant_permission", {
      _tenant_id: tenantId,
      _permission: "gerenciar_whatsapp",
    });
    const dados = await carregarCentral(tenantId);
    return { ...dados, podeGerenciar: pode === true };
  });

const interruptorSchema = z.object({
  /** Valor desejado. */
  ativa: z.boolean(),
  /** Valor que a tela viu antes de pedir: protege contra duas alterações ao mesmo tempo. */
  anterior: z.boolean(),
});

export type ResultadoDoInterruptor =
  | { ok: true; ativa: boolean }
  | { ok: false; motivo: "conflito" | "erro"; ativa: boolean; mensagem: string };

/**
 * Liga ou desliga a IA no WhatsApp. Validado no backend (login, permissão, plano), gravado só
 * se o valor atual ainda for o que a tela viu e, em qualquer falha, o estado anterior fica.
 */
export const definirAutomacaoWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => interruptorSchema.parse(d))
  .handler(async ({ context, data }): Promise<ResultadoDoInterruptor> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
    const db = await admin();
    const { aplicarInterruptor } = await import("@/lib/whatsapp/interruptor-automacao");
    const r = await aplicarInterruptor(db as never, tenantId, data.ativa, data.anterior);
    if (r.ok) {
      await Promise.resolve(
        db.from("auditoria_da_barbearia").insert({
          tenant_id: tenantId,
          ator_user_id: context.userId,
          acao: data.ativa ? "cortai.automacao_ativada" : "cortai.automacao_desativada",
          alvo: tenantId,
          detalhes: { de: data.anterior, para: data.ativa } as never,
        }),
      ).catch(() => undefined);
    }
    return r;
  });
