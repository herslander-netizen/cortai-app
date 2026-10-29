/**
 * WhatsApp no Admin: visão e controle da conexão PRINCIPAL de cada negócio
 * e do interruptor de notificações (Central de Notificações = interruptor).
 * Exclusivo do Admin: toda função confere `has_role(admin)` no servidor antes
 * de ler ou alterar. Cada ação atua só na linha do negócio informado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/** URL de callback exclusiva do ambiente atual; falha fechada sem configuração. */
function urlDeEventos(provedor: "evolution" | "meta"): string {
  const base = process.env["CORTAI_PUBLIC_BASE_URL"]?.trim().replace(/\/$/, "");
  if (!base) throw new Error("Configure CORTAI_PUBLIC_BASE_URL antes de conectar o WhatsApp.");
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error("CORTAI_PUBLIC_BASE_URL precisa ser uma URL HTTPS válida.");
  }
  if (parsed.protocol !== "https:" || parsed.hostname === "cortai.dev" || parsed.hostname.endsWith(".cortai.dev")) {
    throw new Error("CORTAI_PUBLIC_BASE_URL deve apontar para o ambiente independente, nunca para produção.");
  }
  return `${base}${provedor === "evolution" ? "/api/public/whatsapp/evolution" : "/api/public/whatsapp/eventos"}`;
}

export type WhatsappDoNegocio = {
  tenantId: string;
  nome: string;
  notificacoesAtivas: boolean;
  status: string;
  numero: string | null;
  provedor: string | null;
  compartilhada: boolean;
  verificadoEm: string | null;
  ultimoErro: string | null;
  qrCode: string | null;
  temNumeroAntigoDeAvisos: boolean;
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
  if (!ok) throw new Error("Acesso exclusivo da equipe Flow.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Linha = {
  id: string;
  tenant_id: string | null;
  sessao_id: string;
  status: string | null;
  numero: string | null;
  provedor: string | null;
  compartilhada: boolean | null;
  tipo: string | null;
  verificado_em: string | null;
  ultimo_erro: string | null;
  qr_code: string | null;
};

const COLUNAS =
  "id, tenant_id, sessao_id, status, numero, provedor, compartilhada, tipo, verificado_em, ultimo_erro, qr_code";

export const listarWhatsappDosNegocios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhatsappDoNegocio[]> => {
    const db = await exigirAdminDaPlataforma(context);
    const { conexaoPrincipal } = await import("@/lib/whatsapp/finalidade-conexao");
    const [{ data: tenants }, { data: linhas }] = await Promise.all([
      db.from("tenants").select("id, nome, notificacoes_whatsapp_ativas").order("nome").limit(500),
      db.from("conexoes_whatsapp").select(COLUNAS).eq("escopo", "tenant"),
    ]);
    const porTenant = new Map<string, Linha[]>();
    for (const l of (linhas ?? []) as Linha[]) {
      if (!l.tenant_id) continue;
      porTenant.set(l.tenant_id, [...(porTenant.get(l.tenant_id) ?? []), l]);
    }
    return (tenants ?? []).map((t) => {
      const doTenant = porTenant.get(t.id) ?? [];
      const propria = conexaoPrincipal(doTenant);
      const compartilhada = !propria ? doTenant.find((l) => l.compartilhada === true) : undefined;
      const l = propria ?? compartilhada ?? null;
      return {
        tenantId: t.id,
        nome: t.nome,
        notificacoesAtivas: t.notificacoes_whatsapp_ativas !== false,
        status: l?.status ?? "sem_conexao",
        numero: l?.numero ?? null,
        provedor: l?.provedor ?? null,
        compartilhada: !propria && !!compartilhada,
        verificadoEm: l?.verificado_em ?? null,
        ultimoErro: l?.ultimo_erro ?? null,
        qrCode: propria?.status === "qr_pronto" ? (propria.qr_code ?? null) : null,
        temNumeroAntigoDeAvisos: doTenant.some((x) => x.tipo === "notificacoes"),
      };
    });
  });

const acaoSchema = z.object({
  tenantId: z.string().uuid(),
  acao: z.enum(["conectar", "qr", "reconectar", "desconectar", "sincronizar"]),
});

/** Opera somente a conexão principal do negócio informado. */
export const operarWhatsappDoNegocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => acaoSchema.parse(d))
  .handler(async ({ context, data }): Promise<{ aviso: string | null }> => {
    const db = await exigirAdminDaPlataforma(context);
    const { gatewayConfigurado, gatewayDoProvedor, provedorDoGateway } =
      await import("@/lib/whatsapp/gateway.server");
    const { conexaoPrincipal } = await import("@/lib/whatsapp/finalidade-conexao");
    const { data: linhas } = await db
      .from("conexoes_whatsapp")
      .select(COLUNAS)
      .eq("tenant_id", data.tenantId)
      .eq("escopo", "tenant");
    let principal = conexaoPrincipal((linhas ?? []) as Linha[]);
    if (!principal) {
      if (data.acao !== "conectar")
        return { aviso: "Este negócio ainda não tem WhatsApp próprio." };
      const { randomBytes } = await import("node:crypto");
      const sessaoId = `cortai_${data.tenantId.replace(/-/g, "").slice(0, 12)}_${randomBytes(6).toString("hex")}`;
      const { data: criada, error } = await db
        .from("conexoes_whatsapp")
        .insert({
          tenant_id: data.tenantId,
          sessao_id: sessaoId,
          status: "desconectado",
          tipo: "atendimento",
        })
        .select(COLUNAS)
        .single();
      if (error || !criada)
        return { aviso: error?.message ?? "Não foi possível preparar a conexão." };
      principal = criada as Linha;
    }
    const provedor = principal.provedor ?? provedorDoGateway();
    if (!gatewayConfigurado(provedor)) return { aviso: "Serviço de WhatsApp não configurado." };
    const gw = gatewayDoProvedor(provedor);
    let aviso: string | null = null;
    try {
      const r =
        data.acao === "conectar"
          ? await gw.criarSessao(
              principal.sessao_id,
              urlDeEventos(provedor === "evolution" ? "evolution" : "meta"),
            )
          : data.acao === "qr"
            ? await gw.obterQrCode(principal.sessao_id)
            : data.acao === "reconectar"
              ? await gw.reiniciarSessao(principal.sessao_id)
              : data.acao === "sincronizar"
                ? await gw.consultarStatus(principal.sessao_id)
                : (await gw.desconectar(principal.sessao_id), { status: "desconectado" as const });
      const st = data.acao === "conectar" && r.status === "desconectado" ? "pendente" : r.status;
      await db
        .from("conexoes_whatsapp")
        .update({
          provedor,
          status: st,
          qr_code: st === "conectado" ? null : "qrCode" in r ? (r.qrCode ?? null) : null,
          qr_expira_em: "qrExpiraEm" in r ? (r.qrExpiraEm ?? null) : null,
          ...("numero" in r && r.numero ? { numero: r.numero } : {}),
          ...(data.acao === "desconectar" ? { desconectado_em: new Date().toISOString() } : {}),
          ultimo_erro: null,
          verificado_em: new Date().toISOString(),
        })
        .eq("id", principal.id)
        .eq("tenant_id", data.tenantId);
    } catch (e) {
      aviso = e instanceof Error ? e.message : "Falha ao falar com o serviço.";
      await db.from("conexoes_whatsapp").update({ ultimo_erro: aviso }).eq("id", principal.id);
    }
    await db.from("auditoria_de_suporte").insert({
      ator_user_id: context.userId,
      tenant_id: data.tenantId,
      acao: `whatsapp.${data.acao}`,
      alvo: principal.sessao_id,
      alteracoes: { falhou: !!aviso },
    });
    return { aviso };
  });

/** Interruptor de notificações (Central de Notificações) de um negócio. */
export const definirNotificacoesDoNegocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), ativas: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const db = await exigirAdminDaPlataforma(context);
    const { error } = await db
      .from("tenants")
      .update({ notificacoes_whatsapp_ativas: data.ativas })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    await db.from("auditoria_de_suporte").insert({
      ator_user_id: context.userId,
      tenant_id: data.tenantId,
      acao: data.ativas ? "notificacoes.ativadas" : "notificacoes.desativadas",
      alvo: "notificacoes_whatsapp_ativas",
      alteracoes: { ativas: data.ativas },
    });
    return { ok: true as const };
  });

const codigoDoNegocioSchema = z.object({
  tenantId: z.string().uuid(),
  telefone: z.string().trim().min(8).max(24),
});

/**
 * Admin: gera o código de 8 caracteres para conectar a conexão principal de um negócio pelo
 * número de telefone (WhatsApp → Aparelhos conectados → Conectar com número). O código não
 * fica gravado; a ação vai para a auditoria de suporte.
 */
export const gerarCodigoDoNegocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => codigoDoNegocioSchema.parse(d))
  .handler(
    async ({
      context,
      data,
    }): Promise<{ codigo: string | null; expiraEm: string | null; aviso: string | null }> => {
      const db = await exigirAdminDaPlataforma(context);
      const { numeroParaPareamento } = await import("@/lib/whatsapp/pareamento-telefone");
      const numero = numeroParaPareamento(data.telefone);
      if (!numero)
        return {
          codigo: null,
          expiraEm: null,
          aviso: "Confira o número: use DDD e telefone, como (11) 99999-8888.",
        };
      const { gatewayConfigurado, gatewayDoProvedor, provedorDoGateway } =
        await import("@/lib/whatsapp/gateway.server");
      const { conexaoPrincipal } = await import("@/lib/whatsapp/finalidade-conexao");
      if (!gatewayConfigurado("evolution"))
        return { codigo: null, expiraEm: null, aviso: "Serviço de WhatsApp não configurado." };
      if (provedorDoGateway() !== "evolution")
        return {
          codigo: null,
          expiraEm: null,
          aviso: "Neste serviço a conexão é só pelo QR Code.",
        };
      const { data: linhas } = await db
        .from("conexoes_whatsapp")
        .select(COLUNAS)
        .eq("tenant_id", data.tenantId)
        .eq("escopo", "tenant");
      const principal = conexaoPrincipal((linhas ?? []) as Linha[]);
      if (!principal)
        return {
          codigo: null,
          expiraEm: null,
          aviso: "Conecte o WhatsApp deste negócio primeiro.",
        };
      const gw = gatewayDoProvedor("evolution");
      try {
        let pareamento;
        try {
          pareamento = await gw.obterCodigoDePareamento(principal.sessao_id, numero);
        } catch {
          // Sessão ainda não existe no serviço: cria e tenta de novo.
          await gw.criarSessao(principal.sessao_id, urlDeEventos("evolution"));
          pareamento = await gw.obterCodigoDePareamento(principal.sessao_id, numero);
        }
        await db
          .from("conexoes_whatsapp")
          .update({
            provedor: "evolution",
            status: "conectando",
            qr_code: null,
            qr_expira_em: null,
            ultimo_erro: null,
          })
          .eq("id", principal.id)
          .eq("tenant_id", data.tenantId);
        await db.from("auditoria_de_suporte").insert({
          ator_user_id: context.userId,
          tenant_id: data.tenantId,
          acao: "whatsapp.codigo_por_numero",
          alvo: principal.sessao_id,
          alteracoes: {},
        });
        return { codigo: pareamento.codigo, expiraEm: pareamento.expiraEm, aviso: null };
      } catch (erro) {
        return {
          codigo: null,
          expiraEm: null,
          aviso: erro instanceof Error ? erro.message : "Não foi possível gerar o código agora.",
        };
      }
    },
  );
