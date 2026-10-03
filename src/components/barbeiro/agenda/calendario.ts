/** Contas de calendário sobre "YYYY-MM-DD" (sem relógio nem fuso): semana começa no domingo. */
import { somarDias } from "./tempo";

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
export const LETRAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
const NOMES_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function partes(dia: string) {
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  return { a, m, d };
}

export function diaDaSemana(dia: string) {
  const { a, m, d } = partes(dia);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Domingo a sábado da semana que contém o dia. */
export function semanaDoDia(dia: string) {
  const inicio = somarDias(dia, -diaDaSemana(dia));
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/** "YYYY-MM" do dia. */
export function mesDoDia(dia: string) {
  return dia.slice(0, 7);
}

export function somarMeses(mes: string, passo: number) {
  const [a = 1970, m = 1] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + passo;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Grade do mês começando no domingo (inclui dias do mês anterior/seguinte). */
export function gradeDoMes(mes: string) {
  const primeiro = `${mes}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  const ultimo = somarDias(`${somarMeses(mes, 1)}-01`, -1);
  const semanas = Math.ceil((diaDaSemana(primeiro) + partes(ultimo).d) / 7);
  return Array.from({ length: semanas * 7 }, (_, i) => somarDias(inicio, i));
}

export function tituloDoMes(mesOuDia: string) {
  const { a, m } = partes(mesOuDia.length === 7 ? `${mesOuDia}-01` : mesOuDia);
  return `${MESES[m - 1]} ${a}`;
}

export function rotuloDoDia(dia: string) {
  const { d, m } = partes(dia);
  return `${NOMES_SEMANA[diaDaSemana(dia)]}, ${d} de ${MESES[m - 1]?.toLowerCase()}`;
}

export function numeroDoDia(dia: string) {
  return partes(dia).d;
}
