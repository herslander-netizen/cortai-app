import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";
import { slotsDoDia, type HorarioDeFuncionamento } from "@/lib/horarios";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type SlotDaGrade = {
  iso: string;
  label: string;
  livre: boolean;
  /** Nome do cliente já marcado neste horário (só para a equipe ver). */
  ocupadoPor: string | null;
  passou: boolean;
};

export type GradeDoDia = {
  dia: string;
  fechado: boolean;
  abre: string;
  fecha: string;
  duracaoMin: number;
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
  profissionais: { id: string; nome: string }[];
  slots: SlotDaGrade[];
};

/**
 * Grade de horários livres e ocupados de um dia, montada com o horário real de
 * funcionamento da barbearia e os agendamentos ativos. Serve à agenda dentro do
 * chat do CortAI — nenhuma disponibilidade é inventada aqui.
 */
export const getGradeDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        servicoId: z.string().uuid().nullable().default(null),
        profissionalId: z.string().uuid().nullable().default(null),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<GradeDoDia> => {
    const tenantId = await tenantIdDoMembro(context as ContextoAutenticado);
    await exigirPermissao(context as ContextoAutenticado, tenantId, "visualizar_clientes");
    const db = await admin();

    const [servicosRes, profRes, horariosRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("ordem"),
      db
        .from("profissionais")
        .select("id, nome")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome"),
      db
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha")
        .eq("tenant_id", tenantId)
        .order("dia_semana"),
    ]);

    const servicos = servicosRes.data ?? [];
    const profissionais = profRes.data ?? [];
    const horarios: HorarioDeFuncionamento[] = (horariosRes.data ?? []).map((h) => ({
      diaSemana: h.dia_semana as number,
      fechado: Boolean(h.fechado),
      abre: String(h.abre).slice(0, 5),
      fecha: String(h.fecha).slice(0, 5),
    }));

    const servicoEscolhido = data.servicoId
      ? servicos.find((s) => s.id === data.servicoId)
      : servicos[0];
    const duracaoMin = servicoEscolhido?.duracao_min ?? 30;

    const grade = slotsDoDia(data.dia, horarios, 30);
    const inicioDoDia = grade.slots[0]?.iso ?? new Date(`${data.dia}T00:00:00Z`).toISOString();
    const fimDoDia = new Date(new Date(inicioDoDia).getTime() + 24 * 60 * 60 * 1000).toISOString();

    let consulta = db
      .from("agendamentos")
      .select("inicio, fim, profissional_id, clientes(nome)")
      .eq("tenant_id", tenantId)
      .not("status", "in", "(cancelado,falta)")
      .gte("inicio", new Date(new Date(inicioDoDia).getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lt("inicio", fimDoDia);
    if (data.profissionalId) consulta = consulta.eq("profissional_id", data.profissionalId);
    const { data: ocupados } = await consulta;

    const agora = Date.now();
    const equipe = data.profissionalId
      ? profissionais.filter((p) => p.id === data.profissionalId)
      : profissionais;

    const slots: SlotDaGrade[] = grade.slots.map((s) => {
      const inicio = new Date(s.iso).getTime();
      const fim = inicio + duracaoMin * 60_000;
      const conflitos = (ocupados ?? []).filter(
        (a) => new Date(a.inicio).getTime() < fim && new Date(a.fim).getTime() > inicio,
      );
      // Com vários profissionais, o horário só fica ocupado quando todos estão.
      const totalEquipe = Math.max(1, equipe.length);
      const cheio = conflitos.length >= totalEquipe;
      return {
        iso: s.iso,
        label: s.label,
        livre: !cheio,
        ocupadoPor: cheio
          ? ((conflitos[0] as { clientes?: { nome?: string } })?.clientes?.nome ?? "Ocupado")
          : null,
        passou: inicio <= agora,
      };
    });

    return {
      dia: data.dia,
      fechado: grade.fechado,
      abre: grade.abre,
      fecha: grade.fecha,
      duracaoMin,
      servicos,
      profissionais,
      slots,
    };
  });
