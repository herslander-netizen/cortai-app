import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const itemSchema = z.object({
  tipo: z.enum(["servico", "produto"]),
  id: z.string().uuid(),
  quantidade: z.number().int().positive().max(99),
  valor_unitario_centavos: z.number().int().min(0),
});

export const getFechamentoComanda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agendamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    const { data: comandaId, error: prepararErro } = await db.rpc("preparar_comanda_segura", {
      _ator: context.userId,
      _agendamento_id: data.agendamentoId,
    });
    if (prepararErro) throw new Error(prepararErro.message);
    const [{ data: comanda }, { data: itens }, { data: servicos }, { data: produtos }, { data: config }] = await Promise.all([
      db.from("comandas").select("id, numero, status, subtotal_centavos, desconto_centavos, total_centavos, comissao_total_centavos, cliente_id, profissional_id, agendamento_id, clientes(nome, telefone), profissionais(nome), agendamentos(inicio)").eq("id", comandaId).single(),
      db.from("comanda_itens").select("id, tipo, servico_id, produto_id, descricao, quantidade, valor_unitario_centavos, valor_total_centavos, comissao_percentual, comissao_centavos").eq("comanda_id", comandaId).order("criado_em"),
      db.from("servicos").select("id, nome, preco_centavos, comissao_percentual").eq("tenant_id", tenantId).eq("ativo", true).order("ordem"),
      db.from("produtos").select("id, nome, preco_centavos, quantidade, controla_estoque, comissao_percentual").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
      db.from("configuracoes_financeiras").select("pix_ativo, pix_chave, pix_tipo, pix_whatsapp, comissao_servico_percentual, comissao_produto_percentual").eq("tenant_id", tenantId).maybeSingle(),
    ]);
    if (!comanda) throw new Error("Não foi possível preparar a comanda.");
    return { comanda, itens: itens ?? [], servicos: servicos ?? [], produtos: produtos ?? [], config };
  });

export const salvarComanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ comandaId: z.string().uuid(), itens: z.array(itemSchema).min(1), descontoCentavos: z.number().int().min(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    const { data: resultado, error } = await db.rpc("salvar_comanda_segura", {
      _ator: context.userId, _comanda_id: data.comandaId, _itens: data.itens, _desconto_centavos: data.descontoCentavos,
    });
    if (error) throw new Error(error.message);
    return resultado;
  });

export const pagarComanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ comandaId: z.string().uuid(), forma: z.enum(["pix", "dinheiro", "cartao", "fiado"]), prepararPix: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    const { data: resultado, error } = await db.rpc("confirmar_pagamento_comanda_segura", {
      _ator: context.userId, _comanda_id: data.comandaId, _forma: data.forma, _somente_preparar_pix: data.prepararPix,
    });
    if (error) throw new Error(error.message);
    return resultado;
  });

export const getCaixa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");
    const db = await admin();
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const [{ data: movimentos }, { data: fiados }, { data: sessao }] = await Promise.all([
      db.from("caixa_movimentos").select("id, tipo, categoria, descricao, valor_centavos, forma_pagamento, criado_em, comandas(numero, clientes(nome), profissionais(nome)), clientes(nome), profissionais(nome)").eq("tenant_id", tenantId).gte("criado_em", inicio.toISOString()).order("criado_em", { ascending: false }),
      db.from("fiados").select("id, saldo_centavos").eq("tenant_id", tenantId).in("status", ["pendente", "parcial"]),
      db.from("caixa_sessoes").select("id, status, saldo_inicial_centavos, aberto_em").eq("tenant_id", tenantId).eq("status", "aberto").maybeSingle(),
    ]);
    const lista = movimentos ?? [];
    const entradas = lista.filter((m: any) => m.tipo === "entrada").reduce((s: number, m: any) => s + m.valor_centavos, 0);
    const saidas = lista.filter((m: any) => m.tipo !== "entrada").reduce((s: number, m: any) => s + m.valor_centavos, 0);
    const porForma = (forma: string) => lista.filter((m: any) => m.tipo === "entrada" && m.forma_pagamento === forma).reduce((s: number, m: any) => s + m.valor_centavos, 0);
    return { sessao, movimentos: lista, resumo: { entradas, saidas, liquido: entradas - saidas, pix: porForma("pix"), dinheiro: porForma("dinheiro"), cartao: porForma("cartao"), fiado: (fiados ?? []).reduce((s: number, f: any) => s + f.saldo_centavos, 0) } };
  });

export const getComissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ de: z.string().optional(), ate: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const de = data.de ? new Date(`${data.de}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const ate = data.ate ? new Date(`${data.ate}T23:59:59`) : new Date();
    const { data: rows, error } = await db.from("comissoes").select("id, tipo_item, base_centavos, valor_centavos, status, criado_em, profissionais(id, nome, user_id), comandas(id)").eq("tenant_id", tenantId).gte("criado_em", de.toISOString()).lte("criado_em", ate.toISOString());
    if (error) throw new Error(error.message);
    const { data: acesso } = await context.supabase.rpc("has_tenant_permission", { _tenant_id: tenantId, _permission: "comissao_visualizar_todas" });
    const permitidas = acesso ? (rows ?? []) : (rows ?? []).filter((r: any) => r.profissionais?.user_id === context.userId);
    const mapa = new Map<string, any>();
    for (const r of permitidas as any[]) {
      const id = r.profissionais?.id ?? "sem-profissional";
      const atual = mapa.get(id) ?? { id, nome: r.profissionais?.nome ?? "Profissional", comandas: new Set<string>(), servicos: 0, produtos: 0, comissao: 0, paga: 0 };
      atual.comandas.add(r.comandas?.id); atual[r.tipo_item === "servico" ? "servicos" : "produtos"] += r.base_centavos; atual.comissao += r.valor_centavos; if (r.status === "paga") atual.paga += r.valor_centavos; mapa.set(id, atual);
    }
    return Array.from(mapa.values()).map((v) => ({ ...v, atendimentos: v.comandas.size, comandas: undefined, pendente: v.comissao - v.paga }));
  });

export const getConfiguracaoFinanceira = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context); const db = await admin();
    const { data } = await db.from("configuracoes_financeiras").select("pix_ativo, pix_chave, pix_tipo, pix_whatsapp, comissao_servico_percentual, comissao_produto_percentual").eq("tenant_id", tenantId).maybeSingle();
    return data ?? { pix_ativo: false, pix_chave: "", pix_tipo: "aleatoria", pix_whatsapp: "", comissao_servico_percentual: 50, comissao_produto_percentual: 10 };
  });

export const salvarConfiguracaoFinanceira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pixAtivo: z.boolean(), pixChave: z.string().max(200), pixTipo: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]), pixWhatsapp: z.string().max(30), comissaoServico: z.number().min(0).max(100), comissaoProduto: z.number().min(0).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context); await exigirPermissao(context, tenantId, "comissao_configurar"); const db = await admin();
    const { error } = await db.rpc("salvar_configuracao_financeira_segura", { _ator: context.userId, _tenant: tenantId, _pix_ativo: data.pixAtivo, _pix_chave: data.pixChave, _pix_tipo: data.pixTipo, _pix_whatsapp: data.pixWhatsapp, _comissao_servico: data.comissaoServico, _comissao_produto: data.comissaoProduto });
    if (error) throw new Error(error.message); return { ok: true };
  });