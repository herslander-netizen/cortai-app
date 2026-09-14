/**
 * Funções do painel do CortAI (WhatsApp).
 *
 * Toda função resolve a barbearia pelo vínculo real do usuário e exige a
 * permissão correspondente no servidor — esconder botão na tela não basta.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
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

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Endereço público que o serviço de WhatsApp chama para avisar o Cortaí. */
export const URL_DE_EVENTOS = "https://cortai.dev/api/public/whatsapp/eventos";

export type PainelDoCortai = {
  /** Existe serviço de WhatsApp publicado e configurado neste ambiente? */
  gatewayConfigurado: boolean;
  /** A IA do CortAI está disponível? */
  iaDisponivel: boolean;
  conexao: ConexaoDeWhatsapp | null;
  configuracao: ConfiguracaoDoAtendimento;
  automacoes: { chave: ChaveDeAutomacao; ativa: boolean; mensagem: string }[];
  conversasAtivas: number;
  conversasComHumano: number;
};

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
    const { gatewayConfigurado } = await import("@/lib/whatsapp/gateway.server");
    const { iaConfigurada } = await import("@/lib/whatsapp/atendimento.server");
    const { configuracaoDoTenant } = await import("@/lib/whatsapp/fluxo.server");

    const [{ data: conexao }, configuracao, { data: automacoes }, ativas, humanas] = await Promise.all([
      db.from("conexoes_whatsapp").select("*").eq("tenant_id", tenantId).maybeSingle(),
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
    ]);

    const salvas = new Map((automacoes ?? []).map((a) => [a.chave, a]));
    return {
      gatewayConfigurado: gatewayConfigurado(),
      iaDisponivel: iaConfigurada(),
      conexao: conexaoDaLinha(conexao),
      configuracao,
      automacoes: (Object.keys(AUTOMACOES) as ChaveDeAutomacao[]).map((chave) => ({
        chave,
        ativa: salvas.get(chave)?.ativa ?? false,
        mensagem: salvas.get(chave)?.mensagem ?? "",
      })),
      conversasAtivas: ativas.count ?? 0,
      conversasComHumano: humanas.count ?? 0,
    };
  });

/* ------------------------------- Conexão --------------------------------- */

async function sessaoDoTenant(tenantId: string) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (data) return data;
  const { randomBytes } = await import("node:crypto");
  const sessaoId = `cortai_${tenantId.replace(/-/g, "").slice(0, 12)}_${randomBytes(6).toString("hex")}`;
  const { data: criada, error } = await db
    .from("conexoes_whatsapp")
    .insert({ tenant_id: tenantId, sessao_id: sessaoId, status: "desconectado" })
    .select("id, sessao_id")
    .single();
  if (error) throw new Error(error.message);
  return criada;
}

/** Pede a conexão ao serviço de WhatsApp e devolve o estado real da sessão. */
export const conectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: StatusDaConexao; aviso: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const { gatewayConfigurado, gatewayDeWhatsapp, provedorDoGateway } = await import(
      "@/lib/whatsapp/gateway.server"
    );
    if (!gatewayConfigurado()) {
      return {
        status: "desconectado",
        aviso:
          "O serviço de WhatsApp ainda não está configurado nesta instalação. Fale com o suporte do Cortaí para liberar.",
      };
    }
    const sessao = await sessaoDoTenant(tenantId);
    const db = await admin();
    try {
      const estado = await gatewayDeWhatsapp.criarSessao(sessao.sessao_id, URL_DE_EVENTOS);
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
      return { status: estado.status === "desconectado" ? "pendente" : estado.status, aviso: null };
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha ao conectar.";
      await db.from("conexoes_whatsapp").update({ status: "erro", ultimo_erro: mensagem }).eq("id", sessao.id);
      return { status: "erro", aviso: mensagem };
    }
  });

/** Busca o QR atual direto no serviço (usado pelo botão "Gerar novo QR Code"). */
export const atualizarQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ conexao: ConexaoDeWhatsapp | null; aviso: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const { gatewayConfigurado, gatewayDeWhatsapp } = await import("@/lib/whatsapp/gateway.server");
    if (!gatewayConfigurado()) return { conexao: null, aviso: "Serviço de WhatsApp não configurado." };
    const sessao = await sessaoDoTenant(tenantId);
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
      return { conexao: null, aviso: erro instanceof Error ? erro.message : "Não foi possível obter o QR Code." };
    }
  });

export const reconectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: StatusDaConexao; aviso: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const { gatewayConfigurado, gatewayDeWhatsapp } = await import("@/lib/whatsapp/gateway.server");
    if (!gatewayConfigurado()) return { status: "desconectado", aviso: "Serviço de WhatsApp não configurado." };
    const sessao = await sessaoDoTenant(tenantId);
    const db = await admin();
    try {
      const estado = await gatewayDeWhatsapp.reiniciarSessao(sessao.sessao_id);
      await db
        .from("conexoes_whatsapp")
        .update({ status: estado.status, qr_code: estado.qrCode ?? null, ultimo_erro: null })
        .eq("id", sessao.id);
      return { status: estado.status, aviso: null };
    } catch (erro) {
      return { status: "erro", aviso: erro instanceof Error ? erro.message : "Não foi possível reconectar." };
    }
  });

/** Desconecta a sessão. Não apaga clientes, histórico, agendamentos ou serviços. */
export const desconectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; aviso: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const db = await admin();
    const sessao = await sessaoDoTenant(tenantId);
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
      detalhes: {},
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
  .handler(async ({ context }): Promise<{ conexao: ConexaoDeWhatsapp | null; aviso: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const { gatewayConfigurado, gatewayDeWhatsapp } = await import("@/lib/whatsapp/gateway.server");
    if (!gatewayConfigurado()) return { conexao: null, aviso: "Serviço de WhatsApp não configurado." };
    const db = await admin();
    const { data: atual } = await db
      .from("conexoes_whatsapp")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    // Sem sessão criada ainda não há nada para consultar — evita chamada inútil.
    if (!atual) return { conexao: null, aviso: null };
    try {
      const estado = await gatewayDeWhatsapp.consultarStatus(atual.sessao_id);
      const conectou = estado.status === "conectado";
      const { data } = await db
        .from("conexoes_whatsapp")
        .update({
          status: estado.status,
          qr_code: conectou ? null : (estado.qrCode ?? atual.qr_code),
          qr_expira_em: conectou ? null : (estado.qrExpiraEm ?? atual.qr_expira_em),
          numero: estado.numero ?? atual.numero,
          nome_exibicao: estado.nomeExibicao ?? atual.nome_exibicao,
          conectado_em: conectou ? (atual.conectado_em ?? new Date().toISOString()) : atual.conectado_em,
          ultimo_erro: estado.erro ?? null,
        })
        .eq("id", atual.id)
        .select("*")
        .single();
      return { conexao: conexaoDaLinha(data), aviso: null };
    } catch (erro) {
      return {
        conexao: conexaoDaLinha(atual),
        aviso: erro instanceof Error ? erro.message : "Não foi possível consultar o serviço agora.",
      };
    }
  });

/* ------------------------------ Conversas -------------------------------- */

export const listarConversas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ filtro: z.enum(["todas", "cortai", "humano", "nao_lidas"]).default("todas") }).parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<ConversaDeWhatsapp[]> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    let consulta = db
      .from("conversas_whatsapp")
      .select("id, telefone, nome_contato, cliente_id, status, ia_ativa, modo_humano, nao_lidas, ultima_mensagem_em")
      .eq("tenant_id", tenantId);
    if (data.filtro === "cortai") consulta = consulta.eq("status", "ativa").eq("ia_ativa", true);
    if (data.filtro === "humano") consulta = consulta.eq("status", "humano");
    if (data.filtro === "nao_lidas") consulta = consulta.gt("nao_lidas", 0);
    const { data: linhas, error } = await consulta.order("ultima_mensagem_em", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (linhas ?? []).map((l) => ({
      id: l.id,
      telefone: l.telefone,
      nomeContato: l.nome_contato,
      clienteId: l.cliente_id,
      status: l.status as ConversaDeWhatsapp["status"],
      iaAtiva: l.ia_ativa,
      modoHumano: l.modo_humano,
      naoLidas: l.nao_lidas,
      ultimaMensagemEm: l.ultima_mensagem_em,
    }));
  });

export const lerConversa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversaId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { data: conversa } = await db
      .from("conversas_whatsapp")
      .select("id, telefone, nome_contato, cliente_id, status, ia_ativa, modo_humano, nao_lidas, ultima_mensagem_em")
      .eq("tenant_id", tenantId)
      .eq("id", data.conversaId)
      .maybeSingle();
    if (!conversa) throw new Error("Conversa não encontrada nesta barbearia.");

    const [{ data: mensagens }, cliente, agendamentos] = await Promise.all([
      db
        .from("mensagens_whatsapp")
        .select("id, direcao, tipo, conteudo, gerada_por_ia, gerada_por_humano, status, criado_em")
        .eq("conversa_id", conversa.id)
        .order("criado_em")
        .limit(200),
      conversa.cliente_id
        ? db.from("clientes").select("id, nome, telefone").eq("id", conversa.cliente_id).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
      conversa.cliente_id
        ? db
            .from("agendamentos")
            .select("id, inicio, status")
            .eq("tenant_id", tenantId)
            .eq("cliente_id", conversa.cliente_id)
            .order("inicio", { ascending: false })
            .limit(10)
            .then((r) => r.data ?? [])
        : Promise.resolve([]),
    ]);

    await db.from("conversas_whatsapp").update({ nao_lidas: 0 }).eq("id", conversa.id);

    return {
      conversa: {
        id: conversa.id,
        telefone: conversa.telefone,
        nomeContato: conversa.nome_contato,
        clienteId: conversa.cliente_id,
        status: conversa.status as ConversaDeWhatsapp["status"],
        iaAtiva: conversa.ia_ativa,
        modoHumano: conversa.modo_humano,
        naoLidas: 0,
        ultimaMensagemEm: conversa.ultima_mensagem_em,
      } satisfies ConversaDeWhatsapp,
      cliente,
      agendamentos,
      mensagens: (mensagens ?? []).map((m) => ({
        id: m.id,
        direcao: m.direcao as MensagemDeWhatsapp["direcao"],
        tipo: m.tipo,
        conteudo: m.conteudo,
        geradaPorIa: m.gerada_por_ia,
        geradaPorHumano: m.gerada_por_humano,
        criadoEm: m.criado_em,
        status: m.status,
      })) satisfies MensagemDeWhatsapp[],
    };
  });

/** Assume a conversa (humano) ou devolve o atendimento ao CortAI. */
export const definirAtendimentoDaConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversaId: z.string().uuid(), modo: z.enum(["humano", "cortai", "encerrar"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, data.modo === "humano" ? "assumir_conversa" : "gerenciar_conversas");
    const db = await admin();
    const alvo =
      data.modo === "humano"
        ? { status: "humano", modo_humano: true, ia_ativa: false }
        : data.modo === "cortai"
          ? { status: "ativa", modo_humano: false, ia_ativa: true }
          : { status: "encerrada", modo_humano: false, ia_ativa: false };
    const { error } = await db
      .from("conversas_whatsapp")
      .update(alvo)
      .eq("tenant_id", tenantId)
      .eq("id", data.conversaId);
    if (error) throw new Error(error.message);
    await db.from("auditoria_da_barbearia").insert({
      tenant_id: tenantId,
      ator_user_id: context.userId,
      acao: `cortai.conversa_${data.modo}`,
      alvo: data.conversaId,
      detalhes: {},
    });
    return { ok: true as const };
  });

/** Mensagem escrita por uma pessoa da equipe dentro de uma conversa. */
export const responderComoHumano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversaId: z.string().uuid(), texto: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "assumir_conversa");
    const db = await admin();
    const { data: conversa } = await db
      .from("conversas_whatsapp")
      .select("id, telefone, conexao_id")
      .eq("tenant_id", tenantId)
      .eq("id", data.conversaId)
      .maybeSingle();
    if (!conversa) throw new Error("Conversa não encontrada nesta barbearia.");
    const { data: conexao } = await db
      .from("conexoes_whatsapp")
      .select("id, sessao_id, status")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!conexao || conexao.status !== "conectado") {
      throw new Error("O WhatsApp da barbearia não está conectado agora.");
    }
    const { enviarPelaBarbearia } = await import("@/lib/whatsapp/fluxo.server");
    await enviarPelaBarbearia({
      tenantId,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone: conversa.telefone,
      texto: data.texto,
      porIa: false,
      autorUserId: context.userId,
    });
    return { ok: true as const };
  });

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
});

export const salvarConfiguracaoDoCortai = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "configurar_automacoes");
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
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const salvarAutomacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chave: z.enum(Object.keys(AUTOMACOES) as [ChaveDeAutomacao, ...ChaveDeAutomacao[]]),
        ativa: z.boolean(),
        mensagem: z.string().trim().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "configurar_automacoes");
    const db = await admin();
    const { error } = await db
      .from("automacoes_de_ia")
      .upsert(
        { tenant_id: tenantId, chave: data.chave, ativa: data.ativa, mensagem: data.mensagem },
        { onConflict: "tenant_id,chave" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export { CONFIGURACAO_PADRAO };

/* --------------------- Informações oficiais da barbearia ------------------ */

export const listarInformacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InformacaoDaBarbearia[]> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { data, error } = await db
      .from("informacoes_da_barbearia")
      .select("id, pergunta, resposta, ativo, ordem")
      .eq("tenant_id", tenantId)
      .order("ordem");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const salvarInformacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        pergunta: z.string().trim().min(3).max(120),
        resposta: z.string().trim().min(2).max(1000),
        ativo: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "configurar_automacoes");
    const db = await admin();
    if (data.id) {
      const { error } = await db
        .from("informacoes_da_barbearia")
        .update({ pergunta: data.pergunta, resposta: data.resposta, ativo: data.ativo })
        .eq("tenant_id", tenantId)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const { count } = await db
      .from("informacoes_da_barbearia")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    const { error } = await db.from("informacoes_da_barbearia").insert({
      tenant_id: tenantId,
      pergunta: data.pergunta,
      resposta: data.resposta,
      ativo: data.ativo,
      ordem: count ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removerInformacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "configurar_automacoes");
    const db = await admin();
    const { error } = await db
      .from("informacoes_da_barbearia")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

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
    for (const l of linhas) if (l.intencao) assuntos.set(l.intencao, (assuntos.get(l.intencao) ?? 0) + 1);
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
  metricas: MetricasDoCortai;
  ferramentas: { acao: string; total: number; falhas: number }[];
  registros: RegistroDeAtividade[];
};

/**
 * Tela de acompanhamento (somente leitura): o que o CortAI entendeu, quais
 * ferramentas usou e o que falhou. Não altera nada do atendimento.
 */
export const getAtividadeDoCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { apenasFalhas?: boolean } | undefined) => input ?? {})
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
        .select("id, telefone, nome_do_contato")
        .eq("tenant_id", tenantId)
        .in("id", ids);
      for (const c of convs ?? []) {
        conversas.set(c.id as string, {
          telefone: (c as any).telefone ?? null,
          nome: (c as any).nome_do_contato ?? null,
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

    const metricas = await (getMetricasDoCortai as unknown as () => Promise<MetricasDoCortai>)();

    return {
      metricas,
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
