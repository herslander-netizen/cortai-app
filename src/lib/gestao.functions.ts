import { createServerFn } from "@tanstack/react-start";
import { isoNoFusoDaBarbearia, hojeNoFuso } from "@/lib/horarios";
import { intervaloFinanceiroLocal, variacaoPercentual } from "@/lib/financeiro-analise";
import { fusoDoTenant } from "@/lib/fuso.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirRecurso, recursoLiberado } from "@/lib/planos";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { fotoValida } from "@/lib/fotos-do-negocio";
import { assinarFoto } from "@/lib/fotos.server";

/** Mesma regra de negócio em uso do resto do servidor (antes esta cópia pegava um vínculo qualquer). */
async function tenantDoMembro(supabase: any, userId: string) {
  return tenantIdDoMembro({ supabase, userId });
}

export const getFinanceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ periodo: z.enum(["hoje", "semana", "mes"]).default("mes") }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const tenantId = await tenantDoMembro(context.supabase, context.userId);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");
    const fuso = await fusoDoTenant(tenantId);
    const hoje = hojeNoFuso(fuso);
    const intervalo = intervaloFinanceiroLocal(hoje, data.periodo);

    const consultasDoPeriodo = (inicioLocal: string, fimLocal: string) => {
      const inicioIso = isoNoFusoDaBarbearia(inicioLocal, "00:00", fuso);
      const fimIso = isoNoFusoDaBarbearia(fimLocal, "00:00", fuso);
      return {
        atendimentos: context.supabase
          .from("agendamentos")
          .select("id, valor_centavos, inicio, servicos(nome)")
          .eq("tenant_id", tenantId)
          .eq("status", "finalizado")
          .gte("inicio", inicioIso)
          .lt("inicio", fimIso),
        vendas: context.supabase
          .from("vendas")
          .select("id, categoria, descricao, total_centavos, criado_em")
          .eq("tenant_id", tenantId)
          .gte("criado_em", inicioIso)
          .lt("criado_em", fimIso)
          .order("criado_em", { ascending: false }),
        ganhosExtras: context.supabase
          .from("caixa_movimentos")
          .select("valor_centavos")
          .eq("tenant_id", tenantId)
          .eq("tipo", "entrada")
          .in("categoria", ["ganho_extra_gorjeta", "ganho_extra_servico_extra", "ganho_extra_outro"])
          .gte("criado_em", inicioIso)
          .lt("criado_em", fimIso),
        despesasESaidas: context.supabase
          .from("caixa_movimentos")
          .select("tipo, valor_centavos")
          .eq("tenant_id", tenantId)
          .in("tipo", ["saida", "despesa"])
          .gte("criado_em", inicioIso)
          .lt("criado_em", fimIso),
      };
    };

    const atual = consultasDoPeriodo(intervalo.inicio, intervalo.fim);
    const anterior = consultasDoPeriodo(intervalo.inicioAnterior, intervalo.fimAnterior);
    const [
      { data: atendimentos, error: erroAtendimentos },
      { data: vendas, error: erroVendas },
      { data: ganhosExtrasRes, error: erroGanhosExtras },
      { data: despesasESaidasRes, error: erroDespesasESaidas },
      { data: atendimentosAnt, error: erroAtendimentosAnt },
      { data: vendasAnt, error: erroVendasAnt },
      { data: ganhosExtrasAnt, error: erroGanhosExtrasAnt },
      { data: despesasESaidasAnt, error: erroDespesasESaidasAnt },
    ] = await Promise.all([
      atual.atendimentos,
      atual.vendas,
      atual.ganhosExtras,
      atual.despesasESaidas,
      anterior.atendimentos,
      anterior.vendas,
      anterior.ganhosExtras,
      anterior.despesasESaidas,
    ]);

    if (
      erroAtendimentos ||
      erroVendas ||
      erroGanhosExtras ||
      erroDespesasESaidas ||
      erroAtendimentosAnt ||
      erroVendasAnt ||
      erroGanhosExtrasAnt ||
      erroDespesasESaidasAnt
    ) {
      throw new Error("Não foi possível carregar o resumo financeiro.");
    }

    const calcularReceitas = (atendimentosDoPeriodo: any[], vendasDoPeriodo: any[], ganhosDoPeriodo: any[]) => {
      const servicos = atendimentosDoPeriodo.reduce((total, item) => total + item.valor_centavos, 0);
      const produtos = vendasDoPeriodo
        .filter((item) => item.categoria === "produtos")
        .reduce((total, item) => total + item.total_centavos, 0);
      const outros = vendasDoPeriodo
        .filter((item) => item.categoria === "outros")
        .reduce((total, item) => total + item.total_centavos, 0);
      const ganhosExtras = ganhosDoPeriodo.reduce((total, item) => total + item.valor_centavos, 0);
      return { servicos, produtos, outros, ganhosExtras, total: servicos + produtos + outros + ganhosExtras };
    };

    const calcularSaidas = (movimentos: any[]) => {
      const despesas = movimentos
        .filter((item) => item.tipo === "despesa")
        .reduce((total, item) => total + item.valor_centavos, 0);
      const saidas = movimentos
        .filter((item) => item.tipo === "saida")
        .reduce((total, item) => total + item.valor_centavos, 0);
      return { despesas, saidas, total: despesas + saidas };
    };

    const receitasAtuais = calcularReceitas(atendimentos ?? [], vendas ?? [], ganhosExtrasRes ?? []);
    const receitasAnteriores = calcularReceitas(atendimentosAnt ?? [], vendasAnt ?? [], ganhosExtrasAnt ?? []);
    const saidasAtuais = calcularSaidas(despesasESaidasRes ?? []);
    const saidasAnteriores = calcularSaidas(despesasESaidasAnt ?? []);

    return {
      periodo: data.periodo,
      ...receitasAtuais,
      despesas: saidasAtuais.despesas,
      saidas: saidasAtuais.saidas,
      despesasESaidas: saidasAtuais.total,
      atendimentos: atendimentos ?? [],
      vendas: vendas ?? [],
      comparacao: {
        receitaAnterior: receitasAnteriores.total,
        despesasESaidasAnterior: saidasAnteriores.total,
        receitaVariacaoPercentual: variacaoPercentual(receitasAtuais.total, receitasAnteriores.total),
        despesasVariacaoPercentual: variacaoPercentual(saidasAtuais.total, saidasAnteriores.total),
      },
    };
  });

export const getProdutos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantDoMembro(context.supabase, context.userId);
    await exigirPermissao(context, tenantId, "visualizar_estoque");
    await exigirRecurso(context.supabase, tenantId, "produtos_estoque");
    const [{ data, error }, { data: tenant }, loja] = await Promise.all([
      context.supabase.from("produtos").select("*").eq("tenant_id", tenantId).order("nome"),
      context.supabase
        .from("tenants")
        .select("slug, loja_ativa, plano")
        .eq("id", tenantId)
        .maybeSingle(),
      recursoLiberado(context.supabase, tenantId, "loja_online"),
    ]);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // `foto_url` guarda o caminho da foto; `foto_assinada` é o link temporário para mostrar na lista.
    const produtos = await Promise.all(
      (data ?? []).map(async (p: any) => ({
        ...p,
        foto_assinada: await assinarFoto(supabaseAdmin, p.foto_url),
      })),
    );
    return {
      tenantId,
      produtos,
      loja: {
        ativa: Boolean(tenant?.loja_ativa) && loja.liberado,
        liberada: loja.liberado,
        plano: loja.plano,
        slug: (tenant?.slug as string) ?? null,
        aVenda: produtos.filter((p: any) => p.ativo && p.disponivel_venda && p.preco_centavos > 0)
          .length,
        estoqueBaixo: produtos.filter(
          (p: any) => p.controla_estoque && p.quantidade <= p.estoque_minimo,
        ).length,
        destaques: produtos.filter(
          (p: any) => p.ativo && p.destaque && p.disponivel_venda && p.preco_centavos > 0,
        ).length,
      },
    };
  });

const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(100),
  foto_url: z.string().trim().max(500).nullable(),
  categoria: z.string().trim().min(2).max(60),
  custo_centavos: z.number().int().min(0),
  preco_centavos: z.number().int().min(0),
  quantidade: z.number().int().min(0),
  estoque_minimo: z.number().int().min(0),
  descricao: z.string().trim().max(500).nullable().default(null),
  destaque: z.boolean().default(false),
  ativo: z.boolean(),
  controla_estoque: z.boolean().default(true),
  disponivel_venda: z.boolean().default(false),
});

export const salvarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => produtoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoMembro(context.supabase, context.userId);
    await exigirPermissao(context, tenantId, "alterar_estoque");
    await exigirRecurso(context.supabase, tenantId, "produtos_estoque");
    const { liberado: lojaLiberada } = await recursoLiberado(
      context.supabase,
      tenantId,
      "loja_online",
    );
    if (data.foto_url && !fotoValida(data.foto_url, tenantId))
      throw new Error("Escolha a foto pela galeria de fotos.");
    const payload = {
      nome: data.nome,
      foto_url: data.foto_url,
      categoria: data.categoria,
      custo_centavos: data.custo_centavos,
      preco_centavos: data.preco_centavos,
      quantidade: data.quantidade,
      estoque_minimo: data.estoque_minimo,
      ativo: data.ativo,
      descricao: data.descricao,
      controla_estoque: data.controla_estoque,
      destaque: data.destaque && data.disponivel_venda && data.preco_centavos > 0 && lojaLiberada,
      // Só vai para a loja com preço válido e com o recurso liberado no plano.
      disponivel_venda: data.disponivel_venda && data.preco_centavos > 0 && lojaLiberada,

      tenant_id: tenantId,
    };
    const { error } = data.id
      ? await context.supabase
          .from("produtos")
          .update(payload)
          .eq("id", data.id)
          .eq("tenant_id", tenantId)
      : await context.supabase.from("produtos").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registrarVendaProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        produtoId: z.string().uuid(),
        quantidade: z.number().int().positive(),
        formaPagamento: z.string().min(2).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoMembro(context.supabase, context.userId);
    await exigirPermissao(context, tenantId, "registrar_venda");
    const { data: resultado, error } = await context.supabase.rpc("registrar_venda_produto", {
      _produto_id: data.produtoId,
      _quantidade: data.quantidade,
      _forma_pagamento: data.formaPagamento,
    });
    if (error)
      throw new Error(
        error.message.includes("estoque insuficiente") ? "Estoque insuficiente." : error.message,
      );
    return resultado;
  });
export const definirLojaAtiva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ ativa: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoMembro(context.supabase, context.userId);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    if (data.ativa) await exigirRecurso(context.supabase, tenantId, "loja_online");
    const { error } = await context.supabase
      .from("tenants")
      .update({ loja_ativa: data.ativa })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ativa: data.ativa };
  });
