/**
 * Regras puras da lista da Agenda (dias, busca, títulos). Saíram do `ListaPeriodo` para ele ficar abaixo de 300
 * linhas; o `ListaPeriodo` reexporta tudo.
 */
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";

import { diaNoFuso } from "./tempo";

/** Até onde a lista vai buscando (um ano a partir de hoje). */
export const DIAS_NO_MAXIMO = 365;

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export function tituloDoDia(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  const numero = data.getUTCDate();
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(data);
  const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(
    data,
  );
  // Figaro (`AgendaListDayHeader`): "d MMM" — "28 out.".
  const mesCurto = mes.slice(0, 3);
  return {
    curto: `${numero} de ${mes}`,
    abreviado: `${numero} ${mesCurto}.`,
    semana: semana.charAt(0).toUpperCase() + semana.slice(1),
  };
}

/**
 * O modo Lista no celular tem uma âncora própria: começa na semana de hoje.
 * Ao entrar vindo da Timeline, a data do cabeçalho precisa acompanhar a Lista;
 * voltar para Timeline não deve alterar novamente o dia selecionado.
 */
export function diaAoAlternarParaLista(
  dia: string,
  hoje: string,
  anterior: "lista" | "timeline" | "semana",
  proxima: "lista" | "timeline" | "semana",
  celular: boolean,
): string {
  return celular && anterior !== "lista" && proxima === "lista" ? hoje : dia;
}

/** Busca por cliente, telefone (só os números), serviço ou profissional. */
export function correspondeABusca(item: AgendaItem, busca: string) {
  const termo = semAcento(busca.trim());
  if (!termo) return true;
  const digitos = termo.replace(/\D/g, "");
  if (digitos.length >= 3 && (item.telefone ?? "").replace(/\D/g, "").includes(digitos))
    return true;
  return [item.cliente, item.servico, item.profissional].some((campo) =>
    semAcento(campo).includes(termo),
  );
}

/** Valor curto como no Figaro ("R$ 50", e só mostra centavos quando há). */
export function valorCurto(centavos: number) {
  return centavos % 100 === 0 ? brl(centavos).replace(/,00$/, "") : brl(centavos);
}

/** Domingo da semana do dia (a lista busca desde ele, para mostrar os dias desta semana que já passaram). */
export function inicioDaSemana(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  return new Date(data.getTime() - data.getUTCDay() * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Como no Figaro (`populatedAgendaDays`, foto do dono, 31/10): do primeiro dia com atendimento (desta semana, ou
 * hoje) até o último, passando por todos os dias do meio, inclusive os vazios ("Livre" + "Nada marcado"). Com busca,
 * só os dias que têm resultado.
 */
export function diasDaLista(
  grupos: { dia: string; itens: AgendaItem[] }[],
  hoje: string,
  comBusca: boolean,
) {
  // A lista começa no primeiro atendimento desta semana (ou hoje).
  // Um registro antigo vindo de uma página de cache nunca pode fazer a
  // alternância Timeline → Lista saltar para o mês anterior (vídeo 09/11).
  // O histórico continua no perfil do cliente; não apagamos nem reescrevemos dados.
  const comecaNestaSemana = inicioDaSemana(hoje);
  const gruposAtuais = grupos.filter((grupo) => grupo.dia >= comecaNestaSemana);
  if (comBusca || gruposAtuais.length === 0) return gruposAtuais;
  const porDia = new Map(gruposAtuais.map((g) => [g.dia, g.itens]));
  const primeiro = gruposAtuais[0]!.dia < hoje ? gruposAtuais[0]!.dia : hoje;
  const ultimo = gruposAtuais[gruposAtuais.length - 1]!.dia > hoje
    ? gruposAtuais[gruposAtuais.length - 1]!.dia
    : hoje;
  const dias: { dia: string; itens: AgendaItem[] }[] = [];
  for (let n = 0; n <= Math.min(diasEntre(primeiro, ultimo), DIAS_NO_MAXIMO); n += 1) {
    const dia = new Date(Date.parse(`${primeiro}T12:00:00Z`) + n * 86_400_000)
      .toISOString()
      .slice(0, 10);
    dias.push({ dia, itens: porDia.get(dia) ?? [] });
  }
  return dias;
}

/** Agrupa por dia (no fuso do negócio), já em ordem de horário. */
export function agruparPorDia(itens: AgendaItem[], fuso: string) {
  const grupos = new Map<string, AgendaItem[]>();
  for (const item of [...itens].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const dia = diaNoFuso(item.inicio, fuso);
    const lista = grupos.get(dia);
    if (lista) lista.push(item);
    else grupos.set(dia, [item]);
  }
  return [...grupos.entries()].map(([dia, doDia]) => ({ dia, itens: doDia }));
}
