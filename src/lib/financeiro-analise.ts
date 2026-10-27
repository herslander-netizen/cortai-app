import { diaDaSemanaDoDia, somarDias } from "@/lib/horarios";

export type PeriodoFinanceiro = "hoje" | "semana" | "mes";

export type IntervaloFinanceiroLocal = {
  inicio: string;
  fim: string;
  inicioAnterior: string;
  fimAnterior: string;
};

function primeiroDiaDoMes(dia: string, deslocamentoMeses = 0): string {
  const [ano, mes] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1 + deslocamentoMeses, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Intervalos fechados à esquerda e abertos à direita, usando datas civis do fuso do negócio. */
export function intervaloFinanceiroLocal(
  hoje: string,
  periodo: PeriodoFinanceiro,
): IntervaloFinanceiroLocal {
  if (periodo === "hoje") {
    return {
      inicio: hoje,
      fim: somarDias(hoje, 1),
      inicioAnterior: somarDias(hoje, -1),
      fimAnterior: hoje,
    };
  }

  if (periodo === "semana") {
    const inicio = somarDias(hoje, -((diaDaSemanaDoDia(hoje) + 6) % 7));
    const diasNoPeriodo = diasEntreDatas(inicio, hoje) + 1;
    const inicioAnterior = somarDias(inicio, -7);
    return {
      inicio,
      fim: somarDias(hoje, 1),
      inicioAnterior,
      fimAnterior: somarDias(inicioAnterior, diasNoPeriodo),
    };
  }

  const inicio = primeiroDiaDoMes(hoje);
  const inicioAnterior = primeiroDiaDoMes(hoje, -1);
  const diaDoMes = Number(hoje.slice(8, 10)) || 1;
  const ultimoDiaMesAnterior = new Date(
    Date.UTC(Number(inicioAnterior.slice(0, 4)), Number(inicioAnterior.slice(5, 7)), 0),
  ).getUTCDate();
  const ultimoDiaComparavel = Math.min(diaDoMes, ultimoDiaMesAnterior);
  return {
    inicio,
    fim: somarDias(hoje, 1),
    inicioAnterior,
    fimAnterior: somarDias(inicioAnterior, ultimoDiaComparavel),
  };
}
/** Converte um instante para a data civil do fuso do negócio (AAAA-MM-DD). */
export function dataISOEmFuso(instanteIso: string, fuso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instanteIso));
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value;
  const ano = valor("year");
  const mes = valor("month");
  const dia = valor("day");
  if (!ano || !mes || !dia) return instanteIso.slice(0, 10);
  return `${ano}-${mes}-${dia}`;
}

/** Diferença em dias civis, sem depender do fuso configurado no dispositivo. */
export function diasEntreDatas(dataInicial: string, dataFinal: string): number {
  const validar = (data: string) => /^\d{4}-\d{2}-\d{2}$/.test(data);
  if (!validar(dataInicial) || !validar(dataFinal)) return 0;
  const inicio = Date.parse(`${dataInicial}T00:00:00.000Z`);
  const fim = Date.parse(`${dataFinal}T00:00:00.000Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return 0;
  return Math.max(0, Math.floor((fim - inicio) / 86_400_000));
}

export const FAIXAS_IDADE_FIADO = [
  { rotulo: "0–30 dias", minimo: 0, maximo: 30 },
  { rotulo: "31–60 dias", minimo: 31, maximo: 60 },
  { rotulo: "61–90 dias", minimo: 61, maximo: 90 },
  { rotulo: "91+ dias", minimo: 91, maximo: null },
] as const;

export type FaixaIdadeFiado = (typeof FAIXAS_IDADE_FIADO)[number]["rotulo"];

export function classificarIdadeFiado(dias: number): FaixaIdadeFiado {
  const idade = Number.isFinite(dias) ? Math.max(0, Math.floor(dias)) : 0;
  if (idade <= 30) return "0–30 dias";
  if (idade <= 60) return "31–60 dias";
  if (idade <= 90) return "61–90 dias";
  return "91+ dias";
}

export function rotuloIdadeFiado(dias: number): string {
  const idade = Number.isFinite(dias) ? Math.max(0, Math.floor(dias)) : 0;
  if (idade === 0) return "Hoje";
  if (idade === 1) return "Há 1 dia";
  return `Há ${idade} dias`;
}

/** Percentual arredondado; null significa que não existe base para comparar com zero. */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return atual === 0 ? 0 : null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
}
