import { createServerFn } from "@tanstack/react-start";
import { inicioDoDiaNoFuso, inicioDoMesNoFuso } from "@/lib/horarios";
import { fusoDoTenant } from "@/lib/fuso.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirRecurso, recursoLiberado } from "@/lib/planos";
import { exigirPermissao } from "@/lib/tenant";

async function tenantDoMembro(supabase: any, userId: string) {
  const { data } = await supabase
    .from("tenant_usuarios")
    .select("tenant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Você ainda não está vinculado a um negócio.");
  return data.tenant_id as string;
}

export const getFinanceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantDoMembro(context.supabase, context.userId);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");
    const inicio = inicioDoMesNoFuso(await fusoDoTenant(tenantId));
    const [{ data: atendimentos }, { data: vendas }] = await Promise.all([
      context.supabase
        .from("agendamentos")
        .select("id, valor_centavos, inicio, servicos(nome)")
        .eq("tenant_id", tenantId)
        .eq("status", "finalizado")
        .gte("inicio", inicio.toISOString()),
      context.supabase
        .from("vendas")
        .select("id, categoria, descricao, total_centavos, criado_em")
        .eq("tenant_id", tenantId)
        .gte("criado_em", inicio.toISOString())
        .order("criado_em", { ascending: false }),
    ]);
    const servicos = (atendimentos ?? []).reduce((total, item) => total + item.valor_centavos, 0);
    const produtos = (vendas ?? [])
      .filter((item) => item.categoria === "produtos")
      .reduce((total, item) => total + item.total_centavos, 0);
    const outros = (vendas ?? [])
      .filter((item) => item.categoria === "outros")
      .reduce((total, item) => total + item.total_centavos, 0);
    return {
      servicos,
      produtos,
      outros,
      total: servicos + produtos + outros,
      atendimentos: atendimentos ?? [],
      vendas: vendas ?? [],
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
    const produtos = data ?? [];
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
