import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import type { RespostaDoAssistente } from "@/lib/ia/assistente";

/** Monta o contexto real da barbearia — a IA só enxerga o que existe de verdade. */
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
  .inputValidator((input: unknown) =>
    z
      .object({
        mensagem: z.string().trim().min(1).max(1500),
        conversaId: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(
    async ({ data, context }): Promise<{ conversaId: string; resposta: RespostaDoAssistente }> => {
      const tenantId = await tenantIdDoMembro(context);
      const db = context.supabase;

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
        .select("autor, conteudo")
        .eq("conversa_id", conversaId)
        .order("criado_em", { ascending: false })
        .limit(10);

      await db.from("mensagens_de_ia").insert({
        conversa_id: conversaId,
        tenant_id: tenantId,
        autor: "barbeiro",
        conteudo: data.mensagem,
      });

      const { pensar } = await import("@/lib/ia/assistente.server");
      const resposta = await pensar({
        mensagem: data.mensagem,
        contexto: await contextoDaBarbearia(context, tenantId),
        historico: ((anteriores ?? []) as Record<string, any>[])
          .reverse()
          .map((m) => ({
            autor: m["autor"] as "barbeiro" | "assistente",
            conteudo: m["conteudo"] as string,
          })),
      });

      await db.from("mensagens_de_ia").insert({
        conversa_id: conversaId,
        tenant_id: tenantId,
        autor: "assistente",
        conteudo: resposta.resposta,
        acao: resposta as never,
      });
      await db
        .from("conversas_de_ia")
        .update({ atualizado_em: new Date().toISOString() })
        .eq("id", conversaId);

      return { conversaId, resposta };
    },
  );

/** Interpreta texto livre e devolve uma PRÉVIA de serviços — nada é gravado aqui. */
export const interpretarServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ texto: z.string().trim().min(3).max(1200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<RespostaDoAssistente> => {
    const tenantId = await tenantIdDoMembro(context);
    const { pensar } = await import("@/lib/ia/assistente.server");
    return pensar({
      mensagem: data.texto,
      contexto: await contextoDaBarbearia(context, tenantId),
      instrucaoExtra:
        "A pessoa está no cadastro de serviços. Extraia a lista de serviços do texto, com nome, categoria, duração em minutos e preço em centavos. Use intencao = cadastrar_servicos, precisa_confirmar = true e não invente serviços que não foram citados. Se faltar preço ou duração, estime um valor comum ao segmento informado e diga no texto que é uma sugestão editável.",
    });
  });

/** Interpreta texto livre e devolve uma PRÉVIA de horários — nada é gravado aqui. */
export const interpretarHorarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ texto: z.string().trim().min(3).max(1200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<RespostaDoAssistente> => {
    const tenantId = await tenantIdDoMembro(context);
    const { pensar } = await import("@/lib/ia/assistente.server");
    return pensar({
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
  .inputValidator((input: unknown) =>
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
