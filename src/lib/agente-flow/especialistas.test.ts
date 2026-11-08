import { describe, expect, it } from "vitest";
import { ESPECIALISTAS_FLOW, ferramentasDoEspecialista } from "./especialistas";

describe("especialistas do Flow Core", () => {
  it("mantém seis perfis sem permissão própria de escrita", () => {
    expect(ESPECIALISTAS_FLOW).toHaveLength(6);
    for (const agente of ESPECIALISTAS_FLOW) {
      expect(agente.modo).toBe("sombra");
      expect(agente.permiteEscrita).toBe(false);
      expect(agente.ferramentas.length).toBeGreaterThan(0);
    }
  });

  it("intersecta ferramentas com a autorização já dada pelo cérebro", () => {
    expect(ferramentasDoEspecialista("crm", ["buscar_cliente_por_nome", "criar_cliente"]))
      .toEqual(["buscar_cliente_por_nome"]);
    expect(ferramentasDoEspecialista("insights", ["consultar_movimento"]))
      .toEqual(["consultar_movimento"]);
  });

  it("não amplia privilégios nem executa funções de escrita", () => {
    expect(ferramentasDoEspecialista("agenda", ["criar_agendamento"]))
      .toEqual([]);
    expect(ferramentasDoEspecialista("operacoes", []))
      .toEqual([]);
  });

  it("não inclui ferramentas destrutivas em nenhum perfil", () => {
    const todas = ESPECIALISTAS_FLOW.flatMap((a) => a.ferramentas);
    expect(todas).not.toContain("cancelar_agendamento");
    expect(todas).not.toContain("confirmar_pagamento");
    expect(todas).not.toContain("registrar_nota");
  });
});
