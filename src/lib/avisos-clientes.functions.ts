/**
 * Avisos e Lembretes "Para clientes", no desenho do Figaro (`NotificationSettingsScreen`): os quatro eventos do
 * agendamento (novo, lembrete, reagendamento, cancelamento) ligados ou desligados por negócio.
 *
 * Usa a mesma fonte que o envio já respeita (`automacoes_de_ia`, ver `automacaoAtiva` em
 * `whatsapp/notificacoes.server.ts`): sem linha gravada vale o padrão da configuração do atendimento. As
 * antecedências do lembrete são as duas que os modelos aprovados suportam: véspera (24 h) e no dia (2 h).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";

export const CHAVES_DOS_AVISOS_DE_CLIENTE = [
  "confirmacao_agendamento",
  "lembrete_24h",
  "lembrete_2h",
  "alteracao_agendamento",
  "cancelamento_agendamento",
] as const;

export type ChaveDeAvisoDeCliente = (typeof CHAVES_DOS_AVISOS_DE_CLIENTE)[number];

export type AvisosDosClientes = {
  ligados: Record<ChaveDeAvisoDeCliente, boolean>;
  /** Interruptor geral do negócio (`tenants.notificacoes_whatsapp_ativas`). */
  whatsappGeral: boolean;
  podeEditar: boolean;
};

export const getAvisosDosClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvisosDosClientes> => {
    const tenantId = await tenantIdDoMembro(context);
    const { configuracaoDoTenant } = await import("@/lib/whatsapp/fluxo.server");
    const [{ data: salvas }, config, { data: tenant }, { data: podeEditar }] = await Promise.all([
      context.supabase
        .from("automacoes_de_ia")
        .select("chave, ativa")
        .eq("tenant_id", tenantId)
        .in("chave", [...CHAVES_DOS_AVISOS_DE_CLIENTE]),
      configuracaoDoTenant(tenantId),
      context.supabase
        .from("tenants")
        .select("notificacoes_whatsapp_ativas")
        .eq("id", tenantId)
        .maybeSingle(),
      context.supabase.rpc("has_tenant_permission", {
        _tenant_id: tenantId,
        _permission: "configurar_automacoes",
      }),
    ]);
    const gravadas = new Map((salvas ?? []).map((a) => [a.chave, a.ativa]));
    // Mesmo padrão do envio (`notificacoes.server.ts`): confirmação e lembretes seguem a configuração do atendimento.
    const padrao = (chave: ChaveDeAvisoDeCliente) =>
      chave === "confirmacao_agendamento"
        ? config.confirmacaoAutomatica
        : chave === "lembrete_24h" || chave === "lembrete_2h"
          ? config.lembretes
          : true;
    const ligados = Object.fromEntries(
      CHAVES_DOS_AVISOS_DE_CLIENTE.map((c) => [c, gravadas.get(c) ?? padrao(c)]),
    ) as Record<ChaveDeAvisoDeCliente, boolean>;
    return {
      ligados,
      whatsappGeral: tenant?.notificacoes_whatsapp_ativas !== false,
      podeEditar: podeEditar === true,
    };
  });

/** Liga/desliga um aviso para clientes. O banco só aceita quem tem `configurar_automacoes` (RLS). */
export const definirAvisoDoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ chave: z.enum(CHAVES_DOS_AVISOS_DE_CLIENTE), ativa: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await context.supabase.from("automacoes_de_ia").upsert(
      {
        tenant_id: tenantId,
        chave: data.chave,
        ativa: data.ativa,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "tenant_id,chave" },
    );
    if (error) throw new Error("Não foi possível salvar este aviso agora.");
    return { ok: true };
  });
