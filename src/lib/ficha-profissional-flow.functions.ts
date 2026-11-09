import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";

/**
 * Dados reais para a ficha do profissional. Não calcula receita a partir do
 * preço da agenda: a fonte de verdade para dinheiro continua no financeiro.
 */
export const getFichaProfissionalFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data: equipe, error: erroEquipe } = await context.supabase.rpc("equipe_do_tenant", {
      _tenant_id: tenantId,
    });
    if (erroEquipe) throw new Error("Você não tem permissão para consultar a equipe.");
    const membro = (equipe ?? []).find(
      (p: Record<string, unknown>) => p["user_id"] === data.userId,
    );
    if (!membro) throw new Error("Profissional não encontrado neste negócio.");

    const { data: profissional, error: erroProfissional } = await context.supabase
      .from("profissionais")
      .select("id, nome, avatar_url")
      .eq("tenant_id", tenantId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (erroProfissional) throw new Error("Não foi possível consultar o profissional.");

    const [perfil, horarios, escala] = await Promise.all([
      context.supabase.from("perfis").select("telefone").eq("user_id", data.userId).maybeSingle(),
      context.supabase
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha")
        .eq("tenant_id", tenantId),
      profissional
        ? context.supabase
            .from("escalas_de_profissional")
            .select("dia_semana, trabalha, abre, fecha")
            .eq("tenant_id", tenantId)
            .eq("profissional_id", profissional.id)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (horarios.error || escala.error) {
      throw new Error("Não foi possível consultar a disponibilidade.");
    }

    let agendamentos: number | null = null;
    let avaliacao: number | null = null;
    if (profissional) {
      const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [total, avaliacoes] = await Promise.all([
        context.supabase
          .from("agendamentos")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("profissional_id", profissional.id)
          .gte("inicio", desde)
          .in("status", ["agendado", "chegou", "na_cadeira", "finalizado"]),
        context.supabase
          .from("avaliacoes")
          .select("nota")
          .eq("tenant_id", tenantId)
          .eq("profissional_id", profissional.id)
          .gte("criado_em", desde)
          .limit(1000),
      ]);
      if (!total.error) agendamentos = total.count ?? 0;
      if (!avaliacoes.error && avaliacoes.data?.length) {
        avaliacao =
          avaliacoes.data.reduce((soma, item) => soma + item.nota, 0) /
          avaliacoes.data.length;
      }
    }

    return {
      profissionalId: profissional?.id ?? null,
      nome: profissional?.nome ?? (membro["nome"] as string | null) ?? "Profissional",
      fotoUrl: profissional?.avatar_url ?? null,
      telefone: perfil.data?.telefone ?? null,
      agendamentos,
      avaliacao,
      // Receita não pode ser inferida de agendamentos. Não inventar números.
      receitaCentavos: null as number | null,
      expediente: (horarios.data ?? []).map((h) => ({
        dia: h.dia_semana,
        trabalha: !h.fechado,
        abre: String(h.abre).slice(0, 5),
        fecha: String(h.fecha).slice(0, 5),
      })),
      escala: (escala.data ?? []).map((h) => ({
        dia: h.dia_semana,
        trabalha: Boolean(h.trabalha),
        abre: h.abre ? String(h.abre).slice(0, 5) : null,
        fecha: h.fecha ? String(h.fecha).slice(0, 5) : null,
      })),
    };
  });
