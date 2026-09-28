/**
 * Agendamento como convidado — sem conta, sem senha, sem login.
 *
 * Tudo aqui é público de propósito: quem abre o link da barbearia precisa
 * conseguir marcar um horário só com nome e WhatsApp. Por isso cada função
 * valida o que recebe, resolve a barbearia pelo slug e nunca confia em ids
 * enviados pela tela sem conferir que pertencem àquela barbearia.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { HorarioDeFuncionamento } from "@/lib/horarios";
import { variantesDoTelefone } from "@/lib/telefone";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function clientePorTelefone(db: any, tenantId: string, telefone: string) {
  const { data } = await db
    .from("clientes")
    .select("id, nome, telefone")
    .eq("tenant_id", tenantId)
    .in("telefone", variantesDoTelefone(telefone))
    .is("arquivado_em", null)
    .limit(1)
    .maybeSingle();
  return data as { id: string; nome: string; telefone: string } | null;
}

export type AgendaPublica = {
  tenant: { id: string; nome: string; slug: string; whatsapp: string | null; fuso: string; endereco: string | null };
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number; profissional_ids: string[] | null }[];
  regras: { antecedenciaMin: number; intervaloEntreMin: number };
  profissionais: { id: string; nome: string; avatar_url: string | null }[];
  horarios: HorarioDeFuncionamento[];
  ocupados: { profissional_id: string | null; inicio: string; fim: string }[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function barbeariaPorSlug(db: any, slug: string) {
  const { data } = await db
    .from("tenants")
    .select("id, nome, slug, whatsapp, fuso, endereco, antecedencia_min_minutos, intervalo_entre_min")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();
  if (!data) throw new Error("Negócio não encontrado.");
  return data as AgendaPublica["tenant"] & { antecedencia_min_minutos: number | null; intervalo_entre_min: number | null };
}

function digitos(valor: string) {
  return valor.replace(/\D/g, "");
}

const slugSchema = z.string().trim().min(1).max(100);
const telefoneSchema = z
  .string()
  .trim()
  .transform(digitos)
  .refine((v) => v.length >= 10 && v.length <= 13, "Informe um WhatsApp válido com DDD.");

export const getAgendaPublica = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }): Promise<AgendaPublica> => {
    const { STATUS_QUE_OCUPAM, mapearHorarios } = await import("@/lib/agenda-regras.server");
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ate = new Date(desde.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [servicosRes, profRes, horariosRes, ocupadosRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, profissional_ids")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem"),
      db
        .from("profissionais")
        .select("id, nome, avatar_url")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome"),
      db
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id)
        .order("dia_semana"),
      db
        .from("agendamentos")
        .select("profissional_id, inicio, fim")
        .eq("tenant_id", tenant.id)
        .gte("inicio", desde.toISOString())
        .lte("inicio", ate.toISOString())
        .in("status", [...STATUS_QUE_OCUPAM]),
    ]);

    return {
      tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug, whatsapp: tenant.whatsapp, fuso: tenant.fuso, endereco: tenant.endereco },
      servicos: servicosRes.data ?? [],
      regras: { antecedenciaMin: Number(tenant.antecedencia_min_minutos ?? 0), intervaloEntreMin: Number(tenant.intervalo_entre_min ?? 0) },
      profissionais: profRes.data ?? [],
      horarios: mapearHorarios(horariosRes.data ?? []),
      ocupados: ocupadosRes.data ?? [],
    };
  });

/** Só devolve o primeiro nome, para cumprimentar quem já é cliente da casa. */
export const reconhecerCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: slugSchema, telefone: telefoneSchema }).parse(input))
  .handler(async ({ data }): Promise<{ nome: string | null }> => {
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);
    const achado = await clientePorTelefone(db, tenant.id, data.telefone);
    return { nome: achado ? String(achado.nome).split(" ")[0] ?? null : null };
  });

export type ConfirmacaoPublica = {
  agendamentoId: string;
  inicio: string;
  fim: string;
  cliente: string;
  servico: string;
  profissional: string;
  barbearia: string;
  endereco: string | null;
  whatsapp: string | null;
  valor_centavos: number;
};

export type ResultadoConvidado =
  | { tipo: "ok"; confirmacao: ConfirmacaoPublica }
  | { tipo: "conflito"; agendamentoId: string; hora: string };

export const agendarComoConvidado = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: slugSchema,
        servicoId: z.string().uuid(),
        profissionalId: z.string().uuid(),
        inicio: z.string().min(10),
        nome: z.string().trim().min(2).max(80),
        telefone: telefoneSchema,
        substituiId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ResultadoConvidado> => {
    const { validarAgendamento } = await import("@/lib/agenda-regras.server");
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);

    const inicio = new Date(data.inicio);
    if (Number.isNaN(inicio.getTime())) throw new Error("Horário inválido.");
    if (inicio.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) throw new Error("Escolha uma data mais próxima.");

    const [{ data: servico }, { data: profissional }] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, profissional_ids")
        .eq("id", data.servicoId)
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .maybeSingle(),
      db
        .from("profissionais")
        .select("id, nome")
        .eq("id", data.profissionalId)
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .maybeSingle(),
    ]);
    if (!servico) throw new Error("Esse serviço não está disponível.");
    if (!profissional) throw new Error("Esse profissional não está disponível.");

    // Ficha do cliente: reaproveita pelo WhatsApp para não duplicar cadastro.
    const existente = await clientePorTelefone(db, tenant.id, data.telefone);

    // Só pode substituir um horário do próprio WhatsApp.
    let substituiId: string | null = null;
    if (data.substituiId && existente) {
      const { data: antigo } = await db
        .from("agendamentos")
        .select("id")
        .eq("id", data.substituiId)
        .eq("tenant_id", tenant.id)
        .eq("cliente_id", existente.id)
        .maybeSingle();
      if (antigo) substituiId = antigo.id as string;
    }

    const conflito = await validarAgendamento(db, {
      tenantId: tenant.id,
      servico,
      profissionalId: profissional.id,
      inicio,
      clienteId: existente?.id ?? null,
      ignorarId: substituiId,
    });
    if (conflito) return { tipo: "conflito", ...conflito };

    let clienteId: string;
    let clienteNome: string;
    if (existente) {
      clienteId = existente.id;
      clienteNome = existente.nome;
    } else {
      const { data: novo, error } = await db
        .from("clientes")
        .insert({
          tenant_id: tenant.id,
          nome: data.nome,
          telefone: data.telefone,
          origem: "link_publico",
        })
        .select("id, nome")
        .single();
      if (error) throw new Error("Não foi possível concluir o agendamento agora.");
      clienteId = novo.id;
      clienteNome = novo.nome;
    }

    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: clienteId,
      _profissional_id: profissional.id,
      _servico_id: servico.id,
      _inicio: inicio.toISOString(),
      _forma_pagamento: "balcao",
    });
    if (error) {
      if (error.message.includes("horario ja ocupado")) throw new Error("Esse horário acabou de ser reservado, escolha outro");
      throw new Error("Não foi possível concluir o agendamento agora.");
    }
    const criado = res as any;
    await db.from("agendamentos").update({ origem: "link_publico" }).eq("id", criado.agendamento_id);

    // Alteração: o horário antigo só é liberado depois que o novo está garantido.
    if (substituiId) await db.rpc("cancelar_agendamento", { _agendamento_id: substituiId });

    // Confirmação pelo WhatsApp: nunca bloqueia nem derruba o agendamento.
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("@/lib/whatsapp/confirmacao.server");
      await enviarConfirmacaoDeAgendamento(criado.agendamento_id);
    } catch {
      /* o agendamento já está salvo; a falha fica registrada no envio */
    }

    return {
      tipo: "ok",
      confirmacao: {
        agendamentoId: criado.agendamento_id,
        inicio: new Date(criado.inicio).toISOString(),
        fim: new Date(criado.fim).toISOString(),
        cliente: clienteNome,
        servico: servico.nome,
        profissional: profissional.nome,
        barbearia: tenant.nome,
        endereco: tenant.endereco,
        whatsapp: tenant.whatsapp,
        valor_centavos: servico.preco_centavos,
      },
    };
  });

/** Situação atual de um agendamento guardado no aparelho (prova: id + WhatsApp). */
export const situacaoComoConvidado = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ agendamentoId: z.string().uuid(), telefone: telefoneSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ status: string; inicio: string; fim: string } | null> => {
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("status, inicio, fim, clientes!inner(telefone)")
      .eq("id", data.agendamentoId)
      .maybeSingle();
    if (!ag) return null;
    const tel = String((ag as any).clientes?.telefone ?? "");
    if (!variantesDoTelefone(tel).some((v) => variantesDoTelefone(data.telefone).includes(v))) return null;
    return { status: ag.status as string, inicio: new Date(ag.inicio).toISOString(), fim: new Date(ag.fim).toISOString() };
  });

/** Nome, descrição e capa da barbearia para a prévia do link (WhatsApp, Instagram). */
export const getPreviaDaBarbearia = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }): Promise<{ nome: string; descricao: string | null; imagem: string | null } | null> => {
    try {
      const db = await admin();
      const { data: t } = await db
        .from("tenants")
        .select("nome, descricao, texto_boas_vindas, capa_url, logo_url")
        .eq("slug", data.slug)
        .eq("ativo", true)
        .maybeSingle();
      if (!t) return null;
      const caminho = (t.capa_url || t.logo_url) as string | null;
      let imagem: string | null = null;
      if (caminho?.startsWith("https://")) imagem = caminho;
      else if (caminho) {
        const { data: url } = await db.storage.from("tenant-logos").createSignedUrl(caminho, 60 * 60 * 24 * 30);
        imagem = url?.signedUrl ?? null;
      }
      return { nome: t.nome as string, descricao: (t.descricao || t.texto_boas_vindas || null) as string | null, imagem };
    } catch {
      return null;
    }
  });

/** Cancelamento sem conta: só vale com o mesmo WhatsApp que marcou. */
export const cancelarComoConvidado = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ agendamentoId: z.string().uuid(), telefone: telefoneSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ cancelado: boolean }> => {
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("id, status, clientes!inner(telefone)")
      .eq("id", data.agendamentoId)
      .maybeSingle();
    if (!ag) throw new Error("Agendamento não encontrado.");
    const telefone = String((ag as any).clientes?.telefone ?? "");
    if (!variantesDoTelefone(telefone).some((v) => variantesDoTelefone(data.telefone).includes(v))) throw new Error("Agendamento não encontrado.");
    const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: data.agendamentoId });
    if (error) throw new Error("Não foi possível cancelar agora.");
    try {
      const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
      await notificarAgendamento(data.agendamentoId, "cancelamento");
    } catch {
      /* o cancelamento já está salvo */
    }
    return { cancelado: true };
  });


/**
 * Liga a ficha criada pelo link público à conta que o cliente acabou de criar.
 * Prova: id do agendamento + WhatsApp guardados no aparelho. Só se a ficha ainda não tem conta.
 */
export const vincularFichaDoConvidado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ agendamentoId: z.string().uuid(), telefone: telefoneSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ vinculado: boolean; slug: string | null }> => {
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("cliente_id, tenant_id, clientes!inner(id, telefone, user_id), tenants!inner(slug)")
      .eq("id", data.agendamentoId)
      .maybeSingle();
    if (!ag) return { vinculado: false, slug: null };
    const cli = (ag as any).clientes;
    const slug = ((ag as any).tenants?.slug as string) ?? null;
    if (!variantesDoTelefone(String(cli?.telefone ?? "")).some((v) => variantesDoTelefone(data.telefone).includes(v))) {
      return { vinculado: false, slug };
    }
    if (cli.user_id) return { vinculado: cli.user_id === context.userId, slug };
    // Uma ficha por conta em cada barbearia.
    const { data: jaTem } = await db
      .from("clientes")
      .select("id")
      .eq("tenant_id", (ag as any).tenant_id)
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (jaTem) return { vinculado: false, slug };
    const { error } = await db.from("clientes").update({ user_id: context.userId }).eq("id", cli.id).is("user_id", null);
    return { vinculado: !error, slug };
  });
