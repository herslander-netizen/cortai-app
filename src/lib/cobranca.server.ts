/**
 * Cobrança dos planos pelo Asaas — lógica do servidor (webhook, varredura,
 * criação de assinaturas). Nunca confia em valores do navegador nem no corpo
 * do webhook: sempre recalcula e consulta a API.
 */
import { DIAS_DE_TESTE } from "@/lib/teste-gratis";
import { asaas } from "@/lib/asaas.server";
import {
  dataIso,
  datasDoTeste,
  deveProcessarEvento,
  estaPago,
  estaSuspenso,
  fimDoPeriodo,
  formaDoAsaas,
  formaDoCortai,
  statusPelaData,
  validarCupom,
  valorDaCobranca,
  aplicarCupomAoValor,
  type Ciclo,
  type Cupom,
  type Forma,
  type StatusAssinatura,
} from "@/lib/cobranca";
import { condicaoVigente } from "@/lib/monetizacao";
import { codigoDeCupomValido } from "@/lib/comparacao-exata";
import { condicaoDaLinha, planoDaLinha } from "@/lib/monetizacao.functions";

async function db(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ConfigDeCobranca = { ligada: boolean; toleranciaDias: number; planoInicial: string };

export async function configDeCobranca(): Promise<ConfigDeCobranca> {
  const { data } = await (
    await db()
  )
    .from("configuracoes_da_plataforma")
    .select("cobranca_ligada, tolerancia_dias, plano_inicial")
    .limit(1)
    .maybeSingle();
  const { chaveDoAsaas, ambienteDaChave } = await import("@/lib/asaas.server");
  const chave = await chaveDoAsaas();
  const chaveOk = !!chave && ambienteDaChave(chave) !== "invalida";
  return {
    ligada: Boolean(data?.cobranca_ligada) && chaveOk,
    toleranciaDias: data?.tolerancia_dias ?? 7,
    planoInicial: data?.plano_inicial ?? "essencial",
  };
}

export async function assinaturaDoTenant(tenantId: string) {
  const { data } = await (
    await db()
  )
    .from("assinaturas")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data as any | null;
}

/** Fonte única para as guardas do servidor. */
export async function situacaoDeCobranca(tenantId: string) {
  const [config, assinatura] = await Promise.all([
    configDeCobranca(),
    assinaturaDoTenant(tenantId),
  ]);
  const status = (assinatura?.status as StatusAssinatura | undefined) ?? null;
  return {
    cobrancaLigada: config.ligada,
    status,
    suspenso: estaSuspenso(config.ligada, status),
    assinatura,
  };
}

export async function tenantSuspenso(tenantId: string): Promise<boolean> {
  try {
    return (await situacaoDeCobranca(tenantId)).suspenso;
  } catch {
    return false; // nunca suspender por falha de leitura
  }
}

async function auditar(
  tenantId: string,
  acao: string,
  alvo: string,
  detalhes: Record<string, unknown>,
) {
  await (
    await db()
  )
    .from("auditoria_da_barbearia")
    .insert({ tenant_id: tenantId, ator_user_id: null, acao, alvo, detalhes })
    .then(
      () => null,
      () => null,
    );
}

/** Espelha a assinatura no negócio (plano, ciclo e situação). O gatilho grava o histórico de plano. */
async function aplicarNoTenant(
  tenantId: string,
  patch: { plano?: string; ciclo?: Ciclo; status: StatusAssinatura },
) {
  const client = await db();
  const { data: t } = await client.from("tenants").select("plano").eq("id", tenantId).maybeSingle();
  const update: Record<string, unknown> = { assinatura_status: patch.status };
  if (patch.plano) update["plano"] = patch.plano;
  if (patch.ciclo) update["ciclo"] = patch.ciclo;
  await client.from("tenants").update(update).eq("id", tenantId);
  if (patch.plano && t?.plano !== patch.plano) {
    await auditar(tenantId, "plano.alterado", patch.plano, {
      de: t?.plano,
      para: patch.plano,
      origem: "cobranca",
    });
  }
}

async function planoPorChave(chave: string) {
  const { data } = await (
    await db()
  )
    .from("planos_da_plataforma")
    .select("*")
    .eq("chave", chave)
    .maybeSingle();
  return data ? planoDaLinha(data) : null;
}

async function cupomPorCodigo(codigo: string): Promise<Cupom | null> {
  // Sem curingas no código digitado: o ilike abaixo vira comparação exata sem maiúsculas.
  if (!codigoDeCupomValido(codigo)) return null;
  const { data } = await (
    await db()
  )
    .from("cupons")
    .select("*")
    .ilike("codigo", codigo.trim())
    .maybeSingle();
  return (data as Cupom) ?? null;
}

/** Valor calculado no servidor: plano + condição vigente + cupom. */
export async function calcularValor(
  tenantId: string,
  planoChave: string,
  ciclo: Ciclo,
  codigoCupom?: string | null,
) {
  const client = await db();
  const plano = await planoPorChave(planoChave);
  if (!plano || !plano.ativo) throw new Error("Este plano não está disponível.");
  const [{ data: conds }, { data: tenant }] = await Promise.all([
    client.from("condicoes_comerciais").select("*").eq("tenant_id", tenantId),
    client.from("tenants").select("criado_em").eq("id", tenantId).maybeSingle(),
  ]);
  const condicao = condicaoVigente((conds ?? []).map(condicaoDaLinha));
  let cupom: Cupom | null = null;
  if (codigoCupom && codigoCupom.trim()) {
    cupom = await cupomPorCodigo(codigoCupom);
    const novo = tenant?.criado_em
      ? Date.now() - new Date(tenant.criado_em).getTime() < 30 * 86400000
      : false;
    const erro = validarCupom(cupom, {
      plano: planoChave,
      tenantNovo: novo,
      hoje: dataIso(new Date()),
    });
    if (erro) throw new Error(erro);
    const { data: usado } = await client
      .from("cupons_usos")
      .select("id")
      .eq("cupom_id", cupom!.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (usado) throw new Error("Este cupom já foi usado neste negócio.");
  }
  const { base, comCupom } = valorDaCobranca({ plano, ciclo, condicao, cupom });
  return {
    plano,
    base,
    comCupom,
    cupom,
    mensal: valorDaCobranca({ plano, ciclo: "mensal", condicao }).base,
    anual: valorDaCobranca({ plano, ciclo: "anual", condicao }).base,
  };
}

/**
 * Cria (ou recria) a assinatura no Asaas. Se o plano tem teste e o negócio
 * nunca usou, ativa na hora em "teste" e a primeira cobrança vence no fim.
 */
export async function criarAssinatura(input: {
  tenantId: string;
  planoChave: string;
  ciclo: Ciclo;
  forma: Forma;
  cupom?: string | null;
  permitirTeste: boolean;
}) {
  const client = await db();
  const [{ data: tenant }, { data: dados }, atual] = await Promise.all([
    client.from("tenants").select("id, nome, teste_inicio").eq("id", input.tenantId).maybeSingle(),
    client.from("dados_de_cobranca").select("*").eq("tenant_id", input.tenantId).maybeSingle(),
    assinaturaDoTenant(input.tenantId),
  ]);
  if (!tenant) throw new Error("Negócio não encontrado.");
  if (!dados) throw new Error("Preencha os dados de cobrança primeiro.");

  const calc = await calcularValor(input.tenantId, input.planoChave, input.ciclo, input.cupom);
  if (calc.base <= 0) throw new Error("Planos sem cobrança só podem ser atribuídos pelo admin.");

  const api = await asaas();
  const customer =
    dados.asaas_customer_id ||
    (await api.findOrCreateCustomer({
      nome: dados.nome,
      cpfCnpj: dados.cpf_cnpj,
      email: dados.email,
      telefone: dados.telefone,
      referencia: input.tenantId,
    }));
  if (!dados.asaas_customer_id) {
    await client
      .from("dados_de_cobranca")
      .update({ asaas_customer_id: customer })
      .eq("tenant_id", input.tenantId);
  }

  // Assinatura antiga no Asaas é cancelada antes de criar a nova.
  if (atual?.asaas_subscription_id && atual.status !== "cancelada") {
    await api.call("DELETE", `/subscriptions/${atual.asaas_subscription_id}`).catch(() => null);
  }

  const usaTeste = input.permitirTeste && !tenant.teste_inicio && !atual;
  const teste = usaTeste ? datasDoTeste(new Date(), DIAS_DE_TESTE) : null;
  const vencimento = teste?.primeiroVencimento ?? dataIso(new Date());

  const assinaturaAsaas = await api.call<{ id: string }>("POST", "/subscriptions", {
    customer,
    billingType: formaDoAsaas(input.forma),
    value: calc.base / 100,
    nextDueDate: vencimento,
    cycle: input.ciclo === "anual" ? "YEARLY" : "MONTHLY",
    description: `Flow ${calc.plano.nome} — ${tenant.nome}`,
    externalReference: input.tenantId,
  });

  const restantes = calc.cupom ? calc.cupom.cobrancas_com_desconto : null;
  const linha = {
    tenant_id: input.tenantId,
    asaas_subscription_id: assinaturaAsaas.id,
    plano_chave: calc.plano.chave,
    ciclo: input.ciclo,
    forma: input.forma,
    valor_centavos: calc.base,
    status: (usaTeste ? "teste" : "aguardando_pagamento") as StatusAssinatura,
    proximo_vencimento: vencimento,
    pago_ate: usaTeste ? vencimento : (atual?.pago_ate ?? null),
    cupom_id: calc.cupom?.id ?? null,
    cobrancas_com_desconto_restantes: calc.cupom ? (restantes ?? -1) : null, // -1 = todas
    cancelar_no_fim: false,
    plano_agendado: null,
    ciclo_agendado: null,
  };
  const { data: salva, error } = await client
    .from("assinaturas")
    .upsert(linha, { onConflict: "tenant_id" })
    .select("id")
    .single();
  if (error) throw new Error("Não consegui registrar a assinatura.");

  if (usaTeste && teste) {
    await client
      .from("tenants")
      .update({ teste_inicio: teste.inicio, teste_fim: teste.fim })
      .eq("id", input.tenantId);
    await aplicarNoTenant(input.tenantId, {
      plano: calc.plano.chave,
      ciclo: input.ciclo,
      status: "teste",
    });
  }

  // Primeira cobrança: aplica o cupom já e devolve o link da fatura.
  const primeira = await primeiraFaturaEmAberto(assinaturaAsaas.id);
  if (primeira) await sincronizarPagamento(primeira.id, salva.id);
  const { data: fat } = await client
    .from("faturas")
    .select("link_pagamento")
    .eq("assinatura_id", salva.id)
    .is("pago_em", null)
    .order("vencimento", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    status: linha.status,
    valorCentavos: calc.comCupom,
    link: (fat?.link_pagamento as string | null) ?? null,
    testeAte: teste?.fim ?? null,
  };
}

async function primeiraFaturaEmAberto(subscriptionId: string): Promise<{ id: string } | null> {
  const api = await asaas();
  const r = await api
    .call<{ data: { id: string; status: string }[] }>(
      "GET",
      `/subscriptions/${subscriptionId}/payments?status=PENDING`,
    )
    .catch(() => null);
  return r?.data?.[0] ?? null;
}

/** Consulta a cobrança na API e aplica o efeito. Idempotente. */
export async function sincronizarPagamento(
  paymentId: string,
  assinaturaIdConhecida?: string,
  evento?: string,
) {
  const client = await db();
  const api = await asaas();
  let pagamento: any;
  try {
    pagamento = await api.call("GET", `/payments/${paymentId}`);
  } catch (e: any) {
    if (e?.status === 404) {
      await client.from("faturas").update({ status: "DELETED" }).eq("asaas_payment_id", paymentId);
      return;
    }
    throw e;
  }
  let assinatura: any | null = null;
  if (assinaturaIdConhecida) {
    assinatura = (
      await client.from("assinaturas").select("*").eq("id", assinaturaIdConhecida).maybeSingle()
    ).data;
  } else if (pagamento.subscription) {
    assinatura = (
      await client
        .from("assinaturas")
        .select("*")
        .eq("asaas_subscription_id", pagamento.subscription)
        .maybeSingle()
    ).data;
  }
  if (!assinatura) return; // cobrança que não é de plano do Flow

  const statusAsaas = String(pagamento.status ?? "");
  const pago = estaPago(statusAsaas, String(pagamento.billingType ?? ""));

  // Cupom em N cobranças: ajusta a cobrança pendente recém-criada.
  const restantes = assinatura.cobrancas_com_desconto_restantes as number | null;
  const { data: jaExiste } = await client
    .from("faturas")
    .select("id")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();
  let valorCentavos = Math.round(Number(pagamento.value ?? 0) * 100);
  if (
    !jaExiste &&
    statusAsaas === "PENDING" &&
    assinatura.cupom_id &&
    restantes != null &&
    restantes !== 0
  ) {
    const { data: cupom } = await client
      .from("cupons")
      .select("tipo, valor")
      .eq("id", assinatura.cupom_id)
      .maybeSingle();
    if (cupom) {
      const novo = aplicarCupomAoValor(assinatura.valor_centavos, cupom);
      if (novo !== valorCentavos && novo > 0) {
        await api.call("PUT", `/payments/${paymentId}`, {
          value: novo / 100,
          dueDate: pagamento.dueDate,
          billingType: pagamento.billingType,
        });
        valorCentavos = novo;
      }
      await client
        .from("assinaturas")
        .update({ cobrancas_com_desconto_restantes: restantes > 0 ? restantes - 1 : -1 })
        .eq("id", assinatura.id);
    }
  }

  await client.from("faturas").upsert(
    {
      asaas_payment_id: paymentId,
      tenant_id: assinatura.tenant_id,
      assinatura_id: assinatura.id,
      valor_centavos: valorCentavos,
      liquido_centavos:
        pagamento.netValue != null ? Math.round(Number(pagamento.netValue) * 100) : null,
      status: pagamento.deleted ? "DELETED" : statusAsaas,
      vencimento: pagamento.dueDate ?? null,
      pago_em: pago
        ? (pagamento.clientPaymentDate ?? pagamento.paymentDate ?? new Date().toISOString())
        : null,
      forma: formaDoCortai(pagamento.billingType),
      link_pagamento: pagamento.invoiceUrl ?? null,
    },
    { onConflict: "asaas_payment_id" },
  );

  if (pago) {
    // Troca agendada vale na renovação.
    const plano = (assinatura.plano_agendado as string | null) ?? assinatura.plano_chave;
    const ciclo = ((assinatura.ciclo_agendado as Ciclo | null) ?? assinatura.ciclo) as Ciclo;
    const venc = pagamento.dueDate ?? dataIso(new Date());
    const pagoAte = fimDoPeriodo(venc, ciclo);
    const atualizacao: Record<string, unknown> = {
      status: assinatura.cancelar_no_fim ? assinatura.status : "ativa",
      pago_ate:
        !assinatura.pago_ate || assinatura.pago_ate < pagoAte ? pagoAte : assinatura.pago_ate,
      proximo_vencimento: pagoAte,
      plano_chave: plano,
      ciclo,
      plano_agendado: null,
      ciclo_agendado: null,
    };
    if (!assinatura.cancelar_no_fim) atualizacao["status"] = "ativa";
    await client.from("assinaturas").update(atualizacao).eq("id", assinatura.id);
    await aplicarNoTenant(assinatura.tenant_id, { plano, ciclo, status: "ativa" });

    if (assinatura.cupom_id) {
      const { data: uso } = await client
        .from("cupons_usos")
        .select("id")
        .eq("cupom_id", assinatura.cupom_id)
        .eq("tenant_id", assinatura.tenant_id)
        .maybeSingle();
      if (!uso) {
        const { error } = await client
          .from("cupons_usos")
          .insert({ cupom_id: assinatura.cupom_id, tenant_id: assinatura.tenant_id });
        if (!error) {
          const { data: c } = await client
            .from("cupons")
            .select("usos")
            .eq("id", assinatura.cupom_id)
            .maybeSingle();
          await client
            .from("cupons")
            .update({ usos: (c?.usos ?? 0) + 1 })
            .eq("id", assinatura.cupom_id);
        }
      }
    }
    return;
  }

  if (
    statusAsaas === "OVERDUE" &&
    ["ativa", "teste", "aguardando_pagamento"].includes(assinatura.status)
  ) {
    await client
      .from("assinaturas")
      .update({ status: "pendente", proximo_vencimento: pagamento.dueDate })
      .eq("id", assinatura.id);
    await aplicarNoTenant(assinatura.tenant_id, { status: "pendente" });
    return;
  }

  const estorno =
    ["REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"].includes(
      statusAsaas,
    ) ||
    evento === "PAYMENT_REFUNDED" ||
    evento === "PAYMENT_CHARGEBACK_REQUESTED";
  if (estorno && assinatura.status === "ativa" && pagamento.dueDate) {
    const periodoAte = fimDoPeriodo(pagamento.dueDate, assinatura.ciclo as Ciclo);
    if (assinatura.pago_ate && periodoAte >= assinatura.pago_ate) {
      await client
        .from("assinaturas")
        .update({
          status: "pendente",
          pago_ate: pagamento.dueDate,
          proximo_vencimento: pagamento.dueDate,
        })
        .eq("id", assinatura.id);
      await aplicarNoTenant(assinatura.tenant_id, { status: "pendente" });
    }
    await auditar(assinatura.tenant_id, "cobranca.estorno", paymentId, { status: statusAsaas });
  }
}

/** Processa um evento já gravado. */
export async function processarEvento(eventId: string) {
  const client = await db();
  const { data: ev } = await client
    .from("eventos_asaas")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!ev || !deveProcessarEvento(ev)) return true;
  try {
    if (ev.payment_id) {
      await sincronizarPagamento(ev.payment_id, undefined, ev.evento);
    } else if (String(ev.evento).startsWith("SUBSCRIPTION_")) {
      const subId = ev.corpo?.subscription?.id as string | undefined;
      if (
        subId &&
        (ev.evento === "SUBSCRIPTION_DELETED" || ev.evento === "SUBSCRIPTION_INACTIVATED")
      ) {
        const { data: a } = await client
          .from("assinaturas")
          .select("id, tenant_id, pago_ate")
          .eq("asaas_subscription_id", subId)
          .maybeSingle();
        if (a) await client.from("assinaturas").update({ cancelar_no_fim: true }).eq("id", a.id);
      }
    }
    await client
      .from("eventos_asaas")
      .update({ status: "processado", erro: null, tentativas: (ev.tentativas ?? 0) + 1 })
      .eq("id", ev.id);
    return true;
  } catch (e) {
    await client
      .from("eventos_asaas")
      .update({
        status: "erro",
        erro: e instanceof Error ? e.message.slice(0, 300) : "erro",
        tentativas: (ev.tentativas ?? 0) + 1,
      })
      .eq("id", ev.id);
    return false;
  }
}

/** Varredura: reprocessa erros, confere pendências na API e aplica datas. */
export async function varreduraDeCobranca() {
  const client = await db();
  const config = await configDeCobranca();
  const resumo = { reprocessados: 0, conferidas: 0, alteradas: 0 };
  const { data: erros } = await client
    .from("eventos_asaas")
    .select("event_id")
    .neq("status", "processado")
    .lt("tentativas", 10)
    .limit(50);
  for (const e of erros ?? []) {
    await processarEvento(e.event_id);
    resumo.reprocessados += 1;
  }
  const { data: assinaturas } = await client
    .from("assinaturas")
    .select("*")
    .in("status", ["teste", "aguardando_pagamento", "ativa", "pendente", "suspensa"])
    .limit(500);
  const hoje = dataIso(new Date());
  for (const a of assinaturas ?? []) {
    if (
      config.ligada &&
      a.asaas_subscription_id &&
      ["aguardando_pagamento", "pendente", "suspensa"].includes(a.status)
    ) {
      try {
        const api = await asaas();
        const r = await api.call<{ data: { id: string }[] }>(
          "GET",
          `/subscriptions/${a.asaas_subscription_id}/payments?limit=5`,
        );
        for (const p of r?.data ?? []) await sincronizarPagamento(p.id, a.id);
        resumo.conferidas += 1;
      } catch {
        /* segue a varredura */
      }
    }
    const { data: atual } = await client
      .from("assinaturas")
      .select("*")
      .eq("id", a.id)
      .maybeSingle();
    if (!atual) continue;
    const { data: t } = await client
      .from("tenants")
      .select("teste_fim")
      .eq("id", a.tenant_id)
      .maybeSingle();
    const novo = statusPelaData({
      status: atual.status,
      hoje,
      testeFim: t?.teste_fim ?? null,
      proximoVencimento: atual.proximo_vencimento,
      pagoAte: atual.pago_ate,
      toleranciaDias: config.toleranciaDias,
      cancelarNoFim: atual.cancelar_no_fim,
    });
    if (novo !== atual.status) {
      await client.from("assinaturas").update({ status: novo }).eq("id", a.id);
      await aplicarNoTenant(a.tenant_id, { status: novo });
      resumo.alteradas += 1;
    }
  }
  return resumo;
}

/** Com a cobrança ligada, o novo negócio começa no plano inicial, em teste. */
export async function iniciarTesteDoNovoNegocio(tenantId: string) {
  try {
    const config = await configDeCobranca();
    if (!config.ligada) return;
    const plano = await planoPorChave(config.planoInicial);
    if (!plano) return;
    const client = await db();
    const teste = datasDoTeste(new Date(), DIAS_DE_TESTE);
    await client
      .from("tenants")
      .update({
        plano: plano.chave,
        teste_inicio: teste.inicio,
        teste_fim: teste.fim,
        assinatura_status: "teste",
      })
      .eq("id", tenantId);
    await client.from("assinaturas").upsert(
      {
        tenant_id: tenantId,
        plano_chave: plano.chave,
        ciclo: "mensal",
        valor_centavos: plano.precoMensalCentavos,
        status: "teste",
        proximo_vencimento: teste.primeiroVencimento,
        pago_ate: teste.primeiroVencimento,
      },
      { onConflict: "tenant_id" },
    );
  } catch {
    /* criação do negócio nunca falha por causa da cobrança */
  }
}
