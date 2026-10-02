import type { AgendaItem } from "@/lib/barbeiro.functions";

export type AlertaEmergencia = {
  id: string;
  tipo: "sem_internet" | "proximo_mudou" | "atraso";
  texto: string;
  dispensavel: boolean;
};

export function mesclarAlertasPersistentes(
  atuais: AlertaEmergencia[],
  detectados: AlertaEmergencia[],
  online: boolean,
) {
  const mapa = new Map(atuais.map((alerta) => [alerta.id, alerta]));
  if (online) mapa.delete("sem-internet");
  for (const alerta of detectados) mapa.set(alerta.id, alerta);
  return [...mapa.values()].slice(0, 2);
}

type Entrada = {
  itens: AgendaItem[];
  itensAnteriores: AgendaItem[];
  agora: number;
  online: boolean;
  dispensados?: Set<string>;
  fuso?: string | undefined;
};
const FORA = new Set(["cancelado", "remarcado", "nao_compareceu", "finalizado"]);
const ordenar = (itens: AgendaItem[]) =>
  [...itens].sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio));
const atuais = (itens: AgendaItem[]) => {
  const abertos = ordenar(itens).filter((i) => !FORA.has(i.status));
  const principal =
    abertos.find((i) => i.status === "na_cadeira") ??
    abertos.find((i) => i.status === "chegou") ??
    abertos[0];
  return [principal, abertos.find((i) => i.id !== principal?.id)].filter(Boolean) as AgendaItem[];
};
const nome = (item: AgendaItem) => item.cliente.split(" ")[0] || "Cliente";
const hora = (iso: string, fuso?: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });

export function alertasDeEmergencia({
  itens,
  itensAnteriores,
  agora,
  online,
  dispensados = new Set(),
  fuso,
}: Entrada) {
  const alertas: AlertaEmergencia[] = [];
  if (!online)
    alertas.push({
      id: "sem-internet",
      tipo: "sem_internet",
      texto: "Sem internet · a agenda pode estar desatualizada",
      dispensavel: false,
    });
  const idsRelevantes = new Set(atuais(itensAnteriores).map((i) => i.id));
  for (const anterior of itensAnteriores.filter((i) => idsRelevantes.has(i.id))) {
    const atual = itens.find((i) => i.id === anterior.id);
    if (!atual) continue;
    let texto: string | null = null;
    if (atual.status !== anterior.status && atual.status === "cancelado")
      texto = `${nome(atual)} cancelou`;
    else if (atual.status !== anterior.status && atual.status === "remarcado")
      texto = `${nome(atual)} remarcou para ${hora(atual.inicio, fuso)}`;
    else if (atual.status === "nao_compareceu" && anterior.status !== atual.status)
      texto = `${nome(atual)} marcou falta`;
    else if (atual.inicio !== anterior.inicio)
      texto = `${nome(atual)}: horário mudou para ${hora(atual.inicio, fuso)}`;
    if (texto) {
      const id = `mudou:${atual.id}:${atual.status}:${atual.inicio}`;
      if (!dispensados.has(id))
        alertas.push({ id, tipo: "proximo_mudou", texto, dispensavel: true });
      break;
    }
  }
  const abertos = ordenar(itens).filter((i) => !FORA.has(i.status));
  const ativo = abertos.find((i) => i.status === "na_cadeira");
  const proximo = abertos.find((i) => i.id !== ativo?.id);
  if (ativo && proximo && agora > +new Date(ativo.fim)) {
    const desde =
      proximo.status === "chegou"
        ? +new Date(proximo.arrivedAt ?? proximo.inicio)
        : +new Date(proximo.inicio);
    const minutos = Math.floor((agora - desde) / 60_000);
    if (minutos >= 5)
      alertas.push({
        id: `atraso:${proximo.id}`,
        tipo: "atraso",
        texto: `${nome(proximo)} aguarda há ${minutos} min`,
        dispensavel: false,
      });
  }
  return alertas.slice(0, 2);
}
