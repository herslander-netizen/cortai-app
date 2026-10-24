import { diaDaSemanaDoDia, isoNoFusoDaBarbearia, somarDias } from "@/lib/horarios";

export const PERIODOS = [
  { id: "hoje", nome: "Hoje" },
  { id: "semana", nome: "Esta semana" },
  { id: "mes", nome: "Este mês" },
  { id: "ano", nome: "Este ano" },
  { id: "ultimos7", nome: "Últimos 7 dias" },
  { id: "ultimos30", nome: "Últimos 30 dias" },
  { id: "tudo", nome: "Todo o período" },
  { id: "proximos7", nome: "Próximos 7 dias" },
  { id: "proximos30", nome: "Próximos 30 dias" },
  { id: "futuros", nome: "Todos os futuros" },
  { id: "personalizado", nome: "Personalizar…" },
] as const;
export type PeriodoId = (typeof PERIODOS)[number]["id"];
export const periodoIds = PERIODOS.map((p) => p.id) as [PeriodoId, ...PeriodoId[]];

export const MAXIMO_DO_PERIODO_PERSONALIZADO_DIAS = 366;

export type Intervalo = { inicio: string | null; fim: string | null };

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/**
 * Intervalo [inicio, fim) em UTC para o período escolhido, com os dias contados no fuso do negócio.
 * `hoje` é AAAA-MM-DD no fuso do negócio; `null` numa ponta significa sem limite.
 * Devolve `null` quando o período personalizado é inválido (datas ausentes, invertidas ou maiores que 1 ano).
 */
export function intervaloDoPeriodo(
  periodo: PeriodoId,
  hoje: string,
  fuso: string,
  de?: string,
  ate?: string,
): Intervalo | null {
  const iso = (dia: string) => isoNoFusoDaBarbearia(dia, "00:00", fuso);
  const entre = (primeiro: string, ultimo: string): Intervalo => ({
    inicio: iso(primeiro),
    fim: iso(somarDias(ultimo, 1)),
  });
  switch (periodo) {
    case "hoje":
      return entre(hoje, hoje);
    case "semana": {
      const segunda = somarDias(hoje, -((diaDaSemanaDoDia(hoje) + 6) % 7));
      return entre(segunda, somarDias(segunda, 6));
    }
    case "mes": {
      const primeiro = `${hoje.slice(0, 8)}01`;
      const proximoMes = somarDias(primeiro, 32).slice(0, 8) + "01";
      return { inicio: iso(primeiro), fim: iso(proximoMes) };
    }
    case "ano":
      return {
        inicio: iso(`${hoje.slice(0, 4)}-01-01`),
        fim: iso(`${Number(hoje.slice(0, 4)) + 1}-01-01`),
      };
    case "ultimos7":
      return entre(somarDias(hoje, -6), hoje);
    case "ultimos30":
      return entre(somarDias(hoje, -29), hoje);
    case "tudo":
      return { inicio: null, fim: null };
    case "proximos7":
      return entre(hoje, somarDias(hoje, 6));
    case "proximos30":
      return entre(hoje, somarDias(hoje, 29));
    case "futuros":
      return { inicio: iso(hoje), fim: null };
    case "personalizado": {
      if (!de || !ate || !DIA.test(de) || !DIA.test(ate)) return null;
      const dias = diasEntre(de, ate);
      if (dias < 0 || dias + 1 > MAXIMO_DO_PERIODO_PERSONALIZADO_DIAS) return null;
      return entre(de, ate);
    }
  }
}
