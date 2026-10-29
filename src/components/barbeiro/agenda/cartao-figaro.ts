import type { AgendaItem } from "@/lib/barbeiro.functions";
import { descreverOrigem } from "@/lib/origem-agendamento";

/**
 * Cartão da timeline como no Figaro (APK lido em 18/10; `docs/referencia-figaro/apk/2-agenda.md`).
 * Decisão do dono (18/10): seguir o Figaro — a barra lateral tem a cor da CATEGORIA do serviço, o
 * estado vira um ícone no canto e o título é o serviço.
 */

/** Paleta de categorias do Figaro (`ServiceCategoryColors`). */
export const CORES_DE_CATEGORIA = [
  "#B388FF", // AmethystBloom
  "#E53935", // CrimsonFlame
  "#43A047", // EmeraldMeadow
  "#00838F", // LagoonTeal
  "#EC407A", // RosyGlow
  "#1E88E5", // SaphireSkies
  "#607D8B", // SilverSlate
  "#FBC02D", // SunbeamGold
  "#FB8C00", // TangerineTwist
  "#26A69A", // TropicalTides
] as const;
export const COR_SEM_CATEGORIA = "#9E9E9E";

const chaveDaCategoria = (categoria: string | null | undefined) =>
  (categoria ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * No Flow a categoria é um texto livre (sem cor escolhida). As categorias do negócio, em ordem
 * alfabética, recebem as cores da paleta na ordem — até 10 categorias, cada uma com uma cor
 * diferente. O servidor manda a posição (`categoriaIndice`); sem ela, cinza.
 */
export function indiceDaCategoria(
  categoriasDoNegocio: (string | null | undefined)[],
  categoria: string | null | undefined,
) {
  const chave = chaveDaCategoria(categoria);
  if (!chave) return null;
  const ordem = [...new Set(categoriasDoNegocio.map(chaveDaCategoria).filter(Boolean))].sort();
  const i = ordem.indexOf(chave);
  return i < 0 ? null : i;
}

export function corDaCategoria(indice: number | null | undefined) {
  if (indice === null || indice === undefined || indice < 0) return COR_SEM_CATEGORIA;
  return CORES_DE_CATEGORIA[indice % CORES_DE_CATEGORIA.length]!;
}

/** Faixas do cartão por altura (`CardTier.forCard`): o que cabe em cada tamanho. */
export type FaixaDoCartao = "minimo" | "pequeno" | "medio" | "grande" | "maior";

export function faixaDoCartao(alturaPx: number, pxPorMinuto: number): FaixaDoCartao {
  const min = (minutos: number) => minutos * pxPorMinuto;
  if (alturaPx < min(15)) return "minimo";
  if (alturaPx < Math.max(min(30), 48)) return "pequeno";
  if (alturaPx < Math.max(min(45), 68)) return "medio";
  if (alturaPx < Math.max(min(60), 96)) return "grande";
  return "maior";
}

export const mostraHorario = (faixa: FaixaDoCartao) =>
  faixa === "medio" || faixa === "grande" || faixa === "maior";
export const mostraCliente = (faixa: FaixaDoCartao) => faixa === "grande" || faixa === "maior";
export const mostraDetalhes = (faixa: FaixaDoCartao) => faixa === "maior";

/** Ícone de estado no canto do cartão (`AgendaStatusGlyph`), com as etapas do Flow. */
export type GlifoDoEstado =
  | "confirmado"
  | "pendente-online"
  | "pendente-equipe"
  | "chegou"
  | "atendimento"
  | "atrasado"
  | "concluido"
  | "cancelado"
  | "falta";

export function glifoDoEstado(
  item: Pick<AgendaItem, "status" | "confirmadoEm" | "origem">,
  atrasado: boolean,
): GlifoDoEstado {
  if (item.status === "cancelado" || item.status === "remarcado") return "cancelado";
  if (item.status === "nao_compareceu") return "falta";
  if (item.status === "finalizado") return "concluido";
  if (item.status === "na_cadeira") return "atendimento";
  if (atrasado) return "atrasado";
  if (item.status === "chegou") return "chegou";
  if (item.confirmadoEm) return "confirmado";
  // Figaro: pendente online (relógio verde) × pela equipe (pessoa).
  return descreverOrigem(item.origem, false).icone === "manual"
    ? "pendente-equipe"
    : "pendente-online";
}

export const ROTULO_DO_GLIFO: Record<GlifoDoEstado, string> = {
  confirmado: "Confirmado",
  "pendente-online": "Agendado pelo cliente",
  "pendente-equipe": "Agendado pela equipe",
  chegou: "Cliente chegou",
  atendimento: "Em atendimento",
  atrasado: "Atrasado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  falta: "Não compareceu",
};

/**
 * Linhas de 5 em 5 minutos surgem apenas conforme o zoom aumenta (2,5 → 3,0 px/min).
 * Arrastar ou segurar um cartão não deve revelar a grade inteira de uma vez.
 */
export function opacidadeDasLinhasDe5(pxPorMinuto: number) {
  return Math.min(1, Math.max(0, (pxPorMinuto - 2.5) / 0.5));
}
