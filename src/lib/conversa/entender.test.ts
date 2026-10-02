import { describe, expect, it } from "vitest";

import { entender, horarioNoPeriodo, servicosParecidos } from "./entender";

const contexto = {
  hoje: "2026-10-01",
  servicos: [
    { id: "combo", nome: "Corte e barba", apelidos: ["corte + barba"] },
    { id: "corte", nome: "Corte" },
  ],
  profissionais: [{ id: "joao", nome: "João" }],
  horariosOferecidos: ["10:00", "15:00", "18:40"],
};

describe("entender (casos da conversa padrão)", () => {
  it("cliente novo em uma frase: serviço, dia e período", () => {
    const r = entender("Boa tarde, queria marcar corte e barba amanhã de tarde", {
      ...contexto,
      horariosOferecidos: [],
    });
    expect(r).toMatchObject({ servicoId: "combo", dia: "2026-10-02", periodo: "tarde" });
  });

  it("reconhece profissional e horário explícito", () => {
    const r = entender("corte com o joão às 18h", { ...contexto, horariosOferecidos: [] });
    expect(r).toMatchObject({ profissionalId: "joao", horario: "18:00" });
  });

  it("cliente de sempre", () => {
    expect(entender("o de sempre", contexto).intencao).toBe("agendar");
  });

  it("mais cedo possível", () => {
    expect(entender("o primeiro que tiver", contexto).primeiroDisponivel).toBe(true);
    expect(entender("mais cedo possível", contexto).primeiroDisponivel).toBe(true);
  });

  it("sábado quando hoje é sábado vira confirmação", () => {
    const r = entender("sábado", { ...contexto, hoje: "2026-10-03" });
    expect(r.dia).toBeUndefined();
    expect(r.confirmarDia?.dia).toBe("2026-10-10");
  });

  it("às 3 conforme as opções oferecidas", () => {
    expect(entender("às 3", contexto).horario).toBe("15:00");
  });

  it("dia 15 pede confirmação", () => {
    expect(entender("dia 15", contexto).confirmarDia?.dia).toBe("2026-10-15");
  });

  it("atendente", () => {
    expect(entender("quero falar com atendente", contexto).intencao).toBe("atendente");
  });

  it("ruído/risada não abre menu", () => {
    const r = entender("kkkk", contexto);
    expect(r.ruido).toBe(true);
    expect(r.intencao).toBeUndefined();
  });

  it("menu e voltar", () => {
    expect(entender("menu", contexto).intencao).toBe("menu");
    expect(entender("0", contexto).intencao).toBe("menu");
    expect(entender("voltar", contexto).intencao).toBe("voltar");
  });

  it("perguntas rápidas", () => {
    expect(entender("quanto custa?", contexto).intencao).toBe("servicos");
    expect(entender("onde fica?", contexto).intencao).toBe("endereco");
    expect(entender("aceita pix?", contexto).intencao).toBe("pagamento");
  });

  it("faixa de fim da tarde", () => {
    expect(horarioNoPeriodo("17:00", "fim_tarde")).toBe(true);
    expect(horarioNoPeriodo("10:00", "fim_tarde")).toBe(false);
  });

  it("palavra ambígua lista os serviços parecidos", () => {
    expect(servicosParecidos("corte amanha", contexto.servicos).map((s) => s.id)).toEqual([
      "combo",
      "corte",
    ]);
  });
});
