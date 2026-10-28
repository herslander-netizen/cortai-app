import type { KeyboardEvent } from "react";

import type { AgendaDia, AgendaItem } from "@/lib/barbeiro.functions";
import { horarioDoDia, type IntervalosPorData } from "@/lib/horarios";

export const TOLERANCIA_MIN = 15;
export const TERMINAIS = new Set(["finalizado", "cancelado", "remarcado", "nao_compareceu"]);
export const INATIVOS = new Set(["cancelado", "remarcado", "nao_compareceu"]);

export const ROTULO_ESTADO: Record<string, string> = {
  agendado: "Agendado",
  chegou: "Chegou",
  na_cadeira: "Na cadeira",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
  remarcado: "Remarcado",
};

export function somarDias(dia: string, passo: number) {
  const [ano, mes, data] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, data ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

export function dataEditorial(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  const semana = data
    .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .replace(".", "")
    .toUpperCase();
  const resto = data
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
    .replace(" de ", " ")
    .replace(".", "")
    .toUpperCase();
  return `${semana} · ${resto}`;
}

export function hora(iso: string, fuso?: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
}

export function diaNoFuso(iso: string | number, fuso?: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date(iso));
}

export function minutosDecorridos(inicio: string | null, agora: number) {
  return inicio ? Math.max(0, Math.floor((agora - new Date(inicio).getTime()) / 60_000)) : 0;
}

export function tempoExcedido(decorrido: number, previsto: number) {
  const excedido = Math.max(0, decorrido - previsto);
  if (excedido < 60) return `+${excedido} min excedido`;
  const horas = Math.floor(excedido / 60);
  return `+${horas}h${String(excedido % 60).padStart(2, "0")} excedido`;
}

export function fichaRelevante(texto: string | null) {
  if (!texto) return null;
  const trecho = texto.split(/[.!?\n]/).find((parte) => /alerg/i.test(parte));
  return trecho?.trim() || null;
}

export function nomeEhGenerico(nome: string) {
  return nome.trim().toLocaleLowerCase("pt-BR").startsWith("cliente avulso");
}

export function nomeDaAgenda(nome: string, discreto: boolean) {
  const limpo = nome.trim();
  if (!discreto || nomeEhGenerico(limpo)) return limpo;
  const partes = limpo.split(/\s+/).filter(Boolean);
  const primeiro = partes[0] ?? limpo;
  const sobrenome = partes[1];
  return sobrenome ? `${primeiro} ${sobrenome.charAt(0).toLocaleUpperCase("pt-BR")}.` : primeiro;
}

export function minutosDoHorario(valor: string) {
  const [h = 0, m = 0] = valor.split(":").map(Number);
  return h * 60 + m;
}

export function minutosNoFuso(valor: string | number, fuso?: string) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).formatToParts(new Date(valor));
  return (
    Number(partes.find((p) => p.type === "hour")?.value ?? 0) * 60 +
    Number(partes.find((p) => p.type === "minute")?.value ?? 0)
  );
}

export function estaAtrasado(item: AgendaItem, agora: number) {
  return (
    ["agendado", "confirmado"].includes(item.status) &&
    agora > new Date(item.inicio).getTime() + TOLERANCIA_MIN * 60_000
  );
}

type Horario = AgendaDia["horarios"][number];

export type FaixaForaDoExpediente = {
  inicio: number;
  fim: number;
  fechado?: boolean;
};

/** Altura ocupada pelas barras fixas acima da Agenda (o cabeçalho da Agenda só conta se fixo). */
export function alturaDoTopoDaAgenda() {
  const cabecalho = document.querySelector<HTMLElement>(".agenda-cabecalho-unico");
  const cabecalhoFixo = cabecalho && getComputedStyle(cabecalho).position === "sticky";
  return (
    (document.querySelector<HTMLElement>(".management-header")?.offsetHeight ?? 0) +
    (cabecalhoFixo ? cabecalho.offsetHeight : 0)
  );
}

/** Trechos visuais da escala que ficam fora do expediente do dia. */
export function faixasForaDoExpediente(
  horarios: Horario[],
  dia: string,
  escala: { inicio: number; fim: number },
): FaixaForaDoExpediente[] {
  if (horarios.length === 0 || escala.fim <= escala.inicio) return [];
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay();
  const horario = horarios.find((item) => item.diaSemana === dow);
  if (!horario || horario.fechado) {
    return [{ inicio: escala.inicio, fim: escala.fim, fechado: true }];
  }

  const abre = minutosDoHorario(horario.abre);
  const fecha = minutosDoHorario(horario.fecha);
  const faixas: FaixaForaDoExpediente[] = [];
  if (escala.inicio < abre) {
    faixas.push({ inicio: escala.inicio, fim: Math.min(abre, escala.fim) });
  }
  if (escala.fim > fecha) {
    faixas.push({ inicio: Math.max(fecha, escala.inicio), fim: escala.fim });
  }
  return faixas.filter((faixa) => faixa.fim > faixa.inicio);
}

/** Turnos do dia (o intervalo de almoço divide o expediente em dois). */
export function turnosDoDia(
  horarios: Horario[],
  dia: string,
  intervalosPorData?: IntervalosPorData,
): Array<[number, number]> {
  const h = horarioDoDia(dia, horarios, intervalosPorData);
  if (!h || h.fechado) return [];
  const abre = minutosDoHorario(h.abre);
  const fecha = minutosDoHorario(h.fecha);
  if (h.intervaloInicio && h.intervaloFim) {
    const ii = minutosDoHorario(h.intervaloInicio);
    const fi = minutosDoHorario(h.intervaloFim);
    if (ii > abre && fi < fecha && fi > ii)
      return [
        [abre, ii],
        [fi, fecha],
      ];
  }
  return [[abre, fecha]];
}

export function intervaloDoDia(
  horarios: Horario[],
  dia: string,
  intervalosPorData?: IntervalosPorData,
): [number, number] | null {
  const t = turnosDoDia(horarios, dia, intervalosPorData);
  return t.length === 2 ? [t[0]![1], t[1]![0]] : null;
}

/**
 * Vagas livres (no passo do negócio) considerando todos os turnos e os atendimentos
 * de cada profissional. Com vários profissionais, soma as vagas de cada um.
 */
export function contarLivres(p: {
  horarios: Horario[];
  dia: string;
  fuso: string;
  itens: AgendaItem[];
  profissionalIds: string[];
  passoMin: number;
  agora: number;
  ehHoje: boolean;
  intervalosPorData?: IntervalosPorData;
}) {
  const turnos = turnosDoDia(p.horarios, p.dia, p.intervalosPorData);
  if (!turnos.length) return 0;
  const passo = Math.max(5, p.passoMin);
  const minAgora = p.ehHoje ? Math.ceil(minutosNoFuso(p.agora, p.fuso) / passo) * passo : 0;
  const ids = p.profissionalIds.length ? p.profissionalIds : [null];
  let total = 0;
  for (const id of ids) {
    const ocupados = p.itens
      .filter((i) => !INATIVOS.has(i.status) && (id === null || i.profissionalId === id))
      .map((i) => [minutosNoFuso(i.inicio, p.fuso), minutosNoFuso(i.fim, p.fuso)] as const);
    for (const [ini, fim] of turnos)
      for (let m = Math.max(ini, minAgora); m + passo <= fim; m += passo)
        if (!ocupados.some(([a, b]) => m < b && m + passo > a)) total++;
  }
  return total;
}

export function resumoOperacional(itens: AgendaItem[]) {
  return {
    aFazer: itens.filter((i) => i.status === "agendado" || i.status === "chegou").length,
    emAtendimento: itens.filter((i) => i.status === "na_cadeira").length,
    finalizados: itens.filter((i) => i.status === "finalizado").length,
  };
}

const OCUPANDO_AGORA = new Set(["agendado", "chegou", "na_cadeira"]);

export function disponibilidadeHoje(p: {
  itens: AgendaItem[];
  horarios: AgendaDia["horarios"];
  dia: string;
  fuso: string;
  profissionalIds: string[];
  agora: number;
  intervalosPorData?: IntervalosPorData;
}) {
  const minuto = minutosNoFuso(p.agora, p.fuso);
  if (
    !turnosDoDia(p.horarios, p.dia, p.intervalosPorData).some(
      ([inicio, fim]) => minuto >= inicio && minuto < fim,
    )
  )
    return null;
  const ocupado = (id: string) =>
    p.itens.some(
      (item) =>
        item.profissionalId === id &&
        OCUPANDO_AGORA.has(item.status) &&
        new Date(item.inicio).getTime() <= p.agora &&
        p.agora < new Date(item.fim).getTime(),
    );
  if (p.profissionalIds.length > 1) {
    const livres = p.profissionalIds.filter((id) => !ocupado(id)).length;
    return livres ? `${livres} ${livres === 1 ? "livre" : "livres"} agora` : null;
  }
  const id = p.profissionalIds[0];
  if (id && ocupado(id)) return null;
  const proximo = p.itens
    .filter(
      (item) =>
        (!id || item.profissionalId === id) &&
        OCUPANDO_AGORA.has(item.status) &&
        new Date(item.inicio).getTime() > p.agora,
    )
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];
  return proximo ? `livre até ${hora(proximo.inicio, p.fuso)}` : "livre agora";
}

export function linkWhatsApp(telefone: string | null | undefined, texto?: string) {
  let d = String(telefone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function teclaDeAtivar(f: () => void) {
  return (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      f();
    }
  };
}
