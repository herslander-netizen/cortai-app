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
  { valor: "America/Manaus", rotulo: "Amazonas, Mato Grosso, Roraima (UTC-4)" },
  { valor: "America/Cuiaba", rotulo: "Mato Grosso e Mato Grosso do Sul (UTC-4)" },
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
};

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
export function isoNoFusoDaBarbearia(dia: string, hhmm: string, fuso: string = FUSO_BARBEARIA): string {
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

export function horarioDoDia(
  dia: string,
  horarios: HorarioDeFuncionamento[] | undefined | null,
): { fechado: boolean; abre: string; fecha: string } {
  const semana = diaDaSemanaDoDia(dia);
  const achado = (horarios ?? []).find((h) => h.diaSemana === semana);
  if (!achado) return { fechado: false, abre: ABERTURA_PADRAO, fecha: FECHAMENTO_PADRAO };
  return {
    fechado: Boolean(achado.fechado),
    abre: normalizar(achado.abre, ABERTURA_PADRAO),
    fecha: normalizar(achado.fecha, FECHAMENTO_PADRAO),
  };
}

/** Slots reais do dia, a partir do horário cadastrado da barbearia. */
export function slotsDoDia(
  dia: string,
  horarios: HorarioDeFuncionamento[] | undefined | null,
  passoMin = 30,
): { fechado: boolean; abre: string; fecha: string; slots: SlotDaAgenda[] } {
  const info = horarioDoDia(dia, horarios);
  if (info.fechado) return { ...info, slots: [] };
  const inicio = minutos(info.abre);
  const fim = minutos(info.fecha);
  const slots: SlotDaAgenda[] = [];
  for (let t = inicio; t + passoMin <= fim; t += passoMin) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ iso: isoNoFusoDaBarbearia(dia, label), label, minutos: t, hora: h });
  }
  return { ...info, slots };
}
