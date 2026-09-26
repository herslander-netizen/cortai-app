import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { hojeNoFuso, isoNoFusoDaBarbearia, normalizarFuso } from "@/lib/horarios";

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

async function temPermissao(context: any, tenantId: string, chave: string) {
  const { data } = await context.supabase.rpc("has_tenant_permission", { _tenant_id: tenantId, _permission: chave });
  return Boolean(data);
}

async function meuProfissionalId(db: any, tenantId: string, userId: string): Promise<string | null> {
  const { data } = await db.from("profissionais").select("id").eq("tenant_id", tenantId).eq("user_id", userId).eq("ativo", true).limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Quem finaliza pode receber? Se a barbearia usa recepção, o barbeiro deixa a comanda aguardando pagamento. */
async function podeReceberAqui(context: any, db: any, tenantId: string) {
  if (!(await temPermissao(context, tenantId, "confirmar_pagamento"))) return false;
  const [{ data: eu }, { count }] = await Promise.all([
    db.from("tenant_usuarios").select("papel").eq("tenant_id", tenantId).eq("user_id", context.userId).maybeSingle(),
    db.from("tenant_usuarios").select("user_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("papel", "recepcao").eq("ativo", true),
  ]);
  return !(eu?.papel === "barbeiro" && (count ?? 0) > 0);
}

export const getFechamentoComanda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agendamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const { data: comandaId, error: prepararErro } = await db.rpc("preparar_comanda_segura", {
      _ator: context.userId,
      _agendamento_id: data.agendamentoId,
    });
    if (prepararErro) throw new Error(prepararErro.message === "sem permissao" ? "Você não pode fechar a comanda deste atendimento." : prepararErro.message);
    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const [{ data: comanda }, { data: itens }, { data: servicos }, { data: produtos }, { data: config }, { data: vendidos }, podeReceber] = await Promise.all([
      db.from("comandas").select("id, numero, status, subtotal_centavos, desconto_centavos, total_centavos, comissao_total_centavos, cliente_id, profissional_id, agendamento_id, clientes(nome, telefone, limite_fiado_centavos), profissionais(nome), agendamentos(inicio, forma_pagamento)").eq("id", comandaId).eq("tenant_id", tenantId).single(),
      db.from("comanda_itens").select("id, tipo, servico_id, produto_id, descricao, quantidade, valor_unitario_centavos, valor_total_centavos, comissao_percentual, comissao_centavos").eq("comanda_id", comandaId).order("criado_em"),
      db.from("servicos").select("id, nome, preco_centavos, comissao_percentual").eq("tenant_id", tenantId).eq("ativo", true).order("ordem"),
      db.from("produtos").select("id, nome, preco_centavos, quantidade, controla_estoque, comissao_percentual").eq("tenant_id", tenantId).eq("ativo", true).order("nome"),
      db.from("configuracoes_financeiras").select("pix_ativo, pix_chave, pix_tipo, pix_whatsapp, comissao_servico_percentual, comissao_produto_percentual").eq("tenant_id", tenantId).maybeSingle(),
      db.from("comanda_itens").select("produto_id, quantidade, comandas!inner(tenant_id, status, criado_em)").eq("tipo", "produto").eq("comandas.tenant_id", tenantId).in("comandas.status", ["paga", "fiado"]).gte("comandas.criado_em", desde).limit(1000),
      podeReceberAqui(context, db, tenantId),
    ]);
    if (!comanda) throw new Error("Não foi possível preparar a comanda.");
    const contagem = new Map<string, number>();
    for (const v of (vendidos ?? []) as any[]) if (v.produto_id) contagem.set(v.produto_id, (contagem.get(v.produto_id) ?? 0) + v.quantidade);
    const maisVendidos = [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => (produtos ?? []).some((p: any) => p.id === id)).slice(0, 4);
    let creditos = 0; let fiadoDisponivel = 0;
    const cliente: any = (comanda as any).clientes;
    if (comanda.cliente_id && cliente?.telefone !== "avulso") {
      const [{ data: cart }, { data: abertos }] = await Promise.all([
        db.from("carteiras").select("saldo_creditos").eq("tenant_id", tenantId).eq("cliente_id", comanda.cliente_id).maybeSingle(),
        db.from("fiados").select("saldo_centavos").eq("tenant_id", tenantId).eq("cliente_id", comanda.cliente_id).in("status", ["pendente", "parcial"]),
      ]);
      creditos = cart?.saldo_creditos ?? 0;
      const limite = cliente?.limite_fiado_centavos ?? 0;
      fiadoDisponivel = limite > 0 ? Math.max(0, limite - (abertos ?? []).reduce((s: number, f: any) => s + f.saldo_centavos, 0)) : 0;
    }
    const planoReservado = (comanda as any).agendamentos?.forma_pagamento === "credito";
    return { comanda, itens: itens ?? [], servicos: servicos ?? [], produtos: produtos ?? [], config, maisVendidos, podeReceber, plano: { creditos, reservado: planoReservado }, fiadoDisponivel };
  });

const salvarSchema = z.object({ comandaId: z.string().uuid(), itens: z.array(itemSchema).min(1), descontoCentavos: z.number().int().min(0) });

async function salvarItens(db: any, userId: string, tenantId: string, data: z.infer<typeof salvarSchema>) {
  const { data: c } = await db.from("comandas").select("id").eq("id", data.comandaId).eq("tenant_id", tenantId).maybeSingle();
  if (!c) throw new Error("Comanda não encontrada.");
  const { data: resultado, error } = await db.rpc("salvar_comanda_segura", {
    _ator: userId, _comanda_id: data.comandaId, _itens: data.itens, _desconto_centavos: data.descontoCentavos,
  });
  if (error) throw new Error(error.message === "sem permissao para desconto" ? "Desconto precisa de autorização do responsável." : error.message);
  return resultado;
}

export const salvarComanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => salvarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    return salvarItens(await admin(), context.userId, tenantId, data);
  });

/** Barbeiro finaliza e a recepção recebe: comanda fica "Aguardando pagamento" e a cadeira é liberada. */
export const enviarParaRecepcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => salvarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    await salvarItens(db, context.userId, tenantId, data);
    const { data: c } = await db.from("comandas").select("agendamento_id").eq("id", data.comandaId).single();
    if (c?.agendamento_id) {
      await db.from("agendamentos").update({ status: "finalizado", status_alterado_por: context.userId })
        .eq("id", c.agendamento_id).eq("tenant_id", tenantId).in("status", ["agendado", "chegou", "na_cadeira"]);
    }
    return { ok: true };
  });

export const pagarComanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ comandaId: z.string().uuid(), forma: z.enum(["pix", "dinheiro", "cartao", "fiado"]), prepararPix: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    if (data.forma === "fiado") {
      const { data: c } = await db.from("comandas").select("total_centavos, cliente_id, clientes(telefone, limite_fiado_centavos)").eq("id", data.comandaId).eq("tenant_id", tenantId).single();
      const cli: any = (c as any)?.clientes;
      const limite = cli?.telefone === "avulso" ? 0 : cli?.limite_fiado_centavos ?? 0;
      const { data: abertos } = await db.from("fiados").select("saldo_centavos").eq("tenant_id", tenantId).eq("cliente_id", c?.cliente_id ?? "").in("status", ["pendente", "parcial"]);
      const disponivel = limite - (abertos ?? []).reduce((s: number, f: any) => s + f.saldo_centavos, 0);
      if (limite <= 0 || (c?.total_centavos ?? 0) > disponivel) throw new Error("Este cliente não tem limite de fiado para este valor.");
    }
    const { data: resultado, error } = await db.rpc("confirmar_pagamento_comanda_segura", {
      _ator: context.userId, _comanda_id: data.comandaId, _forma: data.forma, _somente_preparar_pix: data.prepararPix,
    });
    if (error) throw new Error(error.message);
    return resultado;
  });

export const pagarComPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ comandaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    const { data: c } = await db.from("comandas").select("id").eq("id", data.comandaId).eq("tenant_id", tenantId).maybeSingle();
    if (!c) throw new Error("Comanda não encontrada.");
    const { data: resultado, error } = await db.rpc("pagar_comanda_com_plano_segura", { _ator: context.userId, _comanda_id: data.comandaId });
    if (error) throw new Error(error.message);
    return resultado;
  });

/** Comandas que a recepção precisa receber. */
export const getAguardandoPagamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    if (!(await podeReceberAqui(context, db, tenantId))) return [];
    const { data } = await db.from("comandas").select("id, numero, agendamento_id, total_centavos, status, clientes(nome), profissionais(nome)")
      .eq("tenant_id", tenantId).in("status", ["aguardando_pagamento", "aguardando_confirmacao_pix"]).not("agendamento_id", "is", null)
      .gte("criado_em", new Date(Date.now() - 3 * 86_400_000).toISOString()).order("atualizado_em");
    return (data ?? []).map((c: any) => ({ id: c.id, numero: c.numero, agendamentoId: c.agendamento_id as string, total: c.total_centavos, cliente: c.clientes?.nome ?? "Cliente", profissional: c.profissionais?.nome ?? "", pix: c.status === "aguardando_confirmacao_pix" }));
  });

/** Retorno sugerido pelo intervalo médio do cliente (30 dias se houver pouco histórico). */
export const getSugestaoRetorno = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ comandaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const { data: c } = await db.from("comandas").select("cliente_id, profissional_id, clientes(nome, telefone), agendamentos(inicio, servico_id), comanda_itens(tipo, servico_id)").eq("id", data.comandaId).eq("tenant_id", tenantId).maybeSingle();
    const cli: any = (c as any)?.clientes;
    if (!c?.cliente_id || !c.profissional_id || !cli || String(cli.telefone).startsWith("avulso")) return null;
    const servicoId = (c as any).agendamentos?.servico_id ?? ((c as any).comanda_itens ?? []).find((i: any) => i.tipo === "servico")?.servico_id;
    if (!servicoId) return null;
    const [{ data: t }, { data: hist }] = await Promise.all([
      db.from("tenants").select("fuso").eq("id", tenantId).single(),
      db.from("agendamentos").select("inicio").eq("tenant_id", tenantId).eq("cliente_id", c.cliente_id).eq("status", "finalizado").order("inicio", { ascending: false }).limit(12),
    ]);
    const fuso = normalizarFuso(t?.fuso);
    const dias = [...new Set((hist ?? []).map((h: any) => hojeNoFuso(fuso, new Date(h.inicio))))].sort();
    let intervalo = 30;
    if (dias.length >= 3) {
      const ms = dias.map((d) => new Date(`${d}T12:00:00Z`).getTime());
      intervalo = Math.max(7, Math.round((ms[ms.length - 1]! - ms[0]!) / (ms.length - 1) / 86_400_000));
    }
    const base = (c as any).agendamentos?.inicio ? new Date((c as any).agendamentos.inicio) : new Date();
    const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).format(base);
    const alvo = hojeNoFuso(fuso, new Date(Date.now() + intervalo * 86_400_000));
    const { data: serv } = await db.from("servicos").select("duracao_min").eq("id", servicoId).single();
    const dur = (serv?.duracao_min ?? 30) * 60_000;
    let inicio = new Date(isoNoFusoDaBarbearia(alvo, hhmm, fuso));
    for (let i = 0; i < 6; i++) {
      const fim = new Date(inicio.getTime() + dur);
      const { count } = await db.from("agendamentos").select("id", { count: "exact", head: true }).eq("profissional_id", c.profissional_id)
        .not("status", "in", "(cancelado,nao_compareceu,remarcado)").lt("inicio", fim.toISOString()).gt("fim", inicio.toISOString());
      if (!count) break;
      inicio = new Date(inicio.getTime() + 30 * 60_000);
    }
    return { inicio: inicio.toISOString(), fuso, intervalo, cliente: cli.nome as string };
  });

export const criarRetorno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ comandaId: z.string().uuid(), inicio: z.string().datetime() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "criar_agendamento");
    const db = await admin();
    const { data: c } = await db.from("comandas").select("cliente_id, profissional_id, agendamentos(servico_id), comanda_itens(tipo, servico_id)").eq("id", data.comandaId).eq("tenant_id", tenantId).maybeSingle();
    const servicoId = (c as any)?.agendamentos?.servico_id ?? ((c as any)?.comanda_itens ?? []).find((i: any) => i.tipo === "servico")?.servico_id;
    if (!c?.cliente_id || !c.profissional_id || !servicoId) throw new Error("Não foi possível marcar o retorno.");
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenantId, _cliente_id: c.cliente_id, _profissional_id: c.profissional_id, _servico_id: servicoId, _inicio: data.inicio, _forma_pagamento: "balcao",
    });
    if (error) throw new Error(error.message.includes("horario ja ocupado") ? "Esse horário acabou de ser reservado, escolha outro" : error.message);
    const criado = res as unknown as { agendamento_id: string };
    await db.from("agendamentos").update({ origem: "manual" }).eq("id", criado.agendamento_id);
    return { agendamentoId: criado.agendamento_id };
  });

/** Meu dia: só os números do próprio barbeiro, com as mesmas fontes do caixa e das comissões. */
export const getMeuDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const profId = await meuProfissionalId(db, tenantId, context.userId);
    if (!profId) return null;
    const { data: t } = await db.from("tenants").select("fuso").eq("id", tenantId).single();
    const fuso = normalizarFuso(t?.fuso);
    const dia = hojeNoFuso(fuso);
    const de = isoNoFusoDaBarbearia(dia, "00:00", fuso);
    const ate = new Date(new Date(de).getTime() + 86_400_000).toISOString();
    const [{ count: atendimentos }, { data: caixa }, { data: fiados }, { data: comissoes }, { count: plano }] = await Promise.all([
      db.from("agendamentos").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("profissional_id", profId).eq("status", "finalizado").gte("inicio", de).lt("inicio", ate),
      db.from("caixa_movimentos").select("valor_centavos").eq("tenant_id", tenantId).eq("profissional_id", profId).eq("tipo", "entrada").eq("categoria", "comanda").gte("criado_em", de).lt("criado_em", ate),
      db.from("fiados").select("valor_centavos").eq("tenant_id", tenantId).eq("profissional_id", profId).gte("criado_em", de).lt("criado_em", ate),
      db.from("comissoes").select("valor_centavos").eq("tenant_id", tenantId).eq("profissional_id", profId).gte("criado_em", de).lt("criado_em", ate),
      db.from("agendamentos").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("profissional_id", profId).eq("status", "finalizado").eq("forma_pagamento", "credito").gte("inicio", de).lt("inicio", ate),
    ]);
    const soma = (l: any[] | null) => (l ?? []).reduce((s, r) => s + (r.valor_centavos ?? 0), 0);
    const listaComissoes = comissoes ?? [];
    return { atendimentos: atendimentos ?? 0, vendido: soma(caixa), fiado: soma(fiados), noPlano: plano ?? 0, comissao: soma(listaComissoes), temComissao: listaComissoes.length > 0 };
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

export const identificarClienteAvulso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ comandaId: z.string().uuid(), nome: z.string().trim().min(2).max(80), telefone: z.string().trim().max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "confirmar_pagamento");
    const db = await admin();
    const { data: comanda } = await db
      .from("comandas")
      .select("id, cliente_id, agendamento_id, status, clientes(telefone)")
      .eq("id", data.comandaId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!comanda) throw new Error("Comanda não encontrada.");
    if ((comanda as any).clientes?.telefone !== "avulso") throw new Error("Esta comanda já tem cliente identificado.");
    const digitos = data.telefone.replace(/\D/g, "");
    if (digitos && (digitos.length < 10 || digitos.length > 13)) throw new Error("Telefone inválido. Use DDD + número.");
    let clienteId: string | null = null;
    if (digitos) {
      const { data: existente } = await db.from("clientes").select("id").eq("tenant_id", tenantId).eq("telefone", digitos).maybeSingle();
      clienteId = existente?.id ?? null;
    }
    if (!clienteId) {
      const { data: novo, error } = await db
        .from("clientes")
        .insert({ tenant_id: tenantId, nome: data.nome, telefone: digitos || `avulso-${data.comandaId.slice(0, 8)}`, origem: "balcao" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      clienteId = novo.id;
    }
    const { error: e1 } = await db.from("comandas").update({ cliente_id: clienteId }).eq("id", comanda.id).eq("tenant_id", tenantId);
    if (e1) throw new Error(e1.message);
    if (comanda.agendamento_id) {
      const { error: e2 } = await db.from("agendamentos").update({ cliente_id: clienteId }).eq("id", comanda.agendamento_id).eq("tenant_id", tenantId);
      if (e2) throw new Error(e2.message);
    }
    return { clienteId, nome: data.nome };
  });
