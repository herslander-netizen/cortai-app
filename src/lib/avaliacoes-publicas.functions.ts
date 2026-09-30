import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dimensoesSchema = z
  .object({
    atendimento: z.number().int().min(1).max(5).optional(),
    pontualidade: z.number().int().min(1).max(5).optional(),
    agendamento: z.number().int().min(1).max(5).optional(),
    experiencia: z.number().int().min(1).max(5).optional(),
  })
  .optional();

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function criarConviteDeAvaliacao(agendamentoId: string) {
  const db = await admin();
  const { data: existente } = await db
    .from("convites_de_avaliacao")
    .select("id, usado_em")
    .eq("agendamento_id", agendamentoId)
    .maybeSingle();
  if (existente?.usado_em) return null;
  if (existente) {
    const { error } = await db
      .from("convites_de_avaliacao")
      .delete()
      .eq("id", existente.id)
      .is("usado_em", null);
    if (error) throw new Error(error.message);
  }

  const token = \`${crypto.randomUUID()}\${crypto.randomUUID().replaceAll("-", "")}\`;
  const tokenHash = await hashToken(token);
  const { data: ag } = await db
    .from("agendamentos")
    .select("tenant_id, status")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag || ag.status !== "finalizado") return null;

  const { error } = await db.from("convites_de_avaliacao").insert({
    tenant_id: ag.tenant_id,
    agendamento_id: agendamentoId,
    token_hash: tokenHash,
    expira_em: new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString(),
  });
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return token;
}

export const getConviteDeAvaliacao = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(40).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const tokenHash = await hashToken(data.token);
    const { data: convite } = await db
      .from("convites_de_avaliacao")
      .select(
        "agendamento_id, expira_em, usado_em, agendamentos(status, servicos(nome), tenants(nome, link_avaliacao_publica))",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!convite || convite.usado_em || new Date(convite.expira_em).getTime() <= Date.now())
      return null;
    const ag = convite.agendamentos as unknown as {
      status: string;
      servicos: { nome: string } | null;
      tenants: { nome: string; link_avaliacao_publica: string | null } | null;
    } | null;
    if (!ag || ag.status !== "finalizado") return null;
    return { negocio: ag.tenants?.nome ?? "Negócio", servico: ag.servicos?.nome ?? "Atendimento" };
  });

export const registrarAvaliacaoPublica = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(40).max(100),
        nota: z.number().int().min(1).max(5),
        comentario: z.string().trim().max(400).optional(),
        dimensoes: dimensoesSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const tokenHash = await hashToken(data.token);

    const { data: resultado, error } = await db.rpc("registrar_avaliacao_publica_atomica", {
      _token_hash: tokenHash,
      _nota: data.nota,
      _comentario: data.comentario || null,
      _dimensoes: (data.dimensoes ?? {}) as any,
    });

    if (error) throw new Error(error.message);
    const res = resultado as unknown as {
      ok: boolean;
      tenant_id: string;
      positiva: boolean;
      precisa_atencao: boolean;
      link_publico: string | null;
    };

    if (res.precisa_atencao) {
      await db.rpc("criar_notificacao", {
        _tenant: res.tenant_id,
        _tipo: "avaliacao",
        _titulo: "Experiência precisa de atenção",
        _corpo:
          "Uma avaliação recente recebeu nota baixa. Consulte o relato antes do próximo contato.",
        _link: "/barbeiro/avaliacoes",
      });
    }

    return {
      ok: res.ok,
      positiva: res.positiva,
      linkPublico: res.link_publico,
    };
  });
