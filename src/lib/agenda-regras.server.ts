/**
 * Validação no servidor com o mesmo motor da tela. Usa o cliente de serviço,
 * então só deve ser chamada depois de a barbearia/cliente estarem resolvidos.
 */
import {
  conflitoDoCliente,
  diaEMinutoNoFuso,
  motivoAntecedencia,
  motivoForaDoHorario,
  profissionalLivre,
  type Ocupado,
} from "@/lib/disponibilidade";
import {
  normalizarFuso,
  somarDias,
  type HorarioDeFuncionamento,
  type IntervalosPorData,
} from "@/lib/horarios";
import { PASSO_MAXIMO_MINUTOS, PASSO_MINIMO_MINUTOS } from "@/lib/onboarding-regras";

import { STATUS_QUE_OCUPAM } from "@/lib/disponibilidade";
export { STATUS_QUE_OCUPAM };
export const STATUS_ATIVOS_DO_CLIENTE = ["agendado", "chegou", "na_cadeira"] as const;

export function mapearHorarios(linhas: Record<string, any>[]): HorarioDeFuncionamento[] {
  return linhas.map((h) => ({
    diaSemana: h["dia_semana"] as number,
    fechado: Boolean(h["fechado"]),
    abre: String(h["abre"]).slice(0, 5),
    fecha: String(h["fecha"]).slice(0, 5),
    intervaloInicio: h["intervalo_inicio"] ? String(h["intervalo_inicio"]).slice(0, 5) : null,
    intervaloFim: h["intervalo_fim"] ? String(h["intervalo_fim"]).slice(0, 5) : null,
  }));
}

/** Valores sugeridos; o motor também aceita intervalo personalizado válido. */
export const PASSOS_PERMITIDOS = [15, 20, 30, 40] as const;
export function janelaValida(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 7 && n <= 90 ? Math.round(n) : 30;
}
export function passoValido(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= PASSO_MINIMO_MINUTOS && n <= PASSO_MAXIMO_MINUTOS ? n : 30;
}

export async function regrasDaBarbearia(db: any, tenantId: string) {
  const [{ data: t }, { data: h }] = await Promise.all([
    db
      .from("tenants")
      .select(
        "fuso, antecedencia_min_minutos, intervalo_entre_min, janela_agendamento_dias, passo_horarios_min",
      )
      .eq("id", tenantId)
      .maybeSingle(),
    db
      .from("horarios_de_funcionamento")
      .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
      .eq("tenant_id", tenantId),
  ]);
  return {
    fuso: normalizarFuso(t?.fuso),
    antecedenciaMin: Number(t?.antecedencia_min_minutos ?? 0),
    intervaloEntreMin: Number(t?.intervalo_entre_min ?? 0),
    janelaDias: janelaValida(t?.janela_agendamento_dias),
    passoMin: passoValido(t?.passo_horarios_min),
    horarios: mapearHorarios(h ?? []),
  };
}

/**
 * Lê os ajustes excepcionais de intervalo por data. A tabela é aditiva e pode
 * ainda não existir em uma prévia antiga; nesse caso, mantém o horário semanal.
 */
export async function intervalosPersonalizadosPorData(
  db: any,
  tenantId: string,
  de: string,
  ate: string = de,
): Promise<IntervalosPorData> {
  const { data, error } = await db
    .from("intervalos_agenda_dia")
    .select("dia, intervalo_inicio, intervalo_fim")
    .eq("tenant_id", tenantId)
    .gte("dia", de)
    .lte("dia", ate);
  if (error) {
    const mensagem = String(error.message ?? "");
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      (/intervalos_agenda_dia/i.test(mensagem) && /schema cache|not exist|not found/i.test(mensagem))
    ) return {};
    throw new Error(mensagem || "Não foi possível carregar os intervalos do dia.");
  }
  return Object.fromEntries(
    (data ?? []).map((linha: { dia: string; intervalo_inicio: string; intervalo_fim: string }) => [
      String(linha.dia).slice(0, 10),
      {
        intervaloInicio: String(linha.intervalo_inicio).slice(0, 5),
        intervaloFim: String(linha.intervalo_fim).slice(0, 5),
      },
    ]),
  );
}

export type ConflitoDoCliente = { agendamentoId: string; hora: string };

/**
 * Confere horário de funcionamento, intervalo, antecedência, serviço × profissional,
 * folga entre atendimentos e sobreposição do mesmo cliente.
 * Lança Error com mensagem clara; devolve o conflito do cliente (se houver) sem lançar.
 */
export async function validarAgendamento(
  db: any,
  p: {
    tenantId: string;
    servico: { id: string; duracao_min: number; profissional_ids?: string[] | null };
    profissionalId: string;
    inicio: Date;
    clienteId: string | null;
    ignorarId?: string | null;
  },
): Promise<ConflitoDoCliente | null> {
  const regras = await regrasDaBarbearia(db, p.tenantId);
  const ini = p.inicio.getTime();
  const fim = ini + p.servico.duracao_min * 60_000;
  const antecedencia = motivoAntecedencia(ini, regras.antecedenciaMin);
  if (antecedencia) throw new Error(antecedencia);
  if (ini > Date.now() + regras.janelaDias * 86_400_000) {
    throw new Error(
      `Este local agenda com até ${regras.janelaDias} dias de antecedência. Escolha uma data mais próxima.`,
    );
  }
  const diaAlvo = diaEMinutoNoFuso(ini, regras.fuso).dia;
  const intervalosPorData = await intervalosPersonalizadosPorData(
    db,
    p.tenantId,
    somarDias(diaAlvo, -1),
    diaAlvo,
  );
  const fora = motivoForaDoHorario(
    ini,
    p.servico.duracao_min,
    regras.horarios,
    regras.fuso,
    intervalosPorData,
  );
  if (fora) throw new Error(fora);
  const ids = p.servico.profissional_ids ?? [];
  if (ids.length && !ids.includes(p.profissionalId))
    throw new Error("Esse profissional não faz esse serviço.");

  const margem = Math.max(regras.intervaloEntreMin, 0) * 60_000;
  let consultaProf = db
    .from("agendamentos")
    .select("id, profissional_id, inicio, fim")
    .eq("profissional_id", p.profissionalId)
    .in("status", [...STATUS_QUE_OCUPAM])
    .lt("inicio", new Date(fim + margem).toISOString())
    .gt("fim", new Date(ini - margem).toISOString());
  if (p.ignorarId) consultaProf = consultaProf.neq("id", p.ignorarId);
  const { data: doProf } = await consultaProf;
  const { ocupacoesExtras } = await import("@/lib/ocupacoes-extras.server");
  const extras = await ocupacoesExtras(db, {
    tenantId: p.tenantId,
    fuso: regras.fuso,
    desde: new Date(ini),
    ate: new Date(fim),
    profissionalIds: [p.profissionalId],
  });
  if (!profissionalLivre(p.profissionalId, ini, fim, extras, 0)) {
    throw new Error("Esse horário está bloqueado na agenda. Escolha outro.");
  }
  if (
    !profissionalLivre(
      p.profissionalId,
      ini,
      fim,
      (doProf ?? []) as Ocupado[],
      regras.intervaloEntreMin,
    )
  ) {
    throw new Error("Esse horário acabou de ser reservado, escolha outro");
  }

  if (p.clienteId) {
    const { data: doCliente } = await db
      .from("agendamentos")
      .select("id, inicio, fim")
      .eq("cliente_id", p.clienteId)
      .in("status", [...STATUS_ATIVOS_DO_CLIENTE])
      .lt("inicio", new Date(fim).toISOString())
      .gt("fim", new Date(ini).toISOString());
    const c = conflitoDoCliente(
      (doCliente ?? []) as { id: string; inicio: string; fim: string }[],
      ini,
      fim,
      p.ignorarId,
    );
    if (c) {
      const hora = new Date(c.inicio).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: regras.fuso,
      });
      return { agendamentoId: c.id, hora };
    }
  }
  return null;
}
