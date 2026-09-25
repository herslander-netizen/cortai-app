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

export type AgendaPublica = {
  tenant: { id: string; nome: string; slug: string; whatsapp: string | null; fuso: string };
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
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
    .select("id, nome, slug, whatsapp, fuso")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();
  if (!data) throw new Error("Barbearia não encontrada.");
  return data as AgendaPublica["tenant"];
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
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);

    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    const ate = new Date(desde.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [servicosRes, profRes, horariosRes, ocupadosRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
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
        .not("status", "in", "(cancelado,falta)"),
    ]);

    return {
      tenant,
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      horarios: (horariosRes.data ?? []).map((h: Record<string, any>) => ({
        diaSemana: h["dia_semana"] as number,
        fechado: Boolean(h["fechado"]),
        abre: String(h["abre"]).slice(0, 5),
        fecha: String(h["fecha"]).slice(0, 5),
        intervaloInicio: h["intervalo_inicio"] ? String(h["intervalo_inicio"]).slice(0, 5) : null,
        intervaloFim: h["intervalo_fim"] ? String(h["intervalo_fim"]).slice(0, 5) : null,
      })),
      ocupados: ocupadosRes.data ?? [],
    };
  });

/** Só devolve o primeiro nome, para cumprimentar quem já é cliente da casa. */
export const reconhecerCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: slugSchema, telefone: telefoneSchema }).parse(input))
  .handler(async ({ data }): Promise<{ nome: string | null }> => {
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);
    const { data: clientes } = await db
      .from("clientes")
      .select("nome, telefone")
      .eq("tenant_id", tenant.id)
      .is("arquivado_em", null)
      .limit(500);
    const achado = (clientes ?? []).find((c: any) => digitos(String(c.telefone ?? "")) === data.telefone);
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
  whatsapp: string | null;
  valor_centavos: number;
};

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
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ConfirmacaoPublica> => {
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);

    const inicio = new Date(data.inicio);
    if (Number.isNaN(inicio.getTime())) throw new Error("Horário inválido.");
    if (inicio.getTime() < Date.now() - 60_000) throw new Error("Esse horário já passou.");
    {
      const { data: regra } = await db.from("tenants").select("antecedencia_min_minutos").eq("id", tenant.id).maybeSingle();
      const antecedencia = Number((regra as { antecedencia_min_minutos?: number } | null)?.antecedencia_min_minutos ?? 0);
      if (antecedencia > 0 && inicio.getTime() < Date.now() + antecedencia * 60_000) {
        throw new Error(`Esta barbearia agenda com pelo menos ${antecedencia >= 60 ? `${Math.round(antecedencia / 60)} h` : `${antecedencia} min`} de antecedência.`);
      }
    }
    if (inicio.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) throw new Error("Escolha uma data mais próxima.");

    const [{ data: servico }, { data: profissional }] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
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
    const { data: clientes } = await db
      .from("clientes")
      .select("id, nome, telefone")
      .eq("tenant_id", tenant.id)
      .limit(1000);
    const existente = (clientes ?? []).find((c: any) => digitos(String(c.telefone ?? "")) === data.telefone);

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
      if (error.message.includes("horario ja ocupado")) throw new Error("Esse horário acabou de ser ocupado. Escolha outro.");
      throw new Error("Não foi possível concluir o agendamento agora.");
    }
    const criado = res as any;

    // Confirmação pelo WhatsApp: nunca bloqueia nem derruba o agendamento.
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("@/lib/whatsapp/confirmacao.server");
      await enviarConfirmacaoDeAgendamento(criado.agendamento_id);
    } catch {
      /* o agendamento já está salvo; a falha fica registrada no envio */
    }

    return {
      agendamentoId: criado.agendamento_id,
      inicio: criado.inicio,
      fim: criado.fim,
      cliente: clienteNome,
      servico: servico.nome,
      profissional: profissional.nome,
      barbearia: tenant.nome,
      whatsapp: tenant.whatsapp,
      valor_centavos: servico.preco_centavos,
    };
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
    const telefone = digitos(String((ag as any).clientes?.telefone ?? ""));
    if (telefone !== data.telefone) throw new Error("Agendamento não encontrado.");
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
