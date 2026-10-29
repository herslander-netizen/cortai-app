/**
 * Teste grátis de 45 dias: início com antiabuso, rebaixamento sem bloqueio,
 * cota de WhatsApp automático e régua de avisos. Só roda no servidor.
 */
import { createHash } from "node:crypto";

import {
  DIAS_DA_REGUA,
  DIAS_DA_REGUA_NO_WHATSAPP,
  LIMITE_WHATSAPP_NO_TESTE,
  PLANO_GRATUITO,
  PLANO_DO_TESTE,
  datasDoNovoTeste,
  deveRebaixar,
  diaDoTeste,
  diasRestantesDoTeste,
  faixaDoLimite,
  mesDeReferencia,
  normalizarTelefone,
  testeAtivo,
} from "@/lib/teste-gratis";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function resumo(tipo: string, valor: string) {
  return createHash("sha256").update(`cortai:${tipo}:${valor}`).digest("hex");
}

async function avisar(tenantId: string, titulo: string, corpo: string, link = "/barbeiro/plano") {
  const client = await db();
  await client.rpc("criar_notificacao", {
    _tenant: tenantId,
    _tipo: "teste",
    _titulo: titulo,
    _corpo: corpo,
    _link: link,
  });
}

/**
 * Começa o teste do negócio novo. Um teste por CPF/CNPJ e por telefone:
 * se já foi usado, o negócio nasce no plano gratuito, sem teste.
 */
export async function iniciarTesteGratis(
  tenantId: string,
  ids: { documento?: string | null; telefone?: string | null; planoEscolhido?: string | null },
): Promise<{ emTeste: boolean; motivo?: string }> {
  const client = await db();
  const chaves: { tipo: string; hash: string }[] = [];
  const doc = (ids.documento ?? "").replace(/\D/g, "");
  if (doc) chaves.push({ tipo: "documento", hash: resumo("documento", doc) });
  const tel = (ids.telefone ?? "").replace(/\D/g, "");
  if (tel.length >= 10)
    chaves.push({ tipo: "telefone", hash: resumo("telefone", normalizarTelefone(tel)) });

  if (chaves.length) {
    const { data: usados } = await client
      .from("testes_usados")
      .select("tipo")
      .in(
        "hash",
        chaves.map((c) => c.hash),
      );
    if ((usados ?? []).length) {
      await client
        .from("tenants")
        .update({ plano: PLANO_GRATUITO, assinatura_status: null, teste_negado: true })
        .eq("id", tenantId);
      return {
        emTeste: false,
        motivo:
          "Este CPF/CNPJ ou telefone já usou o teste grátis. Seu negócio começa no plano Essencial gratuito; você pode assinar quando quiser.",
      };
    }
  }

  const { inicio, fim } = datasDoNovoTeste();
  await client
    .from("tenants")
    .update({
      plano: PLANO_GRATUITO,
      plano_escolhido: ids.planoEscolhido ?? PLANO_DO_TESTE,
      teste_inicio: inicio,
      teste_fim: fim,
      assinatura_status: "teste",
    })
    .eq("id", tenantId);
  if (chaves.length) {
    await client.from("testes_usados").upsert(
      chaves.map((c) => ({ ...c, tenant_id: tenantId })),
      { onConflict: "tipo,hash", ignoreDuplicates: true },
    );
  }
  return { emTeste: true };
}

/** Teste vencido sem pagamento: vira o plano gratuito. Nada é apagado. */
export async function rebaixarTestesVencidos(agora = new Date()) {
  const client = await db();
  const { data } = await client
    .from("tenants")
    .select("id, plano, assinatura_status, teste_fim")
    .eq("assinatura_status", "teste")
    .lt("teste_fim", agora.toISOString())
    .limit(500);
  let rebaixados = 0;
  for (const t of data ?? []) {
    if (
      !deveRebaixar({ status: t.assinatura_status, testeFim: t.teste_fim, plano: t.plano }, agora)
    )
      continue;
    await client
      .from("tenants")
      .update({ plano: PLANO_GRATUITO, assinatura_status: null })
      .eq("id", t.id);
    await client
      .from("assinaturas")
      .update({ status: "cancelada" })
      .eq("tenant_id", t.id)
      .eq("status", "teste");
    await avisar(
      t.id,
      "Seu teste grátis terminou",
      "Seu negócio está no plano Essencial gratuito. Nenhum dado foi apagado. Assine para voltar a ter tudo.",
    );
    rebaixados += 1;
  }
  return rebaixados;
}

/**
 * Reserva um envio automático. Durante o teste há cota mensal; em 80% o dono
 * é avisado, em 100% só os automáticos pausam. Fora do teste não limita.
 */
export async function reservarEnvioAutomatico(
  tenantId: string,
  agora = new Date(),
): Promise<boolean> {
  const client = await db();
  const { data: t } = await client
    .from("tenants")
    .select(
      "plano, assinatura_status, teste_fim, envios_auto_mes, envios_auto_qtd, envios_auto_aviso80",
    )
    .eq("id", tenantId)
    .maybeSingle();
  if (
    !t ||
    !testeAtivo({ status: t.assinatura_status, testeFim: t.teste_fim, plano: t.plano }, agora)
  )
    return true;
  const mes = mesDeReferencia(agora);
  const qtd = t.envios_auto_mes === mes ? (t.envios_auto_qtd ?? 0) : 0;
  const avisado = t.envios_auto_mes === mes ? Boolean(t.envios_auto_aviso80) : false;
  if (faixaDoLimite(qtd) === "pausado") return false;
  const nova = qtd + 1;
  const faixa = faixaDoLimite(nova);
  await client
    .from("tenants")
    .update({
      envios_auto_mes: mes,
      envios_auto_qtd: nova,
      envios_auto_aviso80: avisado || faixa !== "livre",
    })
    .eq("id", tenantId);
  if (!avisado && faixa === "aviso") {
    await avisar(
      tenantId,
      "WhatsApp automático: 80% do limite do teste",
      `Você usou ${nova} de ${LIMITE_WHATSAPP_NO_TESTE} mensagens deste mês. Ao chegar no limite, só os envios automáticos pausam.`,
    );
  }
  if (faixa === "pausado") {
    await avisar(
      tenantId,
      "WhatsApp automático pausado",
      `O limite de ${LIMITE_WHATSAPP_NO_TESTE} mensagens do teste neste mês foi atingido. O app continua funcionando normalmente.`,
    );
  }
  return true;
}

async function numerosDoTeste(tenantId: string, desde: string) {
  const client = await db();
  const [lembretes, online, faltas] = await Promise.all([
    client
      .from("envios_de_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "enviado")
      .in("tipo", ["lembrete_24h", "lembrete_2h"])
      .gte("criado_em", desde),
    client
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("origem", ["link_publico", "app", "whatsapp"])
      .gte("criado_em", desde),
    client
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "nao_compareceu")
      .gte("criado_em", desde),
  ]);
  return { lembretes: lembretes.count ?? 0, online: online.count ?? 0, faltas: faltas.count ?? 0 };
}

function textoDaRegua(dia: number, restam: number, n?: { lembretes: number; online: number }) {
  if (dia === 1)
    return {
      titulo: "Bem-vindo ao teste grátis",
      corpo: `Você tem ${restam} dias com tudo liberado. Comece cadastrando serviços e conectando o WhatsApp.`,
    };
  if (dia === 7)
    return {
      titulo: "Uma semana de Flow",
      corpo: "Já ativou os lembretes automáticos? Eles reduzem as faltas sem você mandar mensagem.",
    };
  if (dia === 30 && n) {
    const partes = [
      n.lembretes ? `${n.lembretes} lembretes enviados` : "",
      n.online ? `${n.online} agendamentos feitos pelo cliente` : "",
    ].filter(Boolean);
    return {
      titulo: `Restam ${restam} dias de teste`,
      corpo: partes.length
        ? `Até agora: ${partes.join(" e ")}.`
        : "Ainda dá tempo de ligar os lembretes e o link de agendamento.",
    };
  }
  if (dia === 40)
    return {
      titulo: `Restam ${restam} dias de teste`,
      corpo: "Escolha seu plano para não perder o WhatsApp automático.",
    };
  return {
    titulo: "Seu teste termina amanhã",
    corpo:
      "Assine pelo Pix em poucos segundos. Sem assinar, o negócio vira o plano Essencial gratuito, sem perder dados.",
  };
}

/** Régua de avisos do teste. Um aviso por negócio por dia da régua. */
export async function processarReguaDoTeste(agora = new Date()) {
  const client = await db();
  const { data } = await client
    .from("tenants")
    .select("id, nome, whatsapp, teste_inicio, teste_fim, avisos_teste_enviados")
    .eq("assinatura_status", "teste")
    .gte("teste_fim", agora.toISOString())
    .limit(1000);
  let avisos = 0;
  for (const t of data ?? []) {
    const dia = diaDoTeste(t.teste_inicio, agora);
    const enviados: number[] = t.avisos_teste_enviados ?? [];
    if (!(DIAS_DA_REGUA as readonly number[]).includes(dia) || enviados.includes(dia)) continue;
    const restam = diasRestantesDoTeste(t.teste_fim, agora);
    const n = dia === 30 ? await numerosDoTeste(t.id, t.teste_inicio) : undefined;
    const { titulo, corpo } = textoDaRegua(dia, restam, n);
    await client
      .from("tenants")
      .update({ avisos_teste_enviados: [...enviados, dia] })
      .eq("id", t.id);
    await avisar(t.id, titulo, corpo, dia === 44 ? "/barbeiro/plano?pagar=pix" : "/barbeiro/plano");
    // WhatsApp do dono nos dias 30 e 44: depende de um modelo de utilidade
    // aprovado na Meta (fora da janela de 24h só modelo aprovado pode sair).
    if ((DIAS_DA_REGUA_NO_WHATSAPP as readonly number[]).includes(dia) && t.whatsapp) {
      console.info("[teste] aviso por WhatsApp aguardando modelo aprovado", t.id, dia);
    }
    avisos += 1;
  }
  return avisos;
}
