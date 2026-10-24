/* eslint-disable @typescript-eslint/no-explicit-any -- linhas do Supabase com relações aninhadas, sem tipo gerado */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fusoDoTenant } from "@/lib/fuso.server";
import { ESTADOS_ATENDIMENTO } from "@/lib/barbeiro.functions";
import { hojeNoFuso } from "@/lib/horarios";
import { intervaloDoPeriodo, periodoIds } from "@/lib/historico-periodo";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";

const TAMANHO_DA_PAGINA = 30;

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const baseSchema = z.object({
  periodo: z.enum(periodoIds).default("ultimos30"),
  de: dia.optional(),
  ate: dia.optional(),
  pagina: z.number().int().min(0).max(1000).default(0),
});

const atendimentosSchema = baseSchema.extend({
  profissionalId: z.string().uuid().optional(),
  servicoId: z.string().uuid().optional(),
  status: z.array(z.enum(ESTADOS_ATENDIMENTO)).max(7).default([]),
  canal: z.enum(["manual", "online"]).optional(),
});

const vendasSchema = baseSchema.extend({
  forma: z.enum(["pix", "dinheiro", "cartao", "fiado"]).optional(),
});

export type AtendimentoDoHistorico = {
  id: string;
  inicio: string;
  status: string;
  clienteNome: string | null;
  servico: string | null;
  profissional: string | null;
  valorCentavos: number;
  online: boolean;
};

export type VendaDoHistorico = {
  id: string;
  criadoEm: string;
  descricao: string | null;
  clienteNome: string | null;
  profissional: string | null;
  forma: string | null;
  valorCentavos: number;
};

async function intervalo(tenantId: string, entrada: z.infer<typeof baseSchema>) {
  const fuso = await fusoDoTenant(tenantId);
  const resultado = intervaloDoPeriodo(
    entrada.periodo,
    hojeNoFuso(fuso),
    fuso,
    entrada.de,
    entrada.ate,
  );
  if (!resultado)
    throw new Error("Escolha um período de até 1 ano, com a data inicial antes da final.");
  return resultado;
}

/** Atendimentos de qualquer período, com filtros e carregamento por páginas (só leitura). */
export const listarHistoricoDeAtendimentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => atendimentosSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ContextoAutenticado;
    const tenantId = await tenantIdDoMembro(ctx);
    await exigirPermissao(ctx, tenantId, "visualizar_clientes");
    const { inicio, fim } = await intervalo(tenantId, data);
    const db = ctx.supabase;

    const aplicar = (consulta: any) => {
      let q = consulta.eq("tenant_id", tenantId);
      if (inicio) q = q.gte("inicio", inicio);
      if (fim) q = q.lt("inicio", fim);
      if (data.profissionalId) q = q.eq("profissional_id", data.profissionalId);
      if (data.servicoId) q = q.eq("servico_id", data.servicoId);
      if (data.status.length) q = q.in("status", data.status);
      if (data.canal === "manual") q = q.eq("origem", "manual");
      if (data.canal === "online") q = q.neq("origem", "manual");
      return q;
    };

    const de = data.pagina * TAMANHO_DA_PAGINA;
    const [{ data: linhas, error }, opcoes] = await Promise.all([
      aplicar(
        db
          .from("agendamentos")
          .select(
            "id, inicio, status, valor_centavos, origem, clientes(nome), servicos(nome), profissionais(nome)",
          ),
      )
        .order("inicio", { ascending: false })
        .range(de, de + TAMANHO_DA_PAGINA),
      data.pagina === 0
        ? Promise.all([
            db.from("profissionais").select("id, nome").eq("tenant_id", tenantId).order("nome"),
            db.from("servicos").select("id, nome").eq("tenant_id", tenantId).order("nome"),
          ])
        : Promise.resolve(null),
    ]);
    if (error) throw new Error("Não consegui carregar o histórico agora.");

    const todas = (linhas ?? []) as any[];
    const itens: AtendimentoDoHistorico[] = todas.slice(0, TAMANHO_DA_PAGINA).map((a) => ({
      id: a.id,
      inicio: a.inicio,
      status: a.status,
      clienteNome: a.clientes?.nome ?? null,
      servico: a.servicos?.nome ?? null,
      profissional: a.profissionais?.nome ?? null,
      valorCentavos: a.valor_centavos ?? 0,
      online: a.origem !== "manual",
    }));
    return {
      itens,
      temMais: todas.length > TAMANHO_DA_PAGINA,
      profissionais: opcoes ? ((opcoes[0].data ?? []) as { id: string; nome: string }[]) : null,
      servicos: opcoes ? ((opcoes[1].data ?? []) as { id: string; nome: string }[]) : null,
    };
  });

/** Vendas recebidas (entradas do caixa) de qualquer período, com filtro por forma de pagamento. */
export const listarHistoricoDeVendas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => vendasSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ContextoAutenticado;
    const tenantId = await tenantIdDoMembro(ctx);
    await exigirPermissao(ctx, tenantId, "visualizar_financeiro");
    const { inicio, fim } = await intervalo(tenantId, data);
    const db = ctx.supabase;

    let q = db
      .from("caixa_movimentos")
      .select(
        "id, descricao, valor_centavos, forma_pagamento, criado_em, comandas(clientes(nome), profissionais(nome)), clientes(nome), profissionais(nome)",
      )
      .eq("tenant_id", tenantId)
      .eq("tipo", "entrada");
    if (inicio) q = q.gte("criado_em", inicio);
    if (fim) q = q.lt("criado_em", fim);
    if (data.forma) q = q.eq("forma_pagamento", data.forma);
    const de = data.pagina * TAMANHO_DA_PAGINA;
    const { data: linhas, error } = await q
      .order("criado_em", { ascending: false })
      .range(de, de + TAMANHO_DA_PAGINA);
    if (error) throw new Error("Não consegui carregar o histórico agora.");

    const todas = (linhas ?? []) as any[];
    const itens: VendaDoHistorico[] = todas.slice(0, TAMANHO_DA_PAGINA).map((m) => ({
      id: m.id,
      criadoEm: m.criado_em,
      descricao: m.descricao ?? null,
      clienteNome: m.comandas?.clientes?.nome ?? m.clientes?.nome ?? null,
      profissional: m.comandas?.profissionais?.nome ?? m.profissionais?.nome ?? null,
      forma: m.forma_pagamento ?? null,
      valorCentavos: m.valor_centavos ?? 0,
    }));
    return { itens, temMais: todas.length > TAMANHO_DA_PAGINA };
  });
