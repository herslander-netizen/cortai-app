import { horariosDisponiveis, profissionaisDoServico, type Ocupado } from "@/lib/disponibilidade";
import type { HorarioDeFuncionamento } from "@/lib/horarios";

/**
 * Lista de horários da reserva no padrão do Figaro (landing_peek_booking): cada horário aparece uma vez,
 * com o primeiro profissional livre e quantos mais também estão ("Lucas +2"). Usa o mesmo motor de
 * disponibilidade da agenda, profissional por profissional.
 */
export type HorarioComProfissionais = {
  iso: string;
  label: string;
  profissionais: { id: string; nome: string }[];
};

export function horariosComProfissionais(p: {
  dia: string;
  servico: {
    id: string;
    nome: string;
    preco_centavos: number;
    duracao_min: number;
    profissional_ids?: string[] | null;
  };
  profissionais: { id: string; nome: string }[];
  horarios: HorarioDeFuncionamento[];
  fuso: string;
  ocupados: Ocupado[];
  regras: { antecedenciaMin: number; intervaloEntreMin: number };
  agora?: number;
  passoMin?: number;
}): { fechado: boolean; horarios: HorarioComProfissionais[] } {
  const aptos = profissionaisDoServico(p.servico, p.profissionais);
  const porIso = new Map<string, HorarioComProfissionais>();
  let fechado = false;
  for (const prof of aptos) {
    const r = horariosDisponiveis({
      dia: p.dia,
      servico: p.servico,
      profissionais: p.profissionais,
      escolhido: prof.id,
      horarios: p.horarios,
      fuso: p.fuso,
      ocupados: p.ocupados,
      regras: p.regras,
      ...(p.agora !== undefined ? { agora: p.agora } : {}),
      ...(p.passoMin !== undefined ? { passoMin: p.passoMin } : {}),
    });
    fechado = r.fechado;
    for (const o of r.opcoes) {
      const atual = porIso.get(o.iso) ?? { iso: o.iso, label: o.label, profissionais: [] };
      atual.profissionais.push({ id: prof.id, nome: prof.nome });
      porIso.set(o.iso, atual);
    }
  }
  return { fechado, horarios: [...porIso.values()].sort((a, b) => a.iso.localeCompare(b.iso)) };
}

/** "Lucas +2": primeiro nome do primeiro profissional e quantos outros também estão livres. */
export function rotuloDosProfissionais(lista: { nome: string }[]): string {
  const primeiro = lista[0]?.nome.trim().split(/\s+/)[0] ?? "";
  return lista.length > 1 ? `${primeiro} +${lista.length - 1}` : primeiro;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "28 de Agosto" a partir de `YYYY-MM-DD`. */
export function dataPorExtenso(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1]}`;
}

/** "Agosto, 2026" a partir de `YYYY-MM-DD`. */
export function mesEAno(dia: string): string {
  const [a, m] = dia.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1]}, ${a}`;
}

/** Hora final ("10:15") de um horário "09:15" com a duração do serviço. */
export function horaFinal(label: string, duracaoMin: number): string {
  const [h, m] = label.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + duracaoMin;
  const tt = total % 1440;
  return `${String(Math.floor(tt / 60)).padStart(2, "0")}:${String(tt % 60).padStart(2, "0")}`;
}
