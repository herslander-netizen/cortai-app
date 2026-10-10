/**
 * "Configurar minha barbearia" sem login.
 *
 * A pessoa monta um rascunho e publica uma barbearia nova. Nada aqui permite
 * tocar em uma barbearia que já existe: cada rascunho nasce com um código
 * secreto (nunca exposto na URL) guardado em formato criptografado no banco,
 * e a administração da barbearia só é liberada depois que alguém entra com
 * uma conta e reivindica o rascunho com esse mesmo código.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { HorarioSugerido } from "@/lib/ia/assistente";
import { SEGMENTOS, SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";
import { configPadrao, TEMAS } from "@/lib/pagina-config";

export type ServicoDoRascunho = {
  nome: string;
  categoria: string;
  duracaoMin: number;
  precoCentavos: number;
  retornoDias?: number | null | undefined;
};

export type DadosDoRascunho = {
  nome: string;
  whatsapp: string;
  endereco: string;
  logoUrl: string;
  horarios: HorarioSugerido[];
  servicos: ServicoDoRascunho[];
  profissional: string;
  segmento: Segmento;
};

export type RascunhoPublico = {
  dados: DadosDoRascunho;
  publicado: boolean;
  slug: string | null;
  reivindicado: boolean;
};

const horarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  fechado: z.boolean(),
  abre: z.string().regex(/^\d{2}:\d{2}$/),
  fecha: z.string().regex(/^\d{2}:\d{2}$/),
});

const dadosSchema = z.object({
  segmento: z.enum(SEGMENTOS).default("barbearia"),
  nome: z.string().trim().max(80).default(""),
  whatsapp: z.string().trim().max(30).default(""),
  endereco: z.string().trim().max(160).default(""),
  logoUrl: z.string().trim().max(500).default(""),
  horarios: z.array(horarioSchema).max(7).default([]),
  servicos: z
    .array(
      z.object({
        nome: z.string().trim().max(60),
        categoria: z.string().trim().max(40).default("Serviço"),
        duracaoMin: z.number().int().min(5).max(480),
        precoCentavos: z.number().int().min(0).max(10_000_000),
        retornoDias: z.number().int().min(3).max(365).nullable().optional(),
      }),
    )
    .max(40)
    .default([]),
  profissional: z.string().trim().max(60).default(""),
});

const tokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/, "Rascunho inválido.");

export const RASCUNHO_VAZIO: DadosDoRascunho = {
  nome: "",
  segmento: "barbearia",
  whatsapp: "",
  endereco: "",
  logoUrl: "",
  horarios: SEGMENTOS_CONFIG.barbearia.horariosPadrao.map((horario) => ({ ...horario })),
  servicos: [],
  profissional: "",
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Guardamos só a impressão digital do código: o segredo fica com quem criou. */
async function digitalDoToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(`cortai:rascunho:${token}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function novoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** IP de quem chamou, só o que a borda garante (nunca o primeiro valor de x-forwarded-for). */
async function origem(): Promise<string> {
  try {
    const { ipDaChamada } = await import("@/lib/webhook-guard.server");
    return ipDaChamada(getRequest())?.slice(0, 60) || "desconhecido";
  } catch {
    return "desconhecido";
  }
}

function comDefaults(dados: unknown): DadosDoRascunho {
  const base = dadosSchema.parse(dados ?? {});
  return {
    ...base,
    horarios: base.horarios.length
      ? base.horarios
      : SEGMENTOS_CONFIG[segmentoValido(base.segmento)].horariosPadrao.map((horario) => ({
          ...horario,
        })),
  };
}

async function lerRascunho(token: string) {
  const db = await admin();
  const hash = await digitalDoToken(token);
  const { data } = await db
    .from("rascunhos_de_barbearia")
    .select("id, dados, tenant_id, publicado_em, reivindicado_por")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data) throw new Error("Não encontrei este rascunho. Comece de novo.");
  return { db, linha: data as Record<string, any> };
}

function limparTexto(valor: string) {
  return valor.replace(/\s+/g, " ").trim();
}

function slugBase(nome: string) {
  const limpo = limparTexto(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo || "barbearia";
}

async function slugLivre(db: any, nome: string) {
  const base = slugBase(nome).slice(0, 40);
  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    const candidato = tentativa === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await db.from("tenants").select("id").eq("slug", candidato).maybeSingle();
    if (!data) return candidato;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Limites do cadastro sem login. Sem IP identificável, o balde é comum e 10× mais folgado. */
const LIMITES_DO_RASCUNHO = {
  /** Rascunhos novos por IP a cada hora. */
  criarPorHora: 5,
  /** Negócios publicados por IP a cada 24 h. */
  publicarPorDia: 3,
  /** Chamadas por IP a cada minuto (contador no banco, vale entre instâncias). */
  porMinuto: { criar: 3, salvar: 30, publicar: 3 },
} as const;

/** Barra rajadas por minuto, com o mesmo contador das outras entradas públicas. */
async function limitarPorMinuto(acao: keyof typeof LIMITES_DO_RASCUNHO.porMinuto) {
  const { dentroDoLimitePublico, MENSAGEM_DE_EXCESSO } = await import("@/lib/webhook-guard.server");
  let request: Request | null = null;
  try {
    request = getRequest();
  } catch {
    request = null;
  }
  const ok = await dentroDoLimitePublico(
    request,
    `rascunho_${acao}`,
    LIMITES_DO_RASCUNHO.porMinuto[acao],
  );
  if (!ok) throw new Error(MENSAGEM_DE_EXCESSO);
}

/** Freio contra abuso: poucos rascunhos por origem a cada hora. */
async function freioDeAbuso(db: any, ip: string) {
  const fator = ip === "desconhecido" ? 10 : 1;
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("rascunhos_de_barbearia")
    .select("id", { count: "exact", head: true })
    .eq("origem_ip", ip)
    .gte("criado_em", desde);
  if ((count ?? 0) >= LIMITES_DO_RASCUNHO.criarPorHora * fator) {
    throw new Error("Muitos cadastros seguidos deste aparelho. Tente de novo mais tarde.");
  }
}

/** Freio de publicação: poucos negócios novos por origem a cada 24 h. */
async function freioDePublicacao(db: any, ip: string) {
  const fator = ip === "desconhecido" ? 10 : 1;
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("rascunhos_de_barbearia")
    .select("id", { count: "exact", head: true })
    .eq("origem_ip", ip)
    .gte("publicado_em", desde);
  if ((count ?? 0) >= LIMITES_DO_RASCUNHO.publicarPorDia * fator) {
    throw new Error("Muitos negócios publicados deste aparelho hoje. Tente de novo amanhã.");
  }
}

export const criarRascunhoDeBarbearia = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ token: string; dados: DadosDoRascunho }> => {
    await limitarPorMinuto("criar");
    const db = await admin();
    const ip = await origem();
    await freioDeAbuso(db, ip);
    const token = novoToken();
    const { error } = await db.from("rascunhos_de_barbearia").insert({
      token_hash: await digitalDoToken(token),
      dados: RASCUNHO_VAZIO,
      origem_ip: ip,
    });
    if (error) throw new Error(error.message);
    return { token, dados: RASCUNHO_VAZIO };
  },
);

export const getRascunhoDeBarbearia = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }): Promise<RascunhoPublico> => {
    const { db, linha } = await lerRascunho(data.token);
    let slug: string | null = null;
    if (linha["tenant_id"]) {
      const { data: tenant } = await db
        .from("tenants")
        .select("slug")
        .eq("id", linha["tenant_id"])
        .maybeSingle();
      slug = (tenant?.slug as string) ?? null;
    }
    return {
      dados: comDefaults(linha["dados"]),
      publicado: Boolean(linha["publicado_em"]),
      slug,
      reivindicado: Boolean(linha["reivindicado_por"]),
    };
  });

export const salvarRascunhoDeBarbearia = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ token: tokenSchema, dados: dadosSchema }).parse(input))
  .handler(async ({ data }) => {
    await limitarPorMinuto("salvar");
    const { db, linha } = await lerRascunho(data.token);
    if (linha["publicado_em"]) {
      throw new Error(
        "Este negócio já foi publicado. Entre com sua conta para continuar editando.",
      );
    }
    const { error } = await db
      .from("rascunhos_de_barbearia")
      .update({ dados: comDefaults(data.dados) })
      .eq("id", linha["id"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Publica uma barbearia NOVA a partir do rascunho. Nunca altera uma barbearia
 * existente e não concede acesso administrativo a ninguém: o painel só abre
 * depois que alguém entra com uma conta e reivindica o rascunho.
 */
export const publicarRascunhoDeBarbearia = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }): Promise<{ slug: string }> => {
    await limitarPorMinuto("publicar");
    const { db, linha } = await lerRascunho(data.token);
    const dados = comDefaults(linha["dados"]);

    if (linha["tenant_id"]) {
      const { data: tenant } = await db
        .from("tenants")
        .select("slug")
        .eq("id", linha["tenant_id"])
        .maybeSingle();
      return { slug: (tenant?.slug as string) ?? "" };
    }

    const nome = limparTexto(dados.nome);
    if (nome.length < 2) throw new Error("Informe o nome do negócio.");
    if (!dados.servicos.filter((s) => limparTexto(s.nome).length >= 2).length) {
      throw new Error("Cadastre pelo menos um serviço antes de publicar.");
    }
    await freioDePublicacao(db, await origem());

    const slug = await slugLivre(db, nome);
    const definicao = SEGMENTOS_CONFIG[dados.segmento];
    const { data: criado, error } = await db
      .from("tenants")
      .insert({
        nome,
        slug,
        ativo: true,
        segmento: dados.segmento,
        identidade_app: definicao.identidade,
        modo: definicao.modoPadrao,
        chips_ficha: definicao.chipsFicha,
        whatsapp: dados.whatsapp.replace(/\D/g, "") || null,
        telefone: dados.whatsapp.replace(/\D/g, "") || null,
        endereco: limparTexto(dados.endereco) || null,
        ...(dados.logoUrl ? { logo_url: dados.logoUrl } : {}),
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    const tenantId = criado.id as string;

    if (dados.horarios.length) {
      await db.from("horarios_de_funcionamento").upsert(
        dados.horarios.map((h) => ({
          tenant_id: tenantId,
          dia_semana: h.diaSemana,
          fechado: h.fechado,
          abre: `${h.abre}:00`,
          fecha: `${h.fecha}:00`,
        })),
        { onConflict: "tenant_id,dia_semana" },
      );
    }

    const servicos = dados.servicos.filter((s) => limparTexto(s.nome).length >= 2);
    if (servicos.length) {
      await db.from("servicos").insert(
        servicos.map((s, i) => ({
          tenant_id: tenantId,
          nome: limparTexto(s.nome),
          duracao_min: s.duracaoMin,
          preco_centavos: s.precoCentavos,
          categoria: s.categoria,
          retorno_dias: s.retornoDias ?? null,
          ordem: i,
        })),
      );
    }

    if (limparTexto(dados.profissional).length >= 2) {
      await db
        .from("profissionais")
        .insert({ tenant_id: tenantId, nome: limparTexto(dados.profissional), ativo: true });
    }

    await db
      .from("onboarding_do_tenant")
      .upsert(
        { tenant_id: tenantId, etapa: "recursos", itens: { servicos: true, configurar: true } },
        { onConflict: "tenant_id" },
      );
    const pagina = configPadrao({
      ...(definicao.temaPagina === "rose-creme"
        ? { tema: "rose-creme", cores: TEMAS["rose-creme"].cores, fonteTitulo: "serif" }
        : {}),
      experiencia: definicao.experienciaPadrao,
      versao: 2,
    });
    await db
      .from("tenant_page_configs")
      .upsert(
        { tenant_id: tenantId, draft_config: { pagina }, published_config: { pagina } },
        { onConflict: "tenant_id" },
      );

    await db
      .from("rascunhos_de_barbearia")
      .update({ tenant_id: tenantId, publicado_em: new Date().toISOString() })
      .eq("id", linha["id"]);

    return { slug: criado.slug as string };
  });

/**
 * Passo que dá acesso ao painel: exige conta autenticada + o código do
 * rascunho. Uma barbearia que já tem dono nunca pode ser reivindicada.
 */
export const reivindicarBarbeariaDoRascunho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; slug: string }> => {
    const { db, linha } = await lerRascunho(data.token);
    const tenantId = linha["tenant_id"] as string | null;
    if (!tenantId) throw new Error("Publique o negócio antes de assumir o acesso.");
    if (linha["reivindicado_por"]) throw new Error("Este negócio já tem responsável.");

    const { data: jaTemDono } = await db
      .from("tenant_usuarios")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
    if (jaTemDono) throw new Error("Este negócio já tem responsável.");

    const { data: outroVinculo } = await db
      .from("tenant_usuarios")
      .select("tenant_id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (outroVinculo) throw new Error("Sua conta já está ligada a um negócio.");

    const { error } = await db.from("tenant_usuarios").insert({
      tenant_id: tenantId,
      user_id: context.userId,
      papel: "dono",
      aceito_em: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    await db
      .from("perfis")
      .upsert({ user_id: context.userId, tipo: "barbeiro" }, { onConflict: "user_id" });
    await db
      .from("rascunhos_de_barbearia")
      .update({ reivindicado_por: context.userId, reivindicado_em: new Date().toISOString() })
      .eq("id", linha["id"]);

    const { data: tenant } = await db
      .from("tenants")
      .select("slug, whatsapp")
      .eq("id", tenantId)
      .maybeSingle();
    const { iniciarTesteGratis } = await import("@/lib/teste-gratis.server");
    await iniciarTesteGratis(tenantId, { telefone: (tenant?.whatsapp as string) ?? null }).catch(
      () => undefined,
    );
    return { ok: true, slug: (tenant?.slug as string) ?? "" };
  });
