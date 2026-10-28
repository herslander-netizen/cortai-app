/**
 * Motor único de disponibilidade — usado pela página pública, pelo app do
 * cliente e pela validação no servidor. Regra única, resultado único.
 */
import {
  fimEmMinutos,
  hojeNoFuso,
  horarioDoDia,
  isoNoFusoDaBarbearia,
  somarDias,
  type HorarioDeFuncionamento,
  type IntervalosPorData,
} from "@/lib/horarios";

/** Status que ocupam a agenda — fonte única (o servidor reexporta). */
export const STATUS_QUE_OCUPAM = ["agendado", "chegou", "na_cadeira", "finalizado"] as const;

export type Ocupado = {
  profissional_id: string | null;
  inicio: string;
  fim: string;
  /** Bloqueio por data ou fora da escala: ocupa, mas não conta como atendimento. */
  bloqueio?: boolean;
};
export type RegrasDaAgenda = { antecedenciaMin: number; intervaloEntreMin: number };
export type ServicoDoMotor = {
  id: string;
  duracao_min: number;
  profissional_ids?: string[] | null;
};
export type Opcao = { iso: string; label: string; profId: string };

/** Um profissional está livre se nenhum horário ocupado dele cruza [inicio - folga, fim + folga). */
export function profissionalLivre(
  profId: string,
  inicio: number,
  fim: number,
  ocupados: Ocupado[],
  folgaMin = 0,
) {
  const folga = folgaMin * 60_000;
  return !ocupados.some(
    (o) =>
      o.profissional_id === profId &&
      new Date(o.inicio).getTime() < fim + folga &&
      new Date(o.fim).getTime() > inicio - folga,
  );
}

/** Profissionais que fazem o serviço (lista vazia no serviço = todos fazem). */
export function profissionaisDoServico<P extends { id: string }>(
  servico: ServicoDoMotor | null,
  profissionais: P[],
): P[] {
  const ids = servico?.profissional_ids ?? [];
  if (!ids.length) return profissionais;
  return profissionais.filter((p) => ids.includes(p.id));
}

function min(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Dia (AAAA-MM-DD) e minuto do dia de um instante, no fuso da barbearia. */
export function diaEMinutoNoFuso(instante: number, fuso: string): { dia: string; minuto: number } {
  const dia = hojeNoFuso(fuso, new Date(instante));
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(instante));
  return { dia, minuto: min(hm) % (24 * 60) };
}

/** Faixa aberta de um dia em minutos desde 00:00 desse dia (fim pode passar de 1440). */
function faixaDoDia(
  dia: string,
  horarios: HorarioDeFuncionamento[],
  intervalosPorData?: IntervalosPorData,
) {
  const info = horarioDoDia(dia, horarios, intervalosPorData);
  if (info.fechado) return null;
  const abre = min(info.abre);
  const fecha = fimEmMinutos(info.abre, info.fecha);
  let pausa: [number, number] | null = null;
  if (info.intervaloInicio && info.intervaloFim) {
    const pi = min(info.intervaloInicio) + (min(info.intervaloInicio) < abre ? 1440 : 0);
    const pf = min(info.intervaloFim) + (min(info.intervaloFim) < abre ? 1440 : 0);
    pausa = [pi, pf];
  }
  return { info, abre, fecha, pausa };
}

/** Motivo pelo qual um início não serve para o serviço (ou null se serve). */
export function motivoForaDoHorario(
  inicio: number,
  duracaoMin: number,
  horarios: HorarioDeFuncionamento[],
  fuso: string,
  intervalosPorData?: IntervalosPorData,
): string | null {
  const { dia, minuto } = diaEMinutoNoFuso(inicio, fuso);
  // Madrugada: pode pertencer ao expediente de ontem que fecha depois da meia-noite.
  const ontem = faixaDoDia(somarDias(dia, -1), horarios, intervalosPorData);
  if (ontem && ontem.fecha > 1440) {
    const m = minuto + 1440;
    if (
      m >= ontem.abre &&
      m + duracaoMin <= ontem.fecha &&
      !(ontem.pausa && m < ontem.pausa[1] && m + duracaoMin > ontem.pausa[0])
    ) {
      return null;
    }
  }
  const hoje = faixaDoDia(dia, horarios, intervalosPorData);
  if (!hoje) return "O negócio não abre neste dia.";
  const fim = minuto + duracaoMin;
  if (minuto < hoje.abre || fim > hoje.fecha) {
    return `Esse horário não cabe no funcionamento do negócio (${hoje.info.abre} às ${hoje.info.fecha}).`;
  }
  if (hoje.pausa && minuto < hoje.pausa[1] && fim > hoje.pausa[0]) {
    return `Esse horário invade o intervalo do negócio (${hoje.info.intervaloInicio} às ${hoje.info.intervaloFim}).`;
  }
  return null;
}

export function motivoAntecedencia(
  inicio: number,
  antecedenciaMin: number,
  agora = Date.now(),
): string | null {
  if (inicio < agora - 60_000) return "Esse horário já passou.";
  if (antecedenciaMin > 0 && inicio < agora + antecedenciaMin * 60_000) {
    const texto =
      antecedenciaMin >= 60 ? `${Math.round(antecedenciaMin / 60)} h` : `${antecedenciaMin} min`;
    return `Este negócio agenda com pelo menos ${texto} de antecedência.`;
  }
  return null;
}

function contagemNoDia(profId: string, dia: string, ocupados: Ocupado[], fuso: string) {
  return ocupados.filter(
    (o) =>
      !o.bloqueio && o.profissional_id === profId && hojeNoFuso(fuso, new Date(o.inicio)) === dia,
  ).length;
}

/** Entre os livres, o que tem menos atendimentos no dia (empate: ordem recebida). */
export function escolherProfissional(
  livres: string[],
  dia: string,
  ocupados: Ocupado[],
  fuso: string,
): string | null {
  let melhor: string | null = null;
  let menor = Infinity;
  for (const id of livres) {
    const n = contagemNoDia(id, dia, ocupados, fuso);
    if (n < menor) {
      menor = n;
      melhor = id;
    }
  }
  return melhor;
}

/** Horários oferecidos em um dia para um serviço. */
export function horariosDisponiveis(p: {
  dia: string;
  servico: ServicoDoMotor;
  profissionais: { id: string }[];
  escolhido: string; // id ou "qualquer"
  horarios: HorarioDeFuncionamento[];
  fuso: string;
  ocupados: Ocupado[];
  regras: RegrasDaAgenda;
  agora?: number;
  passoMin?: number;
  intervalosPorData?: IntervalosPorData;
}): { fechado: boolean; opcoes: Opcao[] } {
  const info = horarioDoDia(p.dia, p.horarios, p.intervalosPorData);
  if (info.fechado) return { fechado: true, opcoes: [] };
  const agora = p.agora ?? Date.now();
  const passo = p.passoMin ?? 30;
  const aptos = profissionaisDoServico(p.servico, p.profissionais).map((x) => x.id);
  const candidatos = p.escolhido === "qualquer" ? aptos : aptos.filter((id) => id === p.escolhido);
  const opcoes: Opcao[] = [];
  for (
    let t = min(info.abre);
    t + p.servico.duracao_min <= fimEmMinutos(info.abre, info.fecha);
    t += passo
  ) {
    const tt = t % 1440;
    const label = `${String(Math.floor(tt / 60)).padStart(2, "0")}:${String(tt % 60).padStart(2, "0")}`;
    const iso = isoNoFusoDaBarbearia(t >= 1440 ? somarDias(p.dia, 1) : p.dia, label, p.fuso);
    const inicio = new Date(iso).getTime();
    const fim = inicio + p.servico.duracao_min * 60_000;
    if (
      motivoForaDoHorario(
        inicio,
        p.servico.duracao_min,
        p.horarios,
        p.fuso,
        p.intervalosPorData,
      )
    ) continue;
    if (motivoAntecedencia(inicio, p.regras.antecedenciaMin, agora)) continue;
    const livres = candidatos.filter((id) =>
      profissionalLivre(id, inicio, fim, p.ocupados, p.regras.intervaloEntreMin),
    );
    const prof = escolherProfissional(livres, p.dia, p.ocupados, p.fuso);
    if (prof) opcoes.push({ iso, label, profId: prof });
  }
  return { fechado: false, opcoes };
}

export type EstadoDoHorario = "livre" | "ocupado" | "bloqueado" | "passado";
export type HorarioComEstado<O extends Ocupado = Ocupado> = {
  iso: string;
  label: string;
  estado: EstadoDoHorario;
  /** Profissional sugerido quando livre. */
  profId: string | null;
  /** Quem ocupa (só atendimentos, nunca bloqueios), quando ocupado. */
  ocupantes: O[];
};

/**
 * Todos os horários do dia com seu estado real, usando as mesmas regras de
 * `horariosDisponiveis` (duração, folga, funcionamento, antecedência,
 * profissional). "Ocupado" só quando nenhum candidato está livre por causa de
 * atendimento; bloqueio/escala/intervalo vira "bloqueado". Só para a tela —
 * a validação final continua no servidor.
 */
export function estadosDoDia<O extends Ocupado>(p: {
  dia: string;
  servico: ServicoDoMotor;
  profissionais: { id: string }[];
  escolhido: string;
  horarios: HorarioDeFuncionamento[];
  fuso: string;
  ocupados: O[];
  regras: RegrasDaAgenda;
  agora?: number;
  passoMin?: number;
  intervalosPorData?: IntervalosPorData;
}): { fechado: boolean; horarios: HorarioComEstado<O>[] } {
  const info = horarioDoDia(p.dia, p.horarios, p.intervalosPorData);
  if (info.fechado) return { fechado: true, horarios: [] };
  const agora = p.agora ?? Date.now();
  const passo = p.passoMin ?? 30;
  const aptos = profissionaisDoServico(p.servico, p.profissionais).map((x) => x.id);
  const candidatos = p.escolhido === "qualquer" ? aptos : aptos.filter((id) => id === p.escolhido);
  const atendimentos = p.ocupados.filter((o) => !o.bloqueio);
  const bloqueios = p.ocupados.filter((o) => o.bloqueio);
  const folga = p.regras.intervaloEntreMin;
  const saida: HorarioComEstado<O>[] = [];
  for (
    let t = min(info.abre);
    t + p.servico.duracao_min <= fimEmMinutos(info.abre, info.fecha);
    t += passo
  ) {
    const tt = t % 1440;
    const label = `${String(Math.floor(tt / 60)).padStart(2, "0")}:${String(tt % 60).padStart(2, "0")}`;
    const iso = isoNoFusoDaBarbearia(t >= 1440 ? somarDias(p.dia, 1) : p.dia, label, p.fuso);
    const inicio = new Date(iso).getTime();
    const fim = inicio + p.servico.duracao_min * 60_000;
    const base = { iso, label, profId: null, ocupantes: [] as O[] };
    if (inicio < agora - 60_000) {
      saida.push({ ...base, estado: "passado" });
      continue;
    }
    if (
      motivoForaDoHorario(
        inicio,
        p.servico.duracao_min,
        p.horarios,
        p.fuso,
        p.intervalosPorData,
      ) ||
      motivoAntecedencia(inicio, p.regras.antecedenciaMin, agora) ||
      !candidatos.length
    ) {
      saida.push({ ...base, estado: "bloqueado" });
      continue;
    }
    const semBloqueio = candidatos.filter((id) => profissionalLivre(id, inicio, fim, bloqueios, 0));
    if (!semBloqueio.length) {
      saida.push({ ...base, estado: "bloqueado" });
      continue;
    }
    const livres = semBloqueio.filter((id) =>
      profissionalLivre(id, inicio, fim, atendimentos, folga),
    );
    const prof = escolherProfissional(livres, p.dia, p.ocupados, p.fuso);
    if (prof) {
      saida.push({ ...base, estado: "livre", profId: prof });
      continue;
    }
    const f = folga * 60_000;
    const ocupantes = atendimentos.filter(
      (o) =>
        o.profissional_id !== null &&
        semBloqueio.includes(o.profissional_id) &&
        new Date(o.inicio).getTime() < fim + f &&
        new Date(o.fim).getTime() > inicio - f,
    );
    saida.push({ ...base, estado: "ocupado", ocupantes });
  }
  return { fechado: false, horarios: saida };
}

/** Próximos dias (AAAA-MM-DD) a partir de hoje no fuso da barbearia. */
export function proximosDiasNoFuso(qtd: number, fuso: string, agora = Date.now()): string[] {
  const [a, m, d] = hojeNoFuso(fuso, new Date(agora)).split("-").map(Number);
  return Array.from({ length: qtd }, (_, i) => {
    const x = new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, (d ?? 1) + i));
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
  });
}

/** Horário do mesmo cliente que cruza o intervalo pedido (ou null). */
export function conflitoDoCliente<T extends { inicio: string; fim: string; id?: string }>(
  doCliente: T[],
  inicio: number,
  fim: number,
  ignorarId?: string | null,
): T | null {
  return (
    doCliente.find(
      (a) =>
        a.id !== ignorarId &&
        new Date(a.inicio).getTime() < fim &&
        new Date(a.fim).getTime() > inicio,
    ) ?? null
  );
}
