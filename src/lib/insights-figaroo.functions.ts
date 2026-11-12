/* eslint-disable @typescript-eslint/no-explicit-any -- consulta paginada do Supabase, sem tipos gerados para relações aninhadas */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { intervaloFinanceiroLocal } from "@/lib/financeiro-analise";
import { fusoDoTenant } from "@/lib/fuso.server";
import { hojeNoFuso, isoNoFusoDaBarbearia, somarDias } from "@/lib/horarios";
import {
  calcularDesempenhoInsights,
  type AtendimentoInsights,
  type HorizonteInsights,
} from "@/lib/insights-figaroo";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

const parametros = z.object({
  periodo: z.enum(["hoje", "semana", "mes"]).default("mes"),
  horizonte: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

const TAMANHO = 500;
const MAXIMO_PAGINAS = 40;

/** Paginação real: não apresentar totais parciais como se fossem métricas completas. */
async function carregarTudo<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const todos: T[] = [];
  for (let pagina = 0; pagina < MAXIMO_PAGINAS; pagina++) {
    const { data, error } = await consulta(pagina * TAMANHO, (pagina + 1) * TAMANHO - 1);
    if (error) throw new Error("Não foi possível consultar o desempenho agora.");
    const lote = data ?? [];
    todos.push(...lote);
    if (lote.length < TAMANHO) return todos;
  }
  throw new Error("Volume acima do limite desta consulta. Consulte o histórico por um período menor.");
}

function normalizarAtendimentos(itens: any[]): AtendimentoInsights[] {
  return itens.map((item) => ({
    inicio: String(item.inicio),
    status: String(item.status),
    valorCentavos: Number(item.valor_centavos ?? 0),
    profissionalId: item.profissional_id ?? null,
    profissionalNome: item.profissionais?.nome ?? null,
  }));
}

/**
 * Somente leitura, com tenant e permissão verificados antes de acessar receita.
 * Entradas de caixa são recebimentos. Reservas futuras são apenas previsão.
 */
export const getInsightsFigaroo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => parametros.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");

    const fuso = await fusoDoTenant(tenantId);
    const hoje = hojeNoFuso(fuso);
    const agoraIso = new Date().toISOString();
    const periodo = intervaloFinanceiroLocal(hoje, data.periodo);
    const iso = (dia: string) => isoNoFusoDaBarbearia(dia, "00:00", fuso);
    const atualInicio = iso(periodo.inicio);
    const atualFim = iso(periodo.fim);
    const anteriorInicio = iso(periodo.inicioAnterior);
    const anteriorFim = iso(periodo.fimAnterior);
    const futuroFim = iso(somarDias(hoje, 90));

    const db = context.supabase;
    const entradas = (inicio: string, fim: string) =>
      carregarTudo<any>((de, ate) =>
        db.from("caixa_movimentos")
          .select("id, valor_centavos")
          .eq("tenant_id", tenantId)
          .eq("tipo", "entrada")
          .gte("criado_em", inicio)
          .lt("criado_em", fim)
          .order("criado_em", { ascending: true })
          .order("id", { ascending: true })
          .range(de, ate),
      );

    const [atual, anterior, futuros, faltas] = await Promise.all([
      entradas(atualInicio, atualFim),
      entradas(anteriorInicio, anteriorFim),
      carregarTudo<any>((de, ate) =>
        db.from("agendamentos")
          .select("id, inicio, status, valor_centavos, profissional_id, profissionais(nome)")
          .eq("tenant_id", tenantId)
          .in("status", ["agendado", "chegou", "na_cadeira"])
          .gte("inicio", agoraIso)
          .lt("inicio", futuroFim)
          .order("inicio", { ascending: true })
          .order("id", { ascending: true })
          .range(de, ate),
      ),
      carregarTudo<any>((de, ate) =>
        db.from("agendamentos")
          .select("id, inicio, status, valor_centavos, profissional_id, profissionais(nome)")
          .eq("tenant_id", tenantId)
          .eq("status", "nao_compareceu")
          .gte("inicio", atualInicio)
          .lt("inicio", atualFim)
          .order("inicio", { ascending: true })
          .order("id", { ascending: true })
          .range(de, ate),
      ),
    ]);
    const resultado = calcularDesempenhoInsights({
      atual: atual.map((m) => ({ valorCentavos: m.valor_centavos ?? 0 })),
      anterior: anterior.map((m) => ({ valorCentavos: m.valor_centavos ?? 0 })),
      futuros: normalizarAtendimentos(futuros),
      faltas: normalizarAtendimentos(faltas),
      hoje,
      agoraIso,
      fuso,
      horizonte: data.horizonte as HorizonteInsights,
    });
    return { ...resultado, periodo: data.periodo, horizonte: data.horizonte, hoje };
  });
