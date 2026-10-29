/**
 * Funções do painel da Flow IA (WhatsApp).
 *
 * Toda função resolve a barbearia pelo vínculo real do usuário e exige a
 * permissão correspondente no servidor — esconder botão na tela não basta.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";
import {
  MENSAGEM_DO_LEGADO,
  podeAtivarConexao,
  TIPOS_DE_CONEXAO,
  tipoValido,
  type TipoDeConexao,
} from "@/lib/whatsapp/finalidade-conexao";
import {
  AUTOMACOES,
  type InformacaoDaBarbearia,
  CONFIGURACAO_PADRAO,
  type ChaveDeAutomacao,
  type ConexaoDeWhatsapp,
  type ConfiguracaoDoAtendimento,
  type ConversaDeWhatsapp,
  type MensagemDeWhatsapp,
  type StatusDaConexao,
  type TomDoAtendimento,
} from "@/lib/whatsapp/contrato";
import { urlPublica } from "@/lib/origem-publica";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Endereço público deste ambiente para callbacks de WhatsApp.
 * Nunca usa o domínio de produção como fallback: configure CORTAI_PUBLIC_BASE_URL
 * apenas depois que a reconstrução tiver uma URL pública própria.
 */
function urlDeEventos(provedor: string): string {
  const base = process.env["CORTAI_PUBLIC_BASE_URL"]?.trim().replace(/\/$/, "");
  if (!base)
    throw new Error("Configure CORTAI_PUBLIC_BASE_URL para ativar o WhatsApp neste ambiente.");
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error("CORTAI_PUBLIC_BASE_URL precisa ser uma URL HTTPS válida.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname === "cortai.dev" ||
    parsed.hostname.endsWith(".cortai.dev")
  ) {
    throw new Error(
      "CORTAI_PUBLIC_BASE_URL deve apontar para o ambiente independente, nunca para o domínio de produção.",
    );
  }
  return `${base}${provedor === "evolution" ? "/api/public/whatsapp/evolution" : "/api/public/whatsapp/eventos"}`;
}

export type PainelDoCortai = {
  /** Existe serviço de WhatsApp publicado e configurado neste ambiente? */
  gatewayConfigurado: boolean;
  /** Nome do provedor em uso (evolution por padrão). */
  provedor: string;
  /** Variáveis que ainda precisam ser cadastradas para o QR funcionar. */
  credenciaisFaltantes: string[];
  /** A IA do Flow está disponível? */
  iaDisponivel: boolean;
  conexao: ConexaoDeWhatsapp | null;
  /** Segunda conexão (avisos transacionais); null enquanto não existir. */
  conexaoNotificacoes: ConexaoDeWhatsapp | null;
  configuracao: ConfiguracaoDoAtendimento;
  automacoes: { chave: ChaveDeAutomacao; ativa: boolean; mensagem: string }[];
  conversasAtivas: number;
  conversasComHumano: number;
  /** O usuário atual pode administrar a conexão do WhatsApp? */
  podeGerenciarWhatsapp: boolean;
  /** Interruptor "Notificações pelo WhatsApp" (fonte única: tenants). */
  notificacoesAtivas: boolean;
  /** Notificações saem pelo número central do Flow (sem dados técnicos dele). */
  notificacoesPelaCentral: boolean;
  /** Existe hoje um número pronto para enviar as notificações deste negócio? */
  envioDeNotificacoesDisponivel: boolean;
};

export type EnvioDaSecretaria = {
  id: string;
  tipo: string;
  status: string;
  telefone: string;
  conteudo: string | null;
  tentativas: number;
  criadoEm: string;
  enviadoEm: string | null;
  respondidoEm: string | null;
  erro: string | null;
  erroCodigo: number | null;
};

export const listarEnviosDaSecretaria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnvioDaSecretaria[]> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { data, error } = await db
      .from("envios_de_whatsapp")
      .select(
        "id, tipo, status, telefone, conteudo, tentativas, criado_em, enviado_em, respondido_em, erro, erro_codigo",
      )
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((envio) => ({
      id: envio.id,
      tipo: envio.tipo,
      status: envio.status,
      telefone: envio.telefone,
      conteudo: envio.conteudo,
      tentativas: envio.tentativas,
      criadoEm: envio.criado_em,
      enviadoEm: envio.enviado_em,
      respondidoEm: envio.respondido_em,
      erro: envio.erro,
      erroCodigo: (envio as { erro_codigo?: number | null }).erro_codigo ?? null,
    }));
  });

function conexaoDaLinha(linha: any | null): ConexaoDeWhatsapp | null {
  if (!linha) return null;
  return {
    status: linha.status as StatusDaConexao,
    numero: linha.numero ?? null,
    nomeExibicao: linha.nome_exibicao ?? null,
    qrCode: linha.qr_code ?? null,
    qrExpiraEm: linha.qr_expira_em ?? null,
    conectadoEm: linha.conectado_em ?? null,
    ultimoErro: linha.ultimo_erro ?? null,
  };
}

export const getPainelDoCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PainelDoCortai> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { gatewayConfigurado, provedorDoGateway, credenciaisFaltantes } =
      await import("@/lib/whatsapp/gateway.server");
    const { iaDisponivel } = await import("@/lib/brain/gateway.server");
    const { configuracaoDoTenant } = await import("@/lib/whatsapp/fluxo.server");

    const [
      { data: conexoes },
      configuracao,
      { data: automacoes },
      ativas,
      humanas,
      { data: podeGerenciarWhatsapp },
      { data: tenantFlags },
    ] = await Promise.all([
      db.from("conexoes_whatsapp").select("*").eq("tenant_id", tenantId).eq("escopo", "tenant"),
      configuracaoDoTenant(tenantId),
      db.from("automacoes_de_ia").select("chave, ativa, mensagem").eq("tenant_id", tenantId),
      db
        .from("conversas_whatsapp")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "ativa"),
      db
        .from("conversas_whatsapp")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "humano"),
      context.supabase.rpc("has_tenant_permission", {
        _tenant_id: tenantId,
        _permission: "gerenciar_whatsapp",
      }),
      db.from("tenants").select("notificacoes_whatsapp_ativas").eq("id", tenantId).maybeSingle(),
    ]);
    // Modelo de conexão única: os avisos saem pela conexão principal.
    const pelaCentral = false;
    const envioDisponivel = linhaDoTipo(conexoes, "atendimento")?.status === "conectado";

    const salvas = new Map((automacoes ?? []).map((a) => [a.chave, a]));
    return {
      gatewayConfigurado: gatewayConfigurado(),
      provedor: provedorDoGateway(),
      credenciaisFaltantes: credenciaisFaltantes(),
      iaDisponivel: iaDisponivel("whatsapp"),
      conexao: conexaoDaLinha(linhaDoTipo(conexoes, "atendimento")),
      conexaoNotificacoes: conexaoDaLinha(linhaDoTipo(conexoes, "notificacoes")),
      configuracao,
      automacoes: (Object.keys(AUTOMACOES) as ChaveDeAutomacao[]).map((chave) => ({
        chave,
        ativa: salvas.get(chave)?.ativa ?? false,
        mensagem: salvas.get(chave)?.mensagem ?? "",
      })),
      conversasAtivas: ativas.count ?? 0,
      conversasComHumano: humanas.count ?? 0,
      podeGerenciarWhatsapp: podeGerenciarWhatsapp === true,
      notificacoesAtivas: tenantFlags?.notificacoes_whatsapp_ativas !== false,
      notificacoesPelaCentral: pelaCentral,
      envioDeNotificacoesDisponivel: envioDisponivel,
    };
  });

/* ----------------------------- Diagnóstico -------------------------------- */

export type DiagnosticoDoWhatsapp = {
  provedor: string;
  oficial: boolean;
  gatewayConfigurado: boolean;
  credenciaisFaltantes: string[];
  enderecoDeEventos: string;
  conexao: ConexaoDeWhatsapp | null;
  vistoEm: string | null;
  /** Eventos recebidos do provedor nas últimas 24 horas. */
  eventos24h: number;
  eventosPendentes: number;
  falhas: { id: string; evento: string; erro: string; recebidoEm: string }[];
  ultimoEventoEm: string | null;
  ultimaMensagemRecebida: { telefone: string | null; conteudo: string; criadoEm: string } | null;
  ultimoEnvioComErro: { telefone: string; tipo: string; erro: string; criadoEm: string } | null;
};

/** Estado detalhado da conexão oficial: eventos, falhas e última mensagem real. */
export const getDiagnosticoDoWhatsapp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DiagnosticoDoWhatsapp> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { gatewayConfigurado, provedorDoGateway, credenciaisFaltantes } =
      await import("@/lib/whatsapp/gateway.server");
    const provedor = provedorDoGateway();

    const { data: linha } = await db
      .from("conexoes_whatsapp")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("tipo", "atendimento")
      .maybeSingle();

    const oficial = (linha?.provedor ?? provedor) === "meta";
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // A caixa de entrada oficial é única por instalação; só faz sentido exibir
    // para a barbearia que de fato usa a conta oficial da Meta.
    const [eventos, pendentes, falhas, ultimoEvento, entrada, envioErro] = await Promise.all([
      oficial
        ? db
            .from("whatsapp_webhook_events")
            .select("delivery_id", { count: "exact", head: true })
            .gte("received_at", desde)
        : Promise.resolve({ count: 0 }),
      oficial
        ? db
            .from("whatsapp_webhook_events")
            .select("delivery_id", { count: "exact", head: true })
            .is("processed_at", null)
        : Promise.resolve({ count: 0 }),
      oficial
        ? db
            .from("whatsapp_webhook_events")
            .select("delivery_id, event, processing_error, received_at")
            .not("processing_error", "is", null)
            .order("received_at", { ascending: false })
            .limit(5)
            .then((r) => r.data ?? [])
        : Promise.resolve([] as any[]),
      oficial
        ? db
            .from("whatsapp_webhook_events")
            .select("received_at")
            .order("received_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
      db
        .from("mensagens_whatsapp")
        .select("conteudo, criado_em, telefone_remetente")
        .eq("tenant_id", tenantId)
        .eq("direcao", "entrada")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data),
      db
        .from("envios_de_whatsapp")
        .select("telefone, tipo, erro, criado_em")
        .eq("tenant_id", tenantId)
        .eq("status", "erro")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data),
    ]);

    return {
      provedor: linha?.provedor ?? provedor,
      oficial,
      gatewayConfigurado: gatewayConfigurado(),
      credenciaisFaltantes: credenciaisFaltantes(),
      enderecoDeEventos: oficial
        ? urlPublica("/api/public/whatsapp/webhook")
        : provedor === "evolution"
          ? urlDeEventos("evolution")
          : urlDeEventos(provedorDoGateway()),
      conexao: conexaoDaLinha(linha),
      vistoEm: linha?.visto_em ?? null,
      eventos24h: eventos.count ?? 0,
      eventosPendentes: pendentes.count ?? 0,
      falhas: falhas.map((f: any) => ({
        id: String(f.delivery_id),
        evento: String(f.event ?? "—"),
        erro: String(f.processing_error ?? ""),
        recebidoEm: String(f.received_at),
      })),
      ultimoEventoEm: (ultimoEvento as any)?.received_at ?? null,
      ultimaMensagemRecebida: entrada
        ? {
            telefone: entrada.telefone_remetente ?? null,
            conteudo: entrada.conteudo ?? "",
            criadoEm: entrada.criado_em,
          }
        : null,
      ultimoEnvioComErro: envioErro
        ? {
            telefone: envioErro.telefone,
            tipo: envioErro.tipo,
            erro: envioErro.erro ?? "Falha no envio.",
            criadoEm: envioErro.criado_em,
          }
        : null,
    };
  });

/* ------------------------------- Conexão --------------------------------- */

/** Linha da finalidade; cada cartão do painel opera só a própria sessão. */
function linhaDoTipo<T extends { tipo?: string | null }>(
  linhas: T[] | null | undefined,
  tipo: TipoDeConexao,
): T | null {
  return (linhas ?? []).find((l) => tipoValido(l.tipo) === tipo) ?? null;
}

const tipoSchema = z
  .object({ tipo: z.enum(TIPOS_DE_CONEXAO).optional() })
  .optional()
  .transform((v) => tipoValido(v?.tipo));

async function sessaoDoTenant(tenantId: string, tipo: TipoDeConexao) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id")
    .eq("tenant_id", tenantId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (data) return data;
  // A conexão antiga de avisos nunca volta a ser criada.
  if (!podeAtivarConexao(tipo)) throw new Error(MENSAGEM_DO_LEGADO);
  const { randomBytes } = await import("node:crypto");
  const prefixo = "cortai_";
  const sessaoId = `${prefixo}${tenantId.replace(/-/g, "").slice(0, 12)}_${randomBytes(6).toString("hex")}`;
  const { data: criada, error } = await db
    .from("conexoes_whatsapp")
    .insert({ tenant_id: tenantId, sessao_id: sessaoId, status: "desconectado", tipo })
    .select("id, sessao_id")
    .single();
  if (error) throw new Error(error.message);
  return criada;
}

/** Pede a conexão ao serviço de WhatsApp e devolve o estado real da sessão. */
export const conectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tipoSchema.parse(d))
  .handler(
    async ({ context, data: tipo }): Promise<{ status: StatusDaConexao; aviso: string | null }> => {
      const tenantId = await tenantIdDoMembro(context);
      await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
      await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
      if (!podeAtivarConexao(tipo)) return { status: "desconectado", aviso: MENSAGEM_DO_LEGADO };
      const { gatewayConfigurado, gatewayDeWhatsapp, provedorDoGateway } =
        await import("@/lib/whatsapp/gateway.server");
      if (!gatewayConfigurado()) {
        return {
          status: "desconectado",
          aviso:
            "O serviço de WhatsApp ainda não está configurado nesta instalação. Fale com o suporte do Flow para liberar.",
        };
      }
      const sessao = await sessaoDoTenant(tenantId, tipo);
      const db = await admin();
      try {
        const estado = await gatewayDeWhatsapp.criarSessao(
          sessao.sessao_id,
          provedorDoGateway() === "evolution"
            ? urlDeEventos("evolution")
            : urlDeEventos(provedorDoGateway()),
        );
        await db
          .from("conexoes_whatsapp")
          .update({
            provedor: provedorDoGateway(),
            status: estado.status === "desconectado" ? "pendente" : estado.status,
            qr_code: estado.qrCode ?? null,
            qr_expira_em: estado.qrExpiraEm ?? null,
            ultimo_erro: null,
          })
          .eq("id", sessao.id);
        return {
          status: estado.status === "desconectado" ? "pendente" : estado.status,
          aviso: null,
        };
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Falha ao conectar.";
        await db
          .from("conexoes_whatsapp")
          .update({ status: "erro", ultimo_erro: mensagem })
          .eq("id", sessao.id);
        return { status: "erro", aviso: mensagem };
      }
    },
  );

/** Busca o QR atual direto no serviço (usado pelo botão "Gerar novo QR Code"). */
export const atualizarQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tipoSchema.parse(d))
  .handler(
    async ({
      context,
      data: tipo,
    }): Promise<{ conexao: ConexaoDeWhatsapp | null; aviso: string | null }> => {
      const tenantId = await tenantIdDoMembro(context);
      await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
      await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
      if (!podeAtivarConexao(tipo)) return { conexao: null, aviso: MENSAGEM_DO_LEGADO };
      const { gatewayConfigurado, gatewayDeWhatsapp } =
        await import("@/lib/whatsapp/gateway.server");
      if (!gatewayConfigurado())
        return { conexao: null, aviso: "Serviço de WhatsApp não configurado." };
      const sessao = await sessaoDoTenant(tenantId, tipo);
      const db = await admin();
      try {
        const estado = await gatewayDeWhatsapp.obterQrCode(sessao.sessao_id);
        const { data } = await db
          .from("conexoes_whatsapp")
          .update({
            status: estado.status,
            qr_code: estado.qrCode ?? null,
            qr_expira_em: estado.qrExpiraEm ?? null,
            numero: estado.numero ?? null,
            nome_exibicao: estado.nomeExibicao ?? null,
            ultimo_erro: null,
          })
          .eq("id", sessao.id)
          .select("*")
          .single();
        return { conexao: conexaoDaLinha(data), aviso: null };
      } catch (erro) {
        return {
          conexao: null,
          aviso: erro instanceof Error ? erro.message : "Não foi possível obter o QR Code.",
        };
      }
    },
  );

const pareamentoSchema = z.object({
  tipo: z.enum(TIPOS_DE_CONEXAO).optional(),
  telefone: z.string().trim().min(8).max(24),
});

/**
 * Conexão por número de telefone: devolve o código de 8 caracteres que o dono digita no
 * celular (WhatsApp → Aparelhos conectados → Conectar com número de telefone). O código
 * não fica gravado; o estado da conexão continua sendo acompanhado como no QR Code.
 */
export const gerarCodigoPorTelefone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pareamentoSchema.parse(d))
  .handler(
    async ({
      context,
      data,
    }): Promise<{ codigo: string | null; expiraEm: string | null; aviso: string | null }> => {
      const tenantId = await tenantIdDoMembro(context);
      await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
      await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
      if (!podeAtivarConexao(tipoValido(data.tipo)))
        return { codigo: null, expiraEm: null, aviso: MENSAGEM_DO_LEGADO };
      const { numeroParaPareamento } = await import("@/lib/whatsapp/pareamento-telefone");
      const numero = numeroParaPareamento(data.telefone);
      if (!numero)
        return {
          codigo: null,
          expiraEm: null,
          aviso: "Confira o número: use DDD e telefone, como (11) 99999-8888.",
        };
      const { gatewayConfigurado, gatewayDeWhatsapp, provedorDoGateway } =
        await import("@/lib/whatsapp/gateway.server");
      if (!gatewayConfigurado())
        return { codigo: null, expiraEm: null, aviso: "Serviço de WhatsApp não configurado." };
      if (provedorDoGateway() !== "evolution")
        return {
          codigo: null,
          expiraEm: null,
          aviso: "Neste serviço a conexão é só pelo QR Code.",
        };
      const sessao = await sessaoDoTenant(tenantId, tipoValido(data.tipo));
      const db = await admin();
      try {
        let pareamento;
        try {
          pareamento = await gatewayDeWhatsapp.obterCodigoDePareamento(sessao.sessao_id, numero);
        } catch {
          // Sessão ainda não existe no serviço: cria e tenta de novo.
          await gatewayDeWhatsapp.criarSessao(sessao.sessao_id, urlDeEventos("evolution"));
          pareamento = await gatewayDeWhatsapp.obterCodigoDePareamento(sessao.sessao_id, numero);
        }
        await db
          .from("conexoes_whatsapp")
          .update({
            provedor: provedorDoGateway(),
            status: "conectando",
            qr_code: null,
            qr_expira_em: null,
            ultimo_erro: null,
          })
          .eq("id", sessao.id);
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

export const reconectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tipoSchema.parse(d))
  .handler(
    async ({ context, data: tipo }): Promise<{ status: StatusDaConexao; aviso: string | null }> => {
      const tenantId = await tenantIdDoMembro(context);
      await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
      await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
      if (!podeAtivarConexao(tipo)) return { status: "desconectado", aviso: MENSAGEM_DO_LEGADO };
      const { gatewayConfigurado, gatewayDeWhatsapp } =
        await import("@/lib/whatsapp/gateway.server");
      if (!gatewayConfigurado())
        return { status: "desconectado", aviso: "Serviço de WhatsApp não configurado." };
      const sessao = await sessaoDoTenant(tenantId, tipo);
      const db = await admin();
      try {
        const estado = await gatewayDeWhatsapp.reiniciarSessao(sessao.sessao_id);
        await db
          .from("conexoes_whatsapp")
          .update({ status: estado.status, qr_code: estado.qrCode ?? null, ultimo_erro: null })
          .eq("id", sessao.id);
        return { status: estado.status, aviso: null };
      } catch (erro) {
        return {
          status: "erro",
          aviso: erro instanceof Error ? erro.message : "Não foi possível reconectar.",
        };
      }
    },
  );

/** Desconecta a sessão. Não apaga clientes, histórico, agendamentos ou serviços. */
export const desconectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tipoSchema.parse(d))
  .handler(async ({ context, data: tipo }): Promise<{ ok: true; aviso: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
    const db = await admin();
    const sessao = await sessaoDoTenant(tenantId, tipo);
    let aviso: string | null = null;
    const { gatewayConfigurado, gatewayDeWhatsapp } = await import("@/lib/whatsapp/gateway.server");
    if (gatewayConfigurado()) {
      try {
        await gatewayDeWhatsapp.desconectar(sessao.sessao_id);
      } catch (erro) {
        aviso = erro instanceof Error ? erro.message : null;
      }
    }
    await db
      .from("conexoes_whatsapp")
      .update({
        status: "desconectado",
        qr_code: null,
        qr_expira_em: null,
        desconectado_em: new Date().toISOString(),
      })
      .eq("id", sessao.id);
    await db.from("auditoria_da_barbearia").insert({
      tenant_id: tenantId,
      ator_user_id: context.userId,
      acao: "whatsapp.desconectado_pelo_painel",
      alvo: sessao.sessao_id,
      detalhes: { tipo },
    });
    return { ok: true, aviso };
  });

/**
 * Pergunta ao serviço de WhatsApp qual é o estado REAL da sessão e grava o que
 * ele responder. O navegador nunca decide sozinho que está conectado: só
 * mostramos "conectado" depois que o serviço confirma.
 */
export const sincronizarConexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tipoSchema.parse(d))
  .handler(
    async ({
      context,
      data: tipo,
    }): Promise<{ conexao: ConexaoDeWhatsapp | null; aviso: string | null }> => {
      const tenantId = await tenantIdDoMembro(context);
      await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
      await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
      const { gatewayConfigurado, gatewayDeWhatsapp } =
        await import("@/lib/whatsapp/gateway.server");
      if (!gatewayConfigurado())
        return { conexao: null, aviso: "Serviço de WhatsApp não configurado." };
      const db = await admin();
      const { data: atual } = await db
        .from("conexoes_whatsapp")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("tipo", tipo)
        .maybeSingle();
      // Sem sessão criada ainda não há nada para consultar — evita chamada inútil.
      if (!atual) return { conexao: null, aviso: null };
      // Conexão antiga de avisos: só mostra o que está gravado, sem tocar no serviço.
      if (!podeAtivarConexao(tipo)) return { conexao: conexaoDaLinha(atual), aviso: null };
      try {
        const estado = await gatewayDeWhatsapp.consultarStatus(atual.sessao_id);
        const conectou = estado.status === "conectado";
        const { data } = await db
          .from("conexoes_whatsapp")
          .update({
            status: estado.status,
            ...(await import("@/lib/whatsapp/qr-conexao")).qrAposEstado(
              estado.status,
              estado,
              atual,
            ),
            numero: estado.numero ?? atual.numero,
            nome_exibicao: estado.nomeExibicao ?? atual.nome_exibicao,
            conectado_em: conectou
              ? (atual.conectado_em ?? new Date().toISOString())
              : atual.conectado_em,
            ultimo_erro: estado.erro ?? null,
          })
          .eq("id", atual.id)
          .select("*")
          .single();
        return { conexao: conexaoDaLinha(data), aviso: null };
      } catch (erro) {
        return {
          conexao: conexaoDaLinha(atual),
          aviso:
            erro instanceof Error ? erro.message : "Não foi possível consultar o serviço agora.",
        };
      }
    },
  );

/* ---------------------------- Configurações ------------------------------ */

const configSchema = z.object({
  atendimentoAutomatico: z.boolean(),
  saudacaoAtiva: z.boolean(),
  mensagemBoasVindas: z.string().trim().max(600),
  mensagemForaDoHorario: z.string().trim().max(600),
  permiteConfirmar: z.boolean(),
  permiteCancelar: z.boolean(),
  permiteRemarcar: z.boolean(),
  encaminhamentoHumano: z.boolean(),
  lembretes: z.boolean(),
  tom: z.enum(["profissional", "amigavel", "direto", "premium", "objetivo"]),
  recuperacaoAtiva: z.boolean().default(false),
  recuperacaoDias: z.number().int().min(7).max(180).default(30),
  responderWhatsapp: z.boolean().default(true),
  instrucoesExtras: z.string().trim().max(2000).default(""),
  horarioProprio: z.boolean().default(false),
  horarioDias: z.array(z.number().int().min(0).max(6)).max(7).default([1, 2, 3, 4, 5, 6]),
  horarioInicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("09:00"),
  horarioFim: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("19:00"),
  confirmacaoAutomatica: z.boolean().default(true),
  pagamentoAntecipado: z.boolean().default(false),
  linkPagamento: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine(
      (v) => v === "" || /^https:\/\/\S+$/.test(v),
      "Informe um link que comece com https://",
    ),
});

export const salvarConfiguracaoDoCortai = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => configSchema.parse(input))
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "configurar_automacoes");
    await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
    const db = await admin();
    const { error } = await db.from("config_atendimento_ia").upsert(
      {
        tenant_id: tenantId,
        atendimento_automatico: data.atendimentoAutomatico,
        saudacao_ativa: data.saudacaoAtiva,
        mensagem_boas_vindas: data.mensagemBoasVindas,
        mensagem_fora_do_horario: data.mensagemForaDoHorario,
        permite_confirmar: data.permiteConfirmar,
        permite_cancelar: data.permiteCancelar,
        permite_remarcar: data.permiteRemarcar,
        encaminhamento_humano: data.encaminhamentoHumano,
        lembretes: data.lembretes,
        tom: data.tom as TomDoAtendimento,
        recuperacao_ativa: data.recuperacaoAtiva,
        recuperacao_dias: data.recuperacaoDias,
        responder_whatsapp: data.responderWhatsapp,
        instrucoes_extras: data.instrucoesExtras,
        horario_proprio: data.horarioProprio,
        horario_dias: data.horarioDias,
        horario_inicio: `${data.horarioInicio}:00`,
        horario_fim: `${data.horarioFim}:00`,
        confirmacao_automatica: data.confirmacaoAutomatica,
        pagamento_antecipado: data.pagamentoAntecipado,
        link_pagamento: data.linkPagamento,
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export { CONFIGURACAO_PADRAO };

/* ------------------------------- Métricas -------------------------------- */

export type MetricasDoCortai = {
  conversas: number;
  conversasComHumano: number;
  agendamentosPelaIa: number;
  cancelamentosPelaIa: number;
  remarcacoesPelaIa: number;
  encaminhamentos: number;
  falhas: number;
  assuntos: { intencao: string; total: number }[];
};

/** Base da inteligência comercial: contagens reais do registro de ações. */
export const getMetricasDoCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MetricasDoCortai> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: logs }, conversas, humanas] = await Promise.all([
      db
        .from("acoes_de_ia_log")
        .select("acao, intencao, sucesso")
        .eq("tenant_id", tenantId)
        .gte("criado_em", desde)
        .limit(5000),
      db
        .from("conversas_whatsapp")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("criado_em", desde),
      db
        .from("conversas_whatsapp")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "humano"),
    ]);
    const linhas = logs ?? [];
    const contarAcao = (acao: string) => linhas.filter((l) => l.acao === acao && l.sucesso).length;
    const assuntos = new Map<string, number>();
    for (const l of linhas)
      if (l.intencao) assuntos.set(l.intencao, (assuntos.get(l.intencao) ?? 0) + 1);
    return {
      conversas: conversas.count ?? 0,
      conversasComHumano: humanas.count ?? 0,
      agendamentosPelaIa: contarAcao("criar_agendamento"),
      cancelamentosPelaIa: contarAcao("cancelar_agendamento"),
      remarcacoesPelaIa: contarAcao("remarcar_agendamento"),
      encaminhamentos: contarAcao("encaminhar_para_humano"),
      falhas: linhas.filter((l) => !l.sucesso).length,
      assuntos: [...assuntos.entries()]
        .map(([intencao, total]) => ({ intencao, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
    };
  });

/* ------------------------------ Atividade -------------------------------- */

export type RegistroDeAtividade = {
  id: string;
  conversaId: string | null;
  telefone: string | null;
  nomeDoCliente: string | null;
  acao: string;
  intencao: string | null;
  sucesso: boolean;
  erro: string | null;
  criadoEm: string;
};

export type AtividadeDoCortai = {
  ferramentas: { acao: string; total: number; falhas: number }[];
  registros: RegistroDeAtividade[];
};

/**
 * Tela de acompanhamento (somente leitura): o que a Flow IA entendeu, quais
 * ferramentas usou e o que falhou. Não altera nada do atendimento.
 */
export const getAtividadeDoCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { apenasFalhas?: boolean } | undefined) => input ?? {})
  .handler(async ({ context, data }): Promise<AtividadeDoCortai> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();

    let consulta = db
      .from("acoes_de_ia_log")
      .select("id, conversa_id, acao, intencao, sucesso, erro, criado_em")
      .eq("tenant_id", tenantId)
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(120);
    if (data.apenasFalhas) consulta = consulta.eq("sucesso", false);
    const { data: logs, error } = await consulta;
    if (error) throw new Error(error.message);
    const linhas = logs ?? [];

    const ids = [...new Set(linhas.map((l) => l.conversa_id).filter(Boolean))] as string[];
    const conversas = new Map<string, { telefone: string | null; nome: string | null }>();
    if (ids.length > 0) {
      const { data: convs } = await db
        .from("conversas_whatsapp")
        .select("id, telefone, nome_contato")
        .eq("tenant_id", tenantId)
        .in("id", ids);
      for (const c of convs ?? []) {
        conversas.set(c.id as string, {
          telefone: (c as any).telefone ?? null,
          nome: (c as any).nome_contato ?? null,
        });
      }
    }

    const uso = new Map<string, { total: number; falhas: number }>();
    for (const l of linhas) {
      const atual = uso.get(l.acao) ?? { total: 0, falhas: 0 };
      atual.total += 1;
      if (!l.sucesso) atual.falhas += 1;
      uso.set(l.acao, atual);
    }

    return {
      ferramentas: [...uso.entries()]
        .map(([acao, v]) => ({ acao, total: v.total, falhas: v.falhas }))
        .sort((a, b) => b.total - a.total),
      registros: linhas.map((l) => ({
        id: l.id as string,
        conversaId: (l.conversa_id as string) ?? null,
        telefone: conversas.get(l.conversa_id as string)?.telefone ?? null,
        nomeDoCliente: conversas.get(l.conversa_id as string)?.nome ?? null,
        acao: l.acao as string,
        intencao: (l.intencao as string) ?? null,
        sucesso: Boolean(l.sucesso),
        erro: (l.erro as string) ?? null,
        criadoEm: l.criado_em as string,
      })),
    };
  });

/* ------------------------- Aprendizado da Flow IA -------------------------- */

export type TermoNaoEntendido = { texto: string; total: number; ultimaVez: string };

/**
 * Frases que a Flow IA não entendeu, agrupadas. Serve para a barbearia ver o
 * que os clientes pedem com palavras diferentes das cadastradas.
 */
export const getTermosNaoEntendidos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TermoNaoEntendido[]> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await db
      .from("acoes_de_ia_log")
      .select("resultado, criado_em")
      .eq("tenant_id", tenantId)
      .eq("acao", "motor.termo_desconhecido")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(500);

    const mapa = new Map<string, { total: number; ultimaVez: string }>();
    for (const linha of data ?? []) {
      const texto = String((linha.resultado as { texto?: string } | null)?.texto ?? "").trim();
      if (!texto) continue;
      const atual = mapa.get(texto);
      mapa.set(texto, {
        total: (atual?.total ?? 0) + 1,
        ultimaVez: atual?.ultimaVez ?? (linha.criado_em as string),
      });
    }

    return [...mapa.entries()]
      .map(([texto, v]) => ({ texto, total: v.total, ultimaVez: v.ultimaVez }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  });

export type RemetenteOficial = {
  provedor: string;
  status: "conectado" | "erro" | "desconectado";
  numero: string | null;
  erro: string | null;
};

/** Estado REAL do número oficial: "Ativo" só quando a consulta à Meta responde. */
export const getRemetenteOficial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RemetenteOficial> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const { gatewayConfigurado, gatewayDeWhatsapp, provedorDoGateway } =
      await import("@/lib/whatsapp/gateway.server");
    if (!gatewayConfigurado())
      return { provedor: provedorDoGateway(), status: "desconectado", numero: null, erro: null };
    const estado = await gatewayDeWhatsapp.consultarStatus("").catch((e: unknown) => ({
      status: "erro" as const,
      numero: null,
      erro: e instanceof Error ? e.message : "Falha ao consultar o número.",
    }));
    return {
      provedor: provedorDoGateway(),
      status:
        estado.status === "conectado"
          ? "conectado"
          : estado.status === "erro"
            ? "erro"
            : "desconectado",
      numero: estado.numero ?? null,
      erro: estado.status === "erro" ? "Não foi possível confirmar o número agora." : null,
    };
  });

/** Liga/desliga "Notificações pelo WhatsApp" do negócio. Não mexe no rollout da Central. */
export const definirNotificacoesWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ativas: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const db = await admin();
    const { error } = await db
      .from("tenants")
      .update({ notificacoes_whatsapp_ativas: data.ativas })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    await db.from("auditoria_da_barbearia").insert({
      tenant_id: tenantId,
      ator_user_id: context.userId,
      acao: data.ativas ? "notificacoes_whatsapp.ativadas" : "notificacoes_whatsapp.desativadas",
      alvo: tenantId,
      detalhes: {},
    });
    return { ok: true as const };
  });
