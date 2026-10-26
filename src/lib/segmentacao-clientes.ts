import type { ClienteCRM } from "@/lib/crescimento.functions";

export type SegmentoClientesCRM = "todos" | ClienteCRM["status"];
export const SEGMENTOS_CLIENTES: ReadonlyArray<{ valor: SegmentoClientesCRM; texto: string }> = [
  { valor: "todos", texto: "Todos" },
  { valor: "novo", texto: "Novos" },
  { valor: "recorrente", texto: "Recorrentes" },
  { valor: "em_retorno", texto: "Em retorno" },
  { valor: "inativo", texto: "Inativos" },
];

type ClienteSegmentavel = Pick<ClienteCRM, "nome" | "status" | "horaDeVoltar">;

export function filtrarClientesCRM<T extends ClienteSegmentavel>(
  clientes: readonly T[],
  filtros: { busca: string; segmento: SegmentoClientesCRM; soHoraDeVoltar: boolean },
): T[] {
  const termo = filtros.busca.trim().toLocaleLowerCase("pt-BR");
  return clientes.filter((cliente) =>
    cliente.nome.toLocaleLowerCase("pt-BR").includes(termo) &&
    (filtros.segmento === "todos" || cliente.status === filtros.segmento) &&
    (!filtros.soHoraDeVoltar || cliente.horaDeVoltar),
  );
}

export function contarClientesCRM(
  clientes: readonly Pick<ClienteCRM, "status">[],
): Record<SegmentoClientesCRM, number> {
  const contagens: Record<SegmentoClientesCRM, number> = {
    todos: clientes.length, novo: 0, recorrente: 0, em_retorno: 0, inativo: 0,
  };
  for (const cliente of clientes) contagens[cliente.status] += 1;
  return contagens;
}
