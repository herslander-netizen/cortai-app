import type { AcaoCard } from "./ListaAgenda";

export type EfeitoAcaoCard = "marcar_chegada" | "comecar" | "abrir_comanda";

/** Traduz a ação visual do cartão para o fluxo operacional correspondente. */
export function efeitoDaAcaoCard(acao: AcaoCard): EfeitoAcaoCard {
  if (acao === "chegou") return "marcar_chegada";
  if (acao === "iniciar") return "comecar";
  return "abrir_comanda";
}