import { describe, expect, it } from "vitest";
import { calcularOportunidadesCRM } from "./oportunidades";

const HOJE = new Date("2026-11-08T12:00:00Z");
const cliente = (id: string) => ({ id, nome: "Cliente " + id });
const feito = (id: string | null, inicio: string, retornoDias: number | null = 30, status = "finalizado") => ({
  clienteId: id, inicio, retornoDias, status, servico: "Serviço teste",
});
const futuro = (id: string, inicio: string, status: string) => ({ clienteId: id, inicio, status });

describe("oportunidades verificáveis de retorno no CRM", () => {
  it("sem histórico finalizado não inventa oportunidades", () => {
    const r = calcularOportunidadesCRM([cliente("1")], [
      feito("1", "2026-09-01T12:00:00Z", 30, "cancelado"),
      feito("1", "2026-08-01T12:00:00Z", 30, "nao_compareceu"),
      feito("1", "2026-11-09T12:00:00Z"),
    ], [], HOJE);
    expect(r.total).toBe(0);
  });
  it("usa o último finalizado e o prazo específico do serviço", () => {
    const r = calcularOportunidadesCRM([cliente("1")], [
      feito("1", "2026-07-10T12:00:00Z"),
      feito("1", "2026-10-20T12:00:00Z", 15),
    ], [], HOJE);
    expect(r.emRetorno).toBe(1);
    expect(r.oportunidades[0]?.atrasoDias).toBe(4);
  });
  it("exclui cliente com futuro ativo, mas não com cancelado", () => {
    const feitos=[feito("1", "2026-10-01T12:00:00Z"), feito("2","2026-10-01T12:00:00Z")];
    const r = calcularOportunidadesCRM([cliente("1"), cliente("2")], feitos, [
      futuro("1", "2026-11-11T12:00:00Z", "agendado"),
      futuro("2", "2026-11-11T12:00:00Z", "cancelado"),
    ], HOJE);
    expect(r.comHorarioFuturo).toBe(1);
    expect(r.total).toBe(1);
    expect(r.oportunidades[0]?.clienteId).toBe("2");
  });
  it("separa inativos com mais de 30 dias e inclui atrasos de retorno atuais", () => {
    const r = calcularOportunidadesCRM([cliente("1"), cliente("2")], [
      feito("1", "2026-08-01T12:00:00Z"),
      feito("2", "2026-10-01T12:00:00Z"),
    ], [], HOJE);
    expect(r.inativos).toBe(1);
    expect(r.emRetorno).toBe(1);
    expect(r.oportunidades[0]?.situacao).toBe("inativo");
  });
  it("não duplica cliente com várias visitas; limita itens sem falsificar totais", () => {
    const r = calcularOportunidadesCRM([cliente("1"), cliente("2")], [
      feito("1", "2026-09-01T12:00:00Z"),
      feito("1", "2026-10-01T12:00:00Z"),
      feito("2", "2026-09-01T12:00:00Z"),
    ], [], HOJE, 1);
    expect(r.total).toBe(2);
    expect(r.oportunidades).toHaveLength(1);
  });
  it("prazo ausente recorre ao padrão oficial de 30 dias", () => {
    const r = calcularOportunidadesCRM([cliente("1")], [
      feito("1", "2026-10-08T12:00:00Z", null),
    ], [], HOJE);
    expect(r.emRetorno).toBe(1);
    expect(r.oportunidades[0]?.atrasoDias).toBe(1);
  });
});
