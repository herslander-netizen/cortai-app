import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { fusoDoTenant } from "@/lib/fuso.server";
import { diaDaSemanaDoDia, hojeNoFuso, isoNoFusoDaBarbearia, somarDias } from "@/lib/horarios";

const UUID = z.string().uuid();
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const ALVO = z.object({ userId: UUID.optional(), profissionalId: UUID.optional() });
const VALIDAR_ALVO = ALVO.refine((x) => Boolean(x.userId) !== Boolean(x.profissionalId), "Informe um único profissional.");
type Alvo = z.infer<typeof ALVO>;

type Contexto = { supabase: any; userId: string };

async function profissionalDaEquipe(context: Contexto, alvo: Alvo) {
  const tenantId = await tenantIdDoMembro(context);
  if (alvo.profissionalId) {
    // Profissionais sem login também existem; nunca usar um user_id inventado.
    await exigirPermissao(context, tenantId, "gerenciar_profissionais");
    const { data: profissional, error } = await context.supabase
      .from("profissionais")
      .select("id, nome, avatar_url, ativo, user_id")
      .eq("tenant_id", tenantId)
      .eq("id", alvo.profissionalId)
      .maybeSingle();
    if (error || !profissional) throw new Error("Profissional não encontrado neste negócio.");
    return { tenantId, membro: { nome: profissional.nome }, profissional };
  }
  if (!alvo.userId) throw new Error("Membro inválido.");
  const { data: equipe, error: erroEquipe } = await context.supabase.rpc("equipe_do_tenant", {
    _tenant_id: tenantId,
  });
  if (erroEquipe) throw new Error("Você não tem permissão para consultar a equipe.");
  const membro = (equipe ?? []).find((p: Record<string, unknown>) => p["user_id"] === alvo.userId);
  if (!membro) throw new Error("Membro não encontrado neste negócio.");
  const { data: profissional, error } = await context.supabase
    .from("profissionais")
    .select("id, nome, avatar_url, ativo, user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", alvo.userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar o profissional.");
  return { tenantId, membro, profissional };
}

async function profissionalParaEditar(context: Contexto, alvo: Alvo) {
  const encontrado = await profissionalDaEquipe(context, alvo);
  await exigirPermissao(context, encontrado.tenantId, "gerenciar_profissionais");
  if (!encontrado.profissional) {
    throw new Error("Este integrante ainda não está vinculado a um profissional da agenda.");
  }
  return { ...encontrado, profissional: encontrado.profissional as {
    id: string; nome: string; avatar_url: string | null; user_id: string | null;
  } };
}

function horarioCurto(hora: unknown): string | null {
  return typeof hora === "string" ? hora.slice(0, 5) : null;
}

/**
 * Retorna dados de um membro validado no próprio tenant. Telefone exclusivo
 * do negócio nunca vem da tabela pública de profissionais nem de perfis globais.
 */
export const getFichaProfissionalFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => VALIDAR_ALVO.parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, membro, profissional } = await profissionalDaEquipe(context, data);
    const fuso = await fusoDoTenant(tenantId);
    const hoje = hojeNoFuso(fuso);
    const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [fichaRes, horariosRes, escalaRes, excecoesRes] = await Promise.all([
      profissional
        ? (context.supabase as any).from("profissionais_ficha")
            .select("atividade, telefone_contato")
            .eq("tenant_id", tenantId)
            .eq("profissional_id", profissional.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      context.supabase.from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha")
        .eq("tenant_id", tenantId),
      profissional
        ? context.supabase.from("escalas_de_profissional")
            .select("dia_semana, trabalha, abre, fecha")
            .eq("tenant_id", tenantId)
            .eq("profissional_id", profissional.id)
        : Promise.resolve({ data: [], error: null }),
      profissional
        ? (context.supabase as any).from("excecoes_disponibilidade_profissional")
            .select("id, dia, trabalha, abre, fecha")
            .eq("tenant_id", tenantId)
            .eq("profissional_id", profissional.id)
            .gte("dia", hoje)
            .order("dia")
            .limit(90)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (fichaRes.error || horariosRes.error || escalaRes.error || excecoesRes.error) {
      throw new Error("Não foi possível consultar os dados do profissional.");
    }

    let agendamentos: number | null = null;
    let avaliacao: number | null = null;
    let receitaCentavos: number | null = null;

    if (profissional) {
      const [totalRes, avaliacoesRes, { data: podeVerReceita }] = await Promise.all([
        context.supabase.from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("profissional_id", profissional.id)
          .gte("inicio", desde)
          .in("status", ["agendado", "chegou", "na_cadeira", "finalizado"]),
        context.supabase.from("avaliacoes")
          .select("nota")
          .eq("tenant_id", tenantId)
          .eq("profissional_id", profissional.id)
          .gte("criado_em", desde)
          .limit(1001),
        context.supabase.rpc("has_tenant_permission", {
          _tenant_id: tenantId,
          _permission: "visualizar_financeiro",
        }),
      ]);
      if (!totalRes.error) agendamentos = totalRes.count ?? 0;
      if (!avaliacoesRes.error && avaliacoesRes.data?.length && avaliacoesRes.data.length <= 1000) {
        avaliacao = avaliacoesRes.data.reduce(
          (soma: number, item: { nota: number }) => soma + item.nota,
          0,
        ) / avaliacoesRes.data.length;
      }
      if (podeVerReceita) {
        // Pagamentos confirmados, não soma agendamentos (que podem não estar pagos).
        // Não exibe um total parcial se a consulta atingir o limite.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: pagamentos, error } = await supabaseAdmin
          .from("pagamentos")
          .select("valor_centavos, comandas!inner(profissional_id, tenant_id)")
          .eq("tenant_id", tenantId)
          .eq("comandas.tenant_id", tenantId)
          .eq("comandas.profissional_id", profissional.id)
          .eq("status", "confirmado")
          .gte("confirmado_em", desde)
          .limit(1001);
        if (!error && pagamentos && pagamentos.length <= 1000) {
          receitaCentavos = pagamentos.reduce(
            (soma: number, p: { valor_centavos: number }) => soma + p.valor_centavos,
            0,
          );
        }
      }
    }

    let fotoUrl: string | null = profissional?.avatar_url ?? null;
    if (fotoUrl && !/^https?:\/\//i.test(fotoUrl)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: assinada } = await supabaseAdmin.storage
        .from("tenant-logos").createSignedUrl(fotoUrl, 3600);
      fotoUrl = assinada?.signedUrl ?? null;
    }

    return {
      profissionalId: profissional?.id ?? null,
      vinculadoAConta: Boolean(profissional?.user_id),
      nome: profissional?.nome ?? (membro["nome"] as string | null) ?? "Profissional",
      atividade: (fichaRes.data?.atividade as string | null) ?? null,
      telefone: (fichaRes.data?.telefone_contato as string | null) ?? null,
      fotoUrl,
      agendamentos,
      avaliacao,
      receitaCentavos,
      expediente: (horariosRes.data ?? []).map((h: any) => ({
        dia: h.dia_semana,
        trabalha: !h.fechado,
        abre: String(h.abre).slice(0, 5),
        fecha: String(h.fecha).slice(0, 5),
      })),
      escala: (escalaRes.data ?? []).map((h: any) => ({
        dia: h.dia_semana,
        trabalha: Boolean(h.trabalha),
        abre: horarioCurto(h.abre),
        fecha: horarioCurto(h.fecha),
      })),
      excecoesPorData: (excecoesRes.data ?? []).map((h: any) => ({
        id: h.id as string,
        dia: h.dia as string,
        trabalha: Boolean(h.trabalha),
        abre: horarioCurto(h.abre),
        fecha: horarioCurto(h.fecha),
      })),
    };
  });

const DADOS = ALVO.extend({
  nome: z.string().trim().min(2).max(100),
  atividade: z.string().trim().max(100),
  telefone: z.string().trim().max(22).refine(
    (v) => !v || /^\+?[\d()\s-]{10,22}$/.test(v),
    "Informe um telefone com DDD válido.",
  ),
});

export const salvarDadosProfissionalFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => DADOS.parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, profissional } = await profissionalParaEditar(context, data);
    const { error } = await (context.supabase as any).rpc("salvar_dados_profissional_flow", {
      _tenant_id: tenantId,
      _profissional_id: profissional.id,
      _nome: data.nome,
      _atividade: data.atividade,
      _telefone: data.telefone,
    });
    if (error) throw new Error("Não foi possível salvar os dados do profissional.");
    return { ok: true };
  });

function fotoCompativel(bytes: Uint8Array, tipo: "image/jpeg" | "image/png" | "image/webp"): boolean {
  if (tipo === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (tipo === "image/png") return bytes.length > 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  return bytes.length > 12 &&
    [82,73,70,70].every((v,i) => bytes[i] === v) &&
    [87,69,66,80].every((v,i) => bytes[i+8] === v);
}

const FOTO = ALVO.extend({
  tipo: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(12).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export const salvarFotoProfissionalFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => FOTO.parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, profissional } = await profissionalParaEditar(context, data);
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    } catch {
      throw new Error("Arquivo de imagem inválido.");
    }
    if (bytes.length > 2_097_152 || !fotoCompativel(bytes, data.tipo)) {
      throw new Error("Use JPG, PNG ou WebP com até 2 MB.");
    }
    const extensao = data.tipo === "image/jpeg" ? "jpg" : data.tipo === "image/png" ? "png" : "webp";
    const caminho = tenantId + "/" + profissional.id + "/" + crypto.randomUUID() + "." + extensao;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const armazenamento = supabaseAdmin.storage.from("profissionais-flow");
    const { error: erroUpload } = await armazenamento.upload(caminho, bytes, {
      contentType: data.tipo,
      cacheControl: "3600",
      upsert: false,
    });
    if (erroUpload) throw new Error("Não foi possível enviar a foto. Verifique se o armazenamento do Flow está configurado.");
    const url = armazenamento.getPublicUrl(caminho).data.publicUrl;
    const { error: erroRegistro } = await context.supabase.from("profissionais")
      .update({ avatar_url: url })
      .eq("tenant_id", tenantId)
      .eq("id", profissional.id);
    if (erroRegistro) {
      await armazenamento.remove([caminho]);
      throw new Error("Não foi possível salvar a foto.");
    }

    const anterior = profissional.avatar_url;
    if (anterior) {
      try {
        const prefixo = "/storage/v1/object/public/profissionais-flow/";
        const pathAnterior = new URL(anterior).pathname;
        const nomeAntigo = pathAnterior.startsWith(prefixo)
          ? decodeURIComponent(pathAnterior.slice(prefixo.length)) : "";
        if (nomeAntigo.startsWith(tenantId + "/" + profissional.id + "/") && nomeAntigo !== caminho) {
          await armazenamento.remove([nomeAntigo]);
        }
      } catch {
        // Foto legada ou externa: não apagar conteúdo fora do bucket desta ficha.
      }
    }
    return { ok: true, fotoUrl: url };
  });

const EXCECAO = ALVO.extend({
  dia: z.string().regex(DIA),
  trabalha: z.boolean(),
  abre: z.string().regex(HORA).nullable(),
  fecha: z.string().regex(HORA).nullable(),
});

async function confirmarDia(context: Contexto, tenantId: string, dia: string) {
  const fuso = await fusoDoTenant(tenantId);
  const hoje = hojeNoFuso(fuso);
  const limite = somarDias(hoje, 365);
  const valido = !Number.isNaN(Date.parse(dia + "T00:00:00Z")) &&
    new Date(dia + "T00:00:00Z").toISOString().slice(0, 10) === dia;
  if (!valido || dia < hoje || dia > limite) {
    throw new Error("Escolha uma data válida entre hoje e os próximos 365 dias.");
  }
  return fuso;
}

export const salvarDisponibilidadePorDataFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => EXCECAO.parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, profissional } = await profissionalParaEditar(context, data);
    const fuso = await confirmarDia(context, tenantId, data.dia);
    const diaSemana = diaDaSemanaDoDia(data.dia);
    if (data.trabalha) {
      if (!data.abre || !data.fecha || data.fecha <= data.abre) {
        throw new Error("Confira a hora de início e de fim.");
      }
      const { data: horarioNegocio, error } = await context.supabase
        .from("horarios_de_funcionamento")
        .select("fechado, abre, fecha")
        .eq("tenant_id", tenantId)
        .eq("dia_semana", diaSemana)
        .maybeSingle();
      if (error || !horarioNegocio || horarioNegocio.fechado) {
        throw new Error("O negócio está fechado neste dia. Ajuste o expediente geral primeiro.");
      }
      if (data.abre < String(horarioNegocio.abre).slice(0,5) ||
          data.fecha > String(horarioNegocio.fecha).slice(0,5)) {
        throw new Error("A disponibilidade deve estar dentro do expediente do negócio.");
      }
    }

    // Não reduzir disponibilidade de quem já tem clientes agendados.
    const inicioDia = isoNoFusoDaBarbearia(data.dia, "00:00", fuso);
    const fimDia = isoNoFusoDaBarbearia(somarDias(data.dia, 1), "00:00", fuso);
    const { data: marcados, error: erroAgenda } = await context.supabase
      .from("agendamentos")
      .select("inicio, fim")
      .eq("tenant_id", tenantId)
      .eq("profissional_id", profissional.id)
      .in("status", ["agendado", "chegou", "na_cadeira"])
      .gte("inicio", inicioDia)
      .lt("inicio", fimDia)
      .limit(500);
    if (erroAgenda) throw new Error("Não foi possível verificar os agendamentos da data.");
    if (marcados?.length && !data.trabalha) {
      throw new Error("Há clientes agendados neste dia. Remarque-os antes de marcar indisponibilidade.");
    }
    if (marcados?.length && data.trabalha) {
      const abre = Date.parse(isoNoFusoDaBarbearia(data.dia, data.abre!, fuso));
      const fecha = Date.parse(isoNoFusoDaBarbearia(data.dia, data.fecha!, fuso));
      if (marcados.some((a: { inicio: string; fim: string }) =>
        Date.parse(a.inicio) < abre || Date.parse(a.fim) > fecha)) {
        throw new Error("Este ajuste afetaria agendamentos existentes. Remarque-os primeiro.");
      }
    }

    const { error } = await (context.supabase as any).from("excecoes_disponibilidade_profissional").upsert({
      tenant_id: tenantId,
      profissional_id: profissional.id,
      dia: data.dia,
      trabalha: data.trabalha,
      abre: data.trabalha ? data.abre : null,
      fecha: data.trabalha ? data.fecha : null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "profissional_id,dia" });
    if (error) throw new Error("Não foi possível salvar a disponibilidade desta data.");
    return { ok: true };
  });

export const removerDisponibilidadePorDataFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ALVO.extend({ dia: z.string().regex(DIA) }).refine((x) => Boolean(x.userId) !== Boolean(x.profissionalId)).parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, profissional } = await profissionalParaEditar(context, data);
    const fuso = await confirmarDia(context, tenantId, data.dia);
    const inicio = isoNoFusoDaBarbearia(data.dia, "00:00", fuso);
    const fim = isoNoFusoDaBarbearia(somarDias(data.dia, 1), "00:00", fuso);
    const { count, error: erroAgenda } = await context.supabase.from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("profissional_id", profissional.id)
      .in("status", ["agendado", "chegou", "na_cadeira"])
      .gte("inicio", inicio)
      .lt("inicio", fim);
    if (erroAgenda) throw new Error("Não foi possível conferir os agendamentos da data.");
    if ((count ?? 0) > 0) throw new Error("Há agendamentos nesta data. Remarque-os antes de remover a exceção.");
    const { error } = await (context.supabase as any).from("excecoes_disponibilidade_profissional")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("profissional_id", profissional.id)
      .eq("dia", data.dia);
    if (error) throw new Error("Não foi possível remover a disponibilidade especial.");
    return { ok: true };
  });


/** Suspende o acesso e a oferta de horários sem apagar agendamentos anteriores. */
export const desativarProfissionalFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: UUID }).parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, profissional } = await profissionalDaEquipe(context, data);
    await exigirPermissao(context, tenantId, "gerenciar_permissoes");
    await exigirPermissao(context, tenantId, "gerenciar_profissionais");
    if (data.userId === context.userId) {
      throw new Error("Você não pode desativar o seu próprio acesso.");
    }
    const { error } = await (context.supabase as any).rpc("desativar_profissional_flow", {
      _tenant_id: tenantId,
      _user_id: data.userId,
    });
    if (error) throw new Error("Não foi possível desativar o profissional.");
    return { ok: true, tinhaPerfilAgenda: Boolean(profissional) };
  });

/**
 * Suspende somente a agenda de um profissional sem login.
 * Profissionais com usuário vinculado são desativados no fluxo de Equipe.
 */
export const desativarPerfilAgendaFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ profissionalId: UUID }).parse(d))
  .handler(async ({ data, context }) => {
    const { tenantId, profissional } = await profissionalParaEditar(context, data);
    if (profissional.user_id) {
      throw new Error("Este profissional tem login. Desative-o pela tela Equipe e permissões.");
    }
    const { data: atualizado, error } = await context.supabase.from("profissionais")
      .update({ ativo: false })
      .eq("tenant_id", tenantId)
      .eq("id", profissional.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();
    if (error || !atualizado) throw new Error("Não foi possível desativar este profissional.");
    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "profissional.desativado",
      _alvo: profissional.id,
      _detalhes: { origem: "ficha_flow" },
    });
    return { ok: true };
  });
