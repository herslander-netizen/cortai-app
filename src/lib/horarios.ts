/**
 * Geração de horários da barbearia — sem valores fixos e sem deslocamento de fuso.
 *
 * O horário que a barbearia cadastra é sempre "hora de parede" no fuso da
 * barbearia. Converter isso para ISO usando `new Date("2026-09-21T09:00:00")`
 * usa o fuso de quem executa (no servidor, UTC) e desloca a agenda.
 * Aqui a conversão é explícita.
 */
export const FUSO_BARBEARIA = "America/Sao_Paulo";

/** Fusos usados no Brasil, na ordem em que aparecem no painel. */
export const FUSOS_DA_BARBEARIA = [
  { valor: "America/Sao_Paulo", rotulo: "Brasília, São Paulo, Sul e Sudeste (UTC-3)" },
  { valor: "America/Bahia", rotulo: "Bahia e Nordeste (UTC-3)" },
  { valor: "America/Fortaleza", rotulo: "Ceará, Piauí, Rio Grande do Norte (UTC-3)" },
  { valor: "America/Belem", rotulo: "Pará e Amapá (UTC-3)" },
  { valor: "America/Maceio", rotulo: "Alagoas e Sergipe (UTC-3)" },
  { valor: "America/Manaus", rotulo: "Amazonas e Roraima (UTC-4)" },
  { valor: "America/Cuiaba", rotulo: "Mato Grosso (UTC-4)" },
  { valor: "America/Campo_Grande", rotulo: "Mato Grosso do Sul (UTC-4)" },
  { valor: "America/Porto_Velho", rotulo: "Rondônia (UTC-4)" },
  { valor: "America/Rio_Branco", rotulo: "Acre (UTC-5)" },
  { valor: "America/Noronha", rotulo: "Fernando de Noronha (UTC-2)" },
] as const;

/** Só aceita um fuso conhecido; qualquer outro valor cai no padrão. */
export function normalizarFuso(valor: string | null | undefined): string {
  const achado = FUSOS_DA_BARBEARIA.find((f) => f.valor === valor);
  return achado ? achado.valor : FUSO_BARBEARIA;
}

export type HorarioDeFuncionamento = {
  diaSemana: number;
  fechado: boolean;
  abre: string; // HH:MM
  fecha: string; // HH:MM
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
};

/** Intervalo substituto válido apenas para uma data específica do negócio. */
export type ExcecaoIntervaloAgenda = {
  dia: string;
  intervaloInicio: string | null;
  intervaloFim: string | null;
};

/**
 * Aplica uma exceção diária à cópia das regras semanais usada para um único dia.
 * Sem exceção, o expediente recorrente permanece inalterado.
 */
export function aplicarExcecaoDeIntervalo(
  horarios: HorarioDeFuncionamento[],
  dia: string,
  excecao?: ExcecaoIntervaloAgenda | null,
): HorarioDeFuncionamento[] {
  if (!excecao || excecao.dia !== dia) return horarios;
  const semana = diaDaSemanaDoDia(dia);
  return horarios.map((horario) =>
    horario.diaSemana === semana
      ? {
          ...horario,
          intervaloInicio: excecao.intervaloInicio,
          intervaloFim: excecao.intervaloFim,
        }
      : horario,
  );
}

export type SlotDaAgenda = { iso: string; label: string; minutos: number; hora: number };

const ABERTURA_PADRAO = "09:00";
const FECHAMENTO_PADRAO = "19:00";

function deslocamento(instante: Date, fuso: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);
  const v: Record<string, number> = {};
  for (const p of partes) if (p.type !== "literal") v[p.type] = Number(p.value);
  const comoUtc = Date.UTC(
    v["year"] ?? 1970,
    (v["month"] ?? 1) - 1,
    v["day"] ?? 1,
    (v["hour"] ?? 0) % 24,
    v["minute"] ?? 0,
    v["second"] ?? 0,
  );
  return comoUtc - instante.getTime();
}

/** Converte "2026-09-21" + "09:00" (hora local da barbearia) no ISO real em UTC. */
export function isoNoFusoDaBarbearia(
  dia: string,
  hhmm: string,
  fuso: string = FUSO_BARBEARIA,
): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  const palpite = Date.UTC(ano ?? 1970, (mes ?? 1) - 1, d ?? 1, h ?? 0, m ?? 0);
  let real = palpite - deslocamento(new Date(palpite), fuso);
  real = palpite - deslocamento(new Date(real), fuso);
  return new Date(real).toISOString();
}

export function diaDaSemanaDoDia(dia: string): number {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, d ?? 1)).getUTCDay();
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function normalizar(valor: string | null | undefined, padrao: string): string {
  return typeof valor === "string" && /^\d{2}:\d{2}/.test(valor) ? valor.slice(0, 5) : padrao;
}

/** Fechamento em minutos; fecha ≤ abre (ex.: 00:00, 02:00) significa depois da meia-noite. */
export function fimEmMinutos(abre: string, fecha: string): number {
  const a = minutos(abre);
  const f = minutos(fecha);
  return f <= a ? f + 1440 : f;
}

/** Soma dias a "AAAA-MM-DD". */
export function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const x = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, (d ?? 1) + n));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

/** true quando nenhum dia da semana está aberto (inclui barbearia sem horário cadastrado). */
export function semNenhumDiaAberto(horarios: HorarioDeFuncionamento[] | undefined | null): boolean {
  return !(horarios ?? []).some((h) => !h.fechado);
}

export function horarioDoDia(
  dia: string,
  horarios: HorarioDeFuncionamento[] | undefined | null,
): {
  fechado: boolean;
  abre: string;
  fecha: string;
  intervaloInicio: string | null;
  intervaloFim: string | null;
} {
  const semana = diaDaSemanaDoDia(dia);
  const achado = (horarios ?? []).find((h) => h.diaSemana === semana);
  // Dia sem horário cadastrado = FECHADO. Nunca abrimos a agenda por suposição.
  if (!achado)
    return {
      fechado: true,
      abre: ABERTURA_PADRAO,
      fecha: FECHAMENTO_PADRAO,
      intervaloInicio: null,
      intervaloFim: null,
    };
  const temIntervalo = Boolean(achado.intervaloInicio && achado.intervaloFim);
  return {
    fechado: Boolean(achado.fechado),
    abre: normalizar(achado.abre, ABERTURA_PADRAO),
    fecha: normalizar(achado.fecha, FECHAMENTO_PADRAO),
    intervaloInicio: temIntervalo ? normalizar(achado.intervaloInicio, "") : null,
    intervaloFim: temIntervalo ? normalizar(achado.intervaloFim, "") : null,
  };
}

/** Slots reais do dia, a partir do horário cadastrado da barbearia. */
export function slotsDoDia(
  dia: string,
  horarios: HorarioDeFuncionamento[] | undefined | null,
  passoMin = 30,
  fuso: string = FUSO_BARBEARIA,
): {
  fechado: boolean;
  abre: string;
  fecha: string;
  intervaloInicio: string | null;
  intervaloFim: string | null;
  slots: SlotDaAgenda[];
} {
  const info = horarioDoDia(dia, horarios);
  if (info.fechado) return { ...info, slots: [] };
  const inicio = minutos(info.abre);
  const fim = fimEmMinutos(info.abre, info.fecha);
  const slots: SlotDaAgenda[] = [];
  const pausaIni = info.intervaloInicio ? minutos(info.intervaloInicio) : null;
  const pausaFim = info.intervaloFim ? minutos(info.intervaloFim) : null;
  for (let t = inicio; t + passoMin <= fim; t += passoMin) {
    if (pausaIni != null && pausaFim != null && t < pausaFim && t + passoMin > pausaIni) continue;
    const tt = t % 1440;
    const h = Math.floor(tt / 60);
    const m = tt % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const diaAlvo = t >= 1440 ? somarDias(dia, 1) : dia;
    slots.push({ iso: isoNoFusoDaBarbearia(diaAlvo, label, fuso), label, minutos: t, hora: h });
  }
  return { ...info, slots };
}

/** "Hoje" (AAAA-MM-DD) no fuso da barbearia, nunca no relógio do aparelho. */
export function hojeNoFuso(fuso: string = FUSO_BARBEARIA, instante: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizarFuso(fuso),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** Meia-noite (início do dia) da barbearia para o instante dado, como Date UTC. */
export function inicioDoDiaNoFuso(
  fuso: string = FUSO_BARBEARIA,
  instante: Date = new Date(),
): Date {
  const f = normalizarFuso(fuso);
  return new Date(isoNoFusoDaBarbearia(hojeNoFuso(f, instante), "00:00", f));
}

/** Dia 1 do mês corrente da barbearia, 00:00 no fuso dela. */
export function inicioDoMesNoFuso(
  fuso: string = FUSO_BARBEARIA,
  instante: Date = new Date(),
): Date {
  const f = normalizarFuso(fuso);
  return new Date(isoNoFusoDaBarbearia(`${hojeNoFuso(f, instante).slice(0, 8)}01`, "00:00", f));
}
