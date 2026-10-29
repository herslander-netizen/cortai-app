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

import { getRequest } from "@tanstack/react-start/server";

import { hojeNoFuso, normalizarFuso as normalizarFusoExtra, somarDias, type ExcecaoIntervaloAgenda, type HorarioDeFuncionamento } from "@/lib/horarios";
import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizarPagina, type PaginaConfig } from "@/lib/pagina-config";
import { segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";
import { validarPreferenciasCliente, type PreferenciasCliente } from "@/lib/preferencias-cliente";

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

/** Agendamentos futuros ativos permitidos por WhatsApp em cada barbearia. */
const MAX_FUTUROS_POR_TELEFONE = 3;

/** Limites por minuto dos endpoints públicos (por IP e por WhatsApp). */
const LIMITES = {
  agendar: { ip: 8, telefone: 4 },
  reconhecer: { ip: 20, telefone: 10 },
  situacao: { ip: 30, telefone: 15 },
  cancelar: { ip: 8, telefone: 5 },
  preferencias: { ip: 10, telefone: 5 },
} as const;

/** Barra excesso de chamadas usando os mesmos contadores no banco do webhook-guard. */
async function limitarPublico(acao: keyof typeof LIMITES, telefone?: string) {
  const { ipDaChamada, consumirLimite, BALDE_SEM_IP } = await import("@/lib/webhook-guard.server");
  let ip: string | null = null;
  try {
    ip = ipDaChamada(getRequest());
  } catch {
    ip = null;
  }
  const limite = LIMITES[acao];
  // Sem IP identificável: balde próprio e 10× mais folgado, para não travar ninguém.
  const okIp = await consumirLimite(
    `pub:${acao}|ip:${ip ?? BALDE_SEM_IP}`,
    ip ? limite.ip : limite.ip * 10,
  );
  const okTel = telefone
    ? await consumirLimite(`pub:${acao}|tel:${normalizarTelefone(telefone)}`, limite.telefone)
    : true;
  if (!okIp || !okTel)
    throw new Error("Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.");
}

export type AgendaPublica = {
  tenant: {
    id: string;
    nome: string;
    slug: string;
    whatsapp: string | null;
    fuso: string;
    endereco: string | null;
    usaListaDeEspera: boolean;
    segmento: Segmento;
    logoUrl: string | null;
    capaUrl: string | null;
    assinaturaVisivel?: boolean;
  };
  servicos: {
    id: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    profissional_ids: string[] | null;
    foto_url: string | null;
  }[];
  regras: {
    antecedenciaMin: number;
    intervaloEntreMin: number;
    janelaDias: number;
    passoMin: number;
  };
  profissionais: { id: string; nome: string; avatar_url: string | null }[];
  horarios: HorarioDeFuncionamento[];
  excecoesIntervalo: ExcecaoIntervaloAgenda[];
  ocupados: { profissional_id: string | null; inicio: string; fim: string }[];
  pagina: PaginaConfig;
  agendaOnline: "aberta" | "limite_atingido";
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function barbeariaPorSlug(db: any, slug: string) {
  const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
  const resolvido = await resolverTenantPorSlug(db, slug);
  if (!resolvido) throw new Error("Negócio não encontrado.");
  const { data } = await db
    .from("tenants")
    .select(
      "id, nome, slug, whatsapp, fuso, endereco, segmento, logo_url, capa_url, antecedencia_min_minutos, intervalo_entre_min, janela_agendamento_dias, passo_horarios_min",
    )
    .eq("id", resolvido.tenant_id)
    .eq("ativo", true)
    .maybeSingle();
  if (!data) throw new Error("Negócio não encontrado.");
  return data as Omit<AgendaPublica["tenant"], "usaListaDeEspera"> & {
    antecedencia_min_minutos: number | null;
    intervalo_entre_min: number | null;
    janela_agendamento_dias: number | null;
    passo_horarios_min: number | null;
  };
}

function digitos(valor: string) {
  return valor.replace(/\D/g, "");
}

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((v) => v.toLowerCase());
const telefoneSchema = z
  .string()
  .trim()
  .transform(digitos)
  .refine((v) => v.length >= 10 && v.length <= 13, "Informe um WhatsApp válido com DDD.");

function bytesParaHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function criarTokenDePreferencias() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesParaHex(bytes);
}

export async function hashDoTokenDePreferencias(token: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesParaHex(new Uint8Array(hash));
}

export const getAgendaPublica = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }): Promise<AgendaPublica> => {
    const { STATUS_QUE_OCUPAM, mapearHorarios, janelaValida, passoValido } =
      await import("@/lib/agenda-regras.server");
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);
    const janelaDias = janelaValida(tenant.janela_agendamento_dias);
    const fuso = normalizarFusoExtra(tenant.fuso);
    const hojeLocal = hojeNoFuso(fuso);
    const inicioExcecoes = somarDias(hojeLocal, -1);
    const fimExcecoes = somarDias(hojeLocal, janelaDias + 2);

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ate = new Date(desde.getTime() + (janelaDias + 2) * 24 * 60 * 60 * 1000);

    const [servicosRes, profRes, horariosRes, excecoesRes, ocupadosRes, filaRes, paginaRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, profissional_ids, foto_url")
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
        .from("excecoes_intervalo_agenda")
        .select("dia, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id)
        .gte("dia", inicioExcecoes)
        .lte("dia", fimExcecoes),
      db
        .from("agendamentos")
        .select("profissional_id, inicio, fim")
        .eq("tenant_id", tenant.id)
        .gte("inicio", desde.toISOString())
        .lte("inicio", ate.toISOString())
        .in("status", [...STATUS_QUE_OCUPAM]),
      db.rpc("recurso_do_tenant_ativo", { _tenant_id: tenant.id, _chave: "fila_espera" }),
      db
        .from("tenant_page_configs")
        .select("published_config")
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
    ]);

    if (excecoesRes.error) throw new Error("Não foi possível carregar a disponibilidade deste negócio.");

    const assinar = async (path: string | null | undefined) => {
      if (!path) return null;
      if (/^https?:/.test(path)) return path;
      const { data } = await db.storage.from("tenant-logos").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    };
    const servicos: AgendaPublica["servicos"] = await Promise.all(
      (servicosRes.data ?? []).map(async (servico) => ({
        id: servico.id,
        nome: servico.nome,
        duracao_min: servico.duracao_min,
        preco_centavos: servico.preco_centavos,
        profissional_ids: servico.profissional_ids,
        foto_url: await assinar(servico.foto_url),
      })),
    );
    const profissionais: AgendaPublica["profissionais"] = await Promise.all(
      (profRes.data ?? []).map(async (profissional) => ({
        id: profissional.id,
        nome: profissional.nome,
        avatar_url: await assinar(profissional.avatar_url),
      })),
    );
    const container = paginaRes.data?.published_config as { pagina?: unknown } | null;
    const pagina = normalizarPagina(container?.pagina);
    const avatarUrl = await assinar(pagina.chat.avatarUrl);

    return {
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        whatsapp: tenant.whatsapp,
        fuso: tenant.fuso,
        endereco: tenant.endereco,
        usaListaDeEspera: filaRes.data === true,
        segmento: segmentoParaApresentacao((tenant as Record<string, unknown>)["segmento"]),
        logoUrl: await assinar((tenant as Record<string, unknown>)["logo_url"] as string | null),
        capaUrl: await assinar((tenant as Record<string, unknown>)["capa_url"] as string | null),
        assinaturaVisivel: (tenant as Record<string, unknown>)["assinatura_visivel"] !== false,
      },
      servicos,
      regras: {
        antecedenciaMin: Number(tenant.antecedencia_min_minutos ?? 0),
        intervaloEntreMin: Number(tenant.intervalo_entre_min ?? 0),
        janelaDias,
        passoMin: passoValido(tenant.passo_horarios_min),
      },
      profissionais,
      horarios: mapearHorarios(horariosRes.data ?? []),
      excecoesIntervalo: (excecoesRes.data ?? []).map((linha) => ({
        dia: linha.dia,
        intervaloInicio: linha.intervalo_inicio ? String(linha.intervalo_inicio).slice(0, 5) : null,
        intervaloFim: linha.intervalo_fim ? String(linha.intervalo_fim).slice(0, 5) : null,
      })),
      ocupados: [
        ...(ocupadosRes.data ?? []),
        ...(await (
          await import("@/lib/ocupacoes-extras.server")
        ).ocupacoesExtras(db, {
          tenantId: tenant.id,
          fuso,
          desde,
          ate,
        })),
      ],
      pagina: { ...pagina, chat: { ...pagina.chat, avatarUrl } },
      agendaOnline: await (
        await import("@/lib/agenda-online.server")
      )
        .usoDaAgendaOnline(db, tenant.id)
        .then((r) => r.estado)
        .catch(() => "aberta" as const),
    };
  });

/**
 * Não revela nome de nenhum telefone: qualquer pessoa poderia digitar o número de
 * outra. A saudação "Olá, nome" vem só do aparelho de quem acabou de agendar.
 * Mantido para compatibilidade com telas antigas; sempre devolve nome null.
 */
export const reconhecerCliente = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ slug: slugSchema, telefone: telefoneSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ nome: string | null }> => {
    await limitarPublico("reconhecer", data.telefone);
    return { nome: null };
  });

export type ConfirmacaoPublica = {
  agendamentoId: string;
  preferenciasToken: string;
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
  .validator((input: unknown) =>
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
    await limitarPublico("agendar", data.telefone);
    const { validarAgendamento, janelaValida, STATUS_ATIVOS_DO_CLIENTE } =
      await import("@/lib/agenda-regras.server");
    const db = await admin();
    const tenant = await barbeariaPorSlug(db, data.slug);
    const { exigirAgendamentoPeloCliente } = await import("@/lib/planos");
    await exigirAgendamentoPeloCliente(tenant.id);

    const inicio = new Date(data.inicio);
    if (Number.isNaN(inicio.getTime())) throw new Error("Horário inválido.");
    const janelaDias = janelaValida(tenant.janela_agendamento_dias);
    if (inicio.getTime() > Date.now() + janelaDias * 24 * 60 * 60 * 1000) {
      throw new Error(
        `Este negócio agenda com até ${janelaDias} dias de antecedência. Escolha uma data mais próxima.`,
      );
    }

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

    // Só pode substituir um horário ativo do próprio WhatsApp; senão, erro (nunca cria um segundo em silêncio).
    let substituiId: string | null = null;
    let origemHerdada: string | null = null;
    if (data.substituiId) {
      const { data: antigo } = existente
        ? await db
            .from("agendamentos")
            .select("id, origem")
            .eq("id", data.substituiId)
            .eq("tenant_id", tenant.id)
            .eq("cliente_id", existente.id)
            .in("status", [...STATUS_ATIVOS_DO_CLIENTE])
            .maybeSingle()
        : { data: null };
      if (!antigo)
        throw new Error(
          "Não encontramos o horário que você quer alterar. Confira o WhatsApp informado.",
        );
      substituiId = antigo.id as string;
      origemHerdada = (antigo as { origem?: string | null }).origem ?? null;
    }

    // Anti-abuso: poucos horários futuros ativos por WhatsApp em cada barbearia.
    if (existente) {
      let consulta = db
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("cliente_id", existente.id)
        .in("status", [...STATUS_ATIVOS_DO_CLIENTE])
        .gte("inicio", new Date().toISOString());
      if (substituiId) consulta = consulta.neq("id", substituiId);
      const { count } = await consulta;
      if ((count ?? 0) >= MAX_FUTUROS_POR_TELEFONE) {
        throw new Error(
          `Você já tem ${MAX_FUTUROS_POR_TELEFONE} horários marcados aqui. Cancele ou altere um deles para marcar outro.`,
        );
      }
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
    let fichaCriadaAgora = false;
    if (existente) {
      clienteId = existente.id;
      clienteNome = existente.nome;
    } else {
      const { data: novo, error } = await db
        .from("clientes")
        .insert({
          tenant_id: tenant.id,
          nome: data.nome,
          telefone: normalizarTelefone(data.telefone),
          origem: "link_publico",
        })
        .select("id, nome")
        .single();
      if (error) {
        // Corrida: outra requisição criou a mesma ficha (único por barbearia + telefone). Reaproveita.
        const outra =
          error.code === "23505" ? await clientePorTelefone(db, tenant.id, data.telefone) : null;
        if (!outra) throw new Error("Não foi possível concluir o agendamento agora.");
        clienteId = outra.id;
        clienteNome = outra.nome;
      } else {
        clienteId = novo.id;
        clienteNome = novo.nome;
        fichaCriadaAgora = true;
      }
    }

    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: clienteId,
      _profissional_id: profissional.id,
      _servico_id: servico.id,
      _inicio: inicio.toISOString(),
      _forma_pagamento: "balcao",
      _validar_regras: true,
    });
    if (error) {
      // Nada de ficha órfã: a ficha criada nesta chamada sai junto com a falha.
      if (fichaCriadaAgora) {
        await db.from("carteiras").delete().eq("cliente_id", clienteId).eq("tenant_id", tenant.id);
        const { error: erroLimpeza } = await db
          .from("clientes")
          .delete()
          .eq("id", clienteId)
          .eq("tenant_id", tenant.id);
        if (erroLimpeza)
          console.error(
            "[agendamento-publico] ficha órfã não removida",
            clienteId,
            erroLimpeza.message,
          );
      }
      if (error.message.includes("horario ja ocupado"))
        throw new Error("Esse horário acabou de ser reservado, escolha outro");
      if (error.message.includes("fora do horario"))
        throw new Error("Esse horário está fora do funcionamento do negócio.");
      if (error.message.includes("fora do periodo"))
        throw new Error("Escolha uma data mais próxima.");
      throw new Error("Não foi possível concluir o agendamento agora.");
    }
    const criado = res as any;
    const preferenciasToken = criarTokenDePreferencias();
    const preferenciasTokenHash = await hashDoTokenDePreferencias(preferenciasToken);
    const { error: erroToken } = await db
      .from("agendamentos")
      .update({
        origem: (origemHerdada ?? "link_publico") as "link_publico",
        preferencias_token_hash: preferenciasTokenHash,
      })
      .eq("id", criado.agendamento_id);
    if (erroToken) {
      await db.rpc("cancelar_agendamento", { _agendamento_id: criado.agendamento_id });
      throw new Error("Não foi possível concluir o agendamento agora.");
    }

    // Alteração: o horário antigo só é liberado depois que o novo está garantido.
    // Se não der para liberar, o novo é desfeito e o cliente fica só com o antigo.
    if (substituiId) {
      const { concluirSubstituicao } = await import("@/lib/substituicao.server");
      await concluirSubstituicao(db as never, {
        novoId: criado.agendamento_id,
        antigoId: substituiId,
      });
      try {
        const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
        await notificarAgendamento(substituiId, "cancelamento");
      } catch {
        /* o cancelamento já está salvo */
      }
    }

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
        preferenciasToken,
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

/** Preferências opcionais após a confirmação; não lê nem devolve a ficha privada. */
export const salvarPreferenciasDoAgendamento = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const base = z
      .object({
        agendamentoId: z.string().uuid(),
        token: z
          .string()
          .length(64)
          .regex(/^[a-f0-9]+$/),
        preferencias: z.unknown(),
      })
      .strict()
      .parse(input);
    return { ...base, preferencias: validarPreferenciasCliente(base.preferencias) };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await limitarPublico("preferencias");
    if (Object.keys(data.preferencias).length === 0)
      throw new Error("Não foi possível salvar agora.");
    const db = await admin();
    const { error } = await db.rpc("salvar_preferencias_do_agendamento", {
      _agendamento_id: data.agendamentoId,
      _token_hash: await hashDoTokenDePreferencias(data.token),
      _preferencias: data.preferencias as PreferenciasCliente,
    });
    if (error) throw new Error("Não foi possível salvar agora.");
    return { ok: true };
  });

/** Situação atual de um agendamento guardado no aparelho (prova: id + WhatsApp). */
export const situacaoComoConvidado = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ agendamentoId: z.string().uuid(), telefone: telefoneSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ status: string; inicio: string; fim: string } | null> => {
    await limitarPublico("situacao", data.telefone);
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("status, inicio, fim, clientes!inner(telefone)")
      .eq("id", data.agendamentoId)
      .maybeSingle();
    if (!ag) return null;
    const tel = String((ag as any).clientes?.telefone ?? "");
    if (!variantesDoTelefone(tel).some((v) => variantesDoTelefone(data.telefone).includes(v)))
      return null;
    return {
      status: ag.status as string,
      inicio: new Date(ag.inicio).toISOString(),
      fim: new Date(ag.fim).toISOString(),
    };
  });

/** Nome, descrição e capa da barbearia para a prévia do link (WhatsApp, Instagram). */
export const getPreviaDaBarbearia = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }): Promise<PreviaPublica | null> => {
    try {
      const db = await admin();
      const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
      const resolvido = await resolverTenantPorSlug(db, data.slug);
      if (!resolvido) return null;
      const { data: t } = await db
        .from("tenants")
        .select(
          "slug, nome, descricao, texto_boas_vindas, capa_url, logo_url, segmento, endereco, telefone, whatsapp, instagram",
        )
        .eq("id", resolvido.tenant_id)
        .eq("ativo", true)
        .maybeSingle();
      if (!t) return null;
      const [{ data: horarios }, { data: servicos }, { data: cfg }] = await Promise.all([
        db
          .from("horarios_de_funcionamento")
          .select("dia_semana, fechado, abre, fecha")
          .eq("tenant_id", resolvido.tenant_id)
          .order("dia_semana"),
        db
          .from("servicos")
          .select("preco_centavos")
          .eq("tenant_id", resolvido.tenant_id)
          .eq("ativo", true),
        db
          .from("tenant_page_configs")
          .select("published_config")
          .eq("tenant_id", resolvido.tenant_id)
          .maybeSingle(),
      ]);
      const publicada = normalizarPagina(
        (cfg?.published_config as { pagina?: unknown } | null)?.pagina,
      );
      const slugAtual = (t.slug as string) || data.slug;
      const temImagem = Boolean(t.capa_url || t.logo_url);
      const logo =
        typeof t.logo_url === "string" && t.logo_url.startsWith("https://") ? t.logo_url : null;
      return {
        slug: slugAtual,
        nome: t.nome as string,
        descricao: (t.descricao || t.texto_boas_vindas || null) as string | null,
        // Endereço estável: redireciona para uma URL assinada nova a cada acesso.
        imagem: temImagem
          ? `https://cortai.dev/api/public/capa/${slugAtual}`
          : "https://cortai.dev/capa-social-cortai.jpg",
        logo,
        segmento: (t.segmento as string | null) ?? null,
        endereco: (t.endereco as string | null) ?? null,
        telefone: (t.telefone as string | null) ?? null,
        whatsapp: (t.whatsapp as string | null) ?? null,
        instagram: (t.instagram as string | null) ?? null,
        horarios: horarios ?? [],
        precos: (servicos ?? []).map((s) => s.preco_centavos),
        experiencia: publicada.experiencia,
      };
    } catch (erro) {
      console.error("[getPreviaDaBarbearia] falha ao montar a prévia", data.slug, erro);
      return null;
    }
  });

export type PreviaPublica = {
  slug: string;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  logo: string | null;
  segmento: string | null;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  horarios: { dia_semana: number; fechado: boolean; abre: string; fecha: string }[];
  precos: number[];
  experiencia: "direta" | "vitrine" | "conversa";
};

/** Cancelamento sem conta: só vale com o mesmo WhatsApp que marcou. */
export const cancelarComoConvidado = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ agendamentoId: z.string().uuid(), telefone: telefoneSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ cancelado: boolean }> => {
    await limitarPublico("cancelar", data.telefone);
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("id, status, clientes!inner(telefone)")
      .eq("id", data.agendamentoId)
      .maybeSingle();
    if (!ag) throw new Error("Agendamento não encontrado.");
    const telefone = String((ag as any).clientes?.telefone ?? "");
    if (!variantesDoTelefone(telefone).some((v) => variantesDoTelefone(data.telefone).includes(v)))
      throw new Error("Agendamento não encontrado.");
    const { exigirPrazoDeCancelamento } = await import("@/lib/prazo-cancelamento.server");
    await exigirPrazoDeCancelamento(db, data.agendamentoId);
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
  .validator((input: unknown) =>
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
    if (
      !variantesDoTelefone(String(cli?.telefone ?? "")).some((v) =>
        variantesDoTelefone(data.telefone).includes(v),
      )
    ) {
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
    const { error } = await db
      .from("clientes")
      .update({ user_id: context.userId })
      .eq("id", cli.id)
      .is("user_id", null);
    return { vinculado: !error, slug };
  });
