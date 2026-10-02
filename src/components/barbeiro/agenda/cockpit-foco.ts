import type { AgendaItem } from "@/lib/barbeiro.functions";

import { estaAtrasado, hora, minutosDecorridos, tempoExcedido } from "./tempo";

const FORA = new Set(["cancelado", "remarcado", "nao_compareceu"]);

export type EstadoCockpit =
  | "proximo"
  | "chegou"
  | "na_cadeira"
  | "passou_do_tempo"
  | "atrasado"
  | "receber"
  | "livre"
  | "encerrado";

export type DadosCockpit = {
  estado: EstadoCockpit;
  principal: AgendaItem | null;
  proximo: AgendaItem | null;
  depois: AgendaItem[];
  concluidos: number;
  pelaFrente: number;
  decorrido: number;
  restante: number;
  excedido: string | null;
  progresso: number;
  rotulo: string;
  termino: string | null;
};

function ordenar(itens: AgendaItem[]) {
  return [...itens].sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio));
}

export function dadosDoCockpit(
  itens: AgendaItem[],
  agora: number,
  fuso: string | undefined,
  pagamentosPendentes = new Set<string>(),
): DadosCockpit {
  const ordenados = ordenar(itens);
  const concluidos = ordenados.filter((item) => item.status === "finalizado").length;
  const abertos = ordenados.filter((item) => !FORA.has(item.status) && item.status !== "finalizado");
  const naCadeira = abertos.find((item) => item.status === "na_cadeira");
  const chegou = abertos.find((item) => item.status === "chegou");
  const atrasado = abertos.find((item) => estaAtrasado(item, agora));
  const futuro = abertos.find((item) => +new Date(item.inicio) > agora);
  const pendente = [...ordenados]
    .reverse()
    .find((item) => item.status === "finalizado" && pagamentosPendentes.has(item.id));
  const principal = naCadeira ?? chegou ?? atrasado ?? futuro ?? pendente ?? null;
  const proximos = abertos.filter(
    (item) => item.id !== principal?.id && +new Date(item.inicio) > agora,
  );
  const proximo = proximos[0] ?? null;
  const pelaFrente = abertos.filter(
    (item) => item.id !== naCadeira?.id && +new Date(item.fim) > agora,
  ).length;
  const decorrido = naCadeira
    ? minutosDecorridos(naCadeira.startedAt ?? naCadeira.inicio, agora)
    : 0;
  const restante = naCadeira ? Math.max(0, naCadeira.duracaoMin - decorrido) : 0;
  const passou = Boolean(naCadeira && decorrido > naCadeira.duracaoMin);
  const estado: EstadoCockpit = naCadeira
    ? passou
      ? "passou_do_tempo"
      : "na_cadeira"
    : chegou
      ? "chegou"
      : atrasado
        ? "atrasado"
        : futuro
          ? "proximo"
          : pendente
            ? "receber"
            : abertos.length || ordenados.length === 0
              ? "livre"
              : "encerrado";
  const rotulos: Record<EstadoCockpit, string> = {
    proximo: futuro
      ? `PRÓXIMO EM ${Math.max(0, Math.ceil((+new Date(futuro.inicio) - agora) / 60_000))} MIN`
      : "PRÓXIMO",
    chegou: chegou
      ? `CHEGOU · AGUARDANDO ${minutosDecorridos(chegou.arrivedAt ?? chegou.inicio, agora)} MIN`
      : "CHEGOU",
    na_cadeira: "NA CADEIRA",
    passou_do_tempo: "PASSOU DO TEMPO",
    atrasado: atrasado
      ? `ATRASADO ${Math.max(0, Math.floor((agora - +new Date(atrasado.inicio)) / 60_000))} MIN`
      : "ATRASADO",
    receber: "PAGAMENTO PENDENTE",
    livre: futuro ? `LIVRE ATÉ ${hora(futuro.inicio, fuso)}` : "LIVRE",
    encerrado: `DIA ENCERRADO · ${concluidos} ${concluidos === 1 ? "ATENDIMENTO" : "ATENDIMENTOS"}`,
  };
  return {
    estado,
    principal,
    proximo,
    depois: proximos.slice(1, 3),
    concluidos,
    pelaFrente,
    decorrido,
    restante,
    excedido: passou && naCadeira ? tempoExcedido(decorrido, naCadeira.duracaoMin) : null,
    progresso: naCadeira ? Math.min(1, decorrido / Math.max(1, naCadeira.duracaoMin)) : 0,
    rotulo: rotulos[estado],
    termino: principal ? hora(principal.fim, fuso) : null,
  };
}

export function situacaoDoLembrete(item: AgendaItem) {
  return item.confirmadoEm ? "Confirmou pelo WhatsApp" : "Sem resposta";
}