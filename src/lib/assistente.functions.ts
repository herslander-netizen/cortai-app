import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro, vinculoDoMembro } from "@/lib/tenant";
import {
  mensagemComEscolha,
  validarClienteEscolhido,
  type ClienteEscolhido,
} from "@/lib/brain/escolha-de-cliente";
import type { RespostaDoAssistente } from "@/lib/ia/assistente";
import type { EstadoDaCortai } from "@/lib/brain/estado-cortai";

/**
 * Interruptor geral, pausa e cotas da Flow IA no painel. O cérebro confere de novo por
 * dentro; aqui serve ao assistente de cadastro (mesma Flow IA, outro caminho) e aos selos.
 */
async function estadoNoPainel(tenantId: string, userId: string): Promise<EstadoDaCortai> {
  const { iaDisponivel } = await import("@/lib/brain/gateway.server");
  if (!iaDisponivel("painel")) return "sem_configuracao";
  const { bloqueioDeUso } = await import("@/lib/brain/uso.server");
  return (await bloqueioDeUso(tenantId, "painel", userId)) ?? "ativa";
}

async function respostaBloqueada(estado: EstadoDaCortai): Promise<RespostaDoAssistente | null> {
  if (estado === "ativa") return null;
  const { respostaIndisponivel } = await import("@/lib/ia/assistente");
  const { textoDoBloqueio } = await import("@/lib/brain/estado-cortai");
  return respostaIndisponivel(textoDoBloqueio(estado));
}

/** Estado da Flow IA para o selo do cabeçalho e do chat. */
export const getEstadoDaCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ estado: EstadoDaCortai }> => {
    const tenantId = await tenantIdDoMembro(context);
    return { estado: await estadoNoPainel(tenantId, context.userId) };
  });

/** Monta o contexto real do negócio — a IA só enxerga o que existe de verdade. */
async function contextoDaBarbearia(context: { supabase: any }, tenantId: string) {
  const db = context.supabase;
  const [tenantRes, servicosRes, horariosRes, filaRes] = await Promise.all([
    db.from("tenants").select("nome, slug, whatsapp, segmento").eq("id", tenantId).maybeSingle(),
    db
      .from("servicos")
      .select("nome, duracao_min, preco_centavos")
      .eq("tenant_id", tenantId)
      .eq("ativo", true),
    db.from("horarios_de_funcionamento").select("*").eq("tenant_id", tenantId).order("dia_semana"),
    db
      .from("fila_de_espera")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["aguardando", "avisado"]),
  ]);
  return {
    nome: (tenantRes.data?.nome as string) ?? "Negócio",
    segmento: (tenantRes.data?.segmento as string) ?? "não definido",
    slug: (tenantRes.data?.slug as string) ?? "",
    whatsapp: (tenantRes.data?.whatsapp as string) ?? null,
    servicos: (servicosRes.data ?? []).map((s: Record<string, any>) => ({
      nome: s["nome"] as string,
      duracaoMin: s["duracao_min"] as number,
      precoCentavos: s["preco_centavos"] as number,
    })),
    horarios: (horariosRes.data ?? []).map((h: Record<string, any>) => ({
      diaSemana: h["dia_semana"] as number,
      fechado: Boolean(h["fechado"]),
      abre: String(h["abre"]).slice(0, 5),
      fecha: String(h["fecha"]).slice(0, 5),
    })),
    naFila: filaRes.count ?? 0,
  };
}

export type TurnoDaConversa = {
  id: string;
  autor: "barbeiro" | "assistente";
  conteudo: string;
  acao: RespostaDoAssistente | null;
};

export const getConversaDoAssistente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      conversaId: string | null;
      mensagens: TurnoDaConversa[];
      disponivel: boolean;
    }> => {
      const tenantId = await tenantIdDoMembro(context);
      const db = context.supabase;
      const { data: conversa } = await db
        .from("conversas_de_ia")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("usuario_id", context.userId)
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { assistenteConfigurado } = await import("@/lib/ia/assistente.server");
      if (!conversa)
        return { conversaId: null, mensagens: [], disponivel: assistenteConfigurado() };

      const { data: mensagens } = await db
        .from("mensagens_de_ia")
        .select("id, autor, conteudo, acao")
        .eq("conversa_id", conversa.id)
        .order("criado_em")
        .limit(60);

      return {
        conversaId: conversa.id as string,
        mensagens: (mensagens ?? []).map((m: Record<string, any>) => ({
          id: m["id"] as string,
          autor: m["autor"] as "barbeiro" | "assistente",
          conteudo: m["conteudo"] as string,
          acao: (m["acao"] as RespostaDoAssistente | null) ?? null,
        })),
        disponivel: assistenteConfigurado(),
      };
    },
  );

export const perguntarAoCortai = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        mensagem: z.string().trim().min(1).max(1500),
        conversaId: z.string().uuid().nullable().default(null),
        /** Gerado pelo navegador por envio e reaproveitado em nova tentativa (idempotência). */
        idDaMensagem: z.string().uuid().optional(),
        origem: z.enum(["texto", "voz"]).default("texto"),
        /** Cliente tocado no pop-up de homônimos (conferido no servidor). */
        clienteEscolhidoId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      conversaId: string;
      resposta: RespostaDoAssistente;
      estado: EstadoDaCortai;
    }> => {
      const { tenantId, papel: papelNaEquipe } = await vinculoDoMembro(context);
      const db = context.supabase;

      // Cliente tocado no pop-up: precisa ser deste negócio e a pessoa precisa poder ver clientes.
      let clienteEscolhido: ClienteEscolhido | null = null;
      if (data.clienteEscolhidoId) {
        await exigirPermissao(context, tenantId, "visualizar_clientes");
        clienteEscolhido = await validarClienteEscolhido(db, tenantId, data.clienteEscolhidoId);
        if (!clienteEscolhido) throw new Error("Esse cliente não está disponível neste negócio.");
      }

      let conversaId = data.conversaId;
      if (conversaId) {
        const { data: dona } = await db
          .from("conversas_de_ia")
          .select("id")
          .eq("id", conversaId)
          .eq("tenant_id", tenantId)
          .eq("usuario_id", context.userId)
          .maybeSingle();
        if (!dona) conversaId = null;
      }
      if (!conversaId) {
        const { data: nova, error } = await db
          .from("conversas_de_ia")
          .insert({
            tenant_id: tenantId,
            usuario_id: context.userId,
            titulo: data.mensagem.slice(0, 60),
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        conversaId = nova.id as string;
      }

      const { data: anteriores } = await db
        .from("mensagens_de_ia")
        .select("id, autor, conteudo, acao")
        .eq("conversa_id", conversaId)
        .order("criado_em", { ascending: false })
        .limit(16);

      // Reenvio/timeout com o mesmo id: devolve a resposta já dada ou avisa que está em andamento.
      let usuarioMsgId: string | null = null;
      let usuarioJaGravado = false;
      if (data.idDaMensagem) {
        const { reivindicarPedido } = await import("@/lib/brain/idempotencia-de-pedido");
        const pedido = await reivindicarPedido(db as never, {
          tenantId,
          conversaId,
          idDaMensagem: data.idDaMensagem,
          origem: data.origem,
          mensagem: data.mensagem,
        }).catch((erro: unknown) => {
          // Sem a checagem, segue como antes: a idempotência do agendamento continua valendo.
          console.error("[cortai] idempotência do pedido indisponível:", (erro as Error).message);
          return null;
        });
        if (pedido?.tipo === "repetido")
          return {
            conversaId,
            resposta: pedido.resposta as unknown as RespostaDoAssistente,
            estado: "ativa",
          };
        if (pedido?.tipo === "em_andamento")
          return {
            conversaId,
            resposta: {
              resposta: "Ainda estou processando esse pedido. Aguarde um instante.",
              intencao: "conversa",
              precisaConfirmar: false,
              perguntaDeConfirmacao: null,
              destino: null,
              rotuloDoDestino: null,
              servicos: null,
              horarios: null,
              disponivel: true,
            },
            estado: "ativa",
          };
        if (pedido?.tipo === "novo") {
          usuarioJaGravado = true;
          usuarioMsgId = pedido.usuarioMsgId;
        }
      }
      if (!usuarioJaGravado)
        await db.from("mensagens_de_ia").insert({
          conversa_id: conversaId,
          tenant_id: tenantId,
          autor: "barbeiro",
          conteudo: data.mensagem,
        });

      try {
        const historicoBruto = ((anteriores ?? []) as Record<string, any>[]).reverse();
        const contexto = await contextoDaBarbearia(context, tenantId);
        let resposta: RespostaDoAssistente;
        let pendenteNova: unknown = null;
        let estado: EstadoDaCortai = "ativa";

        // Todo pedido conversacional passa pelo cérebro oficial: o catálogo decide
        // se é conversa, consulta ou escrita pendente, sem roteador por palavras.
        {
          const { pensarCortai } = await import("@/lib/brain/agente.server");
          const { iaDisponivel } = await import("@/lib/brain/gateway.server");
          const { respostaIndisponivel } = await import("@/lib/ia/assistente");
          const ultima = [...historicoBruto].reverse().find((m) => m["autor"] === "assistente");
          const pendente = (ultima?.["acao"] as { pendente?: unknown } | null)?.pendente ?? null;
          if (!iaDisponivel("painel")) {
            resposta = respostaIndisponivel();
            estado = "sem_configuracao";
          } else {
            // A Flow IA age com a chave de serviço: papel e permissões da pessoa entram no
            // contexto, para ela nunca poder mais do que a própria pessoa pode nas telas.
            const { acessoDoPainel } = await import("@/lib/brain/acesso-painel.server");
            const acesso = await acessoDoPainel(context, tenantId, papelNaEquipe);
            const r = await pensarCortai({
              ctx: {
                tenantId,
                canal: "painel",
                ator: context.userId,
                papel: acesso.papel,
                profissionalId: acesso.profissionalId,
                permissoes: acesso.permissoes,
              },
              persona: { nome: "a Flow IA", negocio: contexto.nome, segmento: contexto.segmento },
              historico: historicoBruto.map((m) => ({
                autor: m["autor"] === "barbeiro" ? "usuario" : "assistente",
                texto: String(m["conteudo"] ?? ""),
              })),
              mensagem: clienteEscolhido
                ? mensagemComEscolha(data.mensagem, clienteEscolhido.id)
                : data.mensagem,
              pendente: pendente as never,
              conversaId,
              origemDoComando: data.origem,
              ...(clienteEscolhido ? { clienteEscolhidoId: clienteEscolhido.id } : {}),
              // Dois "sim" simultâneos leem a mesma pendente: só quem a zera primeiro executa.
              consumirPendente: async (pendenteId) => {
                const idDaMensagem = ultima?.["id"] as string | undefined;
                if (!idDaMensagem) return true;
                const { data: zerada, error } = await db
                  .from("mensagens_de_ia")
                  .update({ acao: { ...(ultima?.["acao"] as object), pendente: null } as never })
                  .eq("id", idDaMensagem)
                  .eq("tenant_id", tenantId)
                  .eq("acao->pendente->>id", pendenteId)
                  .select("id");
                if (error) {
                  console.error(
                    "[cerebro] não consegui reivindicar a ação pendente:",
                    error.message,
                  );
                  return true;
                }
                return (zerada?.length ?? 0) === 1;
              },
            });
            pendenteNova = r.pendente;
            if (r.bloqueio) estado = r.bloqueio;
            resposta = {
              resposta: r.texto,
              intencao: r.acoes.length ? "consultar" : "conversa",
              precisaConfirmar: false,
              perguntaDeConfirmacao: null,
              destino: null,
              rotuloDoDestino: null,
              servicos: null,
              horarios: null,
              disponivel: !r.indisponivel,
              opcoes: r.opcoes ?? null,
              aguardandoConfirmacao: r.pendente ? { resumo: r.pendente.resumo } : null,
              conferencia: r.conferencia ?? null,
            };
          }
        }

        await db.from("mensagens_de_ia").insert({
          conversa_id: conversaId,
          tenant_id: tenantId,
          autor: "assistente",
          conteudo: resposta.resposta,
          acao: {
            ...resposta,
            pendente: pendenteNova,
            ...(data.idDaMensagem ? { idDaMensagem: data.idDaMensagem, origem: data.origem } : {}),
          } as never,
        });
        await db
          .from("conversas_de_ia")
          .update({ atualizado_em: new Date().toISOString() })
          .eq("id", conversaId);

        return { conversaId, resposta, estado };
      } catch (erro) {
        // Libera a nova tentativa (mesmo id) sem esperar a janela de "em andamento".
        if (data.idDaMensagem && usuarioMsgId) {
          const { marcarPedidoComoFalho } = await import("@/lib/brain/idempotencia-de-pedido");
          await marcarPedidoComoFalho(db as never, {
            tenantId,
            usuarioMsgId,
            idDaMensagem: data.idDaMensagem,
            origem: data.origem,
          }).catch(() => undefined);
        }
        throw erro;
      }
    },
  );

/** Interpreta texto livre e devolve uma PRÉVIA de serviços — nada é gravado aqui. */
export const interpretarServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ texto: z.string().trim().min(3).max(1200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<RespostaDoAssistente> => {
    const tenantId = await tenantIdDoMembro(context);
    const bloqueada = await respostaBloqueada(await estadoNoPainel(tenantId, context.userId));
    if (bloqueada) return bloqueada;
    const { extrairCadastroEstruturado } = await import("@/lib/ia/assistente.server");
    return extrairCadastroEstruturado({
      mensagem: data.texto,
      contexto: await contextoDaBarbearia(context, tenantId),
      instrucaoExtra:
        "A pessoa está no cadastro de serviços. Extraia a lista de serviços do texto, com nome, categoria, duração em minutos e preço em centavos. Use intencao = cadastrar_servicos, precisa_confirmar = true e não invente serviços nem preencha dados essenciais ausentes; se faltar preço ou duração, peça o dado.",
    });
  });

/** Interpreta texto livre e devolve uma PRÉVIA de horários — nada é gravado aqui. */
export const interpretarHorarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ texto: z.string().trim().min(3).max(1200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<RespostaDoAssistente> => {
    const tenantId = await tenantIdDoMembro(context);
    const bloqueada = await respostaBloqueada(await estadoNoPainel(tenantId, context.userId));
    if (bloqueada) return bloqueada;
    const { extrairCadastroEstruturado } = await import("@/lib/ia/assistente.server");
    return extrairCadastroEstruturado({
      mensagem: data.texto,
      contexto: await contextoDaBarbearia(context, tenantId),
      instrucaoExtra:
        "A pessoa está definindo os horários de funcionamento. Devolva os SETE dias (0 a 6) no campo horarios, marcando fechado quando for o caso. Use intencao = definir_horarios e precisa_confirmar = true.",
    });
  });

/**
 * Executa uma ação confirmada pela pessoa. O servidor reescreve a ação a partir
 * dos parâmetros validados — nada vem do texto do modelo direto para o banco.
 */
export const confirmarAcaoDaIa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        tipo: z.enum(["cadastrar_servicos", "definir_horarios"]),
        servicos: z
          .array(
            z.object({
              nome: z.string().trim().min(2).max(60),
              duracaoMin: z.number().int().min(5).max(480),
              precoCentavos: z.number().int().min(0).max(10_000_000),
            }),
          )
          .max(40)
          .optional(),
        horarios: z
          .array(
            z.object({
              diaSemana: z.number().int().min(0).max(6),
              fechado: z.boolean(),
              abre: z.string().regex(/^\d{2}:\d{2}$/),
              fecha: z.string().regex(/^\d{2}:\d{2}$/),
            }),
          )
          .max(7)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = context.supabase;

    if (data.tipo === "cadastrar_servicos") {
      const servicos = data.servicos ?? [];
      if (!servicos.length) throw new Error("Nenhum serviço para cadastrar.");
      const { error } = await db.from("servicos").insert(
        servicos.map((s, i) => ({
          tenant_id: tenantId,
          nome: s.nome,
          duracao_min: s.duracaoMin,
          preco_centavos: s.precoCentavos,
          ordem: i,
        })),
      );
      if (error) throw new Error(error.message);
      await context.supabase.rpc("registrar_auditoria_barbearia", {
        _tenant_id: tenantId,
        _acao: "assistente.servicos_cadastrados",
        _alvo: String(servicos.length),
        _detalhes: {},
      });
      return { ok: true, total: servicos.length };
    }

    const horarios = data.horarios ?? [];
    if (!horarios.length) throw new Error("Nenhum horário para salvar.");
    const { error } = await db.from("horarios_de_funcionamento").upsert(
      horarios.map((h) => ({
        tenant_id: tenantId,
        dia_semana: h.diaSemana,
        fechado: h.fechado,
        abre: `${h.abre}:00`,
        fecha: `${h.fecha}:00`,
      })),
      { onConflict: "tenant_id,dia_semana" },
    );
    if (error) throw new Error(error.message);
    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "assistente.horarios_salvos",
      _alvo: String(horarios.length),
      _detalhes: {},
    });
    return { ok: true, total: horarios.length };
  });
