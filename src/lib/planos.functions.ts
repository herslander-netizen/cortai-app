/**
 * Planos vistos pela barbearia. Nada aqui inventa preço, limite ou regra
 * comercial: tudo vem de `planos_da_plataforma` e da matriz `recursos_de_plano`,
 * já usadas pelo restante do Flow. Trocar de plano nunca apaga dados.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { capacidadesDoTenant } from "@/lib/capacidades.functions";
import { RECURSOS, type ChaveDeRecurso } from "@/lib/planos";
import type { CapacidadesDoTenant } from "@/lib/capacidades";

export type PlanoDisponivel = {
  chave: string;
  nome: string;
  descricao: string | null;
  precoMensalCentavos: number;
  precoAnualCentavos: number;
  diasTeste: number;
  limites: {
    profissionais: number | null;
    clientes: number | null;
    agendamentosMes: number | null;
    unidades: number | null;
  };
  /** Recursos da matriz liberados neste plano. Ausência = liberado. */
  recursos: { chave: ChaveDeRecurso; rotulo: string; liberado: boolean }[];
};

export type VisaoDePlanos = {
  atual: string;
  podeTrocar: boolean;
  capacidades: CapacidadesDoTenant;
  planos: PlanoDisponivel[];
};

export const getPlanosDaBarbearia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VisaoDePlanos> => {
    const tenantId = await tenantIdDoMembro(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [planosRes, regrasRes, capacidades, permissaoRes] = await Promise.all([
      supabaseAdmin.from("planos_da_plataforma").select("*").eq("ativo", true).order("ordem"),
      supabaseAdmin.from("recursos_de_plano").select("plano, chave, liberado"),
      capacidadesDoTenant(context.supabase, tenantId),
      context.supabase.rpc("has_tenant_permission", {
        _tenant_id: tenantId,
        _permission: "alterar_dados_barbearia",
      }),
    ]);

    const matriz = new Map<string, boolean>();
    for (const r of regrasRes.data ?? []) {
      matriz.set(`${r.plano}:${r.chave}`, Boolean(r.liberado));
    }

    const planos: PlanoDisponivel[] = (planosRes.data ?? []).map((linha: Record<string, any>) => ({
      chave: linha["chave"] as string,
      nome: linha["nome"] as string,
      descricao: (linha["descricao"] as string) ?? null,
      precoMensalCentavos: (linha["preco_mensal_centavos"] as number) ?? 0,
      precoAnualCentavos: (linha["preco_anual_centavos"] as number) ?? 0,
      diasTeste: (linha["dias_teste"] as number) ?? 0,
      limites: {
        profissionais: (linha["limite_profissionais"] as number) ?? null,
        clientes: (linha["limite_clientes"] as number) ?? null,
        agendamentosMes: (linha["limite_agendamentos_mes"] as number) ?? null,
        unidades: (linha["limite_unidades"] as number) ?? null,
      },
      recursos: (Object.keys(RECURSOS) as ChaveDeRecurso[]).map((chave) => ({
        chave,
        rotulo: RECURSOS[chave],
        liberado: matriz.get(`${linha["chave"]}:${chave}`) ?? true,
      })),
    }));

    return {
      atual: capacidades.plano.chave,
      podeTrocar: Boolean(permissaoRes.data),
      capacidades,
      planos,
    };
  });

/** Troca o plano da barbearia. Só muda a chave do plano: nenhum dado é apagado. */
export const escolherPlanoDaBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        chave: z
          .string()
          .trim()
          .regex(/^[a-z0-9_]{2,30}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_plano");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plano } = await supabaseAdmin
      .from("planos_da_plataforma")
      .select("chave, nome, ativo, preco_mensal_centavos")
      .eq("chave", data.chave)
      .maybeSingle();
    if (!plano || plano.ativo === false) throw new Error("Este plano não está disponível.");
    if ((plano.preco_mensal_centavos ?? 0) <= 0)
      throw new Error("Este plano só pode ser atribuído pelo admin.");
    const { configDeCobranca } = await import("@/lib/cobranca.server");
    if ((await configDeCobranca()).ligada) {
      throw new Error(
        "Com a cobrança ligada, o plano pago é ativado pelo pagamento ou pelo teste grátis.",
      );
    }

    const { error } = await context.supabase
      .from("tenants")
      .update({ plano: data.chave })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);

    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "plano.alterado",
      _alvo: data.chave,
      _detalhes: { plano: data.chave },
    });

    return { ok: true, plano: plano.nome as string };
  });
