import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fusoDoTenant } from "@/lib/fuso.server";
import { proximasOcorrencias, type PeriodicidadeAgendamento } from "@/lib/recorrencia-agendamento";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const criarSerieAgendamentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        agendamentoId: z.string().uuid(),
        periodicidade: z.enum(["semanal", "quinzenal", "mensal"]),
        quantidade: z.number().int().min(1).max(51),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "agendamento_manual");
    const db = await admin();
    const { data: agendamento, error: buscaErro } = await db
      .from("agendamentos")
      .select("id, tenant_id, cliente_id, profissional_id, servico_id, inicio, status, encaixe")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (buscaErro) throw new Error(buscaErro.message);
    if (!agendamento) throw new Error("Atendimento não encontrado neste negócio.");
    if (!agendamento.cliente_id || !agendamento.profissional_id || !agendamento.servico_id) {
      throw new Error("A repetição exige cliente, profissional e serviço vinculados.");
    }
    if (agendamento.encaixe) throw new Error("Atendimentos avulsos não podem iniciar uma série recorrente.");
    if (["cancelado", "nao_compareceu", "remarcado", "estornado"].includes(agendamento.status)) {
      throw new Error("Um atendimento cancelado ou encerrado sem conclusão não pode iniciar uma série.");
    }

    const inicios = proximasOcorrencias(
      agendamento.inicio,
      data.periodicidade as PeriodicidadeAgendamento,
      data.quantidade,
      await fusoDoTenant(tenantId),
    );
    const { data: resultado, error } = await db.rpc(
      "criar_serie_agendamentos" as never,
      {
        _tenant_id: tenantId,
        _agendamento_base_id: data.agendamentoId,
        _periodicidade: data.periodicidade,
        _inicios: inicios,
        _criado_por: context.userId,
      } as never,
    );
    if (error) {
      if (/horario ja ocupado|horário já ocupado|exclusion_violation/i.test(error.message)) {
        throw new Error("Um dos horários futuros já está ocupado. Nenhum horário desta série foi criado.");
      }
      if (/cliente bloqueado/i.test(error.message)) {
        throw new Error("Este cliente está bloqueado para novos agendamentos.");
      }
      if (/fora do periodo de agendamento|fora do período de agendamento/i.test(error.message)) {
        throw new Error(
          "Uma ou mais datas passam do limite de antecedência configurado pelo negócio. Escolha menos ocorrências para esta série.",
        );
      }
      if (/criar_serie_agendamentos|schema cache|function .* does not exist/i.test(error.message)) {
        throw new Error(
          "A criação de séries está preparada, mas ainda depende da migração do banco. Nenhum horário novo foi criado.",
        );
      }
      throw new Error(error.message);
    }
    const retorno = resultado as unknown as {
      serie_id?: string;
      total_ocorrencias?: number;
    };
    return {
      ok: true,
      serieId: retorno?.serie_id ?? null,
      totalOcorrencias: retorno?.total_ocorrencias ?? inicios.length + 1,
      datas: inicios,
    };
  });
