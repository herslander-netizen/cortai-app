/**
 * Linha da plataforma (WhatsApp administrativo do Flow) — decisão do dono, 05/11/2026.
 *
 * - Admin (has_role admin, conferido no servidor): conecta, acompanha e desconecta a ÚNICA linha `escopo = 'central'`
 *   (sem negócio), e vê os últimos avisos enviados. A linha nunca é usada para avisos de negócio a clientes.
 * - Cada pessoa: liga ou desliga o próprio opt-in (`telefones_da_equipe.avisos_da_plataforma`), só com telefone
 *   verificado. Ao ligar, recebe as boas-vindas uma única vez.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirAdminDaPlataforma, urlDeEventos } from "@/lib/whatsapp-central.functions";

export type LinhaDaPlataforma = {
  status: string;
  numero: string | null;
  qrCode: string | null;
  qrExpiraEm: string | null;
  ultimoErro: string | null;
  conectadoEm: string | null;
};

export type EnvioDaPlataforma = {
  id: string;
  evento: string;
  status: string;
  motivo: string | null;
  criadoEm: string;
};

const COLUNAS = "id, sessao_id, status, numero, qr_code, qr_expira_em, ultimo_erro, conectado_em";

type Linha = {
  id: string;
  sessao_id: string;
  status: string;
  numero: string | null;
  qr_code: string | null;
  qr_expira_em: string | null;
  ultimo_erro: string | null;
  conectado_em: string | null;
};

function paraTela(l: Linha | null): LinhaDaPlataforma | null {
  if (!l) return null;
  return {
    status: l.status,
    numero: l.numero ? `…${l.numero.slice(-4)}` : null,
    qrCode: l.qr_code,
    qrExpiraEm: l.qr_expira_em,
    ultimoErro: l.ultimo_erro,
    conectadoEm: l.conectado_em,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Supabase do servidor
async function linhaAtual(db: any): Promise<Linha | null> {
  const { data } = await db
    .from("conexoes_whatsapp")
    .select(COLUNAS)
    .eq("escopo", "central")
    .is("tenant_id", null)
    .maybeSingle();
  return (data as Linha | null) ?? null;
}

async function gatewayDaLinha() {
  const { gatewayConfigurado, gatewayDoProvedor, provedorDoGateway } =
    await import("@/lib/whatsapp/gateway.server");
  if (!gatewayConfigurado())
    throw new Error("Serviço de WhatsApp não configurado nesta instalação.");
  if (provedorDoGateway() !== "evolution")
    throw new Error("A linha da plataforma usa a Evolution (conexão por QR ou número).");
  return gatewayDoProvedor("evolution");
}

export const getLinhaDaPlataforma = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      linha: LinhaDaPlataforma | null;
      envios: EnvioDaPlataforma[];
      comOptIn: number;
    }> => {
      const db = await exigirAdminDaPlataforma(context);
      const [linha, { data: envios }, { count }] = await Promise.all([
        linhaAtual(db),
        db
          .from("envios_da_plataforma")
          .select("id, evento, status, motivo, criado_em")
          .order("criado_em", { ascending: false })
          .limit(20),
        db
          .from("telefones_da_equipe")
          .select("user_id", { count: "exact", head: true })
          .eq("avisos_da_plataforma", true)
          .not("verificado_em", "is", null),
      ]);
      return {
        linha: paraTela(linha),
        envios: (envios ?? []).map((e) => ({
          id: e.id,
          evento: e.evento,
          status: e.status,
          motivo: e.motivo,
          criadoEm: e.criado_em,
        })),
        comOptIn: count ?? 0,
      };
    },
  );

/** Cria (se preciso) a linha central e pede a conexão ao serviço: devolve o QR. */
export const conectarLinhaDaPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ linha: LinhaDaPlataforma | null; aviso: string | null }> => {
      const db = await exigirAdminDaPlataforma(context);
      try {
        const gw = await gatewayDaLinha();
        let linha = await linhaAtual(db);
        if (!linha) {
          const { randomBytes } = await import("node:crypto");
          const { data, error } = await db
            .from("conexoes_whatsapp")
            .insert({
              escopo: "central",
              tenant_id: null,
              tipo: "notificacoes",
              sessao_id: `flow_plataforma_${randomBytes(6).toString("hex")}`,
              provedor: "evolution",
              status: "desconectado",
            })
            .select(COLUNAS)
            .single();
          if (error) throw new Error(error.message);
          linha = data as Linha;
        }
        const estado = await gw.criarSessao(linha.sessao_id, urlDeEventos("evolution"));
        const { data } = await db
          .from("conexoes_whatsapp")
          .update({
            provedor: "evolution",
            status: estado.status === "desconectado" ? "pendente" : estado.status,
            qr_code: estado.qrCode ?? null,
            qr_expira_em: estado.qrExpiraEm ?? null,
            ultimo_erro: null,
          })
          .eq("id", linha.id)
          .select(COLUNAS)
          .single();
        return { linha: paraTela(data as Linha), aviso: null };
      } catch (e) {
        return {
          linha: null,
          aviso: e instanceof Error ? e.message : "Não foi possível conectar agora.",
        };
      }
    },
  );

/** Estado real da linha no serviço (o painel consulta enquanto não conecta). */
export const sincronizarLinhaDaPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ linha: LinhaDaPlataforma | null }> => {
    const db = await exigirAdminDaPlataforma(context);
    const linha = await linhaAtual(db);
    if (!linha) return { linha: null };
    try {
      const gw = await gatewayDaLinha();
      const estado = await gw.consultarStatus(linha.sessao_id);
      const { qrAposEstado } = await import("@/lib/whatsapp/qr-conexao");
      const { data } = await db
        .from("conexoes_whatsapp")
        .update({
          status: estado.status,
          ...qrAposEstado(estado.status, estado, linha),
          numero: estado.numero ?? linha.numero,
          conectado_em:
            estado.status === "conectado"
              ? (linha.conectado_em ?? new Date().toISOString())
              : linha.conectado_em,
          visto_em: new Date().toISOString(),
        })
        .eq("id", linha.id)
        .select(COLUNAS)
        .single();
      return { linha: paraTela(data as Linha) };
    } catch {
      return { linha: paraTela(linha) };
    }
  });

/** Código de 8 caracteres para conectar pelo número (alternativa ao QR). */
export const codigoDaLinhaDaPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ telefone: z.string().min(8).max(30) }).parse(d))
  .handler(
    async ({
      context,
      data,
    }): Promise<{ codigo: string | null; expiraEm: string | null; aviso: string | null }> => {
      const db = await exigirAdminDaPlataforma(context);
      const { numeroParaPareamento } = await import("@/lib/whatsapp/pareamento-telefone");
      const numero = numeroParaPareamento(data.telefone);
      if (!numero)
        return { codigo: null, expiraEm: null, aviso: "Confira o número: use DDD e telefone." };
      const linha = await linhaAtual(db);
      if (!linha)
        return {
          codigo: null,
          expiraEm: null,
          aviso: "Toque em Conectar antes de pedir o código.",
        };
      try {
        const gw = await gatewayDaLinha();
        const r = await gw.obterCodigoDePareamento(linha.sessao_id, numero);
        await db
          .from("conexoes_whatsapp")
          .update({ status: "conectando", qr_code: null, qr_expira_em: null, ultimo_erro: null })
          .eq("id", linha.id);
        return { codigo: r.codigo, expiraEm: r.expiraEm, aviso: null };
      } catch (e) {
        return {
          codigo: null,
          expiraEm: null,
          aviso: e instanceof Error ? e.message : "Não foi possível gerar o código agora.",
        };
      }
    },
  );

/** Código em vigor agora (a Evolution troca a cada ~45 s). Só lê. */
export const codigoAtualDaLinhaDaPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ telefone: z.string().min(8).max(30) }).parse(d))
  .handler(async ({ context, data }) => {
    const db = await exigirAdminDaPlataforma(context);
    const { numeroParaPareamento } = await import("@/lib/whatsapp/pareamento-telefone");
    const numero = numeroParaPareamento(data.telefone);
    const linha = await linhaAtual(db);
    if (!numero || !linha) return { estado: "encerrado" as const };
    const gw = await gatewayDaLinha();
    return gw.codigoDePareamentoAtual(linha.sessao_id, numero);
  });

export const desconectarLinhaDaPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; aviso: string | null }> => {
    const db = await exigirAdminDaPlataforma(context);
    const linha = await linhaAtual(db);
    if (!linha) return { ok: true, aviso: null };
    try {
      const gw = await gatewayDaLinha();
      await gw.desconectar(linha.sessao_id);
    } catch (e) {
      return { ok: false, aviso: e instanceof Error ? e.message : "Não foi possível desconectar." };
    }
    await db
      .from("conexoes_whatsapp")
      .update({ status: "desconectado", qr_code: null, desconectado_em: new Date().toISOString() })
      .eq("id", linha.id);
    return { ok: true, aviso: null };
  });

/* ----------------------------- Opt-in de cada pessoa ----------------------------- */

export const getMeusAvisosDaPlataforma = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ telefoneVerificado: boolean; ativo: boolean }> => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data } = await db
      .from("telefones_da_equipe")
      .select("verificado_em, avisos_da_plataforma")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      telefoneVerificado: Boolean(data?.verificado_em),
      ativo: data?.avisos_da_plataforma === true,
    };
  });

export const definirMeusAvisosDaPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ ativo: z.boolean() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: boolean; aviso: string | null }> => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: telefone } = await db
      .from("telefones_da_equipe")
      .select("verificado_em")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!telefone?.verificado_em)
      return { ok: false, aviso: "Verifique seu WhatsApp no perfil antes de ligar estes avisos." };
    const { error } = await db
      .from("telefones_da_equipe")
      .update({ avisos_da_plataforma: data.ativo })
      .eq("user_id", context.userId);
    if (error) return { ok: false, aviso: "Não foi possível salvar agora." };
    if (data.ativo) {
      // Boas-vindas uma única vez por pessoa: confirma que a linha chega até ela.
      const { avisarPelaPlataforma } = await import("@/lib/whatsapp/linha-da-plataforma.server");
      const { data: perfil } = await db
        .from("perfis")
        .select("tenant_ativo")
        .eq("user_id", context.userId)
        .maybeSingle();
      const tenantId = (perfil?.tenant_ativo as string | null) ?? null;
      const { data: negocio } = tenantId
        ? await db.from("tenants").select("nome").eq("id", tenantId).maybeSingle()
        : { data: null };
      await avisarPelaPlataforma({
        evento: "boas_vindas_negocio",
        userId: context.userId,
        tenantId,
        chave: `boas_vindas:${context.userId}`,
        dados: { negocio: (negocio as { nome?: string } | null)?.nome ?? null },
      });
    }
    return { ok: true, aviso: null };
  });
