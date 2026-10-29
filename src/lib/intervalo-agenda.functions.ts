import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  diaDaSemanaDoDia,
  hojeNoFuso,
  horarioDoDia,
  isoNoFusoDaBarbearia,
  normalizarFuso,
  somarDias,
  validarIntervaloNoDia,
} from "@/lib/horarios";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { mapearHorarios } from "@/lib/agenda-regras.server";

const entrada = z.object({
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acao: z.enum(["salvar", "restaurar"]),
  intervaloInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  intervaloFim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Ajusta só uma data. A escala semanal fica intacta; exceções são lidas pelo
 * motor compartilhado e pela RPC SQL antes de oferecer ou gravar agendamentos.
 */
export const salvarIntervaloDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const data = entrada.parse(input);
    const [ano, mes, dia] = data.dia.split("-").map(Number);
    const dataReal = new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 0));
    if (dataReal.toISOString().slice(0, 10) !== data.dia) throw new Error("Data inválida.");
    if (data.acao === "salvar" && ((data.intervaloInicio === null) !== (data.intervaloFim === null))) {
      throw new Error("Informe o início e o fim do intervalo, ou deixe os dois vazios.");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = await admin();

    const [{ data: tenant, error: erroTenant }, { data: semana, error: erroSemana }] =
      await Promise.all([
        db.from("tenants").select("fuso").eq("id", tenantId).maybeSingle(),
        db
          .from("horarios_de_funcionamento")
          .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
          .eq("tenant_id", tenantId),
      ]);
    if (erroTenant || !tenant) throw new Error("Não foi possível carregar o fuso deste negócio.");
    if (erroSemana) throw new Error("Não foi possível carregar o horário de funcionamento.");

    const fuso = normalizarFuso(tenant.fuso);
    if (data.dia < hojeNoFuso(fuso)) {
      throw new Error("Ajustes de intervalo só podem ser feitos para hoje ou uma data futura.");
    }
    const horarios = mapearHorarios(semana ?? []);
    const base = horarioDoDia(data.dia, horarios);
    if (base.fechado) throw new Error("Este dia está fechado no horário de funcionamento.");

    const inicioEfetivo =
      data.acao === "restaurar" ? base.intervaloInicio : data.intervaloInicio;
    const fimEfetivo = data.acao === "restaurar" ? base.intervaloFim : data.intervaloFim;
    const erroIntervalo = validarIntervaloNoDia(
      data.dia,
      horarios,
      inicioEfetivo,
      fimEfetivo,
    );
    if (erroIntervalo) throw new Error(erroIntervalo);

    // Não deixa criar uma pausa que cubra atendimentos já marcados.
    if (inicioEfetivo && fimEfetivo) {
      const abertura = minutos(base.abre);
      const minutoInicio = minutos(inicioEfetivo);
      const minutoFim = minutos(fimEfetivo);
      const diaInicio = minutoInicio < abertura ? somarDias(data.dia, 1) : data.dia;
      const diaFim = minutoFim < abertura ? somarDias(data.dia, 1) : data.dia;
      const inicioIso = isoNoFusoDaBarbearia(diaInicio, inicioEfetivo, fuso);
      const fimIso = isoNoFusoDaBarbearia(diaFim, fimEfetivo, fuso);
      const { data: conflitos, error } = await db
        .from("agendamentos")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("status", ["agendado", "pendente", "confirmado", "chegou", "na_cadeira"])
        .lt("inicio", fimIso)
        .gt("fim", inicioIso)
        .limit(1);
      if (error) throw new Error("Não foi possível conferir os atendimentos deste horário.");
      if (conflitos?.length) {
        throw new Error(
          "Já existe um atendimento nesse período. Remarque ou cancele esse atendimento antes de ajustar o intervalo.",
        );
      }
    }

    if (data.acao === "restaurar") {
      const { error } = await db
        .from("excecoes_intervalo_agenda")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("dia", data.dia);
      if (error) throw new Error("Não foi possível restaurar o intervalo semanal.");
    } else {
      const { error } = await db.from("excecoes_intervalo_agenda").upsert(
        {
          tenant_id: tenantId,
          dia: data.dia,
          intervalo_inicio: data.intervaloInicio,
          intervalo_fim: data.intervaloFim,
          atualizado_por: context.userId,
        },
        { onConflict: "tenant_id,dia" },
      );
      if (error) throw new Error("Não foi possível salvar o intervalo deste dia.");
    }

    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: data.acao === "restaurar" ? "agenda.intervalo_restaurado" : "agenda.intervalo_ajustado",
      _alvo: data.dia,
      _detalhes: {
        intervalo_inicio: inicioEfetivo,
        intervalo_fim: fimEfetivo,
        acao: data.acao,
      },
    });

    return { ok: true as const, dia: data.dia, intervaloInicio: inicioEfetivo, intervaloFim: fimEfetivo };
  });
