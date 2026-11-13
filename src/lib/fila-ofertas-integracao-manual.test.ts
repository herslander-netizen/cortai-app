import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fonte = readFileSync("src/lib/barbeiro.functions.ts", "utf8");
const trecho = (inicio: string, fim: string) => {
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if (a < 0 || b < a) throw new Error("Não foi possível localizar o fluxo da fila.");
  return fonte.slice(a, b);
};

describe("lista de espera — caminhos manuais usam o contrato transacional", () => {
  it("remover cancela a oferta e encerra a entrada sem duas escritas diretas", () => {
    const r = trecho("export const removerDaFila =", "export const moverNaFila =");
    expect(r).toContain('"retirar_entrada_da_fila"');
    expect(r).not.toContain('.update({ status: "saiu" })');
    expect(r).not.toContain('.from("ofertas_da_fila")');
    expect(r).toContain("A lista mudou neste instante");
  });

  it("converter chama a RPC única e não altera a fila por fora", () => {
    const r = trecho("export const converterFilaEmAgendamento =", "export const getOpcoesDaFila =");
    expect(r).toContain('"converter_entrada_da_fila"');
    expect(r).not.toContain('db.rpc("criar_agendamento"');
    expect(r).not.toContain('.update({ status: "atendido" })');
    expect(r).not.toContain('.from("ofertas_da_fila")');
    expect(r).toContain("Existe uma oferta em andamento");
  });

  it("editar só quando aguardando, sem modificar uma oferta já preparada", () => {
    const r = trecho("export const editarFila =", "export const converterFilaEmAgendamento =");
    expect(r).toContain('.eq("status", "aguardando")');
    expect(r).toContain(".maybeSingle()");
    expect(r).toContain("A solicitação está em oferta ou já foi concluída");
  });

  it("continua usando tenant, recurso e permissão do profissional", () => {
    for (const acao of ["export const removerDaFila =", "export const editarFila =", "export const converterFilaEmAgendamento ="]) {
      const limite = acao === "export const removerDaFila =" ? "export const moverNaFila =" :
        acao === "export const editarFila =" ? "export const converterFilaEmAgendamento =" : "export const getOpcoesDaFila =";
      const r = trecho(acao, limite);
      expect(r).toContain("await tenantPadrao(context)");
      expect(r).toContain('await exigirRecurso(db, tenant.id, "fila_espera")');
      expect(r).toContain('await exigirPermissao(context, tenant.id, "agendamento_manual")');
    }
  });
});
