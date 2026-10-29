import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";
import { hojeNoFuso, slotsDoDia, somarDias } from "@/lib/horarios";
import {
  horariosDisponiveis,
  motivoAntecedencia,
  profissionaisDoServico,
  proximosDiasNoFuso,
  type Ocupado,
} from "@/lib/disponibilidade";
import {
  intervalosPersonalizadosPorData,
  regrasDaBarbearia,
  STATUS_QUE_OCUPAM,
} from "@/lib/agenda-regras.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type SlotDaGrade = {
  iso: string;
  label: string;
  livre: boolean;
  /** Profissional escolhido pelo motor oficial quando o slot está livre. */
  profId: string | null;
  /** Nome do cliente já marcado neste horário (só para a equipe ver). */
  ocupadoPor: string | null;
  passou: boolean;
};

export type GradeDoDia = {
  dia: string;
  hoje: string;
  dias: string[];
  fechado: boolean;
  abre: string;
  fecha: string;
  duracaoMin: number;
  passoMin: number;
  servicos: {
    id: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    profissional_ids: string[] | null;
  }[];
  profissionais: { id: string; nome: string }[];
  slots: SlotDaGrade[];
};

/**
 * Grade do dia para o chat da Flow IA. Não tem regra própria: usa o motor
 * oficial (`disponibilidade.ts`) com as regras reais da barbearia (fuso, passo,
 * antecedência, janela, intervalo, pausa, madrugada e serviço × profissional).
 * A proteção final continua no RPC/banco ao criar o agendamento.
 */
export const getGradeDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        dia: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .default(null),
        servicoId: z.string().uuid().nullable().default(null),
        profissionalId: z.string().uuid().nullable().default(null),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<GradeDoDia> => {
    const tenantId = await tenantIdDoMembro(context as ContextoAutenticado);
    await exigirPermissao(context as ContextoAutenticado, tenantId, "visualizar_clientes");
    const db = await admin();

    const [regras, servicosRes, profRes] = await Promise.all([
      regrasDaBarbearia(db, tenantId),
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, profissional_ids")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("ordem"),
      db
        .from("profissionais")
        .select("id, nome")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome"),
    ]);

    const hoje = hojeNoFuso(regras.fuso);
    const dias = proximosDiasNoFuso(Math.min(7, regras.janelaDias + 1), regras.fuso);
    const dia = data.dia && dias.includes(data.dia) ? data.dia : hoje;
    const intervalosPorData = await intervalosPersonalizadosPorData(
      db,
      tenantId,
      somarDias(dia, -1),
      dia,
    );

    const servicos = (servicosRes.data ?? []) as GradeDoDia["servicos"];
    const todos = profRes.data ?? [];
    const servico =
      (data.servicoId ? servicos.find((s) => s.id === data.servicoId) : servicos[0]) ?? null;
    const profissionais = profissionaisDoServico(servico, todos);
    const duracaoMin = servico?.duracao_min ?? 30;
    const base = {
      dia,
      hoje,
      dias,
      duracaoMin,
      passoMin: regras.passoMin,
      servicos,
      profissionais,
    };

    const grade = slotsDoDia(
      dia,
      regras.horarios,
      regras.passoMin,
      regras.fuso,
      duracaoMin,
      intervalosPorData,
    );
    if (!servico || grade.fechado) {
      return { ...base, fechado: grade.fechado, abre: grade.abre, fecha: grade.fecha, slots: [] };
    }

    const inicioJanela = new Date(`${somarDias(dia, -1)}T00:00:00Z`).toISOString();
    const fimJanela = new Date(`${somarDias(dia, 2)}T12:00:00Z`).toISOString();
    const { data: ocupadosRaw } = await db
      .from("agendamentos")
      .select("profissional_id, inicio, fim, clientes(nome)")
      .eq("tenant_id", tenantId)
      .in("status", [...STATUS_QUE_OCUPAM])
      .lt("inicio", fimJanela)
      .gt("fim", inicioJanela);
    const ocupados = [
      ...((ocupadosRaw ?? []) as (Ocupado & { clientes?: { nome?: string } | null })[]),
      ...(await (
        await import("@/lib/ocupacoes-extras.server")
      ).ocupacoesExtras(db, {
        tenantId,
        fuso: regras.fuso,
        desde: new Date(inicioJanela),
        ate: new Date(fimJanela),
      })),
    ] as (Ocupado & { clientes?: { nome?: string } | null })[];

    const escolhido =
      data.profissionalId && profissionais.some((p) => p.id === data.profissionalId)
        ? data.profissionalId
        : "qualquer";
    const agora = Date.now();
    const { opcoes } = horariosDisponiveis({
      dia,
      servico,
      profissionais: todos,
      escolhido,
      horarios: regras.horarios,
      fuso: regras.fuso,
      ocupados,
      regras: {
        antecedenciaMin: regras.antecedenciaMin,
        intervaloEntreMin: regras.intervaloEntreMin,
      },
      agora,
      passoMin: regras.passoMin,
      intervalosPorData,
    });
    const livres = new Map(opcoes.map((o) => [o.iso, o.profId]));
    const limite = agora + regras.janelaDias * 86_400_000;
    const candidatos = escolhido === "qualquer" ? profissionais.map((p) => p.id) : [escolhido];

    const slots: SlotDaGrade[] = grade.slots.map((s) => {
      const ini = new Date(s.iso).getTime();
      const fim = ini + duracaoMin * 60_000;
      const profId = ini <= limite ? (livres.get(s.iso) ?? null) : null;
      const conflito = profId
        ? null
        : ocupados.find(
            (o) =>
              o.profissional_id != null &&
              candidatos.includes(o.profissional_id) &&
              new Date(o.inicio).getTime() < fim &&
              new Date(o.fim).getTime() > ini,
          );
      return {
        iso: s.iso,
        label: s.label,
        livre: Boolean(profId),
        profId,
        ocupadoPor: conflito ? (conflito.clientes?.nome ?? "Ocupado") : null,
        passou: Boolean(motivoAntecedencia(ini, regras.antecedenciaMin, agora)),
      };
    });

    return { ...base, fechado: false, abre: grade.abre, fecha: grade.fecha, slots };
  });
