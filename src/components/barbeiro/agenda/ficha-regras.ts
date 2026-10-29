import type { AgendaItem } from "@/lib/barbeiro.functions";

/**
 * Regras da ficha do atendimento, como no Figaro (`AppointmentDashboardDockedActions`, APK
 * lido em 18/10): um botão principal à direita e a seta com as outras ações, conforme o estado.
 * O Cortaí tem etapas que o Figaro não tinha (cliente chegou → começar → finalizar); elas entram
 * no lugar do "Cobrar" do Figaro quando o horário já começou, e na seta antes disso.
 */
export type AcaoDaFicha =
  "reagendar" | "chegou" | "comecar" | "finalizar" | "cobrar" | "comanda" | "falta" | "cancelar";

export type RodapeDaFicha = { principal: AcaoDaFicha | null; menu: AcaoDaFicha[] };

const PENDENTES = new Set(["agendado", "chegou"]);

/** Próxima etapa do atendimento no Cortaí. */
function etapa(status: string): AcaoDaFicha | null {
  if (status === "agendado") return "chegou";
  if (status === "chegou") return "comecar";
  if (status === "na_cadeira") return "finalizar";
  return null;
}

export function jaComecou(item: Pick<AgendaItem, "inicio" | "status">, agora: number) {
  return item.status === "na_cadeira" || new Date(item.inicio).getTime() <= agora;
}

export function rodapeDaFicha(
  item: Pick<AgendaItem, "inicio" | "status">,
  agora: number,
): RodapeDaFicha {
  const pendente = PENDENTES.has(item.status);
  if (item.status === "na_cadeira") return { principal: "finalizar", menu: ["comanda"] };
  if (pendente && jaComecou(item, agora)) {
    // Figaro: "Cobrar" + [Reagendar, Não compareceu]. No Cortaí a etapa do momento é o principal.
    return { principal: etapa(item.status), menu: ["reagendar", "falta", "cobrar", "comanda"] };
  }
  if (pendente) {
    // Figaro: "Reagendar" + [Cancelar agendamento]. A chegada antes da hora fica na seta.
    const passo = etapa(item.status);
    return {
      principal: "reagendar",
      menu: [...(passo ? [passo] : []), "cobrar", "comanda", "cancelar"],
    };
  }
  // Figaro: concluído com venda = "Ver recibo"; cancelado e falta = nada.
  if (item.status === "finalizado") return { principal: "comanda", menu: ["cobrar"] };
  return { principal: null, menu: [] };
}

/**
 * "Trocar cliente" enquanto o atendimento não começou de fato (agendado ou cliente chegou), mesmo com o horário já
 * passado — a mesma regra de `trocarClienteDoAgendamento`, que ainda recusa se houver pagamento ou comanda (dono,
 * 29/10: o botão sumia da ficha de horários passados ainda pendentes).
 */
export function podeTrocarCliente(item: Pick<AgendaItem, "status">) {
  return PENDENTES.has(item.status);
}

export type IndicadorDeEstado = {
  rotulo: string;
  tom: "andamento" | "sucesso" | "aviso" | "erro" | "neutro";
};

/** Linha de estado da ficha (ícone + texto na cor do estado), como `StatusIndicatorRow`. */
export function indicadorDeEstado(
  item: Pick<AgendaItem, "inicio" | "fim" | "status" | "confirmadoEm">,
  agora: number,
  rotuloAtendimento: string,
): IndicadorDeEstado {
  const emCurso =
    PENDENTES.has(item.status) &&
    new Date(item.inicio).getTime() <= agora &&
    agora < new Date(item.fim).getTime();
  if (item.status === "na_cadeira") return { rotulo: rotuloAtendimento, tom: "andamento" };
  if (emCurso) return { rotulo: "Em andamento", tom: "andamento" };
  if (item.status === "chegou") return { rotulo: "Cliente chegou", tom: "andamento" };
  if (item.status === "agendado")
    return item.confirmadoEm
      ? { rotulo: "Confirmado", tom: "sucesso" }
      : { rotulo: "Agendado", tom: "aviso" };
  if (item.status === "finalizado") return { rotulo: "Concluído", tom: "neutro" };
  if (item.status === "nao_compareceu") return { rotulo: "Não compareceu", tom: "aviso" };
  if (item.status === "cancelado") return { rotulo: "Cancelado", tom: "erro" };
  if (item.status === "remarcado") return { rotulo: "Remarcado", tom: "neutro" };
  return { rotulo: item.status, tom: "neutro" };
}

/** "Hoje" ou a data média (ex.: "18 de out. de 2026"), no fuso do negócio. */
export function quandoDaFicha(inicio: string, fuso: string, hoje: string, dia: string) {
  if (dia === hoje) return "Hoje";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: fuso,
  }).format(new Date(inicio));
}

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Clientes agrupados pela letra inicial (sem acento), como no Figaro (`ClientGroup`). */
export function agruparPorLetra<T extends { nome: string }>(clientes: T[]) {
  const grupos = new Map<string, T[]>();
  for (const c of [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))) {
    const inicial = semAcento(c.nome.trim().charAt(0)).toUpperCase();
    const letra = /[A-Z]/.test(inicial) ? inicial : "#";
    const lista = grupos.get(letra);
    if (lista) lista.push(c);
    else grupos.set(letra, [c]);
  }
  return [...grupos.entries()].map(([letra, itens]) => ({ letra, itens }));
}
