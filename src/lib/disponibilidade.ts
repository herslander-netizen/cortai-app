/**
 * Motor único de disponibilidade — usado pela página pública, pelo app do
 * cliente e pela validação no servidor. Regra única, resultado único.
 */
import { hojeNoFuso, horarioDoDia, isoNoFusoDaBarbearia, type HorarioDeFuncionamento } from "@/lib/horarios";

export type Ocupado = { profissional_id: string | null; inicio: string; fim: string };
export type RegrasDaAgenda = { antecedenciaMin: number; intervaloEntreMin: number };
export type ServicoDoMotor = { id: string; duracao_min: number; profissional_ids?: string[] | null };
export type Opcao = { iso: string; label: string; profId: string };

/** Um profissional está livre se nenhum horário ocupado dele cruza [inicio - folga, fim + folga). */
export function profissionalLivre(profId: string, inicio: number, fim: number, ocupados: Ocupado[], folgaMin = 0) {
  const folga = folgaMin * 60_000;
  return !ocupados.some(
    (o) =>
      o.profissional_id === profId &&
      new Date(o.inicio).getTime() < fim + folga &&
      new Date(o.fim).getTime() > inicio - folga,
  );
}

/** Profissionais que fazem o serviço (lista vazia no serviço = todos fazem). */
export function profissionaisDoServico<P extends { id: string }>(servico: ServicoDoMotor | null, profissionais: P[]): P[] {
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
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(instante));
  return { dia, minuto: min(hm) % (24 * 60) };
}

/** Motivo pelo qual um início não serve para o serviço (ou null se serve). */
export function motivoForaDoHorario(
  inicio: number,
  duracaoMin: number,
  horarios: HorarioDeFuncionamento[],
  fuso: string,
): string | null {
  const { dia, minuto } = diaEMinutoNoFuso(inicio, fuso);
  const info = horarioDoDia(dia, horarios);
  if (info.fechado) return "A barbearia não abre neste dia.";
  const fim = minuto + duracaoMin;
  if (minuto < min(info.abre) || fim > min(info.fecha)) {
    return `Esse horário não cabe no funcionamento da barbearia (${info.abre} às ${info.fecha}).`;
  }
  if (info.intervaloInicio && info.intervaloFim && minuto < min(info.intervaloFim) && fim > min(info.intervaloInicio)) {
    return `Esse horário invade o intervalo da barbearia (${info.intervaloInicio} às ${info.intervaloFim}).`;
  }
  return null;
}

export function motivoAntecedencia(inicio: number, antecedenciaMin: number, agora = Date.now()): string | null {
  if (inicio < agora - 60_000) return "Esse horário já passou.";
  if (antecedenciaMin > 0 && inicio < agora + antecedenciaMin * 60_000) {
    const texto = antecedenciaMin >= 60 ? `${Math.round(antecedenciaMin / 60)} h` : `${antecedenciaMin} min`;
    return `Esta barbearia agenda com pelo menos ${texto} de antecedência.`;
  }
  return null;
}

function contagemNoDia(profId: string, dia: string, ocupados: Ocupado[], fuso: string) {
  return ocupados.filter((o) => o.profissional_id === profId && hojeNoFuso(fuso, new Date(o.inicio)) === dia).length;
}

/** Entre os livres, o que tem menos atendimentos no dia (empate: ordem recebida). */
export function escolherProfissional(livres: string[], dia: string, ocupados: Ocupado[], fuso: string): string | null {
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
}): { fechado: boolean; opcoes: Opcao[] } {
  const info = horarioDoDia(p.dia, p.horarios);
  if (info.fechado) return { fechado: true, opcoes: [] };
  const agora = p.agora ?? Date.now();
  const passo = p.passoMin ?? 30;
  const aptos = profissionaisDoServico(p.servico, p.profissionais).map((x) => x.id);
  const candidatos = p.escolhido === "qualquer" ? aptos : aptos.filter((id) => id === p.escolhido);
  const opcoes: Opcao[] = [];
  for (let t = min(info.abre); t + p.servico.duracao_min <= min(info.fecha); t += passo) {
    const label = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    const iso = isoNoFusoDaBarbearia(p.dia, label, p.fuso);
    const inicio = new Date(iso).getTime();
    const fim = inicio + p.servico.duracao_min * 60_000;
    if (motivoForaDoHorario(inicio, p.servico.duracao_min, p.horarios, p.fuso)) continue;
    if (motivoAntecedencia(inicio, p.regras.antecedenciaMin, agora)) continue;
    const livres = candidatos.filter((id) => profissionalLivre(id, inicio, fim, p.ocupados, p.regras.intervaloEntreMin));
    const prof = escolherProfissional(livres, p.dia, p.ocupados, p.fuso);
    if (prof) opcoes.push({ iso, label, profId: prof });
  }
  return { fechado: false, opcoes };
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
  return doCliente.find((a) => a.id !== ignorarId && new Date(a.inicio).getTime() < fim && new Date(a.fim).getTime() > inicio) ?? null;
}
