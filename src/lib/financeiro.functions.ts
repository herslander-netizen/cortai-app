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

export const abrirOuFecharCaixa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ acao: z.enum(["abrir", "fechar"]), valorCentavos: z.number().int().min(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "caixa_abrir_fechar");
    const db = await admin();
    const { data: aberta } = await db.from("caixa_sessoes").select("id, saldo_inicial_centavos").eq("tenant_id", tenantId).eq("status", "aberto").maybeSingle();
    if (data.acao === "abrir") {
      if (aberta) throw new Error("Já existe um caixa aberto.");
      const { error } = await db.from("caixa_sessoes").insert({ tenant_id: tenantId, saldo_inicial_centavos: data.valorCentavos, aberto_por: context.userId });
      if (error) throw new Error(error.message);
      return { ok: true, status: "aberto" as const };
    }
    if (!aberta) throw new Error("Nenhum caixa aberto para fechar.");
    const { data: movimentos } = await db.from("caixa_movimentos").select("tipo, valor_centavos").eq("caixa_sessao_id", aberta.id);
    const esperado = (movimentos ?? []).reduce((s: number, m: any) => s + (m.tipo === "entrada" ? m.valor_centavos : -m.valor_centavos), aberta.saldo_inicial_centavos);
    const { error } = await db.from("caixa_sessoes").update({ status: "fechado", saldo_informado_centavos: data.valorCentavos, diferenca_centavos: data.valorCentavos - esperado, fechado_por: context.userId, fechado_em: new Date().toISOString() }).eq("id", aberta.id);
    if (error) throw new Error(error.message);
    return { ok: true, status: "fechado" as const, esperadoCentavos: esperado, diferencaCentavos: data.valorCentavos - esperado };
  });

export const registrarMovimentoDeCaixa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tipo: z.enum(["saida", "sangria", "despesa"]), descricao: z.string().trim().min(3).max(120), valorCentavos: z.number().int().positive() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "caixa_movimentar");
    const db = await admin();
    const { data: sessao } = await db.from("caixa_sessoes").select("id").eq("tenant_id", tenantId).eq("status", "aberto").maybeSingle();
    const { error } = await db.from("caixa_movimentos").insert({ tenant_id: tenantId, caixa_sessao_id: sessao?.id ?? null, tipo: data.tipo, categoria: data.tipo, descricao: data.descricao, valor_centavos: data.valorCentavos, criado_por: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pagarComissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ profissionalId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "comissao_pagar");
    const db = await admin();
    const { data: pendentes } = await db.from("comissoes").select("id, valor_centavos, criado_em").eq("tenant_id", tenantId).eq("profissional_id", data.profissionalId).eq("status", "pendente");
    const lista = pendentes ?? [];
    if (!lista.length) throw new Error("Não há comissão pendente para este profissional.");
    const total = lista.reduce((s: number, c: any) => s + c.valor_centavos, 0);
    const datas = lista.map((c: any) => c.criado_em).sort();
    const agora = new Date().toISOString();
    const { error: pagamentoErro } = await db.from("comissao_pagamentos").insert({ tenant_id: tenantId, profissional_id: data.profissionalId, valor_centavos: total, periodo_inicio: (datas[0] as string).slice(0, 10), periodo_fim: (datas[datas.length - 1] as string).slice(0, 10), pago_por: context.userId });
    if (pagamentoErro) throw new Error(pagamentoErro.message);
    const { error } = await db.from("comissoes").update({ status: "paga", pago_em: agora, pago_por: context.userId }).in("id", lista.map((c: any) => c.id));
    if (error) throw new Error(error.message);
    return { ok: true, valorCentavos: total };
  });

export const getFiados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");
    const db = await admin();
    const { data } = await db.from("fiados").select("id, valor_centavos, valor_pago_centavos, saldo_centavos, status, criado_em, clientes(nome), comandas(numero)").eq("tenant_id", tenantId).in("status", ["pendente", "parcial"]).order("criado_em");
    return data ?? [];
  });

export const quitarFiado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fiadoId: z.string().uuid(), valorCentavos: z.number().int().positive(), forma: z.enum(["pix", "dinheiro", "cartao"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    const { data: fiado } = await db.from("fiados").select("id, comanda_id, cliente_id, profissional_id, valor_pago_centavos, saldo_centavos, status").eq("id", data.fiadoId).eq("tenant_id", tenantId).maybeSingle();
    if (!fiado || fiado.status === "quitado") throw new Error("Esta dívida não está em aberto.");
    const valor = Math.min(data.valorCentavos, fiado.saldo_centavos);
    const saldo = fiado.saldo_centavos - valor;
    const { data: sessao } = await db.from("caixa_sessoes").select("id").eq("tenant_id", tenantId).eq("status", "aberto").maybeSingle();
    const { data: pagamento, error: pagamentoErro } = await db.from("pagamentos").insert({ tenant_id: tenantId, comanda_id: fiado.comanda_id, forma_pagamento: data.forma, valor_centavos: valor, status: "confirmado", criado_por: context.userId, confirmado_por: context.userId, confirmado_em: new Date().toISOString() }).select("id").single();
    if (pagamentoErro) throw new Error(pagamentoErro.message);
    const { error: movErro } = await db.from("caixa_movimentos").insert({ tenant_id: tenantId, caixa_sessao_id: sessao?.id ?? null, comanda_id: fiado.comanda_id, pagamento_id: pagamento.id, cliente_id: fiado.cliente_id, profissional_id: fiado.profissional_id, tipo: "entrada", categoria: "fiado", descricao: "Quitação de fiado", valor_centavos: valor, forma_pagamento: data.forma, criado_por: context.userId });
    if (movErro) throw new Error(movErro.message);
    const { error } = await db.from("fiados").update({ valor_pago_centavos: fiado.valor_pago_centavos + valor, saldo_centavos: saldo, status: saldo === 0 ? "quitado" : "parcial", quitado_em: saldo === 0 ? new Date().toISOString() : null }).eq("id", fiado.id);
    if (error) throw new Error(error.message);
    return { ok: true, saldoCentavos: saldo };
  });
