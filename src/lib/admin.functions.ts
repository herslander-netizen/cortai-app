import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function adminContext(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: allowed } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!allowed) throw new Error("Acesso exclusivo do dono da plataforma.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function phi(feature: boolean[], paid: boolean[]) {
  if (feature.length < 3) return null;
  let a = 0,
    b = 0,
    c = 0,
    d = 0;
  feature.forEach((on, i) => {
    if (on && paid[i]) a += 1;
    else if (on) b += 1;
    else if (paid[i]) c += 1;
    else d += 1;
  });
  const denominator = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  return denominator ? (a * d - b * c) / denominator : null;
}

export type AdminTenant = {
  id: string;
  nome: string;
  plano: string;
  ciclo: string;
  desconto: number;
  telefone: string | null;
  whatsapp: string | null;
  ativo: boolean;
  ultimoAcesso: string | null;
  agendamentos: number;
  regrasAtivas: number;
  risco: boolean;
  motivosRisco: string[];
};

type EstadoAsaas = {
  configurada: boolean;
  ambiente: "producao" | "sandbox" | null;
};

async function estadoSeguroDoAsaas(): Promise<EstadoAsaas> {
  const { ambienteDaChave, chaveDoAsaas } = await import("@/lib/asaas.server");
  const chave = await chaveDoAsaas();
  if (!chave) return { configurada: false, ambiente: null };
  const ambiente = ambienteDaChave(chave);
  return ambiente === "invalida"
    ? { configurada: false, ambiente: null }
    : { configurada: true, ambiente };
}

export const getEstadoAsaas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminContext(context);
    return estadoSeguroDoAsaas();
  });

export const salvarChaveAsaas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ chave: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await adminContext(context);
    const { ambienteDaChave, salvarChaveInterna } = await import("@/lib/asaas.server");
    if (ambienteDaChave(data.chave) === "invalida") {
      throw new Error("Chave inválida. Use uma chave de Produção ou Sandbox criada no Asaas.");
    }
    await salvarChaveInterna("asaas_api_key", data.chave);
    return estadoSeguroDoAsaas();
  });

export const testarConexaoAsaas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminContext(context);
    const { asaas } = await import("@/lib/asaas.server");
    const cliente = await asaas();
    await cliente.call("GET", "/myAccount");
    return {
      configurada: true,
      ambiente: cliente.ambiente,
      mensagem: "Conexão com o Asaas confirmada.",
    };
  });

export const removerChaveAsaas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminContext(context);
    const { removerChaveInterna } = await import("@/lib/asaas.server");
    await removerChaveInterna("asaas_api_key");
    return estadoSeguroDoAsaas();
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const [tenantsRes, configRes, historyRes, rulesRes, queueRes, movesRes] = await Promise.all([
      db.from("tenants").select("id, plano, ciclo, desconto_percentual, ativo"),
      db
        .from("configuracoes_da_plataforma")
        .select("preco_essencial_centavos, preco_pro_centavos, preco_studio_centavos")
        .single(),
      db.from("historico_de_plano").select("tenant_id, plano_de, plano_para"),
      db.from("regras_de_plano").select("tenant_id, tipo, ativo"),
      db.from("fila_de_espera").select("tenant_id"),
      db.from("movimentos").select("origem, carteiras(tenant_id)").eq("origem", "pacote"),
    ]);
    const tenants = tenantsRes.data ?? [];
    const config = configRes.data;
    const prices: Record<string, number> = {
      essencial: config?.preco_essencial_centavos ?? 0,
      pro: config?.preco_pro_centavos ?? 0,
      studio: config?.preco_studio_centavos ?? 0,
    };
    const receita = tenants
      .filter((t) => t.ativo)
      .reduce((sum, t) => {
        const annualFactor = t.ciclo === "anual" ? 0.8 : 1;
        const couponFactor = 1 - t.desconto_percentual / 100;
        return sum + Math.round((prices[t.plano] ?? 0) * annualFactor * couponFactor);
      }, 0);
    const history = historyRes.data ?? [];
    const conversions = history.filter(
      (h) => h.plano_de === "essencial" && h.plano_para !== "essencial",
    );
    const cancellations = history.filter(
      (h) => h.plano_de !== "essencial" && h.plano_para === "essencial",
    );
    const conversionBase = new Set(
      history.filter((h) => h.plano_de === "essencial").map((h) => h.tenant_id),
    ).size;
    const cancelBase = conversions.length + cancellations.length;
    const paid = tenants.map((t) => t.ativo && t.plano !== "essencial");
    const activeRules = rulesRes.data ?? [];
    const queueTenants = new Set((queueRes.data ?? []).map((q) => q.tenant_id));
    const packageTenants = new Set(
      (movesRes.data ?? [])
        .map((movimento) => {
          const carteira = Array.isArray(movimento.carteiras)
            ? movimento.carteiras[0]
            : movimento.carteiras;
          return carteira?.tenant_id;
        })
        .filter(Boolean),
    );
    const signals = [
      {
        label: "Ligou a fidelidade",
        values: tenants.map((t) =>
          activeRules.some((r) => r.tenant_id === t.id && r.tipo === "fidelidade" && r.ativo),
        ),
      },
      { label: "Vendeu um pacote", values: tenants.map((t) => packageTenants.has(t.id)) },
      { label: "Usou a fila de espera", values: tenants.map((t) => queueTenants.has(t.id)) },
    ]
      .map((item) => ({
        label: item.label,
        correlation: phi(item.values, paid),
        sample: item.values.filter(Boolean).length,
      }))
      .sort((a, b) => (b.correlation ?? -2) - (a.correlation ?? -2));
    return {
      receitaCentavos: receita,
      totalBarbearias: tenants.length,
      conversionPct: conversionBase
        ? Math.round((new Set(conversions.map((h) => h.tenant_id)).size / conversionBase) * 100)
        : 0,
      conversionHasData: conversionBase > 0,
      cancellationPct: cancelBase ? Math.round((cancellations.length / cancelBase) * 100) : 0,
      cancellationHasData: cancelBase > 0,
      revenueHasData: tenants.length > 0 && Object.values(prices).some((value) => value > 0),
      signals,
    };
  });

export const getAdminTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTenant[]> => {
    const db = await adminContext(context);
    const [tenantsRes, bookingsRes, rulesRes] = await Promise.all([
      db
        .from("tenants")
        .select(
          "id, nome, plano, ciclo, desconto_percentual, telefone, whatsapp, ativo, ultimo_acesso_em",
        )
        .order("nome"),
      db.from("agendamentos").select("tenant_id"),
      db.from("regras_de_plano").select("tenant_id, ativo"),
    ]);
    const bookings = bookingsRes.data ?? [];
    const rules = rulesRes.data ?? [];
    const cutoff = Date.now() - 7 * 86400000;
    return (tenantsRes.data ?? []).map((tenant) => {
      const motivos: string[] = [];
      if (!tenant.ultimo_acesso_em) motivos.push("Nunca acessou o painel.");
      else if (new Date(tenant.ultimo_acesso_em).getTime() < cutoff)
        motivos.push("Sem acesso ao painel há mais de 7 dias.");
      const activeRules = rules.filter((r) => r.tenant_id === tenant.id && r.ativo).length;
      if (!activeRules) motivos.push("Nunca ativou uma regra de plano.");
      return {
        id: tenant.id,
        nome: tenant.nome,
        plano: tenant.plano,
        ciclo: tenant.ciclo,
        desconto: tenant.desconto_percentual,
        telefone: tenant.telefone,
        whatsapp: tenant.whatsapp,
        ativo: tenant.ativo,
        ultimoAcesso: tenant.ultimo_acesso_em,
        agendamentos: bookings.filter((b) => b.tenant_id === tenant.id).length,
        regrasAtivas: activeRules,
        risco: motivos.length > 0,
        motivosRisco: motivos,
      };
    });
  });

export const getRetentionContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { data: rows } = await db
      .from("contatos_de_retencao")
      .select("id, canal, resultado, observacao, criado_em")
      .eq("tenant_id", data.tenantId)
      .order("criado_em", { ascending: false });
    return rows ?? [];
  });

export const addRetentionContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        canal: z.enum(["whatsapp", "telefone"]),
        resultado: z.enum(["sem_resposta", "conversou", "recuperou", "cancelou"]),
        observacao: z.string().trim().max(1000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("contatos_de_retencao").insert({
      tenant_id: data.tenantId,
      canal: data.canal,
      resultado: data.resultado,
      observacao: data.observacao,
      criado_por: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlatformConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const { data } = await db.from("configuracoes_da_plataforma").select("*").single();
    if (!data) throw new Error("Configuração não encontrada.");
    return data;
  });

const configSchema = z.object({
  preco_essencial_centavos: z.number().int().min(0),
  preco_pro_centavos: z.number().int().min(0),
  preco_studio_centavos: z.number().int().min(0),
  cor_fundo: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  cor_superficie: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  cor_primaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  cor_texto: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tipografia: z.enum(["Montserrat", "Work Sans", "Sora"]),
  raio_px: z.number().int().min(0).max(24),
  whatsapp_alvo: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .transform((v) => {
      const digitos = String(v ?? "").replace(/\D/g, "");
      if (!digitos) return null;
      if (digitos.length < 10 || digitos.length > 15)
        throw new Error("Número de WhatsApp inválido.");
      return digitos.length <= 11 ? `55${digitos}` : digitos;
    }),
});

export const savePlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db
      .from("configuracoes_da_plataforma")
      .update({ ...data, atualizado_por: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const [suggestionsRes, tenantsRes, bookingsRes] = await Promise.all([
      db.from("sugestoes_da_plataforma").select("*").order("criado_em", { ascending: false }),
      db.from("tenants").select("id, nome, plano"),
      db.from("agendamentos").select("tenant_id"),
    ]);
    const tenants = tenantsRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    return (suggestionsRes.data ?? [])
      .map((s) => ({
        ...s,
        solicitantes: s.tenants_que_pediram.map((id) => ({
          ...tenants.find((t) => t.id === id),
          id,
          agendamentos: bookings.filter((b) => b.tenant_id === id).length,
        })),
      }))
      .sort((a, b) => b.tenants_que_pediram.length - a.tenants_que_pediram.length);
  });

const suggestionSchema = z.object({
  pedido: z.string().trim().min(1).max(500),
  motivo: z.string().trim().min(1).max(1500),
  canal: z.enum(["whatsapp", "ligacao", "visita", "suporte"]),
  tenants: z.array(z.string().uuid()),
  status: z.enum(["em_analise", "no_roteiro", "em_desenvolvimento", "implementada", "recusada"]),
});
export const saveSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => suggestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("sugestoes_da_plataforma").insert({
      pedido: data.pedido,
      motivo: data.motivo,
      canal: data.canal,
      tenants_que_pediram: data.tenants,
      status: data.status,
      criado_por: context.userId,
    });
    if (error) {
      console.error("[admin] saveSuggestion falhou:", error.message);
      throw new Error("Não foi possível registrar a sugestão agora. Tente novamente.");
    }
    return { ok: true };
  });

export const updateSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: suggestionSchema.shape.status }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db
      .from("sugestoes_da_plataforma")
      .update({ status: data.status, criado_por: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getGlobalDesign = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data } = await client
    .from("design_da_plataforma")
    .select("cor_fundo, cor_superficie, cor_primaria, cor_texto, tipografia, raio_px")
    .eq("id", true)
    .maybeSingle();
  return data;
});
/* ------------------- CICLO DE VIDA DAS BARBEARIAS (ADMIN) ------------------ */

export const definirStatusDaBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ tenantId: z.string().uuid(), ativo: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db
      .from("tenants")
      .update({ ativo: data.ativo })
      .eq("id", data.tenantId);
    if (error) {
      console.error("[admin] definirStatusDaBarbearia falhou:", error.message);
      throw new Error("Não foi possível atualizar a situação do negócio agora. Tente novamente.");
    }
    return { ok: true, ativo: data.ativo };
  });

/**
 * Exclusão permanente de um negócio: só o dono da plataforma. Tudo é apagado
 * numa única transação no banco e fica registrado em exclusoes_permanentes.
 */
export const excluirBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; aviso: string | null }> => {
    const db = await adminContext(context);
    const tenantId = data.tenantId;
    const { data: tenant } = await db.from("tenants").select("id").eq("id", tenantId).maybeSingle();
    if (!tenant) throw new Error("Negócio não encontrado.");

    let aviso: string | null = null;
    const { data: conexoes } = await db
      .from("conexoes_whatsapp")
      .select("sessao_id, status")
      .eq("tenant_id", tenantId);
    const ativas = (conexoes ?? []).filter(
      (c: { sessao_id: string | null; status: string | null }) =>
        c.sessao_id && c.status !== "desconectado",
    );
    if (ativas.length) {
      const { gatewayConfigurado, gatewayDeWhatsapp } =
        await import("@/lib/whatsapp/gateway.server");
      if (!gatewayConfigurado()) {
        aviso =
          "O WhatsApp não pôde ser desconectado (serviço não configurado). Desconecte o número manualmente.";
      } else {
        for (const c of ativas) {
          try {
            await gatewayDeWhatsapp.desconectar(c.sessao_id as string);
          } catch (erro) {
            aviso = `O WhatsApp não pôde ser desconectado${erro instanceof Error ? ` (${erro.message})` : ""}. Desconecte o número manualmente.`;
          }
        }
      }
    }

    const email =
      typeof context.claims?.["email"] === "string" ? (context.claims["email"] as string) : null;
    const { error } = await db.rpc("excluir_tenant_completo", {
      _tenant_id: tenantId,
      _ator: context.userId,
      _ator_email: email ?? "",
    });
    if (error) {
      console.error("[admin] excluirBarbearia falhou:", error.message);
      throw new Error(`Não foi possível excluir: ${error.message}`);
    }
    return { ok: true, aviso };
  });

/** Matriz de recursos por plano — leitura para o dono da plataforma. */
export const getMatrizDeRecursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const { data, error } = await db
      .from("recursos_de_plano")
      .select("id, chave, rotulo, descricao, plano, liberado")
      .order("rotulo")
      .order("plano");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Liberar/bloquear um recurso para um plano. */
export const definirRecursoDePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        chave: z.string().min(2).max(60),
        plano: z.enum(["essencial", "pro", "conecta", "studio"]),
        liberado: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db
      .from("recursos_de_plano")
      .update({ liberado: data.liberado })
      .eq("chave", data.chave)
      .eq("plano", data.plano);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- CORTAI POR NEGÓCIO (ADMIN) ------------------------- */

export type CortaiDoNegocio = {
  estado: "ativa" | "desligada" | "pausada" | "sem_configuracao";
  ativa: boolean;
  pausadaEm: string | null;
  pausaMotivo: string | null;
  limiteWhatsapp: number;
  /** Turnos da Flow IA nas últimas 24 h, por canal (o mesmo contador das cotas). */
  uso: { painel: number; whatsapp: number; equipe: number; site: number };
  limites: { painel: number; whatsapp: number; site: number };
};

/** Estado, consumo e limites da Flow IA de um negócio, lidos do mesmo lugar que o cérebro usa. */
export const getCortaiDoNegocio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CortaiDoNegocio> => {
    const db = await adminContext(context);
    const { bloqueioDaConfig } = await import("@/lib/brain/estado-cortai");
    const { LIMITE_DIARIO_PADRAO } = await import("@/lib/brain/uso.server");
    const { iaDisponivel } = await import("@/lib/brain/gateway.server");
    const umDia = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const contar = (acao: string) =>
      db
        .from("acoes_de_ia_log")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .eq("acao", acao)
        .gte("criado_em", umDia)
        .then((r) => r.count ?? 0);
    // `*`: a leitura vale antes e depois da coluna `cortai_ativa` (migração 0031) existir.
    const [{ data: cfg }, painel, whatsapp, equipe, site] = await Promise.all([
      db.from("config_atendimento_ia").select("*").eq("tenant_id", data.tenantId).maybeSingle(),
      contar("cerebro.painel"),
      contar("cerebro.whatsapp"),
      contar("cerebro.whatsapp.equipe"),
      contar("cerebro.site"),
    ]);
    const bloqueio = bloqueioDaConfig(cfg);
    const limiteWhatsapp = cfg?.ia_limite_diario_whatsapp ?? LIMITE_DIARIO_PADRAO.whatsapp;
    return {
      estado: bloqueio ?? (iaDisponivel() ? "ativa" : "sem_configuracao"),
      ativa: cfg?.cortai_ativa !== false,
      pausadaEm: cfg?.ia_pausada_em ?? null,
      pausaMotivo: cfg?.ia_pausa_motivo ?? null,
      limiteWhatsapp,
      uso: { painel, whatsapp, equipe, site },
      limites: { ...LIMITE_DIARIO_PADRAO, whatsapp: limiteWhatsapp },
    };
  });

/**
 * Liga/desliga a Flow IA do negócio, ajusta o limite diário do WhatsApp ou encerra a pausa.
 * Desligar a IA nunca desliga agenda, comandas nem avisos. Tudo fica na auditoria do negócio.
 */
export const definirCortaiDoNegocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        ativa: z.boolean().optional(),
        limiteWhatsapp: z.number().int().min(0).max(5000).optional(),
        retomar: z.literal(true).optional(),
      })
      .refine((d) => d.ativa !== undefined || d.limiteWhatsapp !== undefined || d.retomar, {
        message: "Nada para alterar.",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const campos: Database["public"]["Tables"]["config_atendimento_ia"]["Insert"] = {
      tenant_id: data.tenantId,
    };
    if (data.ativa !== undefined) campos.cortai_ativa = data.ativa;
    if (data.limiteWhatsapp !== undefined) campos.ia_limite_diario_whatsapp = data.limiteWhatsapp;
    if (data.retomar) {
      campos.ia_pausada_em = null;
      campos.ia_pausa_motivo = null;
    }
    const { error } = await db
      .from("config_atendimento_ia")
      .upsert(campos, { onConflict: "tenant_id" });
    if (error) {
      console.error("[admin] definirCortaiDoNegocio falhou:", error.message);
      throw new Error(
        /cortai_ativa/.test(error.message)
          ? "O interruptor da Flow IA ainda não existe no banco (migração 0031 pendente)."
          : "Não foi possível salvar a Flow IA deste negócio agora.",
      );
    }
    await db.from("auditoria_da_barbearia").insert({
      tenant_id: data.tenantId,
      ator_user_id: context.userId,
      acao: "adm.cortai_alterada",
      alvo: "cortai",
      detalhes: {
        ativa: data.ativa ?? null,
        limiteWhatsapp: data.limiteWhatsapp ?? null,
        retomar: data.retomar ?? false,
      },
    });
    return { ok: true };
  });

/**
 * Teste real do gateway de IA neste ambiente: uma pergunta mínima, sem ferramentas e sem
 * dados de negócio. Mostra se a chave existe, o status devolvido e o tempo de resposta.
 */
export const testarGatewayDaCortai = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminContext(context);
    const { criarSessaoDoGateway, ErroDoGateway, iaDisponivel, textoDaSaida } =
      await import("@/lib/brain/gateway.server");
    if (!iaDisponivel())
      return {
        ok: false,
        status: 401,
        ms: 0,
        mensagem: "Provedor de IA não configurado (CORTAI_AI_PROVIDER e credenciais).",
      };
    const inicio = Date.now();
    try {
      const saida = await criarSessaoDoGateway().responder({
        instrucoes: "Responda somente com a palavra OK.",
        entrada: [{ role: "user", content: "Teste de conexão." }],
        ferramentas: [],
      });
      const texto = textoDaSaida(saida);
      return {
        ok: Boolean(texto),
        status: 200,
        ms: Date.now() - inicio,
        mensagem: texto ? `Respondeu: "${texto.slice(0, 40)}"` : "Respondeu sem texto.",
      };
    } catch (erro) {
      return {
        ok: false,
        status: erro instanceof ErroDoGateway ? erro.status : 500,
        ms: Date.now() - inicio,
        mensagem: erro instanceof Error ? erro.message : "Falha desconhecida.",
      };
    }
  });
