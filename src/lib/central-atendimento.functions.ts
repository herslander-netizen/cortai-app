/**
 * Central de Atendimento: consultas e comandos sobre AS MESMAS tabelas do WhatsApp.
 * Sem inbox paralela, sem acesso direto do cliente ao service_role.
 * Toda leitura/escrita exige vínculo ativo + permissão do tenant no servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";
import { estadoDaConversa, type EstadoDaConversa } from "@/lib/whatsapp/estado-da-conversa";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ResumoDaConversa = {
  id: string;
  nome: string;
  telefoneFinal: string;
  estado: EstadoDaConversa;
  naoLidas: number;
  ultimaMensagemEm: string | null;
  previa: string;
  /** Fonte confirmada pelo registro da mensagem, nunca inferida do conteúdo. */
  ultimaOrigem: "cliente" | "equipe" | "flow_ia" | "automacao" | null;
  iaAtiva: boolean;
  atualizadoEm: string;
};

export type ListaDaCentral = {
  conversas: ResumoDaConversa[];
  podeGerenciar: boolean;
  geradoEm: string;
};

export const listarConversasDaCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ListaDaCentral> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { data: conversas, error } = await db
      .from("conversas_whatsapp")
      .select("id, telefone, nome_contato, status, ia_ativa, modo_humano, modo_humano_ate, nao_lidas, ultima_mensagem_em, atualizado_em")
      .eq("tenant_id", tenantId)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(40);
    if (error) throw new Error("Não foi possível consultar as conversas deste negócio.");

    const ids = (conversas ?? []).map((c) => c.id);
    const mensagens = ids.length
      ? await db.from("mensagens_whatsapp")
          .select("conversa_id, direcao, tipo, conteudo, gerada_por_ia, gerada_por_humano, criado_em")
          .eq("tenant_id", tenantId)
          .in("conversa_id", ids)
          .order("criado_em", { ascending: false })
          .limit(300)
      : { data: [], error: null };
    if (mensagens.error) throw new Error("Não foi possível consultar as últimas mensagens.");

    const recentes = new Map<string, {
      direcao: "entrada" | "saida";
      conteudo: string;
      tipo: string;
      gerada_por_ia: boolean;
      gerada_por_humano: boolean;
    }>();
    const comSaida = new Set<string>();
    for (const m of mensagens.data ?? []) {
      if (m.direcao === "saida") comSaida.add(m.conversa_id);
      if (!recentes.has(m.conversa_id) && (m.direcao === "entrada" || m.direcao === "saida")) {
        recentes.set(m.conversa_id, {
          direcao: m.direcao,
          conteudo: m.conteudo,
          tipo: m.tipo,
          gerada_por_ia: m.gerada_por_ia,
          gerada_por_humano: m.gerada_por_humano,
        });
      }
    }

    const { data: pode, error: erroPermissao } = await context.supabase.rpc("has_tenant_permission", {
      _tenant_id: tenantId, _permission: "gerenciar_whatsapp",
    });
    const agora = Date.now();
    return {
      geradoEm: new Date(agora).toISOString(),
      podeGerenciar: !erroPermissao && pode === true,
      conversas: (conversas ?? []).map((c) => {
        const m = recentes.get(c.id);
        const nome = c.nome_contato?.trim() || `Contato · final ${c.telefone.slice(-4)}`;
        return {
          id: c.id,
          nome,
          telefoneFinal: c.telefone.slice(-4),
          estado: estadoDaConversa({
            status: c.status,
            iaAtiva: c.ia_ativa,
            modoHumano: c.modo_humano,
            modoHumanoAte: c.modo_humano_ate,
            ultimaDirecao: m?.direcao ?? null,
            possuiSaidaRegistrada: comSaida.has(c.id),
            naoLidas: c.nao_lidas ?? 0,
          }, agora),
          naoLidas: c.nao_lidas ?? 0,
          ultimaMensagemEm: c.ultima_mensagem_em,
          previa: m?.conteudo?.trim().slice(0, 110) || (m ? `[${m.tipo}]` : "Sem mensagens recentes"),
          ultimaOrigem: !m ? null : m.direcao === "entrada" ? "cliente" :
            m.gerada_por_humano ? "equipe" : m.gerada_por_ia ? "flow_ia" : "automacao",
          iaAtiva: c.ia_ativa,
          atualizadoEm: c.atualizado_em,
        };
      }),
    };
  });

const conversaSchema = z.object({ conversaId: z.string().uuid() });
export type MensagemDaCentral = {
  id: string;
  direcao: "entrada" | "saida";
  tipo: string;
  conteudo: string;
  origem: "cliente" | "equipe" | "flow_ia" | "automacao";
  status: string;
  criadoEm: string;
};
export type HistoricoDoClienteDaCentral = {
  id: string;
  inicio: string;
  status: string;
  servico: string;
};
export type DetalheDaConversa = {
  mensagens: MensagemDaCentral[];
  agendamentos: HistoricoDoClienteDaCentral[];
};

export const detalharConversaDaCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => conversaSchema.parse(input))
  .handler(async ({ context, data }): Promise<DetalheDaConversa> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const { data: conversa, error: erroConversa } = await db
      .from("conversas_whatsapp")
      .select("id, cliente_id")
      .eq("id", data.conversaId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (erroConversa || !conversa) throw new Error("Conversa não encontrada neste estabelecimento.");

    const [linhas, horarios] = await Promise.all([
      db.from("mensagens_whatsapp")
        .select("id, direcao, tipo, conteudo, status, gerada_por_ia, gerada_por_humano, criado_em")
        .eq("tenant_id", tenantId)
        .eq("conversa_id", conversa.id)
        .order("criado_em", { ascending: false }).limit(50),
      conversa.cliente_id
        ? db.from("agendamentos")
            .select("id, inicio, status, servico_id")
            .eq("tenant_id", tenantId)
            .eq("cliente_id", conversa.cliente_id)
            .order("inicio", { ascending: false }).limit(8)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (linhas.error || horarios.error) throw new Error("Falha ao carregar o histórico da conversa.");

    const idsServicos = [...new Set((horarios.data ?? []).map(h => h.servico_id).filter((s): s is string => !!s))];
    const servicos = idsServicos.length
      ? await db.from("servicos").select("id, nome").eq("tenant_id", tenantId).in("id", idsServicos)
      : { data: [], error: null };
    if (servicos.error) throw new Error("Falha ao consultar os serviços do cliente.");
    const nomeServico = new Map((servicos.data ?? []).map(s => [s.id, s.nome]));

    return {
      mensagens: (linhas.data ?? []).reverse().map(m => ({
        id: m.id,
        direcao: m.direcao === "saida" ? "saida" as const : "entrada" as const,
        tipo: m.tipo,
        conteudo: m.conteudo,
        origem: m.direcao === "entrada" ? "cliente" as const :
          m.gerada_por_humano ? "equipe" as const :
          m.gerada_por_ia ? "flow_ia" as const : "automacao" as const,
        status: m.status,
        criadoEm: m.criado_em,
      })),
      agendamentos: (horarios.data ?? []).map(a => ({
        id: a.id, inicio: a.inicio, status: a.status,
        servico: (a.servico_id && nomeServico.get(a.servico_id)) || "Serviço",
      })),
    };
  });

const comandoSchema = conversaSchema.extend({
  acao: z.enum(["assumir", "retomar", "resolver"]),
  /** Controle otimista: não reverter decisão de outra pessoa sem recarregar. */
  atualizadoEm: z.string().datetime({ offset: true }),
});

export type ResultadoDoComando = { ok: true } | { ok: false; motivo: "conflito" };

export const comandarConversaDaCentral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => comandoSchema.parse(input))
  .handler(async ({ context, data }): Promise<ResultadoDoComando> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    await exigirRecurso(context.supabase, tenantId, "secretaria_whatsapp");
    const db = await admin();
    const { aplicarComandoDaCentral } = await import("@/lib/whatsapp/comandos-central");
    const resultado = await aplicarComandoDaCentral(db as never, {
      tenantId,
      conversaId: data.conversaId,
      atualizadoEm: data.atualizadoEm,
      acao: data.acao,
    });
    if (!resultado.ok) return resultado;

    // Auditoria sem texto e sem telefone. Falha de auditoria é visível no servidor,
    // mas não repete uma transição já confirmada.
    try {
      const { error: erroAuditoria } = await db.from("auditoria_da_barbearia").insert({
        tenant_id: tenantId,
        ator_user_id: context.userId,
        acao: `whatsapp.conversa_${data.acao}`,
        alvo: data.conversaId,
        detalhes: { origem: "central_atendimento" },
      });
      if (erroAuditoria) {
        console.error("[central-atendimento] falha ao registrar auditoria", erroAuditoria.code);
      }
    } catch {
      // O comando já foi gravado. Nunca informar "nada foi mudado" por erro
      // posterior da auditoria (tampouco repetir a transição automaticamente).
      console.error("[central-atendimento] auditoria indisponível após comando confirmado");
    }
    return { ok: true };
  });
