import { describe, expect, it } from "vitest";
import { contarClientesCRM, filtrarClientesCRM, type SegmentoClientesCRM } from "./segmentacao-clientes";

const clientes = [
  { id: "1", nome: "Ana Lima", status: "novo", horaDeVoltar: false },
  { id: "2", nome: "Bruno Alves", status: "recorrente", horaDeVoltar: false },
  { id: "3", nome: "Carla Souza", status: "em_retorno", horaDeVoltar: true },
  { id: "4", nome: "Daniel Costa", status: "inativo", horaDeVoltar: false },
  { id: "5", nome: "Amanda Reis", status: "em_retorno", horaDeVoltar: true },
] as const;

describe("segmentação do CRM", () => {
  it("conta os clientes por status", () => {
    expect(contarClientesCRM(clientes)).toEqual({ todos: 5, novo: 1, recorrente: 1, em_retorno: 2, inativo: 1 });
  });
  it("filtra status e preserva a lista original", () => {
    expect(filtrarClientesCRM(clientes, { busca: "", segmento: "em_retorno", soHoraDeVoltar: false }).map(c => c.id)).toEqual(["3", "5"]);
    expect(clientes).toHaveLength(5);
  });
  it("combina busca, segmento e hora de voltar", () => {
    expect(filtrarClientesCRM(clientes, { busca: " AMANDA ", segmento: "em_retorno", soHoraDeVoltar: true }).map(c => c.id)).toEqual(["5"]);
  });
  it("mantém hora de voltar com segmento Todos", () => {
    const segmento: SegmentoClientesCRM = "todos";
    expect(filtrarClientesCRM(clientes, { busca: "", segmento, soHoraDeVoltar: true }).map(c => c.id)).toEqual(["3", "5"]);
  });
});
