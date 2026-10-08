/**
 * Central de Notificações da plataforma (WhatsApp oficial do Cortaí).
 * Exclusivo do Admin: toda função confere `has_role(admin)` no servidor antes
 * de ler ou alterar. Nenhum dado operacional da Central chega ao painel do negócio.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const URL_EVOLUTION = "https://cortai.dev/api/public/whatsapp/evolution";

export type EstadoDaCentral = {
  existe: boolean;
  status: string;
  numero: string | null;
  qrCode: string | null;
  verificadoEm: string | null;
  ultimoErro: string | null;
  gatewayConfigurado: boolean;
};

export type TenantNaCentral = {
  id: string;
  nome: string;
  habilitada: boolean;
  notificacoesAtivas: boolean;
  temConexaoPropriaDeNotificacoes: boolean;
};

/** Lança se quem chama não for Admin da plataforma. */
export async function exigirAdminDaPlataforma(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Acesso exclusivo da equipe Cortaí.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function linhaDaCentral(db: SupabaseClient<Database>) {
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status, numero, qr_code, verificado_em, ultimo_erro")
    .eq("escopo", "central")
    .maybeSingle();
  return data;
}

async function garantirCentral(db: SupabaseClient<Database>) {
  const atual = await linhaDaCentral(db);
  if (atual) return atual;
  const { randomBytes } = await import("node:crypto");
  const { error } = await db.from("conexoes_whatsapp").insert({
    escopo: "central",
    tenant_id: null,
    tipo: "notificacoes",
    compartilhada: false,
    provedor: "evolution",
    status: "desconectado",
    sessao_id: `cortai_central_${randomBytes(6).toString("hex")}`,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  const criada = await linhaDaCentral(db);
  if (!criada) throw new Error("Não foi possível preparar a Central.");
  return criada;
}

async function estado(db: SupabaseClient<Database>): Promise<EstadoDaCentral> {
  const { gatewayConfigurado } = await import("@/lib/whatsapp/gateway.server");
  const l = await linhaDaCentral(db);
  return {
    existe: !!l,
    status: l?.status ?? "desconectado",
    numero: l?.numero ?? null,
    qrCode: l?.status === "qr_pronto" ? (l?.qr_code ?? null) : null,
    verificadoEm: l?.verificado_em ?? null,
    ultimoErro: l?.ultimo_erro ?? null,
    gatewayConfigurado: gatewayConfigurado("evolution"),
  };
}

export const obterCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => estado(await exigirAdminDaPlataforma(context)));

const acaoSchema = z.object({ acao: z.enum(["conectar", "qr", "reconectar", "desconectar", "sincronizar"]) });

export const operarCentral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => acaoSchema.parse(d))
  .handler(async ({ context, data }): Promise<EstadoDaCentral & { aviso: string | null }> => {
    const db = await exigirAdminDaPlataforma(context);
    const { gatewayConfigurado, gatewayDoProvedor } = await import("@/lib/whatsapp/gateway.server");
    if (!gatewayConfigurado("evolution"))
      return { ...(await estado(db)), aviso: "Serviço de WhatsApp não configurado." };
    const central = await garantirCentral(db);
    const gw = gatewayDoProvedor("evolution");
    let aviso: string | null = null;
    try {
      const r =
        data.acao === "conectar"
          ? await gw.criarSessao(central.sessao_id, URL_EVOLUTION)
          : data.acao === "qr"
            ? await gw.obterQrCode(central.sessao_id)
            : data.acao === "reconectar"
              ? await gw.reiniciarSessao(central.sessao_id)
              : data.acao === "sincronizar"
                ? await gw.consultarStatus(central.sessao_id)
                : (await gw.desconectar(central.sessao_id), { status: "desconectado" as const });
      const st = data.acao === "conectar" && r.status === "desconectado" ? "pendente" : r.status;
      await db
        .from("conexoes_whatsapp")
        .update({
          status: st,
          qr_code: "qrCode" in r ? (r.qrCode ?? null) : null,
          qr_expira_em: "qrExpiraEm" in r ? (r.qrExpiraEm ?? null) : null,
          ...("numero" in r && r.numero ? { numero: r.numero } : {}),
          ultimo_erro: null,
          verificado_em: new Date().toISOString(),
        })
        .eq("id", central.id);
    } catch (e) {
      aviso = e instanceof Error ? e.message : "Falha ao falar com o serviço.";
      await db.from("conexoes_whatsapp").update({ ultimo_erro: aviso }).eq("id", central.id);
    }
    const { logConexao } = await import("@/lib/whatsapp/saude-conexao");
    logConexao("central_operada", { acao: data.acao, ator: context.userId, falhou: !!aviso });
    return { ...(await estado(db)), aviso };
  });

export const listarTenantsDaCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TenantNaCentral[]> => {
    const db = await exigirAdminDaPlataforma(context);
    const [{ data: tenants }, { data: proprias }] = await Promise.all([
      db
        .from("tenants")
        .select("id, nome, notificacoes_central_habilitada, notificacoes_whatsapp_ativas")
        .order("nome")
        .limit(500),
      db
        .from("conexoes_whatsapp")
        .select("tenant_id")
        .eq("escopo", "tenant")
        .eq("tipo", "notificacoes")
        .eq("compartilhada", false),
    ]);
    const comPropria = new Set((proprias ?? []).map((p) => p.tenant_id));
    return (tenants ?? []).map((t) => ({
      id: t.id,
      nome: t.nome,
      habilitada: t.notificacoes_central_habilitada,
      notificacoesAtivas: t.notificacoes_whatsapp_ativas,
      temConexaoPropriaDeNotificacoes: comPropria.has(t.id),
    }));
  });

export const definirCentralDoTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), habilitada: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const db = await exigirAdminDaPlataforma(context);
    const { error } = await db
      .from("tenants")
      .update({ notificacoes_central_habilitada: data.habilitada })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    await db.from("auditoria_de_suporte").insert({
      ator_user_id: context.userId,
      tenant_id: data.tenantId,
      acao: data.habilitada ? "central.habilitada" : "central.desabilitada",
      alvo: "notificacoes_central_habilitada",
      alteracoes: { habilitada: data.habilitada },
    });
    return { ok: true as const };
  });
